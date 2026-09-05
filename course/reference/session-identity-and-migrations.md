# Session 身份、读取成本与格式迁移

本页解释容易混用的 Session 概念。前半对应[rc.1 主线](version-baseline.md)，后半是固定上游源码的迁移设计练习，不表示 BranchMark 已实现 SessionHandle 或兼容日志 v2。实现步骤见第 7、13 章。

## 1. 身份、位置、长度分别回答什么

| 值 | 含义 | 不能代替 |
| --- | --- | --- |
| `SessionId + MessageId` | 在某个 Session 中定位消息身份 | 消息现在位于哪条 event |
| `SessionSeq` | 当前逻辑日志中的事件位置 | prefix 长度、DOM 行号、跨格式永久身份 |
| `SessionLogOffset` | 事件间隙、下一位置、总数或前缀长度 | 指向已存在事件的 seq |
| `turn` | 完整用户轮次 | 单个模型 step 或消息索引 |
| Clip `range` | canonical text 的 UTF-16 半开区间 | UTF-8 字节数或屏幕字符数 |

若日志已有 10 条事件，seq 范围是 0–9，而 offset 可以是 10。`SessionSeq(10)` 的数值校验只能证明非负安全整数，不能证明某个具体 Session 真有该事件；读取结果还要核对 id、role、turn 和 excerpt。Brand 防止误传类型，不代替存在性与来源校验。

原始类型见 [Session types](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/packages/core/session/src/types.ts)，BranchMark 的 wire DTO 见 [types.ts](../../packages/host/src/types.ts)。

## 2. 读取意图也是性能设计

rc.1 的 live `Session` 使用以下接口，不应在只需要数量时取得整份数组：

| 需求 | API | 主要成本 |
| --- | --- | --- |
| 当前事件数/下一 offset | `session.seq` | 标量读取 |
| 已知事件 | `session.eventAt(seq)` | 单索引读取 |
| 稳定前缀或数组算法 | `session.snapshotEvents(from?, to?)` | 所选事件的物化；全量快照在 append 前可复用 |

BranchMark 的来源验证通过 `SessionPersistence.inspect()` 读取持久结果，这与 live Session 的 `snapshotEvents()` 不是同一个 API。不要为了避免类型错误就把二者互换，也不要把所有查询改成全量快照。依据见 [Session 实现](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/packages/core/session/src/index.ts)和[显式读取成本决策](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/architecture/2026-08-21-session-log-read-intent.zh.md)。

## 3. lineage 与 lifecycle marker 不等价

`parentSession` 回答父 Session，`isSeeded` 回答是否继承，inspection 的 `inheritedEventCount` 给出精确前缀。full-fork 必须同时验证三者，clips-only 则要求无 parent、false、0。

`session/end-seed` 表示一次构造/恢复的 live-write 起点。rc.1 构造函数收到 seed 时可追加 marker，恢复一个没有 parent 的普通 Session 也可能触发；若日志末尾已有 marker，会避免重复追加。由此不能推出“第一个 marker 是 fork cut”“只有 fork 才有 marker”或“一个 child 只有一个 marker”。

BranchMark [ForkDivider](../../packages/client/src/components/ForkDivider.tsx)按 marker 与插件 relation 渲染。它是 UI 呈现规则，不是 lineage 校验依据；多级 fork 和恢复场景需要额外验收，不能用第一张截图代替。

## 4. 后续目标：SessionHandle 的资源所有权

