# 从零复现 枝签 · BranchMark

这是一套以真实源码为教材的顺序课程。完成主线后，你应当能从一个空目录构建、安装并验收一个不修改 DSH 源码的 BranchMark：它能从消息生成会话枝签和项目枝签、持久化置顶与手动顺序、恢复 Composer 原生引用、创建普通衍生 Session、运行多个临时 Side Chat，并在右侧 Dock 中展示父子会话关系。

课程不是实现总结，也不是 API 目录。`tutorials/` 按先修关系带你完成系统；`labs/` 要求你在不照抄整文件的情况下复现关键纵向切片；`reference/` 用于开发时快速查阅。涉及 DSH 架构变化时，课程会区分官方明确决策、当前实现事实和 BranchMark 工程解读，避免把推测写成 DSH 作者动机。

## 版本锚点

| 项目 | 本课程核对版本 |
| --- | --- |
| DeepSeek Harness | `0.1.2-alpha.2` |
| DSH Git commit | `0a53fb55bea101816fa226bb964ae2bed71c343b` |
| BranchMark | `0.1.2-alpha.2` |
| Node.js | `^22.19.0 || >=24.0.0` |
| pnpm | `11.7.0` |
| TypeScript | `^6.0.3` |
| React | `^18.2.0` |

DSH 当前处于预发布阶段。课程中标为“当前导出”的能力不等于稳定 API；升级前先执行[兼容性审计](reference/compatibility-and-limitations.md)，不要用编译通过代替运行行为核对。

## 先修知识

- 能阅读严格模式 TypeScript、discriminated union、泛型与 declaration merging。
- 能编写 React function component、Hook 和受控表单。
- 知道 HTTP RPC、事件日志、流式 token、AbortSignal 和本地 KV 存储的基本概念。
- 不要求提前了解 Cordis、Typert 或 DSH Session 内部结构；课程会在使用前建立这些概念。

## 先验证教材本体

在插件根目录执行：

```sh
cd /absolute/path/to/deepseek-harness/dsh-branchmark
corepack enable
pnpm install
pnpm run check
```

`pnpm run check` 依次运行 Host 生成、TypeScript 检查、Vitest、全部构建和自包含 Bundle 校验。只有这条命令成功，后续章节引用的生成 Remote 与 Bundle 文件才是同步的。

## 主线课程

| 顺序 | 章节 | 完成后的可观察结果 |
| ---: | --- | --- |
| 1 | [产品模型与三种“继续探索”](tutorials/01-product-and-domain.md) | 能区分完整分叉、仅枝签 Session、Side Chat 和 DSH subagent |
| 2 | [DSH 插件基础与总体架构](tutorials/02-dsh-plugin-foundation.md) | 能画出 Host、Client、Bundle 与现有 DSH 服务的组合图，并解释为何没有聚合 Client Runtime |
| 3 | [建立独立工作区与生成链](tutorials/03-scaffold-and-build.md) | 能从空目录建立三个 package，并生成 Typert Host/Remote 产物 |
| 4 | [领域类型与本地持久化](tutorials/04-domain-types-and-storage.md) | 能创建兼容旧记录的 `clip_explorer` domain，并读写不可变 Clip、排序元数据与关系快照 |
| 5 | [Host Service、Remote 与来源校验](tutorials/05-host-remote-and-validation.md) | 能从浏览器调用类型化 API，拒绝伪造来源、局部排序和跨置顶组排序 |
| 6 | [前端选区、Dock 与 Composer](tutorials/06-frontend-selection-and-dock.md) | 能恢复 canonical range，挂载完整 Dock，并维护可恢复的 DSH 原生 Clip 引用 |
| 7 | [普通衍生 Session 与父子层级](tutorials/07-derived-sessions-and-lineage.md) | 能按消息所在完整 turn 分叉，并验证 parent/seed/recall/双向关系 |
| 8 | [Side Chat 上下文与 LLM 流](tutorials/08-side-chat-context-and-llm.md) | 能恢复来源模型、生成较早历史摘要并流式组装回答 |
| 9 | [只读工具、临时生命周期与 Side Chat UI](tutorials/09-side-chat-tools-and-ui.md) | 能运行有边界的工具循环、多个标签、停止与关闭即销毁 |
| 10 | [单包发布、安装与 DSH 适配](tutorials/10-package-install-and-adapt.md) | 能打出自包含 tarball，并安装到未修改源码的 Web profile |
| 11 | [测试、调试与真实验收](tutorials/11-testing-debugging-and-release.md) | 能区分单元、构建产物、真实组合和带凭证 LLM 验收 |
| 12 | [毕业项目：从空目录到可安装插件](tutorials/12-capstone-reproduction.md) | 能按检查点重建功能，不依赖复制现有目录 |

建议按顺序学习。第 1–3 章建立 DSH 心智模型，第 4–6 章完成 Clip 主干，第 7 章完成持久衍生会话，第 8–9 章完成临时 Side Chat，第 10–12 章完成交付与独立复现。

## 动手实验

- [实验 1：最小可信 Clip](labs/01-minimum-durable-clip.md)要求你只做一条可验证的选区→Remote→storage 纵向切片。
- [实验 2：两类普通衍生 Session](labs/02-derived-session.md)要求你用真实 DSH API 证明 full-fork 与 clips-only 的结构差异。
- [实验 3：真实模型 Side Chat](labs/03-side-chat-e2e.md)要求你用有效 provider 完成摘要、流式回答、只读工具和取消测试。
- [实验 4：有序集合与 Composer 引用恢复](labs/04-ordered-collection-and-reference-recovery.md)要求你实现完整集合重排，并从持久化 token 无损恢复原生引用。

## 快速参考

- [系统架构与数据流](reference/architecture-map.md)
- [DSH Client 架构设计解读](reference/dsh-client-architecture-rationale.md)
- [DSH 既有插件与依赖矩阵](reference/dsh-dependency-map.md)
- [14 个 Typed Remote 方法](reference/remote-api.md)
- [源码导航](reference/source-map.md)
- [兼容性、限制与升级检查](reference/compatibility-and-limitations.md)
- [术语表](reference/glossary.md)

## 课程约定

- “普通 Session”指 DSH Web 侧边栏中的持久会话；“衍生 Session”仍是普通 Session。
- “父子会话”只指 DSH `SessionHeader.parentSession` 形成的 lineage；Clip 的使用关系是插件自己的数据，不自动等于父子关系。
- “Side Chat”指 Host 进程内 `Map` 拥有的临时上下文；它没有 Session id，也没有恢复承诺。
- 源码链接是当前行为的最终依据。教程片段省略 import 或 UI 细节时会明确标为“节选”，不能直接替换完整源文件。
- 每章末尾的“检索练习”先凭记忆回答，再打开源码核对。这样既验证理解，也避免只获得短期熟悉感。

如果某一章的结论和你安装的 DSH 类型或运行结果冲突，以安装版本为准，并从[兼容性清单](reference/compatibility-and-limitations.md)开始定位差异。
