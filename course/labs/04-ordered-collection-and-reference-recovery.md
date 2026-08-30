# 实验 4：有序集合与 Composer 引用恢复

本实验要求你在既有 Clip CRUD 上完成两个 0.3.0 纵向切片：由 Host 持有不变量的置顶与完整集合排序，以及由 DSH draft mirror token 恢复原生 Composer occurrence。重点不是复制 UI，而是证明刷新、筛选、并发 draft 变化和缺失 Clip 都不会让插件悄悄改变用户语义。

## 学习目标

- 在不迁移旧记录的前提下加入可选置顶与组内顺序元数据。
- 把“置顶”和“排序”建模为两个独立用户决定。
- 让 Host 只接受完整 active 集合的替换顺序。
- 保留多选顺序，并在 draft 头部插入时得到相同的最终 Chip 顺序。
- 区分 `ReferenceInsert` 的 label、ref、clipboard projection 和提交时模型文本。
- 从右向左恢复 token，保留周围草稿；缺失 Clip 不伪装成有效引用。

## 先修与准备

先完成实验 1，并让 Browser 能调用 `create/list/update/batchUpdate`。准备同一 Workspace 下两个普通 Session：Session A 至少有四条 session Clip，项目集合至少有三条 project Clip；两组中各置顶至少一条。另准备一条可删除或移入回收站的 Clip，用于恢复失败场景。

复核目标 DSH 版本的 [UI Input Trigger 文档](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/client/ui-input-trigger/README.md)和 `SessionInput.insertReference()` 类型。若该版本的 occurrence、clipboard projection 或 CAS 参数不同，应先更新设计，不能用完整原文草稿冒充原生引用。

## 任务 1：扩展兼容旧记录的 Clip schema

给 `Clip` 增加：

```typescript
readonly pinnedAt?: string
readonly sortIndex?: number
```

`pinnedAt` 存在表示置顶；`sortIndex` 是当前 active session/project 集合内的零基位置。Zod 要求索引是非负安全整数。两个字段都保持可选，因此没有它们的旧 version 1 记录仍表示“未置顶、尚未手动排序”，domain version 可以保持 1。

检查点：分别解析旧记录、仅置顶记录和带合法索引记录；负数、小数和超出安全整数范围的索引必须被拒绝。

## 任务 2：实现稳定排序与集合变化

`list` 的 comparator 按以下优先级工作：

```text
置顶组在前
  ↓ 同组两条都有不同 sortIndex 时按升序
只有一条有 sortIndex 时，未索引记录在前
  ↓
createdAt 倒序
  ↓
id 升序
```

`UpdateClipRequest` 可以显式设置 `pinned`，但不能直接设置 `sortIndex`。scope 或置顶状态变化会把 Clip 移到另一有序集合，因此更新时清除旧索引；只改 note/tags 时保留索引。第一次置顶写入当前时间，重复置顶保留原 `pinnedAt`。

检查点：旧 Clip、新 Clip、有索引 Clip 与置顶 Clip 混合时顺序稳定；只改 note 后索引不变，切换 scope 或 pinned 后索引消失。

## 任务 3：实现完整集合重排协议

为 `BatchClipMutation` 增加：

```typescript
{ kind: 'set-pinned'; pinned: boolean }
{
  kind: 'reorder'
  scope: 'session' | 'project'
  ownerSessionId?: SessionId
}
```

Host 处理 `reorder` 时先计算该 Workspace 下目标 scope 的完整 active 集合。session scope 必须提供 owner Session。请求 `clipIds` 必须非空、唯一，并且与目标集合成员完全相等；请求顺序还必须满足所有置顶 Clip 在所有未置顶 Clip 之前。全部验证通过后，才按请求顺序写入连续索引。

不要让 Host 接受当前搜索结果或标签筛选结果。被过滤记录的目标位置没有唯一解释，局部写入会在用户看不见时改变它们的相对顺序。

至少编写以下 Host 用例：

| 输入 | 预期 |
| --- | --- |
| 完整项目 active 集合，同组换序 | 成功，重开 domain 后顺序一致 |
| 缺少一枚 active Clip | `invalid-request`，原顺序不变 |
| 混入另一个 Session 私有 Clip | 拒绝，原顺序不变 |
| 未置顶 Clip 出现在置顶 Clip 前 | 拒绝，原顺序不变 |
| session reorder 缺少 owner Session | 拒绝 |
| 只对所选 Clip 批量置顶 | 成功；每条旧索引清除 |

当前 KV API 没有跨记录事务。上述预校验能保证已知业务错误在写入前拒绝，但提交中途的介质 I/O 失败仍可能留下部分索引；报告行为时应称为“预校验后的顺序写入”，不能称为原子重排。

## 任务 4：保留选择顺序并限制拖拽

Client 多选状态使用 `ClipId[]`，新勾选追加到末尾，取消勾选只删除对应 id。不要用 DOM 顺序或 `Set` 重新推导用户选择顺序。

实现一个纯函数接收当前完整展示集合、source id 与 target id。两个 id 缺失时返回稳定错误；两条 Clip 的 `pinnedAt` 存在性不同则返回 `pin-group-mismatch`；成功时返回包含全部 id 的替换顺序。只有 active、无 search、无 tag filter 的集合启用拖拽，回收站也禁用。

UI 多选后只显示一个紧凑命令入口，展开后提供引用到 Composer、Side Chat、新 Session、切换置顶、追加标签和回收站六项命令。标签编辑器只在用户选择标签命令后出现。固定高度卡片的拖拽必须由专用手柄启动，不能让用户选择正文时意外重排。

