import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile} from 'remotion';
import {buildScenePropsFromProjectConfig} from '../lib/project-config';
import {GlyphFallSceneProps, SubtitleProjectConfig} from '../lib/types';
import {GlyphFallComposition} from './GlyphFallComposition';

const preparedManifestSrc = 'studio-input/current.json';

export const PreparedInputComposition: React.FC<GlyphFallSceneProps> = (props) => {
  const [sceneProps, setSceneProps] = useState<GlyphFallSceneProps>(props);

  useEffect(() => {
    const handle = delayRender(`Loading prepared studio input: ${preparedManifestSrc}`);
    let cancelled = false;

    fetch(staticFile(preparedManifestSrc))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load prepared studio input: ${response.status}`);
        }

        return response.json();
      })
      .then((payload: SubtitleProjectConfig) => {
        if (cancelled) {
          return;
        }

        setSceneProps(
          buildScenePropsFromProjectConfig(payload, {
            defaultDebug: {
              showContainerBounds: true,
              showCaptionBounds: true,
            },
          }),
        );
        continueRender(handle);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.warn(error);
        continueRender(handle);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!sceneProps) {
    return <AbsoluteFill style={{background: '#09090b'}} />;
  }

  return <GlyphFallComposition {...sceneProps} />;
};
