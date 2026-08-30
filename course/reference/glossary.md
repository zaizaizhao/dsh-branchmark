# 术语表

本课程固定使用以下术语。遇到同义表达时，以本表区分数据身份和生命周期。

| 术语 | 定义 |
| --- | --- |
| Bundle | 带 `dsh.bundle.patch` 的 npm 分发包；它向 profile 贡献 Cordis 配置层。本插件的安装包名是 `dsh-branchmark`。 |
| Profile | `$DSH_HOME/profiles/<name>` 下的一套可启动组合；按顺序叠加 bundles 与用户 patch。 |
| Cordis Context | 按 key 提供和消费 Service、事件与 effect 的插件上下文。 |
| effect | 跟随插件 fiber 生命周期自动撤销的注册或资源；Host domain、Side Chat、Browser stylesheet 与 Remote mount 都有 disposer。 |
| Host | DSH Node 进程中的插件面，拥有本地数据、Session 访问、LLM 调用和业务校验。 |
| Client | Browser 中的 Cordis 插件面，拥有 UI、选区观察、Remote 调用和 DSH Client Runtime 编排。 |
| Client Module | 声明 `dsh.client` 并导出 `./client` 的浏览器 bundle，由 DSH Client Modules 扫描和加载。 |
| Typert Remote | 从 Host `@Remote` 方法生成 strict descriptor、codec 和 Client concrete method 的 unary RPC 机制。 |
| Clip | 不可修改的摘录正文与来源锚点，加上可修改备注、标签、scope 和状态。 |
| owner Session | Clip 创建时所在的普通 Session。Session scope Clip 只在该 Session 的本会话视图出现。 |
| project Clip | `scope: 'project'` 的 Clip，在同一 Workspace 的项目枝签视图中跨 Session 可见，但不会自动进入模型上下文。 |
| primary Clip | full-fork 或 Side Chat 用来决定来源 Session、消息位置、完整 turn 与初始模型 route 的主要摘录。其余 Clip 只是显式附件。 |
| canonical text | Host 与 Client 共同采用的 DSH message 文本投影：本插件把 text/reasoning blocks 以空行连接。range 必须切出 exact excerpt。 |
| event seq | Session append-only log 中连续的事件序号。Clip 保存来源消息的 seq，而不是 DOM 索引。 |
| turn | DSH 从 `turn/start` 到 `turn/end` 的执行单位，可能包含多个 LLM step。full-fork 边界必须落在完整 turn 后。 |
| full-fork | 调用 DSH 原生 fork，继承来源 Session 从开头到主要 Clip 所在完整 turn 的事件 seed，并产生 DSH parent lineage。 |
| clips-only | 调用 DSH create 创建无 parent/seed 的新普通 Session，再把 Clip 使用快照作为 `recall` 消息写入日志。 |
| derived Session | 经 full-fork 或 clips-only 流程创建、并有 BranchMark relation 的普通持久 Session。 |
| parentSession | DSH `SessionHeader` 中的父 Session id，是 fork lineage 的权威字段。 |
| seedLength | child header 中继承的前缀事件数量。BranchMark 用它验证 full-fork 边界。 |
| `session/end-seed` | Seeded Session 构造后追加的 log-only marker，指示本 lifecycle 的 live write 起点。 |
| ClipUsage | 创建衍生 Session 时冻结的 excerpt/note 快照；删除原 Clip 后仍保留。 |
| DerivedSessionRelation | 插件记录的 child、mode、primary/source 与 attached Clip ids；它补充 DSH lineage，但不替代它。 |
| recall | `MessageSource.kind='plugin', form='recall'` 的用户角色上下文消息；进入 Session 日志与模型历史，但不是可编辑 Composer draft。 |
| Side Chat | Host 内存中的临时 LLM 对话，没有普通 Session id、日志、恢复或 lineage。 |
| SideChatSnapshot | Browser 可见的缩窄投影，只包含显示所需消息、流式增量、工具活动、route 与状态。 |
| route | `provider + model + optional reasoningEffort/sampling` 的 `LlmCallConfig`。Side Chat route 与来源 Session 独立。 |
| BlockAssembler | DSH 将 `StreamChunk` 唯一折叠为 blocks、assistant message、usage、finish 和 replay state 的实现。 |
| containment | 使用同一 FS provider 的 `ctx.fs.contains(parent, child)` 判断 canonical target 是否在 Workspace root 内。 |
| Slot | DSH Browser UI 的类型化插入位置；list 是添加，single 可能替换，keyed 按业务 key 分发。 |
| Dock | 本插件通过 `shell.overlay` 渲染的右侧内嵌面板；最小化时只保留中部把手，共享本会话、项目、关系和 Side Chat 四个视图。 |
| DSH subagent | 由 `ctx.subagents` 管理的 agent child/activation；本插件没有使用它。不要把它与普通 fork child Session 混称。 |
