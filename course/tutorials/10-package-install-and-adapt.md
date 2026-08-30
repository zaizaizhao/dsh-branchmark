# 第 10 章：单包发布、安装与 DSH 适配

本章把开发时的 Host、Client、Bundle 三个 workspace package 交付成一个用户可安装的 `dsh-branchmark` tarball。完成后，你应能在独立 DSH home/profile 中安装插件、从最终配置和浏览器模块图证明它已生效，并知道升级 DSH 时要逐项重验哪些适配点。

## 1. 为什么开发分三包，交付却是一包

开发结构按编译责任拆分：

```text
packages/host    Node Service + DTO owner + Typert generation
packages/client  Browser domain + React UI + DSH client entry
packages/bundle  installable package + patch + repackaged Host/Remote/Client
```

用户只安装 `packages/bundle` 产出的 `dsh-branchmark`。如果最终 patch 同时引用 `dsh-branchmark-host` 和 `dsh-branchmark-client`，用户还要解析两个只在开发 workspace 存在的包，纯插件交付会失败。

三包不是运行时三插件。最终 [`cordis.patch.yml`](../../packages/bundle/cordis.patch.yml) 只有一个 Loader row：

```yaml
- insert:
    - id: branchmark-host
      name: dsh-branchmark
      config:
        # 完整配置省略
```

同一个 package root 同时暴露 Node default export、Typert Host contribution、Remote client 与 Browser client bundle。

## 2. Bundle manifest 的四个关键面

[`packages/bundle/package.json`](../../packages/bundle/package.json) 同时声明：

```json
{
  "main": "./lib/index.js",
  "exports": {
    ".": { "default": "./lib/index.js" },
    "./client": "./lib/client.js",
    "./typert": { "default": "./lib/typert.host.js" },
    "./remote": { "default": "./lib/typert.remote-client.js" }
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "inject": [] }
  }
}
```

实际 `inject` 数组包含 Gateway、Runtime、Locale、Layout、Sidebar 和 Conversation。四个面分别被 Loader、Client Modules、Typert registry 与 Browser `$mount` 消费；缺一个都可能出现“Host 启动了但 UI 没出现”或“UI 加载了但 Remote namespace 不存在”。

## 3. Node 产物内联开发 Host package

[`packages/bundle/tsdown.config.ts`](../../packages/bundle/tsdown.config.ts) 的 Node build 把 `dsh-branchmark-host`、它的 types/typert/remote subpath，以及生成器需要的 Schemastery 辅助依赖内联进 bundle 输出；DSH 自身服务保持 peer/external，由安装它的 Harness 提供。

目标是：tarball 的 `lib/index.js`、`lib/typert.host.js` 与 `lib/typert.remote-client.js` 不再 import 私有开发 workspace 名。`scripts/verify-bundle.mjs` 会逐个搜索并拒绝残留 import。

不要把全部 DSH packages 都打进 tarball。那会同时装入两份 Cordis/Service identity，导致 `instanceof`、declaration merging、service registry 或版本组合出现难以定位的分裂。

## 4. Typert contribution 必须使用安装包身份

Host generator 最初以 `dsh-branchmark-host` 作为 package identity 生成 contribution；最终 Loader 解析的是 `dsh-branchmark`。[`packages/bundle/src/typert.ts`](../../packages/bundle/src/typert.ts) 复用 generated contribution，但把 `package` 字段改为最终安装名：

```typescript
export const TYPERT = Object.freeze({
  ...hostTypert,
  package: 'dsh-branchmark',
})
```

这不是修改方法 schema，而是让 registry 能从实际 package subpath 找到对应 Host/Remote artifacts。升级 Typert 时必须重验这个 republish 方式，不要假设内部 contribution 字段永远稳定。

## 5. Browser bundle 是 DSH ModuleLoader factory

Browser face 使用 tsdown CJS 输出，并用 banner/footer 包装：

