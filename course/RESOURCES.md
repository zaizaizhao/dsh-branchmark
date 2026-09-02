# 枝签 · BranchMark 课程资源

本页只收录本课程实际依赖的高可信资料。当前本地检出版本是解释运行行为的首要依据；官方站点与 GitHub 页面用于在升级 DSH 时重新核对。

## Knowledge

- [DSH Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/architecture.md)
  官方架构总览，说明“一切皆插件”、Profile/Bundle、Session 日志、能力 seam 与扩展点。用于判断一项功能应接入哪个 DSH 服务。
- [Cordis Primer](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/cordis-primer.md)
  官方 Cordis 入门，说明 Context、Service、`inject`、事件和可逆 effect。用于理解 Host 与 Client 插件的装载和卸载。
- [Your first plugin](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/user/develop/basic/index.md)
  官方最小插件教程。用于建立 `apply`、class Service 和本地 patch 的基本认知。
- [Package and install a plugin](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/user/develop/basic/publish.md)
  官方 Bundle/Profile 与 `dsh plugin add` 教程。用于理解 `dsh.bundle`、patch 顺序、整项 `config` 替换和 tarball 安装。
- [API Gateway](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/api-gateway.md)
  `@Remote`、`bindTypertRemote`、生成产物、Client `$mount()` 和运行时校验的权威说明。用于实现 Host/Browser 的类型化 RPC。
- [Client Modules](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/subsystems/client-modules.md)
  `dsh.client` 扫描、`exports["./client"]`、`window.__DSH_BOOT__` 与浏览器模块装载的权威说明。
- [Session reference](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/subsystems/session.md)
  Session event log、消息投影、fork、`parentSession`、`isSeeded`、`inheritedEventCount` 与 `session/end-seed` 的权威说明。
- [Storage](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/subsystems/storage.md)
  `defineDomain`、`domainTable`、`KvTable`、写入顺序与 `ctx.storageDomain` 生命周期的权威说明。
- [LLM Streaming](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/subsystems/llm-streaming.md)
  DSH `Message`、`ContentBlock`、`LlmCallConfig`、`BlockAssembler`、模型目录与 `ctx.llm.stream` 的权威说明。
- [Filesystem](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/subsystems/filesystem.md)
  `ctx.fs.resolve`、`contains`、`stat`、`readText` 与 `listDir` 的服务约定。用于实现项目范围内的只读工具。
- [Web Access](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/subsystems/web.md)
  `ctx.web.search/fetch` 的 provider 选择、错误和安全限制。用于判断 Side Chat Web 工具在目标 profile 中是否真正可用。
- [Workspaces](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/subsystems/workspace.md)
  Workspace 身份、canonical path 与 Session 成员关系的权威说明。用于隔离项目数据和限制项目文件访问。
- [UI Slot core](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/packages/client/ui-slots/README.md)
  Slot 注册、owner/runtime/business props 与卸载级联的权威说明。用于把 UI 叠加到 DSH，而不替换宿主主界面。
- [UI Input Trigger](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/packages/client/ui-input-trigger/README.md)
  `ReferenceInsert`、occurrence、clipboard projection、source codec 与提交事务的权威说明。用于区分可见 label、持久化 token 和提交时模型文本，并实现未发送引用恢复。
- [Conversation subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/subsystems/conversation.md)
  事件匹配、可回放节点、Conversation snapshot 和 keyed Chat renderer 的官方参考。用于实现 fork seed 分隔线与 Chat View 选区。
- [Client Session、Conversation 与 UI ownership Agent Note](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/.agents/notes/implemented/architecture/2026-08-20-client-session-conversation-ownership.md)
  DSH 删除聚合 Client Runtime、拆分 Controller/UI adapter/Renderer/target 的主要设计依据。用于理解所有权、依赖方向、binding 生命周期、替代方案和代价。
- [Conversation business-node assembly Agent Note](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/.agents/notes/implemented/architecture/2026-08-09-client-conversation-node-assembly.md)
  target-neutral assembly、稳定 business id、keyed Chat snapshot、prepend/append replay 与 publication cadence 的算法依据。
- [Client cross-package value dependency Agent Note](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/.agents/notes/implemented/process/2026-08-23-client-cross-package-value-dependencies.md)
  解释 feature 间何时使用 Cordis Service、Slot、type-only import、utility 或 target-local projection，以及为什么不保留 runtime relay。
- [ctx.remote failure vocabulary Agent Note](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/.agents/notes/implemented/architecture/2026-08-28-ctx-remote-failure-vocabulary.md)
  解释统一 `RemoteError`、领域前缀 code、details declaration merging 与跨 realm discrimination 的动机和收益。
- [DSH Client 架构设计解读](reference/dsh-client-architecture-rationale.md)
  本课程对上述官方资料的中文教学入口，集中说明本次 Client 拆分为什么成立、BranchMark 如何接入以及哪些代价不能忽略。
- [BranchMark product contract](../docs/PRD.md)
  当前插件的产品规则、核心流程与非目标。实现前先冻结行为，避免技术细节反向改变产品含义。
- [BranchMark architecture](../docs/ARCHITECTURE.md)
  当前插件的架构参考。课程会展开其机制，但不复制整篇事实清单。
