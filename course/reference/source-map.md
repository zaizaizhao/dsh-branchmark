# 源码导航

本页按“找一个行为应该先读哪里”组织。行号基于课程锚点；文件变化后优先搜索符号名，不要依赖旧行号。

## BranchMark Host

| 主题 | 文件与当前范围 | 入口符号 |
| --- | --- | --- |
| Service、配置、生命周期 | [`packages/host/src/index.ts`](../../packages/host/src/index.ts)，约 35–137 | `Config`, `BranchMarkService`, `Service.init` |
| Side Chat Remote | 同文件，约 139–223 | `createSideChat` 至 `closeSideChat` |
| Clip CRUD/检索 | 同文件，约 225–408 | `create`, `list`, `update`, `setStatus`, `deleteForever`, `batchUpdate` |
| 衍生关系与 recall | 同文件，约 410–545 | `recordDerivedSession`, `listRelations` |
| 来源与 fork 校验 | 同文件，约 547–694 | `resolvePersistedSource`, `matchesDerivedHeader`, `expectedForkSeedLength` |
| 公共 DTO 与 failures | [`packages/host/src/types.ts`](../../packages/host/src/types.ts) | `Clip`, `DerivedSessionRelation`, `SideChatSnapshot`, `ClipFailure` |
| Zod/domain spec | [`packages/host/src/spec.ts`](../../packages/host/src/spec.ts) | `clipSchema`, `derivedSessionRecordSchema`, `branchMarkDomainSpec` |
| Side Chat context/LLM/tools | [`packages/host/src/side-chat.ts`](../../packages/host/src/side-chat.ts) | `TemporarySideChatRuntime`, `TOOLS`, `sourcePrefix`, `contextSplitIndex`, `summaryTranscript`, `prepareContext`, `answer`, `executeTool` |

## BranchMark Browser

