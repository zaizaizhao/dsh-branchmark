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
| event seq | 当前逻辑日志中的连续事件序号。Clip 保存消息位置，不是 DOM 索引；格式迁移可能重排 seq，不能视为跨代际永久身份。 |
| SessionSeq | rc.1 中指向一条已存在 Session event 的 branded number。Wire 与磁盘仍是普通 number，进入同进程领域后再验证并加 brand。 |
| SessionLogOffset | rc.1 中指向日志间隙、读取 offset、事件总数或继承前缀长度的 branded number；它可以等于事件数，不能当作现存 event identity。 |
| turn | DSH 从 `turn/start` 到 `turn/end` 的执行单位，可能包含多个 LLM step。full-fork 边界必须落在完整 turn 后。 |
| full-fork | 调用 DSH 原生 fork，继承来源 Session 从开头到主要 Clip 所在完整 turn 的事件 seed，并产生 DSH parent lineage。 |
| clips-only | 调用 DSH create 创建无 parent/seed 的新普通 Session，再把 Clip 使用快照作为 `recall` 消息写入日志。 |
| derived Session | 经 full-fork 或 clips-only 流程创建、并有 BranchMark relation 的普通持久 Session。 |
| parentSession | DSH `SessionHeader` 中的父 Session id，是 fork lineage 的权威字段。 |
| seedLength | 历史 Session logical header 字段；rc.1 使用 isSeeded 与 inspection.inheritedEventCount。物理旧格式与逻辑 API 不是同一版本概念。 |
| isSeeded | rc.1 的 `SessionHeader` lineage 位，只回答 Session 是否含 fork-inherited prefix，不携带精确切点。 |
| inheritedEventCount | rc.1 在含日志正文的 observation、Session 或 handle 上提供的精确继承前缀长度，类型为 `SessionLogOffset`。 |
| SessionInspection | rc.1 的持久读取结果，包含 meta、inheritedEventCount 与 events，由 sessionPersistence.inspect() 获得；不是后续 handle 类型的别名。 |
| SessionHandle | 固定后续源码中由 `sessionPersistence.create/open` 返回的逐 Session 通道。读 handle 可并存，写 handle 独占；调用方必须在 `finally` 中 `close()`。 |
| `session/end-seed` | 构造/恢复的 live-write 起点 marker，不等于 DSH parent 或精确 inherited cut。 |
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
| Dock | 本插件通过 `shell.overlay` 渲染的右侧内嵌面板；最小化时保留可沿右边缘移动的浮签，共享本会话、项目、关系和 Side Chat 四个视图。 |
| railPosition | 浮签在可用垂直行程中的比例；null 为默认位置，0/1 为两端。只属于当前浏览器的布局偏好。 |
| Pointer Capture | 让同一手势的后续指针事件交给持有元素；正常完成、取消、resize 和卸载都要处理释放。 |
| dist-tag | npm 中可移动的版本标签，如 latest/alpha；不等于 Git 分支、Git release 或运行中版本。 |
| source/artifact/installed/runtime | 分别指源码、生成包、已安装文件和当前运行进程；任一层更新都不自动证明下一层已更新。 |
| DSH subagent | 由 `ctx.subagents` 管理的 agent child/activation；本插件没有使用它。不要把它与普通 fork child Session 混称。 |
