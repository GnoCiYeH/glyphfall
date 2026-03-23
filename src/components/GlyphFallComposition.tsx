import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {buildContainerEvents} from '../lib/container-layout';
import {resolveSpeechScene} from '../lib/speech-scene';
import {findActiveCaption, normalizeCaptionTimings} from '../lib/timeline';
import {measureCaption} from '../lib/text-layout';
import {BackgroundMusicCue, DuckingConfig, GlyphFallSceneProps, TimedSegment} from '../lib/types';
import {getResolvedVisualFontFamily, useFontLoader} from '../lib/use-font-loader';
import {useSpeechLoader} from '../lib/use-speech-loader';
import {ActiveCaption} from './ActiveCaption';
import {ContainerCaptions} from './ContainerCaptions';

const isAbsoluteMediaSrc = (value: string) => /^(data:|https?:|file:)/.test(value);

const resolveMediaSrc = (value: string) => {
  return isAbsoluteMediaSrc(value) ? value : staticFile(value);
};

const resolveCueStartFrame = (startMs: number | undefined, startFrame: number | undefined, fps: number) => {
  if (typeof startFrame === 'number') {
    return Math.max(0, Math.round(startFrame));
  }

  if (typeof startMs === 'number') {
    return Math.max(0, Math.round((startMs / 1000) * fps));
  }

  return 0;
};

const resolveCueDurationFrames = (
  durationMs: number | undefined,
  durationFrames: number | undefined,
  fps: number,
) => {
  if (typeof durationFrames === 'number') {
    return Math.max(1, Math.round(durationFrames));
  }

  if (typeof durationMs === 'number') {
    return Math.max(1, Math.round((durationMs / 1000) * fps));
  }

  return null;
};

const resolveEnvelopeFrames = (
  durationMs: number | undefined,
  durationFrames: number | undefined,
  fps: number,
) => {
  if (typeof durationFrames === 'number') {
    return Math.max(0, Math.round(durationFrames));
  }

  if (typeof durationMs === 'number') {
    return Math.max(0, Math.round((durationMs / 1000) * fps));
  }

  return 0;
};

const getDuckingFactor = (
  frame: number,
  segments: TimedSegment[],
  fps: number,
  duckedMultiplier: number,
  attackMs?: number,
  attackFrames?: number,
  releaseMs?: number,
  releaseFrames?: number,
) => {
  if (segments.length === 0) {
    return 1;
  }

  const attack = resolveEnvelopeFrames(attackMs, attackFrames, fps);
  const release = resolveEnvelopeFrames(releaseMs, releaseFrames, fps);
  let factor = 1;

  for (const segment of segments) {
    const startFrame = Math.max(0, Math.round((segment.startMs / 1000) * fps));
    const endFrame = Math.max(startFrame, Math.round((segment.endMs / 1000) * fps));

    if (frame < startFrame - attack || frame > endFrame + release) {
      continue;
    }

    if (frame < startFrame && attack > 0) {
      const progress = (frame - (startFrame - attack)) / attack;
      factor = Math.min(factor, 1 - (1 - duckedMultiplier) * progress);
      continue;
    }

    if (frame <= endFrame) {
      factor = Math.min(factor, duckedMultiplier);
      continue;
    }

    if (release > 0) {
      const progress = (frame - endFrame) / release;
      factor = Math.min(factor, duckedMultiplier + (1 - duckedMultiplier) * progress);
    }
  }

  return factor;
};

const BackgroundMusicTrack: React.FC<{
  cue: BackgroundMusicCue;
  fps: number;
  speechSegments: TimedSegment[];
  ducking?: DuckingConfig;
}> = ({cue, fps, speechSegments, ducking}) => {
  const frame = useCurrentFrame();
  const startFrame = resolveCueStartFrame(cue.startMs, cue.startFrame, fps);
  const durationInFrames = resolveCueDurationFrames(cue.durationMs, cue.durationFrames, fps);
  const fadeInFrames = resolveEnvelopeFrames(cue.fadeInMs, cue.fadeInFrames, fps);
  const fadeOutFrames = resolveEnvelopeFrames(cue.fadeOutMs, cue.fadeOutFrames, fps);
  const cueSrc = cue.src.trim();
  const resolvedSrc = resolveMediaSrc(cueSrc);

  let fadeMultiplier = 1;
  if (fadeInFrames > 0 && frame < fadeInFrames) {
    fadeMultiplier = Math.min(fadeMultiplier, frame / fadeInFrames);
  }

  if (durationInFrames !== null && fadeOutFrames > 0 && frame > durationInFrames - fadeOutFrames) {
    const remaining = Math.max(0, durationInFrames - frame);
    fadeMultiplier = Math.min(fadeMultiplier, remaining / fadeOutFrames);
  }

  const absoluteFrame = startFrame + frame;
  const duckingMultiplier =
    ducking?.enabled
      ? getDuckingFactor(
          absoluteFrame,
          speechSegments,
          fps,
          ducking.volumeMultiplier,
          ducking.attackMs,
          ducking.attackFrames,
          ducking.releaseMs,
          ducking.releaseFrames,
        )
      : 1;

  const volume = Math.max(0, (cue.volume ?? 1) * fadeMultiplier * duckingMultiplier);

  return (
    <Audio
      src={resolvedSrc}
      volume={volume}
      playbackRate={cue.playbackRate ?? 1}
    />
  );
};

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
    ? resolveMediaSrc(resolvedSpeech.audioSrc)
    : null;
  const backgroundMusic = props.backgroundMusic ?? [];
  const speechSegments = loadedSpeech?.segments ?? [];

  return (
    <AbsoluteFill
      style={{
        background: props.backgroundColor ?? '#020617',
        overflow: 'hidden',
        fontFamily: rootFontFamily,
      }}
    >
      {resolvedAudioSrc ? <Audio src={resolvedAudioSrc} /> : null}
      {backgroundMusic.map((cue, index) => {
        const cueSrc = cue.src?.trim();
        if (!cueSrc) {
          return null;
        }

        const from = resolveCueStartFrame(cue.startMs, cue.startFrame, props.fps);
        const durationInFrames = resolveCueDurationFrames(
          cue.durationMs,
          cue.durationFrames,
          props.fps,
        );

        return (
          <Sequence
            key={`bgm-${index}-${cueSrc}`}
            from={from}
            durationInFrames={durationInFrames ?? undefined}
          >
            <BackgroundMusicTrack
              cue={cue}
              fps={props.fps}
              speechSegments={speechSegments}
              ducking={props.audioMix?.ducking}
            />
          </Sequence>
        );
      })}
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
          effects={props.effects}
          showCaptionBounds={props.debug?.showCaptionBounds}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
