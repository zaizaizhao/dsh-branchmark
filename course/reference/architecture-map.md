# 系统架构与数据流

本页是查阅型参考，回答“一个动作跨过了哪些模块、最后写到哪里”。实现顺序见[主线课程](../README.md#主线课程)，类型和方法细节见[Remote API](remote-api.md)，DSH Client 为什么采用这些所有者见[架构设计解读](dsh-client-architecture-rationale.md)。

本图描述当前 BranchMark `0.1.2-alpha.5` 源码：持久日志通过 `sessionPersistence.inspect` 读取，lineage 使用 `SessionHeader.isSeeded` 与 `SessionInspection.inheritedEventCount`。未发布 master 保留 Host 复核、full-fork 与 recall 语义，但把读取入口改成 `SessionHandle`；迁移过程见[第 13 章](../tutorials/13-dsh-prerelease-upgrade.md)。

## 运行时组件

```text
DSH Web profile
├── Host process
│   ├── DSH services
│   │   ├── ctx.sessions / ctx.sessionPersistence / ctx.workspaceRegistry
│   │   ├── ctx.storageDomain
│   │   ├── ctx.llm
│   │   ├── ctx.fs
│   │   └── ctx.web
│   └── BranchMarkService
│       ├── clips KvTable
│       ├── derived_sessions KvTable
│       ├── 14-method Typert Remote namespace
│       └── TemporarySideChatRuntime Map
└── Browser
    ├── DSH API Controllers
    │   ├── ctx.sessions / Session binding
    │   └── ctx.workspaces / Workspace snapshot
    ├── DSH UI owners
    │   ├── uiConversation binding / target-neutral snapshot
    │   ├── keyed Chat View
    │   ├── UI Session / UI Workspace standard sources
    │   └── UI Renderer / Slots
    ├── generated remote.branchmark methods
    ├── BranchMarkClient
    ├── BranchMarkUiController
    └── DSH Slots
        ├── shell.overlay
        ├── sidebar.footer.action
        ├── conversation.input.left
        ├── conversation.session.header.actions
        └── conversation.chat.node
    └── ctx.inputTriggers
        └── branchmark Reference codec
```

Host 的入口是 [`BranchMarkService`](../../packages/host/src/index.ts)，Side Chat 执行器是 [`TemporarySideChatRuntime`](../../packages/host/src/side-chat.ts)，浏览器组装入口是 [`packages/client/src/client/index.tsx`](../../packages/client/src/client/index.tsx)，单包分发入口是 [`packages/bundle`](../../packages/bundle)。

## 数据所有权

| 数据 | 所有者 | 介质 | Host 重启后 | 删除 Clip 后 |
| --- | --- | --- | --- | --- |
| Clip 正文、来源、备注、标签、置顶、集合顺序、状态 | BranchMark | `clip_explorer/clips` | 保留 | 被删除 |
| 衍生关系与 Clip 使用快照 | BranchMark | `clip_explorer/derived_sessions` | 保留 | 保留 |
| 普通 Session 历史、parent、seed | DSH Session/Persistence | DSH Session backend | 保留 | 不受影响 |
| Side Chat 隐藏上下文、消息、流式状态 | `TemporarySideChatRuntime` | Host 内存 | 丢失 | 只要标签未关闭就保留内存引用副本 |
| Dock 显示模式、视图和宽度 | `BranchMarkUiController` | 浏览器 `localStorage` | 保留 | 不含 Clip 内容 |
| Composer 中显式插入的 Clip occurrence | DSH Composer + BranchMark codec | occurrence 在当前 input state；clipboard token 在 DSH draft mirror | token 服从 DSH draft 持久化并可重建 occurrence | 提交时重新读取 active Clip；删除后 token 保持可见或已有 Chip 阻止发送 |

这张表解释了插件为何同时需要两个持久系统：普通 Session 的模型历史属于 DSH 日志，Clip 知识对象与双向使用关系属于插件 domain。插件不得把 Session 日志复制到自己的 KV 表，也不得用 Clip 表替代 DSH lineage。

## Clip 创建数据流

```text
DOM Range
  ↓ useChatSelection
DSH Chat node key + rendered excerpt
  ↓ selectionCandidate
SessionId + MessageId + eventSeq + turn + UTF-16 range
  ↓ remote.branchmark.create
Host sessionPersistence.inspect(sessionId)
  ↓ deriveEventMessage + canonicalMessageText
严格校验 identity / role / turn / slice === excerpt
  ↓ clips.put
durable Clip
```

浏览器只负责观察和定位。Host 在 [`resolvePersistedSource`](../../packages/host/src/index.ts) 中重新读取持久化历史，因此修改 DOM、伪造 `MessageId` 或伪造 `excerpt` 都不能绕过来源校验。

跨消息选区不会产生一个跨消息 range。[`useChatSelection`](../../packages/client/src/components/SelectionToolbar.tsx) 枚举 Range 相交的每个 `[data-chat-flow-key]` 行，为每行构造独立 `ClipSelectionCandidate`，随后 `SelectionToolbar` 根据显式选择的会话或项目范围为每个 candidate 发出一次创建请求。

## 有序集合数据流

```text
active session/project Clip list
  ↓ Client 按用户勾选顺序保存 selectedIds
批量置顶 → batchUpdate(set-pinned)
  ↓ scope/pin 变化使旧 sortIndex 失效
Host 写 pinnedAt，清除失效索引

无 search/tag filter 的完整 active list
  ↓ 专用手柄同一置顶组内拖拽
Client 纯函数生成完整替换 id 顺序
  ↓ batchUpdate(reorder + scope/owner)
Host 验证精确成员 + 置顶在前
  ↓ 按请求顺序写连续 sortIndex
下一次 list 由 Host comparator 返回持久顺序
```

排序属于一个具体集合，不是 Clip 的全局名次。项目有一个 active 集合；每个 owner Session 有自己的 active private 集合。搜索、标签筛选与回收站只返回子集，因此不能生成重排请求。

## Composer 引用与恢复数据流

```text
ordered selected Clips
  ↓ 逆序调用头部 insertReference()
DSH draft label + occurrence(ref, source, clipboardText)
  ├── 用户尚未发送 → draft mirror 写 @branchmark:<ClipId>
  │     ↓ Composer 重新绑定
  │   BranchMark 扫描 token，读取 session + project 可见集合
  │     ↓ 从右向左 insertReference(span + current draftRev)
  │   恢复原生 occurrence；缺失 token 保持可见
  └── 用户显式发送
        ↓ InputTrigger source codec.serialize(ref)
      重新读取 active Clip + optional note
        ↓ DSH 提交事务
      模型文本；失败则 draft 与 occurrence 保留
```

label 是可见短文本，clipboard projection 是持久化/复制文本，ref 是来源拥有的版本化身份，模型文本只在提交时产生。四种表示不能互相替代。

## 普通衍生 Session 数据流

```text
selected Clips
  ↓ BranchMarkLauncherSheet chooses mode, primary Clip, note flags
  ├── full-fork
  │     ↓ ctx.sessions.fork({ sessionId: sourceSessionId, atSeq: sourceEventSeq })
  │   DSH Host extends cut to the first matching turn/end and trailing standalone events
  │     ↓ child metadata: parentSession + isSeeded + inheritedEventCount
  └── clips-only
        ↓ ctx.sessions.create({ workspaceId })
      fresh metadata: no parentSession, isSeeded=false, inheritedEventCount=0

created SessionId
  ↓ remote.branchmark.recordDerivedSession
Host re-inspects child and source headers
  ↓ one-record derived_sessions.put(relation + ClipUsage snapshots)
  ↓ child.append(user/message, plugin recall)
  ├── create-and-open → sessions.open(child)
  └── create-and-send → child binding.session.prompt(question, 'queue')
```

DSH Session metadata 是 full-fork 父子关系的权威来源。插件关系表只能在 Host 确认 `parentSession`、`isSeeded` 和精确 `inheritedEventCount` 后写入。`clips-only` 不设置 DSH parent；它是一个根 Session，只和 Clip 使用记录有关。

Relation 与 usages 在一个 KV record 内共同提交，但随后的 Session recall append 属于另一个 durable subsystem，两步之间没有跨系统事务；失败窗口见[兼容性与限制](compatibility-and-limitations.md#跨-durable-subsystem-的提交限制)。

## Side Chat 数据流

```text
selected Clips + primary Clip
  ↓ createSideChat
inspect source prefix through primary Clip's completed turn
  ↓ foldRequestHeader
freeze source Message[] + source LlmCallConfig
  ↓ allocate SideChatEntry in Host Map
browser receives preparing snapshot

first question
  ↓ sendSideChat returns immediately
lazy context preparation
  ├── earlier messages → one untrusted JSON text transcript → ctx.llm.stream → AI summary recall
  ├── safe user boundary onward → at least N exact DSH Messages
  └── selected Clips + enabled notes → full recall Message
  ↓ ctx.llm.stream(system + context + Side Chat messages + fixed tools)
  ↓ BlockAssembler + optional tool-call rounds
browser polls getSideChat every 500 ms
  ↓ text/reasoning/tool snapshots
closeSideChat → AbortController.abort + Map.delete
```

Side Chat 不是普通 Session，因此不会生成 Session id、Session event 或持久化记录。它使用 DSH 的消息和模型协议，但自己承担内存状态、取消、缩窄 wire projection 与不可恢复语义。

## 父子层级的两份数据

| 关系 | 权威字段 | 用途 |
| --- | --- | --- |
| DSH Session lineage | `SessionHeader.parentSession` → Host `parentSessionId` → Client `SessionSummary.parentId` | 树结构、侧边栏嵌套、父会话导航 |
| BranchMark relation | `DerivedSessionRelation` + `ClipUsage[]` | 主要 Clip、来源消息、创建模式、Clip→Session 反向导航、删除后的快照 |

full-fork 同时拥有两份关系：DSH lineage 说明“从哪个 Session 分叉”，插件关系说明“使用了哪些 Clip、哪一个是主要来源”。clips-only 只有插件关系，没有 DSH parent。Side Chat 两份都没有。

## 信任边界

- 浏览器提交的 Workspace、Session、消息锚点、选区与 Clip id 都是不可信输入。
- Typert Gateway 校验 wire JSON 的字段和类型，但业务归属仍由 `BranchMarkService` 校验。
- `workspaceRegistry.sessionIds` 与 `sessionPersistence.inspect()` 是 Session/Workspace 来源真相。
- `ctx.fs.contains(root, target)` 是项目文件工具的路径 containment 检查；字符串前缀比较不具备这个保证。
- `ctx.web.fetch` 的网络安全取决于已装 provider。DSH 当前本地 HTTP provider 不默认阻断私网地址，Web profile 默认也没有 fetch provider；详见[兼容性与限制](compatibility-and-limitations.md#web-fetch-不是默认可用能力)。
- Side Chat 不获得 Shell、写文件、Session 修改、subagent 或权限升级工具。

## 设计检查

当你新增功能时，先问数据应落在哪个所有者：需要进入普通 Session 模型历史的内容必须写 Session 日志；需要跨会话检索但不属于会话历史的 Clip 元数据与集合顺序写 storage domain；只在临时 Side Chat 存活期间有意义的状态只放 Host `Map`；纯显示偏好才可放浏览器 `localStorage`；未发送 Composer 内容服从 DSH input/draft 生命周期，插件只能通过公开 reference codec 和 insert API 参与。
