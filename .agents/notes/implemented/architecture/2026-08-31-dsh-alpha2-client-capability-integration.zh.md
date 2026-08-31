# Agent Note：DSH alpha.2 Client 能力集成

Status: implemented

[English](2026-08-31-dsh-alpha2-client-capability-integration.md) | 中文

## 问题

DSH `0.1.2-alpha.2` 不发布 `@deepseek-ai/dsh-client-runtime`。它通过 API Controller 提供 Session 与 Workspace 状态，通过 UI Conversation binding 提供 Conversation 状态，通过带 key 的 Chat View 提供 Chat node，并通过 Session 与 Workspace UI package 提供标准 Slot Hook。

BranchMark 必须使用这些所有者，同时避免让它们的投影扩散到整个组件树，也不能在一个浏览器依赖图中同时装载 rc.2 与 alpha.2 的框架身份。

## 决策

BranchMark `0.4.x` 只面向 DSH `0.1.2-alpha.2`。Bundle 的 Client inject 列表声明 API Session/Workspace Controller，以及 UI Renderer、Session、Workspace、Conversation、Chat、Layout、Sidebar、Input Trigger、Locale 和 Gateway 模块。

`BranchMarkClient` 继续作为浏览器集成模块。它拥有 Session 创建与分叉、Workspace 选择、UI Conversation 快照查找、Composer admission、Typed Remote 调用和业务错误翻译。组件接收 branded id、标准 Slot props、BranchMark controller 状态与该模块，不直接读取 DSH Controller 内部投影。

该模块优先解析当前 Session 的 Workspace。没有当前 Session 时，它选择所含 Session 的 `updatedAt` 最新的 Workspace，以 Workspace 顺序作为稳定的相同时刻决胜规则，并以 `createdAt` 表示空 Workspace 的活跃时间。该算法与 DSH Workspace 导航规则一致，且不依赖私有 UI 状态。

Conversation 选区读取 `ctx.uiConversation.binding(sessionBinding).snapshot`，再读取 `snapshot.views` 中的 `chat` entry。Conversation event definition 通过 `ctx.uiConversation.events` 注册；Chat node data 扩展 UI Chat package。clips-only 创建直接调用公开的 `ISessions.create` 方法。

## 考虑过的替代方案

**保留 `dsh-client-runtime@0.1.1-rc.2`。** 未采用，因为它会生成混合依赖图，使 Cordis scope、invariant、Session 类型和 Controller service 使用不兼容版本。

**在运行时检测两种 DSH 布局。** 未采用，因为 package import、declaration merging、Client inject metadata 和 bundle external 在运行前已经不同。单一产物会携带两套框架布局，并让每个组件感知兼容策略。

**再创建一个透传 adapter interface。** 未采用，因为 `BranchMarkClient` 已经提供有效接缝。只有一个实现的新 interface 不会隐藏更多行为或改善测试面，只会增加间接层。

## 结果

BranchMark 只有一个受支持的 DSH package family 和一个浏览器集成所有者。Host 存储、来源验证、Side Chat、Remote 方法、持久 Clip 记录和衍生 Session 记录保持不变。后续 DSH Client 变化应集中在 `BranchMarkClient`、Browser assembly、面向 Slot 的类型 import 与 Bundle manifest。

## 验证

Client 测试覆盖当前 Workspace 选择、UI Conversation 快照查找、Remote 失败归一化、Chat View 选区锚点、Session launch、Composer 引用和 UI 状态。package 检查覆盖 Host、Client 与 Bundle 类型检查、全部单元测试、自包含产物、发布元数据、干净的 alpha.2 依赖图，以及安装到全新 DSH Web profile。
