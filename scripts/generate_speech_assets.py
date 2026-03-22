#!/usr/bin/env python3

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "src" / "data" / "subtitles.json"
DEFAULT_OUTPUT = ROOT / "src" / "data" / "generated-speech.json"
DEFAULT_AUDIO = ROOT / "public" / "audio" / "narration.mp3"


def run_command(command: list[str]) -> None:
    subprocess.run(command, check=True)


def normalize_text(text: str) -> str:
    return re.sub(r"[\s\W_]+", "", text, flags=re.UNICODE).lower()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def get_file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def synthesize_caption(
    text: str,
    output_path: Path,
    voice: str,
    rate: str,
    pitch: str,
    volume: str,
) -> None:
    run_command(
        [
            "edge-tts",
            "--voice",
            voice,
            f"--rate={rate}",
            f"--pitch={pitch}",
            f"--volume={volume}",
            "--text",
            text,
            "--write-media",
            str(output_path),
        ]
    )


def concat_audio(chunk_paths: list[Path], output_path: Path, temp_dir: Path) -> None:
    concat_file = temp_dir / "concat.txt"
    concat_file.write_text(
        "".join(f"file '{path.as_posix()}'\n" for path in chunk_paths),
        encoding="utf-8",
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    run_command(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-c",
            "copy",
            str(output_path),
        ]
    )


def get_audio_duration_ms(path: Path) -> int:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return round(float(result.stdout.strip()) * 1000)


def split_duration_by_caption(
    captions: list[dict[str, Any]],
    total_duration_ms: int,
) -> list[tuple[int, int]]:
    if len(captions) == 1:
        return [(0, total_duration_ms)]

    weights = [max(1, len(normalize_text(caption["text"]))) for caption in captions]
    total_weight = sum(weights)
    ranges: list[tuple[int, int]] = []
    cursor = 0

    for index, weight in enumerate(weights):
        if index == len(weights) - 1:
            end = total_duration_ms
        else:
            end = cursor + round(total_duration_ms * weight / total_weight)

        ranges.append((cursor, max(cursor, end)))
        cursor = max(cursor, end)

    if ranges:
        start, _ = ranges[-1]
        ranges[-1] = (start, total_duration_ms)

    return ranges


def resolve_utterances(
    payload: dict[str, Any],
    captions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    default_voice = payload.get("voice", "zh-CN-XiaoxiaoNeural")
    default_rate = payload.get("rate", "+0%")
    default_pitch = payload.get("pitch", "+0Hz")
    default_volume = payload.get("volume", "+0%")
    configured_utterances = payload.get("utterances") or []

    if configured_utterances:
        utterance_map = {utterance["id"]: utterance for utterance in configured_utterances}
        grouped_captions: dict[str, list[dict[str, Any]]] = {}

        for caption in captions:
            utterance_id = caption.get("utteranceId") or caption.get("id")
            grouped_captions.setdefault(utterance_id, []).append(caption)

        utterances: list[dict[str, Any]] = []
        for utterance in configured_utterances:
            utterance_id = utterance["id"]
            utterance_captions = grouped_captions.get(utterance_id, [])
            if not utterance_captions:
                continue

            utterances.append(
                {
                    "id": utterance_id,
                    "text": utterance["text"],
                    "voice": utterance.get("voice", default_voice),
                    "rate": utterance.get("rate", default_rate),
                    "pitch": utterance.get("pitch", default_pitch),
                    "volume": utterance.get("volume", default_volume),
                    "captions": utterance_captions,
                }
            )

        unmatched_ids = [utterance_id for utterance_id in grouped_captions if utterance_id not in utterance_map]
        if unmatched_ids:
            missing = ", ".join(unmatched_ids)
            raise RuntimeError(f"Missing utterance definitions for caption groups: {missing}")

        return utterances

    return [
        {
            "id": caption.get("utteranceId") or caption.get("id"),
            "text": caption["text"],
            "voice": default_voice,
            "rate": default_rate,
            "pitch": default_pitch,
            "volume": default_volume,
            "captions": [caption],
        }
        for caption in captions
    ]


def build_fallback_segments(
    captions: list[dict[str, Any]],
    utterances: list[dict[str, Any]],
    utterance_durations_ms: list[int],
) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    cursor = 0

    for utterance_index, utterance in enumerate(utterances):
        group_duration = utterance_durations_ms[utterance_index]
        caption_ranges = split_duration_by_caption(utterance["captions"], group_duration)

        for caption, (start_offset, end_offset) in zip(utterance["captions"], caption_ranges):
            segments.append(
                {
                    "id": caption.get("id"),
                    "text": caption["text"],
                    "startMs": cursor + start_offset,
                    "endMs": cursor + end_offset,
                    "layoutKey": caption.get("layoutKey"),
                    "utteranceId": caption.get("utteranceId"),
                    "voice": utterance.get("voice"),
                    "rate": utterance.get("rate"),
                    "pitch": utterance.get("pitch"),
                    "volume": utterance.get("volume"),
                    "fontSize": caption.get("fontSize"),
                    "fontFamily": caption.get("fontFamily"),
                    "fontWeight": caption.get("fontWeight"),
                    "tokens": caption.get("tokens"),
                }
            )

        cursor += group_duration

    return segments


def transcribe_with_faster_whisper(audio_path: Path, model_size: str, language: str) -> list[dict[str, Any]]:
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="auto", compute_type="int8")
    segments, _ = model.transcribe(
        str(audio_path),
        language=language,
        word_timestamps=True,
        vad_filter=True,
    )

    words: list[dict[str, Any]] = []
    for segment in segments:
        for word in segment.words or []:
            if word.start is None or word.end is None:
                continue
            words.append(
                {
                    "text": word.word,
                    "startMs": round(word.start * 1000),
                    "endMs": round(word.end * 1000),
                }
            )

    return words


