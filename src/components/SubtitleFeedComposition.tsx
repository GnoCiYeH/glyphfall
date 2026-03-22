import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {buildContainerEvents} from '../lib/container-layout';
import {resolveSpeechScene} from '../lib/speech-scene';
import {findActiveCaption, normalizeCaptionTimings} from '../lib/timeline';
import {measureCaption} from '../lib/text-layout';
import {SubtitleFeedSceneProps} from '../lib/types';
import {ActiveCaption} from './ActiveCaption';
import {ContainerCaptions} from './ContainerCaptions';

export const SubtitleFeedComposition: React.FC<SubtitleFeedSceneProps> = (props) => {
  const frame = useCurrentFrame();
  const resolvedSpeech = resolveSpeechScene(props.speech);
  const captions = resolvedSpeech?.captions ?? props.captions ?? [];
  const timings = resolvedSpeech?.timings ?? props.timings ?? [];
  const normalizedCaptions = normalizeCaptionTimings(captions, timings, props.fps);
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
  const resolvedFontUrl = props.visuals.fontUrl ? staticFile(props.visuals.fontUrl) : null;
  const fontFaceCss = resolvedFontUrl
    ? `
@font-face {
  font-family: "GlyphFallCustomFont";
  src: url("${resolvedFontUrl}");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}`
    : '';
  const rootFontFamily = resolvedFontUrl
    ? `"GlyphFallCustomFont", ${props.visuals.fontFamily}`
    : props.visuals.fontFamily;

  return (
    <AbsoluteFill
      style={{
        background: props.backgroundColor ?? '#020617',
        overflow: 'hidden',
        fontFamily: rootFontFamily,
      }}
    >
      {fontFaceCss ? <style>{fontFaceCss}</style> : null}
      {resolvedSpeech?.audioSrc ? <Audio src={staticFile(resolvedSpeech.audioSrc)} /> : null}
      <Sequence from={0}>
        <ContainerCaptions
          events={events}
          visuals={props.visuals}
          showContainerBounds={props.debug?.showContainerBounds}
          showCaptionBounds={props.debug?.showCaptionBounds}
        />
      </Sequence>
      <Sequence from={0}>
        <ActiveCaption
          caption={activeCaption}
          config={activeConfig}
          visuals={props.visuals}
          showCaptionBounds={props.debug?.showCaptionBounds}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
