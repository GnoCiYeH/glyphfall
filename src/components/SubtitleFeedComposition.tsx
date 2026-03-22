import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {buildContainerEvents} from '../lib/container-layout';
import {findActiveCaption, normalizeCaptionTimings} from '../lib/timeline';
import {measureCaption} from '../lib/text-layout';
import {SubtitleFeedSceneProps} from '../lib/types';
import {ActiveCaption} from './ActiveCaption';
import {ContainerCaptions} from './ContainerCaptions';

export const SubtitleFeedComposition: React.FC<SubtitleFeedSceneProps> = (props) => {
  const frame = useCurrentFrame();
  const normalizedCaptions = normalizeCaptionTimings(props.captions, props.timings, props.fps);
  const measuredCaptions = normalizedCaptions.map((caption) => measureCaption(caption, props.visuals));
  const activeCaption = findActiveCaption(measuredCaptions, frame);
  const activeAnchorX = props.width / 2;
  const events = buildContainerEvents(
    measuredCaptions,
    props.layoutMap,
    activeAnchorX,
    props.visuals.activeAnchorY,
  );
  const activeConfig = activeCaption ? props.layoutMap[activeCaption.layoutKey] : undefined;

  return (
    <AbsoluteFill
      style={{
        background: props.backgroundColor ?? '#020617',
        overflow: 'hidden',
        fontFamily: props.visuals.fontFamily,
      }}
    >
      <Sequence from={0}>
        <ContainerCaptions events={events} visuals={props.visuals} />
      </Sequence>
      <Sequence from={0}>
        <ActiveCaption caption={activeCaption} config={activeConfig} visuals={props.visuals} />
      </Sequence>
    </AbsoluteFill>
  );
};
