# 源码导航

本页按“找一个行为应该先读哪里”组织。源码演进会移动行号，因此表格使用稳定符号名，不把近似行号当作定位依据。

## BranchMark Host

| 主题 | 文件 | 入口符号 |
| --- | --- | --- |
| Service、配置、生命周期 | [`packages/host/src/index.ts`](../../packages/host/src/index.ts) | `Config`, `BranchMarkService`, `Service.init` |
| Side Chat Remote | 同文件 | `createSideChat` 至 `closeSideChat` |
| Clip CRUD/检索 | 同文件 | `create`, `list`, `update`, `setStatus`, `deleteForever`, `batchUpdate` |
| 置顶、比较与完整集合重排 | 同文件 | `compareClips`, `update`, `batchUpdate` 的 `reorder` 分支 |
| 衍生关系与 recall | 同文件 | `recordDerivedSession`, `listRelations` |
| 来源与 fork 校验 | 同文件 | `resolvePersistedSource`, `matchesDerivedHeader`, `expectedForkSeedLength` |
| 公共 DTO 与 failures | [`packages/host/src/types.ts`](../../packages/host/src/types.ts) | `Clip`, `DerivedSessionRelation`, `SideChatSnapshot`, `ClipFailure` |
| Zod/domain spec | [`packages/host/src/spec.ts`](../../packages/host/src/spec.ts) | `clipSchema`, `derivedSessionRecordSchema`, `branchMarkDomainSpec` |
| Side Chat context/LLM/tools | [`packages/host/src/side-chat.ts`](../../packages/host/src/side-chat.ts) | `TemporarySideChatRuntime`, `TOOLS`, `sourcePrefix`, `contextSplitIndex`, `summaryTranscript`, `prepareContext`, `answer`, `executeTool` |

## BranchMark Browser

| 主题 | 文件 | 入口符号 |
| --- | --- | --- |
| Remote mount 与 Slot 组装 | [`packages/client/src/client/index.tsx`](../../packages/client/src/client/index.tsx) | `inject`, `apply` |
| DSH Client Services 与 Remote 编排 | [`packages/client/src/domain/client.ts`](../../packages/client/src/domain/client.ts) | `BranchMarkClient`, `currentWorkspace`, `sessionSnapshot`, `launch` |
| 批量 Composer 引用与 draft 恢复 | 同文件 | `attachClipsToComposer`, `rehydrateComposerReferences`, `watchComposerReferenceRecovery` |
| UI state 与 localStorage | [`packages/client/src/domain/controller.ts`](../../packages/client/src/domain/controller.ts) | `BranchMarkUiController`, `browserBranchMarkUiPreferenceStore` |
| DOM/Markdown 选区映射 | [`packages/client/src/domain/selection.ts`](../../packages/client/src/domain/selection.ts) | `chatNodeText`, `selectionCandidate`, `selectionOffset` |
| 选区动作与范围映射 | [`packages/client/src/domain/selection-actions.ts`](../../packages/client/src/domain/selection-actions.ts) | `selectionCreateRequests`, `selectionToolbarPosition` |
| Composer 原生引用与提交序列化 | [`packages/client/src/domain/composer-reference.ts`](../../packages/client/src/domain/composer-reference.ts), [`format.ts`](../../packages/client/src/domain/format.ts) | `clipReferenceInsert`, `createBranchMarkInputTriggerSource`, `renderClipContext` |
| 完整集合移动规则 | [`packages/client/src/domain/clip-order.ts`](../../packages/client/src/domain/clip-order.ts) | `moveClipInCollection` |
| 父子树投影 | [`packages/client/src/domain/lineage.ts`](../../packages/client/src/domain/lineage.ts) | `deriveCurrentLineage` |
| 选区监听与悬浮框 | [`packages/client/src/components/SelectionToolbar.tsx`](../../packages/client/src/components/SelectionToolbar.tsx) | `useChatSelection`, `SelectionToolbar` |
| 集合、批量命令与卡片 | [`packages/client/src/components/ClipCollection.tsx`](../../packages/client/src/components/ClipCollection.tsx), [`BatchCommandCapsule.tsx`](../../packages/client/src/components/BatchCommandCapsule.tsx), [`ClipCard.tsx`](../../packages/client/src/components/ClipCard.tsx) | `ClipCollection`, `BatchCommandCapsule`, `ClipCard` |
| Dock、引用恢复订阅与 Launcher intent | [`packages/client/src/components/BranchMarkShell.tsx`](../../packages/client/src/components/BranchMarkShell.tsx), [`BranchMarkLauncher.tsx`](../../packages/client/src/components/BranchMarkLauncher.tsx) | `BranchMarkShell`, `BranchMarkLauncherSheet` |
| Side Chat tabs 与流式 UI | [`packages/client/src/components/SideChat.tsx`](../../packages/client/src/components/SideChat.tsx) | `SideChatModelPicker`, `SideChatMessage`, `SideChatView` |
| Composer/header/sidebar entries | [`packages/client/src/components/EntryButtons.tsx`](../../packages/client/src/components/EntryButtons.tsx) | `BranchMarkSidebarButton`, `BranchMarkDrawerButton`, `BranchMarkLineageAction` |
| seed Conversation Node | [`packages/client/src/components/ForkDivider.tsx`](../../packages/client/src/components/ForkDivider.tsx) | `forkDividerDefinition`, `ForkDivider` |
| 主题与布局 CSS | [`packages/client/src/client/styles.ts`](../../packages/client/src/client/styles.ts) | `CSS`, `installBranchMarkStyles` |

