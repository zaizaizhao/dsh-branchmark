# 兼容性、限制与升级检查

本页记录会影响“纯插件可实现性”的 DSH 事实，以及当前实现主动接受的限制。它不是未来承诺；每次升级都要重新执行检查。

## 版本口径与最新审计结论

“版本号相同”不等于“源码接口相同”。本页使用三个互不替代的锚点：

| 目标 | 精确源码 | BranchMark 当前状态 |
| --- | --- | --- |
| 旧迁移起点 | DSH `0.1.2-alpha.2`，commit [`0a53fb5`](https://github.com/deepseek-ai/deepseek-harness/tree/0a53fb55bea101816fa226bb964ae2bed71c343b) | 只用于第 13 章的旧 API 对照 |
| 当前可运行基线 | DSH `0.1.2-alpha.5`，tag [`dsh-v0.1.2-alpha.5`](https://github.com/deepseek-ai/deepseek-harness/tree/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5) | 当前源码、依赖图与主线课程直接适配 |
| 移动中的上游 | 2026-09-02 `master`，commit [`49a606b`](https://github.com/deepseek-ai/deepseek-harness/tree/49a606bc5b5934603f22a26957a07dc799ab0291) | 除 alpha.5 迁移外，还要适配 `SessionHandle` |

审计时 npm alpha tag 指向 `0.1.2-alpha.5`，而上述 master 的 root package version 也仍是 `0.1.2-alpha.5`，但 master 已包含 tag 之后的 breaking persistence API。因此兼容报告、依赖 pin 和发布说明必须同时写 package version 与 Git commit；不能把 master-compatible 构建发布成另一个名为 `0.1.2-alpha.5` 的正式兼容包。

alpha.5 迁移已经进入当前源码，并在 Node 24.19.0 下通过 `pnpm run check`：Host 11、Client 28、Bundle 1 个测试，以及三个 TypeScript face、Host/Client/Bundle build 与自包含 Bundle 校验。master 目标只在临时集成工作区验证通过；这些证据不把未发布 master 变成 alpha.5 的兼容目标，也不替代真实 Web profile 和 provider 验收。

## alpha.2 到 alpha.5/master 的变化

| 到达目标 | DSH 变化 | DSH 这样修改的收益 | BranchMark 影响与迁移 |
| --- | --- | --- | --- |
| alpha.3 起 | 第一方 Session persistence 只保留 JSONL；可选 SQLite Session store 被删除 | 权威日志只维护一种物理格式、恢复规则和平台测试矩阵；SQLite query 与通用 KV storage 仍保留各自职责 | 默认 JSONL 用户不改插件代码；若部署曾选择已删除的 SQLite Session provider，必须在旧 DSH 中先导出 Session |
| alpha.5 | `SessionHeader.seedLength` 拆为 header 上的 `isSeeded` 与含正文读取结果上的 `inheritedEventCount: SessionLogOffset`；事件 identity 使用 `SessionSeq` | 只列 header 的调用方无需读取或解释正文切点；类型系统能区分现存事件和可等于日志长度的 offset | full-fork 验证改查 `header.parentSession/isSeeded` 与 inspection 的 `inheritedEventCount`；clips-only 要求 `isSeeded === false` 且 cut 为 0；wire number 在同进程入口转为 `SessionSeq` |
| alpha.5 | `Session.events` 改为 `seq`、`eventAt()`、`snapshotEvents()` | 长度和单事件读取保持 O(1)，完整数组复制只在调用方显式请求时发生 | BranchMark production 主要读取 `SessionInspection.events`，受影响集中在测试 helper/fake；按读取意图替换，不要无条件 `snapshotEvents()` |
| alpha.5 | `conversation.input.left/right` 不再传 `InputZone.input` owner prop；Session standard props 提供 `useInput` 与 `inputActions` | `InputBar` 可以只接收稳定、不可变的 owner props 并使用 memo；Slot entry 自己订阅所需切片，减少无关 shell render 造成的 React element/props 抖动 | `BranchMarkDrawerButton` 从 `useInput(state => state.occurrences)` 读取引用数，保留 `inputActions`；其他 Slot 不应假设左侧入口仍获得 point-in-time input |
| alpha.5 tag 之后的 master | `sessionPersistence.inspect()` 被删除；`open(id, 'read' | 'write')` 返回有 `header`、`inheritedEventCount`、`read()`、`close()` 的 `SessionHandle` | 逐 Session 通道显式拥有资源和单写者资格，读不再依赖全局 prepared cache/revision 重试；未来跨进程 lease 有唯一承载点 | 把四个 production `inspect` 调用收敛到一个只读 helper：`open('read') → read() → finally close()`；测试 persistence fake 同步实现 handle 生命周期 |
| 当前 master | `session_projcache` 声明旧版本只读兼容并对坏缓存执行 `backup-and-skip` | 派生缓存升级不会因旧字段或被污染文档拖垮整个应用；seeded identity 不匹配仍按安全侧重建 | 这是正向兼容修复，不要求 BranchMark 修改 `clip_explorer`；不要把 DSH projection cache 与用户 Clip 数据混为一套迁移 |

DSH 对 `seedLength` 的拆分保持 v0 JSONL 字节兼容：旧 header 缺字段解码为 unseeded，字段存在则解码为 seeded 并取出精确 cut。这里保持的是 Session 日志物理格式兼容，不是 TypeScript API 兼容。BranchMark 自己的 `clip_explorer` v1 由 `storageDomain` 管理，上述 Session projection cache 变更不会改写它。

完整迁移方法、代码切片与发布策略见[第 13 章：跟随 DSH 预发布版本升级](../tutorials/13-dsh-prerelease-upgrade.md)。

## alpha.5 实现依赖的关键事实

| 事实 | 当前证据 | 失效后的处理 |
| --- | --- | --- |
| `ISessions.create({ workspaceId })` 是公开接口且创建后可 binding | API Session Controller 的 `ISessions` | 无此接口时禁用 clips-only；不能用可能复用空白 Session 的导航入口冒充 |
| `ISessions.fork({ atSeq })` 存在 | API Session Controller 的 `ISessions` | 禁用 full-fork；不能复制文本后标记为继承上下文 |
| Session/Workspace 领域状态由 API Controller 拥有，标准 Hook 由对应 UI adapter 提供 | Client ownership Agent Note、Controller/UI package README | 重新映射 owner 和 inject roster；不要恢复一个复制各类 snapshot 的聚合 Runtime |
| Conversation binding 只负责 target-neutral snapshot，Chat node 由 UI Chat target 拥有 | UI Conversation/Chat README 与 Conversation subsystem | 同时核对 binding 与 target API；不能把 Chat projection 写回 Session snapshot |
| DSH Remote failure 使用统一 `RemoteResult` 与 code/details vocabulary | API Gateway 与 ctx.remote failure Agent Note | 更新外层错误 discrimination；BranchMark 内层业务结果仍按插件协议单独处理 |
| Host API 把消息 seq 对齐到第一个 `seq >= atSeq` 的 `turn/end` | API Session Controller 的 fork command | 重新实现边界验证或调整交互；不得假设仍按完整 turn |
| fork child metadata 持久化 `parentSession`、`isSeeded` 与精确 `inheritedEventCount` | alpha.5 Session 与 API Session Controller | 无法证明 lineage 时拒绝记录插件关系；master 继续保留字段但改由 handle 读取 |
| seeded Session 写 `session/end-seed` | `Session` constructor | fork divider 需要改用宿主提供的新边界事件；不能猜 seq |
| Browser list 投影 `parentSessionId → SessionSummary.parentId` | API Session Controller 的 Session list | 关系树改读新的官方字段，不扫描标题或插件关系猜父子 |
| Chat 行有 `[data-chat-flow-key]` 且 Conversation snapshot 暴露 Chat View nodes | `ChatNodeSeat` + UI Conversation/Chat | 选区捕获必须迁移到新的官方 selection/slot API；DOM 猜测需要重新验收 |
| 五个 Slot 名和 props contract 存在 | layout/sidebar/conversation SlotMap | 编译并逐席位验收；不要注册到 `root` 替换整页 |
| `ReferenceInsert`、`InputTriggerSource.codec`、`SessionInput.insertReference()` 与 draft persistence mirror 存在 | ui-input-trigger + ui-conversation input contract | 缺失时拒绝装载；不得回退为完整摘录正文草稿；重新设计 token 恢复而不能猜 occurrence 内部格式 |
| Browser module接受 `window.__ModuleLoader__.load` 包装 | Client Modules | 按新的官方 bundle format 重新构建 client.js |
| Typert package mode生成 Host 与 Remote artifacts | generator + API Gateway | 调整 build order/exports；不提交手写 codec 作为长期替代 |

## Session 创建与分叉属于 API Session Controller

API Session Controller 的 `ISessions` 公开 `create`、`fork`、`open`、`binding` 与 `scope`。[`BranchMarkClient.launch`](../../packages/client/src/domain/client.ts) 直接调用该接口，因此 clips-only 必定创建新的普通 Session，full-fork 则把主要枝签的来源 Session 与 `atSeq` 交给宿主。

Workspace UI 的 `connectWorkspace` 可以复用既有 blank Session，它只适合导航流程，不满足 BranchMark 的 clips-only 语义。若目标版本缺少 `ISessions.create`，插件必须在构建或装载阶段失败，不能回退到 Workspace 导航动作。

## full-fork 不是复制消息

当前 DSH fork 在 Host 读取 attached state 或 persistence，选择来源完整 turn，复制事件 seed，继承 cwd/agent preset，并写 header lineage。插件只传来源 message 的 `eventSeq`，不重建 UI 中看到的消息。

任何降级方案若只把 Clip 文本贴到新 Session，都只能叫 clips-only，不能继续显示“继承来源上下文”。

## Composer 引用依赖原生 Input Trigger codec

当前 DSH 的 `ReferenceInsert` 把短 label 和版本化 ref 存入 Composer occurrence table，并由来源 `codec.serialize()` 在提交事务中生成模型文本。BranchMark 使用这条公开链路，因此输入框不含完整摘录，序列化失败也会阻止提交并保留 draft。普通衍生 Session 仍采用另一条路径：Host append `form: 'recall'` 的日志消息，Composer 保持空白。

结构化 occurrence 只存在于当前输入机器，但 DSH 会把每枚 occurrence 的 clipboard projection 写入按 Session 持久化的 draft mirror。BranchMark 的 projection 是 `@branchmark:<id>`；重新绑定或刷新 Composer 后，Shell 观察这些 token，分别读取当前会话私有集合与项目集合，再从右向左调用公开 `insertReference()` 重建 occurrence。可解析的 active Clip 恢复为原生 Chip，无法解析、已回收或不可见的 token 保持普通可见文字。

这项恢复服从目标 DSH 的 draft 持久化生命周期，不是 BranchMark 自有同步协议。它不会跨浏览器设备、清除站点存储后或 DSH 不再恢复该 draft 时凭空找回输入；它也不会恢复其他 Session 的 private Clip。两类可见集合都读取失败时不修改 draft，恢复期间 span 或 `draftRev` 变化时不覆盖用户编辑。

## Web fetch 不是默认可用能力

DSH `dsh-base` 默认配置 search provider，并明确没有挂载 fetch provider。`ctx.web.fetch` 方法仍存在，但调用会以结构化 provider-unavailable 错误失败。BranchMark 的 `web_fetch` schema 因此代表“允许模型请求这个只读操作”，不代表目标部署一定能执行。

当前官方 Web 文档还指出本地 HTTP fetch provider 不默认阻断 private-network target。需要 fetch 的部署必须选择符合自身 SSRF 策略的 provider；插件不应把 `ctx.web.fetch` 描述为对所有部署都安全的公共互联网隔离器。

## Side Chat 的已知限制

- 所有状态只在单个 Host 进程内存中，重启、插件卸载或关闭标签后不可恢复。
- Browser 以 500 ms 短轮询观察流式状态，不是 SSE/WebSocket；标签很多时请求数量线性增长。
- 同一个 Side Chat 同时只运行一个回答；`side-chat-busy` 不排队。
- 创建阶段只恢复来源 prefix 并加载模型目录；较早历史摘要在第一次发送时懒执行。当前空状态文案比这一真实时序更宽泛。
- `recentContextMessages` 是最低保留数；切分点向前扩展到非 tool user message，可能保留更多原始上下文并增加 token 使用。
- 较早历史先转换为一条不可信 JSON text transcript 再请求摘要；reasoning 被省略，image 只保留 omitted 标记，tool call/result 文本会保留。
- 较早历史摘要失败时只保留安全边界后的最近原始消息和完整 Clip，并通过包含 provider 原因的 `contextWarning` 告知用户。
- 直接 LLM 调用不使用普通 Session agent loop、工具注册表、重试/compaction/persistence 的完整组合；只会经过 `ctx.llm.stream` waterfall 和 provider 行为。
- 只读工具的 project search 是受限的 breadth-first 文本扫描，不是 ripgrep，也没有索引；会跳过 `.git`、`node_modules` 和不可读/非文本文件。
- Tool output 和 read content 按字符截断；这限制模型输入，不是文件级授权机制。
- temporary answer Clip 只保存用户提交的正文与 owner Session，没有 durable Side Chat/message anchor，因此不可重新打开或 full-fork。

## Clip 存储与检索限制

- `storageDomain` 当前没有二级索引；`list` 会扫描 domain 内记录，再按 Workspace、visibility、标签和文本过滤。
- 全文搜索只匹配 excerpt 和 note，不匹配来源标题，也不会进行分词或语义搜索。
- 多标签筛选是 AND 语义。
- 置顶与排序只作用于 active 的精确会话集合或项目集合；回收站没有手动顺序。
- 手动重排要求完整集合替换，搜索或标签筛选时禁用；置顶与未置顶之间不能直接拖拽，必须先显式切换置顶状态。
- 当前没有直接键盘排序操作；键盘用户可以切换置顶和使用全部批量命令。
- Clip 绑定 Workspace 与 owner Session，不绑定 Worktree。
- 没有导入、导出、同步、冲突合并或 schema migration；domain version 不匹配会失败，不会猜测转换。
- Markdown selection 使用 AST leaf projection 加空白规范化，不是任意宿主 renderer 的完整逆变换；复杂自定义渲染需要真实 Browser 回归。

## 跨 durable subsystem 的提交限制

一个 derived record 内的 relation 与 usages 在同一个 KV value 中提交，但 `recordDerivedSession` 随后还要向 DSH Session log append recall。当前顺序是 storage put 后 Session append，二者之间没有跨系统事务；若第二步发生突发失败，relation 可能已经存在。长期发布需要 `preparing/ready + retry` 或对账 repair，当前自动化没有故障注入覆盖这一窗口。

## 升级 DSH 的检查顺序

1. 记录目标 package version、release tag commit 和实际构建 commit；若 tag 与 master 不同，把它们当成两个目标分别审计。
2. 把 [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) 中全部 `@deepseek-ai/dsh-*` catalog 版本作为一组更新，不混用两个预发布版本。
3. 从目标版本的 Client ownership/architecture 记录与 package README 重新确定 API Controller、UI adapter、Conversation target、Renderer 和 Slot 的所有者，不以旧 package 名寻找 facade。
4. 在目标 DSH 源码中重新核对 `ISessions.create/fork`、Host `session.fork`、`SessionHeader.isSeeded`、精确 `inheritedEventCount`、`SessionSeq`/`SessionLogOffset` 与 `session/end-seed`。
5. 核对 live `Session` 的 `seq/eventAt/snapshotEvents` 与持久化读取面；若目标使用 `SessionHandle`，为每个 `open()` 路径证明 `close()`，并更新 test fake。
6. 对 `uiConversation.binding`、Chat target snapshot、Conversation definition registry 和五个 Slot 逐一核对类型、scope、kind、owner props 与 render site，并核对 `useInput`、Input Trigger source/codec、`SessionInput.insertReference()` 与 draft mirror projection。
7. 核对 `dsh.client` manifest、`exports["./client"]`、ModuleLoader wrapper 和 Client Modules 扫描规则。
8. 核对 Typert generator 的 package mode、Remote 方法限制、Gateway `$mount()` 和当前 `RemoteResult`/failure code contract。
9. 核对 `storageDomain`、Workspace、FS 与 Web Service 方法签名及 provider 默认组合；单独盘点 Session authority data、DSH derived cache 与 BranchMark Clip data 的迁移策略。
10. 删除 `lib/` 后执行 `pnpm run check`，确认生成链不依赖旧产物。
11. 打新 tarball并安装到全新的 DSH home/profile，检查 `--dump-config` 中只有一个 `dsh-branchmark` Loader 行。
12. 完成无 key 的 Clip/Fork/UI 验收和有 key 的摘要/流式/tool/cancel 验收；只有运行事实一致后才更新本课程版本锚点和兼容性结论。

## 升级验证命令

```sh
cd /absolute/path/to/dsh-branchmark
rm -rf packages/host/lib packages/client/lib packages/bundle/lib
pnpm install
pnpm run check
pnpm --dir packages/bundle pack --pack-destination ../../dist
dsh plugin --profile web add /absolute/path/to/new-tarball.tgz
dsh --profile web --dump-config
dsh --profile web
```

清理 `lib/` 是构建验证，不应删除 `clip_explorer` storage data。测试安装应使用独立 `DSH_HOME`，避免把开发产物覆盖到用户真实 profile。

若目标是未发布 master，不要复用已经代表 npm tag 的插件版本。先使用带目标 commit 的 prerelease 标识完成集成测试，等 DSH 发布新 tag 后再把依赖和 BranchMark 版本一起对齐。