- [紧凑批量命令与枝签排序 Agent Note](../.agents/notes/implemented/feature/2026-08-30-compact-batch-commands-and-clip-ordering.zh.md)
  批量命令胶囊、固定高度卡片、置顶分组、完整集合重排和 Composer draft mirror 恢复的设计决策与验证证据。
- [DSH alpha.2 Client 能力集成 Agent Note](../.agents/notes/implemented/architecture/2026-08-31-dsh-alpha2-client-capability-integration.zh.md)
  API Session/Workspace Controller、UI Conversation/Chat、`BranchMarkClient` 集成边界和单版本策略的决策与验证证据。
- [BranchMark source tree](../packages)
  可运行实现的最终依据。教程中的片段用于解释，完整行为以这里的源文件和测试为准。
- [Official DeepSeek Harness repository at the course source anchor](https://github.com/deepseek-ai/deepseek-harness/tree/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5)
  固定到本课程核对过的提交，适合在脱离本地 checkout 时查看同一版本源码。
- [Official DeepSeek Harness documentation](https://deepseek-harness.github.io/deepseek-harness/en/)
  当前发布文档入口。升级宿主时从这里重新确认公开 API，再和安装版本的类型声明比对。

## 预发布升级审计资料

- [DSH `0.1.2-alpha.5` 发布标签](https://github.com/deepseek-ai/deepseek-harness/tree/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5)
  本课程 2026-09-02 升级审计的已发布目标。release tag 是可安装包的源码依据，不能用后来仍写着相同 package version 的 master 替代。
- [2026-09-02 master 审计快照](https://github.com/deepseek-ai/deepseek-harness/tree/49a606bc5b5934603f22a26957a07dc799ab0291)
  本课程 master 迁移案例的固定提交。它包含 alpha.5 tag 之后的 `SessionHandle` persistence seam，不能被称为 npm alpha.5 的已发布 API。
- [区分 Session 事件身份与日志偏移](https://github.com/deepseek-ai/deepseek-harness/blob/49a606bc5b5934603f22a26957a07dc799ab0291/.agents/notes/implemented/architecture/2026-08-31-session-sequence-and-log-offset-brands.zh.md)
  `SessionSeq`、`SessionLogOffset`、`SessionHeader.isSeeded` 与 `inheritedEventCount` 的官方决策、磁盘兼容方式和收益。
- [会话日志读取显式表达物化成本](https://github.com/deepseek-ai/deepseek-harness/blob/49a606bc5b5934603f22a26957a07dc799ab0291/.agents/notes/implemented/architecture/2026-08-21-session-log-read-intent.zh.md)
  `Session.events` 被 `seq`、`eventAt()` 与 `snapshotEvents()` 取代的官方依据；用于避免标量读取隐藏一次 O(n) 数组复制。
- [基于句柄的会话持久化](https://github.com/deepseek-ai/deepseek-harness/blob/49a606bc5b5934603f22a26957a07dc799ab0291/.agents/notes/implemented/architecture/2026-08-27-handle-based-session-persistence.zh.md)
  当前 master 删除 `inspect()`、引入 `open(id, 'read' | 'write')` 与显式 `close()` 的设计依据，包含单写者所有权和资源生命周期语义。
- [JSONL-only first-party Session persistence](https://github.com/deepseek-ai/deepseek-harness/blob/49a606bc5b5934603f22a26957a07dc799ab0291/.agents/notes/implemented/simplification/2026-08-30-jsonl-only-session-persistence.zh.md)
  第一方 SQLite Session provider 被删除的范围、原因和数据迁移要求；它不等于删除 SQLite query provider 或通用 storage provider。
- [InputBar immutable props change](https://github.com/deepseek-ai/deepseek-harness/commit/5f1eca58eaaaf5bf604b64a27cbd25a8d38e5095)
  `conversation.input.left/right` 不再接收 point-in-time `InputZone.input` owner prop，插件改从标准 `useInput` selector 读取状态的直接变更证据。
- [投影缓存跨版本读兼容](https://github.com/deepseek-ai/deepseek-harness/blob/49a606bc5b5934603f22a26957a07dc799ab0291/.agents/notes/implemented/architecture/2026-09-02-projcache-cross-version-read-compat.zh.md)
  `session_projcache` v3/v4/v5 到 v6 的兼容和备份跳过策略。它是 DSH 派生缓存修复，不是 BranchMark `clip_explorer` 数据迁移。

## Wisdom (Communities)

- [DeepSeek Harness GitHub Issues](https://github.com/deepseek-ai/deepseek-harness/issues)
  用于核对未文档化限制、报告插件 API 回归和寻找同类扩展实践；提交问题时附上 DSH 版本、最小 patch 与实际错误。
- [DeepSeek Harness GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
  用于讨论扩展点选择和插件发布方式；运行行为仍以对应版本源码与生成类型为准。

## Gaps

- 当前官方教程没有把 Host Remote、独立 Client Module、原生 Composer 引用恢复、普通 Session 分叉和直接 LLM 调用串成一个完整的树外插件实例；本课程用当前插件源码补齐这条端到端路径。
- DSH `0.1.2-alpha.5` 仍是预发布版本，API Session/Workspace Controller 与 UI Conversation/Chat 的组合没有稳定兼容承诺；每次升级必须执行本课程的兼容性审计。
