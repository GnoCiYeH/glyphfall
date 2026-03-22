import {Composition} from 'remotion';
import {SubtitleFeedComposition} from './components/SubtitleFeedComposition';
import {demoSceneProps} from './lib/mock-data';

export const Root = () => {
  return (
    <Composition
      id="SubtitleFeed"
      component={SubtitleFeedComposition}
      durationInFrames={demoSceneProps.durationInFrames}
      fps={demoSceneProps.fps}
      width={demoSceneProps.width}
      height={demoSceneProps.height}
      defaultProps={demoSceneProps}
    />
  );
};
