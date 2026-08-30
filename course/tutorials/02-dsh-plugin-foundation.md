# 第 2 章：DSH 插件基础与总体架构

本章把第 1 章的产品对象映射到 Cordis、Profile、Bundle、Host Service 和 Browser Client。完成后，你应该能解释为什么这个功能可以纯插件实现，以及为什么仍需要三个源码 package。

## 1. “一切皆插件”的实际含义

DSH 官方 [`architecture.md`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/architecture.md) 说明：模型适配器、工具、Session log、agent loop 和 UI 都由 Cordis 插件组合，没有必须修改的特权核心。扩展的正确动作是把插件挂到现有 Service 和 Slot 旁边。

Cordis 对本项目最重要的五件事是：

1. Context 按稳定 key 提供 Service，例如 `ctx.sessions`、`ctx.llm`、`ctx.fs`。
2. Consumer 用 `inject` 声明必需服务；激活等待服务存在，不依赖 YAML 行顺序。
3. class-form 插件适合提供自己的 Service；本插件提供 `ctx.branchmark`。
4. 注册和资源通过 `ctx.effect()` 绑定 fiber 生命周期。
5. declaration merging 把 Host/Client 的 `Context` 与 Slot/Remote 类型扩展到调用处。

原始说明见 [`Cordis Primer`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/cordis-primer.md)。

## 2. Profile、Bundle 与插件模块

Profile 是用户启动的组合；Bundle 是可安装的配置层；Cordis plugin module 是 patch 行最终加载的 JavaScript 模块。

```text
web profile
  ├── @deepseek-ai/dsh-base bundle
  ├── @deepseek-ai/dsh-web-app bundle
  ├── dsh-branchmark bundle       ← 本插件的分发单位
  ├── profile cordis.patch.yml
  └── home / --patch overlays
```

Bundle 的 [`package.json`](../../packages/bundle/package.json) 声明 `dsh.bundle.patch`，[`cordis.patch.yml`](../../packages/bundle/cordis.patch.yml) 只插入一个 `name: dsh-branchmark` 行。这个名字从 profile 根目录解析，因此安装 tarball 后不依赖源码工作区中的 `dsh-branchmark-host` 或 `-client` 包。

Profile 后面的 patch 可以覆盖 Bundle 行。官方规则是整项 `config` 替换而不是深合并，因此用户改一个字段时也必须重述所有必填配置。

## 3. 为什么源码拆成 Host、Client、Bundle

```text
packages/host
  owns: Clip domain, source validation, relations, Side Chat execution, @Remote

packages/client
  owns: DOM selection, UI state, DSH Session orchestration, Slot components

packages/bundle
  owns: one installable package, one Loader row, repackaged Host/Client/Typert artifacts
```

Host 与 Client 运行在不同 JavaScript 环境，也依赖不同 Cordis `Context` merges。分开编译能防止 Browser 类型污染 Node program，或 Node-only API 进入 Browser bundle。

Bundle 不是第四套业务逻辑。它重导出 Host，并从 Client 源码构建浏览器 artifact；业务事实仍只有 Host/Client 两个 owner。

## 4. 纯插件实现依赖哪些宿主能力

本插件调用的关键公开能力包括：

- `SessionRuntime.fork`：从消息所在完整 turn 创建普通 child Session。
- concrete `SessionRuntime.create`：创建不同于既有 blank Session 的全新普通 Session。
- `Session.append`：把 Clip 快照作为 `recall` 上下文写入 child 日志。
- `SessionFace.prompt`：创建并发送时让 child 在后台运行。
- `storageDomain`：持久化 Clip 和双向关系。
- Typert Remote：Browser 调 Host 业务方法。
- Client Slots：叠加 Dock、入口、chips、header action 和 seed divider。
- `ctx.llm.stream`、`ctx.fs`、`ctx.web`：临时 Side Chat 的模型与只读能力。

完整依赖表见[DSH 既有插件与依赖矩阵](../reference/dsh-dependency-map.md)。

