# 实验 6：隔离安装与发布演练

本实验把“本地构建成功”推进到“实际安装包正确”。先完成第 10、11 章，使用 rc.1 基线；不发布 npm、不修改 dist-tag、不推送 Git tag。涉及在线模型的部分仍需要实验执行者准备 provider。

## 任务 1：记录 source 与 artifact

在 BranchMark 根目录执行：

```sh
git rev-parse HEAD
git status --short
pnpm run release:check
pnpm audit --prod --audit-level high
pnpm run pack:bundle
tar -tf dist/dsh-branchmark-0.1.2-rc.1.tgz
```

给记录附上退出状态与 tarball 路径。清单必须无 source maps、真实 Session 数据和私有工作区依赖；不要把上一次生成的旧包当作本次产物。dry-run 会检查包装内容，但不向 npm 发布。

## 任务 2：隔离运行中的两个维度

原样执行[第 10 章的精确 CLI 与 home 安装步骤](../tutorials/10-package-install-and-adapt.md#4-固定-cli再创建隔离-home)。记录临时 CLI prefix、测试 DSH home、profile 和启动端口。

解释两个维度为什么都需要隔离：新 home 不会改变 CLI 可执行文件版本；安装新 CLI 不会自动重启旧进程。浏览器必须连接本次进程，不能仍停留在日常服务页面。

## 任务 3：证明安装的是这份文件

从测试 profile 的实际已安装 `dsh-branchmark` package 读取版本，并比较其中的 `lib/client.js` 与 tarball 的同名文件。可以使用系统摘要工具或 Node crypto；记录所用命令和两边结果，不在未确认路径时扫描整台机器。

判断题：两个 manifest 的 version 相同但 JS 摘要不同，能否判定同一候选？不能。重新核对构建时间、tarball 来源、安装结果和 client rev；不能只刷新页面直到“看起来对了”。

## 任务 4：按风险完成验收

完成[验证矩阵](../reference/verification-matrix.md)中的最小真实路径，重点看本次新增或改变的行为。至少验证保存 Clip、重启读取、Composer 不自动发送、full-fork/clips-only 区别和浮签拖动。需要 Side Chat 发布资格时，摘要、answer、tool、cancel 分别验收，普通会话的一次成功回答不能替代它们。

## 任务 5：做一次不发布的决策

给出下列结果之一，并解释证据：

- 仅自动化通过：还缺安装/浏览器或 provider 证据。
- 本地安装候选通过：指定 OS、浏览器和 provider 场景完成；可交维护者评审发布。
- 暂停候选：存在 FAIL，或关键场景 BLOCKED；列出恢复条件。

查询 npm 标签只用只读命令。当前源码 rc.1 尚未发布时，不能要求别人执行 npm 精确安装来完成本实验；正式发布及发布后的全新 npm 安装验收由 [RELEASING.md](../../RELEASING.md)另行执行。

## 交付物

交付一份[证据记录](../reference/verification-matrix.md#记录模板)，附 tarball 清单、包内容比对、真实页面结果和明确未验证项。没有授权的发布命令不应出现在执行日志中。

停止前台 DSH 后再清理自己创建的测试目录，先核对精确路径；保留课程/用户仓库和日常 DSH home。课程目标是让发布可判断、可复现，不是自动把包发出去。
