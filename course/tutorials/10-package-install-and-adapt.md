# 第 10 章：单包构建与隔离安装

本章把 Host、Client 和 Typert 产物交付成一个可安装的 tarball，并证明实际 Web profile 使用它。先完成第 3、5、6 章；Side Chat 业务尚未全部完成时，也可以先验收装载链。正式发布由根 [RELEASING.md](../../RELEASING.md)负责，本章不发布 npm、不推送 tag、不升级日常 DSH。

## 1. 从源码职责走到一个安装包

Host 是业务和 DTO owner，Client 是浏览器集成与 UI owner，Bundle 是分发 owner。用户只安装 `dsh-branchmark`，不安装私有的 `dsh-branchmark-host/client` workspace。

[Bundle manifest](../../packages/bundle/package.json)的四个入口分别供不同消费者使用：

| 声明 | 文件 | 消费者 |
| --- | --- | --- |
| `exports["."]` | `lib/index.js` | Cordis Loader，激活 Host Service |
| `exports["./typert"]` | `lib/typert.host.js` | Typert Host registry |
| `exports["./remote"]` | `lib/typert.remote-client.js` | Browser 的 Remote mount |
| `exports["./client"]` | `lib/client.js` | DSH Client Modules |

`dsh.bundle.patch` 指向[唯一 patch](../../packages/bundle/cordis.patch.yml)，其中只有一个 `name: dsh-branchmark` Loader row。`dsh.client` 描述浏览器模块与依赖，二者缺一不可：npm 安装成功只证明包管理器拿到了文件，不证明 Host 与 Client 已激活。

## 2. 依赖、身份和浏览器格式

[Bundle build](../../packages/bundle/tsdown.config.ts)内联插件私有工作区代码，DSH/Cordis 服务作为 peers 和 externals 复用宿主实例。npm optional peer 元数据不表示产品可以缺少该服务；运行时必需性仍由 Cordis inject 与 profile 组合决定。

[Typert republish](../../packages/bundle/src/typert.ts)把 contribution 的 package identity 设为最终安装名 `dsh-branchmark`。它不是更改 Remote schema，而是让 registry 从正确的公开包找到入口。

浏览器文件不是独立 ESM 页面。DSH rc.1 需要 `window.__ModuleLoader__.load({ id, factory })` 的 lazy-CJS factory，React 与 DSH 模块由宿主模块表提供。源文件与生成配置见[第 3 章](03-scaffold-and-build.md)；不要把 publint 的 CJS 提示通过改成普通 ESM 来“修好”。

## 3. 构建、检查、打包

