# 第 6 章：前端选区、Dock 与 Composer

本章把 BranchMark 作为 additive Browser plugin 挂到 DSH Web UI，并解决两个容易被低估的问题：用户选择的是渲染后的 DOM 文本，Host 验证的却是持久化 Markdown 原文；DSH 恢复 draft 时保留引用的 clipboard projection，却不会自动恢复来源插件的进程内 occurrence。完成后，你应能保存同一消息内的连续选区、把跨消息选择拆成多个 Clip、展示可排序 Dock，并把显式选择的摘录按顺序放进主输入框、刷新后恢复且绝不自动发送。

## 1. Browser 入口分两阶段装载

[`packages/client/src/client/index.tsx`](../../packages/client/src/client/index.tsx) 先安装样式，再挂载 Typert 生成的 Remote 模块：

```typescript
ctx.effect(() => installBranchMarkStyles())
ctx.effect(async () => await ctx.remote.$mount(branchmarkRemote))
ctx.inject(['remote.branchmark'], (scope) => {
  // 创建 controller/client，注册 event definition 与 slots
})
```

这里有两个不同的依赖层次：`dsh.client.inject` manifest 告诉 Client Modules 当前 factory 到达时需要哪些浏览器模块，并不规定 apply 顺序；导出的 Cordis `inject` 与运行时 `ctx.inject(['remote.branchmark'])` 等待实际 service/namespace 就绪。前者解决代码装载，后者解决运行时依赖，不能相互替代。

## 2. 五个 Slot 与一个 Input Trigger source，不替换宿主页面

插件使用五个现有席位：

| Slot | 插件 UI |
| --- | --- |
| `shell.overlay` | 右侧 Dock、浮动保存面板、Toast |
| `sidebar.footer.action` | 项目枝签入口 |
| `conversation.input.left` | 本会话枝签入口 |
| `conversation.session.header.actions` | 衍生 Session 标记 |
| `conversation.chat.node` | `session/end-seed` 位置的分叉分隔条 |

Composer 引用不占用额外 Slot；插件向 `ctx.inputTriggers` 注册 `branchmark` source，并通过 `SessionInput.insertReference()` 写入原生 occurrence。完整注册见 [`client/index.tsx`](../../packages/client/src/client/index.tsx)。`shell.overlay` 的宿主容器本身允许 click-through，插件只让可交互区域接收 pointer event；不要把透明全屏根节点注册成阻塞层。

## 3. UI controller 只拥有 Browser 状态

[`BranchMarkUiController`](../../packages/client/src/domain/controller.ts) 是一个小型 external store，通过 `useSyncExternalStore` 供多个 Slot 共享。它保存 Dock mode/view/width、当前选区、Side Chat tabs、刷新 revision 和 toast；Composer occurrence 由 DSH 自己的 Session input state 拥有。

只有 `mode`、`view` 与 `width` 写进 `localStorage`，key 为 `dsh-branchmark.ui.v1`。Clip 正文、备注、关系、Side Chat 消息都不经过浏览器持久化。隐私模式或 quota 让 localStorage 失败时，只退回默认布局，不影响 Host 数据。

Dock 有三个显示状态：`expanded` 是右侧浮动面板，`rail` 是右侧中部最小化把手，`hidden` 是完全隐藏。展开时插件从 `data-conversation-scroll` 与 `data-composer-seat` 计算上下安全区，但不修改会话列宽度或宿主布局。最小化和隐藏不会关闭 Side Chat；只有明确关闭某个 Side Chat tab 才调用 Host 销毁它。

## 4. 从 selection 找到 DSH Chat 行

[`useChatSelection`](../../packages/client/src/components/SelectionToolbar.tsx) 监听 `selectionchange`，取得 selection 的 start/end element，再通过 `[data-chat-flow-key]` 找所属 Chat row。若起点和终点在多个 row 中，它按 DOM 顺序逐行生成 candidate：

