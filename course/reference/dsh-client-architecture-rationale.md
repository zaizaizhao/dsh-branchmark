# DSH Client 架构设计解读

本页专门回答 DSH `0.1.2-rc.1` Client 为什么由多个明确所有者组成，以及这种设计给插件开发带来的收益和代价。它不是包名迁移表；需要查“BranchMark 引入哪个包”时看[依赖矩阵](dsh-dependency-map.md)，需要执行升级时看[兼容性清单](compatibility-and-limitations.md)。

## 证据边界

“为什么 DSH 开发人员这样设计”不能仅靠目录名称推断。本页按三种证据强度陈述：

| 标记 | 含义 | 本页如何使用 |
| --- | --- | --- |
| DSH 明确决策 | 当前 commit 中的 implemented Agent Note 直接记录 Problem、Decision、Alternatives 与 Consequences | 用于说明设计动机、拒绝的替代方案和已接受代价 |
| 当前实现事实 | package README、公开类型、profile composition 与测试可直接观察 | 用于说明 API、所有者和运行时关系 |
| BranchMark 工程解读 | 从前两类证据推导对本插件的影响 | 只说明插件为什么这样接入，不冒充 DSH 作者原话 |

课程版本锚点 `a66e4702047846cdaa10c66c9d3df3951f5ea70d` 的源码和 DSH 自己的 implemented Agent Notes 是本页依据；搜索索引或未固定版本的页面只用于发现资料，不能覆盖这一版本的源码事实。

## 一句话结论

DSH Client 采用“Controller 和领域对象 → UI adapter → renderer → Slot component”的单向分层，并且没有聚合 Runtime facade。每一层只拥有一种状态和生命周期，具体业务通过 Cordis Service、标准 source 或 Slot 注册协作。

```text
Remote / Host protocol
        │
        ▼
API Controller + React-free domain objects
        │ observable source / binding
        ▼
ui-* adapter
        │ standard source registration
        ▼
ui-renderer
        │ selector hooks + Slot props
        ▼
business Slot component
```

这个分层由 DSH 的 [Client Session、Conversation 与 UI 所有权决策](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/architecture/2026-08-20-client-session-conversation-ownership.md)明确记录。该决策还明确拒绝保留 Runtime facade，因为聚合入口会继续成为依赖中心，并允许新代码绕过领域所有者。

## 1. 为什么删除聚合 Client Runtime

DSH 的决策记录指出，一个通用 Runtime 同时持有 Session/Workspace 对象、事件窗口、Conversation 组装、React hooks、Slot registry 与 Store engine 时，协议状态、业务投影、React binding 和页面展示共享同一个依赖中心。任一层变化都可能扩散到整个前端，Session snapshot 也容易积累不属于 Session 的 Chat node、Conversation view 和交互状态。

删除聚合 Runtime 解决的不是“文件太大”，而是所有权不清：

| 聚合设计产生的问题 | 当前设计 | 直接收益 |
| --- | --- | --- |
| Session snapshot 容纳事件、视图和展示状态 | Session Controller 只发布 Session 生命周期与控制事实 | 普通 Session consumer 不必理解 Chat 和事件回放 |
| Renderer 知道 Session、Workspace、Conversation 等业务类型 | Renderer 只实现通用 source→hook 与 Slot outlet | 新业务不会给 renderer 增加 switch 分支 |
| React hook、传输和领域对象共享生命周期 | Controller 领域对象保持 React-free，UI adapter 单独接入 React | 非 React consumer 可以复用对象层，测试不必挂 React tree |
| 其他 feature 通过 Runtime 转发彼此的值 | 跨 feature 协作改用 Service、Slot 或 type-only import | 插件可独立装载、卸载和重载，依赖方向可检查 |
| 一个中央 facade 隐藏真实依赖 | Bundle 显式装载 Controller、adapter、target 与 renderer | 缺少能力时失败位置明确，组合者能看见实际 roster |

