import {chunkWordsToSegments} from './segmenter';
import {getDurationInFrames} from './timeline';
import {
  CaptionTimingInput,
  RawCaption,
  ResolvedSceneInput,
  SpeechSceneSource,
  TimedSegment,
} from './types';

const buildSegments = (speech: SpeechSceneSource): TimedSegment[] => {
  if (speech.segments && speech.segments.length > 0) {
    return speech.segments;
  }

  if (speech.words && speech.words.length > 0) {
    return chunkWordsToSegments(speech.words, speech.chunking);
  }

  return [];
};

export const resolveSpeechScene = (speech?: SpeechSceneSource): ResolvedSceneInput | null => {
  if (!speech) {
    return null;
  }

  const segments = buildSegments(speech);
  const layoutSequence = speech.layoutSequence?.length ? speech.layoutSequence : ['ccw', 'cw', 'up'];

  const captions: RawCaption[] = segments.map((segment, index) => ({
    id: segment.id,
    text: segment.text,
    layoutKey: segment.layoutKey ?? layoutSequence[index % layoutSequence.length],
    utteranceId: segment.utteranceId,
    fontSize: segment.fontSize,
    fontFamily: segment.fontFamily,
    fontWeight: segment.fontWeight,
    tokens: segment.tokens,
  }));

  const timings: CaptionTimingInput[] = segments.map((segment) => ({
    startMs: segment.startMs,
    endMs: segment.endMs,
  }));

  return {
    captions,
    timings,
    audioSrc: speech.audioSrc,
  };
};

export const getSpeechSceneDurationInFrames = (
  speech: SpeechSceneSource | undefined,
  fps: number,
  tailHoldFrames = 0,
) => {
  const resolved = resolveSpeechScene(speech);
  return getDurationInFrames(resolved?.timings ?? [], fps, tailHoldFrames);
};
