import {useEffect, useMemo} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {CaptionVisualConfig} from './types';

const CUSTOM_FONT_FAMILY = 'GlyphFallCustomFont';

export const getResolvedVisualFontFamily = (visuals: CaptionVisualConfig) =>
  visuals.fontUrl ? `"${CUSTOM_FONT_FAMILY}", ${visuals.fontFamily}` : visuals.fontFamily;

export const useFontLoader = (visuals: CaptionVisualConfig) => {
  const fontUrl = visuals.fontUrl ? staticFile(visuals.fontUrl) : null;
  const handle = useMemo(() => (fontUrl ? delayRender('Loading GlyphFall font') : null), [fontUrl]);

  useEffect(() => {
    if (!fontUrl || !handle) {
      return;
    }

    let cancelled = false;

    const loadFont = async () => {
      try {
        const fontFace = new FontFace(CUSTOM_FONT_FAMILY, `url(${fontUrl})`, {
          weight: '100 900',
          style: 'normal',
        });
        const loadedFont = await fontFace.load();

        if (cancelled) {
          return;
        }

        document.fonts.add(loadedFont);
        await document.fonts.load(
          `${visuals.fontWeight} 32px "${CUSTOM_FONT_FAMILY}"`,
          '字幕',
        );

        if (!cancelled) {
          continueRender(handle);
        }
      } catch (error) {
        if (!cancelled) {
          cancelRender(error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    loadFont();

    return () => {
      cancelled = true;
    };
  }, [fontUrl, handle, visuals.fontWeight]);
};
