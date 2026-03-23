export type LayoutMode = 'rotate_ccw_90' | 'rotate_cw_90' | 'translate_up';

export type RawCaption = {
  id: string;
  text: string;
  layoutKey: string;
  utteranceId?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  tokens?: CaptionToken[];
};

export type RawUtterance = {
  id: string;
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
  volume?: string;
};

export type CaptionToken = {
  text: string;
  color?: string;
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
  utteranceId?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  tokens?: CaptionToken[];
};

export type SpeechChunkingConfig = {
  maxCharsPerCaption: number;
  breakOnPunctuation: boolean;
  punctuationChars: string[];
  mergeShortTail: boolean;
  pauseThresholdMs: number;
  breakOnPause: boolean;
  minCharsPerCaption: number;
};

export type SpeechSceneSource = {
  audioSrc?: string;
  manifestSrc?: string;
  words?: TimedWord[];
  segments?: TimedSegment[];
  layoutSequence?: string[];
  chunking?: Partial<SpeechChunkingConfig>;
};

export type BackgroundMusicCue = {
  src: string;
  startMs?: number;
  startFrame?: number;
  durationMs?: number;
  durationFrames?: number;
  volume?: number;
  playbackRate?: number;
  fadeInMs?: number;
  fadeInFrames?: number;
  fadeOutMs?: number;
  fadeOutFrames?: number;
};

export type DuckingConfig = {
  enabled: boolean;
  volumeMultiplier: number;
  attackMs?: number;
  attackFrames?: number;
  releaseMs?: number;
  releaseFrames?: number;
};

export type AudioMixConfig = {
  ducking: DuckingConfig;
};

export type AudioMixConfigInput = {
  ducking?: Partial<DuckingConfig>;
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
  enterEasing?: [number, number, number, number];
  translateDistancePx?: number;
  scaleFactor?: number;
};

export type CaptionLayoutConfigInput = {
  mode: LayoutMode;
  enterDurationFrames?: number;
  containerTransitionFrames?: number;
  enterEasing?: [number, number, number, number];
  translateDistancePx?: number;
  scaleFactor?: number;
};

export type CaptionVisualConfig = {
  fontFamily: string;
  fontUrl?: string;
  fontWeight: number;
  autoFitFontSize: boolean;
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

export type CaptionSettlePreset = 'flash' | 'outline-pop';
export type GlyphAssemblePreset = 'content-slices';

export type CaptionSettleEffectConfig = {
  enabled: boolean;
  preset: CaptionSettlePreset;
  durationFrames: number;
  intensity: number;
  color: string;
};

export type GlyphAssembleEffectConfig = {
  enabled: boolean;
  preset: GlyphAssemblePreset;
  durationFrames: number;
  rows: number;
  cols: number;
  scatter: number;
  rotation: number;
  textRevealStart: number;
  textRevealEnd: number;
};

export type EffectsConfig = {
  captionSettle: CaptionSettleEffectConfig;
  glyphAssemble: GlyphAssembleEffectConfig;
};

export type EffectsConfigInput = {
  captionSettle?: Partial<CaptionSettleEffectConfig>;
  glyphAssemble?: Partial<GlyphAssembleEffectConfig>;
};

export type MeasuredCaption = NormalizedCaption & {
  lines: string[];
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: number;
  width: number;
  height: number;
};

export type CaptionItemState = {
  id: string;
  text: string;
  layoutKey: string;
  tokens?: CaptionToken[];
  lines: string[];
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
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
  enterEasing?: [number, number, number, number];
  translateDistancePx?: number;
  scaleFactor?: number;
  scaleTransformOrigin: string;
  alignTranslateX: number;
  alignTranslateY: number;
  fromBox: BoundingBox;
  fromItems: CaptionItemState[];
  toItems: CaptionItemState[];
};

export type GlyphFallSceneProps = {
  fps: number;
  width: number;
  height: number;
  captions?: RawCaption[];
  timings?: CaptionTimingInput[];
  speech?: SpeechSceneSource;
  backgroundMusic?: BackgroundMusicCue[];
  audioMix?: AudioMixConfig;
  layoutMap: Record<string, CaptionLayoutConfig>;
  visuals: CaptionVisualConfig;
  effects?: EffectsConfig;
  tailHoldFrames?: number;
  backgroundColor?: string;
  debug?: {
    showContainerBounds?: boolean;
    showCaptionBounds?: boolean;
  };
};

export type SubtitleProjectConfig = {
  fps?: number;
  width?: number;
  height?: number;
  tailHoldFrames?: number;
  backgroundColor?: string;
  outputVideoName?: string;
  timings?: CaptionTimingInput[];
  debug?: {
    showContainerBounds?: boolean;
    showCaptionBounds?: boolean;
  };
  visuals?: Partial<CaptionVisualConfig>;
  effects?: EffectsConfigInput;
  layoutMap?: Record<string, CaptionLayoutConfigInput>;
  audioSrc?: string;
  backgroundMusic?: BackgroundMusicCue[];
  audioMix?: AudioMixConfigInput;
  voice?: string;
  rate?: string;
  pitch?: string;
  volume?: string;
  utterances?: RawUtterance[];
  captions: RawCaption[];
  layoutSequence?: string[];
  chunking?: Partial<SpeechChunkingConfig>;
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
