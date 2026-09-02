# 第 13 章：跟随 DSH 预发布版本升级

本章把 alpha.2 到 alpha.5 的真实升级变成可重复的方法，并继续把 2026-09-02 的 DSH master 作为独立审计目标。当前 BranchMark 源码已经对齐 DSH release tag `0.1.2-alpha.5`；完成本章后，你应能区分迁移起点、release tag 与移动分支，解释四项 breaking change 的设计收益，把改动收敛到正确模块，并为代码、用户数据和发布版本分别建立证据。

这是一章升级课，不是当前 API 目录。第 1–12 章以 alpha.5 当前实现为准；本章保留 alpha.2 旧代码片段用于说明迁移，并把 `SessionHandle` 代码限定为未发布 master 的设计练习。

## 1. 学习目标

完成本章后，你应能：

- 用 package version、release tag commit、目标 commit 三个值描述宿主，而不是只说“最新 DSH”。
- 区分 API 破坏、磁盘格式破坏、派生缓存修复和纯性能重构。
- 把 `seedLength` 迁移为 `isSeeded + inheritedEventCount`，并正确使用 `SessionSeq` 与 `SessionLogOffset`。
- 按读取意图迁移 `Session.events`，避免用完整快照代替所有旧访问。
- 从 Composer Slot 的标准 `useInput` selector 读取状态，不依赖已删除的可变 owner prop。
- 在 master 上用只读 `SessionHandle` 获取日志，并在所有退出路径关闭它。
- 更新测试 fake、验证矩阵与发布版本，不把“临时兼容实验通过”写成“当前源码已经兼容”。

先完成第 3、5、6、7、10、11 章，并能运行当前 alpha.5 的 `pnpm run check`。

## 2. 第一步不是改依赖，而是冻结三个锚点

本次案例使用：

