# GlyphFall

GlyphFall 是一个基于 Remotion + React 的字幕瀑布流模板。目标是输入一组字幕数据，得到“当前字幕放大出现 + 历史字幕持续沉淀进全局容器”的连续画面。

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
  - 当前默认样例覆盖长短句、词级颜色、节点字号和不同位移/缩放效果
- `src/data/generated-speech.json`
  - Edge TTS / Whisper 脚本生成结果
- `scripts/generate_speech_assets.py`
  - 本地生成音频与语音时间数据
  - 会保留 `fontSize`、`fontFamily`、`fontWeight`、`tokens` 等字幕样式字段

## 输入格式

```ts
captions: [
  {id: 'c1', text: '第一条字幕', layoutKey: 'ccw'},
  {id: 'c2', text: '第二条字幕', layoutKey: 'cw'},
  {id: 'c3', text: '第三条字幕', layoutKey: 'up'},
]
```

也支持词级颜色和节点字号：

```ts
captions: [
  {
    id: 'c1',
    text: '第一条字幕',
    layoutKey: 'ccw',
    fontSize: 80,
    tokens: [
      {text: '第一条', color: '#facc15'},
      {text: '字幕', color: '#ffffff'},
    ],
  },
]
```

也支持全局字体配置和单条字幕字体覆盖：

```ts
visuals: {
  fontFamily: '"WenQuanYi Micro Hei", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
  fontUrl: 'fonts/NotoSansCJKsc-Regular.otf',
}

captions: [
  {
    id: 'c1',
    text: '第一条字幕',
    layoutKey: 'ccw',
    fontFamily: '"Source Han Serif SC", serif',
    fontWeight: 700,
  },
]
```

注意：

- 当 `visuals.autoFitFontSize = true` 时，模板会自动缩字并强制单行
- 这时会忽略单条字幕的 `fontSize`
- 当 `visuals.autoFitFontSize = false` 时，才会优先使用每条字幕自己的 `fontSize`
- `visuals.fontUrl` 可选；如果提供，就会从 `public/` 下加载字体文件
- 单条字幕可用 `fontFamily` / `fontWeight` 覆盖全局字体配置

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
    minCharsPerCaption: 4,
    breakOnPause: true,
    pauseThresholdMs: 360,
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
- 停顿超过 `pauseThresholdMs` 时优先切分
- 只有累计到 `minCharsPerCaption` 后才会因为停顿切开，避免过短碎片
- 很短的尾段会合并回上一段

## layoutKey 配置

```ts
{
  ccw: {
    mode: 'rotate_ccw_90',
    enterDurationFrames: 18,
    containerTransitionFrames: 14,
    scaleFactor: 1,
  },
  cw: {
    mode: 'rotate_cw_90',
    enterDurationFrames: 18,
    containerTransitionFrames: 14,
    scaleFactor: 1,
  },
  up: {
    mode: 'translate_up',
    enterDurationFrames: 18,
    containerTransitionFrames: 12,
    scaleFactor: 1,
  },
}
```

说明：

- `enterDurationFrames` 控制当前字幕出现阶段时长
- 容器位移最终以“新字幕出现时长”为准做强同步
- `translate_up` 默认按“容器底边对齐新字幕顶边”计算位移，不再用固定像素
- 容器在主位移/缩放后，还会额外补一段与新字幕盒模型的对齐位移
  - 容器在新字幕左边：容器右下角对齐新字幕左下角
  - 容器在新字幕上面：容器左下角对齐新字幕左上角
  - 容器在新字幕右边：容器左下角对齐新字幕右下角
- `scaleFactor` 是额外可选项，现有三种 `mode` 仍然必填
- 如果设置了 `scaleFactor`
  - 容器在新字幕左边时，以右下角为原点缩放
  - 容器在新字幕右边或者上方时，以左下角为原点缩放

## 字体配置

中文渲染如果出现乱码，通常不是模板逻辑问题，而是当前渲染环境里缺少可用的中文字库。

当前默认字体栈已经改成偏中文环境：

```ts
'"WenQuanYi Micro Hei", "Noto Sans CJK SC", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "SimHei", sans-serif'
```

如果当前机器仍然没有这些字体，推荐直接放一个字体文件到 `public/fonts/`，然后在 `visuals` 里配置：

```ts
visuals: {
  fontFamily: '"Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
  fontUrl: 'fonts/NotoSansCJKsc-Regular.otf',
}
```

规则：

- `fontUrl` 路径相对于 `public/`
- 模板会在运行时自动注入 `@font-face`
- 文本测量和最终渲染会使用同一套字体信息，避免红框和实际宽度不一致
- 单条字幕可继续通过 `fontFamily` / `fontWeight` 做局部覆盖

## 运行方式

Linux / macOS:

```bash
./install.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

或者：

```bat
scripts\install.bat
```

如果要接音频文件，把文件放到 `public/audio/`，然后在 `speech.audioSrc` 中填相对路径，比如 `audio/narration.mp3`。

生成语音和时间数据：

Linux / macOS:

```bash
source .venv/bin/activate
npm run speech:generate
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
python .\scripts\generate_speech_assets.py
```

渲染 MP4：

Linux / macOS:

```bash
source .venv/bin/activate
npm run render
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\render.ps1
```

Windows 也可以直接执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\render.ps1
```

或者：

```bat
scripts\render.bat
```

默认输出路径：

```bash
out/subtitle-feed.mp4
```

说明：

- 项目默认优先使用本机 Chromium 渲染，不走 Remotion 的浏览器下载逻辑
- 当前脚本会按这个顺序找浏览器：
  - Linux/macOS:
    - `REMOTION_BROWSER_EXECUTABLE`
    - `/snap/bin/chromium`
    - `/usr/bin/chromium-browser`
    - `/usr/bin/chromium`
  - Windows:
    - `REMOTION_BROWSER_EXECUTABLE`
    - `CHROME_PATH`
    - `CHROMIUM_PATH`
    - 常见的 Chrome / Chromium / Edge 安装路径

额外前提：

- 本地需要 `ffmpeg` 和 `ffprobe`
- `install.sh` / `scripts/install.ps1` 会安装 Node 依赖、创建 `.venv`、安装 `edge-tts` 和 `faster-whisper`
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

1. 给生成脚本补更强的字幕文本与 Whisper 结果对齐策略
2. 增加按句长上限和停顿优先级的更细粒度控制
3. 增加更多位移模式，同时保持“固定容器先确定尺寸再整体运动”的规则
4. 为字体、描边、阴影做纯文字风格的可配置化，而不是恢复卡片