BranchMark 因此不应该寻找“新的 `client-runtime` 替代包”。正确动作是按需要注入多个所有者，并把跨 DSH 能力的调用集中在插件自己的 [`BranchMarkClient`](../../packages/client/src/domain/client.ts)，而不是重新制造一个承载 DSH 全部状态的通用 Runtime。

## 2. 当前包为什么这样分工

当前所有权不是按“代码看起来都属于前端”划分，而是按状态语义和生命周期划分：

| 所有者 | 拥有 | 不拥有 |
| --- | --- | --- |
| API Session Controller | Session list、选择、binding、命令、projection、queue 和连续事件窗口 | Conversation target、React、Slot、Workspace 导航策略 |
| API Workspace Controller | Workspace rows、顺序、archive 状态、命令和纯 snapshot | React、Session 对象和跨 Controller 导航策略 |
| UI Session | Session scope、标准 Session sources、React adapter | Session transport、Chat/Conversation 业务投影 |
| UI Workspace | Workspace hooks、Workspace UI 和跨 Controller 的即时导航决策 | Workspace transport、Session 数据副本 |
| UI Conversation | target-neutral event assembly、per-Session binding、view registry、输入与共享 shell | Chat/Trajectory 具体 snapshot 和 Session transport |
| UI Chat | Chat definitions、keyed nodes、order、selection、details 和 Chat renderer | Session 生命周期、通用 target 导航、Trajectory |
| UI Renderer | Slot registry、scope binding、observable→hook、React root | 任何 Session/Workspace/Conversation 业务规则 |
| Client Store | React-free snapshot/store 基础 | Session、Workspace、Remote stream 与连接 generation |

当前接口和限制分别由 [Session Controller README](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/packages/api/session-controller/README.md)、[Workspace Controller README](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/packages/api/workspace-controller/README.md)、[UI Conversation README](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/packages/client/ui-conversation/README.md)和 [UI Chat README](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/packages/client/ui-chat/README.md)定义。

这种拆分的核心收益是“一份事实只有一个 owner”。跨领域决策可以同时读取两个 source 后立即发出命令，但不把组合结果写回第三份长期 snapshot。例如 Workspace UI 可以读取 Workspace 和 Session 列表决定打开哪个 Session，却不需要发明一个同时复制两类实体的 WorkspaceRuntime。

## 3. 为什么 Controller 与 React adapter 分开

API Controller 面向协议和领域生命周期。它需要在没有 React 的测试、动态插件和其他 Client consumer 中工作，因此只发布 React-free observable source、binding 和命令。UI adapter 才把 source 注册为标准 Hook 和 Slot props，UI Renderer 只负责把通用 source 绑定到 `useSyncExternalStore`。

这种分离带来四个具体好处：

1. Controller 的传输、并发和恢复逻辑可以在纯对象测试中验证，不需要 DOM。
2. React tree 重新挂载不会创建第二条 Session history stream 或复制领域状态。
3. 同一个 Controller source 可以被多个 UI package 使用，但 Renderer 不需要认识这些业务类型。
4. 生命周期失败更容易定位：Host/Remote 问题属于 Controller，Hook materialization 属于 adapter，展示错误属于具体 Slot component。

代价是插件必须明确注入 API Controller、对应 UI adapter 和 Renderer，不能只依赖一个总入口。DSH 接受了这项组合成本，因为显式依赖比隐藏的中央耦合更容易测试、替换和卸载。

## 4. 为什么 Conversation 与 Chat 分开

Session Controller 只维护连续的逻辑事件窗口；它不解释 Assistant、Tool、Compaction、Retry 或 BranchMark 的 `session/end-seed`。UI Conversation 负责 target-neutral assembly：按稳定业务 id 匹配事件、维护 Context 与 Turn/Step location，并为已注册 target 构建 snapshot。UI Chat 是其中一个 target，拥有 Chat node、顺序、selection 和 renderer；Trajectory 可以用同一事件窗口构建不同投影。

DSH 的 [Conversation node assembly 决策](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/architecture/2026-08-09-client-conversation-node-assembly.md)记录了该设计解决的问题：如果 Session 或 React renderer 直接解释所有业务事件，新增一种节点就要修改中央 switch、历史回放、缓存和 React 分组；运行中的 Assistant/Tool 在完成时还可能跨 React parent 移动并被重挂载。

