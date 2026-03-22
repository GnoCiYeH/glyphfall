# GlyphFall

GlyphFall 是一个基于 Remotion + React 的字幕瀑布流模板。目标是输入一组字幕数据，得到“当前字幕放大出现 + 历史字幕持续沉淀进全局容器”的连续画面。

当前推荐的输入入口是 `examples/*.json`。字幕内容、画面参数、调试开关、字体、位移配置、语音参数都在这些 JSON 文件里维护。生成产物统一输出到 `build/`。

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

- `src/components/GlyphFallComposition.tsx`
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
- `src/lib/timeline.ts`
  - 时间输入归一化
- `src/lib/layout-config.ts`
  - 默认视觉参数与位移模式配置
- `src/lib/mock-data.ts`
  - 组合模板默认数据源
- `examples/basic.json`
  - 默认示例输入
  - 当前内容是一个“凌晨 merge 冲突”风格的程序员幽默短故事
  - 带多人声、语气变化、词级颜色和不同字号
- `examples/deploy-friday.json`
  - “周五上线”风格示例
  - 适合看多人声吐槽和短句节奏
- `examples/rubber-duck.json`
  - “小黄鸭调试”风格示例
  - 适合看长短句混排和更明显的角色变化
- `examples/tech-launch.json`
  - “科技发布会翻车”风格示例
  - 适合看发布会口吻、角色反差和偏标题感的节奏
- `examples/standup-roast.json`
  - “晨会群口吐槽”风格示例
  - 适合看更密集的对白切换和短句推进
- `build/<input-hash>/generated-speech.json`
  - Edge TTS / Whisper 生成结果
- `build/<input-hash>/narration.mp3`
  - 中间音频产物
- `build/<input-hash>/render-props.json`
  - 渲染时实际使用的 props 快照
- `scripts/generate_speech_assets.py`
  - 本地生成音频与语音时间数据
  - 会保留 `fontSize`、`fontFamily`、`fontWeight`、`tokens` 等字幕样式字段
  - 同时会刷新 `public/studio-preview/<example-name>/`，供 Studio 默认预览带声音使用

## 输入格式

```ts
{
  fps: 30,
  width: 1080,
  height: 1920,
  backgroundColor: '#09090b',
  debug: {
    showContainerBounds: true,
    showCaptionBounds: true,
  },
  visuals: {
    fontUrl: 'fonts/SmileySans-Oblique.otf',
    fontFamily: '"Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
  },
  effects: {
    captionSettle: {
      enabled: false,
    },
    glyphAssemble: {
      enabled: true,
      preset: 'content-slices',
    },
  },
  layoutMap: {
    ccw: {mode: 'rotate_ccw_90'},
    cw: {mode: 'rotate_cw_90'},
    up: {mode: 'translate_up'},
  },
  captions: [
    {id: 'c1', text: '第一条字幕', layoutKey: 'ccw'},
    {id: 'c2', text: '第二条字幕', layoutKey: 'cw'},
    {id: 'c3', text: '第三条字幕', layoutKey: 'up'},
  ],
}
```

## 配置参考

`examples/*.json` 目前是推荐输入入口。顶层可选项如下：

- `fps`: 视频帧率，默认 `30`
- `width`: 画布宽度，默认 `1080`
- `height`: 画布高度，默认 `1920`
- `tailHoldFrames`: 最后一条字幕结束后额外停留帧数，默认 `36`
- `backgroundColor`: 背景色
- `outputVideoName`: 输出视频名；如果不写，默认使用输入文件 hash
- `debug`: 调试开关
- `visuals`: 字体和字幕视觉配置
- `effects`: 当前字幕视觉特效配置
- `layoutMap`: 各种 `layoutKey` 的位移与动画配置
- `audioSrc`: 可选的中间音频文件名，默认 `narration.mp3`，输出到 `build/<input-hash>/`
- `voice`: 全局默认人声
- `rate`: 全局默认语速，例如 `+0%`
- `pitch`: 全局默认音高，例如 `+0Hz`
- `volume`: 全局默认音量，例如 `+0%`
- `utterances`: 完整语句层，用于保留原始断句，也用于多人声配置
- `captions`: 字幕节点层，控制画面上的每条字幕
- `layoutSequence`: 当分段结果没写 `layoutKey` 时的轮换顺序
- `chunking`: 逐词切分配置，主要用于直接消费逐词时间时

