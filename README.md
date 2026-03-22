# Subtitle Feed Template

Remotion + React 字幕瀑布流模板。目标是输入一组字幕数据，得到“当前字幕放大出现 + 历史字幕持续沉淀进全局容器”的连续画面。

## 当前实现

- 输入为 JSON 数组，单条字幕最少包含 `id`、`text`、`layoutKey`
- 时间支持 `startFrame/endFrame`、`startMs/endMs`、`durationMs`、`durationSeconds`
- 当前字幕从中心位置由小到大出现
- 新字幕开始出现时，上一条字幕进入全局容器
- 容器支持三种位移模式
  - `rotate_ccw_90`
  - `rotate_cw_90`
  - `translate_up`
- 容器位移与新字幕出现阶段强同步
- 历史字幕不消失，持续累积并自然溢出画面
- 文本宽度按真实字体测量，尽量贴合内容本身

## 项目结构

- `src/components/SubtitleFeedComposition.tsx`
  - 主合成入口
- `src/components/ActiveCaption.tsx`
  - 当前字幕渲染与出现动画
- `src/components/ContainerCaptions.tsx`
  - 容器层渲染
- `src/lib/container-layout.ts`
  - 容器累计布局、旋转原点、上移逻辑
- `src/lib/text-layout.ts`
  - 字幕字号与单行宽度测量
- `src/lib/timeline.ts`
  - 时间输入归一化
- `src/lib/layout-config.ts`
  - 默认视觉参数与位移模式配置
- `src/lib/mock-data.ts`
  - 本地示例数据

## 输入格式

```ts
captions: [
  {id: 'c1', text: '第一条字幕', layoutKey: 'ccw'},
  {id: 'c2', text: '第二条字幕', layoutKey: 'cw'},
  {id: 'c3', text: '第三条字幕', layoutKey: 'up'},
]
```

```ts
timings: [
  {durationSeconds: 1.8},
  {startMs: 1800, endMs: 3600},
  {startFrame: 108, endFrame: 168},
]
```

## layoutKey 配置

```ts
{
  ccw: {
    mode: 'rotate_ccw_90',
    enterDurationFrames: 18,
    containerTransitionFrames: 14,
  },
  cw: {
    mode: 'rotate_cw_90',
    enterDurationFrames: 18,
    containerTransitionFrames: 14,
  },
  up: {
    mode: 'translate_up',
    enterDurationFrames: 18,
    containerTransitionFrames: 12,
  },
}
```

说明：

- `enterDurationFrames` 控制当前字幕出现阶段时长
- 容器位移最终以“新字幕出现时长”为准做强同步
- `translate_up` 默认按“容器底边对齐新字幕顶边”计算位移，不再用固定像素

## 运行方式

```bash
npm install
npm run studio
```

## 当前设计约束

- 当前字幕只允许单行，不自动换行
- 文本不再使用可见卡片盒子，默认只保留字幕内容本身
- 容器绿色底板目前保留为调试辅助，可继续按需移除

## 建议的继续迭代方向

1. 把绿色容器调试层做成显式开关，不再写死在渲染层
2. 把输入数据与 Edge TTS / Whisper 的真实产物对接，而不是依赖 mock
3. 增加更多位移模式，同时保持“固定容器先确定尺寸再整体运动”的规则
4. 为字体、描边、阴影做纯文字风格的可配置化，而不是恢复卡片
