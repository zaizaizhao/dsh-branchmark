# 术语表

本课程固定使用以下术语。遇到同义表达时，以本表区分数据身份和生命周期。

| 术语 | 定义 |
| --- | --- |
| Bundle | 带 `dsh.bundle.patch` 的 npm 分发包；它向 profile 贡献 Cordis 配置层。本插件的安装包名是 `dsh-branchmark`。 |
| Profile | `$DSH_HOME/profiles/<name>` 下的一套可启动组合；按顺序叠加 bundles 与用户 patch。 |
| Cordis Context | 按 key 提供和消费 Service、事件与 effect 的插件上下文。 |
| effect | 跟随插件 fiber 生命周期自动撤销的注册或资源；Host domain、Side Chat、Browser stylesheet 与 Remote mount 都有 disposer。 |
| Host | DSH Node 进程中的插件面，拥有本地数据、Session 访问、LLM 调用和业务校验。 |
| Client | Browser 中的 Cordis 插件面，拥有 UI、选区观察、Remote 调用和 DSH Client service 编排。 |
| Client Module | 声明 `dsh.client` 并导出 `./client` 的浏览器 bundle，由 DSH Client Modules 扫描和加载。 |
| API Controller | DSH Client 中 React-free 的领域 owner；通过 Remote、observable source、binding 和 command 管理 Session 或 Workspace，而不拥有具体 UI target。 |
| UI adapter | 把 React-free 领域 source 注册为标准 Slot props/Hook 的 `ui-*` owner；它不复制 Controller 的 transport 和 business command。 |
| Conversation target | 从 UI Conversation 共享 assembly 取得 target-specific snapshot 的 owner，例如 UI Chat 或 UI Trajectory。每个 target 独立拥有 definition、builder、selection 和 renderer。 |
| Session binding | API Session Controller 为一个 Session 提供的稳定 scope、snapshot、event source 和 command 入口；Session-scoped consumer 的清理跟随 binding context。 |
| keyed Chat snapshot | UI Chat 的增量 projection；`order` 保存显示顺序，`nodes.get(key)` 按稳定 business key 读取当前节点，使数据或位置变化不必更换 React identity。 |
| Typert Remote | 从 Host `@Remote` 方法生成 strict descriptor、codec 和 Client concrete method 的 unary RPC 机制。 |
| RemoteResult | DSH Gateway 的 Client 调用结果，区分成功 value 与带 code/details 的 Remote failure。BranchMark 当前 value 内还包含插件自己的业务 success/rejection union。 |
| Clip | 不可修改的摘录正文与来源锚点，加上可修改备注、标签、scope、置顶和状态，以及由 Host 管理的可选集合顺序。 |
| owner Session | Clip 创建时所在的普通 Session。Session scope Clip 只在该 Session 的本会话视图出现。 |
| project Clip | `scope: 'project'` 的 Clip，在同一 Workspace 的项目枝签视图中跨 Session 可见，但不会自动进入模型上下文。 |
| pinned group | `pinnedAt` 存在的 active Clip 分组，始终显示在未置顶组之前。置顶状态与组内顺序是两个独立决定。 |
| ordered Clip collection | 一个 Workspace 的项目 active Clip，或某个 owner Session 的私有 active Clip。`sortIndex` 只在当前集合中有意义，不是全局排名。 |
| complete reorder | 用目标集合全部 active Clip id 表达的替换顺序。Host 拒绝局部成员和跨置顶组顺序，再写入连续 `sortIndex`。 |
| primary Clip | full-fork 或 Side Chat 用来决定来源 Session、消息位置、完整 turn 与初始模型 route 的主要摘录。其余 Clip 只是显式附件。 |
| canonical text | Host 与 Client 共同采用的 DSH message 文本投影：本插件把 text/reasoning blocks 以空行连接。range 必须切出 exact excerpt。 |
| event seq | Session append-only log 中连续的事件序号。Clip 保存来源消息的 seq，而不是 DOM 索引；alpha.5 起，同进程类型使用 `SessionSeq`。 |
| SessionSeq | DSH alpha.5/master 中指向一条已存在 Session event 的 branded number。Wire 与磁盘仍是普通 number，进入同进程领域后再验证并加 brand。 |
| SessionLogOffset | DSH alpha.5/master 中指向日志间隙、读取 offset、事件总数或继承前缀长度的 branded number；它可以等于事件数，不能当作现存 event identity。 |
| turn | DSH 从 `turn/start` 到 `turn/end` 的执行单位，可能包含多个 LLM step。full-fork 边界必须落在完整 turn 后。 |
| full-fork | 调用 DSH 原生 fork，继承来源 Session 从开头到主要 Clip 所在完整 turn 的事件 seed，并产生 DSH parent lineage。 |
| clips-only | 调用 DSH create 创建无 parent/seed 的新普通 Session，再把 Clip 使用快照作为 `recall` 消息写入日志。 |
| derived Session | 经 full-fork 或 clips-only 流程创建、并有 BranchMark relation 的普通持久 Session。 |
| parentSession | DSH `SessionHeader` 中的父 Session id，是 fork lineage 的权威字段。 |
| seedLength | BranchMark alpha.2 所用的 child logical header 字段，表示继承前缀事件数。alpha.5/master 的逻辑 `SessionHeader` 不再暴露它；v0 JSONL 编码仍保留该物理字段以兼容旧日志。 |
| isSeeded | DSH alpha.5/master 的 `SessionHeader` lineage 位，只回答 Session 是否含 fork-inherited prefix，不携带精确切点。 |
| inheritedEventCount | DSH alpha.5/master 在含日志正文的 observation、Session 或 handle 上提供的精确继承前缀长度，类型为 `SessionLogOffset`。 |
| SessionInspection | header、`inheritedEventCount` 与完整事件日志组成的不可变读取结果。alpha.5 可由 `sessionPersistence.inspect()` 获得；当前 master 由读 handle 的字段与 `read()` 组合得到。 |
| SessionHandle | 当前 DSH master 中由 `sessionPersistence.create/open` 返回的逐 Session 通道。读 handle 可并存，写 handle 独占；调用方必须在 `finally` 中 `close()`。 |
| `session/end-seed` | Seeded Session 构造后追加的 log-only marker，指示本 lifecycle 的 live write 起点。 |
| ClipUsage | 创建衍生 Session 时冻结的 excerpt/note 快照；删除原 Clip 后仍保留。 |
| DerivedSessionRelation | 插件记录的 child、mode、primary/source 与 attached Clip ids；它补充 DSH lineage，但不替代它。 |
| recall | `MessageSource.kind='plugin', form='recall'` 的用户角色上下文消息；进入 Session 日志与模型历史，但不是可编辑 Composer draft。 |
| `ReferenceInsert` | DSH 原生 Composer 引用描述，包含 source、版本化 ref、可见 label 和 clipboard projection；模型文本由来源 codec 在提交时生成。 |
| occurrence | DSH input state 中一枚结构化引用的身份与 draft range。它让同名引用可独立删除，但不会随 clipboard projection 一起直接持久化。 |
| draft mirror token | occurrence 的 clipboard/persistence projection。BranchMark 使用 `@branchmark:<ClipId>`，重新绑定 Composer 后据此通过公开 API 重建 occurrence。 |
| Side Chat | Host 内存中的临时 LLM 对话，没有普通 Session id、日志、恢复或 lineage。 |
| SideChatSnapshot | Browser 可见的缩窄投影，只包含显示所需消息、流式增量、工具活动、route 与状态。 |
| route | `provider + model + optional reasoningEffort/sampling` 的 `LlmCallConfig`。Side Chat route 与来源 Session 独立。 |
| BlockAssembler | DSH 将 `StreamChunk` 唯一折叠为 blocks、assistant message、usage、finish 和 replay state 的实现。 |
| containment | 使用同一 FS provider 的 `ctx.fs.contains(parent, child)` 判断 canonical target 是否在 Workspace root 内。 |
| Slot | DSH Browser UI 的类型化插入位置；list 是添加，single 可能替换，keyed 按业务 key 分发。 |
| Dock | 本插件通过 `shell.overlay` 渲染的右侧内嵌面板；最小化时只保留中部把手，共享本会话、项目、关系和 Side Chat 四个视图。 |
| DSH subagent | 由 `ctx.subagents` 管理的 agent child/activation；本插件没有使用它。不要把它与普通 fork child Session 混称。 |
