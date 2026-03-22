import {CaptionLayoutConfig, CaptionVisualConfig} from './types';
import {defaultEnterEasing} from './animation';

export const defaultLayoutMap: Record<string, CaptionLayoutConfig> = {
  ccw: {
    mode: 'rotate_ccw_90',
    enterDurationFrames: 18,
    containerTransitionFrames: 14,
    enterEasing: [...defaultEnterEasing],
    scaleFactor: 1.08,
  },
  cw: {
    mode: 'rotate_cw_90',
    enterDurationFrames: 18,
    containerTransitionFrames: 14,
    enterEasing: [...defaultEnterEasing],
    scaleFactor: 0.92,
  },
  up: {
    mode: 'translate_up',
    enterDurationFrames: 18,
    containerTransitionFrames: 12,
    enterEasing: [...defaultEnterEasing],
    scaleFactor: 1.04,
  },
};

export const defaultVisuals: CaptionVisualConfig = {
  fontUrl: 'fonts/SmileySans-Oblique.otf',
  fontFamily:
    '"Smiley Sans", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
  fontWeight: 800,
  autoFitFontSize: true,
  maxFontSize: 104,
  minFontSize: 56,
  lineHeightRatio: 1.16,
  maxTextWidth: 760,
  paddingX: 0,
  paddingY: 0,
  borderRadius: 0,
  activeAnchorY: 960,
  activeLetterSpacing: 2,
};
