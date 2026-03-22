import subtitlesConfigJson from '../data/subtitles.json';
import {defaultLayoutMap, defaultVisuals} from './layout-config';
import {generatedSpeechScene} from './generated-speech';
import {getSpeechSceneDurationInFrames} from './speech-scene';
import {getDurationInFrames} from './timeline';
import {
  CaptionLayoutConfig,
  CaptionLayoutConfigInput,
  CaptionVisualConfig,
  SubtitleFeedSceneProps,
  SubtitleProjectConfig,
} from './types';

const subtitlesConfig = subtitlesConfigJson as SubtitleProjectConfig;

const mergeLayoutConfig = (
  base: CaptionLayoutConfig,
  override?: CaptionLayoutConfigInput,
): CaptionLayoutConfig => {
  if (!override) {
    return base;
  }

  return {
    mode: override.mode,
    enterDurationFrames: override.enterDurationFrames ?? base.enterDurationFrames,
    containerTransitionFrames:
      override.containerTransitionFrames ?? base.containerTransitionFrames,
    enterEasing: override.enterEasing ?? base.enterEasing,
    translateDistancePx: override.translateDistancePx ?? base.translateDistancePx,
    scaleFactor: override.scaleFactor ?? base.scaleFactor,
  };
};

const layoutMap = Object.entries(subtitlesConfig.layoutMap ?? {}).reduce<Record<string, CaptionLayoutConfig>>(
  (accumulator, [key, value]) => {
    const base = defaultLayoutMap[key];

    if (base) {
      accumulator[key] = mergeLayoutConfig(base, value);
      return accumulator;
    }

    accumulator[key] = {
      mode: value.mode,
      enterDurationFrames: value.enterDurationFrames ?? 18,
      containerTransitionFrames: value.containerTransitionFrames ?? 14,
      enterEasing: value.enterEasing,
      translateDistancePx: value.translateDistancePx,
      scaleFactor: value.scaleFactor,
    };
    return accumulator;
  },
  {...defaultLayoutMap},
);

const visuals: CaptionVisualConfig = {
  ...defaultVisuals,
  ...(subtitlesConfig.visuals ?? {}),
};

const fps = subtitlesConfig.fps ?? 30;
const width = subtitlesConfig.width ?? 1080;
const height = subtitlesConfig.height ?? 1920;
const tailHoldFrames = subtitlesConfig.tailHoldFrames ?? 36;
const fallbackTimings = subtitlesConfig.captions.map(() => ({durationSeconds: 1.8}));

export const demoSceneProps: SubtitleFeedSceneProps & {durationInFrames: number} = {
  fps,
  width,
  height,
  backgroundColor: subtitlesConfig.backgroundColor ?? '#09090b',
  tailHoldFrames,
  debug: subtitlesConfig.debug ?? {
    showContainerBounds: true,
    showCaptionBounds: true,
  },
  captions: subtitlesConfig.captions,
  timings: fallbackTimings,
  speech: generatedSpeechScene,
  layoutMap,
  visuals,
  durationInFrames: Math.max(
    getDurationInFrames(fallbackTimings, fps, tailHoldFrames),
    getSpeechSceneDurationInFrames(generatedSpeechScene, fps, tailHoldFrames),
  ),
};
