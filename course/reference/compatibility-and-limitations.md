# 兼容性、限制与升级检查

本页列出 rc.1 实现依赖的事实和主动接受的限制，不是未来承诺。版本与 npm 状态见[版本基线](version-baseline.md)，自动化和真实环境的证据见[验证矩阵](verification-matrix.md)。

## 版本口径与最新审计结论

主线源码、generator、DSH peers 和安装实验对应一个精确 rc.1 目标。后续源码中的 SessionHandle、日志 v2、文件附件语义与旧 Clip 重定位必须单独审计，不属于当前兼容承诺；方法见[第 13 章](../tutorials/13-dsh-prerelease-upgrade.md)。

历史分支、临时适配工作区或旧测试报告不代表当前 checkout 的验证结果。发布前重新记录实际版本、commit、tarball、profile、端口和结果。

## 当前实现依赖的关键事实

| 依赖 | 当前用法 | 变化后必须重验 |
| --- | --- | --- |
| API Session Controller | `create/fork/open/binding/scope` | 新建不复用 blank Session；fork cut 与 binding 可用 |
| Session persistence | `inspect()`、header、events、inherited cut | 资源生命周期和持久来源身份 |
| live Session | `seq/eventAt/snapshotEvents`、append recall | 读取成本、消息重建和提交失败 |
| Client owners | API Controller、标准 UI hooks、Conversation/Chat target | 依赖表、binding、Slot props 和 cleanup |
| Chat selection | `data-chat-flow-key` 与 settled Chat node | DOM/AST range 映射、流式中间态拒绝 |
| Composer | `useInput`、InputTrigger codec、insertReference 与 draft mirror | occurrence、CAS、恢复顺序与提交失败 |
| Client Modules/Typert | lazy-CJS、四个 exports、Remote mount | factory 到达、namespace 激活、公开包身份 |
| LLM/FS/Web | 注入服务并选择 provider | 实际能力、取消、网络与路径策略 |

字段和来源位置由[依赖矩阵](dsh-dependency-map.md)与[源码导航](source-map.md)维护，不在此复制整个 API 目录。

## Session 创建与分叉属于 API Session Controller

`ISessions.create` 创建新实体，Workspace 导航 helper 可以复用 blank Session；两者不能互换。缺少必需 API 时拒绝构建/装载，不通过复制 transcript 或调用导航来伪装 full-fork/clips-only。

clips-only 仅有 recall 时可能受 DSH 空会话列表策略影响；以返回 id、关系和日志检查创建结果，不以侧边栏是否显示作为唯一证据。

## full-fork 不是复制消息

full-fork 依赖 parent、seeded 位和精确 inherited cut；`session/end-seed` 只是生命周期 marker。恢复普通 Session、重复 fork 可能带来多个 marker，不能以“有分隔线”推断 lineage。当前 ForkDivider 的呈现还需要多级 fork/恢复专项验证，概念见[Session 身份参考](session-identity-and-migrations.md)。

## Composer 引用依赖原生 Input Trigger codec

短 label、版本化 ref、clipboard token 和模型文本是四种表示。BranchMark 只通过公开 insert/codec 参与 DSH 输入事务，不拥有第二份 draft。

恢复时只查当前 Session 私有集合与项目集合，按右到左顺序替换可解析 token；缺失或不可见 token 保留文字。两类查询全失败不修改 draft，span 或 draftRev 改变时不覆盖用户编辑。已有 Chip 的提交序列化失败会阻止发送；这些保证不等于跨设备同步或清空站点存储后的恢复。

## 浮签布局与可访问性

默认浮签在垂直中线上方 120 px，用户可沿右边缘上下拖动或用 ↑/↓、Home/End 定位，点击/Enter/Space 展开。布局偏好只属于当前浏览器 origin，不是 Workspace 数据。

这不是自动避碰算法，用户仍可能把浮签移到其他 overlay 上；窗口高度小于把手时也无法保证整体可见。存储拒绝时内存内仍可用，但不承诺刷新恢复。卡片列表的直接键盘重排尚未提供，不要与浮签键盘定位混淆。

## Web fetch 不是默认可用能力

rc.1 base 组合没有默认 fetch provider；方法存在、schema 已发送不代表部署可以执行。没有 provider 时应观察工具失败。官方[Web 文档](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/docs/subsystems/web.md)还指出 HTTP fetch 的私网策略依赖 provider，不能把通用 `ctx.web.fetch` 当作自动 SSRF 防护。

## Side Chat 的已知限制

Side Chat 在单 Host Map 中生存，标签关闭后不可通过 id 访问，重启不恢复；短轮询每 500 ms 观察 snapshot，不是 token push。一个 tab 同时只接受一个回答，模型目录准备与首次摘要是不同阶段。

摘要失败会携带 warning 降级为最近原始消息和完整 Clip；`recentContextMessages` 是安全切分后的最低保留数，不是精确 token budget。摘要省略 reasoning 和图片内容，不能当作多模态无损历史。

回答和工具接收 AbortSignal，首次摘要和目录准备没有同一取消链；取消请求不保证立刻 idle，关闭 Map entry 也不证明已开始的上游请求结束。详见[生命周期课](../tutorials/09-side-chat-tools-and-ui.md)。

固定工具只读不等于无数据外发：所读项目内容可能成为在线模型输入。字符截断在完整 readText 后进行，不是文件读取量、峰值内存或授权边界。Side Chat 不自动获得普通 agent loop 的 compaction、guards、hooks 和工具注册表。

## Clip 存储与检索限制

Clip 按 Workspace/owner Session 归属，不绑定 Worktree。session/project visibility 是本地受信任 DSH 的领域规则，不提供用户账户级多租户鉴权；远程部署仍需自己的访问控制。

list 扫描 domain 后过滤；全文匹配 excerpt/note，不做分词、语义检索或来源标题搜索。多标签是 AND。完整重排只允许 active 的精确集合，同组拖动，筛选和回收站禁止；跨记录写入不承诺事务回滚。

当前没有导入导出、同步、冲突合并或 schema migration。temporary-answer Clip 没有持久来源消息锚点，不能 reopen/full-fork。Markdown AST 投影也不是任意自定义 renderer 的完整逆变换。

## 跨 durable subsystem 的提交限制

relation/usages 在一条 KV value 内提交，随后 append Session recall；第二步失败时第一步可能已存在，重复 record 会拒绝。当前没有完整对账/重试机制，不能承诺跨系统原子性。恢复设计应先确认已有阶段，不能自动删除 child 或盲目重跑整条创建流程。

## 升级 DSH 的检查顺序

先固定 package、release commit 与实际目标，再按 owner 比较 API、数据格式、DOM/Slots、provider 和打包方式。使用旧 Clip/Session 数据副本做迁移 fixture，尤其检查旧 eventSeq 与当前 MessageId 的一致性；只测升级后新建数据不足够。

## 升级验证命令

操作命令只维护在[第 10 章](../tutorials/10-package-install-and-adapt.md)和[第 13 章](../tutorials/13-dsh-prerelease-upgrade.md)，发布由 [RELEASING.md](../../RELEASING.md)负责。课程不提供对当前用户目录的递归清理或直接发布脚本。
