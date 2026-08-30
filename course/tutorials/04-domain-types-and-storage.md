# 第 4 章：领域类型与本地持久化

本章实现 Clip 与普通衍生 Session 的 durable 数据模型。完成后，你应能打开 `clip_explorer` domain、写入合法 Clip、拒绝损坏记录，并说明为什么 Side Chat 不在 schema 中。

## 1. 先复用 DSH 身份

插件直接使用 DSH `WorkspaceId`、`SessionId` 和 `MessageId`。只有 DSH 没有定义的实体才新增 branded id：

```typescript
export type ClipId = Branded<'ClipId'>
export type ClipUsageId = Branded<'ClipUsageId'>
export type SideChatId = Branded<'SideChatId'>
```

`ClipId` 和 `ClipUsageId` 会进入 durable record；`SideChatId` 只在进程和 wire snapshot 中存活。Brand 防止在同为 string 的参数之间误传身份，但 wire/runtime schema 仍要校验非空字符串。

完整 public types 位于 [`packages/host/src/types.ts`](../../packages/host/src/types.ts)。Host package 是 DTO owner，Client 只 type-import，不复制接口。

## 2. 把不变量放进类型

`Clip` 的 `source` 与 `excerpt` 没有更新 API，`UpdateClipRequest` 只允许 note、tags 和 scope。`ClipSource` 的两个分支把能力写进类型：

```typescript
interface SessionMessageClipSource {
  kind: 'session-message'
  sessionId: SessionId
  messageId: MessageId
  eventSeq: number
  turn: number
  role: 'user' | 'assistant'
  range: ClipTextRange
  reopenable: true
  forkable: boolean
}

interface TemporaryAnswerClipSource {
  kind: 'temporary-answer'
  role: 'assistant'
  reopenable: false
  forkable: false
}
```

不要给 temporary answer 填空字符串 Session id。Discriminated union 让调用者必须先判断 `kind` 才能读取锚点，也让 schema 能精确拒绝无意义字段组合。

## 3. Range 使用 UTF-16 code unit

DOM Range、JavaScript `String.length` 和 `slice` 使用 UTF-16 code-unit offset，因此 `ClipTextRange.start/end` 明确采用同一单位。`end` exclusive，且必须大于 `start`。

这不等于 Unicode code point 或用户看到的 grapheme 数。只要 Client 和 Host 都用同一个 canonical string 与 JS slice，emoji/组合字符不会因两端单位不同而错位；UI 不应把 offset 显示给用户。

## 4. 关系与使用快照

`DerivedSessionRelation` 保存：

- child `derivedSessionId`、Workspace 和 mode。
- full-fork 时的 primary Clip/source Session/message/event/turn。
- 全部 `attachedClipIds` 的顺序。
- 创建时间。

`ClipUsage` 保存每个附件当时的 `excerptSnapshot` 与可选 `noteSnapshot`。删除 Clip 后关系仍可回答“这个 child 当时用了什么”，不需要重新解析已经存在的 Session recall 文本。

同一个 child 的 relation 与 usages 被包装成一个 `DerivedSessionRecord`，在一次 KV `put` 中提交。这样不会出现 relation 已写入而 usage 缺失的中间状态。

## 5. 定义 domain schema

[`packages/host/src/spec.ts`](../../packages/host/src/spec.ts) 使用 `defineDomain`：

```typescript
export const branchMarkDomainSpec = defineDomain({
  name: 'clip_explorer',
  version: 1,
  tables: {
    clips: domainTable<ClipId, Clip>(clipSchema),
    derived_sessions: domainTable<SessionId, DerivedSessionRecord>(derivedSessionRecordSchema),
  },
})
```

Zod schema 不只检查字段类型，还固定跨字段规则：

- tags 不得重复。
- `status=trashed` 与 `trashedAt` 必须同时出现。
- full-fork relation 必须拥有全部 source 字段；clips-only 必须全部没有。
- attachment ids 不得重复。
- usages 的 child ids 和 Clip 顺序必须与 relation 一致。

