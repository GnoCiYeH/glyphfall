import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {buildContainerEvents} from '../lib/container-layout';
import {resolveSpeechScene} from '../lib/speech-scene';
import {findActiveCaption, normalizeCaptionTimings} from '../lib/timeline';
import {measureCaption} from '../lib/text-layout';
import {GlyphFallSceneProps} from '../lib/types';
import {getResolvedVisualFontFamily, useFontLoader} from '../lib/use-font-loader';
import {useSpeechLoader} from '../lib/use-speech-loader';
import {ActiveCaption} from './ActiveCaption';
import {ContainerCaptions} from './ContainerCaptions';

export const GlyphFallComposition: React.FC<GlyphFallSceneProps> = (props) => {
  useFontLoader(props.visuals);
  const loadedSpeech = useSpeechLoader(props.speech);
  const frame = useCurrentFrame();
  const resolvedSpeech = resolveSpeechScene(loadedSpeech);
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
  const rootFontFamily = getResolvedVisualFontFamily(props.visuals);
  const resolvedAudioSrc = resolvedSpeech?.audioSrc
    ? /^(data:|https?:|file:)/.test(resolvedSpeech.audioSrc)
      ? resolvedSpeech.audioSrc
      : staticFile(resolvedSpeech.audioSrc)
    : null;

  return (
    <AbsoluteFill
      style={{
        background: props.backgroundColor ?? '#020617',
        overflow: 'hidden',
        fontFamily: rootFontFamily,
      }}
    >
      {resolvedAudioSrc ? <Audio src={resolvedAudioSrc} /> : null}
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