带 key 的 Chat snapshot 把身份和位置分开：

```text
Conversation context key = kind + stable business id
ChatSnapshot.order      = 当前显示顺序中的 key[]
ChatSnapshot.nodes      = 按 key 读取当前 node 的稳定 store
```

因此节点数据和位置改变时可以保留同一个 React seat；live append 只更新命中的 Context，不扫描全部历史；历史 prepend 只重放受到新证据、location 或 predecessor 影响的 Context。高频 token 仍逐条折叠，但 publication 可以合并到每个 animation frame 一次。

BranchMark 的选区属于 Chat 展示语义，所以先取得 `ctx.uiConversation.binding(sessionBinding)` 的 target-neutral snapshot，再显式读取 `snapshot.views.get('chat')`。`ForkDivider` 则把 `session/end-seed` 注册为一个 Conversation definition；它不要求修改 Session Controller 的业务 switch。

这里的设计好处不是“多一层抽象”，而是让共享的事件排序、分页、稳定身份和生命周期只实现一次，同时让 Chat 与 Trajectory 独立决定自己的最终数据和展示。代价是 target 作者必须理解稳定 id、start/update、forward replay 和 keyed publication 规则。

## 5. 为什么每个 Session 使用 binding

`ctx.sessions.binding(sessionId)` 返回 Session Controller 拥有的稳定 binding。`ctx.uiConversation.binding(binding)` 在同一 Session 生命周期内返回稳定的 Conversation binding，并复用 Session 已打开的事件 source，而不是再建立一条 history/follow 连接。

Session binding 自带 Cordis Context 和 Fiber。依赖该 Session 的资源通过 `binding.ctx.effect()` 注册清理；释放 binding 时，Conversation binding、标准 source materialization 和 scoped stores 按生命周期自动释放，Session Controller 不需要维护一份“所有上层 consumer 回调列表”。

对插件的直接收益是：

- 不需要缓存一份 Session→Conversation snapshot 映射并手动失效。
- 切换 Session 不会让插件打开重复的历史流。
- 插件卸载或 Session release 时，注册项和订阅可沿 Cordis disposer 反向清理。
- 测试可以按 binding 生命周期验证创建、更新和释放，而不是依赖页面是否恰好卸载组件。

BranchMark 的 `sessionSnapshot()` 每次从官方 binding 获取当前 snapshot，只把 lookup 集中在 `BranchMarkClient`；组件不持有 Controller 内部对象。

## 6. 为什么跨 feature 协作改用 Service、Slot 与 type-only import

DSH 的 [Client 跨包值依赖决策](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/process/2026-08-23-client-cross-package-value-dependencies.md)指出，feature package 之间的 runtime value import 会把普通依赖变成同步 module-table 装载顺序约束。即使 manifest 用 external 声明顺序，feature 仍然在运行时绑定到另一个 feature 的实现和生命周期。

当前分类规则是：

| 跨包内容 | 正确方式 | 原因 |
| --- | --- | --- |
| 共享声明 | `import type` 声明 owner 的类型 | 编译后无 runtime edge，保留单一类型权威 |
| 有状态、可调用或有生命周期的行为 | 注入 Cordis Service | provider 拥有实现和 disposer，consumer 只依赖接口与 service key |
| 展示贡献 | 注册到 owner 声明的 Slot | owner 控制位置，contributor 可独立装卸 |
| 无状态通用 helper | 狭窄 utility 或 UI primitive | 只有跨业务仍保持同一语义的纯函数才共享 |
| target-specific projection | 各 target 本地实现 | Chat 与 Trajectory 可以独立演进，代码相似不等于共享 owner |

好处是 feature loading order 由 Cordis Service 与 Slot activation 决定，而不是由同步 import 偶然决定；HMR、失败和卸载也遵循插件生命周期。代价是一些短小 target projection 会有意保留两份实现，并且 bundle composition 必须显式声明 service roster。