`debug` 可选项：

- `showContainerBounds`: 是否显示绿色容器边界
- `showCaptionBounds`: 是否显示红色字幕边界

`visuals` 可选项：

- `fontFamily`: 全局字体族
- `fontUrl`: `public/` 下的字体文件相对路径
- `fontWeight`: 全局字重
- `autoFitFontSize`: 是否自动缩字并强制单行
- `maxFontSize`: 自动缩字开启时的最大字号
- `minFontSize`: 自动缩字开启时的最小字号
- `lineHeightRatio`: 行高比例
- `maxTextWidth`: 单条字幕的最大宽度
- `paddingX`: 水平内边距
- `paddingY`: 垂直内边距
- `borderRadius`: 字幕盒圆角
- `activeAnchorY`: 当前字幕的垂直锚点
- `activeLetterSpacing`: 字距

`effects` 可选项：

- `captionSettle`: 当前字幕落定后的轻微回弹 / 发光效果
- `glyphAssemble`: 当前字幕出现阶段的真实内容切片聚合效果

`effects.captionSettle` 可选项：

- `enabled`: 是否启用
- `preset`: 当前支持 `flash`、`outline-pop`
- `durationFrames`: 效果持续帧数
- `intensity`: 效果强度
- `color`: 辅助高光颜色

`effects.glyphAssemble` 可选项：

- `enabled`: 是否启用
- `preset`: 当前支持 `content-slices`
- `durationFrames`: 切片聚合持续帧数
- `rows`: 切片行数
- `cols`: 切片列数
- `scatter`: 切片初始散开距离
- `rotation`: 切片初始随机旋转幅度
- `textRevealStart`: 完整字幕开始接管的归一化时机
- `textRevealEnd`: 完整字幕完成接管的归一化时机

`layoutMap` 每个条目可选项：

- `mode`: 必填，当前支持 `rotate_ccw_90`、`rotate_cw_90`、`translate_up`
- `enterDurationFrames`: 新字幕出现时长，同时也是容器位移时长
- `containerTransitionFrames`: 兼容保留字段，当前主要以 `enterDurationFrames` 为同步基准
- `enterEasing`: 四元数组形式的 cubic-bezier，例如 `[0.22, 1, 0.36, 1]`
- `translateDistancePx`: 仅 `translate_up` 可手动指定上移距离；不写则自动贴边
- `scaleFactor`: 额外缩放倍率，`1` 表示不缩放

`utterances` 每个条目可选项：

- `id`: 必填，完整语句 ID
- `text`: 必填，完整要说出来的话
- `voice`: 当前语句的人声，未填写则回退到顶层 `voice`
- `rate`: 当前语句语速，未填写则回退到顶层 `rate`
- `pitch`: 当前语句音高，未填写则回退到顶层 `pitch`
- `volume`: 当前语句音量，未填写则回退到顶层 `volume`

`captions` 每个条目可选项：

- `id`: 必填，字幕节点 ID
- `text`: 必填，这条字幕在画面上显示的文字
- `layoutKey`: 必填，对应 `layoutMap` 中的某个键
- `utteranceId`: 可选，引用所属完整语句；如果不写，则默认把这条字幕自己视为一条完整语句
- `fontSize`: 单条字幕字号；仅在 `visuals.autoFitFontSize = false` 时生效
- `fontFamily`: 单条字幕字体族覆盖
- `fontWeight`: 单条字幕字重覆盖
- `tokens`: 词级颜色配置数组

`tokens` 每个条目可选项：

- `text`: 必填，这个 token 的文本
- `color`: 可选，这个 token 的颜色

`chunking` 可选项：

- `maxCharsPerCaption`: 单段最大字符数
- `minCharsPerCaption`: 单段最小字符数
- `breakOnPunctuation`: 是否遇到标点优先切分
- `punctuationChars`: 用于切分的标点集合
- `mergeShortTail`: 是否把过短尾段并回上一段
- `pauseThresholdMs`: 停顿阈值，单位毫秒
- `breakOnPause`: 是否按停顿切分

## 字段速查表