```text
同一 Chat row 内的连续文本 → 一个 Clip candidate
跨越多个 Chat row → 每个有可映射文本的 row 一个 candidate
```

这样“连续选区形成一个 Clip，跨消息分别摘录”成为数据规则，而不是把多个来源硬塞进一条无法复核的 source。

DOM selector 是当前 DSH UI 的适配点，不是稳定协议。升级时必须重新核对，详见[兼容性清单](../reference/compatibility-and-limitations.md)。

## 5. 从 Chat node 恢复持久化锚点

DOM 只告诉我们可见文字与节点位置。`BranchMarkClient` 先通过 `ctx.uiConversation.binding(sessionBinding)` 取得 `ConversationSnapshot`，`selectionCandidate()` 再从 `snapshot.views.get('chat')?.nodes` 读取 UI Chat View：

- `user`/`steering` node 提供 append event seq、message id、turn 与 user role。
- settled `assistant-step` 的 `finalNode` 提供最终 assistant message id 与 seq。
- streaming/未 settled assistant 没有稳定 final anchor，因此不能摘录为持久来源。
- hidden node、tool-only node 和无法解析 location 的 node 被跳过。

实现位于 [`domain/selection.ts`](../../packages/client/src/domain/selection.ts)。这一步得到的是候选锚点，不是信任证明；Host 仍会 inspect 持久日志。