BranchMark 遵循相同思路：`BranchMarkClient` 是插件自己的跨 DSH 能力集成模块，React components 只接收它、branded ids、标准 Slot props 和 `BranchMarkUiController` 状态。组件不会直接抓取多个 DSH Controller 内部字段，也不会把 DSH feature implementation 当作普通工具函数导入。

## 7. 为什么 DSH 统一 Remote failure

DSH 的 [ctx.remote failure 决策](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/architecture/2026-08-28-ctx-remote-failure-vocabulary.md)把各领域自己的 error class、mapping function 和 carrier code table 收敛为一个 merge-extensible `RemoteErrorDetailsMap`、一个 `RemoteError` class 和 `<domain>/<reason>` code。Host 在失败点抛出，Gateway 编码 `{ code, message, details }`，Client 通过 `RemoteResult<T>` 或 `isRemoteFailure()` 消费。

这项设计解决了三个问题：

1. 同一个错误 code 不再同时维护在领域、carrier 和 consumer cast 中。
2. `session/not-found` 这类带领域前缀的 code 直接表明所有者，跨领域转发不需要复制一个无前缀枚举。
3. Host、Browser 和 Worker 可能各自 bundle 一份 class，`instanceof` 跨 realm 不可靠，因此 discrimination 读取结构标记和 `code`。

结果是新增 DSH domain failure 通常只需要一次 declaration merge 和一次 throw，`details` 会随 code 在 TypeScript 中自动收窄；未分类异常只在 Gateway 一处折叠为 `gateway/internal`，不会被伪装成看似正常的业务拒绝。

BranchMark 当前仍有两层结果：外层是 DSH Gateway 的 `RemoteResult`，内层是插件自己的 `ClipSuccess | ClipRejected`。[`BranchMarkClient.unwrap()`](../../packages/client/src/domain/client.ts)集中处理这两层，避免组件重复判断；但内层结果是 BranchMark 的协议选择，不是 DSH rc.1 要求。若从零设计一个只面向当前 DSH 的新 Remote namespace，可以让 Host 在业务失败点使用 DSH `RemoteError`，使方法直接产生单层 `RemoteResult<T>`。

这一区别值得保留在课程里：适配最新 API 不等于自动采用最新设计的每项收益。BranchMark 已经使用统一的 `ctx.remote` Client surface，但其业务错误 DTO 仍可在未来单独简化。

## 8. 为什么 Session 创建和分叉属于 API Session Controller

`ctx.sessions` 的公开 `ISessions` 是 feature package 可以操作 Session 领域的外向接口。其源码明确说明，扩大这个 interface 就是在显式扩大 feature 对 Session domain 的权限；具体 Session manager 和 transport 实现不属于调用者。

把 `create`、`fork`、`open` 和 `binding` 放在同一个领域 owner 有三个好处：

- 创建完成时可以保证本地 binding 已经可寻址，调用者不用猜 Remote 列表何时同步。
- fork 的完整 turn 边界、父子 header 和失败语义由 Session owner 统一实现，插件不复制历史协议。
- Workspace UI 可以保留“复用 blank Session”这种导航策略，而严格创建新 Session 的业务调用直接使用 `ISessions.create`，两种语义不会混在一个方法里。

BranchMark 的 clips-only 必须创建全新的普通 Session，因此调用 `ctx.sessions.create({ workspaceId })`；full-fork 调用 `ctx.sessions.fork({ sessionId, atSeq })`。它不依赖具体 `SessionRuntime` class，也不把 Workspace navigation helper 冒充 Session domain command。

## 9. 为什么 Bundle inject 列表变长反而更健康

没有中央 Runtime 后，Browser bundle 必须声明它实际消费的 Gateway、API Controller、UI adapter、target、Renderer 与 Slots。表面上看 manifest 更长，但这份列表同时是可执行的架构说明：组合者能看见插件需要哪些能力，Cordis 能在 service 缺失时阻止半激活，测试也能精确断言依赖 roster。