| 主题 | 文件 | 入口符号 |
| --- | --- | --- |
| Remote mount 与 Slot 组装 | [`packages/client/src/client/index.tsx`](../../packages/client/src/client/index.tsx) | `inject`, `apply` |
| Remote/Session 编排 | [`packages/client/src/domain/client.ts`](../../packages/client/src/domain/client.ts) | `BranchMarkClient`, `launch` |
| UI state 与 localStorage | [`packages/client/src/domain/controller.ts`](../../packages/client/src/domain/controller.ts) | `BranchMarkUiController`, `browserBranchMarkUiPreferenceStore` |
| DOM/Markdown 选区映射 | [`packages/client/src/domain/selection.ts`](../../packages/client/src/domain/selection.ts) | `chatNodeText`, `selectionCandidate`, `selectionOffset` |
| 选区动作与范围映射 | [`packages/client/src/domain/selection-actions.ts`](../../packages/client/src/domain/selection-actions.ts) | `selectionCreateRequests`, `selectionToolbarPosition` |
| Composer 原生引用与提交序列化 | [`packages/client/src/domain/composer-reference.ts`](../../packages/client/src/domain/composer-reference.ts), [`format.ts`](../../packages/client/src/domain/format.ts) | `clipReferenceInsert`, `createBranchMarkInputTriggerSource`, `renderClipContext` |
| 父子树投影 | [`packages/client/src/domain/lineage.ts`](../../packages/client/src/domain/lineage.ts) | `deriveCurrentLineage` |
| 选区监听与悬浮框 | [`packages/client/src/components/SelectionToolbar.tsx`](../../packages/client/src/components/SelectionToolbar.tsx) | `useChatSelection`, `SelectionToolbar` |
| 集合与卡片 | [`packages/client/src/components/ClipCollection.tsx`](../../packages/client/src/components/ClipCollection.tsx), [`ClipCard.tsx`](../../packages/client/src/components/ClipCard.tsx) | `ClipCollection`, `ClipCard` |
| Dock 与 Launcher | [`packages/client/src/components/BranchMarkShell.tsx`](../../packages/client/src/components/BranchMarkShell.tsx), [`BranchMarkLauncher.tsx`](../../packages/client/src/components/BranchMarkLauncher.tsx) | `BranchMarkShell`, `BranchMarkLauncherSheet` |
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
| Browser `SessionRuntime.create/fork` 做了什么 | [`packages/client/runtime/src/client/sessions/service.ts`](../../../packages/client/runtime/src/client/sessions/service.ts)，搜索 `async create` / `async fork` |
| `atSeq` 如何推进到完整 turn | [`packages/host/apiproxy/src/api-proxy.ts`](../../../packages/host/apiproxy/src/api-proxy.ts)，搜索 `async fork(request)` |
| `parentSession`/`seedLength` 定义 | [`packages/core/session/src/types.ts`](../../../packages/core/session/src/types.ts)，搜索 `SessionHeader` |
| seed marker 如何写入 | [`packages/core/session/src/index.ts`](../../../packages/core/session/src/index.ts)，搜索 `session/end-seed` |
| Session 历史如何投影为 `Message[]` | [`packages/core/session/src/surface.ts`](../../../packages/core/session/src/surface.ts) 与 [`docs/subsystems/session.md`](../../../docs/subsystems/session.md) |
| request config 如何从日志恢复 | [`packages/core/session/src/request-header.ts`](../../../packages/core/session/src/request-header.ts)，`foldRequestHeader` |
| `BlockAssembler` 的唯一折叠算法 | [`packages/llm/llm/src/assembler.ts`](../../../packages/llm/llm/src/assembler.ts) |
| Typert decorator 与 binding | [`packages/typert/protocol/src/index.ts`](../../../packages/typert/protocol/src/index.ts) |
| Browser `$mount` 与 concrete namespace | [`packages/api/gateway/src/client/index.ts`](../../../packages/api/gateway/src/client/index.ts) |
| Client module 扫描/服务 | [`packages/client/modules`](../../../packages/client/modules) 与 [`docs/subsystems/client-modules.md`](../../../docs/subsystems/client-modules.md) |
| Slot contracts | [`packages/client/ui-layout/src/client/index.ts`](../../../packages/client/ui-layout/src/client/index.ts), [`ui-sidebar`](../../../packages/client/ui-sidebar/src/client/contract/slots.ts), [`ui-conversation`](../../../packages/client/ui-conversation/src/client/contract/slots.ts) |
| Workspace membership | [`packages/workspace/workspace`](../../../packages/workspace/workspace) |
| storageDomain write semantics | [`packages/storage/storage-domain`](../../../packages/storage/storage-domain) |
| FS containment API | [`packages/fs/fs/src/index.ts`](../../../packages/fs/fs/src/index.ts) |
| Web provider selection | [`packages/web/web/src/index.ts`](../../../packages/web/web/src/index.ts) |

## 测试入口

- Host 行为：[`packages/host/tests/branchmark.spec.ts`](../../packages/host/tests/branchmark.spec.ts)，组合 helper 在 [`helpers.ts`](../../packages/host/tests/helpers.ts)。
- Browser domain：[`packages/client/tests/domain.spec.ts`](../../packages/client/tests/domain.spec.ts)。
- Bundle manifest：[`packages/bundle/tests/bundle.spec.ts`](../../packages/bundle/tests/bundle.spec.ts)。
- Built artifact invariant：[`scripts/verify-bundle.mjs`](../../scripts/verify-bundle.mjs)。

## 常用检索命令

```sh
rg -n "@Remote|bindTypertRemote" packages/host/src
rg -n "SessionRuntime\.fork|SessionRuntime\.create|recordDerivedSession" packages/client/src
rg -n "shell\.overlay|conversation\.input|conversation\.chat\.node" packages/client/src
rg -n "ctx\.llm|BlockAssembler|executeTool" packages/host/src/side-chat.ts
rg -n "parentSession|seedLength|session/end-seed" ../packages/core/session ../packages/host/apiproxy
```

从符号进入，再阅读相邻类型、测试和官方 subsystem 文档。只搜同名字符串容易把 Client convenience API、Host API Proxy 和低层 `SessionStore.fork` 混为一个行为。