顶层字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `fps` | `number` | 否 | 视频帧率，默认 `30` |
| `width` | `number` | 否 | 视频宽度，默认 `1080` |
| `height` | `number` | 否 | 视频高度，默认 `1920` |
| `tailHoldFrames` | `number` | 否 | 最后一条字幕结束后的额外停留帧 |
| `backgroundColor` | `string` | 否 | 背景色 |
| `debug` | `object` | 否 | 调试开关 |
| `visuals` | `object` | 否 | 字体和字幕视觉配置 |
| `effects` | `object` | 否 | 当前字幕特效配置 |
| `layoutMap` | `object` | 否 | `layoutKey` 到动画配置的映射 |
| `audioSrc` | `string` | 否 | build 中间音频文件名 |
| `voice` | `string` | 否 | 全局默认人声 |
| `rate` | `string` | 否 | 全局默认语速 |
| `pitch` | `string` | 否 | 全局默认音高 |
| `volume` | `string` | 否 | 全局默认音量 |
| `layoutSequence` | `string[]` | 否 | 当缺少 `layoutKey` 时的轮换顺序 |
| `chunking` | `object` | 否 | 逐词切分配置 |
| `utterances` | `object[]` | 否 | 完整语句层，同时承载多人声配置 |
| `captions` | `object[]` | 是 | 画面字幕节点 |

`debug`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `showContainerBounds` | `boolean` | 否 | 显示绿色容器边界 |
| `showCaptionBounds` | `boolean` | 否 | 显示红色字幕边界 |

`visuals`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `fontFamily` | `string` | 否 | 全局字体族 |
| `fontUrl` | `string` | 否 | `public/` 下字体文件路径 |
| `fontWeight` | `number` | 否 | 全局字重 |
| `autoFitFontSize` | `boolean` | 否 | 自动缩字并强制单行 |
| `maxFontSize` | `number` | 否 | 自动缩字时的最大字号 |
| `minFontSize` | `number` | 否 | 自动缩字时的最小字号 |
| `lineHeightRatio` | `number` | 否 | 行高比例 |
| `maxTextWidth` | `number` | 否 | 单条字幕最大宽度 |
| `paddingX` | `number` | 否 | 水平内边距 |
| `paddingY` | `number` | 否 | 垂直内边距 |
| `borderRadius` | `number` | 否 | 字幕盒圆角 |
| `activeAnchorY` | `number` | 否 | 当前字幕垂直锚点 |
| `activeLetterSpacing` | `number` | 否 | 字距 |

`effects`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `captionSettle` | `object` | 否 | 当前字幕落定特效 |
| `glyphAssemble` | `object` | 否 | 当前字幕切片聚合特效 |

`effects.captionSettle`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `enabled` | `boolean` | 否 | 是否启用 |
| `preset` | `'flash' \| 'outline-pop'` | 否 | 落定特效预设 |
| `durationFrames` | `number` | 否 | 持续帧数 |
| `intensity` | `number` | 否 | 特效强度 |
| `color` | `string` | 否 | 辅助高光颜色 |

`effects.glyphAssemble`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `enabled` | `boolean` | 否 | 是否启用 |
| `preset` | `'content-slices'` | 否 | 真实字幕切片聚合预设 |
| `durationFrames` | `number` | 否 | 聚合持续帧数 |
| `rows` | `number` | 否 | 切片行数 |
| `cols` | `number` | 否 | 切片列数 |
| `scatter` | `number` | 否 | 初始散开距离 |
| `rotation` | `number` | 否 | 初始随机旋转幅度 |
| `textRevealStart` | `number` | 否 | 完整字幕开始接管时机 |
| `textRevealEnd` | `number` | 否 | 完整字幕完成接管时机 |

