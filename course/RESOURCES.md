# 枝签 · BranchMark 课程资源

本页只收录本课程实际依赖的高可信资料。当前本地检出版本是解释运行行为的首要依据；官方站点与 GitHub 页面用于在升级 DSH 时重新核对。

## Knowledge

- [DSH Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/architecture.md)
  官方架构总览，说明“一切皆插件”、Profile/Bundle、Session 日志、能力 seam 与扩展点。用于判断一项功能应接入哪个 DSH 服务。
- [Cordis Primer](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/cordis-primer.md)
  官方 Cordis 入门，说明 Context、Service、`inject`、事件和可逆 effect。用于理解 Host 与 Client 插件的装载和卸载。
- [Your first plugin](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/user/develop/basic/index.md)
  官方最小插件教程。用于建立 `apply`、class Service 和本地 patch 的基本认知。
- [Package and install a plugin](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/user/develop/basic/publish.md)
  官方 Bundle/Profile 与 `dsh plugin add` 教程。用于理解 `dsh.bundle`、patch 顺序、整项 `config` 替换和 tarball 安装。
- [API Gateway](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/api-gateway.md)
  `@Remote`、`bindTypertRemote`、生成产物、Client `$mount()` 和运行时校验的权威说明。用于实现 Host/Browser 的类型化 RPC。
- [Client Modules](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/client-modules.md)
  `dsh.client` 扫描、`exports["./client"]`、`window.__DSH_BOOT__` 与浏览器模块装载的权威说明。
- [Session reference](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/session.md)
  Session event log、消息投影、fork、`parentSession`、`seedLength` 与 `session/end-seed` 的权威说明。
- [Storage](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/storage.md)
  `defineDomain`、`domainTable`、`KvTable`、写入顺序与 `ctx.storageDomain` 生命周期的权威说明。
- [LLM Streaming](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/llm-streaming.md)
  DSH `Message`、`ContentBlock`、`LlmCallConfig`、`BlockAssembler`、模型目录与 `ctx.llm.stream` 的权威说明。
- [Filesystem](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/filesystem.md)
  `ctx.fs.resolve`、`contains`、`stat`、`readText` 与 `listDir` 的服务约定。用于实现项目范围内的只读工具。
- [Web Access](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/web.md)
  `ctx.web.search/fetch` 的 provider 选择、错误和安全限制。用于判断 Side Chat Web 工具在目标 profile 中是否真正可用。
- [Workspaces](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/workspace.md)
  Workspace 身份、canonical path 与 Session 成员关系的权威说明。用于隔离项目数据和限制项目文件访问。
- [UI Slot core](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-slots/README.md)
  Slot 注册、owner/runtime/business props 与卸载级联的权威说明。用于把 UI 叠加到 DSH，而不替换宿主主界面。
- [UI Input Trigger](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-input-trigger/README.md)
  `ReferenceInsert`、occurrence、clipboard projection、source codec 与提交事务的权威说明。用于区分可见 label、持久化 token 和提交时模型文本，并实现未发送引用恢复。
- [Conversation Node cookbook](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/cookbook/adding-a-conversation-node.md)
  事件匹配、可回放节点和 keyed renderer 的官方教程。用于实现 fork seed 分隔线。
- [BranchMark product contract](../docs/PRD.md)
  当前插件的产品规则、核心流程与非目标。实现前先冻结行为，避免技术细节反向改变产品含义。
- [BranchMark architecture](../docs/ARCHITECTURE.md)
  当前插件的架构参考。课程会展开其机制，但不复制整篇事实清单。
- [紧凑批量命令与枝签排序 Agent Note](../.agents/notes/implemented/feature/2026-08-30-compact-batch-commands-and-clip-ordering.zh.md)
  0.1.1-rc.2 对批量命令胶囊、固定高度卡片、置顶分组、完整集合重排和 Composer draft mirror 恢复的设计决策与验证证据。
- [BranchMark source tree](../packages)
  可运行实现的最终依据。教程中的片段用于解释，完整行为以这里的源文件和测试为准。
- [Official DeepSeek Harness repository at the course source anchor](https://github.com/deepseek-ai/deepseek-harness/tree/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e)
  固定到本课程核对过的提交，适合在脱离本地 checkout 时查看同一版本源码。
- [Official DeepSeek Harness documentation](https://deepseek-harness.github.io/deepseek-harness/en/)
  当前发布文档入口。升级宿主时从这里重新确认公开 API，再和安装版本的类型声明比对。

## Wisdom (Communities)

- [DeepSeek Harness GitHub Issues](https://github.com/deepseek-ai/deepseek-harness/issues)
  用于核对未文档化限制、报告插件 API 回归和寻找同类扩展实践；提交问题时附上 DSH 版本、最小 patch 与实际错误。
- [DeepSeek Harness GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)
  用于讨论扩展点选择和插件发布方式；运行行为仍以对应版本源码与生成类型为准。

## Gaps

- 当前官方教程没有把 Host Remote、独立 Client Module、原生 Composer 引用恢复、普通 Session 分叉和直接 LLM 调用串成一个完整的树外插件实例；本课程用当前插件源码补齐这条端到端路径。
- DSH `0.1.1-rc.2` 仍是预发布版本，`SessionRuntime.create` 等 concrete Client API 没有稳定兼容承诺；每次升级必须执行本课程的兼容性审计。