```javascript
window.__ModuleLoader__.load({
  id: 'dsh-branchmark',
  factory: (require) => {
    var module = { exports: {} }
    // bundled browser module
    return module.exports
  },
})
```

React 与 DSH Browser packages 保持 external，由 `window.__ModuleLoader__` 同步 `require`；Markdown projection 等插件专用依赖则打入 `client.js`。`dsh.client.inject` 描述代码到达顺序，Client Modules 扫描 package、计算 rev，并通过 `/plugins/<id>/client.js?rev=...` 提供文件。官方机制见 [Client Modules 文档](https://github.com/deepseek-ai/deepseek-harness/blob/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e/docs/subsystems/client-modules.md)。

普通 ESM 浏览器文件即使能在本地 bundler 打开，也不满足 DSH 当前 lazy-CJS module table 的格式。

## 6. 构建顺序不可交换

根脚本按以下顺序运行：

```text
build Host → 生成 Typert Host/Remote artifacts
build Client → 能 type-import generated Remote/types
build Bundle → repack Host/Remote，并直接编译 Browser entry
```

执行：

```sh
pnpm install
pnpm run build
pnpm run verify:bundle
```

`verify:bundle` 当前证明：四个关键输出可读；没有私有 Host workspace import；default export 是 `BranchMarkService`；Typert package identity 正确且恰有 14 个 invocation；`client.js` 是 ModuleLoader factory 并等待 `remote.branchmark`；manifest 的每个 export target 均存在。

它不证明 React UI 在真实 DSH 能渲染，也不证明 LLM provider 可用；那些属于第 11 章的组合验收。

## 7. 打 tarball并检查内容

在插件根目录执行：

```sh
mkdir -p dist
pnpm --dir packages/bundle pack --pack-destination ../../dist
```

不要根据旧文档硬编码 tarball 名；从 `dist/` 选择本次命令刚生成且版本与 `packages/bundle/package.json` 一致的文件。检查发布内容：

```sh
tar -tf /absolute/path/to/dsh-branchmark-0.3.0.tgz
```

应包含 `package/lib/index.js`、`client.js`、Typert Host/Remote、声明、source maps、`cordis.patch.yml`、README、LICENSE 与 package.json；不应包含开发测试、整个 monorepo 或 `node_modules`。

## 8. 用独立 DSH home 安装

为了不覆盖真实 profile，先创建专用目录：

```sh
CLIP_COURSE_HOME="$(mktemp -d)"
export DSH_HOME="$CLIP_COURSE_HOME"
dsh plugin --profile clip-course add /absolute/path/to/dsh-branchmark-0.3.0.tgz
dsh --profile clip-course --dump-config
```

首次 `plugin add` 会初始化 profile，并把 `@deepseek-ai/dsh-base` 放在 bundles 首位，再追加 `dsh-branchmark`。如果要运行 Web UI，profile 还必须包含提供 Web stack 的组合；在已有 `web` profile 验证时可改用 `--profile web`，但仍建议指向专用 `DSH_HOME`。

`--dump-config` 中应出现来源标记为 `dsh-branchmark` 的层和一个 `name: dsh-branchmark` Loader row。只有依赖出现在 profile `package.json`、却没有进入 `dsh.profile.bundles` 或最终 config，不算安装成功。

## 9. 配置覆盖必须重述整份 config

DSH patch 后层覆盖同 id row 时，`config` 整体替换，不做 key 级 deep merge。用户若只想换摘要模型，也必须在 profile `cordis.patch.yml` 重述插件要求的全部配置字段：

```yaml
- id: branchmark-host
  name: dsh-branchmark
  config:
    maxExcerptBytes: 65536
    maxNoteBytes: 16384
    maxTagsPerClip: 32
    maxTagBytes: 128
    recentContextMessages: 10
    summaryProvider: your-provider
    summaryModel: your-model
    summaryMaxTokens: 2048
    answerMaxTokens: 8192
    maxToolRounds: 6
    maxToolOutputChars: 24000
    maxReadChars: 60000
    maxSearchFiles: 300
```

实际 provider/model id 必须来自当前 DSH 模型目录。密钥仍由 DSH credentials/settings 管理，不进入插件 patch、tarball、课程或 Git。

## 10. 启动后的四层诊断

遇到“看不到插件”时按层定位：

1. 组合层：`--dump-config` 是否有正确 Loader row 和完整 config。
2. Host 层：启动日志是否有 schema、inject、domain open 或 Typert registration 失败。
3. Client Modules 层：`window.__DSH_BOOT__` 是否有 `dsh-branchmark`，`/plugins/dsh-branchmark/client.js` 是否 200 且 rev 正确。
4. Browser runtime 层：ModuleLoader 是否注册 factory，`ctx.remote.$mount` 是否成功，五个 Slot 与 Input Trigger source 是否出现。

不要一看到 UI 缺失就修改 Host Service；每层都有可单独观察的事实。

## 11. 纯插件适配 DSH 的清单

本插件没有修改 DSH 源码，但依赖以下扩展点：

- Cordis Service/inject/effect：Host 能力和生命周期。
- `storageDomain`：Clip 与 relation 本地数据。
- `sessionPersistence.inspect`、`sessions.get`：来源证明、header 验证和 recall append。
- Client `SessionRuntime.fork/create/open/binding`：普通衍生 Session。
- LLM/FS/Web services：Side Chat 直接模型流与固定只读工具。
- Typert/API Gateway：Browser→Host typed Remote。
- Client Modules 与六个 UI Slots：浏览器代码装载和 additive UI。
- Conversation event extension：`session/end-seed` 分隔条。

这些都是组合，不需要 Host 源码 patch；但“纯插件”不等于“没有版本耦合”。具体依赖和替代策略见 [DSH 依赖矩阵](../reference/dsh-dependency-map.md)。

## 12. 升级适配顺序

DSH 处于预发布阶段，升级时把全部 `@deepseek-ai/dsh-*` 作为一组更新，然后依次核对：

1. Remote decorator/generator、四个 artifact 与 `$mount`。
2. `SessionRuntime.create/fork`、Host fork turn-boundary、SessionHeader 与 `session/end-seed`。
3. Chat node data 与 `[data-chat-flow-key]` selection anchor。
4. 五个 Slot 的名字、props、scope、render site，以及 Input Trigger service contract。
5. `dsh.client` manifest、ModuleLoader wrapper 和 client route。
6. storage domain、Workspace、LLM、FS、Web 方法签名与默认 providers。
7. clean build、tarball自包含检查、独立 profile 实装和真实模型验收。

完整清单位于[兼容性与限制](../reference/compatibility-and-limitations.md)。类型检查只能发现公开类型变化，发现不了 turn boundary、默认 provider、DOM selector 或 config merge 语义变化。

## 13. 本章检查点

你应能拿一个没有插件源码 sibling 的独立 profile 完成：

```text
install tarball
→ dump-config 看见一个 bundle layer/一个 Host row
→ Web boot graph 看见一个 client entry
→ Browser 出现枝签入口与 Dock
→ 保存 Clip 后重启 DSH，Clip 仍在
→ 创建 Side Chat 后重启 DSH，Side Chat 消失
```

最后两项共同证明 durable 与 ephemeral lifecycle 没有混淆。

## 14. 检索练习

1. 为什么开发 Host package 能作为 workspace dependency，却不能留在最终 `lib/index.js` import 中？
2. `dsh.bundle` 与 `dsh.client` 分别被谁消费？
3. 只改 `summaryModel` 时，为什么 profile patch 仍要重述其他字段？
4. TypeScript 全绿为什么不能证明 Chat DOM selection anchor 仍兼容？

下一章建立测试金字塔和真实验收流程，明确现有自动化已经证明什么、还没有证明什么。
