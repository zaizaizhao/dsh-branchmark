# DSH 既有插件与依赖矩阵

本插件没有重新实现模型适配器、Session Store、持久化、Workspace、文件系统、Web provider、RPC carrier 或 UI shell。它是这些 DSH 能力的 Consumer，并新增 Clip 领域逻辑与 Side Chat 产品层。本页回答“依赖谁”；为什么 DSH 把 Client 能力拆给这些所有者，见 [DSH Client 架构设计解读](dsh-client-architecture-rationale.md)。

表格对应当前 BranchMark 的 DSH `0.1.2-alpha.5` 依赖图。未发布 master 保留这些能力角色，但把 `SessionPersistence` 的读取入口改成 handle；升级时同时查看[兼容性清单](compatibility-and-limitations.md)与[第 13 章](../tutorials/13-dsh-prerelease-upgrade.md)。

## Host 运行依赖

[`BranchMarkService.static inject`](../../packages/host/src/index.ts) 声明七个必需服务。Cordis 只有在它们都可见时才激活 Service。

| `ctx` 服务 | DSH Service Definition / 关键包 | Web profile 中的提供者 | 本插件用途 |
| --- | --- | --- | --- |
| `ctx.storageDomain` | `@deepseek-ai/dsh-storage-domain` | `dsh-web-app` 装载 `dsh-storage`、`dsh-storage-json`、`dsh-storage-domain` | 打开 `clip_explorer` domain，持久化 Clip 与衍生关系 |
| `ctx.sessionPersistence` | `@deepseek-ai/dsh-session-persistence` | `dsh-base` 默认装载 `dsh-session-persistence-jsonl` | 检查来源消息、读取完整事件前缀、验证 child header |
| `ctx.sessions` | `@deepseek-ai/dsh-session` | `dsh-base` 的 `session` 行 | 取得已挂载 child，并追加 `recall` 消息 |
| `ctx.workspaceRegistry` | `@deepseek-ai/dsh-workspace` | `dsh-web-app` 的 `workspace` 行 | 验证 Workspace 存在、Session 成员关系和项目根路径 |
| `ctx.llm` | `@deepseek-ai/dsh-llm` | `dsh-base` 的 `llm`，再由 `dsh-llm-deepseek`/`dsh-llm-pi-ai` 注册 provider | Side Chat 模型目录、配置解析、摘要与回答流 |
| `ctx.fs` | `@deepseek-ai/dsh-fs` | `dsh-base` 默认 `dsh-fs-sandbox` | 项目路径解析、containment、只读文件操作 |
| `ctx.web` | `@deepseek-ai/dsh-web` | `dsh-base` 的 `web` 与 search provider | Side Chat Web search/fetch 调用入口 |

`type {}` imports in Host 源码只引入 Cordis `Context` declaration merges，不会在运行时装载提供者。真正的运行依赖由 `static inject` 和 profile 组合决定。

## Host 的 RPC 构建与运行依赖

| 包 | 角色 | 本插件如何使用 |
| --- | --- | --- |
| `@deepseek-ai/cordis` | 插件生命周期、Service、Context、effect | `BranchMarkService extends Service`，资源在 effect disposer 中释放 |
| `@deepseek-ai/dsh-typert-protocol` | `@Remote`、`bindTypertRemote` 与共享协议类型 | 标记 14 个 unary Host 方法，绑定 `branchmark` namespace |
| `@deepseek-ai/dsh-typert-generator` | 构建期严格分析与 codec 生成 | Host `tsdown` 生成 `typert.host.*` 与 `typert.remote-client.*` |
| `@deepseek-ai/dsh-typert-registry` | Host descriptor/codec 注册 | Bundle 重发 Typert contribution，DSH Loader 装载 |
| `@deepseek-ai/dsh-api-gateway` | Host 调用分发与 Browser `ctx.remote` | 校验 args/result，调用 live `BranchMarkService` |
| `@deepseek-ai/schemastery` | Cordis 插件配置 schema | 校验所有 byte/item/tool 上限和摘要模型配置字段 |
| `zod` | durable record schema | 校验 domain 中的 Clip、relation 与 usage 记录 |

Remote 是 unary RPC，不是流式通道。Side Chat 的流被 Host 消费并压缩成 snapshot；Browser 通过 `getSideChat` 短轮询观察进度。

## Browser 运行依赖

Bundle `package.json#dsh.client.inject` 声明浏览器 factory arrival 依赖和插件组合元数据，但不规定 Cordis apply 顺序；Client 模块自身的 `export const inject` 声明 Cordis 服务激活依赖。两者名字相似，但解决的问题不同。

列表比旧聚合入口更长是有意结果：API Controller 拥有 React-free 领域状态，UI adapter 提供标准 source，UI Conversation 负责 target-neutral assembly，UI Chat 负责具体 Chat projection，UI Renderer 只绑定通用 Slot。显式 roster 让缺失依赖在组合或激活阶段暴露，而不是由一个 Runtime facade 隐藏。