显式 composition 还有两个运行时收益：一个具体 target 可以独立卸载而不改变 Session Controller；一个可选 UI contributor 缺失时，其 Slot 可以保持为空，而不是因为中央 Runtime 静态 import 了它就被迫装载。DSH 的 dynamic Client render 决策进一步要求渲染、CSS 和 attachment presentation 都由各自 plugin lifecycle 管理，失败时仍保留 framework-free 的诊断页面。

代价是 package graph、inject metadata 和 externals 必须一起升级。BranchMark 的 [`packages/bundle/package.json`](../../packages/bundle/package.json)和 [`packages/bundle/tsdown.config.ts`](../../packages/bundle/tsdown.config.ts)因此把当前 Client roster 作为一个整体维护；漏掉一个 owner 不能靠运行时 fallback 掩盖。

## 10. 从旧假设映射到当前所有者

这张表只用于理解本次预发布升级，不是兼容层设计：

| 旧假设 | 当前事实 | 应学到的原则 |
| --- | --- | --- |
| 一个 Client Runtime 提供 Sessions、Workspaces、Conversation、Slots | 每个领域和 UI 层都有独立 owner，没有替代 facade | 先判断状态所有者，再选择 package |
| Session snapshot 可以直接带 Chat nodes | Session snapshot 只带 Session facts；Conversation 和 Chat 分别投影 | 不把展示数据塞回协议对象 |
| 一个 conversation service 同时代表 assembly 与 Chat | `uiConversation` 负责 target-neutral binding，`ui-chat` 提供 `chat` target | 共享机制与具体产品视图分开 |
| feature package 可以 runtime import 另一个 feature 的 helper | 状态行为走 Service，展示走 Slot，共享声明走 type-only import | 依赖遵循生命周期和所有权，而不是方便性 |
| 每个 Remote domain 自己维护 error family | DSH Remote failure 使用一个 code/details vocabulary | 错误在生产点分类，carrier 不复制业务表 |
| UI navigation helper 可以代替 Session 创建 | `ISessions.create/fork` 是 Session domain command，Workspace UI 只拥有导航策略 | 使用语义最精确的公开 owner |

BranchMark 不提供旧布局检测或双版本 import。package import、declaration merging、Client inject metadata 和 external graph 在运行前已经不同；把两套布局装进同一个 artifact 会重新制造 DSH 正在删除的中央耦合。

## 11. 对插件开发者的设计检查

新增一个 Client 功能前，按以下顺序判断：

1. 这是 Host/Remote entity lifecycle、Session command 或 Workspace command吗？放在相应 API Controller 或通过其公开 service 调用。
2. 这是从 Session event window 组装、但与具体 target 无关的数据吗？注册到 UI Conversation core。
3. 这是只服务 Chat、Trajectory 或另一个 target 的 projection 和交互吗？放在 target owner。
4. 这是 React scope、Hook 或 Slot props 适配吗？放在最接近该数据语义的 `ui-*` adapter，不放进 Controller。
5. 这是一个有生命周期的跨 feature 行为吗？使用 Cordis Service；如果只是展示贡献，使用 Slot。
6. 这是共享类型吗？从声明 owner 使用 `import type`；不要为了一个类型产生 runtime edge。
7. 资源是否绑定 Session 或插件 fiber？分别使用 `binding.ctx.effect()` 或 `ctx.effect()`，不要维护第二套 release callback。
8. Remote failure 是否在最早能解释它的 owner 分类？不要让 carrier error 和业务拒绝共用一个模糊 code。

出现以下迹象时应停下来重新划分所有权：Controller import React、Renderer 对业务 kind 写 switch、组件遍历完整 Session event window、Store 缓存 Session/Workspace entity、一个 target 的新增要求修改 Session Controller，或 feature package 为调用另一个 feature 的实现而增加 runtime external。

## 12. BranchMark 如何落地这些原则

