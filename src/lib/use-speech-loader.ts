import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {SpeechSceneSource} from './types';

const isAbsoluteSource = (value: string) => /^(data:|https?:|file:)/.test(value);

const resolveRelativeMediaSrc = (manifestSrc: string, audioSrc?: string) => {
  if (!audioSrc || isAbsoluteSource(audioSrc)) {
    return audioSrc;
  }

  const segments = manifestSrc.split('/');
  segments.pop();
  const baseDir = segments.join('/');
  return baseDir ? `${baseDir}/${audioSrc}` : audioSrc;
};

export const useSpeechLoader = (speech?: SpeechSceneSource) => {
  const [loadedSpeech, setLoadedSpeech] = useState<SpeechSceneSource | undefined>(speech);

  useEffect(() => {
    if (!speech?.manifestSrc || speech.segments?.length || speech.words?.length) {
      setLoadedSpeech(speech);
      return;
    }

    const handle = delayRender(`Loading speech manifest: ${speech.manifestSrc}`);
    let cancelled = false;

    fetch(staticFile(speech.manifestSrc))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load speech manifest: ${response.status}`);
        }

        return response.json();
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        const resolvedAudioSrc = resolveRelativeMediaSrc(speech.manifestSrc!, payload.audioSrc);
        setLoadedSpeech({
          ...speech,
          ...payload,
          audioSrc: resolvedAudioSrc,
        });
        continueRender(handle);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.warn(error);
        setLoadedSpeech(undefined);
        continueRender(handle);
      });

    return () => {
      cancelled = true;
    };
  }, [speech]);

  return loadedSpeech;
};