`layoutMap[*]`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mode` | `'rotate_ccw_90' \| 'rotate_cw_90' \| 'translate_up'` | 是 | 主位移模式 |
| `enterDurationFrames` | `number` | 否 | 新字幕出现和容器位移的统一时长 |
| `containerTransitionFrames` | `number` | 否 | 兼容保留字段 |
| `enterEasing` | `[number, number, number, number]` | 否 | cubic-bezier 曲线 |
| `translateDistancePx` | `number` | 否 | `translate_up` 的手动位移 |
| `scaleFactor` | `number` | 否 | 额外缩放倍率 |

`utterances[*]`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 完整语句 ID |
| `text` | `string` | 是 | 完整要说的话 |
| `voice` | `string` | 否 | 当前语句的人声 |
| `rate` | `string` | 否 | 当前语句语速 |
| `pitch` | `string` | 否 | 当前语句音高 |
| `volume` | `string` | 否 | 当前语句音量 |

`captions[*]`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 字幕节点 ID |
| `text` | `string` | 是 | 画面上显示的文本 |
| `layoutKey` | `string` | 是 | 对应 `layoutMap` 的键 |
| `utteranceId` | `string` | 否 | 所属完整语句 ID |
| `fontSize` | `number` | 否 | 单条字幕字号覆盖 |
| `fontFamily` | `string` | 否 | 单条字幕字体覆盖 |
| `fontWeight` | `number` | 否 | 单条字幕字重覆盖 |
| `tokens` | `object[]` | 否 | 词级颜色配置 |

`tokens[*]`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | 是 | token 文本 |
| `color` | `string` | 否 | token 颜色 |

`chunking`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `maxCharsPerCaption` | `number` | 否 | 单段最大字符数 |
| `minCharsPerCaption` | `number` | 否 | 单段最小字符数 |
| `breakOnPunctuation` | `boolean` | 否 | 是否遇标点优先切分 |
| `punctuationChars` | `string[]` | 否 | 切分用标点集合 |
| `mergeShortTail` | `boolean` | 否 | 是否合并过短尾段 |
| `pauseThresholdMs` | `number` | 否 | 停顿阈值，毫秒 |
| `breakOnPause` | `boolean` | 否 | 是否按停顿切分 |

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

也支持“字幕切分”和“语音整句”分离：

```ts
utterances: [
  {
    id: 'u2',
    text: '以及教大家怎么样做这样的旋转瀑布。',
  },
],

captions: [
  {
    id: 'c1',
    text: '以及教大家',
    utteranceId: 'u2',
    layoutKey: 'ccw',
  },
  {
    id: 'c2',
    text: '怎么样做这样的',
    utteranceId: 'u2',
    layoutKey: 'cw',
  },
  {
    id: 'c3',
    text: '旋转瀑布',
    utteranceId: 'u2',
    layoutKey: 'up',
  },
]
```

也支持同一个视频里的多个人声：

```ts
voice: 'zh-CN-XiaoxiaoNeural',

