# Subtitle Feed Template

Remotion + React 字幕瀑布流模板。目标是输入一组字幕数据，得到“当前字幕放大出现 + 历史字幕持续沉淀进全局容器”的连续画面。

## 当前实现

- 输入为字幕 JSON，单条字幕最少包含 `id`、`text`、`layoutKey`
- 时间支持 `startFrame/endFrame`、`startMs/endMs`、`durationMs`、`durationSeconds`
- 新增 `speech` 输入，可直接消费逐词时间或已切分好的分段时间
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
- `src/lib/segmenter.ts`
  - 逐词时间切分为字幕段
- `src/lib/speech-scene.ts`
  - 语音输入转换为模板输入
- `src/lib/generated-speech.ts`
  - 加载脚本生成的语音场景 JSON
- `src/lib/timeline.ts`
  - 时间输入归一化
- `src/lib/layout-config.ts`
  - 默认视觉参数与位移模式配置
- `src/lib/mock-data.ts`
  - 组合模板默认数据源
- `src/data/subtitles.json`
  - 唯一人工输入的字幕数据
- `src/data/generated-speech.json`
  - Edge TTS / Whisper 脚本生成结果
- `scripts/generate_speech_assets.py`
  - 本地生成音频与语音时间数据

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

## 自动生成语音链路

默认工作流：

1. 编辑 `src/data/subtitles.json`
2. 运行 `npm run speech:generate`
3. 脚本用 Edge TTS 生成 `public/audio/narration.mp3`
4. 脚本再用 Whisper 拉词级时间，输出 `src/data/generated-speech.json`
5. 模板默认读取生成结果，不再手写时间

## 语音输入格式

可以直接传已切好的分段：

```ts
speech: {
  audioSrc: 'audio/narration.mp3',
  segments: [
    {id: 'seg-1', text: '第一句字幕', startMs: 0, endMs: 1600, layoutKey: 'ccw'},
    {id: 'seg-2', text: '第二句字幕', startMs: 1800, endMs: 3200, layoutKey: 'cw'},
  ],
}
```

也可以传逐词时间，再由模板内部切分：

```ts
speech: {
  audioSrc: 'audio/narration.mp3',
  layoutSequence: ['ccw', 'cw', 'up'],
  chunking: {
    maxCharsPerCaption: 12,
  },
  words: [
    {text: '你好，', startMs: 0, endMs: 300},
    {text: '这是', startMs: 300, endMs: 520},
    {text: '第一句。', startMs: 520, endMs: 980},
  ],
}
```

切分规则：

- 超过 `maxCharsPerCaption` 时切分
- 命中标点时优先切分
- 很短的尾段会合并回上一段

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
./install.sh
```

如果要接音频文件，把文件放到 `public/audio/`，然后在 `speech.audioSrc` 中填相对路径，比如 `audio/narration.mp3`。

生成语音和时间数据：

```bash
source .venv/bin/activate
npm run speech:generate
```

额外前提：

- 本地需要 `ffmpeg` 和 `ffprobe`
- `install.sh` 会安装 Node 依赖、创建 `.venv`、安装 `edge-tts` 和 `faster-whisper`
- `speech:generate` 默认使用 `edge-tts` + `faster-whisper`
- Whisper 默认模型是 `small`，脚本支持通过 `--model` 覆盖
- 如果 `install.sh` 提示 `.venv/bin/pip` 不存在，先安装系统包：
  - `sudo apt install python3.x-venv`
  - `x` 要和 `python3 --version` 的次版本一致

## 当前设计约束

- 当前字幕只允许单行，不自动换行
- 文本不再使用可见卡片盒子，默认只保留字幕内容本身
- 调试层通过 `debug` 显式控制，不再写死在渲染层

## 调试开关

在 [src/lib/mock-data.ts](/home/heyicong/.openclaw/workspace/projects/subtitle-feed/src/lib/mock-data.ts) 中配置：

```ts
debug: {
  showContainerBounds: true,
  showCaptionBounds: false,
}
```

- `showContainerBounds`
  - 显示绿色容器包围盒
- `showCaptionBounds`
  - 给当前字幕和容器字幕加红框，便于观察真实字幕盒尺寸

## 建议的继续迭代方向

1. 给切分规则增加按停顿时长切分、按句长上限切分等策略
2. 给生成脚本补更强的字幕文本与 Whisper 结果对齐策略
3. 增加更多位移模式，同时保持“固定容器先确定尺寸再整体运动”的规则
4. 为字体、描边、阴影做纯文字风格的可配置化，而不是恢复卡片