这些检查会在 domain open 时验证已有介质，在写入时验证新值。损坏数据失败是正确行为，不能把不合法字段静默删掉后启动。

## 6. 打开与关闭 domain

Host `Service.init` 执行：

```typescript
const domain = await this.ctx.storageDomain.open(branchMarkDomainSpec)
this.ctx.effect(() => async () => { await domain.close() })
this.clips = domain.table('clips')
this.derivedSessions = domain.table('derived_sessions')
```

`Domain.close()` 会先拒绝新写入，排空已经排队的写入，再释放 backend unit。Disposer 必须跟随 BranchMark Service，而不是只依赖 storage facility 在进程退出时兜底。

官方 storage 语义见 [`docs/subsystems/storage.md`](../../../docs/subsystems/storage.md)：reads 来自 authoritative in-memory state；write 先 durable、再更新内存、再发 change event；失败写入不会污染读取状态。

## 7. KV 记录应当替换而不是原地修改

`KvTable.get/entries` 返回 stored object，不是副本。业务代码把记录构造为 frozen object，并使用 `put`/`update` 替换：

```typescript
const updated = await clips.update(id, clip => Object.freeze({
  ...clip,
  note: nextNote,
  updatedAt: new Date().toISOString(),
}))
```

不要执行 `clip.tags.push(...)` 或 `clip.note = ...`。即使 TypeScript 通过 cast 允许，这也会绕过 backend durability 与 `domain/changed` 顺序。

## 8. 为什么 Side Chat 不建表

Side Chat 的产品承诺是关闭标签立即销毁，Host 重启不恢复。如果为它建立 durable table，用户关闭 UI 后还要定义清理事务、崩溃恢复和过期策略，反而改变产品语义。

因此 `SideChatEntry` 是 [`side-chat.ts`](../../packages/host/src/side-chat.ts) 的 private interface，唯一容器是 `Map<SideChatId, SideChatEntry>`。Browser 只能拿 `SideChatSnapshot`，不能把 private runtime object 写回 Host。

## 9. 数据隔离不是查询参数约定

Clip 表同时包含多个 Workspace 和两种 scope。调用者传 `visibility` 不代表它有权限看所有记录；Host `list` 必须组合验证：

```text
workspace match
AND status match
AND (
  project visibility → scope === project
  OR session visibility → scope === session AND ownerSessionId match
)
AND optional filters
```

项目视图不读取其他 Session 的 private Clip，再在前端隐藏；那些记录根本不应进入 Remote 返回值。第 5 章会把此规则和来源校验一起实现。

## 10. Schema 版本策略

当前 domain version 是 1，插件没有 migration。修改 record layout 时必须决定：

- 向后兼容且 schema 仍接受旧记录：可保持 version，但必须保证缺省语义明确。
- 旧介质不能正确解释：提升 version，并设计显式迁移/导出导入；当前 backend 会对不匹配 fail loud。

不要为了启动成功而在 catch 中清空整个 domain。Clip 是用户数据，版本错误应停止并给出可恢复路径。

## 11. 本章检查点

运行 Host tests：

```sh
pnpm --filter dsh-branchmark-host test
```

重点观察：合法 Clip 的 tags 被规范化；伪造 excerpt 不写入；session/project visibility 隔离；删除 Clip 后 relation/usage 仍存在。

## 12. 检索练习

1. 为什么 `temporary-answer` 仍有 `ownerSessionId`，却没有 source Session id？
2. 为什么 relation 与 usage 要在一个 KV value 中提交？
3. 为什么 Clip 的 `scope` 可变，而 `ownerSessionId` 不可变？
4. 一个表扫描变慢时，应该修改 storage domain schema，还是绕过 `ctx.storageDomain` 直读 JSON 文件？

前三题分别对应保存目标、原子快照、来源身份。第四题应选择插件自有索引/schema 演进，不能绕过 storage abstraction。

下一章将把这些 DTO 和表封装进 Host Service，并让 Browser 通过严格 Remote 调用它们。
