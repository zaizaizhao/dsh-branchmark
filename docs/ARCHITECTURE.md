# 枝签 · BranchMark 技术架构

## 包结构

```text
dsh-branchmark (Bundle)
├── dsh-branchmark-host
│   ├── BranchMarkService（Typed Remote）
│   ├── clip_explorer storage domain
│   └── TemporarySideChatRuntime
└── dsh-branchmark-client
    ├── DSH Slot entries
    ├── BranchMarkClient（Remote + Session 编排）
    └── BranchMarkUiController（仅浏览器临时 UI 状态）
```

发布 Bundle 的 patch 只插入一个可从 profile 根目录解析的 `dsh-branchmark` Loader 行。该包的 Node 入口转交给 Host 实现，同时通过 `dsh.client` 与 `exports["./client"]` 暴露已编译的浏览器入口。源码仍按 Host 与 Client 两个工作区维护：Host 提供 durable Clip 和临时 Side Chat，Client 只负责选区映射、交互状态和调用现有 DSH Session 能力。

发布产物把 Host、浏览器 Client、Host Typert 与 Remote codec 编译进同一个包；它不在运行时解析 `dsh-branchmark-host` 或 `dsh-branchmark-client` 私有工作区。顶层 `verify:bundle` 门禁检查默认 Host 导出、14 个 Remote invocation、自有 Typert package identity、浏览器模块包装和 `remote.branchmark` 注入。

## DSH 扩展点

| 需求 | 复用的 DSH 能力 |
| --- | --- |
| 内嵌右侧 Dock、最小化把手、项目枝签、关系树、Side Chat | `shell.overlay` |
| 侧边栏项目枝签入口 | `sidebar.footer.action` |
| Composer 枝签入口 | `conversation.input.left` |
| 未发送 Clip 引用 | `ReferenceInsert` + `InputTriggerSource.codec` |
| 衍生关系入口 | `conversation.session.header.actions` |
| Clip 反向打开衍生会话 | `listRelations` Remote + `SessionRuntime.open` |
| Fork seed 分隔线 | `conversation.chat.node` + 现有 `session/end-seed` 事件 |
| 完整分叉 | `SessionRuntime.fork` |
| 全新普通 Session | DSH 导出的 `SessionRuntime.create` |
| 衍生 Session 的只读 Clip 上下文 | `Session.append('user/message', recall, { surfaceOp: 'append' })` |
| 后台创建并发送 | `SessionFace.prompt` |
| 远程 API | `bindTypertRemote` + 生成的 Remote contribution |
| 本地持久化 | `storageDomain` |
| Side Chat 模型调用 | `ctx.llm.stream` + `BlockAssembler` |
| 来源模型恢复 | `foldRequestHeader` |
| Side Chat 模型目录与切换 | `ctx.llm.listProviders/listModels/resolveModelInfo/resolveCallConfig` |
| 项目读取 | `ctx.fs` + Workspace containment |
| Web 读取 | `ctx.web.search` / `ctx.web.fetch` |

## 持久化模型

Domain 名称为 `clip_explorer`，schema version 为 1。这个内部持久化标识为了读取既有数据而保持稳定；对外包名、Loader、Remote、浏览器模块和 UI 均使用 BranchMark 命名。

### `clips`

键是 `ClipId`，值包含 Workspace、owner Session、scope、不可变来源、不可变正文、备注、标签、可选 `pinnedAt`、可选 `sortIndex`、状态与时间。来源消息 Clip 使用 DSH `SessionId`、`MessageId`、事件序号与 UTF-16 canonical 文本范围。两个排序字段保持可选，使 schema version 1 的既有记录无需迁移即可继续读取；未排序记录在其置顶分组内按创建时间倒序显示。

置顶组始终排在普通组之前。`reorder` 复用 `batchUpdate` Remote，并要求请求携带当前会话或项目的完整 active Clip id 列表；Host 在任何写入前验证集合身份、完整性和“置顶在前”的分组不变量，再按请求顺序写入连续 `sortIndex`。搜索、标签筛选和回收站界面不发送排序请求，因此隐藏记录不会被局部结果重排。

### `derived_sessions`

键是衍生 `SessionId`，单条值同时包含：

- 一条不可变 `DerivedSessionRelation`；
- 按附件顺序排列的全部 `ClipUsage` 快照。

关系与使用快照通过一个 KV `put` 原子提交，避免关系存在但使用快照缺失。永久删除 Clip 不触碰该表。

## 来源验证

Client 的 DOM 选区只是一条观察，不是可信输入。Host 在创建 Clip 时：

1. 验证 Workspace 存在且 owner Session 属于 Workspace；
2. 读取 `sessionPersistence.inspect(sessionId)`；
3. 找到 `eventSeq` 对应的 append-origin `user/message` 或 `assistant/message`；
4. 验证 DSH `MessageId`、role 与 turn；
5. 用 DSH surface projection得到 canonical message text；
6. 验证 range 有效且切片严格等于 excerpt；
7. 只有找到同一 turn 的完整 `turn/end` 才标记 `forkable`。