## 5. 插件自己必须实现什么

DSH 没有 Clip 领域对象、session/project 可见性、DOM range 到 durable message 的映射、ClipUsage 快照、主要来源选择、Side Chat 临时状态或右侧 Dock 产品交互。这些属于本插件。

“DSH 提供 fork”不等于“BranchMark 已完成”。插件仍要证明用户选择的 message anchor 真实、child header 符合请求、项目数据没有越权返回，并让删除后的关系可解释。

## 6. Host Service 组合

[`BranchMarkService`](../../packages/host/src/index.ts) 使用 class-form Service：

```typescript
export class BranchMarkService extends Service {
  static inject = [
    'storageDomain', 'sessionPersistence', 'sessions',
    'workspaceRegistry', 'llm', 'fs', 'web',
  ]

  readonly typertRemote = bindTypertRemote(this, 'branchmark')
}
```

`super(ctx, 'branchmark')` 提供 `ctx.branchmark`。`bindTypertRemote` 把同一 key 绑定为 Browser namespace。`Service.init` 打开 storage domain，并注册 domain close 与 Side Chat destroy disposer。

缺少任一 required Service 时，Cordis 不激活 Host Service。这比在每个方法里写“如果没有 fs 就跳过”更符合产品约束，因为插件宣称 Side Chat 有固定能力集合。

## 7. Browser Client 组合

Browser entry 不是 Vite 单页应用，而是被 DSH Client Modules 动态装载的 Cordis module。它的 [`apply`](../../packages/client/src/client/index.tsx) 执行三步：

1. 通过 effect 安装样式。
2. `$mount()` generated Remote contribution。
3. 等待 `remote.branchmark` Service，再注册六个 UI Slot。

```typescript
ctx.effect(async () => await ctx.remote.$mount(branchmarkRemote))
ctx.inject(['remote.branchmark'], (scope) => {
  // create one controller/client and register all UI seats
})
```

这两个等待层不能互换：package manifest 的 `dsh.client.inject` 确保依赖模块代码先到达；Cordis `inject` 确保运行时 Service 已激活；nested `ctx.inject(['remote.branchmark'])` 确保刚挂载的业务 namespace 已存在。

## 8. 普通 Session 的“模型可见即记录”

DSH Session log 是普通会话模型历史的来源。完整 fork 的 seed 本身来自日志；clips-only 和附加 Clip 使用 `Session.append('user/message', recall)` 写入日志。创建并发送只提交用户问题，模型历史会同时读取 recall。

Side Chat 是不同产品对象：它直接调用 LLM、明确不可恢复，也不声称是 Session。不要让一个看似临时的普通 Session 绕过日志，否则刷新后 UI、模型历史和关系会互相矛盾。

## 9. 运行时总体链路

```text
Browser Slot UI
  → BranchMarkClient
    → generated remote.branchmark
      → DSH Connection + Typert Gateway
        → BranchMarkService
          → DSH Session/Storage/Workspace/LLM/FS/Web services
```

Browser 不直接读取本地文件或 Session persistence，Host 不操作 DOM，Bundle 不拥有业务状态。保持这三个方向，后续测试可以分别覆盖 domain、browser logic 和 artifact composition。

## 10. 检索练习

1. 在 [`dsh-web-app/cordis.patch.yml`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/bundle/web-app/cordis.patch.yml) 找出 storage、workspace、client-runtime、ui-layout 和 ui-conversation 行。
2. 在 [`dsh-base/cordis.patch.yml`](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/packages/bundle/base/cordis.patch.yml) 找出 llm、session、persistence、fs 与 web 行。
3. 解释为什么 YAML 行顺序不负责 Host Service 的激活顺序。
4. 解释为什么把 Dock 注册到 `root` slot 会破坏主界面，而 `shell.overlay` 不会。

下一章会从空目录建立这套 Host/Client/Bundle 构建结构，并让 Typert 先生成 Remote，再编译 Browser。