这里同时依赖 UI Conversation 和 UI Chat 是有意分层，不是重复取数。UI Conversation 只拥有 Session event window 到 target snapshot 的通用组装与 binding；UI Chat 拥有 Chat node 的具体类型、keyed store、顺序和 selection 语义。DSH 这样做能让 Chat、Trajectory 等 target 共享稳定 id、分页和增量回放机制，又不要求彼此共享最终 projection；新增 BranchMark node 也不需要修改 Session Controller 的中央 switch。算法动机与 keyed snapshot 收益见[架构设计解读](../reference/dsh-client-architecture-rationale.md#4-为什么-conversation-与-chat-分开)。

## 6. Markdown 渲染文本如何映回原文 range

直接用 `text.indexOf(selection.toString())` 对简单文本有效，但对 Markdown 会失败。例如原文 `**important**` 渲染为 `important`，链接、列表和 code span 也会改变 DOM 文本。

当前算法分两级：

1. 先在 canonical message string 中查找 exact excerpt；若多次出现，选择最接近 DOM approximate offset 的位置。
2. exact search 失败时，用 `mdast-util-from-markdown` 加 GFM extension 解析 Markdown，把可见 leaf text 投影回 source offset；规范化空白后寻找选中文字，再恢复第一个与最后一个 source char 的 offset。

最终 candidate 的 excerpt 必须由 `canonicalText.slice(start, end)` 重新取得，而不是继续使用 DOM string。这样 Browser 发给 Host 的 range 与 excerpt 使用同一原文。

这是一个实用适配器，不是完整浏览器排版逆变换。复杂 HTML、插件自定义渲染或多个相同规范化片段仍需要测试；Client 测试覆盖普通文本、重复文本附近定位与 Markdown emphasis 等当前场景。

## 7. 保存浮层只负责收集意图

候选形成后，浮层提供“摘录到会话”和“摘录到项目”两个显式保存动作，并为每个消息分别创建 Clip。“Ask in side”和“引用到输入框”先创建本会话 Clip，再执行对应后续动作。跨消息选择不会在 Host 产生一个多 source record，而是发出多次 `create`。

保存成功后调用 `controller.clipsChanged()`，让当前 Dock 查询重新加载 authoritative Host list；不把返回对象直接拼进所有视图缓存，可以避免 session/project/trash 筛选不同步。

## 8. Dock 的两个摘录集合

会话视图只查询：

```text
当前 Session 的 session-scope Clips
```

它既不展示其他 Session 的 session-scope Clips，也不混入项目 Clip。项目枝签视图只查 project scope，默认卡片网格，可切换列表；两者均支持正文/备注全文搜索、独立的 AND 多标签筛选、备注、标签、scope 提升、回收站和永久删除。Card 与 list 只是表现切换，不改变 query DTO。

`ClipCard` 不允许编辑 excerpt/source，只允许编辑 note/tags。折叠卡片高度固定，长正文可在卡片内展开，也可进入 DSH Modal 专注阅读；这些阅读状态不写回 Clip。Side Chat 回答保存成 `temporary-answer` Clip 后可展示和加入后续上下文，但因为 `reopenable=false`、`forkable=false`，不能充当 full-fork primary。

多选状态使用有序 `selectedIds`，所以用户勾选顺序也是后续 Composer、Side Chat 与 Session attachments 的顺序。选择后只显示一个“处理 N 枚枝签”命令胶囊，展开提供六个显式动作：引用到输入框、Side Chat、新会话、置顶/取消置顶、加标签、移入回收站。标签输入框只在选择“加标签”后出现，窄 Dock 隐藏动作文字但保留可访问名称。

active 且没有 search/tag filter 的集合才允许拖拽。Client 的 [`moveClipInCollection`](../../packages/client/src/domain/clip-order.ts) 先拒绝跨置顶组放置，再把完整集合 id 顺序提交给 Host；搜索结果、标签结果和回收站都禁用拖拽。拖拽只改变顺序，切换置顶必须是独立动作。

## 9. Composer 集成使用原生引用且不自动发送

“引用到输入框”调用 [`clipReferenceInsert`](../../packages/client/src/domain/composer-reference.ts)，只生成短 label 与版本化身份：

```text
可见 draft：@枝签 · 摘录正文预览
opaque ref：Workspace + owner Session + Clip id + includeNote
```

随后通过 `conversation.input.for(session).insertReference(reference, span)` 在 draft 开头插入一个 DSH 原生 occurrence。没有调用 prompt/send，因此用户可以继续输入问题、移除 Chip 或不发送。Composer 工具按钮直接从 `InputState.occurrences` 计算数量，并在 Popover 中逐条移除引用。

头部插入会让后一枚出现在前面，因此 [`attachClipsToComposer`](../../packages/client/src/domain/client.ts) 按选择顺序的逆序调用单枚插入，再把结果恢复为选择顺序。已存在的 Clip 不会重复插入，也不会因批量动作改变原有位置。

DSH 的 draft mirror 持久化每个 occurrence 的 `clipboardText`，BranchMark 使用 `@branchmark:<ClipId>`。重新绑定 Session Composer 时，[`watchComposerReferenceRecovery`](../../packages/client/src/domain/client.ts) 观察这些 token，并按以下顺序恢复：

```text
扫描当前 draft 的 BranchMark token 与精确 offset
  ↓
并行读取当前 Session 私有集合与项目集合
  ↓
用 active Clip id 解析 token
  ↓
从右向左调用公开 insertReference() 替换 token
  ↓
恢复原生 occurrence，保持周围草稿和前方 offset 不变
```

两个集合中只要一个成功就可继续恢复对应 Clip；两者都失败才报告读取错误。找不到、已回收或不在当前可见 scope 的 Clip 不会被伪造成有效上下文，原 token 保持可见。右到左处理很重要：先替换右侧范围不会改变左侧 token 的 offset；每次插入仍带当前 `draftRev`，以服从 DSH 的 CAS。

用户显式发送时，`branchmark` source 的 `codec.serialize()` 才从 Host 重新读取 active Clip，并调用 [`renderClipContext`](../../packages/client/src/domain/format.ts) 生成模型可读原文和可选备注。Clip 缺失、已删除、进入回收站或 ref 无效时序列化拒绝，DSH 保留 draft 与 Chip 并阻止发送。

逐条移除引用也不直接把整个前缀替换成普通文本。实现先用 draft 中不存在的不可见分隔符替换目标 occurrence，再立即删除该分隔符与相邻间隔；两次公开 `setDraft()` 让差分只命中目标范围，避免相邻共同前缀引用丢失结构化身份。

## 10. Side Chat 与普通 Session 使用不同启动意图

[`BranchMarkLauncherSheet`](../../packages/client/src/components/BranchMarkLauncher.tsx) 接收显式 `intent: 'side-chat' | 'session'`，不会把两套流程塞进一个可误选的表单。

- Side Chat 只要求选择可恢复上下文的 primary Clip，然后创建临时 tab，等待用户在 Side Chat 输入框提问。所选 Clip 跨多个来源 Session 时必须显示 primary 选择；都来自一个来源时可直接选 eventSeq 最新的 forkable Clip。
- Session 启动器提供 full-fork/clips-only、逐条备注开关、创建并打开与创建并发送。full-fork 的 primary 决定父 Session 和完整 turn 边界；clips-only 不设置 primary。

两个 intent 都保留有序 attachments，但只有 Side Chat 的 primary source Session 决定临时上下文，只有 full-fork 的 primary source Session 决定 DSH parent。UI 分流不能替代 Host 对来源和 child header 的验证。

## 11. 样式应适配宿主而不是复制宿主

[`styles.ts`](../../packages/client/src/client/styles.ts) 通过一个带插件前缀的 style element 安装 CSS。设计时遵循：

- class 全部以 `dbm-` 开头，避免污染宿主。
- 颜色优先引用 DSH CSS variables，并为缺失变量提供低风险 fallback。
- Dock 宽度限制在 340–620 px，拖拽值由 controller clamp。
- 可交互组件保留 keyboard button semantics、`aria-label`、disabled 与 focus state。
- 长 excerpt 使用固定高度视觉裁切但不改 Host record；完整正文仍可在卡片内展开或 Modal 中读取。

纯插件 UI 必须接受宿主 DOM/Slot 变化是适配成本，不能通过复制整个 DSH 页面来逃避依赖。

## 12. 本章检查点

执行 Client tests：

```sh
pnpm --filter dsh-branchmark-client test
```

再在真实 Web profile 中手动验证：

1. 选择一段含 `**强调**` 或 inline code 的回答并保存，Host 不返回 `excerpt-mismatch`。
2. 一次选择跨两条消息，保存后出现两张卡片且 source message 不同。
3. 本会话视图只看得到当前 session Clip；项目视图只看得到 project Clip，两个视图都看不到其他 session private Clip。
4. 依次选择三条 Clip，通过命令胶囊引用到 Composer，确认原生 Chip 顺序与选择顺序一致、正文未展开且未自动发送；从 Popover 删除一枚 Chip 后，用户问题与相邻 Chip 仍保留。
5. 保留未发送引用并重新绑定或刷新对应 Composer，确认可解析 token 恢复为原生 Chip；删除其中一条 Clip 后再次恢复，确认该 token 保持可见而不是假装携带上下文。
6. 在无筛选 active 集合内同组拖拽并重启 Host，确认顺序保留；尝试跨置顶组或在搜索结果中拖拽，确认不会发出持久化重排。
7. 展开 Dock 后确认 Session Log 与 Composer 均未被遮挡；最小化再恢复时 Side Chat 与当前 view 仍在，刷新浏览器后只恢复布局偏好。

## 13. 检索练习

1. 为什么保存前必须把 DOM excerpt 重新转换为 canonical `slice`？
2. 为什么 streaming assistant node 不适合作为持久 source？
3. `ReferenceInsert` 的 label、ref、clipboardText 与 codec model form 分别属于哪个阶段？
4. 为什么 Composer 序列化与引用恢复要分别查询 session/project visibility，而不能查询全部 Workspace Clip？
5. 为什么恢复多个 draft mirror token 必须从右向左执行？
6. 为什么搜索、标签筛选和回收站视图必须禁用拖拽？

下一章将使用这些显式选择创建两类普通 Session，并证明只有 full-fork 才形成 DSH 原生父子关系。
