# 实验 2：两类普通衍生 Session

本实验要求你在最小 Clip 主干之上实现 full-fork 与 clips-only，并用实际 DSH Session header 和 event log 证明二者不同。重点不是做完整 UI，而是建立正确的持久化语义。

## 学习目标

- 从 primary Clip 的 message 位置分叉到完整 turn。
- 用目标 DSH 的 `parentSession`、seeded 标记、精确 inherited cut 与 `session/end-seed` 证明 lineage。
- 为 clips-only 创建无 parent 的真正新 Session。
- 把 relation/usages 存入插件 domain，把 recall 写入模型可见 Session log。
- 支持创建并打开与创建并发送，不污染 Composer。

## 先修与准备

完成实验 1，准备一个至少三轮且全部持久化的来源 Session。创建三条 Clip：第 2 轮 assistant 上一条作为 primary，第 1 轮或其他消息一条作为附件，另一个来源 Session 一条作为跨来源附件。为至少两条加 note。

沿用实验 1 的 rc.1 基线，使用 `isSeeded + inspection.inheritedEventCount`。不要做多版本运行时探测；SessionHandle 是完成主线后的独立练习。

## 任务 1：定义两种 mode

请求 union 或跨字段 schema 必须表达：

```text
full-fork → primaryClipId required
clips-only → primaryClipId forbidden
attachments → non-empty、unique、每条有 includeNote
```

Relation 对 full-fork 保存 primary/source fields，对 clips-only 禁止这些字段。Usage 总是保存 excerpt snapshot，并只在 `includeNote=true` 且 note 存在时保存 note snapshot。

检查点：构造“clips-only + primary”与“full-fork 无 primary”的 durable record，schema 都拒绝。

## 任务 2：实现 Client launch

full-fork 调用：

```typescript
sessions.fork({
  sessionId: primary.source.sessionId,
  atSeq: primary.source.eventSeq,
  increaseTitle: true,
})
```

clips-only 调用 API Session Controller 的 `sessions.create({ workspaceId })`。两条路径创建后都调用 Host `recordDerivedSession`。

检查点：spy 证明 clips-only 没有调用 fork，full-fork 没有调用 create；二者都不调用 Composer `insertReference()` 或 `setDraft()`，Clip 上下文只由后续 Host recall append 提供。

## 任务 3：Host 验证 child 事实

通过 `sessionPersistence.inspect()` 读取 child 的 header、events 与精确 inherited cut。clips-only 要求无 `parentSession`、`isSeeded=false`、cut 为 0；full-fork 要求 parent 正确、`isSeeded=true`、`inheritedEventCount` 等于预期。

必须读目标 DSH [`api/session-controller`](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/packages/api/session-controller/src/commands.ts) 与 [`SessionHeader`](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/packages/core/session/src/types.ts) 的当前源码定位；不要假设课程版本和你的目标版本一致。

检查点：创建一个无关 child 后伪造 full-fork record，Host 返回 `derived-session-mismatch`；relation table 不新增记录。

## 任务 4：写 relation、usage 与 recall

先把 relation + usages 放进同一个 KV value，再向 child append plugin recall user message。Recall 正文按 attachment 顺序包含 excerpt 与被选择的 note。

检查点：读取 child events，最后的 recall source 为 `kind=plugin`、`plugin=dsh-branchmark`、`form=recall`；模型输入可以从 event log 重建，Composer draft 仍为空。

额外设计题：storage put 成功而 Session append 失败时如何恢复？当前实现没有跨系统事务。为你的练习实现至少写一份恢复设计，可选 `preparing/ready + retry` 或对账 repair；不要用“不会失败”回答。

## 任务 5：打开与后台发送

无 question 时 `sessions.open(childId)`；有 question 时不要求先打开，取得 child binding 后调用：

```typescript
binding.session.prompt([{ type: 'text', text: question }], 'queue')
```

检查点：prompt spy 只收到用户问题，不重复收到 recall；失败时 child 和 relation 仍可找到。当前教材直接传播 prompt 错误；请为练习设计部分成功提示/恢复策略，不把设计题当成已实现功能。

## 任务 6：Lineage 与 divider

从 DSH `SessionSummary.parentId` 投影当前完整已知 tree；不要从 plugin relation 推 parent。注册 Conversation node 匹配 `session/end-seed`，仅 full-fork relation 渲染 divider，并提供打开 `sourceSessionId` 的动作。

检查点：full-fork 在父 branch 中；clips-only 不在；两个 child header action 分别显示“继承来源上下文”与“由摘录创建”。

## 必做验收矩阵

| 行为 | full-fork | clips-only |
| --- | --- | --- |
| 新 Session id | 是 | 是 |
| DSH `parentSession` | primary source Session | 无 |
| DSH 精确 inherited cut | 截止 source 完整 turn | `0`/无继承 |
| `session/end-seed` | 构造 seed 时可能出现 | 恢复已有日志也可能出现，不是无 parent 的判据 |
| Plugin relation/usages | 是 | 是 |
| Plugin recall | 是 | 是 |
| Composer 初始为空 | 是 | 是 |
| 可创建并后台发送 | 是 | 是 |

再验证：primary 来自第 2 轮时，第 3 轮不出现在 full-fork seed；跨来源附件只进入 recall，不改变 parent；永久删除三个 live Clip 后 relation usages 与两个 child transcript 仍在。

加一道反例：恢复无 parent 的普通 Session，看到 marker 时仍判为 unseeded。再检查 fork 后继续 fork 的多 marker 场景，把 UI divider 与精确 inherited cut 分开。

## 提示与对照源码

Client launch 对照 [`domain/client.ts`](../../packages/client/src/domain/client.ts)，Host header 验证对照 [`recordDerivedSession`](../../packages/host/src/index.ts)，lineage 对照 [`domain/lineage.ts`](../../packages/client/src/domain/lineage.ts)，divider 对照 [`ForkDivider.tsx`](../../packages/client/src/components/ForkDivider.tsx)。

若你发现需要复制父消息文本来实现 full-fork，请停下来重读 DSH [Session 文档](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/docs/subsystems/session.md)；正确路径应由宿主 fork seed。

## 复盘

画两棵图：一棵只包含 DSH parentId；一棵是 Clip→usage→derived Session 的插件关系。解释为什么它们相交但不等价，以及 clips-only 为什么只出现在第二棵图。
