import {defaultAudioMix, defaultEffects, defaultLayoutMap, defaultVisuals} from './layout-config';
import {getDurationInFrames} from './timeline';
import {
  AudioMixConfig,
  CaptionLayoutConfig,
  CaptionLayoutConfigInput,
  CaptionVisualConfig,
  EffectsConfig,
  GlyphFallSceneProps,
  SubtitleProjectConfig,
} from './types';

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

const normalizeTextLength = (value: string) => value.replace(/[\s\W_]+/gu, '').length;

export const buildEstimatedTimings = (subtitlesConfig: SubtitleProjectConfig) => {
  const utterances = subtitlesConfig.utterances ?? [];

  if (utterances.length === 0) {
    return subtitlesConfig.captions.map(() => ({durationSeconds: 1.8}));
  }

  const captionGroups = subtitlesConfig.captions.reduce<Record<string, typeof subtitlesConfig.captions>>(
    (accumulator, caption) => {
      const groupKey = caption.utteranceId ?? caption.id;
      accumulator[groupKey] = [...(accumulator[groupKey] ?? []), caption];
      return accumulator;
    },
    {},
  );

  return utterances.flatMap((utterance) => {
    const groupCaptions = captionGroups[utterance.id] ?? [];
    if (groupCaptions.length === 0) {
      return [];
    }

    const utteranceLength = Math.max(1, normalizeTextLength(utterance.text));
    const utteranceDurationMs = Math.max(1800, utteranceLength * 260 + 320);
    const totalCaptionWeight = groupCaptions.reduce(
      (sum, caption) => sum + Math.max(1, normalizeTextLength(caption.text)),
      0,
    );

    return groupCaptions.map((caption, index) => {
      if (index === groupCaptions.length - 1) {
        const allocatedMs = groupCaptions
          .slice(0, index)
          .reduce((sum, previousCaption) => {
            const weight = Math.max(1, normalizeTextLength(previousCaption.text));
            return sum + Math.round((utteranceDurationMs * weight) / totalCaptionWeight);
          }, 0);

        return {
          durationMs: Math.max(600, utteranceDurationMs - allocatedMs),
        };
      }

      const captionWeight = Math.max(1, normalizeTextLength(caption.text));
      return {
        durationMs: Math.max(
          600,
          Math.round((utteranceDurationMs * captionWeight) / totalCaptionWeight),
        ),
      };
    });
  });
};

export const buildScenePropsFromProjectConfig = (
  subtitlesConfig: SubtitleProjectConfig,
  options?: {
    exampleName?: string;
    defaultDebug?: {
      showContainerBounds?: boolean;
      showCaptionBounds?: boolean;
    };
  },
): GlyphFallSceneProps & {durationInFrames: number} => {
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
  const effects: EffectsConfig = {
    ...defaultEffects,
    captionSettle: {
      ...defaultEffects.captionSettle,
      ...(subtitlesConfig.effects?.captionSettle ?? {}),
    },
    glyphAssemble: {
      ...defaultEffects.glyphAssemble,
      ...(subtitlesConfig.effects?.glyphAssemble ?? {}),
    },
  };
  const audioMix: AudioMixConfig = {
    ...defaultAudioMix,
    ducking: {
      ...defaultAudioMix.ducking,
      ...(subtitlesConfig.audioMix?.ducking ?? {}),
    },
  };

  const fps = subtitlesConfig.fps ?? 30;
  const width = subtitlesConfig.width ?? 1080;
  const height = subtitlesConfig.height ?? 1920;
  const tailHoldFrames = subtitlesConfig.tailHoldFrames ?? 36;
  const fallbackTimings = subtitlesConfig.timings?.length
    ? subtitlesConfig.timings
    : buildEstimatedTimings(subtitlesConfig);
  const speech = subtitlesConfig.timings?.length
    ? undefined
    : options?.exampleName
      ? {
          manifestSrc: `studio-preview/${options.exampleName}/generated-speech.json`,
        }
      : undefined;

  return {
    fps,
    width,
    height,
    backgroundColor: subtitlesConfig.backgroundColor ?? '#09090b',
    tailHoldFrames,
    debug: subtitlesConfig.debug ?? options?.defaultDebug ?? {
      showContainerBounds: true,
      showCaptionBounds: true,
    },
    captions: subtitlesConfig.captions,
    timings: fallbackTimings,
    speech,
    backgroundMusic: subtitlesConfig.backgroundMusic ?? [],
    audioMix,
    layoutMap,
    visuals,
    effects,
    durationInFrames: getDurationInFrames(fallbackTimings, fps, tailHoldFrames),
  };
};
