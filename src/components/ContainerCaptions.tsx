import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {resolveContainerItems, resolveContainerVisualState} from '../lib/container-layout';
import {CaptionVisualConfig, ContainerEvent} from '../lib/types';

type ContainerCaptionsProps = {
  events: ContainerEvent[];
  visuals: CaptionVisualConfig;
};

const cardStyle = (
  visuals: CaptionVisualConfig,
  fontSize: number,
  lineHeight: number,
  rotation: number,
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
  fontWeight: visuals.fontWeight,
  fontFamily: visuals.fontFamily,
  letterSpacing: `${visuals.activeLetterSpacing}px`,
  backgroundColor: 'transparent',
  border: 'none',
  boxShadow: 'none',
  whiteSpace: 'nowrap',
  wordBreak: 'keep-all',
  overflowWrap: 'normal',
  transform: `rotate(${rotation}deg)`,
  transformOrigin: 'top left',
});

export const ContainerCaptions: React.FC<ContainerCaptionsProps> = ({events, visuals}) => {
  const frame = useCurrentFrame();
  const visualState = resolveContainerVisualState(events, frame);
  const items = visualState
    ? visualState.event.fromItems.map((item) => ({
        ...item,
        x: item.x - visualState.left,
        y: item.y - visualState.top,
      }))
    : resolveContainerItems(events, frame);

  return (
    <AbsoluteFill>
      {visualState ? (
        <div
          style={{
            position: 'absolute',
            left: visualState.left,
            top: visualState.top,
            width: visualState.width,
            height: visualState.height,
            transformOrigin: visualState.transformOrigin,
            transform: `translateY(${visualState.translateY}px) rotate(${visualState.rotation}deg)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(34, 197, 94, 0.28)',
              border: '2px solid rgba(34, 197, 94, 0.8)',
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />
          {items.map((item) => (
            <div key={item.id} style={{position: 'absolute', left: item.x, top: item.y}}>
              <div
                style={{
                  ...cardStyle(visuals, item.fontSize, item.lineHeight, item.rotation),
                  width: item.width,
                  minHeight: item.height,
                }}
              >
                {item.lines.map((line, index) => (
                  <div key={`${item.id}-${index}`}>{line}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        items.map((item) => (
          <div key={item.id} style={{position: 'absolute', left: item.x, top: item.y}}>
            <div
              style={{
                ...cardStyle(visuals, item.fontSize, item.lineHeight, item.rotation),
                width: item.width,
                minHeight: item.height,
              }}
            >
              {item.lines.map((line, index) => (
                <div key={`${item.id}-${index}`}>{line}</div>
              ))}
            </div>
          </div>
        ))
      )}
    </AbsoluteFill>
  );
};