| DSH 原则 | BranchMark 落点 |
| --- | --- |
| 跨能力编排集中在非组件模块 | `BranchMarkClient` 统一 Session、Workspace、Conversation、Composer 与 Remote 调用 |
| Session/Workspace 读取官方 owner | `ctx.sessions.list/binding/create/fork/open` 与 `ctx.workspaces.list` |
| Chat-specific 读取经过 target-neutral binding | `uiConversation.binding(...).snapshot` → `views.get('chat')` |
| 业务 Conversation node 局部注册 | `ForkDivider` definition 注册到 `uiConversation.events`，renderer 注册到 keyed Chat Slot |
| 展示通过 additive Slots 贡献 | Dock、Sidebar、Composer、Header、Chat divider 均注册到现有 Slot |
| 组件不复制 DSH entity state | 组件接收 standard props、branded ids、BranchMark controller 与 integration module |
| 显式 composition | Bundle inject 列出 Gateway、Controller、adapter、target 和 renderer |
| 单版本依赖图 | 所有 DSH package 精确固定到 `0.1.2-rc.1`，不保留 rc.2 fallback |

这套结构让下一次 DSH Client 重构主要集中在 Browser assembly、`BranchMarkClient`、Slot-facing types 和 Bundle manifest。它不能消除预发布 API 变化，但能把变化限制在真正跨宿主能力的模块，而不是扩散到每个 React component。

## 13. 收益与代价对照

| 收益 | 对应代价 |
| --- | --- |
| 每份状态有明确 owner，变更影响范围更小 | 插件作者必须先理解 owner，而不是搜索一个万能 Runtime |
| Controller 与 assembly 可脱离 React 测试和复用 | package 和 inject 数量增加 |
| keyed node 保留 React identity，增量更新不扫描全历史 | Definition 作者要遵守稳定 id、replay 和 publication contract |
| Service/Slot 协作服从 plugin lifecycle | 简单 direct import 需要改为注册和注入 |
| 单一 Remote failure vocabulary减少重复表和 cast | code owner 与跨 realm 结构标记需要严格维护 |
| 显式 composition 让缺失能力尽早暴露 | Bundle manifest、externals 和 profile 需要成组升级 |

因此“优秀”不表示“抽象越多越好”。这次设计成立的原因是每个新增 package 都删掉了一个混合所有权或隐式生命周期，而不是仅为了目录整齐。若一个新 adapter 只有一个实现、没有隐藏更多行为、也没有改善测试和替换边界，就不应继续机械加层。

## 14. 原始资料阅读顺序

1. [Client Session、Conversation 与 UI 所有权层](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/architecture/2026-08-20-client-session-conversation-ownership.md)：本页最主要的“为什么”来源。
2. [Conversation business-node assembly 与 keyed Chat snapshot](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/architecture/2026-08-09-client-conversation-node-assembly.md)：稳定节点、增量回放和 target ownership 的算法依据。
3. [Client 跨 package value dependency 分类](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/process/2026-08-23-client-cross-package-value-dependencies.md)：Service、Slot、type-only import 的选择规则。
4. [一个 ctx.remote failure vocabulary](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/architecture/2026-08-28-ctx-remote-failure-vocabulary.md)：错误所有权、跨 realm discrimination 和统一 Client surface。
5. [Dynamic Client render 与 attachment ownership](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/.agents/notes/implemented/architecture/2026-08-17-dynamic-client-render-and-attachment-ownership.md)：动态 renderer、Slot composition 和 plugin lifecycle。
6. [Conversation subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/docs/subsystems/conversation.md)：实现一个新 Conversation definition/target 时的当前 contract。

## 15. 检索练习

先不打开源码回答，再沿上面的原始资料核对：

1. 为什么 `ctx.sessions` 和 `useSession` 不由同一个 package 直接同时拥有？
2. 为什么 BranchMark 读取选区时既需要 UI Conversation，也需要 UI Chat？
3. keyed Chat snapshot 如何避免 streaming node 完成时重新挂载 React component？
4. 为什么一个 feature 的有状态 helper 应成为 Cordis Service，而不是 `dsh.client.external`？
5. BranchMark 的两层 Remote 结果中，哪一层属于 DSH，哪一层属于插件自己的协议？
6. Bundle inject 列表变长为什么不一定是架构退化？
7. 哪些迹象说明你正在重新制造一个被删除的 Client Runtime？