Client 先按相交的 `[data-chat-flow-key]` 拆分跨消息选区，再把每段 DOM 文本映射回对应消息的 Markdown 源范围。映射依次尝试原文、规范化空白和忽略空白但保留源偏移三种形式，因此跨段落选区不会因 DOM 块边界省略换行而丢失。选区端点落在消息行边缘时，Client 以实际相交行裁剪范围，不要求两个端点都直接属于 Chat row。

## Fork 一致性

Client 把来源消息的事件序号交给原生 Fork。DSH 将边界推进到该消息所在完整轮次的 `turn/end`，随后包含下一轮 `turn/start` 前的独立尾随事件。

这里的来源是 Clip 所在的父 Session，不是 Clip 正文本身。新 Session 的 header 记录该父 Session 和 seed 长度，DSH 以普通会话历史投影并显示 seed；插件不复制、伪造或隐藏这些消息，只渲染继承横幅、来源入口和分叉分隔线。

记录衍生关系时，Host 再次读取来源与子 Session：

- `parentSession` 必须等于主要来源 Session；
- `seedLength` 必须精确等于按上述规则计算的 cut；
- 仅枝签 Session 的 `parentSession` 和 `seedLength` 必须都不存在。

因此插件不会把一次失败或错误边界的 Fork 伪装成成功关系。

## Side Chat 生命周期

`TemporarySideChatRuntime` 的 Map 是 Side Chat 的唯一所有者。每个 entry 包含可独立修改的模型 route、DSH 模型目录、隐藏上下文、可见问答、流式增量和当前 AbortController。

```text
create → preparing → idle → running → idle
                    │        │
                    │        ├─ cancel → idle
                    │        └─ error  → error
                    └──────────── close → abort + delete
```

它不调用 Session Store，不产生 Session id，不写 Session event，也不进入 storage domain。Client 通过短轮询读取进程内 snapshot；关闭请求立即 Abort 并删除 entry。Host/plugin dispose 会对全部 entry 执行相同清理。

## Side Chat 上下文

1. 读取主要来源 Clip 所在完整轮次的 Session 前缀。
2. 通过 `foldRequestHeader` 取得当时 provider/model 与调用配置。
3. 创建阶段只冻结来源消息并加载模型目录，不发起摘要调用。
4. 首次发送时从至少 `recentContextMessages` 条最近消息向前寻找非工具用户消息，保证原始上下文不以孤立的工具结果开始；更早历史转换为一条不含 provider replay state、reasoning 或结构化工具协议的 JSON transcript，再由此时选定的 Side Chat 模型或专用摘要模型生成一个 `recall` 消息。
5. 所有 Clip 原文与启用的备注生成另一个完整 `recall` 消息。
6. Side Chat 自身问答继续使用 DSH `Message` 和 `BlockAssembler`；浏览器只收到文本、思考、只读工具活动和模型目录的缩窄投影。
7. 模型切换只更新 Side Chat entry 的 route；`resolveCallConfig` 负责 provider/model/reasoning 校验，不调用来源 Session 的 `selectModel`。

摘要失败不会阻止回答：Host 保留安全边界后的最近原始消息与完整 Clip，snapshot 的 `contextWarning` 携带 provider 错误码和消息，界面将等待状态标为“已跳过摘要”。

## 只读工具

Side Chat 的工具 schema 是固定常量，不从父 Session 的工具目录复制：

- `project_read`
- `project_list`
- `project_search`
- `web_search`
- `web_fetch`

每个项目路径先由 `ctx.fs.resolve` 解析，再用 `ctx.fs.contains(workspaceRoot, target)` 验证。没有写文件、编辑、Shell、子代理、Session 操作或权限升级工具。所有结果、文件读取、扫描文件数与工具轮次都有配置上限。

## 客户端状态与 Dock

`BranchMarkUiController` 保存 Dock 的三种显示模式（`hidden`、`rail`、`expanded`）、当前视图、宽度、内嵌启动流程、DOM 选区、Toast 和 Side Chat 浏览器镜像。`rail` 只渲染右侧中部把手，不占据全高；`expanded` 通过宿主稳定的 `data-conversation-scroll` 与 `data-composer-seat` 锚点计算上下安全区，并始终作为 `shell.overlay` 中的浮层显示。插件不设置宿主会话根节点的宽度、属性或 CSS 变量。Dock 没有 backdrop，宽度限制为 340–620px；Escape 先关闭内嵌启动流程，再最小化为把手。

Client 组件按交互职责分开：`SelectionToolbar` 观察 DOM 选区并编排四个显式动作，`ClipCollection` 拥有查询、筛选、选择顺序和拖拽编排，`BatchCommandCapsule` 提供窄宽度优先的六项批量命令，`ClipCard` 拥有单枚枝签的元数据、固定高度阅读、卡片内展开、聚焦阅读和衍生关系，`BranchMarkLauncherSheet` 分别呈现 Side Chat 或普通 Session 启动流程，`BranchMarkShell` 只组合 Dock、关系树、选区工具条和 Toast。会话或项目范围的请求映射与工具条定位由 `domain/selection-actions.ts` 纯函数决定，`domain/clip-order.ts` 负责拒绝跨置顶组拖动，避免把持久化规则藏在视图事件中。

