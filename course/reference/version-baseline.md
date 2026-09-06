# 课程版本基线

本页是课程的版本参考。主线只教一组可构建的依赖和 API，不要求读者在每个实验里选择 alpha、rc 或 master。注册表标签会移动；源码版本与 DSH 兼容目标分别固定，安装前用本页命令核对注册表。

课程中的三种分支模式、会话树和枝签交互对应 BranchMark `0.1.2-rc.2`，DSH 兼容目标为 `0.1.2-rc.1`。

## 源码与依赖目标

| 项目 | 固定值 | 核对位置 |
| --- | --- | --- |
| DSH 目标 | `0.1.2-rc.1` | [workspace catalog](../../pnpm-workspace.yaml)及安装包声明 |
| DSH release commit | `a66e4702047846cdaa10c66c9d3df3951f5ea70d` | [官方 release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-rc.1) |
| BranchMark 源码版本 | `0.1.2-rc.2` | [根 manifest](../../package.json)及三个 package manifest |
| Node 实测工具链 | `24.19.0` | [.node-version](../../.node-version)；公开 engines 为 `^22.19.0 || >=24.0.0` |
| pnpm | `11.7.0` | 根 manifest 的 `packageManager` |

TypeScript、React、tsdown、Vitest 等安装版本由 [pnpm-lock.yaml](../../pnpm-lock.yaml)确定。manifest 中的版本范围不是实际解析版本；课程不维护第二份完整依赖目录。

DSH alpha.5 的 release commit `db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5` 与 rc.1 release commit 之间，Git diff 只包含 252 个 package manifest 的版本字段，不包含实现代码变化。这解释了当前 rc.1 对齐以依赖、产物与发布检查为主，但不能据此推导 rc.1 与后续 master 兼容。

## npm 标签不等于本地源码

| 对象 | 版本或查询方式 | 对学习的影响 |
| --- | --- | --- |
| DSH `latest` / `next` | `0.1.2-rc.1` | 主线固定此版本，不依赖后续移动标签 |
| DSH `alpha` | `0.1.2-alpha.5` | 与 rc.1 属于不同发布身份 |
| BranchMark 课程目标 | `0.1.2-rc.2` | 精确安装此版本或当前源码 tarball |
| BranchMark `alpha` | `0.1.2-alpha.5` | 历史 alpha 兼容线，不包含本课程的会话树更新 |
| BranchMark `latest` / `rc` | 用下方命令查询 | 标签可移动，课程安装仍指定精确版本 |

只读刷新命令，在已准备 npm 的终端执行：

```sh
npm view @deepseek-ai/dsh dist-tags --json
npm view dsh-branchmark versions dist-tags --json
```

BranchMark 的四份 manifest 同号，DSH generator 和 peers 固定到独立的兼容目标。分支名不是版本证明；核对 checkout 的 manifest、Git SHA、lockfile 与最终产物。

## 四层版本证据

一次“改了但页面没变”的排查应依次记录四层，而不是反复重装全局 CLI。

| 层 | 要记录什么 | 不能替代的下一层 |
| --- | --- | --- |
| Source | BranchMark commit、未提交差异、DSH catalog 与 generator | 当前 `lib/` 是否由它生成 |
| Artifact | Bundle version、manifest、tarball 清单/摘要 | profile 是否装了这份 tarball |
| Installed | 专用 `DSH_HOME`、profile、实际安装的 CLI 和插件包 | 服务该浏览器的进程是否重新加载 |
| Runtime | 启动命令、端口、浏览器 origin、client module rev | 不能单凭全局 `dsh --version` 推断 |

只读查看当前教材：

```sh
git rev-parse HEAD
git status --short
node -p 'JSON.stringify({version: require("./package.json").version, packageManager: require("./package.json").packageManager})'
pnpm run verify:release
```

`verify:release` 验证 generator 和安装的 DSH peers，并读取产物；先执行课程入口的 `pnpm run check`。完整隔离安装见[第 10 章](../tutorials/10-package-install-and-adapt.md)，不要把日常环境当练习环境。

## 上游源码审计另开一条路径

本课程的后续源码对照固定为 [`d347e70390`](https://github.com/deepseek-ai/deepseek-harness/tree/d347e70390)，即 Git 上的 `dsh-v0.1.3-alpha.1` 发布线快照。Git release、npm dist-tag 和本地运行进程是不同事实。

该目标包含 `SessionHandle` 和日志版本演进；当前 BranchMark 主线仍使用 `sessionPersistence.inspect()`。未来适配须同时检查日志读取和已保存 Clip 的来源身份，不能只把四个调用改名。[第 13 章](../tutorials/13-dsh-prerelease-upgrade.md)给出审计方法，[Session 身份参考](session-identity-and-migrations.md)解释数据风险。
