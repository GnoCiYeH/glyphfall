import {Composition, staticFile} from 'remotion';
import {GlyphFallComposition} from './components/GlyphFallComposition';
import {PreparedInputComposition} from './components/PreparedInputComposition';
import {demoSceneProps, exampleSceneEntries} from './lib/mock-data';
import {buildScenePropsFromProjectConfig} from './lib/project-config';
import {getSpeechSceneDurationInFrames} from './lib/speech-scene';
import {getDurationInFrames} from './lib/timeline';
import {SubtitleProjectConfig} from './lib/types';

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

const loadProjectConfigProps = async (manifestSrc: string | null) => {
  if (!manifestSrc) {
    return null;
  }

  try {
    const response = await fetch(staticFile(manifestSrc));
    if (!response.ok) {
      throw new Error(`Failed to load studio input manifest: ${response.status}`);
    }

    const payload = (await response.json()) as SubtitleProjectConfig;
    return buildScenePropsFromProjectConfig(payload, {
      defaultDebug: {
        showContainerBounds: true,
        showCaptionBounds: true,
      },
    });
  } catch (error) {
    console.warn('Failed to resolve studio input manifest', error);
    return null;
  }
};

export const Root = () => {
  return (
    <>
      {exampleSceneEntries.map((entry) => (
        <Composition
          key={entry.compositionId}
          id={entry.compositionId}
          component={GlyphFallComposition}
          durationInFrames={entry.props.durationInFrames}
          fps={entry.props.fps}
          width={entry.props.width}
          height={entry.props.height}
          defaultProps={entry.props}
          calculateMetadata={async ({props}) => {
            const mergedProps = {
              ...entry.props,
              ...props,
            };

            return {
              durationInFrames: await resolveDurationInFrames(mergedProps),
              fps: mergedProps.fps ?? entry.props.fps,
              width: mergedProps.width ?? entry.props.width,
              height: mergedProps.height ?? entry.props.height,
              props: mergedProps,
            };
          }}
        />
      ))}
      <Composition
        id="GlyphFallPreparedInput"
        component={PreparedInputComposition}
        durationInFrames={demoSceneProps.durationInFrames}
        fps={demoSceneProps.fps}
        width={demoSceneProps.width}
        height={demoSceneProps.height}
        defaultProps={demoSceneProps}
        calculateMetadata={async ({props}) => {
          const preparedInputProps = await loadProjectConfigProps('studio-input/current.json');
          const mergedProps = {
            ...demoSceneProps,
            ...props,
            ...(preparedInputProps ?? {}),
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
    </>
  );
};
