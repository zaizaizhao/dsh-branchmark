# 枝签 · BranchMark

> 摘一段，生一枝。

Excerpt-driven session branching and conversation lineage for DeepSeek Harness.

`dsh-branchmark` 是 BranchMark 的公开安装 Bundle。它把选中文本和会话枝签变成临时 Side Chat、继承来源上下文的完整分叉，或只携带枝签的新会话，让主会话保持连贯，同时保留每次发散探索的来源关系。

源码、完整设计与开发文档位于 [`zaizaizhao/dsh-branchmark`](https://github.com/zaizaizhao/dsh-branchmark)。

## 主要能力

- 在已完成的用户或助手消息中选择文本，直接“摘录到会话”“摘录到项目”“Ask in side”或“引用到输入框”。
- 会话私有枝签与项目全局枝签严格分开展示；备注和多标签可编辑，原文与来源锚点不可改写。
- 右侧浮动 Dock 提供会话视图、项目卡片/列表、回收站、关系树和多个临时 Side Chat 标签。
- 完整分叉恢复主要来源消息所在完整轮次及之前的上下文；仅枝签分支从空白 DSH Session 开始。
- 主输入框只显示 DSH 原生引用 Chip，用户显式发送时才把枝签正文和保留的备注加入模型上下文。
- Side Chat 可独立选择模型与思考强度，展示流式思考、只读工具活动和 Markdown 回答；关闭标签立即销毁。

## 要求

| BranchMark | DeepSeek Harness | Node.js | DSH surface |
| --- | --- | --- | --- |
| `0.2.x` public preview | `0.1.1-rc.2` | `^22.19.0 \|\| >=24.0.0` | Web profile |

DSH 仍处于预发布阶段。上表之外的组合没有经过兼容性验证；升级 DSH 前应在独立 profile 中重新完成安装与 UI smoke test。

## 安装

```sh
dsh plugin --profile web add dsh-branchmark@0.2.0
dsh --profile web --dump-config
dsh --profile web
```

升级：

```sh
dsh plugin --profile web up dsh-branchmark
```

卸载：

```sh
dsh plugin --profile web remove dsh-branchmark
```

安装、升级或卸载后需要重启对应 profile。卸载不会删除 `clip_explorer` 本地 storage domain，因此已有枝签不会随 package 一起被静默清除。

不要使用 Git URL 或 GitHub source specifier 直接安装。源码仓库不提交 `lib/`，也不运行 `prepare` 等安装生命周期脚本；npm 包或仓库内 `pnpm run pack:bundle` 生成的 tarball 才包含可执行产物。

## 使用

在对话消息内选择连续文本，浮动工具条会提供四个入口。保存后可从右侧把手展开 BranchMark Dock：

1. “本会话”只显示当前 Session 的私有枝签；“项目”只显示显式提升为项目级的枝签。
2. “Side Chat”在当前 Host 内创建临时标签，由用户输入问题后才发送。
3. “新会话”可选择完整分叉或仅携带枝签，并可选择打开空白 Composer 或输入问题后后台创建并发送。
4. “引用到输入框”只加入可移除的引用 Chip，绝不自动发送。

## 配置

Bundle patch 提供以下配置。Profile patch 覆盖该 Loader 条目时会替换整个 `config`，因此修改任一字段时需要重述全部字段。

| 字段 | 默认值 | 作用 |
| --- | ---: | --- |
| `maxExcerptBytes` | 65536 | 单条正文 UTF-8 字节上限 |
| `maxNoteBytes` | 16384 | 单条备注 UTF-8 字节上限 |
| `maxTagsPerClip` | 32 | 单条枝签标签数上限 |
| `maxTagBytes` | 128 | 单个标签 UTF-8 字节上限 |
| `recentContextMessages` | 10 | Side Chat 至少保留的最近原始消息数 |
| `summaryProvider` / `summaryModel` | 空 | 为空时跟随 Side Chat 模型；显式设置时必须成对配置 |
| `summaryMaxTokens` | 2048 | 来源摘要输出上限 |
| `answerMaxTokens` | 8192 | Side Chat 单轮回答输出上限 |
| `maxToolRounds` | 6 | 单轮最大只读工具迭代数 |
| `maxToolOutputChars` | 24000 | 单次工具结果进入模型的字符上限 |
| `maxReadChars` | 60000 | 单文件读取或搜索结果字符上限 |
| `maxSearchFiles` | 300 | 单次项目文本搜索扫描文件数上限 |

## 数据、网络与权限

- 枝签、备注、标签、回收站状态、衍生关系和使用快照写入 DSH 本地 `storageDomain` 的 `clip_explorer` domain。插件不提供云同步，也不向作者控制的服务上传这些数据。
- 保存、搜索和整理枝签不调用模型。Side Chat 或衍生会话发送问题时，用户选中的枝签、启用的备注和恢复出的来源上下文会进入当前 DSH 模型 provider 的请求。
- Side Chat 的项目文件工具只读；读取结果可能进入模型请求。Web 搜索和抓取使用 DSH 部署当前配置的 Web provider。
- Side Chat 只存在于 Host 内存；关闭标签、卸载插件或 Host 退出都会中止并销毁它。普通衍生会话仍由 DSH 持久化。
- 插件不读取或存储 provider 凭据，也不自行增加遥测。

## 已知限制

- 只支持 DSH Web profile，不向 Headless 或 ACP surface 提供 UI。
- 插件关系树不会改变 DSH 原生侧边栏的会话层级。
- Workspace 和 Session 是当前隔离键；Worktree 不是独立隔离边界。
- 创建衍生 Session 需要分别写入 BranchMark 关系记录与 DSH `recall` 日志，当前没有跨子系统事务。Host 在两次写入之间异常退出可能留下低概率部分提交；`0.2.x` 尚未自动对账修复。
- Side Chat 摘要或回答仍可能因为当前 provider、模型、网络或配额错误而失败；界面会保留错误信息，关闭标签前仍可重试。

## 支持与安全

普通缺陷和功能建议请提交到 [GitHub Issues](https://github.com/zaizaizhao/dsh-branchmark/issues)。安全问题不要公开披露，请遵循 [`SECURITY.md`](https://github.com/zaizaizhao/dsh-branchmark/blob/main/SECURITY.md)。提交日志或截图前请移除 API key、凭据文件内容和其他秘密。

BranchMark 使用 [MIT License](https://github.com/zaizaizhao/dsh-branchmark/blob/main/LICENSE)。
