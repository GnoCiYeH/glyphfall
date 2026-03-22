import {CaptionVisualConfig, MeasuredCaption, NormalizedCaption} from './types';

const SAFETY_WIDTH_PX = 4;
const MIN_ABSOLUTE_FONT_SIZE = 12;

const getCharacterUnits = (character: string) => {
  if (character === ' ') {
    return 0.4;
  }

  if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(character)) {
    return 1;
  }

  if (/[A-Z0-9]/.test(character)) {
    return 0.78;
  }

  if (/[a-z]/.test(character)) {
    return 0.68;
  }

  return 0.72;
};

const getLineUnits = (line: string) => {
  return Array.from(line).reduce((sum, character) => sum + getCharacterUnits(character), 0);
};

let sharedMeasureContext: CanvasRenderingContext2D | null = null;

const getMeasureContext = () => {
  if (sharedMeasureContext) {
    return sharedMeasureContext;
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    sharedMeasureContext = canvas.getContext('2d');
    return sharedMeasureContext;
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(1, 1);
    sharedMeasureContext = canvas.getContext('2d');
    return sharedMeasureContext;
  }

  return null;
};

const estimateLineWidth = (units: number, fontSize: number, visuals: CaptionVisualConfig) => {
  const estimatedCharWidth = fontSize * 0.98;
  const contentWidth = units * estimatedCharWidth;
  const spacingWidth = Math.max(0, units - 1) * visuals.activeLetterSpacing * 0.72;

  return contentWidth + spacingWidth + visuals.paddingX * 2 + SAFETY_WIDTH_PX;
};

const getVisualFontFamily = (visuals: CaptionVisualConfig) =>
  visuals.fontUrl ? `"GlyphFallCustomFont", ${visuals.fontFamily}` : visuals.fontFamily;

const getResolvedFontFamily = (caption: NormalizedCaption, visuals: CaptionVisualConfig) =>
  caption.fontFamily ?? getVisualFontFamily(visuals);

const getResolvedFontWeight = (caption: NormalizedCaption, visuals: CaptionVisualConfig) =>
  caption.fontWeight ?? visuals.fontWeight;

const measureTextWidth = (
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  visuals: CaptionVisualConfig,
) => {
  const context = getMeasureContext();

  if (!context) {
    return estimateLineWidth(getLineUnits(text), fontSize, visuals);
  }

  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const measuredWidth = context.measureText(text).width;
  const spacingWidth = Math.max(0, Array.from(text).length - 1) * visuals.activeLetterSpacing;

  return measuredWidth + spacingWidth + visuals.paddingX * 2 + 4 + SAFETY_WIDTH_PX;
};

export const measureCaption = (
  caption: NormalizedCaption,
  visuals: CaptionVisualConfig,
): MeasuredCaption => {
  const targetText = caption.tokens?.map((token) => token.text).join('') || caption.text;
  const fontFamily = getResolvedFontFamily(caption, visuals);
  const fontWeight = getResolvedFontWeight(caption, visuals);
  let fontSize = visuals.autoFitFontSize
    ? visuals.maxFontSize
    : Math.min(caption.fontSize ?? visuals.maxFontSize, visuals.maxFontSize);

  if (visuals.autoFitFontSize) {
    const initialWidth = measureTextWidth(targetText, fontSize, fontFamily, fontWeight, visuals);

    if (initialWidth > visuals.maxTextWidth) {
      const contentMaxWidth = Math.max(1, visuals.maxTextWidth);
      const scaledFontSize = Math.floor((fontSize * contentMaxWidth) / initialWidth);
      fontSize = Math.max(MIN_ABSOLUTE_FONT_SIZE, scaledFontSize);
    }

    while (
      fontSize > visuals.minFontSize &&
      measureTextWidth(targetText, fontSize, fontFamily, fontWeight, visuals) > visuals.maxTextWidth
    ) {
      fontSize -= 2;
    }

    while (
      fontSize > MIN_ABSOLUTE_FONT_SIZE &&
      measureTextWidth(targetText, fontSize, fontFamily, fontWeight, visuals) > visuals.maxTextWidth
    ) {
      fontSize -= 1;
    }

    if (measureTextWidth(targetText, fontSize, fontFamily, fontWeight, visuals) > visuals.maxTextWidth) {
      let emergencyFontSize = fontSize;

      while (
        emergencyFontSize > 1 &&
        measureTextWidth(
          targetText,
          emergencyFontSize,
          fontFamily,
          fontWeight,
          visuals,
        ) > visuals.maxTextWidth
      ) {
        emergencyFontSize -= 1;
      }

      fontSize = emergencyFontSize;
    }
  }

  const lineHeight = Math.ceil(fontSize * visuals.lineHeightRatio);
  const lines = [targetText];
  const width = Math.ceil(
    Math.max(
      fontSize + visuals.paddingX * 2,
      Math.min(
        visuals.maxTextWidth,
        measureTextWidth(targetText, fontSize, fontFamily, fontWeight, visuals),
      ),
    ),
  );
  const height = Math.ceil(lineHeight + visuals.paddingY * 2);

  return {
    ...caption,
    lines,
    fontSize,
    fontFamily,
    fontWeight,
    lineHeight,
    width,
    height,
  };
};
