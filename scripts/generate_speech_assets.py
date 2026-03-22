#!/usr/bin/env python3

import argparse
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


def build_fallback_segments(captions: list[dict[str, Any]], durations_ms: list[int]) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    cursor = 0

    for index, caption in enumerate(captions):
        duration = durations_ms[index]
        segments.append(
            {
                "id": caption.get("id") or f"seg-{index + 1}",
                "text": caption["text"],
                "startMs": cursor,
                "endMs": cursor + duration,
                "layoutKey": caption.get("layoutKey"),
                "fontSize": caption.get("fontSize"),
                "fontFamily": caption.get("fontFamily"),
                "fontWeight": caption.get("fontWeight"),
                "tokens": caption.get("tokens"),
            }
        )
        cursor += duration

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

        for index, caption in enumerate(captions):
            chunk_path = temp_dir / f"chunk-{index:03d}.mp3"
            synthesize_caption(caption["text"], chunk_path, voice, rate, pitch, volume)
            chunk_paths.append(chunk_path)

        concat_audio(chunk_paths, audio_path, temp_dir)
        durations_ms = [get_audio_duration_ms(path) for path in chunk_paths]
        fallback_segments = build_fallback_segments(captions, durations_ms)

        try:
            transcribed_words = transcribe_with_faster_whisper(audio_path, args.model, args.language)
            segments = align_words_to_captions(captions, transcribed_words, fallback_segments)
        except Exception:
            segments = fallback_segments
            transcribed_words = []

    generated_payload = {
        "audioSrc": audio_src,
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
            "voice": voice,
            "rate": rate,
            "pitch": pitch,
            "volume": volume,
            "whisperModel": args.model,
            "transcribedWordCount": len(transcribed_words),
        },
    }
    write_json(output_path, generated_payload)


if __name__ == "__main__":
    main()
