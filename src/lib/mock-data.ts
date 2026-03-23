import basicConfigJson from '../../examples/basic.json';
import deployFridayConfigJson from '../../examples/deploy-friday.json';
import lyricsDemoConfigJson from '../../examples/lyrics-demo.json';
import rubberDuckConfigJson from '../../examples/rubber-duck.json';
import standupRoastConfigJson from '../../examples/standup-roast.json';
import techLaunchConfigJson from '../../examples/tech-launch.json';
import twinkleDemoConfigJson from '../../examples/twinkle-demo.json';
import {buildScenePropsFromProjectConfig} from './project-config';
import {GlyphFallSceneProps, SubtitleProjectConfig} from './types';

export const exampleConfigs: Record<string, SubtitleProjectConfig> = {
  basic: basicConfigJson as SubtitleProjectConfig,
  'deploy-friday': deployFridayConfigJson as SubtitleProjectConfig,
  'lyrics-demo': lyricsDemoConfigJson as SubtitleProjectConfig,
  'rubber-duck': rubberDuckConfigJson as SubtitleProjectConfig,
  'standup-roast': standupRoastConfigJson as SubtitleProjectConfig,
  'tech-launch': techLaunchConfigJson as SubtitleProjectConfig,
  'twinkle-demo': twinkleDemoConfigJson as SubtitleProjectConfig,
};

const toCompositionId = (exampleName: string) => {
  const parts = exampleName.split('-').filter(Boolean);
  const suffix = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `GlyphFall${suffix || 'Example'}`;
};

export const exampleSceneEntries: Array<{
  exampleName: string;
  compositionId: string;
  props: GlyphFallSceneProps & {durationInFrames: number};
}> = Object.entries(exampleConfigs).map(([exampleName, config]) => ({
  exampleName,
  compositionId: toCompositionId(exampleName),
  props: buildScenePropsFromProjectConfig(config, {
    exampleName,
  }),
}));

export const demoSceneProps: GlyphFallSceneProps & {durationInFrames: number} =
  exampleSceneEntries[0]?.props;