## Bundle 与构建

| 主题 | 文件 |
| --- | --- |
| workspace scripts/versions | [`package.json`](../../package.json), [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) |
| Host Typert generation | [`packages/host/tsdown.config.ts`](../../packages/host/tsdown.config.ts) |
| Browser CJS ModuleLoader wrapper | [`packages/client/tsdown.config.ts`](../../packages/client/tsdown.config.ts) |
| 单包 Node/Client 双产物 | [`packages/bundle/tsdown.config.ts`](../../packages/bundle/tsdown.config.ts) |
| Bundle manifest | [`packages/bundle/package.json`](../../packages/bundle/package.json) |
| Loader patch | [`packages/bundle/cordis.patch.yml`](../../packages/bundle/cordis.patch.yml) |
| Typert identity 重发 | [`packages/bundle/src/typert.ts`](../../packages/bundle/src/typert.ts) |
| 自包含校验 | [`scripts/verify-bundle.mjs`](../../scripts/verify-bundle.mjs) |

## DSH 原生实现

| 问题 | 权威源码 |
| --- | --- |
| DSH Client 为什么拆成 Controller、UI adapter、Renderer 与 target | [Client ownership Agent Note](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/.agents/notes/implemented/architecture/2026-08-20-client-session-conversation-ownership.md) 与本课程[架构设计解读](dsh-client-architecture-rationale.md) |
| feature 间为什么使用 Service/Slot/type-only import | [Client cross-package value dependency Agent Note](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/.agents/notes/implemented/process/2026-08-23-client-cross-package-value-dependencies.md) |
| DSH Remote failure 为什么统一为 code/details vocabulary | [ctx.remote failure Agent Note](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/.agents/notes/implemented/architecture/2026-08-28-ctx-remote-failure-vocabulary.md) |
| Browser `ISessions.create/fork` 做了什么 | [`packages/api/session-controller/src/client/sessions/service.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/api/session-controller/src/client/sessions/service.ts)，搜索 `async create` / `async fork` |
| Conversation snapshot 与 Chat View 如何组合 | [`packages/client/ui-conversation/src/client`](https://github.com/deepseek-ai/deepseek-harness/tree/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-conversation/src/client) 与 [`packages/client/ui-chat/src/client`](https://github.com/deepseek-ai/deepseek-harness/tree/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-chat/src/client) |
| `atSeq` 如何推进到完整 turn | [`packages/api/session-controller/src/commands.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/api/session-controller/src/commands.ts)，搜索 `async fork(request)` |
| `parentSession`/`seedLength` 定义 | [`packages/core/session/src/types.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/core/session/src/types.ts)，搜索 `SessionHeader` |
| seed marker 如何写入 | [`packages/core/session/src/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/core/session/src/index.ts)，搜索 `session/end-seed` |
| Session 历史如何投影为 `Message[]` | [`packages/core/session/src/surface.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/core/session/src/surface.ts) 与 [`docs/subsystems/session.md`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/docs/subsystems/session.md) |
| request config 如何从日志恢复 | [`packages/core/session/src/request-header.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/core/session/src/request-header.ts)，`foldRequestHeader` |
| `BlockAssembler` 的唯一折叠算法 | [`packages/llm/llm/src/assembler.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/llm/llm/src/assembler.ts) |
| Typert decorator 与 binding | [`packages/typert/protocol/src/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/typert/protocol/src/index.ts) |
| Browser `$mount` 与 concrete namespace | [`packages/api/gateway/src/client/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/api/gateway/src/client/index.ts) |
| Client module 扫描/服务 | [`packages/client/modules`](https://github.com/deepseek-ai/deepseek-harness/tree/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/modules) 与 [`docs/subsystems/client-modules.md`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/docs/subsystems/client-modules.md) |
| Slot contracts | [`packages/client/ui-layout/src/client/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-layout/src/client/index.ts), [`ui-sidebar`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-sidebar/src/client/contract/slots.ts), [`ui-conversation`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-conversation/src/client/contract/slots.ts) |
| ReferenceInsert、clipboard projection 与 codec | [`packages/client/ui-input-trigger/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-input-trigger/README.md) 与 [`src/types.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/client/ui-input-trigger/src/types.ts) |
| Workspace membership | [`packages/workspace/workspace`](https://github.com/deepseek-ai/deepseek-harness/tree/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/workspace/workspace) |
| storageDomain write semantics | [`packages/storage/storage-domain`](https://github.com/deepseek-ai/deepseek-harness/tree/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/storage/storage-domain) |
| FS containment API | [`packages/fs/fs/src/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/fs/fs/src/index.ts) |
| Web provider selection | [`packages/web/web/src/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/packages/web/web/src/index.ts) |

## 测试入口

- Host 行为：[`packages/host/tests/branchmark.spec.ts`](../../packages/host/tests/branchmark.spec.ts)，组合 helper 在 [`helpers.ts`](../../packages/host/tests/helpers.ts)。
- Browser domain：[`packages/client/tests/domain.spec.ts`](../../packages/client/tests/domain.spec.ts)。
- Bundle manifest：[`packages/bundle/tests/bundle.spec.ts`](../../packages/bundle/tests/bundle.spec.ts)。
- Built artifact invariant：[`scripts/verify-bundle.mjs`](../../scripts/verify-bundle.mjs)。

## 常用检索命令

```sh
rg -n "@Remote|bindTypertRemote" packages/host/src
rg -n "sessions\.fork|sessions\.create|recordDerivedSession" packages/client/src
rg -n "attachClipsToComposer|rehydrateComposerReferences|moveClipInCollection" packages/client/src
rg -n "pinnedAt|sortIndex|kind: 'reorder'" packages/host/src packages/client/src
rg -n "shell\.overlay|conversation\.input|conversation\.chat\.node" packages/client/src
rg -n "ctx\.llm|BlockAssembler|executeTool" packages/host/src/side-chat.ts
rg -n "parentSession|seedLength|session/end-seed" ../packages/core/session ../packages/api/session-controller
```

从符号进入，再阅读相邻类型、测试和官方 subsystem 文档。只搜同名字符串容易把 Client `ISessions`、Host Session Controller 和低层 `SessionStore.fork` 混为一个行为。