| DSH Client 包 | 提供能力 | 本插件使用点 |
| --- | --- | --- |
| `@deepseek-ai/dsh-api-gateway/client` | `ctx.remote` 与 `remote.<namespace>` Service | `$mount(branchmarkRemote)`，随后调用 `remote.branchmark.*` |
| `@deepseek-ai/dsh-api-session-controller/client` | `ctx.sessions`、Session list、scope 与 binding | `create/fork/open`、`Session.prompt`、lineage summaries |
| `@deepseek-ai/dsh-api-workspace-controller/client` | `ctx.workspaces` 与纯 Workspace snapshot | Session→Workspace 映射和最近活跃项目选择 |
| `@deepseek-ai/dsh-client-ui-renderer/client` | `ctx.slots` registry | 注册五个 BranchMark Slot entry |
| `@deepseek-ai/dsh-client-ui-session/client` | 标准 `useSessions` Slot prop | Shell、Sidebar 与 Header 的响应式 Session 投影 |
| `@deepseek-ai/dsh-client-ui-workspace/client` | 标准 `useWorkspaces` Slot prop | Workspace snapshot 变化驱动 BranchMark 入口重渲染 |
| `@deepseek-ai/dsh-client-ui-slots` | 类型化 Slot registry | `PropsRuntime`、五个 Slot 注册 |
| `@deepseek-ai/dsh-client-ui-layout/client` | `shell.overlay` | 内嵌 Dock、最小化把手、Toast 与选区工具条 |
| `@deepseek-ai/dsh-client-ui-sidebar/client` | `sidebar.footer.action` | 项目枝签入口 |
| `@deepseek-ai/dsh-client-ui-conversation/client` | Composer/Header/Chat slots、Session input state、Conversation binding 与事件定义 | 输入区入口、`insertReference()`、draft mirror 观察、lineage badge、fork divider 与 Conversation snapshot |
| `@deepseek-ai/dsh-client-ui-chat/client` | Chat View 节点和 `ChatNodeDataMap` | 从 `snapshot.views.get('chat')` 读取消息节点并映射选区 anchor |
| `@deepseek-ai/dsh-client-ui-input-trigger/client` | `ReferenceInsert`、source registry、clipboard projection 与提交 codec | 短引用 Chip、可解析恢复 token、提交时 Clip 上下文序列化 |
| `@deepseek-ai/dsh-client-ui-primitives` | 图标、`MarkdownText`、Popover 与 Modal | 主题一致的命令、Markdown/reasoning、引用列表和专注阅读 |
| `@deepseek-ai/dsh-client-locale` | Client 模块依赖图的 locale 基础 | 当前 UI 文案是插件内中文常量，但模块图仍在 Web UI 依赖之后装载 |

浏览器入口在 [`packages/client/src/client/index.tsx`](../../packages/client/src/client/index.tsx) 先挂载 generated Remote contribution，再进入 `ctx.inject(['remote.branchmark'])` 注册 UI。这样每个 UI 组件第一次执行时，namespace 方法已经存在。

## DSH UI Slot 使用表

| Slot | 类型 | 本插件内容 | 为什么选它 |
| --- | --- | --- | --- |
| `shell.overlay` | root list | Selection toolbar、Dock、最小化把手、Toast | Frame 级叠加且底层 click-through，不替换主布局 |
| `sidebar.footer.action` | root list | 项目枝签入口 | 添加到 Settings 附近，不接管整个 sidebar |
| `conversation.input.left` | session list | 当前会话枝签入口 | 小型常驻 Composer 工具按钮 |
| `conversation.session.header.actions` | session list | 衍生关系 badge | 在标题旁增加动作，不替换 header |
| `conversation.chat.node` | session keyed | `session/end-seed` 分隔线 | 可回放的业务节点，和 Session event 对齐 |

Slot 的声明、owner props 与 inject face 以 DSH 源码为准：[`ui-layout` shell contract](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/packages/client/ui-layout/src/client/index.ts)、[`ui-sidebar` contract](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/packages/client/ui-sidebar/src/client/contract/slots.ts) 和 [`ui-conversation` contract](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/packages/client/ui-conversation/src/client/contract/slots.ts)。

## 本插件没有使用的 DSH 能力

| 能力 | 未使用原因 |
| --- | --- |
| `ctx.subagents` 与 `dsh-tool-subagent` | 产品需要可在普通侧边栏继续的 Session 分支，不是由父 agent 控制的子代理 activation |
| `ctx.tools.register()` | Side Chat 的工具不是父 Session 工具目录的一部分；它们是临时调用中固定的 `ToolSchema[]` 和 Host-owned dispatch |
| `ctx.agentLoop` | Side Chat 直接调用 `ctx.llm.stream`；普通 Session 的问题仍由 DSH 自己的 loop 处理 |
| DSH 原生侧边栏 tree 修改 | 插件只读取 `SessionSummary.parentId` 并在自己的 Dock 投影关系 |
| 自定义 persistence backend | Clip 使用 `storageDomain`，普通 Session 使用宿主配置的 persistence provider |
| Shell、写文件、审批和权限升级 | Side Chat 被产品规则限制为最小只读工具集合 |

## Profile 前提

标准 Web profile 已装载绝大多数依赖，具体行见 DSH [`dsh-base` patch](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/packages/bundle/base/cordis.patch.yml) 与 [`dsh-web-app` patch](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/packages/bundle/web-app/cordis.patch.yml)。如果用户移除任一 required Service，Cordis 会让 BranchMark 保持 pending，而不是在缺少能力时以降级逻辑运行。

`ctx.web` 存在不代表 search 与 fetch 都可用。Provider 是运行时选择的独立层；默认 Web profile 有 DeepSeek search provider，但没有 fetch provider。插件会把该错误作为工具结果交给模型和 UI，部署者若需要 fetch 必须显式安装/配置一个 provider。
