# 第 5 章：Host Service、Remote 与来源校验

本章把第 4 章的数据模型变成可从 Browser 调用的 Host 能力。完成后，你应能解释一次 `create` 为什么要经过两层结果封装、Host 如何证明选区来自持久化消息，以及为什么 Client 传来的 `forkable: true` 不能成为事实来源。

## 1. Host Service 是可信执行边界

[`BranchMarkService`](../../packages/host/src/index.ts) 继承 Cordis `Service`，注册名为 `branchmark`。它声明的依赖是 `storageDomain`、`sessionPersistence`、`sessions`、`workspaceRegistry`、`llm`、`fs` 和 `web`：Clip 管理依赖前四项，Side Chat 再依赖后三项。

```typescript
export class BranchMarkService extends Service {
  static inject = [
    'storageDomain', 'sessionPersistence', 'sessions',
    'workspaceRegistry', 'llm', 'fs', 'web',
  ]

  readonly typertRemote = bindTypertRemote(this, 'branchmark')
}
```

Cordis 的 `inject` 不只是文档。缺少必需服务时，插件不会在一个半可用状态下继续运行。服务初始化时打开 domain，并用 `ctx.effect()` 注册 domain 与 Side Chat runtime 的反向清理；相关基础语义见 DSH 的 [Cordis primer](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/docs/cordis-primer.md)。

## 2. 配置在加载时完成校验

Service 用 Schemastery 声明所有可调边界，例如 excerpt/note/tag 大小、最近原始消息数、摘要路由、输出 token、工具轮数、读取字符数与搜索文件数。Bundle 传入的是一份完整 config；它不是和默认值做深合并。

开发时遵循两个规则：部署会变化的值进入 `Config`，固定协议事实保留常量；配置自身能判断的错误在加载阶段失败。例如专用摘要 provider 和 model 必须同时为空或同时设置，不能等第一次提问才发现半份路由。

## 3. 14 个 Remote 方法按职责分组

当前 Host 暴露 14 个 `@Remote` 方法，完整 DTO 与错误表见 [Remote API 参考](../reference/remote-api.md)。按职责阅读更容易理解：

| 职责 | 方法 |
| --- | --- |
| Side Chat 生命周期 | `createSideChat`、`getSideChat`、`sendSideChat`、`selectSideChatModel`、`cancelSideChat`、`closeSideChat` |
| Clip CRUD 与批量操作 | `create`、`list`、`update`、`setStatus`、`deleteForever`、`batchUpdate` |
| 衍生 Session 关系 | `recordDerivedSession`、`listRelations` |

这些方法是 Browser 与 Host 的协议面，不等于给模型使用的 tool。Side Chat 的五个只读 tool 是另一套 LLM request schema，第 9 章再实现。

## 4. Typert 生成而不是手写 RPC codec

`@Remote('create')` 让 Typert 从 TypeScript 方法签名生成 Host 校验器、Browser Remote client 和声明合并。构建顺序是：

```text
Host TypeScript source
    ↓ typert package-mode generation
packages/host/lib/typert.host.js
packages/host/lib/typert.host.d.ts
packages/host/lib/typert.remote-client.js
packages/host/lib/typert.remote-client.d.ts
    ↓
Browser: ctx.remote.$mount(branchmarkRemote)
    ↓
ctx.remote.branchmark.create(...)
```

生成链的配置见 [`packages/host/tsdown.config.ts`](../../packages/host/tsdown.config.ts)，官方约束见 [API Gateway 文档](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/docs/api-gateway.md)。Remote 方法应使用可生成的公开 DTO，避免把 Cordis service、class instance、函数或隐式 closure 放进 wire 类型。

## 5. 理解两层结果封装

Browser wrapper 中会连续检查两次 `ok`：

```typescript
const transport = await ctx.remote.branchmark.create(request)
if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
if (!transport.value.ok) throw remoteError(
  transport.value.error.code,
  failureMessage(transport.value.error),
)
return transport.value.value
```

外层是 DSH Gateway/Typert transport 结果，表示模块、连接、参数解码或调用是否成功；内层是 BranchMark 业务结果，表示 Workspace、来源、字段与状态是否满足规则。不要把业务拒绝实现成未分类 throw，也不要在 UI 中把所有失败都显示成“网络错误”。

