# 第 7 章：普通衍生 Session 与父子层级

本章实现两个持久化去向：完整继承来源历史的 full-fork，以及只携带显式 Clip 的 clips-only。完成后，你应能从 DSH Session header 证明父子关系、把 Clip recall 写入模型可见日志、支持“创建并打开”和“创建并发送”，并说明插件关系为什么不能冒充 DSH lineage。

本章代码和图按当前 alpha.5 release tag 讲解：`SessionHeader.isSeeded` 表示是否继承父日志，`SessionInspection.inheritedEventCount` 表示精确前缀长度。alpha.2 的旧 `seedLength` 与未发布 master 的 `SessionHandle` 只在[第 13 章](13-dsh-prerelease-upgrade.md)用于迁移对照，不能与本章实现交叉使用。

## 1. 先画清三种对象

```text
full-fork ordinary Session
  DSH parentSession + isSeeded + inheritedEventCount + copied seed events
  plugin relation + immutable Clip usages + recall message

clips-only ordinary Session
  no DSH parentSession, isSeeded=false, inheritedEventCount=0
  plugin relation + immutable Clip usages + recall message

Side Chat
  no SessionId, no SessionHeader, no durable event log
  Host-memory context only
```

三者都可以回答问题，但持久化、恢复和层级语义完全不同。DSH 的 subagent 也不在这条路径中：subagent 是 agent loop 内的委派能力，不会创建本插件的普通 UI Session 或 Side Chat tab。

## 2. full-fork 从主要 Clip 的来源开始

多选 Clip 时，用户必须选择一个 primary；其余只是附件。primary 必须是 `session-message` 且 `forkable=true`。Browser 调用 API Session Controller：

```typescript
sessionId = await ctx.sessions.fork({
  sessionId: primary.source.sessionId,
  atSeq: primary.source.eventSeq,
  increaseTitle: true,
})
```

实现见 [`BranchMarkClient.launch`](../../packages/client/src/domain/client.ts)。这里传的是摘录所在 message 的 event seq，而不是当前父会话末尾，因此用户在父会话中间第 N 轮摘录时，child 只继承到包含该消息的完整第 N 轮。

