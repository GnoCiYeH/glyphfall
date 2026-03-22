import {Composition, staticFile} from 'remotion';
import {GlyphFallComposition} from './components/GlyphFallComposition';
import {demoSceneProps} from './lib/mock-data';
import {getSpeechSceneDurationInFrames} from './lib/speech-scene';
import {getDurationInFrames} from './lib/timeline';

const resolveDurationInFrames = async (props: typeof demoSceneProps) => {
  const fps = props.fps ?? demoSceneProps.fps;
  const tailHoldFrames = props.tailHoldFrames ?? demoSceneProps.tailHoldFrames ?? 0;

  if (props.speech?.segments?.length || props.speech?.words?.length) {
    return getSpeechSceneDurationInFrames(props.speech, fps, tailHoldFrames);
  }

  if (props.speech?.manifestSrc) {
    try {
      const response = await fetch(staticFile(props.speech.manifestSrc));
      if (response.ok) {
        const payload = await response.json();
        return getSpeechSceneDurationInFrames(
          {
            ...props.speech,
            ...payload,
          },
          fps,
          tailHoldFrames,
        );
      }
    } catch (error) {
      console.warn('Failed to resolve speech manifest duration', error);
    }
  }

  if (props.timings?.length) {
    return getDurationInFrames(props.timings, fps, tailHoldFrames);
  }

  return props.durationInFrames ?? demoSceneProps.durationInFrames;
};

export const Root = () => {
  return (
    <Composition
      id="GlyphFall"
      component={GlyphFallComposition}
      durationInFrames={demoSceneProps.durationInFrames}
      fps={demoSceneProps.fps}
      width={demoSceneProps.width}
      height={demoSceneProps.height}
      defaultProps={demoSceneProps}
      calculateMetadata={async ({props}) => {
        const mergedProps = {
          ...demoSceneProps,
          ...props,
        };

        return {
          durationInFrames: await resolveDurationInFrames(mergedProps),
          fps: mergedProps.fps ?? demoSceneProps.fps,
          width: mergedProps.width ?? demoSceneProps.width,
          height: mergedProps.height ?? demoSceneProps.height,
          props: mergedProps,
        };
      }}
    />
  );
};
