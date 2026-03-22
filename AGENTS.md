# AGENTS.md

本文件只约束当前项目目录，不继承父目录的 git 管理策略。

## 仓库边界

- 当前目录是独立仓库根目录
- 只在当前目录内执行 `git init`、`git add`、`git commit`
- 不读取、不提交、不依赖父目录仓库状态

## 项目目标

- 维护 GlyphFall：一个基于 Remotion 的字幕瀑布流模板
- 输入是字幕 JSON 与时间数据
- 输出是“当前字幕出现 + 历史字幕沉淀进容器”的连续视频模板

## 当前实现事实

- 当前字幕从中心位置做 `scale 0 -> 1`
- 历史字幕进入容器后不会消失
- 容器位移过程采用“先固定容器尺寸，再整体运动”
- `translate_up` 以“容器底边贴合新字幕顶边”为准
- 字幕默认单行，按真实字体宽度测量字号和盒宽
- 全局字体支持通过 `visuals.fontUrl` 从 `public/fonts/` 注入，单条字幕可覆盖 `fontFamily` / `fontWeight`
- 字幕当前是纯文字样式，不带可见卡片背景
- 输入层已支持 `speech`
  - 可直接接已切好的分段时间
  - 也可接逐词时间并在模板内部切分
- 音频文件通过 `public/audio/` 提供，并由 `speech.audioSrc` 引用
- 当前推荐入口是 `src/data/subtitles.json`
  - 人工维护字幕文本、画面参数、调试开关、视觉配置、位移配置、语音参数
  - 语音和时间由脚本生成到 `src/data/generated-speech.json`
  - 如果多条字幕属于同一句完整话术，优先使用顶层 `utterances` 和字幕上的 `utteranceId` 保留原始断句
- 项目依赖安装优先走 `./install.sh`
  - 负责 `npm install`
  - 负责创建 `.venv`
  - 负责安装语音链路需要的 Python 依赖
  - Windows 对应入口是 `scripts/install.ps1`
- `npm run render` 会在需要时自动补跑语音生成链路
  - 目标是避免手动重复执行 `speech:generate`
  - 仅当字幕输入文件 hash 变化、或产物缺失时才自动重跑
- 新字幕出现和容器位移必须共享同一套时长与 easing
  - 当前统一由 `layoutMap[*].enterDurationFrames` 和可选 `enterEasing` 控制

## 后续迭代约定

- 修改动画时，优先保证时序正确，再优化视觉观感
- 修改布局时，优先维护旋转原点与容器累计规则，不要为了局部观感破坏全局逻辑
- 如果新增调试元素，优先做成开关配置，不要长期写死在正式渲染层
- 如果引入真实 TTS / Whisper 数据，保持模板消费的是规范化时间，而不是直接耦合某个外部服务格式
- 如果继续做语音链路，优先补“外部结果转 `speech` 结构”的适配层，不要把第三方 SDK 直接塞进渲染层
- 如果改动语音生成链路，优先保持“输入字幕 JSON -> 生成结果 JSON -> 模板消费”这条边界清晰
- 如果改动安装流程，优先更新 `install.sh`、`scripts/install.ps1` 和 `README.md`，不要只改口头说明

## 提交约定

- 每次提交前同步更新 `README.md`
- 如果某次改动改变了核心动画规则、对齐规则或输入格式，同步更新本文件
- 不在未确认的情况下运行渲染输出；优先让使用者自己预览验收
- 后续不要直接推送 `master`
- 远端协作统一走 `feature branch + pull request`
- 如果需要推送代码，先新建功能分支，再推送分支并发起 PR