`fork` 属于 API Session Controller 而不是 Workspace UI 或具体 Runtime class，因为完整 turn 截断、child binding 可寻址、父子 header 与错误语义都属于 Session domain。插件只提交来源 identity 和 `atSeq`，不会复制 Session manager 或 transport 实现；这个所有权选择的收益见[架构设计解读](../reference/dsh-client-architecture-rationale.md#8-为什么-session-创建和分叉属于-api-session-controller)。

## 3. DSH 如何把 message seq 对齐到完整 turn

Client `ISessions.fork` 最终调用 Host API Session Controller。当前 Host 的算法在来源事件中找到第一个 `seq >= atSeq` 的 `turn/end`，以它作为 seed boundary；随后还包含下一次 `turn/start` 之前的独立尾随事件。源码锚点见 [DSH 源码导航](../reference/source-map.md)与 [`docs/subsystems/session.md`](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/subsystems/session.md)。

低层 `SessionStore.fork` 只接受可平衡的边界，创建 child 时写入：

```text
SessionHeader.parentSession = sourceSessionId
SessionHeader.isSeeded = true
SessionInspection.inheritedEventCount = copied seed event count
```

新 Session constructor 在 seed 后追加 `session/end-seed`。因此 full-fork 是宿主级结构，不是插件把历史消息重新发一遍；child 能在后台从 seed 重建上下文，前端不需要伪造一份父会话 transcript。

`parentSession` 指出父会话，`isSeeded=true` 只指出存在继承前缀，精确长度由 `SessionInspection.inheritedEventCount` 提供。未发布 master 把相同精确值放在 `SessionHandle` 上。`session/end-seed` 仍是 lifecycle marker，不能反向当作 inherited cut 的权威来源。

## 4. 为什么 Host 还要验证 child header

Browser 完成 fork 后调用 `recordDerivedSession`。Host 不能因为调用顺序看起来合理就相信 child 真由 primary 派生；它会：

1. inspect child Session。
2. inspect primary source Session。
3. 用与当前 DSH fork 对齐的算法计算预期 `inheritedEventCount`。
4. 检查 child `parentSession === source.sessionId`、`isSeeded === true` 且 `inheritedEventCount === expected`。
5. 只有一致才写插件 relation 和 recall。

这防止调用者创建任意 Session 后伪造“继承来源上下文”标记。插件的 `expectedForkInheritedEventCount()` 还会把 boundary 后、下一轮开始前的 standalone events 算入，以匹配当前 Session Controller 行为。

## 5. clips-only 创建真正的新 Session

仅携带枝签不能调用 `connectWorkspace` 一类可能复用空白会话的入口，否则“新会话”可能实际修改已有 Session。API Session Controller 的 `ISessions` 直接提供严格的新建接口：

```typescript
sessionId = await ctx.sessions.create({ workspaceId })
```

该接口总是创建一个新 Session；Workspace UI 的 `connectWorkspace` 则可以复用 blank Session，两者不能互换。Host 随后验证 clips-only child 没有 `parentSession`、`isSeeded` 为 false，并且 `inheritedEventCount` 为 0。升级策略见[兼容性限制](../reference/compatibility-and-limitations.md)。

DSH 把“严格创建领域实体”和“为导航寻找或复用可显示 Session”分给不同所有者，可以避免一个方便的 UI helper 同时承担两个矛盾语义。BranchMark 选择 `ISessions.create`，因此测试可以直接证明返回的是新 Session，而不是从 UI 状态反推是否发生了复用。

## 6. Relation、usage 与 recall 各自解决什么

Host 验证 child 后构造一个 `DerivedSessionRecord`：

- `relation` 回答 child 是哪种模式、primary 是谁、附件有哪些。
- `usages` 冻结每条 Clip 当时的 excerpt 与用户选择携带的 note。
- Session `user/message` recall 让模型能够看到这些材料，并符合 DSH “model-visible 必须 logged”的规则。

recall 事件使用：

```typescript
derivedSession.append('user/message', createUserMessage({
  source: { kind: 'plugin', plugin: 'dsh-branchmark', form: 'recall' },
  content: [{ type: 'text', text: recallText }],
}), { surfaceOp: 'append' })
```

它被写进普通 Session log，而不是塞入一个前端隐藏变量。Composer 仍保持空白，让用户自己提出问题。

## 7. 当前跨系统提交不是一个事务

relation/usages 在同一 KV value 内原子提交，但 storage domain 与 Session event log 是两个 durable subsystem。当前 `recordDerivedSession` 先 `put` relation record，再 append recall；两者之间没有跨系统事务。

正常路径和现有测试会同时完成，但如果 storage 成功后 Session append 突发失败，relation 可能已经存在。生产化时应选择一种显式恢复策略，例如为 record 增加 `preparing/ready` 状态并重放 recall，或提供按 relation 对账的 repair；不能宣称当前代码具备跨介质原子性。

## 8. “创建”与“创建并发送”

Launcher 支持两个完成动作：

- 创建：先创建/分叉、记录 relation 与 recall，然后 `sessions.open(sessionId)` 跳到 child；用户在空 Composer 输入问题。
- 创建并发送：Launcher 弹出问题输入框；完成 relation/recall 后取得 child binding，调用 `binding.session.prompt(..., 'queue')`。它不必先切换页面，任务会直接在后台运行。

`queue` 是明确的提交策略。如果 prompt 返回失败，child 与已记录上下文仍然存在，UI 应告诉用户“会话已创建但问题未提交”，而不是删除 child 隐瞒部分成功。

## 9. 双向关系与删除后的可追溯性

`listRelations` 至少要求 `clipId` 或 `derivedSessionId`。按 Clip 查询可列出所有使用它的 child；按 child 查询可恢复所有附件及 snapshot。永久删除 live Clip 不级联删除 relation/usages，已经创建的 Session 也不受影响。

这就是“双向关联”的准确含义：导航和审计可以双向查找；它不是把两边生命周期绑在一起，也不让删除来源修改历史 child。

## 10. 父子会话树只读 DSH `parentId`

[`deriveCurrentLineage`](../../packages/client/src/domain/lineage.ts) 从 DSH `SessionSummary.parentId` 找当前 Session 的已知 root，再遍历 children。每个 root 的第一层 child 决定稳定分支色，后代继承颜色；缺失 parent 或 cycle 时保留当前 Session 为 root，避免 UI 消失。

clips-only relation 不产生 `parentId`，所以不会成为 DSH tree 的 child；它只显示“由摘录创建”的插件标记。不要拿 `sourceSessionId` 或 Clip owner 猜一个 parent，否则 UI 会陈述一个 Host header 中不存在的事实。

## 11. 继承横幅与跳回来源

[`ForkDivider`](../../packages/client/src/components/ForkDivider.tsx) 注册一个 Conversation node definition，匹配 DSH `session/end-seed`，并挂到 `conversation.chat.node`。只有 relation mode 为 full-fork 时才渲染按钮：

```text
[父会话复制的 seed transcript]
──────── 从来源会话第 N 轮完整分叉 ────────
[插件 recall]
[child 后续问题与回答]
```

点击分隔条调用 `sessions.open(sourceSessionId)`。分隔位置来自 authoritative `session/end-seed`，不是通过数 DOM 消息或猜 `inheritedEventCount` 渲染。

Header action 同样先查 relation：full-fork 显示“继承来源上下文”，clips-only 显示“由摘录创建”，点击后打开 lineage view。

## 12. full-fork 的选择规则

当多个 Clip 来自多个 Session 时，多选只会出现在项目级或当前可见集合的显式选择中。Launcher 仍只允许一个 primary，因为一条 DSH Session header 只能有一个 `parentSession` 和一份线性 seed。其余 Clip 作为 recall attachments，允许逐条取消 note。

若用户不想选择 primary，应切换 clips-only；不能把多个来源 Session 的历史拼接后称为 full-fork。Side Chat 也遵循一个 primary source prefix + 多个 explicit Clips 的结构。

## 13. 本章检查点

运行 Client 与 Host tests：

```sh
pnpm --filter dsh-branchmark-client test
pnpm --filter dsh-branchmark-host test
```

在真实 DSH 中完成两个验收：

1. 从父会话中间一条已完成消息 full-fork，确认 child header 的 parent 是父 Session、seed 截止该完整 turn、分隔条可跳回来源、Composer 初始为空但模型 log 已有 Clip recall。
2. 以相同 Clip 创建 clips-only，确认 child 没有 parent、没有 inherited prefix，仍有 recall 与 plugin relation，且不会出现在父会话的 DSH lineage branch 中。

再删除原 Clip，确认两个 child transcript 和 usage snapshot 不变。

## 14. 检索练习

1. 为什么 full-fork 的 `atSeq` 指向摘录 message，而最终 seed 要截止 `turn/end`？
2. 为什么 primary 只能有一个，而 attachments 可以有多个？
3. relation 已记录是否足以证明 DSH parent-child？
4. clips-only 为什么不能通过复制父 transcript 文本实现后再显示“继承上下文”？

下一章转向不创建 Session 的 Side Chat：它会复用同一来源 prefix，但用摘要、最近原始消息和显式 Clip 直接构造临时 LLM 请求。