utterances: [
  {
    id: 'u1',
    text: '第一位说话人的一句话。',
    voice: 'zh-CN-XiaoxiaoNeural',
  },
  {
    id: 'u2',
    text: '第二位说话人的一句话。',
    voice: 'zh-CN-YunxiNeural',
    rate: '+4%',
    pitch: '+2Hz',
  },
]
```

注意：

- 当 `visuals.autoFitFontSize = true` 时，模板会自动缩字并强制单行
- 这时会忽略单条字幕的 `fontSize`
- 当 `visuals.autoFitFontSize = false` 时，才会优先使用每条字幕自己的 `fontSize`
- `visuals.fontUrl` 可选；如果提供，就会从 `public/` 下加载字体文件
- 单条字幕可用 `fontFamily` / `fontWeight` 覆盖全局字体配置
- 如果多条字幕属于同一句完整话术，在顶层 `utterances` 中定义整句内容
- 每条字幕通过 `utteranceId` 引用所属整句，语音按整句合成，画面仍按字幕节点切分
- 全局 `voice / rate / pitch / volume` 仍然可以作为默认值
- 单条 `utterance` 可以覆盖自己的 `voice / rate / pitch / volume`

```ts
timings: [
  {durationSeconds: 1.8},
  {startMs: 1800, endMs: 3600},
  {startFrame: 108, endFrame: 168},
]
```

## 自动生成语音链路

默认工作流：

1. 编辑 `examples/*.json`
2. 运行 `npm run render -- --input examples/basic.json`
3. 脚本会根据输入文件 hash 创建 `build/<input-hash>/`
4. 如需更新，脚本会先用 Edge TTS 生成 `build/<input-hash>/narration.mp3`
5. 再用 Whisper 拉词级时间，输出 `build/<input-hash>/generated-speech.json`
6. 同时写出一份 `build/<input-hash>/render-props.json`
7. 然后继续执行 Remotion 渲染

你仍然可以单独执行 `npm run speech:generate`，但对正常渲染来说已经不是必需步骤。

如果你要在 `studio` 里直接预览默认 example 的声音，先运行一次：

```bash
npm run speech:generate -- --input examples/basic.json
```

这会按输入文件 hash 刷新 `build/<input-hash>/` 下的语音结果，并同步一份浏览器可直接读取的 `public/studio-preview/basic/` 预览缓存。

Studio 默认支持通过 URL 参数切换 example：

```text
http://localhost:3000/?example=basic
http://localhost:3000/?example=deploy-friday
http://localhost:3000/?example=rubber-duck
http://localhost:3000/?example=tech-launch
http://localhost:3000/?example=standup-roast
```

切换到某个 example 前，先对应执行一次：

```bash
npm run speech:generate -- --input examples/tech-launch.json
```

这样 `public/studio-preview/<example-name>/` 才会有对应的音频和时间缓存。

如果你想一次把所有 example 的 Studio 预览语音都准备好，直接运行：

```bash
npm run speech:generate:examples
```

这样切换 `?example=` 时就不会因为某个 example 还没生成 preview 缓存而只剩画面没有声音。

如果字幕节点只是视觉切分，而不是语义断句，推荐使用 `utterances + utteranceId`。这样不会把一整句话念成多句。
如果一个视频里要混用多个人声，也应该在 `utterances` 上配置，而不是在 `captions` 上配置。

## 语音输入格式

可以直接传已切好的分段：

```ts
speech: {
  audioSrc: 'narration.mp3',
  segments: [
    {id: 'seg-1', text: '第一句字幕', startMs: 0, endMs: 1600, layoutKey: 'ccw'},
    {id: 'seg-2', text: '第二句字幕', startMs: 1800, endMs: 3200, layoutKey: 'cw'},
  ],
}
```

也可以传逐词时间，再由模板内部切分：

```ts
speech: {
  audioSrc: 'narration.mp3',
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
- 也就是说，如果要调“新字幕出现 + 容器位移”的统一速度，优先改 `enterDurationFrames`
- `enterEasing` 也会同时作用于当前字幕和容器位移，避免两者体感速度不一致
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

当前默认字体现在切到了 `Smiley Sans`，并保留中文回退字体：

```ts
'"Smiley Sans", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif'
```

项目现在默认内置的字体文件是：

```ts
fontUrl: 'fonts/SmileySans-Oblique.otf'
```

也就是默认情况下，渲染会优先使用 [Smiley Sans / 得意黑](https://github.com/atelier-anchor/smiley-sans) 这套开源字体，而不是依赖系统是否已经装好了中文字库。

如果当前机器仍然没有这些字体，推荐直接放一个字体文件到 `public/fonts/`，然后在 `visuals` 里配置：

```ts
visuals: {
  fontFamily: '"Noto Sans CJK SC", "Microsoft YaHei", sans-serif',
  fontUrl: 'fonts/NotoSansCJKsc-Regular.otf',
}
```

规则：

- `fontUrl` 路径相对于 `public/`
- 模板会在渲染开始前显式加载字体，并阻塞首帧直到字体可用
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

如果你想自定义中间音频文件名，可以在输入 JSON 里设置 `audioSrc`，比如 `narration-a.mp3`。生成文件会写到 `build/<input-hash>/`。

生成语音和时间数据：

Linux / macOS:

```bash
source .venv/bin/activate
npm run speech:generate -- --input examples/basic.json
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
python .\scripts\generate_speech_assets.py --input .\examples\basic.json
```

说明：

- `npm run render` 会自动检查并补齐语音链路产物
- 触发条件是：
  - `build/<input-hash>/generated-speech.json` 不存在
  - `build/<input-hash>/narration.mp3` 不存在
  - 当前输入文件的 hash 与 `generated-speech.json` 中记录的 `meta.inputHash` 不一致
- 如果你明确想跳过这一步，可以设置环境变量 `GLYPHFALL_SKIP_SPEECH_GENERATE=1`

渲染 MP4：

Linux / macOS:

```bash
source .venv/bin/activate
npm run render -- --input examples/basic.json
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\render.ps1 --input .\examples\basic.json
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
build/out/<outputVideoName-or-inputHash>.mp4
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
