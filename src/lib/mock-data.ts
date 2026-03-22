import {defaultLayoutMap, defaultVisuals} from './layout-config';
import {getDurationInFrames} from './timeline';
import {SubtitleFeedSceneProps} from './types';

const fps = 30;
const tailHoldFrames = 36;
const timings = [
  {durationSeconds: 1.7},
  {durationSeconds: 1.9},
  {durationSeconds: 1.8},
  {durationSeconds: 1.7},
  {durationSeconds: 1.9},
] as const;

export const demoSceneProps: SubtitleFeedSceneProps & {durationInFrames: number} = {
  fps: 30,
  width: 1080,
  height: 1920,
  backgroundColor: '#09090b',
  tailHoldFrames,
  captions: [
    {id: 'c1', text: '先让第一条字幕站住画面中心', layoutKey: 'ccw'},
    {id: 'c2', text: '第二条一出来 第一条就沉进容器', layoutKey: 'cw'},
    {id: 'c3', text: '容器保持累计布局继续整体变化', layoutKey: 'up'},
    {id: 'c4', text: '旧字幕不会消失 只会自然溢出屏幕', layoutKey: 'ccw'},
    {id: 'c5', text: '这样就形成字幕瀑布流的增长感', layoutKey: 'cw'},
  ],
  timings: [...timings],
  layoutMap: defaultLayoutMap,
  visuals: defaultVisuals,
  durationInFrames: getDurationInFrames([...timings], fps, tailHoldFrames),
};
