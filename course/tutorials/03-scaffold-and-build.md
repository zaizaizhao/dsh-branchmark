# 第 3 章：建立独立工作区与生成链

本章解释项目骨架与生成链。先在现有教材中运行命令，再在自己的空练习目录复现；完整配置由链接中的文件提供，节选不是可直接复制的完整 scaffold。完成后，你能解释 Host 类型如何生成 Browser Remote，以及为什么仅有源码正确还不足以证明交付正确。

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

根 [`package.json`](../../package.json) 固定 pnpm、Node engine 与 Typert generator，声明 TypeScript、tsdown 和 Vitest 范围。[`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) 用 catalog 把插件直接声明的 DSH package 固定为 `0.1.2-rc.1`，实际解析结果保存在 lockfile。

不要只升级一个 DSH package。Remote generator、protocol、Gateway、API Session/Workspace Controller、UI Conversation/Chat 和 Slot types 共同组成跨 package contract，混用预发布版本可能在编译或运行阶段产生不一致。

上游 npm manifest 自身可能带有 alpha 范围的传递依赖；lockfile 中出现 alpha 字样不单独证明插件直接依赖错了。先检查依赖路径、直接 peers 与实际解析实例，不手工把所有版本字符串全局替换。课程增加的 Markdown 工具仅为根目录 devDependencies，不进入公开 Bundle 运行依赖。

本章与其余主线都使用[版本基线](../reference/version-baseline.md)的 rc.1。独立练习沿用同一依赖图；不要把父目录 DSH master 的 workspace 路径加入 tsconfig 来消除错误，那会让 source、生成器和 npm 产物来自不同版本。

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
| Vitest 4 / Happy DOM | 领域、组件事件和 Bundle 测试；不代替真实浏览器布局 |
| mdast/micromark GFM | 渲染 Markdown 文本到 durable source range 的映射 |

## 3. 建立 Host/Client 两个 TypeScript face

根 [`tsconfig.base.json`](../../tsconfig.base.json) 开启 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、ES2024 和 React JSX。Host 与 Client 分别由 [`tsconfig.host.json`](../../tsconfig.host.json) 和 [`tsconfig.client.json`](../../tsconfig.client.json) 建立 project-reference aggregate。

分开 face 的直接原因是 Host 和 Client 都会 declaration-merge Cordis `Context`，但同名 key 可能对应不同运行类型。把两者压进一个 TypeScript program 会制造 merge collision；DSH 自身也使用独立 Host/Client aggregate，见官方 [`development.md`](https://github.com/deepseek-ai/deepseek-harness/blob/a66e4702047846cdaa10c66c9d3df3951f5ea70d/docs/development.md#typescript-project-layout)。

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

这是当前 DSH/TypeScript 组合的项目级适配点。复现 `0.1.2-rc.1` 时按源文件保留；升级时先在无 bridge 的最小分支运行 generator，只有真实 diagnostics 证明不再需要时才能删除，不能凭感觉简化。

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

每个 external 拥有不同状态或生命周期。manifest、打包 external 与 Cordis inject 分别负责模块到达、复用宿主实例和服务激活，不能用其中一个代替另两个；设计原因见[Client 架构解读](../reference/dsh-client-architecture-rationale.md#9-为什么-bundle-inject-列表变长反而更健康)。

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
pnpm install --frozen-lockfile
pnpm run build:host
pnpm run typecheck
pnpm run build
pnpm run verify:bundle
```

这些命令用于现有教材。空练习项目需要先生成自己的 lockfile，之后复验再使用 `--frozen-lockfile`。若修改 Host 实现，即使签名不变，也要重建 Host 和 Bundle 才能把行为交付出去；类型没有变化只意味着 schema 可能不变，不意味着旧 artifact 自动更新。

## 9. 自包含校验

[`scripts/verify-bundle.mjs`](../../scripts/verify-bundle.mjs) 验证：

- 四个 runtime outputs 不再 import private `dsh-branchmark-host` workspace。
- Bundle default export 是 `BranchMarkService`。
- Typert package identity 是 `dsh-branchmark`，invocation 数为 14。
- `client.js` 含 ModuleLoader 注册和 `remote.branchmark` 等待。
- manifest 的每个 export target 都能读取。

这个脚本验证发布产物，而不仅是 source program。没有它，workspace symlink 可能让本地测试通过，但安装 tarball 后出现缺包。

最小练习只生成自己的两个 Remote，不应立即运行教材中要求 14 个方法的完整产品 verifier。先检查 manifest 声明的入口均存在、namespace 和两个方法可生成；完成毕业项目全部 API 后再采用完整检查。不要为了通过它给空插件伪造 14 个占位方法。

## 10. 本章检查点

在没有实现完整 UI 前，你至少应得到以下可观察结果：

```sh
pnpm run build
rg --files --no-ignore packages/host/lib packages/bundle/lib
node scripts/verify-bundle.mjs
```

构建后打开 `packages/host/lib/typert.remote-client.d.ts`，确认 `TypertRemoteNamespaceMap` 有 `branchmark` key。生成文件缺失时先修构建，不能在 Client 手写 `ctx.remote` cast 继续开发。

## 11. 检索练习

1. 为什么 `dsh.client.inject` 和 `export const inject` 不是同一个层级？
2. 为什么 Bundle 要重写 Typert `package` identity？
3. 为什么测试必须检查产物不 import private workspace？
4. 只改 Remote 实现而不改签名，为什么仍然要重建并重新安装 Bundle？

下一章将定义 Clip、relation 与 Side Chat 的 JSON-safe 类型，并把 durable 部分放入 `storageDomain`。
