export type LayoutMode = 'rotate_ccw_90' | 'rotate_cw_90' | 'translate_up';

export type RawCaption = {
  id: string;
  text: string;
  layoutKey: string;
};

export type TimedWord = {
  text: string;
  startMs: number;
  endMs: number;
};

export type TimedSegment = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  layoutKey?: string;
};

export type SpeechChunkingConfig = {
  maxCharsPerCaption: number;
  breakOnPunctuation: boolean;
  punctuationChars: string[];
  mergeShortTail: boolean;
};

export type SpeechSceneSource = {
  audioSrc?: string;
  words?: TimedWord[];
  segments?: TimedSegment[];
  layoutSequence?: string[];
  chunking?: Partial<SpeechChunkingConfig>;
};

export type CaptionTimingInput =
  | {
      startFrame: number;
      endFrame: number;
    }
  | {
      startMs: number;
      endMs: number;
    }
  | {
      durationMs: number;
    }
  | {
      durationSeconds: number;
    };

export type NormalizedCaption = RawCaption & {
  startFrame: number;
  endFrame: number;
};

export type CaptionLayoutConfig = {
  mode: LayoutMode;
  enterDurationFrames: number;
  containerTransitionFrames: number;
  translateDistancePx?: number;
};

export type CaptionVisualConfig = {
  fontFamily: string;
  fontWeight: number;
  maxFontSize: number;
  minFontSize: number;
  lineHeightRatio: number;
  maxTextWidth: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  activeAnchorY: number;
  activeLetterSpacing: number;
};

export type MeasuredCaption = NormalizedCaption & {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  width: number;
  height: number;
};

export type CaptionItemState = {
  id: string;
  text: string;
  layoutKey: string;
  lines: string[];
  fontSize: number;
  lineHeight: number;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
};

export type BoundingBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type ContainerEvent = {
  key: string;
  triggerFrame: number;
  transitionFrames: number;
  mode: LayoutMode;
  translateDistancePx?: number;
  fromBox: BoundingBox;
  fromItems: CaptionItemState[];
  toItems: CaptionItemState[];
};

export type SubtitleFeedSceneProps = {
  fps: number;
  width: number;
  height: number;
  captions?: RawCaption[];
  timings?: CaptionTimingInput[];
  speech?: SpeechSceneSource;
  layoutMap: Record<string, CaptionLayoutConfig>;
  visuals: CaptionVisualConfig;
  tailHoldFrames?: number;
  backgroundColor?: string;
  debug?: {
    showContainerBounds?: boolean;
    showCaptionBounds?: boolean;
  };
};

export type PreparedScene = {
  captions: MeasuredCaption[];
  events: ContainerEvent[];
  durationInFrames: number;
};

export type ResolvedSceneInput = {
  captions: RawCaption[];
  timings: CaptionTimingInput[];
  audioSrc?: string;
};
