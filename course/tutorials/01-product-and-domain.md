# 第 1 章：产品模型与三种“继续探索”

本章先建立产品和数据模型，不写框架代码。完成后，你应该能为任何一次“从枝签继续”指出：是否创建普通 Session、是否继承父历史、是否持久化、关闭后是否销毁。

## 1. 问题不是“收藏文本”

用户正在一个连续 DSH Session 中推进项目。某段回答值得深入，但继续追问会改变当前 Session 的上下文主线。插件需要同时保留两件东西：可回看的原文，以及从这个位置启动另一条探索路径的能力。

单纯复制到剪贴板只能保存文本；普通收藏夹只能管理文本；直接新开 Session 又丢失来源位置。BranchMark 把“枝签对象”和“继续方式”分开：Clip 负责稳定来源、正文和整理信息，Side Chat/full-fork/clips-only 负责不同生命周期的继续探索。

产品规则的权威来源是 [`docs/PRD.md`](../../docs/PRD.md)。实现之前先阅读其中“范围与术语”“已冻结的产品规则”和“非目标”。

## 2. 四种对象不要混用

| 对象 | 有 DSH Session id | 继承来源历史 | 持久化 | 关闭 UI 后 |
| --- | --- | --- | --- | --- |
| Clip | 否；引用 owner/source Session id | 不适用 | 插件 storage domain | 保留 |
| full-fork child | 是 | 是，直到主要 Clip 所在完整 turn | DSH Session + 插件 relation | 保留并可继续 |
| clips-only Session | 是 | 否；只有显式 Clip recall | DSH Session + 插件 relation | 保留并可继续 |
| Side Chat | 否 | 只在内存中重建“摘要＋最近消息＋Clip” | 否 | 收起/隐藏保留；关闭标签立即销毁 |

还有第五个相邻概念：DSH subagent。它由 `ctx.subagents` 管理，服务于 agent 委派和 child activation。本插件没有调用 subagent API；full-fork child 是可在普通 Session 列表中独立继续的会话，二者不能因为都有“child”含义就混为一个机制。

## 3. Clip 的最小领域模型

[`Clip`](../../packages/host/src/types.ts) 包含四组事实：

- 身份与归属：`id`、`workspaceId`、`ownerSessionId`。
- 可见性与生命周期：`scope: session | project`、`status: active | trashed` 和时间。
- 不可变内容：`source` 与 `excerpt`。
- 可变整理信息：`note`、`tags`、`scope`、`pinnedAt` 与 Host 管理的集合 `sortIndex`。

`scope=session` 不是“项目枝签里带会话筛选”的同一视图，而是 Host Remote 层的独立可见性规则：只允许 owner Session 的本会话视图读取。`scope=project` 只进入项目枝签视图，且不会自动注入其他 Session。

“保存到项目”更新同一 Clip 的 scope，不复制一条新记录。这样 source、备注、衍生关系和删除行为都只有一个身份。

## 4. 两种来源

`ClipSource` 是 discriminated union：

```typescript
type ClipSource = SessionMessageClipSource | TemporaryAnswerClipSource
```

`session-message` 来源保存 `SessionId`、`MessageId`、`eventSeq`、`turn`、role 和字符 range，可以重新打开来源，也可能 full-fork。`temporary-answer` 来源来自 Side Chat 回答，没有 durable message anchor，因此 `reopenable=false` 且 `forkable=false`。

插件允许把 Side Chat 回答保存为 Clip，但这个动作只冻结文本快照，不能凭空产生来源 Session 或伪造 fork 能力。

## 5. 为什么 full-fork 需要“主要来源”

一次继续探索可以选择多个 Clip，而这些 Clip 可能来自多个 Session。DSH fork 只能从一个确切 source Session 和一个事件位置建立 seed，因此必须有一个 primary Clip 决定父 Session 与边界。

当前交互规则是：同一来源的候选默认选择 `eventSeq` 最新的可 fork Clip；跨来源时要求用户显式选择。其余 Clip 不参与 parent/seed 计算，只作为附加 recall 上下文进入 child。

这解释了“多选”的真正含义：它不是把多个 Session 合并成一个父历史，而是选择一个主要历史，再携带若干独立摘录。

## 6. 为什么 fork 边界是完整 turn

一条 assistant message 可能位于一个包含多个 model/tool step 的 turn 中。只复制到 message seq 可能留下开放 step、未配对工具调用或缺失 `turn/end`。DSH Web Host API 接受 message `atSeq`，向后选择第一个 `seq >= atSeq` 的 `turn/end`，再包含下一次 `turn/start` 前的独立尾随事件。

因此“从父会话中间某条消息 fork”准确含义是：父 Session 从开头到该消息所在完整 turn 结束的事件前缀。它不是只复制该消息，也不是复制当前父 Session 的全部最新历史。

完整机制将在[第 7 章](07-derived-sessions-and-lineage.md)结合 DSH Host 源码实现。

## 7. 两种删除语义

Clip 删除采用回收站，恢复只改变 status。永久删除移除 Clip 记录，但不会修改已经存在的普通 Session，也不会删除 `ClipUsage` 快照和 `DerivedSessionRelation`。

这是数据所有权决定的结果：新 Session 创建时已经冻结它所使用的 excerpt/note，后续删除知识库对象不能重写历史模型输入。

## 8. Side Chat 的临时语义

Side Chat 的“临时”不等于“隐藏的普通 Session”。它没有 Session id、Session header、事件日志、标题或 Workspace session membership；Host `Map` 是唯一所有者。

Dock 的 `hidden`/`rail`/`expanded` 只控制显示，不释放 Side Chat。只有关闭标签、插件卸载或 Host 退出才 abort 并删除 entry。这个差异支持用户临时收起探索而不丢失当前回答，同时保持“关闭即销毁”的清晰承诺。

## 9. 实现前必须冻结的约束

- 原文与来源不可编辑；备注与标签可编辑。
- 新 Clip 默认 session scope，必须显式提升到 project。
- 跨消息选区拆为多个 Clip。
- Project Clip 只有显式选择后才进入模型输入。
- Composer 插入永不自动发送。
- full-fork 不静默降级为 clips-only。
- Side Chat 只读、可多标签、关闭标签立即销毁。
- 普通 Session 的模型可见 Clip 必须写入 Session log；Side Chat 明确不属于普通 Session。

这些约束分别被类型、Host 校验、存储 schema、UI 交互和测试固定。只在前端隐藏一个按钮不等于满足约束。

## 10. 检索练习

先不看答案，写出下面四个问题的判断，再到 [`types.ts`](../../packages/host/src/types.ts) 和 [`PRD.md`](../../docs/PRD.md) 核对。

1. 一个 project Clip 是否会自动进入同 Workspace 的所有新 Session？
2. 一个 clips-only Session 是否应该在 DSH lineage 中显示 parent？
3. 删除 Clip 后，已经创建的 child 是否应该失去 recall 内容？
4. 隐藏 Dock 和关闭 Side Chat 标签是否有相同生命周期结果？

正确结论依次是：不会；不应该；不应该；不同。若任何一项含糊，先不要进入框架实现，因为后续 package 划分依赖这些边界。

下一章将把这四类对象放进 DSH 的插件树，确定哪些能力由宿主提供、哪些必须由插件自己拥有。

进入下一章前，给一个自选功能写下“谁发起、谁验证、写到哪里、何时销毁”四项。例如浮签位置属于浏览器布局，不能因为需要刷新恢复就把它写进 Clip 表；Side Chat 使用在线 provider，也不等于数据从未离开本机。