在 BranchMark 根目录执行，工具链与依赖遵守[版本基线](../reference/version-baseline.md)：

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run verify:release
pnpm run pack:bundle
tar -tf dist/dsh-branchmark-0.1.2-rc.1.tgz
```

`check` 已包含构建，不必在同一次无修改验收中再把所有窄命令重复执行。`pack:bundle` 生成本次候选包；tarball 内应只有 manifest `files` 允许的 JS/DTS、patch、README、LICENSE 和 package.json，不包含 source maps、测试、凭据、真实 Session 数据或私有源码工作区。

用 [verify-bundle](../../scripts/verify-bundle.mjs)证明自包含、导出和 Typert roster；用 [verify-release](../../scripts/verify-release.mjs)证明公开元数据、同号 DSH peers 和 generator。两者都不能证明真实浏览器装载，更不能证明模型可用。

## 4. 固定 CLI，再创建隔离 home

以下命令供 macOS/Linux shell 在 BranchMark 根目录运行。它安装精确 CLI 到临时 prefix，使用新的 DSH home；不会替换全局 CLI，也不会修改日常 profile。需要 npm 网络和可用 pnpm。

```sh
BRANCHMARK_COURSE_ROOT="$(pwd)"
BRANCHMARK_COURSE_RUNTIME="$(mktemp -d)"
BRANCHMARK_COURSE_HOME="$(mktemp -d)"
npm install --prefix "$BRANCHMARK_COURSE_RUNTIME" @deepseek-ai/dsh@0.1.2-rc.1
export PATH="$BRANCHMARK_COURSE_RUNTIME/node_modules/.bin:$PATH"
dsh --version
DSH_HOME="$BRANCHMARK_COURSE_HOME" dsh plugin --profile web add "$BRANCHMARK_COURSE_ROOT/dist/dsh-branchmark-0.1.2-rc.1.tgz"
DSH_HOME="$BRANCHMARK_COURSE_HOME" dsh --profile web --dump-config
DSH_HOME="$BRANCHMARK_COURSE_HOME" dsh --profile web --no-open --port 0
```

沿启动输出打开实际地址。最后一条命令是前台服务，完成后用 Ctrl-C 停止；检查没有相关进程再处置自己创建的临时目录。此段 PATH 只影响当前 shell；不建议写入 shell 启动配置。

必须使用 `web` profile，不能任意取一个只含 base 的 profile 名就期待出现 Web UI。需要模型时由实验执行者在此测试 home 的 DSH settings/credentials 配置；不要整份打印或复制日常凭据到课程记录。Windows 使用相同 profile 原理，但这组 shell 命令不作为 Windows 验证证据。

profile 包管理由其 manifest 决定；安装日志里的 pnpm 版本可能与教材的 11.7.0 不同，不能据此修改课程 lockfile。本次 rc.1 安装可见 profile 使用 pnpm 11.1.3。若 npm 提示依赖安装脚本待审核，先核对具体包和实际失败，不执行全局批量放行来绕过本机策略。

## 5. 安装成功的四个观察点

逐层检查，而不是只看“added packages”：

| 层 | 可观察结果 | 不满足时先查 |
| --- | --- | --- |
| Profile | manifest 的 bundles 与 dump-config 中有 BranchMark 层，且仅一个 Host row | package 是否声明 bundle、patch 是否解析 |
| Host | 没有配置校验、inject、domain open 或 Typert 装载错误 | 同号 peers、必需服务、完整 config |
| Client Modules | boot graph 含 BranchMark，client route 返回本次 JS/rev | exports、inject、生成文件与缓存 |
| Browser | 入口、Dock、Remote 和引用 source 出现 | module factory、Remote mount、Slot 激活 |

不要把“设置了新的 DSH_HOME”理解为“已升级原有进程”；原有监听端口仍可能服务旧包。浏览器 origin、监听端口、CLI 路径和安装包都要对应本次环境。重新测试 localStorage 时保持同一 origin，不能换端口后期待共享布局偏好。

## 6. 配置只在一个地方维护

Bundle 的[完整 config](../../packages/bundle/cordis.patch.yml)是默认值依据，Host [Config schema](../../packages/host/src/index.ts)是约束依据。DSH 后层 patch 对 `config` 整项替换，不深合并；修改摘要模型时从完整配置开始，同时指定 summary provider/model，不能只留一个新字段。

课程不再复制第二份默认值清单。若你的部署需要 Web fetch，先选配符合网络策略的 provider；方法存在和 provider 可用是两回事，见[兼容性限制](../reference/compatibility-and-limitations.md#web-fetch-不是默认可用能力)。

## 7. 交付前的最小用户路径

真实页面验收由实验执行者完成：

1. 从已完成消息保存 Clip，重启此 DSH 后仍能读取。
2. 通过浮签打开、拖动、最小化；确认拖后不误展开且不遮挡必要控件。
3. 引用到 Composer，保留问题并刷新，确认可解析 token 恢复、没有自动发送。
4. 建立 full-fork 与 clips-only，用真实 Session 事实区分两者。
5. 在有可用 provider 时验收 Side Chat；没有凭证则标记未验证，不能以普通会话回答成功代替。

完整动作矩阵见[第 11 章](11-testing-debugging-and-release.md)，安装与包一致性作业见[实验 6](../labs/06-release-rehearsal.md)。

## 8. 检索练习

1. 为什么 `dsh.bundle` 存在不能证明 Browser 已加载？
2. `optional peer` 为什么不能代替运行时 inject？
3. 源码构建正确，但浏览器仍显示旧浮签，应核对哪四层？
4. 为什么候选 tarball 应在没有插件源码 sibling 的 profile 中验证？
5. npm latest 仍指向旧 BranchMark 时，应该如何安装本课程代码？

提示：分别检查两个装载面、包管理与服务激活、版本基线四层、工作区偶然解析、本地精确 tarball。进入[第 11 章](11-testing-debugging-and-release.md)学习如何给这些证据定级。
