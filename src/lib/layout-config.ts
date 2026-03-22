import {CaptionLayoutConfig, CaptionVisualConfig} from './types';

export const defaultLayoutMap: Record<string, CaptionLayoutConfig> = {
  ccw: {
    mode: 'rotate_ccw_90',
    enterDurationFrames: 18,
    containerTransitionFrames: 14,
  },
  cw: {
    mode: 'rotate_cw_90',
    enterDurationFrames: 18,
    containerTransitionFrames: 14,
  },
  up: {
    mode: 'translate_up',
    enterDurationFrames: 18,
    containerTransitionFrames: 12,
  },
};

export const defaultVisuals: CaptionVisualConfig = {
  fontFamily:
    '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  fontWeight: 800,
  maxFontSize: 72,
  minFontSize: 40,
  lineHeightRatio: 1.16,
  maxTextWidth: 760,
  paddingX: 0,
  paddingY: 0,
  borderRadius: 0,
  activeAnchorY: 960,
  activeLetterSpacing: 2,
};
