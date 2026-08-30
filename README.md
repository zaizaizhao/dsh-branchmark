# 枝签 · BranchMark

> 摘一段，生一枝。

Excerpt-driven session branching and conversation lineage for DeepSeek Harness.

把选中文本和会话摘录变成可复用的分支起点，让主会话保持专注，也让每一次发散探索都有迹可循。

BranchMark 是一个独立的 DeepSeek Harness 插件 Bundle。每一枚“枝签”都由不可改写的摘录正文、来源锚点、可编辑备注和标签组成，可以作为临时 Side Chat、继承来源上下文的新会话或全新会话的分支起点。

插件不修改 DeepSeek Harness 源码。它只使用现有的 Cordis 插件、Typed Remote、`storageDomain`、Session/Workspace、Client Slot、`ctx.llm.stream`、文件系统和 Web capability。

源码仓库：[`zaizaizhao/dsh-branchmark`](https://github.com/zaizaizhao/dsh-branchmark)；公开安装包：[`dsh-branchmark`](https://www.npmjs.com/package/dsh-branchmark)。

## 当前能力

- 在一条已完成的用户或助手消息中选择连续文本，会出现紧凑的“摘录到会话 / 摘录到项目 / Ask in side / 引用到输入框”浮动操作条；前两个动作显式选择保存范围，后两个动作先保存为本会话枝签，且引用动作绝不自动发送。
- 跨消息选择会拆成多枚枝签；每枚枝签保留自己的 DSH `MessageId`、事件序号、轮次和原文范围。
- 枝签的摘录正文与来源不可编辑；备注和多标签可编辑。
- 右侧 Dock 默认最小化为一个中部把手；展开后作为不改变 DSH 布局尺寸的浮层避开 Session Header 与 Composer。Dock 可拖动调整宽度、再次最小化或完全隐藏，只持久化显示模式、当前视图和宽度。
- 本会话枝签、项目枝签、会话关系和 Side Chat 共用一个 Dock。关闭 Dock 不关闭 Side Chat，关闭 Side Chat 标签才会立即销毁对应临时上下文。
- Dock 的本会话视图只读取当前会话私有枝签；项目视图只读取显式提升为项目级的枝签。
- 项目枝签视图提供卡片/列表、全文搜索和多标签交集筛选。多选后只显示一个“处理 N 枚枝签”命令胶囊，展开后可按选择顺序引用到输入框、创建 Side Chat 或新会话、切换置顶、追加标签和移入回收站；窄宽度下命令自动收敛为图标。
- 卡片保持统一阅读高度，长正文可在卡片内展开或进入居中的聚焦阅读视图。无搜索和标签筛选时，可在置顶组或普通组内拖动并持久化顺序；跨组移动必须先显式切换置顶状态。
- 回收站可恢复或永久删除枝签；已创建的衍生会话与使用快照不受影响。
- “完整分叉”调用 DSH 原生 `SessionRuntime.fork({ atSeq })`，继承主要来源消息所在完整轮次及其之前的上下文。
- “仅携带枝签”调用 DSH 已导出的 `SessionRuntime.create`，保证创建一个不同于任何既有空白会话的新 Session。
- “创建并打开”把枝签内容以只读 `recall` 上下文写入新会话日志，保持 Composer 空白且不发送；“创建并发送”在来源页收集问题，并通过 DSH Session `prompt()` 让新会话后台运行。
- 衍生会话显示继承分隔线和来源入口；枝签卡片列出“完整分叉 / 仅枝签”衍生会话并可反向打开；双方保留双向关系和不可变使用快照。
- 每张枝签卡片可直接启动 Side Chat、打开新会话流程或引用到当前主输入框。Composer 只显示 DSH 原生引用 Chip，完整摘录在用户显式发送时序列化；逐条移除不会把相邻引用降级为普通文本，页面重载后也会把 DSH draft mirror 中的 `@branchmark:<id>` 持久化投影恢复为 Chip。
- Side Chat 使用 Host 进程内存，不创建普通 Session，不写入 Session 日志，支持多个标签页、独立模型与思考强度切换、思考过程、只读工具活动、Markdown 回答、停止和关闭即销毁。
- Side Chat 在首次发送时将较早历史转换为单条纯文本 transcript 后交给 AI 摘要；最近历史向前扩展到安全的用户消息边界，避免拆开工具调用与结果。摘要默认使用此时选定的 Side Chat 模型，也可配置专用摘要模型；摘要失败时保留最近原始消息与完整摘录继续回答，并显示 provider 错误。
- Side Chat 只提供固定的只读工具：项目文件读取、目录列举、项目文本搜索、Web 搜索与由部署配置 provider 执行的 Web 抓取。
- Side Chat 回答可整段保存，也可选择其中一段再保存为会话或项目枝签。
- 会话关系视图使用 DSH `parentId` 显示当前会话所在的完整已知树，并以稳定分支色辅助区分；它不修改 DSH 原生侧边栏。
- 所有颜色来自 DSH 语义主题 token，亮色与深色模式使用同一套组件结构。

## 兼容性与发布边界

| BranchMark | DeepSeek Harness | Node.js | DSH surface |
| --- | --- | --- | --- |
| `0.3.x` public preview | `0.1.1-rc.2` | `^22.19.0 \|\| >=24.0.0` | Web profile |

DeepSeek Harness 仍处于预发布阶段，插件直接使用其 Host、Remote 与 Client 扩展点。升级 DSH 前应先运行 BranchMark 的发布检查并在独立 profile 中验收；上表之外的组合不属于当前支持范围。

只有 `dsh-branchmark` Bundle 面向 npm 发布。`dsh-branchmark-host` 与 `dsh-branchmark-client` 是私有实现工作区，不是可独立安装的插件。Bundle 自带预编译的 Host、Typert、Remote 与浏览器入口，运行时复用 DSH profile 已提供的 Cordis 和 DSH package，避免加载重复的框架实例。

## 安装

安装前确认 `dsh --version` 为 `0.1.1-rc.2`，Node.js 满足上表要求。正式版本发布到 npm 后，可直接加入 Web profile：

```sh
dsh plugin --profile web add dsh-branchmark@0.3.0
dsh --profile web --dump-config
dsh --profile web
```

升级同一兼容系列：

```sh
dsh plugin --profile web up dsh-branchmark
```

卸载：

```sh
dsh plugin --profile web remove dsh-branchmark
```

`dsh plugin` 将其后的命令交给 profile 内的 pnpm。安装、升级或卸载后需要重启对应 DSH profile。卸载插件不会主动删除 `clip_explorer` 本地 storage domain；需要清理数据时，应先备份，再由用户显式删除对应 DSH storage backend 记录。

从源码验收时先构建 tarball，再安装该 tarball：

```sh
git clone https://github.com/zaizaizhao/dsh-branchmark.git
cd dsh-branchmark
corepack enable
pnpm install --frozen-lockfile
pnpm run release:check
pnpm run pack:bundle
dsh plugin --profile web add ./dist/dsh-branchmark-0.3.0.tgz
```

不要使用 `github:zaizaizhao/dsh-branchmark`、Git URL 或 GitHub source specifier 直接安装。源码仓库不提交构建后的 `lib/`，并且有意不设置安装生命周期脚本；npm tarball 和本地 `pnpm run pack:bundle` 产物才是可安装介质。

## 配置

Bundle 的默认配置在 [`packages/bundle/cordis.patch.yml`](packages/bundle/cordis.patch.yml)。Profile patch 覆盖某个条目时会替换该条目的整个 `config`，因此修改任一字段时需要重述全部字段。

| 字段 | 默认值 | 作用 |
| --- | ---: | --- |
| `maxExcerptBytes` | 65536 | 单条摘录 UTF-8 字节上限 |
| `maxNoteBytes` | 16384 | 单条备注 UTF-8 字节上限 |
| `maxTagsPerClip` | 32 | 单条摘录标签数上限 |
| `maxTagBytes` | 128 | 单个标签 UTF-8 字节上限 |
| `recentContextMessages` | 10 | Side Chat 至少保留的最近原始消息数；实际起点向前扩展到安全的用户消息边界 |
| `summaryProvider` / `summaryModel` | 空 | 两者都为空时跟随首次发送时选定的 Side Chat 模型；否则必须成对配置 |
| `summaryMaxTokens` | 2048 | 来源摘要输出上限 |
| `answerMaxTokens` | 8192 | Side Chat 单轮回答输出上限 |
| `maxToolRounds` | 6 | Side Chat 单轮最大只读工具迭代数 |
| `maxToolOutputChars` | 24000 | 单次只读工具返回给模型的字符上限 |
| `maxReadChars` | 60000 | 单文件读取/搜索的字符上限 |
| `maxSearchFiles` | 300 | 单次项目文本搜索扫描文件数上限 |

## 数据与隐私

- 枝签、标签、备注、置顶与集合顺序、回收站状态、衍生关系和使用快照只写入 DSH 本地 `storageDomain` 的 `clip_explorer` domain；`Clip` 是枝签摘录数据在源码中的类型名。
- 枝签绑定 Workspace 与 owner Session，不绑定 Worktree。
- Session 私有枝签永远不会通过项目集合或项目回收站 Remote 返回给其他会话。
- 项目枝签只在项目标签中全局可见，并且只有用户显式选择后才进入 Side Chat、衍生 Session 或当前 Composer。
- 普通衍生 Session 不把枝签正文写入可编辑 Composer。Host 在校验衍生关系后把摘录正文与启用的备注记录为可折叠的 `recall` 上下文；该上下文与用户后续问题一起进入模型历史，并由 DSH Session 日志恢复。
- 卡片上的“引用到输入框”是显式的当前会话操作。插件通过 DSH `ReferenceInsert` 只把紧凑 Chip 放入 Composer；`codec.serialize()` 在提交事务中重新读取当前枝签，并把原文与用户保留的备注转换为模型上下文。引用不存在、已删除或在回收站中时，DSH 阻止发送并保留输入内容。
- Side Chat 的上下文、消息、流式文本和工具结果仅存在于 Host 进程内存；关闭标签、插件卸载或 Host 退出都会中止并销毁它们。
- 普通衍生 Session 是 DSH 原生持久会话。删除枝签只删除枝签本身，不回写或重写已经创建的 Session。

## 网络、模型与工具权限

- 保存、搜索、标记和回收枝签不调用模型，也不需要外部网络。
- 用户在 Side Chat 中发送问题时，选定枝签、启用的备注以及恢复出的来源上下文会交给当前选择的 DSH 模型 provider。较早历史需要摘要时，也会发送给跟随模型或显式配置的摘要 provider。
- Side Chat 可调用项目文件读取、目录列举和文本搜索；这些工具只读，但其结果可能随后进入模型请求。Web 搜索与抓取使用 DSH 当前配置的 Web provider，并会把查询词或目标 URL 发送给该 provider。
- 插件不自行收集遥测、不接收凭据，也不把枝签同步到 BranchMark 作者控制的服务。模型和 Web provider 的数据处理规则仍由用户的 DSH 部署与 provider 配置决定。

安全问题请按 [`SECURITY.md`](SECURITY.md) 私下报告。不要在公开 issue、日志或截图中提交 API key、完整凭据文件或其他秘密。

## 已知限制

- 当前只支持 DSH Web profile；Headless、ACP 和其他 surface 不加载 BranchMark UI。
- Side Chat 是 Host 内存中的临时上下文。关闭标签、卸载插件或退出 Host 后不可恢复。
- BranchMark 的关系树只存在于插件 Dock 中；它不能把 DSH 原生侧边栏改造成嵌套会话树。
- 枝签按 Workspace 与 Session 绑定，不把 Worktree 作为隔离边界。
- 创建衍生 Session 时，BranchMark 关系记录与 DSH `recall` 日志分属两个持久化子系统，当前没有跨子系统事务。Host 在两次写入之间异常退出可能留下已记录关系但缺少 `recall` 的低概率部分提交；`0.3.x` 尚未提供自动对账修复。
- DSH 的 provider、Session 与 Client API 仍可能在后续预发布版本中变化，因此兼容性按明确版本验证，而不是声明宽泛范围。

## 类型策略

插件直接复用 DSH 的 `WorkspaceId`、`SessionId`、`MessageId`、`SessionEvent`、`SessionInspection`、`Message`、`LlmCallConfig`、`ToolSchema`、`KvTable`、Client Runtime 和 Slot 类型。只有 DSH 没有定义的 Clip、Side Chat 身份、Clip 来源、衍生关系和专用 Remote DTO 由插件定义。

Side Chat 的浏览器消息是一个有意缩窄的 wire projection：它继续使用 DSH `MessageId`，不传 provider replay state 或任意扩展 block；只读工具活动只投影名称、参数、受 Host 上限约束的输出和状态，以便 UI 呈现与主对话相近的执行过程。这是传输投影，不是重新发明一套 LLM 消息模型。

## 开发与验证

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run check
pnpm run release:check
pnpm run pack:bundle
```

当前宿主源码声明的 Node 最低版本是 22.19。低于该版本时 pnpm 会警告；即使本机偶然通过构建，也不构成受支持运行时。

自包含包已安装到真实 DSH Web profile，并完成常驻 Dock、本会话与项目枝签隔离、多选命令胶囊、340px Dock 图标化、固定卡片、卡片内展开、聚焦阅读、置顶分组、批量 Composer 引用顺序、内嵌新会话流程、临时 Side Chat 创建、模型目录与思考强度菜单以及亮色/深色主题的浏览器验收。验收没有发送模型请求，因此 Side Chat 的真实摘要、工具调用和回答质量仍应使用配置好的 provider 单独做 API e2e；自动化测试覆盖完整排序请求、模型路由切换、上下文组装、工具活动投影和生命周期。

`release:check` 在常规构建测试之外校验公开包元数据、私有工作区边界、DSH peer 声明、npm 文件清单和 dry-run 发布结果。真实 provider 请求不进入 keyless CI；发布候选仍需按 [`RELEASING.md`](RELEASING.md) 完成独立 profile smoke test。

参与开发前请阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)；版本变化记录在 [`CHANGELOG.md`](CHANGELOG.md)。
