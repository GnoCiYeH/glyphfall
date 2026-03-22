import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {defaultEnterEasing} from '../lib/animation';
import {CaptionLayoutConfig, CaptionToken, MeasuredCaption, CaptionVisualConfig} from '../lib/types';

type ActiveCaptionProps = {
  caption: MeasuredCaption | undefined;
  config: CaptionLayoutConfig | undefined;
  visuals: CaptionVisualConfig;
  showCaptionBounds?: boolean;
};

const captionCardStyle = (
  visuals: CaptionVisualConfig,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  lineHeight: number,
  rotation: number,
  scale: number,
): React.CSSProperties => ({
  position: 'absolute',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: `${visuals.paddingY}px ${visuals.paddingX}px`,
  borderRadius: visuals.borderRadius,
  color: '#f8fafc',
  fontSize,
  lineHeight: `${lineHeight}px`,
  fontWeight,
  fontFamily,
  letterSpacing: `${visuals.activeLetterSpacing}px`,
  backgroundColor: 'transparent',
  border: 'none',
  boxShadow: 'none',
  whiteSpace: 'nowrap',
  wordBreak: 'keep-all',
  overflowWrap: 'normal',
  transform: `scale(${scale}) rotate(${rotation}deg)`,
  transformOrigin: 'center center',
});

export const ActiveCaption: React.FC<ActiveCaptionProps> = ({
  caption,
  config,
  visuals,
  showCaptionBounds,
}) => {
  const frame = useCurrentFrame();
  const {width} = useVideoConfig();

  if (!caption || !config) {
    return null;
  }

  const enterFrame = frame - caption.startFrame;
  const enterDuration = Math.max(1, config.enterDurationFrames);
  const easing = config.enterEasing ?? [...defaultEnterEasing];
  const progress = interpolate(enterFrame, [0, enterDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(...easing),
  });
  const scale = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const left = width / 2 - caption.width / 2;
  const top = visuals.activeAnchorY - caption.height / 2;

  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left, top}}>
        <div
          style={{
            ...captionCardStyle(
              visuals,
              caption.fontSize,
              caption.fontFamily,
              caption.fontWeight,
              caption.lineHeight,
              0,
              scale,
            ),
            width: caption.width,
            minHeight: caption.height,
            outline: showCaptionBounds ? '2px solid rgba(239, 68, 68, 0.95)' : 'none',
            outlineOffset: 0,
          }}
        >
          {caption.tokens?.length ? (
            <div>
              {caption.tokens.map((token: CaptionToken, index) => (
                <span key={`${caption.id}-${index}`} style={{color: token.color ?? '#f8fafc'}}>
                  {token.text}
                </span>
              ))}
            </div>
          ) : (
            caption.lines.map((line, index) => <div key={`${caption.id}-${index}`}>{line}</div>)
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