DSH 的 Remote failure 使用一个 merge-extensible code/details 表和 `RemoteError`，code 带 `<domain>/<reason>` 前缀；跨 Host/Client/Worker 按结构标记和 code 判断，不依赖跨 realm 的 `instanceof`。未分类异常由 Gateway 折叠为 `gateway/internal`，设计依据见[官方记录](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/architecture/2026-08-28-ctx-remote-failure-vocabulary.md)。

BranchMark 的内层 `ClipSuccess | ClipRejected` 是插件自己的协议选择，不是 DSH 要求。当前 [`BranchMarkClient.unwrap()`](../../packages/client/src/domain/client.ts)把 DSH 外层和 BranchMark 内层集中在一个边界处理，组件不会看到两层判断；如果从零设计一个只面向当前 DSH 的 Remote namespace，也可以在 Host 业务失败点直接使用 DSH `RemoteError`，让每个调用只保留一层 `RemoteResult<T>`。两种层次与取舍见[架构设计解读](../reference/dsh-client-architecture-rationale.md#7-为什么-dsh-统一-remote-failure)。

## 6. `create` 的可信校验链

Browser 只能提交“我观察到这些字段”，Host 必须重新证明。当前 `create` 顺序如下：

```text
验证 Workspace 存在且 owner Session 属于它
    ↓
验证 excerpt/note 的 UTF-8 byte limit，规范化 tags
    ↓
sessionPersistence.inspect(sourceSessionId)
    ↓
按 eventSeq 找 user/message 或 assistant/message append event
    ↓
deriveEventMessage，核对 messageId / role / turn
    ↓
从 canonical message text 按 UTF-16 range 切片
    ↓
切片必须逐字等于 excerpt
    ↓
从真实事件日志计算 completed turn 与 forkable
    ↓
storage put
```

这里的 `sessionPersistence.inspect()` 是 rc.1 的真实读取入口，精确 fork cut 在 `inspection.inheritedEventCount`。主线不实现 SessionHandle；将来换日志格式时还必须重新定位旧 Clip，不能只替换读取方法，见[Session 身份参考](../reference/session-identity-and-migrations.md)。

关键实现位于 [`resolveSource` 与 `resolvePersistedSource`](../../packages/host/src/index.ts)。用户消息还要求事件来源为真正的 `source.kind === 'user'`，避免插件自己追加的 recall 被伪装成普通用户输入。

`sessionTitleSnapshot` 只是展示快照，不参与身份判断；标题会变，`sessionId + eventSeq + messageId + turn + role + range` 才是可复核锚点。

## 7. `forkable` 必须由完整 turn 决定

选中 assistant 流式中间态或没有 `turn/end` 的消息，不能作为 full-fork 主来源。Host 从 source event 开始向后寻找同一 turn 的 `turn/end`，在遇到下一轮 `turn/start` 前没有闭合就返回 `forkable: false`。

这条规则不是 UI 禁用按钮就够了。Browser 状态可能陈旧，Remote 可以被直接调用，持久化日志才是 authoritative state。Host 写入的 `forkable` 覆盖 Client input；实际上 `ClipSourceInput` 也不允许 Client 声明这个事实。

## 8. 可见性在 Host 过滤

`list` 的四种 visibility 是显式产品语义：

| visibility | 返回范围 |
| --- | --- |
| `session-drawer` | 当前 Workspace、当前 owner Session、`scope=session`、active |
| `session-trash` | 当前 Workspace、当前 owner Session、`scope=session`、trashed |
| `project-library` | 当前 Workspace、`scope=project`、active |
| `project-trash` | 当前 Workspace、`scope=project`、trashed |

本会话视图只使用 `session-drawer`，项目视图只使用 `project-library`。只有 Composer 引用序列化或 draft mirror 恢复这类需要解析两种可见 scope 的工作流，Client 才分别调用 session 与 project 查询后合并结果；Host 从不返回其他会话的 private Clip。全文搜索只匹配 excerpt 和 note；标签由独立的 AND 过滤参数处理，不属于全文搜索字段。

这里的“会话私有”是受信任本地 DSH 内的视图/领域隔离，不是用户账户级多租户授权。调用者仍提交 Workspace/Session id，BranchMark 没有新增独立身份认证系统；不能把这组 DTO 直接暴露给互不信任的远程用户。部署访问控制仍由 DSH 和部署环境承担，见[安全说明](../../SECURITY.md)。

## 9. 更新、回收站与不可变来源

`update` 只替换 `scope`、`note`、`tags` 和 `pinned`；`setStatus` 负责 active/trashed；`deleteForever` 删除 live Clip，但不删除已经冻结的 derived usage。不存在更新 `excerpt`、source 或任意 `sortIndex` 的单条 Remote：如果原文选择错了，应删除后重建 Clip；如果要改变顺序，应提交完整集合重排。

置顶和 scope 变化都会把 Clip 移入另一个有序集合，因此 `update` 会清除旧 `sortIndex`。`list` 的稳定排序顺序是：置顶组在前；组内两条都有索引时按索引；只有一条有索引时尚未排序的记录在前；最后按创建时间倒序和 id 升序兜底。这让旧记录和新建记录在第一次手动重排前仍有确定顺序。

回收站是业务状态，不是另一个表。这样恢复只需 `setStatus(active)`，且 provenance 不会在移动时改变。

## 10. 批量操作与完整集合排序的准确语义

`batchUpdate` 支持 `add-tags`、`set-scope`、`set-status`、`set-pinned` 和 `reorder`。非排序 mutation 会先验证 id 非空且唯一、每个 Clip 属于 Workspace、tags 合法，并预演合并后的 tag limit；之后按请求顺序调用单条 `update` 或 `setStatus`。

`reorder` 是特殊分支。请求必须声明项目集合，或同时声明会话集合与 `ownerSessionId`；`clipIds` 必须恰好覆盖该 Workspace 中对应集合的全部 active Clip，不能只提交当前搜索结果。Host 还要求所有置顶 Clip 排在所有未置顶 Clip 之前，然后按请求顺序写入连续的 `sortIndex`。局部集合、遗漏 id、混入另一 scope/Session，或跨置顶分隔线的顺序都会在任何写入前返回 `invalid-request`。

完整替换请求不是 UI 实现细节，而是避免隐藏记录被搜索结果意外重排的协议。置顶状态和顺序是两个独立决定：拖拽不能隐式切换 `pinned`，切换置顶必须使用单独 mutation。

它保证“可由业务规则提前发现的错误不会先改前几条”，但当前 storage API 没有跨记录事务。如果底层 durable write 在提交中途发生 I/O 失败，已经完成的记录不会自动回滚。因此 UI 应刷新 authoritative list，并把它描述为“预校验的顺序批量更新”，不能称为数据库原子事务。

## 11. 稳定业务错误是 UI 的分支输入

[`ClipFailure`](../../packages/host/src/types.ts) 是 discriminated union。常见分类包括：

- 身份与归属：`workspace-not-found`、`session-not-found`、`session-outside-workspace`。
- 来源可信度：`source-not-found`、`source-mismatch`、`excerpt-mismatch`。
- Clip 与关系：`clip-not-found`、`derived-session-already-recorded`、`derived-session-mismatch`、`derived-session-unavailable`。
- 临时运行时：`side-chat-not-found`、`side-chat-busy`、`side-chat-model-unavailable`、`side-chat-context-unavailable`。
- 约束输入：`invalid-request`。

Client wrapper 把 code 转成面向用户的中文提示，但保留 code 供测试与调用者分支使用。新增错误时要同步 DTO schema、Browser message mapping、测试和 Remote 参考表。

## 12. 本章检查点

运行 Host 测试并生成 Remote：

```sh
pnpm run build:host
pnpm --filter dsh-branchmark-host test
```

然后检查生成声明中存在 namespace：

```sh
rg -n "branchmark|createSideChat|recordDerivedSession" packages/host/lib/typert.remote-client.d.ts
```

测试负责来源、visibility 与排序规则；生成声明负责方法可见性；持久顺序的进程重启证据由实验 4 补足。不要把某条用例中的 domain 重开等同于真实 DSH 进程重启，具体证据范围见[验证矩阵](../reference/verification-matrix.md)。

## 13. 检索练习

1. 为什么 `sessionTitleSnapshot` 不能参与来源身份判断？
2. 为什么 transport error 与 business failure 不能压成一个 boolean？
3. `batchUpdate` 已做完整预校验，为什么仍不能称为原子事务？
4. 如果 Browser 提交 `forkable: true`，Host 应该信任、忽略还是报 schema 错？
5. 为什么 `reorder` 必须提交完整 active 集合，而不能只提交筛选结果？

第 4 题的当前答案是：input DTO 根本不接收该字段；Host 从事件日志自己计算并写入 durable source。第 5 题的答案是：局部结果不能唯一表达被隐藏记录的相对位置，完整替换才能让 Host 验证集合成员与分组不变量。下一章开始实现 Browser 侧，但仍保持 Host 为最终裁判。
