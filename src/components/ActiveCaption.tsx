import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {defaultEnterEasing} from '../lib/animation';
import {
  CaptionLayoutConfig,
  CaptionToken,
  CaptionVisualConfig,
  EffectsConfig,
  MeasuredCaption,
} from '../lib/types';

type ActiveCaptionProps = {
  caption: MeasuredCaption | undefined;
  config: CaptionLayoutConfig | undefined;
  visuals: CaptionVisualConfig;
  effects?: EffectsConfig;
  showCaptionBounds?: boolean;
};

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const randomFromSeed = (seed: number) => {
  const next = Math.sin(seed * 12.9898) * 43758.5453123;
  return next - Math.floor(next);
};

const renderCaptionContent = (caption: MeasuredCaption) => {
  if (caption.tokens?.length) {
    return (
      <div>
        {caption.tokens.map((token: CaptionToken, index) => (
          <span key={`${caption.id}-${index}`} style={{color: token.color ?? '#f8fafc'}}>
            {token.text}
          </span>
        ))}
      </div>
    );
  }

  return caption.lines.map((line, index) => <div key={`${caption.id}-${index}`}>{line}</div>);
};

const captionCardStyle = (
  visuals: CaptionVisualConfig,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  lineHeight: number,
  rotation: number,
  scale: number,
  brightness: number,
  textShadow: string,
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
  filter: `brightness(${brightness})`,
  textShadow,
});

export const ActiveCaption: React.FC<ActiveCaptionProps> = ({
  caption,
  config,
  visuals,
  effects,
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
  const assembleEffect = effects?.glyphAssemble;
  const assembleDuration = Math.max(1, assembleEffect?.durationFrames ?? enterDuration);
  const assembleProgress = interpolate(enterFrame, [0, assembleDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const assembleActive =
    assembleEffect?.enabled && enterFrame >= 0 && enterFrame <= assembleDuration;
  const assembleRows = Math.max(1, assembleEffect?.rows ?? 1);
  const assembleCols = Math.max(1, assembleEffect?.cols ?? 1);
  const totalSlices = assembleRows * assembleCols;
  const revealStart = Math.max(0, Math.min(1, assembleEffect?.textRevealStart ?? 0.45));
  const revealEnd = Math.max(revealStart + 0.01, Math.min(1, assembleEffect?.textRevealEnd ?? 0.85));
  const assembleFadeProgress = assembleActive
    ? interpolate(assembleProgress, [revealStart, revealEnd], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.quad),
      })
    : 1;
  const textRevealOpacity = 1;
  const assembleLayerOpacity = assembleActive
    ? Math.max(0, 1 - assembleFadeProgress * 0.9)
    : 0;
  const settleEffect = effects?.captionSettle;
  const settleDuration = Math.max(1, settleEffect?.durationFrames ?? 1);
  const settleTriggerOffset = enterDuration;
  const settleLocalFrame = frame - (caption.startFrame + settleTriggerOffset);
  const settlePeakFrame = Math.max(1, Math.round(settleDuration * 0.5));
  const settleBuildProgress = interpolate(settleLocalFrame, [0, settlePeakFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });
  const settleDecayProgress = interpolate(
    settleLocalFrame,
    [settlePeakFrame, settleDuration],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad),
    },
  );
  const settleEnvelope =
    settleLocalFrame <= settlePeakFrame ? settleBuildProgress : settleDecayProgress;
  const settleIntensity =
    settleEffect?.enabled && settleLocalFrame >= 0 && settleLocalFrame <= settleDuration
      ? settleEnvelope * (settleEffect.intensity ?? 0)
      : 0;
  const settleColor = settleEffect?.color ?? '#f8fafc';
  const settleScaleBoost =
    settleEffect?.enabled && settleEffect.preset === 'outline-pop'
      ? 1 + settleIntensity * 0.12
      : 1 + settleIntensity * 0.05;
  const brightness =
    settleEffect?.enabled && settleEffect.preset === 'flash'
      ? 1 + settleIntensity * 0.9
      : 1 + settleIntensity * 0.12;
  const textShadow =
    !settleEffect?.enabled || settleIntensity <= 0
      ? 'none'
      : settleEffect.preset === 'flash'
        ? `0 0 ${8 + settleIntensity * 18}px ${settleColor}`
        : [
            `0 0 ${2 + settleIntensity * 8}px ${settleColor}`,
            `0 0 ${5 + settleIntensity * 12}px ${settleColor}`,
          ].join(', ');
  const left = width / 2 - caption.width / 2;
  const top = visuals.activeAnchorY - caption.height / 2;

  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left, top}}>
        {assembleActive ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: caption.width,
              height: caption.height,
              pointerEvents: 'none',
              opacity: assembleLayerOpacity,
            }}
          >
            {Array.from({length: totalSlices}, (_, index) => {
              const row = Math.floor(index / assembleCols);
              const col = index % assembleCols;
              const sliceWidth = caption.width / assembleCols;
              const sliceHeight = caption.height / assembleRows;
              const centerX = (col + 0.5) * sliceWidth;
              const centerY = (row + 0.5) * sliceHeight;
              const seedBase = hashString(`${caption.id}:${row}:${col}:${caption.text}`);
              const startOffsetX =
                (randomFromSeed(seedBase + 1) - 0.5) * caption.width * (assembleEffect.scatter / 18);
              const startOffsetY =
                (randomFromSeed(seedBase + 2) - 0.5) * caption.height * (assembleEffect.scatter / 18);
              const driftX = (randomFromSeed(seedBase + 3) - 0.5) * 12;
              const driftY = (randomFromSeed(seedBase + 4) - 0.5) * 12;
              const rotation =
                (randomFromSeed(seedBase + 5) - 0.5) * (assembleEffect.rotation * 2);
              const x = centerX + (startOffsetX + driftX) * (1 - assembleProgress);
              const y = centerY + (startOffsetY + driftY) * (1 - assembleProgress);
              const opacity = 0.92;
              const scaleDown = 0.92 + assembleProgress * 0.08;

              return (
                <div
                  key={`${caption.id}-assemble-${index}`}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: sliceWidth,
                    height: sliceHeight,
                    overflow: 'hidden',
                    opacity,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scaleDown})`,
                    transformOrigin: 'center center',
                  }}
                >
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
                        1,
                        'none',
                      ),
                      width: caption.width,
                      minHeight: caption.height,
                      position: 'absolute',
                      left: -col * sliceWidth,
                      top: -row * sliceHeight,
                    }}
                  >
                    {renderCaptionContent(caption)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        <div
          style={{
            ...captionCardStyle(
              visuals,
              caption.fontSize,
              caption.fontFamily,
              caption.fontWeight,
              caption.lineHeight,
              0,
              scale * settleScaleBoost,
              brightness,
              textShadow,
            ),
            width: caption.width,
            minHeight: caption.height,
            opacity: textRevealOpacity,
            outline: showCaptionBounds ? '2px solid rgba(239, 68, 68, 0.95)' : 'none',
            outlineOffset: 0,
          }}
        >
          {renderCaptionContent(caption)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