固定对照 [`d347e70390`](https://github.com/deepseek-ai/deepseek-harness/tree/d347e70390)中的 [SessionHandle](https://github.com/deepseek-ai/deepseek-harness/blob/d347e70390/packages/session/session-persistence/src/handle.ts)与 [SessionPersistence](https://github.com/deepseek-ai/deepseek-harness/blob/d347e70390/packages/session/session-persistence/src/index.ts)。该 API 用 read/write handle 区分观察和单写者所有权，当前 rc.1 主线没有此 API。

迁移设计应把四个生产读取点收敛到 Host 私有读取模块，由它负责 `open(id, 'read') → read() → finally close()`，业务只消费 header、cut、events。不要让每个 Clip、relation 和 Side Chat 分支分别管理资源，也不要为了读取而取得 write ownership。

此目标的 `append()` 接受数据和 `flush()` 的持久性屏障也不同；不能把“调用完成可读”直接写成“崩溃后必然存在”。read 失败、业务拒绝、成功返回、close 重复调用都应有测试。只给 fake 加几个空方法不算验证资源生命周期。

## 5. 格式升级可能改变旧 eventSeq

上游 [v1→v2 迁移实现](https://github.com/deepseek-ai/deepseek-harness/blob/d347e70390/packages/session/session-format-v1-to-v2/src/migration.ts)会折叠 `assistant/chunk` 并重新分配连续 seq，同时重映射日志内切点和引用；[迁移测试](https://github.com/deepseek-ai/deepseek-harness/blob/d347e70390/packages/session/session-format-v1-to-v2/tests/migration.spec.ts)提供对应 fixture。这不意味着插件自己的 `clip_explorer` 表也会被 DSH 自动迁移。

下面只是位置变化示意，不是可导入的完整 Session JSONL：

```text
旧逻辑日志：0=start, 1=step, 2=chunk, 3=chunk, 4=message(id=M)
新逻辑日志：0=start, 1=step,                         2=message(id=M)
旧 Clip：messageId=M, eventSeq=4
```

若插件只把 `inspect()` 改成 handle，仍用旧 seq=4 查询，就可能读到别的事件或错误 turn；编译器发现不了。只在 Host 记录关系时纠正也太晚：当前 [Client launch](../../packages/client/src/domain/client.ts)先把保存的 `eventSeq` 交给 DSH fork，后调用 Host `recordDerivedSession`。

## 6. 重定位设计必须覆盖全部消费者

下表是未来迁移的设计要求，不是当前已有 helper 或 fallback：

| 消费路径 | 必须先得到的当前事实 |
| --- | --- |
| Clip 跳回来源/选区 | 当前 Session 中的 message 与位置 |
| full-fork 的 Client `atSeq` | 重定位且校验后的当前事件 seq；必须在创建 child 前得到 |
| Host child/source 校验 | 相同代际的 parent、cut、message 和 turn |
| Side Chat source prefix | 当前日志中同一来源消息所在完整 turn |
| 插件 relation/usage 回看 | 已冻结历史含义；不能自动改写成另一个来源 |

优先用 `SessionId + MessageId` 找候选，再校验 role、turn、canonical slice 与原 excerpt；找不到或不唯一时拒绝并要求明确恢复，不能选“最近的同文本”。MessageId 是否跨目标格式保留也需要 fixture 证明，不能把它当成永不改变的魔法 key。

至少保留一个在升级前创建的 Clip fixture，跨迁移验证“原文不变、来源还是同一消息、full-fork 边界正确”。只测试升级后新建 Clip，恰好会漏掉旧用户数据风险。

## 7. 数据代际与回退

DSH 的[相邻格式迁移规则](https://github.com/deepseek-ai/deepseek-harness/blob/d347e70390/.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md)与 [JSONL generation](https://github.com/deepseek-ai/deepseek-harness/blob/d347e70390/packages/session/session-persistence-jsonl/src/generation.ts)保留已提交旧代际，发布版本命名的新代际。保留前代不等于支持旧程序读取新写入，也不等于降级测试已经通过。

分别处置三种数据：Session logs 是权威会话历史，Clip domain 是用户摘录，projection cache 是可重建派生数据。只有后者可以按宿主声明的缓存策略重建；不能把 `backup-and-skip` 用于用户 Clip，也不能删除新版日志后假装完成降级。

首次演练使用数据副本，并记录升级前后内容摘要/数量、失效来源、回退限制与未验证项。日志格式升级、数据恢复工具和多租户权限扩展都超出当前课程主线实现范围。