检查点：Client 纯测试证明同组移动返回完整顺序、跨组拒绝；真实 Browser 中搜索或筛选后没有可用拖拽手柄；拖拽正文不会启动排序。

## 任务 5：按选择顺序插入原生引用

每条 Clip 构造一个 `ReferenceInsert`：

```text
source        → branchmark
label         → 枝签 + 短正文预览
ref           → 版本化 Workspace/owner Session/Clip/includeNote 身份
clipboardText → @branchmark:<ClipId>
```

插入前从 `InputState.occurrences` 检查同一 Clip 是否已存在。当前 API 在 draft 头部插入，所以批量路径必须逆序调用单枚插入，最终 occurrence 顺序才与用户选择一致；结果中的 inserted、duplicates 和 failed 仍按选择顺序返回。此路径只能调用 `insertReference()`，不能调用 `prompt()` 或发送动作。

检查点：依次选择 A、C、B，最终 Chip 顺序仍是 A、C、B；再次附加 C 被归入 duplicate，原位置不变；Composer 中已有用户问题时问题保留，网络和模型均未启动。

## 任务 6：恢复 draft mirror token

DSH 恢复 draft 时可留下 `@branchmark:<ClipId>`，但新的浏览器进程没有对应 occurrence table。订阅当前 Session input state，并实现以下恢复算法：

1. 在一个 snapshot 中记录每个 BranchMark token 的完整文本、Clip id、start 和 end。
2. 并行调用 `session-drawer` 与 `project-library`；一个成功即可解析该 scope，两者都失败才把读取错误交给 UI。
3. 只使用返回的 active Clip 建立 id map，不读取其他 Session private Clip。
4. 从最右侧 token 开始，每次重新读取当前 draft 和 `draftRev`。
5. 只有当前 `draft.slice(start, end)` 仍严格等于原 token 时才调用 `insertReference(reference, { start, end, draftRev })`。
6. 无法解析的 token 保持普通可见文字；CAS 失败记录为 failed，等待后续状态变化再尝试。

从右向左不是优化技巧，而是 offset 正确性的条件。若先替换左侧 token，label 长度与 token 长度不同就会让所有右侧 offset 失效。

至少编写以下 Client 用例：

| draft 状态 | 预期 |
| --- | --- |
| 问题文字 + 两个可见 Clip token | 两枚恢复，问题逐字不变 |
| 一个 session Clip + 一个 project Clip | 两枚都恢复 |
| 一枚 Clip 已回收或删除 | 其他枚恢复；缺失 token 原样保留 |
| session 查询失败、project 查询成功 | 继续恢复项目 Clip |
| 两个查询都失败 | 报错，不修改 draft |
| 恢复中 draftRev 或目标 slice 改变 | 该枚 failed，不覆盖用户编辑 |

## 任务 7：证明提交时才产生模型上下文

`branchmark` Input Trigger source 不需要提供 `@` 候选项，但必须拥有 `ReferenceCodec`。`codec.serialize(ref, signal)` 在提交事务中重新查询当前 session/project 可见集合，校验 Clip 仍 active，再生成完整原文和被选择的备注。Clip 缺失、回收或 ref 格式错误时抛出错误，让 DSH 保留 draft 并阻止整次发送。

检查点：插入和恢复阶段都没有完整 excerpt 出现在 draft；修改 Clip 备注后再提交，模型文本使用当前备注；回收 Clip 后提交失败，Chip 与问题保留。

## 必做验收矩阵

| 行为 | Client 负责 | Host/DSH 负责 |
| --- | --- | --- |
| 显式勾选顺序 | 保存有序 ids，逆序头插 | DSH occurrence 保持最终 draft 顺序 |
| 置顶切换 | 显式命令 | Host 写 `pinnedAt` 并清除失效索引 |
| 拖拽排序 | 只在完整无筛选集合启用，同组预检 | Host 验证完整成员与分组，再持久化索引 |
| draft 恢复 | 查可见 Clip、右到左请求插入 | DSH 用 span + draftRev 执行 occurrence CAS |
| 缺失 Clip | 保留 token、给出可理解状态 | Host 不返回不可见/非 active Clip |
| 用户发送 | 不提前展开正文、不自动发送 | DSH 调 source codec；失败则保留提交内容 |

## 对照源码

- Host DTO 与 schema：[`types.ts`](../../packages/host/src/types.ts)、[`spec.ts`](../../packages/host/src/spec.ts)。
- Host comparator、update 与 reorder：[`packages/host/src/index.ts`](../../packages/host/src/index.ts)。
- Client 完整集合移动：[`clip-order.ts`](../../packages/client/src/domain/clip-order.ts)。
- Client Composer 插入与恢复：[`domain/client.ts`](../../packages/client/src/domain/client.ts)、[`composer-reference.ts`](../../packages/client/src/domain/composer-reference.ts)。
- 命令胶囊、集合与卡片：[`BatchCommandCapsule.tsx`](../../packages/client/src/components/BatchCommandCapsule.tsx)、[`ClipCollection.tsx`](../../packages/client/src/components/ClipCollection.tsx)、[`ClipCard.tsx`](../../packages/client/src/components/ClipCard.tsx)。
- 设计决策：[紧凑批量命令与枝签排序 Agent Note](../../.agents/notes/implemented/feature/2026-08-30-compact-batch-commands-and-clip-ordering.zh.md)。

## 复盘

分别画出两条状态链：`Clip metadata → Host comparator → complete reorder → durable sortIndex`，以及 `ReferenceInsert → clipboard projection → draft mirror → rehydrate → codec.serialize`。在每个箭头旁标出失败时谁必须保持原状态。若某个答案是“Client 已经检查，所以 Host 可以相信”，回到相应任务补上服务端不变量。