浏览器 `localStorage` 只保存 Dock 显示模式、视图和宽度。Clip、备注、标签、关系、Side Chat 消息和 Composer 内容不会写入该存储。durable Clip 与普通衍生 Session 仍分别由 Host storage domain 和 DSH Session 恢复。

本会话视图在 Remote 返回结果后仍执行一次精确过滤：只接受 `scope=session && ownerSessionId=currentSessionId`。项目视图只接受 `scope=project`。该客户端过滤用于防止错误展示，不代替 Host Remote 的授权与隔离。

Side Chat 与本会话、项目和关系树共用 Dock，多个临时会话以标签切换；收起或隐藏 Dock 只改变可见性，关闭标签才调用 Host close 并销毁内存状态。助手正文和思考过程复用 DSH `MarkdownText`，只读工具以主对话式折叠行显示，输入区保留模型/思考强度选择、Enter 发送、Shift+Enter 换行和停止生成。发送与停止操作使用和 DSH 主 Composer 相同的 34px 圆形按钮、语义色和图标状态。

浏览器 Client 先挂载生成的 Remote contribution，再在 `ctx.inject(['remote.branchmark'])` 作用域中注册 UI Slot 与 `branchmark` Input Trigger source，避免界面或引用序列化器在 Remote namespace 可用前读取服务。

## Composer 枝签表示

卡片上的“引用到输入框”调用当前 Session 的 `SessionInput.insertReference()`，在 draft 开头插入一个 `appearance=session` 的 DSH 原生引用。可见 label 只有“枝签 · 正文预览”，`ref` 保存版本化的 Workspace、owner Session、Clip id 与备注开关；完整原文不进入可见 draft。Composer 工具栏显示当前枝签引用数，并提供逐条移除与打开本会话枝签的 Popover。批量引用按用户勾选顺序接收 Clips，并以逆序调用头部插入，使最终 Composer Chip 顺序与勾选顺序一致；已有引用保持原位置并计入 duplicate 结果。

DSH 的 draft mirror 按 `ReferenceInsert.clipboardText` 持久化引用，而不保存进程内 occurrence table。BranchMark 使用可解析的 `@branchmark:<ClipId>` 投影。`BranchMarkShell` 订阅当前 Session input；发现该 token 后，Client 一次读取会话私有与项目集合，从后向前调用公开的 `insertReference()` 精确替换 token，从而保持其他草稿文字和偏移。找不到、已回收或无法读取的 Clip 不会被伪造为有效引用；原 token 保留，用户可识别并处理。

DSH 的公开 `InputActions.setDraft()` 只接受完整新 draft，并通过公共前缀与后缀推断编辑范围。逐条移除先用 draft 中不存在的不可见分隔符替换目标引用，使差分只命中该 occurrence，再立即删除分隔符及其间隔；两个同步写入保留相邻引用的结构化身份，且不会把占位符留在 Composer。

`branchmark` Input Trigger source 不向 `@` 菜单提供候选项，只拥有这些程序化引用的 codec。提交时 `codec.serialize()` 重新从会话私有集合与项目集合读取 Clip，校验它仍处于 active 状态，再生成可读模型上下文。缺失、回收站或格式无效会拒绝序列化；DSH 保留 draft 与 Chip 并阻止发送。该过程不使用内部 XML 标签，也不会由引用动作自动提交。

衍生 Session 不走上述 Composer 表示。Host 在校验新 Session header 与衍生关系后，将 Clip 使用快照渲染为 `source.kind=plugin, form=recall` 的 `user/message` 并追加到 Session surface。创建并打开时 Composer 保持空白；创建并发送时 Client 只把用户问题交给公开的 `SessionFace.prompt()`。枝签上下文因而对模型可见、由日志恢复、在 UI 中显示为可折叠回忆行，同时不成为用户可误改的输入框正文。

## 已知兼容性边界

- 插件以 DSH `0.1.1-rc.2` 的已导出 API 和 Slot contract 为目标。
- Composer 引用依赖 `@deepseek-ai/dsh-client-ui-input-trigger` 的 `ReferenceInsert`、`InputTriggerSource.codec` 和 `SessionInput.insertReference()`；任一能力缺失都会让 Client 插件在装载或构建阶段失败，不会回退为可见全文草稿。
- `ISessions` 的窄接口没有 `create`，但 DSH 包公开导出了 concrete `SessionRuntime.create`。插件使用该现有导出保证“仅枝签”严格创建新 Session；如果未来 DSH 收紧该导出，Client 会明确报 `session-create-unavailable`，不会回退为空白 Session 复用。
- `storageDomain` 不提供二级索引 API；当前全文搜索在 Workspace 可见 Clip 集合上执行有界本地扫描。若大规模数据需要倒排索引，应在后续 schema version 中增加插件自有索引记录，而不是绕过 storage domain。