def align_words_to_captions(
    captions: list[dict[str, Any]],
    transcribed_words: list[dict[str, Any]],
    fallback_segments: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    resolved_segments: list[dict[str, Any]] = []
    word_index = 0

    for caption_index, caption in enumerate(captions):
        normalized_target = normalize_text(caption["text"])
        consumed = ""
        matched_words: list[dict[str, Any]] = []

        while word_index < len(transcribed_words) and len(consumed) < len(normalized_target):
            word = transcribed_words[word_index]
            word_index += 1
            normalized_word = normalize_text(word["text"])

            if not normalized_word:
                continue

            matched_words.append(word)
            consumed += normalized_word

            if consumed == normalized_target:
                break

        if matched_words and consumed == normalized_target:
            resolved_segments.append(
                {
                    "id": caption.get("id") or f"seg-{caption_index + 1}",
                    "text": caption["text"],
                    "startMs": matched_words[0]["startMs"],
                    "endMs": matched_words[-1]["endMs"],
                    "layoutKey": caption.get("layoutKey"),
                    "utteranceId": caption.get("utteranceId"),
                    "voice": fallback_segments[caption_index].get("voice"),
                    "rate": fallback_segments[caption_index].get("rate"),
                    "pitch": fallback_segments[caption_index].get("pitch"),
                    "volume": fallback_segments[caption_index].get("volume"),
                    "fontSize": caption.get("fontSize"),
                    "fontFamily": caption.get("fontFamily"),
                    "fontWeight": caption.get("fontWeight"),
                    "tokens": caption.get("tokens"),
                }
            )
            continue

        resolved_segments.append(fallback_segments[caption_index])

    return resolved_segments


def ensure_dependency(name: str) -> None:
    if shutil.which(name):
        return
    raise RuntimeError(f'Missing required command: "{name}"')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--audio", default=str(DEFAULT_AUDIO))
    parser.add_argument("--model", default="small")
    parser.add_argument("--language", default="zh")
    args = parser.parse_args()

    ensure_dependency("edge-tts")
    ensure_dependency("ffmpeg")
    ensure_dependency("ffprobe")

    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    audio_path = Path(args.audio).resolve()

    payload = load_json(input_path)
    captions = payload.get("captions", [])
    if not captions:
        raise RuntimeError("Input captions are empty")
    input_hash = get_file_sha256(input_path)
    utterances = resolve_utterances(payload, captions)

    voice = payload.get("voice", "zh-CN-XiaoxiaoNeural")
    rate = payload.get("rate", "+0%")
    pitch = payload.get("pitch", "+0Hz")
    volume = payload.get("volume", "+0%")
    layout_sequence = payload.get("layoutSequence", ["ccw", "cw", "up"])
    chunking = payload.get("chunking", {"maxCharsPerCaption": 12})
    audio_src = payload.get("audioSrc") or f"audio/{audio_path.name}"

    with tempfile.TemporaryDirectory(prefix="subtitle-feed-") as temp_dir_value:
        temp_dir = Path(temp_dir_value)
        chunk_paths: list[Path] = []

        for index, utterance in enumerate(utterances):
            chunk_path = temp_dir / f"chunk-{index:03d}.mp3"
            synthesize_caption(
                utterance["text"],
                chunk_path,
                utterance["voice"],
                utterance["rate"],
                utterance["pitch"],
                utterance["volume"],
            )
            chunk_paths.append(chunk_path)

        concat_audio(chunk_paths, audio_path, temp_dir)
        utterance_durations_ms = [get_audio_duration_ms(path) for path in chunk_paths]
        fallback_segments = build_fallback_segments(captions, utterances, utterance_durations_ms)

        try:
            transcribed_words = transcribe_with_faster_whisper(audio_path, args.model, args.language)
            segments = align_words_to_captions(captions, transcribed_words, fallback_segments)
        except Exception:
            segments = fallback_segments
            transcribed_words = []

    generated_payload = {
        "fps": payload.get("fps"),
        "width": payload.get("width"),
        "height": payload.get("height"),
        "tailHoldFrames": payload.get("tailHoldFrames"),
        "backgroundColor": payload.get("backgroundColor"),
        "debug": payload.get("debug"),
        "visuals": payload.get("visuals"),
        "layoutMap": payload.get("layoutMap"),
        "audioSrc": audio_src,
        "utterances": payload.get("utterances"),
        "layoutSequence": layout_sequence,
        "chunking": chunking,
        "segments": [
            {
                **segment,
                "layoutKey": segment.get("layoutKey") or layout_sequence[index % len(layout_sequence)],
            }
            for index, segment in enumerate(segments)
        ],
        "meta": {
            "inputHash": input_hash,
            "voice": voice,
            "rate": rate,
            "pitch": pitch,
            "volume": volume,
            "utteranceVoices": [
                {
                    "id": utterance["id"],
                    "voice": utterance["voice"],
                    "rate": utterance["rate"],
                    "pitch": utterance["pitch"],
                    "volume": utterance["volume"],
                }
                for utterance in utterances
            ],
            "whisperModel": args.model,
            "transcribedWordCount": len(transcribed_words),
        },
    }
    write_json(output_path, generated_payload)


if __name__ == "__main__":
    main()
