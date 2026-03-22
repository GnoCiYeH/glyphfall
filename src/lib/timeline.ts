import {CaptionTimingInput, NormalizedCaption, RawCaption} from './types';

const toFrames = (value: number, fps: number) => Math.max(0, Math.round(value * fps));

export const normalizeCaptionTimings = (
  captions: RawCaption[],
  timings: CaptionTimingInput[],
  fps: number,
): NormalizedCaption[] => {
  if (captions.length !== timings.length) {
    throw new Error('captions and timings length must match');
  }

  let cursor = 0;

  return captions.map((caption, index) => {
    const timing = timings[index];

    if ('startFrame' in timing && 'endFrame' in timing) {
      cursor = timing.endFrame;

      return {
        ...caption,
        startFrame: timing.startFrame,
        endFrame: timing.endFrame,
      };
    }

    if ('startMs' in timing && 'endMs' in timing) {
      const startFrame = toFrames(timing.startMs / 1000, fps);
      const endFrame = toFrames(timing.endMs / 1000, fps);
      cursor = endFrame;

      return {
        ...caption,
        startFrame,
        endFrame,
      };
    }

    if ('durationMs' in timing) {
      const startFrame = cursor;
      const durationFrames = toFrames(timing.durationMs / 1000, fps);
      const endFrame = startFrame + durationFrames;
      cursor = endFrame;

      return {
        ...caption,
        startFrame,
        endFrame,
      };
    }

    const startFrame = cursor;
    const durationFrames = toFrames(timing.durationSeconds, fps);
    const endFrame = startFrame + durationFrames;
    cursor = endFrame;

    return {
      ...caption,
      startFrame,
      endFrame,
    };
  });
};

export const getDurationInFrames = (
  timings: CaptionTimingInput[],
  fps: number,
  tailHoldFrames = 0,
) => {
  let cursor = 0;

  for (const timing of timings) {
    if ('startFrame' in timing && 'endFrame' in timing) {
      cursor = Math.max(cursor, timing.endFrame);
      continue;
    }

    if ('startMs' in timing && 'endMs' in timing) {
      cursor = Math.max(cursor, toFrames(timing.endMs / 1000, fps));
      continue;
    }

    if ('durationMs' in timing) {
      cursor += toFrames(timing.durationMs / 1000, fps);
      continue;
    }

    cursor += toFrames(timing.durationSeconds, fps);
  }

  return cursor + tailHoldFrames;
};

export const findActiveCaption = (captions: NormalizedCaption[], frame: number) => {
  return captions.find((caption, index) => {
    const nextStart = captions[index + 1]?.startFrame ?? Number.POSITIVE_INFINITY;
    const endFrame = Math.min(caption.endFrame, nextStart);
    return frame >= caption.startFrame && frame < endFrame;
  });
};