| 身份 | 值 | 作用 |
| --- | --- | --- |
| BranchMark 迁移起点 | `0.1.2-alpha.2`，commit `edd9d12b34aab1d827b10b8b6c6efbfae1ac07e3` | 说明升级前的真实实现 |
| DSH 迁移起点 | `0.1.2-alpha.2`，commit [`0a53fb55bea101816fa226bb964ae2bed71c343b`](https://github.com/deepseek-ai/deepseek-harness/tree/0a53fb55bea101816fa226bb964ae2bed71c343b) | 旧 API 与旧行为的对照组 |
| DSH 已发布目标 | tag [`dsh-v0.1.2-alpha.5`](https://github.com/deepseek-ai/deepseek-harness/tree/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5)，commit `db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5` | npm alpha 包的源码事实 |
| BranchMark 当前发布目标 | tag `v0.1.2-alpha.5`，分支 `release/dsh-0.1.2-alpha` | 当前源码与课程基线 |
| DSH master 审计目标 | commit [`49a606bc5b5934603f22a26957a07dc799ab0291`](https://github.com/deepseek-ai/deepseek-harness/tree/49a606bc5b5934603f22a26957a07dc799ab0291) | tag 后尚未形成新 release 的上游事实 |

审计日的 npm alpha tag 与 master package 都写着 `0.1.2-alpha.5`，但 master 已比 release tag 多出 handle-based persistence seam。由此得到第一条升级规则：

```text
package version 说明发布身份
Git commit 说明实际源码
release tag 说明 npm 包可复现的源码
三者不能互相代替
```

如果只记录 `0.1.2-alpha.5`，之后无法回答构建中是否存在 `sessionPersistence.inspect()`，也无法为一次安装失败找到唯一源码。

## 3. 先建立兼容矩阵

不要从第一条 TypeScript 错误开始逐个打补丁。先把插件依赖的宿主事实分组：

| 能力组 | alpha.2 | alpha.5 tag | master 快照 | BranchMark owner |
| --- | --- | --- | --- | --- |
| Session 创建与 fork | `ISessions.create/fork` | 保留 | 保留 | Client `BranchMarkClient.launch` |
| lineage 粗粒度字段 | `parentSession + seedLength` | `parentSession + isSeeded` | 同 alpha.5 | Host child 验证 |
| lineage 精确 cut | header `seedLength` | inspection `inheritedEventCount` | handle `inheritedEventCount` | Host child 验证 |
| 持久化只读 observation | `inspect()` | `inspect()` | `open('read') + read() + close()` | Host 集成层 |
| live Session log 读取 | `events` | `seq/eventAt/snapshotEvents` | 同 alpha.5 | 测试 helper 与少量 consumer |
| Composer input 状态 | `InputZone.input` owner prop | `useInput` standard prop | 同 alpha.5 | `BranchMarkDrawerButton` |
| 第一方 Session medium | JSONL + 可选 SQLite provider | JSONL only | JSONL only | 部署与数据升级 |
| Clip medium | `clip_explorer` storage domain v1 | 插件未迁移前不变 | 插件未迁移前不变 | BranchMark storage owner |

这张表先回答“概念是否还存在”，再回答“由谁提供、从哪里读取”。full-fork、项目枝签和 Side Chat 都仍可纯插件实现；需要迁移的是 DSH extension point 的具体表示，不是把功能降级为复制文本。

## 4. 变化一：事件身份与日志 offset 分开

### 4.1 alpha.2 为什么容易混用

alpha.2 中，以下值都表现为普通 `number`：

- Clip 指向一条真实事件的 `eventSeq`。
- Session 当前事件数。
- 读取日志的起始 offset。
- full-fork 的 inherited prefix length。

但“第 10 条事件”和“长度为 10 的前缀”不是同一个位置。前者要求 seq 10 已存在，后者指向事件 9 后面的间隙，并且可以等于整个日志长度。

### 4.2 alpha.5 的领域类型

DSH 新增两个编译期 brand：

```typescript
type SessionSeq = BrandedNumber<'SessionSeq'>
type SessionLogOffset = BrandedNumber<'SessionLogOffset'>
```

- `SessionSeq`：一条已存在事件的 identity。
- `SessionLogOffset`：日志间隙、读取 offset、事件数或 prefix length。

Wire JSON 与 v0 JSONL 仍存普通 number。验证发生在值进入同进程领域代码时，因此 BranchMark 的 Remote DTO 可以继续接收 number，但 Host 应在可信边界转换：

```typescript
let sourceSeq: SessionSeq
try {
  sourceSeq = SessionSeq(input.eventSeq)
} catch {
  return rejected({
    code: 'invalid-request',
    message: 'eventSeq must identify a non-negative Session event',
  })
}
```

算术会丢失 brand。`sourceSeq + 1` 若要重新成为 offset，必须经过 `SessionLogOffset(sourceSeq + 1)`，不能用 type assertion 跳过验证。

### 4.3 `seedLength` 为什么离开 logical header

alpha.2 的 child 验证是：

```typescript
inspection.meta.parentSession === source.sessionId
  && inspection.meta.seedLength === expectedSeedLength
```

alpha.5 把两类问题分开：

```typescript
inspection.meta.parentSession === source.sessionId
  && inspection.meta.isSeeded
  && inspection.inheritedEventCount === expectedInheritedEventCount
```

`SessionHeader.isSeeded` 只回答“是否有 fork-inherited prefix”，便于 Session list 等只读 metadata 的消费者快速判断 lineage；精确 cut 只有同时持有日志正文的 reader 才能解释，所以放在 `SessionInspection` 旁边。

迁移后的 clips-only 验证也必须同时证明三件事：

```typescript
inspection.meta.parentSession === undefined
  && inspection.meta.isSeeded === false
  && inspection.inheritedEventCount === 0
```

只检查 `parentSession` 不够；只检查 `isSeeded` 也不能证明精确 cut。

### 4.4 DSH 这样改的收益

官方 [seq/offset 决策](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/.agents/notes/implemented/architecture/2026-08-31-session-sequence-and-log-offset-brands.zh.md)给出三个直接收益：

1. 编译器能拒绝把日志长度传给要求现存事件的 API。
2. Session 列表只读 header 就能知道是否有 lineage，不被迫加载正文 cut。
3. v0 JSONL 的物理 header 保持兼容，外部 wire 的数值表示也不变。

`session/end-seed` 没有替代 `inheritedEventCount`。它记录 constructor lifecycle，unseeded replay 也可能出现，不能靠扫描 marker 推断 fork cut。

## 5. 变化二：Session 日志读取显式表达成本

旧代码常写：

```typescript
session.events.length
session.events[index]
session.events.filter(predicate)
```

`events` 看起来像廉价属性，但在 append 后第一次读取可能复制完整日志。流式期间每个新事件都会使缓存失效，只想读长度的 consumer 也可能反复承担 O(n) 复制。

alpha.5/master 按意图拆成：

| 意图 | 新 API | 成本 |
| --- | --- | --- |
| 当前事件数/下一 offset | `session.seq` | O(1) |
| 读取一条已知事件 | `session.eventAt(seq)` | O(1) |
| 需要稳定数组或数组算法 | `session.snapshotEvents(from?, to?)` | O(所选事件数) |

迁移时逐个判断：

```typescript
// 只比较长度
const count = session.seq

// 只读一条
const event = session.eventAt(SessionSeq(index))

// 确实需要 find/filter/map
const events = session.snapshotEvents()
```

不要机械地把每个 `session.events` 换成 `session.snapshotEvents()`。那虽然容易通过类型检查，却保留了隐藏的性能问题。DSH 的[日志读取决策](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/.agents/notes/implemented/architecture/2026-08-21-session-log-read-intent.zh.md)要求调用点明确选择标量、索引或物化数组。

BranchMark production 大多读取 `SessionInspection.events`，所以这项变更主要落在 [`packages/host/tests/helpers.ts`](../../packages/host/tests/helpers.ts) 和构造 child 的测试。测试仍应保留真实 event sequence，不要因为 API 改名就退化成已经计算好的 message mock。

## 6. 变化三：Composer Slot 改用 selector

alpha.2 的 [`BranchMarkDrawerButton`](../../packages/client/src/components/EntryButtons.tsx) 从 `conversation.input.left` owner props 取得 `input`：

```typescript
export function BranchMarkDrawerButton({ input, inputActions, ...rest }: ComposerTriggerProps) {
  const references = input.occurrences.filter(
    occurrence => occurrence.source === BRANCHMARK_REFERENCE_SOURCE,
  )
  // ...
}
```

alpha.5/master 的 `conversation.input.left` 不再声明 `owner: InputZone`，但每个 session-scoped Slot 都通过 standard props 得到 `useInput` 和 `inputActions`。迁移为：

```typescript
export function BranchMarkDrawerButton({ useInput, inputActions, ...rest }: ComposerTriggerProps) {
  const occurrences = useInput(state => state.occurrences)
  const references = occurrences.filter(
    occurrence => occurrence.source === BRANCHMARK_REFERENCE_SOURCE,
  )
  // ...
}
```

实际实现可让 selector 只返回计数或所需 ids，避免每次生成无意义的新数组。Hook 必须在组件顶层无条件调用；不要在 Popover 打开后才订阅。

DSH 的 [`5f1eca5`](https://github.com/deepseek-ai/deepseek-harness/commit/5f1eca58eaaaf5bf604b64a27cbd25a8d38e5095) 变更让 `InputBar` 自己渲染 left/right/footer slots，并把组件包进 `memo`。这样 `ConversationRoot` 不再把新建的 ReactNode 和 point-in-time input snapshot 当成 owner props向下传；Slot entry 通过 selector 精确订阅，宿主 shell 的无关 render 不会破坏 InputBar 的 memo 边界。

这不是“Slot 被删除”。Slot 名仍然存在，改变的是状态所有者和订阅方式，因此 BranchMark 继续使用纯插件接入，不需要修改 DSH UI 源码。

## 7. 变化四：master 的 `SessionHandle` persistence seam

### 7.1 为什么 alpha.5 与 master 必须分两条轨道

alpha.5 tag 仍公开：

```typescript
sessionPersistence.inspect(id): Promise<SessionInspection>
```

本章固定的 master 已删除该方法，改为：

```typescript
sessionPersistence.open(id, 'read' | 'write'): Promise<SessionHandle>
```

因此“升级到 `0.1.2-alpha.5`”不能唯一决定代码。对 release tag 构建时保留 `inspect()`；对 master commit 构建时必须使用 handle。不要写运行时 `if ('inspect' in persistence)` 同时兼容两套预发布 seam；BranchMark 的版本策略是一个 artifact 精确对应一个 DSH 目标。

### 7.2 在插件内建立一个深的读取模块

当前 production 有四处 `inspect()`：[`index.ts`](../../packages/host/src/index.ts) 中 child、source 与 Clip 来源三处，[`side-chat.ts`](../../packages/host/src/side-chat.ts) 中来源上下文一处。不要在四个业务流程里重复 handle 生命周期。master 迁移应新增一个 Host 私有模块，例如 `packages/host/src/session-read.ts`：

```typescript
import type { SessionEvent, SessionHeader, SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'

export interface PersistedSessionRead {
  readonly header: SessionHeader
  readonly inheritedEventCount: SessionLogOffset
  readonly events: readonly SessionEvent[]
}

export async function readPersistedSession(
  persistence: SessionPersistence,
  id: SessionId,
): Promise<PersistedSessionRead> {
  const handle = await persistence.open(id, 'read')
  try {
    return {
      header: handle.header,
      inheritedEventCount: handle.inheritedEventCount,
      events: await handle.read(),
    }
  } finally {
    await handle.close()
  }
}
```

业务代码只消费 `PersistedSessionRead`，因此来源校验、full-fork cut、Side Chat prefix 与消息重建不知道资源如何打开。以后 persistence 再改变分页策略时，修改点仍集中在读取模块。

这个 helper 不缓存 Session，不获取 write ownership，也不执行修复。只读 handle 可以与活跃写 handle 并存；它返回合法连续前缀，并在当前调用结束后释放资源。

### 7.3 为什么 DSH 改成 handle

旧 seam 同时承担持久化、Session 构造、prepared LRU、独占 reservation、revision 重试和崩溃修复。持续外部写入可能让只读 observation 的 revision 收敛循环活锁，而全局协调器也无法诚实表达“哪一个调用者拥有这个 Session 的唯一写资格”。

官方 [handle-based persistence 决策](https://github.com/deepseek-ai/deepseek-harness/blob/49a606bc5b5934603f22a26957a07dc799ab0291/.agents/notes/implemented/architecture/2026-08-27-handle-based-session-persistence.zh.md)把责任改为：

- `open(id, 'read')` 只观察，不取得所有权。
- `open(id, 'write')` 取得单写者所有权，冲突时明确失败。
- `append()`、`flush()` 和 `close()` 都经过同一持有通道。
- 语义修复回到恢复流程，persistence 只负责合法连续日志。
- 未来跨进程 lease 可以落在同一逐 Session 通道，而不是再增加全局旁路。

对 BranchMark 的直接收益是来源校验不会借用一个可复用 prepared Session；代价是调用方必须拥有清晰的 `close()` 责任。

## 8. 测试 fake 必须一起迁移

master 迁移不能只让 production typecheck。[`packages/host/tests/helpers.ts`](../../packages/host/tests/helpers.ts) 中的 `TestPersistence` 也要从旧方法集合迁移为：

```text
SessionPersistence
├── create(header, options) → write handle
├── open(id, 'read' | 'write') → handle
├── stat(id) → snapshot | undefined
├── list() → snapshots
└── flush()

TestSessionHandle
├── id / header / inheritedEventCount / access
├── read(offset?, length?)
├── append(events)          # 仅 write
├── flush()                 # 仅 write
└── close()                 # 幂等
```

测试至少新增以下行为：

1. 来源存在时 read handle 返回完整连续事件并被关闭。
2. 来源不存在时 `open()` 失败，BranchMark 映射为 `session-not-found`。
3. Clip 校验失败、child header 不匹配、Side Chat 创建失败时 handle 仍关闭。
4. read handle 拒绝 `append/flush`，测试 helper 不偷偷放宽生产约定。
5. 同一个 Session 只允许一个 write handle；close 后可以重新取得写所有权。
6. alpha.5/master 的 seeded fixture 同时提供 `isSeeded=true` 与正确 `inheritedEventCount`。

不要把 handle fake 写成一组不记录生命周期的空方法。那只能让类型检查通过，无法证明插件是否泄漏资源或绕过单写者规则。

## 9. JSONL-only 变化与用户数据

DSH 删除的是第一方 `dsh-session-persistence-sqlite`，不是所有 SQLite 能力：

- `dsh-session-query-sqlite` 仍可作为可重建的全文检索 projection。
- `dsh-storage-sqlite` 仍可作为通用 domain KV provider。
- 权威 Session log 的第一方 provider 只保留 JSONL。

对默认 JSONL 用户，alpha.2 的 v0 Session header 可以被新版读取。旧物理 `seedLength` 字段被解码为 logical `isSeeded` 与精确 cut，所以数据格式兼容不意味着 TypeScript API 兼容。

若部署曾显式使用被删除的 SQLite Session persistence，当前新版不会打开或迁移那个数据库。必须先用仍包含旧 provider 的 DSH 导出逻辑 Session，再升级。不要先启动新版再尝试从应用内恢复。

BranchMark 的 Clip 与 relation 位于自己的 `clip_explorer` storage domain，不在 Session persistence 中。DSH 的 `session_projcache` 也是可丢弃派生缓存，与 Clip 数据不同。升级演练应分别备份并验证：

```text
权威 Session logs
BranchMark clip_explorer user data
DSH session_projcache derived cache
```

当前 master 对 projection cache 增加旧版本只读兼容和 `backup-and-skip`，这是让缓存升级更稳健的正向修复，不是允许 BranchMark 对损坏的用户 Clip 静默跳过。

## 10. 文件级迁移顺序

对 alpha.5 release tag，推荐按以下顺序：

1. 一次性更新所有 `@deepseek-ai/dsh-*` catalog 依赖。
2. 在 Host wire 入口验证 `SessionSeq`，让内部 helper 使用 branded seq/offset。
3. 把 child header 验证迁移为 `isSeeded + inheritedEventCount`。
4. 按意图迁移测试中的 `Session.events`。
5. 把 `BranchMarkDrawerButton` 改为 `useInput` selector。
6. 更新 fixture、类型断言、课程版本锚点与 release notes。

对本章 master 快照，在上述步骤后继续：

7. 新增 `session-read.ts`，封装 read handle 生命周期。
8. 将 [`packages/host/src/index.ts`](../../packages/host/src/index.ts) 三个 observation 和 [`packages/host/src/side-chat.ts`](../../packages/host/src/side-chat.ts) 一个 observation 改用该 helper。
9. 重写 `TestPersistence`/handle fake，并补 close 与 ownership 测试。
10. 在 DSH master 构建产物或精确 workspace source 上完成集成 typecheck/build。

每一步保持单目标实现。不要保留 alpha.2、alpha.5、master 三套 runtime branch；预发布阶段的兼容 shim 会让 `SessionInspection.meta`、`SessionHandle.header` 与两种 lineage 表示同时渗入全部业务层。

## 11. 验证分四层

### 11.1 静态与行为门

迁移后的 BranchMark 工作区至少运行：

```sh
node --version
pnpm install
pnpm run check
```

本课程使用 Node 24 作为升级验证环境。`pnpm run check` 应覆盖三个 TypeScript face、40 个 Vitest case、Host/Client/Bundle build 与自包含 bundle verifier。alpha.5 临时迁移已通过这条总门。

master 直接使用上游 workspace source 时，还要先构建 DSH library artifacts，再运行 BranchMark 三个 face 和 bundle；本次临时集成实验已通过 DSH `build:lib`、Host 11 + Client 28 + Bundle 1 个测试、三个 typecheck、三个 build 与 bundle verifier。

这些是可行性证据，不是当前仓库状态。真正合并迁移时必须在目标分支重新运行，不能引用本章记录代替 CI。

### 11.2 Tarball 自包含

检查：

- runtime output 不引用私有 `dsh-branchmark-host` workspace。
- Typert contribution 的 package identity 仍是 `dsh-branchmark`。
- `client.js` 仍是 DSH ModuleLoader factory。
- 所有 `exports` target 都存在。
- tarball peer dependency 精确指向选择的 DSH 发布目标。

### 11.3 独立 profile

使用新的临时 `DSH_HOME` 安装 tarball，验证 `--dump-config` 只有一个 BranchMark Loader row。至少完成：保存 Clip、刷新、从父会话中间 turn full-fork、clips-only、Composer 引用、Side Chat 关闭销毁。

full-fork 验收不能只看 UI 树。必须同时读取：

```text
parentSession
isSeeded
inheritedEventCount
session/end-seed
child recall
```

并证明来源第 N 轮后的第 N+1 轮没有进入 inherited prefix。

### 11.4 数据升级演练

不要在用户唯一的 DSH home 上首次验证。使用数据副本分别检查：

1. alpha.2 JSONL Session 可列出、打开、继续对话和 fork。
2. 现有 `clip_explorer` Clip、notes、tags、scope、顺序与 relation 数量不变。
3. 旧 projection cache 不会阻止启动；缺失缓存只造成重建，不造成 Clip 丢失。
4. 若存在旧 SQLite Session store，升级前导出流程已在旧 build 中实际执行。

## 12. 发布版本策略

DSH tag 对应的 BranchMark 包可以继续采用对齐版本，例如 DSH `dsh-v0.1.2-alpha.5` 对应 BranchMark `0.1.2-alpha.5`，前提是该包只承诺已发布 tag 的 API。

对尚未发布的 master，不要覆盖同名 alpha 包，也不要把 master-compatible tarball 标成“正式匹配 alpha.5”。可使用独立 prerelease 与 dist-tag，例如：

```text
0.1.2-alpha.5.master.49a606b.1
dist-tag: edge
```

这个版本表示“基于 alpha.5 版本线、额外匹配指定 master commit 的测试包”，不表示 DSH 已发布 alpha.6。DSH 出现新 release tag 后，重新审计并发布与该 tag 对齐的 BranchMark 版本；不要简单给 edge tarball 改标签。

GitHub main 可以保留最新源代码，但 README 安装表必须区分：

| BranchMark 包 | DSH 目标 | 稳定程度 |
| --- | --- | --- |
| `0.1.2-alpha.2` | DSH `0.1.2-alpha.2` | 迁移起点，保留为历史 tag |
| `0.1.2-alpha.5` | DSH tag `dsh-v0.1.2-alpha.5` | 当前 alpha 发布线 |
| `0.1.2-alpha.5.master.49a606b.*` | 精确 master commit | 临时 edge，不冒充 release tag |

## 13. 为什么这些上游改动值得学习

| DSH 改动 | 表面成本 | 长期收益 |
| --- | --- | --- |
| `SessionSeq` / `SessionLogOffset` | parser 和算术后多一次显式转换 | 事件 identity 与日志间隙不再靠开发者记忆区分 |
| `isSeeded` / `inheritedEventCount` | 一个 lineage 事实分布在 metadata 与 body observation 两处 | header-only 列表更轻，精确 cut 只交给能解释正文的 reader |
| `seq/eventAt/snapshotEvents` | 普通数组语法变得不那么方便 | O(n) 物化成本在调用点可见，标量读取不再偷偷复制日志 |
| Composer `useInput` selector | Slot component 要使用 Hook | 状态订阅更细，InputBar owner props 稳定，memo 真正有效 |
| `SessionHandle` | 每个 open 都必须 close，fake 更复杂 | 单写者所有权、资源 lifetime、durability barrier 与未来跨进程 lease 有统一入口 |
| JSONL-only first-party persistence | 使用旧 SQLite Session store 的部署需先导出 | DSH 只维护一条权威格式、恢复路径和平台测试矩阵 |
| projection cache read compatibility | cache schema 要声明兼容与安全归一化 | 旧缓存不拖垮启动，seeded identity 不匹配仍 fail-safe 重建 |

优秀的插件适配不是把这些改动包回旧 API，而是让插件自己的模块边界与新责任对齐：wire adapter 负责 brand，Session read module 负责 handle，domain validator 负责 lineage，React Slot entry 负责 selector。

## 14. 本章检查点

在提交升级代码前，你应能给出以下证据：

```text
[ ] package version、release tag commit、实际构建 commit 三者已记录
[ ] alpha.5 与 master 使用两份兼容矩阵，不按版本字符串合并
[ ] SessionSeq 与 SessionLogOffset 没有用 type assertion 互相冒充
[ ] full-fork 同时验证 parent、seeded bit 与精确 inherited cut
[ ] clips-only 同时验证 no parent、unseeded 与 zero cut
[ ] live Session 日志读取按 seq/eventAt/snapshotEvents 意图迁移
[ ] Composer 按钮从 useInput selector 读取 occurrence
[ ] master 的每个 persistence open 在 finally 中 close
[ ] TestPersistence 真实建模 read/write handle 与 ownership
[ ] 40 个自动化测试、typecheck、build、bundle verifier 通过
[ ] 独立 profile 与真实 Browser smoke 通过
[ ] JSONL、旧 SQLite Session、clip_explorer、projection cache 分别处置
[ ] master 测试包使用独立 prerelease/dist-tag，不覆盖 release-tag 兼容包
```

## 15. 检索练习

1. 为什么 `SessionHeader.isSeeded=true` 不能替代 `inheritedEventCount`？
2. 为什么 `session.seq` 的类型是 `SessionLogOffset`，不是 `SessionSeq`？
3. 把所有 `session.events` 改成 `snapshotEvents()` 为什么可能通过测试却没有解决问题？
4. `conversation.input.left` 仍存在，为什么 BranchMark 仍会编译失败？
5. 为什么 `SessionHandle` 应由一个私有集成模块封装，而不是由 Clip、Side Chat 和 relation 各自打开？
6. npm tag 与 master 都显示 `0.1.2-alpha.5` 时，哪一个值决定实际兼容性？
7. 为什么 DSH projection cache 可以 `backup-and-skip`，BranchMark Clip domain 却不能直接照搬？

如果这些问题只能靠记忆答案，回到对应官方 Agent Note 和固定 commit 的源码重新核对。预发布升级的核心能力不是熟记本次改名，而是把产品不变量、数据身份、资源生命周期和发布证据分别交给正确所有者。
