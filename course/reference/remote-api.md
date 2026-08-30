# BranchMark Typed Remote API

本页记录当前 `branchmark` namespace 的 14 个 unary 方法。声明源是 [`BranchMarkService`](../../packages/host/src/index.ts)，生成的 Client 签名见 [`lib/typert.remote-client.d.ts`](../../packages/host/lib/typert.remote-client.d.ts)。生成文件不可手改。

## 调用结果的两层 envelope

Typert transport 先返回 `RemoteResult<T>`，业务方法本身再返回 `ClipSuccess<V> | ClipRejected`。Browser wrapper 必须分别处理两层：

```typescript
const transport = await ctx.remote.branchmark.create(request)
if (!transport.ok) throw new Error(transport.error.message) // carrier/Gateway
if (!transport.value.ok) throw new Error(transport.value.error.code) // Clip business rule
return transport.value.value
```

外层失败表示连接、取消、codec、namespace 卸载或 Gateway 分发失败；内层失败表示 Workspace、Clip、来源、衍生 Session 或 Side Chat 的稳定业务拒绝。不要把两者折成一个不可区分的字符串后再做业务分支。

## Clip 与集合

| Remote | 请求 | 成功值 | 写入 |
| --- | --- | --- | --- |
| `create` | `CreateClipRequest` | `Clip` | `clips.put` |
| `list` | `ListClipsRequest` | `{ clips, tags }` | 无 |
| `update` | `UpdateClipRequest` | 更新后的 `Clip` | `clips.update` |
| `setStatus` | `SetClipStatusRequest` | 更新后的 `Clip` | `clips.update` |
| `deleteForever` | `DeleteClipRequest` | `{ deleted: true }` | `clips.delete` |
| `batchUpdate` | `BatchUpdateClipsRequest` | `{ clips }` | 预校验后按请求顺序更新 |

`create` 的 `source` 和 `excerpt` 是观测值，Host 会重新读取 Session。`update` 只能修改 scope、note 和 tags；类型中没有 excerpt/source 字段。`list` 的 `visibility` 决定 Host 侧隔离规则，Browser 的二次过滤只是展示防御。

## 普通衍生 Session

| Remote | 请求 | 成功值 | 写入 |
| --- | --- | --- | --- |
| `recordDerivedSession` | child、Workspace、mode、primary、attachments | `{ relation, usages }` | 一个 `derived_sessions.put`，随后 child Session append recall |
| `listRelations` | Workspace 加 `clipId` 或 `derivedSessionId` | `{ relations, usages }` | 无 |

`recordDerivedSession` 不创建 Session。Browser 必须先调用 DSH `fork` 或 `create`；Host 再检查 child header 与请求 mode 是否一致。关系记录不可覆盖，重复 child id 返回 `derived-session-already-recorded`。

## 临时 Side Chat

| Remote | 请求 | 成功值 | 生命周期效果 |
| --- | --- | --- | --- |
| `createSideChat` | Workspace、owner、Clip selections、primary | 初始 `SideChatSnapshot` | 创建 Host Map entry，加载来源与模型目录 |
| `getSideChat` | `{ id }` | 最新 snapshot | 无，供 Browser 轮询 |
| `sendSideChat` | `{ id, text }` | 立即返回 running snapshot | 异步开始摘要/回答/工具循环 |
| `selectSideChatModel` | `{ id, selection }` | 更新后的 snapshot | 只更新临时 route |
| `cancelSideChat` | `{ id }` | 当前 snapshot | abort 当前回答，保留 tab |
| `closeSideChat` | `{ id }` | `{ destroyed: true }` | abort 并立即从 Map 删除 |

Side Chat snapshot 是缩窄 wire projection，不包含隐藏来源上下文、provider replay state 或任意扩展 block。它只传 `MessageId`、角色、文本、reasoning、受限工具活动和模型目录。

## 业务失败码

| code | 含义 | 常见修复 |
| --- | --- | --- |
| `workspace-not-found` | Workspace 不存在 | 刷新当前 Workspace，停止使用旧 id |
| `session-not-found` | Session 无法 inspect | 重新打开来源或选择新来源 |
| `session-outside-workspace` | owner Session 不属于 Workspace | 使用 `workspaceForSession` 的结果，不接受任意组合 |
| `source-not-found` | event seq 不是可摘录消息 | 重新选择已完成 Chat node |
| `source-mismatch` | message id、role 或 turn 不一致 | 丢弃旧 candidate，重新映射 UI |
| `excerpt-mismatch` | canonical slice 不等于 excerpt | 检查 Markdown projection 与 UTF-16 range |
| `invalid-request` | 文本、标签、集合或 mode 违反规则 | 展示 message，不要自动改写语义后重试 |
| `clip-not-found` | Clip 不存在或不在 Workspace | 刷新集合 |
| `derived-session-already-recorded` | child 已有不可变关系 | 读取现有关系，不覆盖 |
| `derived-session-mismatch` | DSH child header 不符合 full-fork/clips-only | 不伪称成功；删除空 child 或让用户处理 |
| `derived-session-unavailable` | child 未挂载到 Host Session Store | 等待/诊断创建绑定，不能只写关系表 |
| `side-chat-not-found` | tab 已关闭或 Host 重启 | Browser 移除 tab |
| `side-chat-busy` | 同一个 tab 已有回答运行 | 等待或先 cancel |
| `side-chat-model-unavailable` | route/effort 不能解析 | 回退到用户显式选择的可用模型 |
| `side-chat-context-unavailable` | 来源没有完整前缀或 request header | 重新选择 completed source Clip |

## 修改 Remote 时的构建规则

新增、删除或修改 decorator、export name、参数、返回类型或 cancellation 签名后，先构建 Host 生成契约，再编译 Client。当前工作区的 `pnpm run typecheck` 已把这个顺序编码为 `build:host → recursive typecheck`。

Remote 方法必须是 public、non-static、non-generic 的实例方法；参数必须是必填的简单命名参数，不能使用 destructuring、默认值、rest 或 optional parameter。复杂 Host 对象不能直接穿过 wire；本插件的 public DTO 全部是 JSON-safe 值，因此不需要 Typert lookup provider。

当前 Bundle 校验要求 contribution 中存在 14 个 invocation。修改 roster 时同步更新 [`scripts/verify-bundle.mjs`](../../scripts/verify-bundle.mjs) 与 Host roster test，避免生成文件与装载产物漂移。
