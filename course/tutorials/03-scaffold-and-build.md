# 第 3 章：建立独立工作区与生成链

本章从构建角度复现项目骨架。完成后，即使业务方法只有一个占位实现，你也应能生成 Host、Remote 和 Browser artifacts，并理解为什么构建顺序不可交换。

## 1. 创建目录

在 DSH 仓库外也可创建该项目；这里用同级目录便于阅读宿主源码：

```sh
mkdir -p dsh-branchmark/packages/{host,client,bundle}/src
mkdir -p dsh-branchmark/packages/{host,client,bundle}/tests
cd dsh-branchmark
```

最终源码树见 [`packages`](../../packages)。最小职责如下：

```text
dsh-branchmark/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.host.json
├── tsconfig.client.json
├── typert-protocol.d.ts
├── packages/host
├── packages/client
└── packages/bundle
```

## 2. 固定工具链和 DSH 版本

根 [`package.json`](../../package.json) 固定 pnpm 11.7、Node engine、TypeScript、tsdown、Vitest 与 Typert generator。[`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) 用 catalog 把所有 DSH package 固定为同一 `0.1.2-alpha.5`。

不要只升级一个 DSH package。Remote generator、protocol、Gateway、API Session/Workspace Controller、UI Conversation/Chat 和 Slot types 共同组成跨 package contract，混用预发布版本可能在编译或运行阶段产生不一致。

本章以及第 4–12 章按 alpha.2 源码复现。`0.1.2-alpha.5` 与 2026-09-02 master 不是可以只改 catalog 版本的 drop-in target；它们的精确差异和成组迁移顺序见[第 13 章](13-dsh-prerelease-upgrade.md)。

当前主要技术栈：

| 技术 | 作用 |
| --- | --- |
| TypeScript 6 strict | Host/Client DTO、declaration merging、构建检查 |
| React 18 | DSH Slot components |
| Cordis 4.0.2 | Service/Context/effect/inject 生命周期 |
| Zod 4 | durable domain record validation |
| Schemastery | Cordis 插件 config validation |
| tsdown | Node ESM、Browser CJS ModuleLoader 与 declaration bundle |
| Typert generator | 从 Host `@Remote` 生成 strict runtime codecs 和 Client types |
| Vitest 4 | Host/Client/Bundle 单元与契约测试 |
| mdast/micromark GFM | 渲染 Markdown 文本到 durable source range 的映射 |

## 3. 建立 Host/Client 两个 TypeScript face

根 [`tsconfig.base.json`](../../tsconfig.base.json) 开启 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、ES2024 和 React JSX。Host 与 Client 分别由 [`tsconfig.host.json`](../../tsconfig.host.json) 和 [`tsconfig.client.json`](../../tsconfig.client.json) 建立 project-reference aggregate。

分开 face 的直接原因是 Host 和 Client 都会 declaration-merge Cordis `Context`，但同名 key 可能对应不同运行类型。把两者压进一个 TypeScript program 会制造 merge collision；DSH 自身也使用独立 Host/Client aggregate，见官方 [`development.md`](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/development.md#typescript-project-layout)。

每个 package 自己的 `tsconfig.json` 指定 `rootDir=src`、`outDir=lib/types`。Client reference Host，是为了消费 Host public DTO 与生成 Remote declaration；Host 不 reference Client。

## 4. 先建立一个可生成的 Host package

Host [`package.json`](../../packages/host/package.json) 必须：

- `type: module`，导出 `.`、`./types`、`./typert`、`./remote`。
- 把 DSH Service Definitions 放 peerDependencies，使运行时使用宿主单例。
- 把 Schemastery 与 Zod 作为直接 dependencies。
- 在 `files` 中包含生成的 Host/Remote artifacts。

Host [`tsdown.config.ts`](../../packages/host/tsdown.config.ts) 的关键配置是：

```typescript
plugins: [typertPlugin({ mode: 'package', faces: ['host'] })]
```

package mode 只为当前 package 发射 contribution。构建后必须出现：

```text
lib/index.js
lib/index.d.ts
lib/types.js
lib/types.d.ts
lib/typert.host.js
lib/typert.host.d.ts
lib/typert.remote-client.js
lib/typert.remote-client.d.ts
```

## 5. 理解 build-only Typert identity bridge

当前独立工作区包含 [`typert-protocol.d.ts`](../../typert-protocol.d.ts)，并在 Host aggregate 的 `paths` 中把 canonical `@deepseek-ai/dsh-typert-protocol` 指向该文件，再把 `-actual` 指向安装包声明。

这个文件的源码注释把它定义为“out-of-tree Typert analyzer 的 build-only identity bridge”。它保留 generator 需要的 `Remote`、`bindTypertRemote` 和 merge-extensible map 名称，同时把实现类型转交给实际安装包。它不是运行时代码，也不应被 Browser 或 Bundle import。

这是当前 DSH/TypeScript 组合的项目级适配点。复现 `0.1.2-alpha.5` 时按源文件保留；升级时先在无 bridge 的最小分支运行 generator，只有真实 diagnostics 证明不再需要时才能删除，不能凭感觉简化。

## 6. 建立 Client package

Client [`package.json`](../../packages/client/package.json) 声明：

- `dsh.client.platform = web`。
- module graph 的 `inject` package 列表。
- `./client` Browser entry。
- DSH Client packages 为 peerDependencies，Markdown parser 为直接 dependencies。

Client [`tsdown.config.ts`](../../packages/client/tsdown.config.ts) 生成两张脸：一个普通 Node ESM 空入口，以及一个 Browser CJS bundle。Browser bundle 使用：

```typescript
banner: `window.__ModuleLoader__.load({ id: ..., factory: (require) => {`
footer: 'return module.exports; } });'
```

React、Cordis、API Session/Workspace Controller、UI Conversation/Chat、Slots 与 Primitives 被标记为 external，由 DSH module table 提供；其余依赖打入 browser artifact。

这些 external 不是一个大 Runtime 的机械拆包。每个包拥有不同状态或生命周期，Bundle 的显式 inject roster 使 Client Modules 先提供 factory，Cordis 再按 Service 依赖激活插件；漏掉 owner 会在构建、组合或激活阶段显式失败。为什么这种更长的依赖表反而降低耦合，见 [DSH Client 架构设计解读](../reference/dsh-client-architecture-rationale.md#9-为什么-bundle-inject-列表变长反而更健康)。

## 7. 建立单包 Bundle

源码 Host/Client packages 是开发边界，用户只安装 [`packages/bundle`](../../packages/bundle)。Bundle 做四件事：

1. [`src/index.ts`](../../packages/bundle/src/index.ts) 重导出 Host default/public API。
2. [`src/remote.ts`](../../packages/bundle/src/remote.ts) 重导出 generated Remote contribution。
3. [`src/typert.ts`](../../packages/bundle/src/typert.ts) 把 Host Typert contribution 的 `package` identity 改为 `dsh-branchmark`。
4. [`tsdown.config.ts`](../../packages/bundle/tsdown.config.ts) 把 Host private workspace 与 Browser source 都打进自己的 `lib/`。

Bundle `package.json` 的 runtime `exports` 必须全部指向实际文件。`./client` 是 JavaScript 入口，不需要声明一个不存在的 `client.d.ts`。`files` 只发布 `lib`、patch、README 与 LICENSE。

## 8. 构建顺序

根 scripts 编码了依赖顺序：

```text
build:host
  → generate Host Typert + Remote
typecheck client
  → consume freshly generated Remote declarations
build:client
build:bundle
verify:bundle
```

运行：

```sh
pnpm install
pnpm run build:host
pnpm run typecheck
pnpm run build
pnpm run verify:bundle
```

如果只改 Browser component，仍可使用已有 Remote artifacts；如果改 `@Remote` 方法签名，必须先重建 Host。只运行 Client bundler无法从正在运行的 Host decorator 推导新类型。

## 9. 自包含校验

[`scripts/verify-bundle.mjs`](../../scripts/verify-bundle.mjs) 验证：

- 四个 runtime outputs 不再 import private `dsh-branchmark-host` workspace。
- Bundle default export 是 `BranchMarkService`。
- Typert package identity 是 `dsh-branchmark`，invocation 数为 14。
- `client.js` 含 ModuleLoader 注册和 `remote.branchmark` 等待。
- manifest 的每个 export target 都能读取。

这个脚本验证发布产物，而不仅是 source program。没有它，workspace symlink 可能让本地测试通过，但安装 tarball 后出现缺包。

## 10. 本章检查点

在没有实现完整 UI 前，你至少应得到以下可观察结果：

```sh
pnpm run build
find packages/host/lib -maxdepth 1 -type f | sort
find packages/bundle/lib -maxdepth 1 -type f | sort
node scripts/verify-bundle.mjs
```

构建后打开 `packages/host/lib/typert.remote-client.d.ts`，确认 `TypertRemoteNamespaceMap` 有 `branchmark` key。生成文件缺失时先修构建，不能在 Client 手写 `ctx.remote` cast 继续开发。

## 11. 检索练习

1. 为什么 `dsh.client.inject` 和 `export const inject` 不是同一个层级？
2. 为什么 Bundle 要重写 Typert `package` identity？
3. 为什么测试必须检查产物不 import private workspace？
4. 修改 Remote implementation body但不改签名时，哪一步可以不重新生成？

下一章将定义 Clip、relation 与 Side Chat 的 JSON-safe 类型，并把 durable 部分放入 `storageDomain`。
