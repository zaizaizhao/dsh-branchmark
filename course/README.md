# 从零复现 枝签 · BranchMark

这套课程带你用 DSH 的公开扩展点实现可安装的摘录插件：保存可信来源、整理枝签、恢复 Composer 引用、创建普通衍生 Session，并运行临时 Side Chat。主线对应本仓库的 `0.1.2-rc.1` 源码，宿主固定为 DSH `0.1.2-rc.1`，不是移动中的 master。可运行命令在现有教材仓库执行，独立重建任务在自己的练习目录完成，不要混用两种工作区。

## 从哪里开始

先阅读[版本基线](reference/version-baseline.md)，确认源码、依赖、运行中的 DSH 是同一个目标。全局 CLI 版本或 npm latest 不能独自证明兼容；本地源码版本也不代表已经发布。

| 你的目标 | 建议路线 | 交付物 |
| --- | --- | --- |
| 第一次开发 DSH 插件 | 第 1–5 章 → 实验 1 → 第 6、6A 章 → 实验 4、5 | 可信 Clip 主干与可恢复的浏览器交互 |
| 复现全部功能 | 基础路线 → 第 7–9 章 → 实验 2、3 → 第 10–11 章 → 实验 6 → 第 12 章 | 自包含 tarball、真实 Web 验收和 provider 验证结果 |
| 维护插件或跟进 DSH | 版本基线 → 第 13 章 → Session 身份参考 → 第 11 章 | 单目标兼容矩阵、数据演练和发布判定 |

编号用于稳定链接：第 6A 章接在第 6 章后，第 13 章是进阶选修，第 12 章仍是主线毕业项目。没有可用模型凭证时可以完成 keyless 路线，但不能把实验 3 标为通过。

## 先修知识

- TypeScript：能阅读 union、泛型、`import type` 与 declaration merging。
- React：会写组件、Hook 和受控输入；外部 store 与 Pointer Capture 会在课内讲解。
- 工程基础：会用 Git、终端和包管理器，能区分持久数据、内存状态与 RPC。
- Cordis、Typert、DSH Session 不要求预先掌握；遇到术语先查[术语表](reference/glossary.md)。

## 先验证教材本体

在已检出的 BranchMark 根目录、使用[基线工具链](reference/version-baseline.md)执行：

```sh
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm run check
pnpm run verify:docs
pnpm run verify:course
```

`check` 验证源码、测试、生成与构建产物；`verify:docs` 检查仓库内文档目标；`verify:course` 检查课程基线、命令引用与导航。它们不启动模型，也不证明真实浏览器布局。缺少工具时按[贡献指南](../CONTRIBUTING.md)准备，不在日常 DSH profile 上试装教材。

## 主线课程

| 顺序 | 章节 | 完成后的可观察结果 |
| ---: | --- | --- |
| 1 | [产品模型与三种继续探索](tutorials/01-product-and-domain.md) | 分清 Clip、full-fork、clips-only、Side Chat 与 subagent |
| 2 | [DSH 插件基础与总体架构](tutorials/02-dsh-plugin-foundation.md) | 为状态和资源找到 Host、Client 或宿主 owner |
| 3 | [独立工作区与生成链](tutorials/03-scaffold-and-build.md) | 分别证明 Typert 源码和 Bundle 产物正确 |
| 4 | [领域类型与持久化](tutorials/04-domain-types-and-storage.md) | 校验 Clip、兼容可选元数据、保留关系快照 |
| 5 | [Host Remote 与来源校验](tutorials/05-host-remote-and-validation.md) | 拒绝伪造来源、不完整重排和不匹配 Workspace |
| 6 | [选区、集合与 Composer](tutorials/06-frontend-selection-and-dock.md) | 从 DOM 恢复原文 range；恢复 Chip 且不自动发送 |
| 6A | [Dock 交互、可拖动浮签与偏好](tutorials/06a-dock-interaction-and-preferences.md) | 拖动、点击、取消、键盘与刷新恢复有明确结果 |
| 7 | [普通衍生 Session 与父子层级](tutorials/07-derived-sessions-and-lineage.md) | 用 parent、继承切点和 recall 证明两类新会话 |
| 8 | [Side Chat 上下文与 LLM 流](tutorials/08-side-chat-context-and-llm.md) | 区分目录准备、首次摘要、回答与降级 |
| 9 | [只读工具与临时生命周期](tutorials/09-side-chat-tools-and-ui.md) | 区分停止请求、标签销毁与资源实际结束 |
| 10 | [单包构建与隔离安装](tutorials/10-package-install-and-adapt.md) | 装入本次 tarball，启动精确版本 Web profile |
| 11 | [测试、故障分类与发布证据](tutorials/11-testing-debugging-and-release.md) | 按证据分层验收，不用一次绿灯替代所有检查 |
| 12 | [毕业项目](tutorials/12-capstone-reproduction.md) | 独立重建并交付功能、测试、限制与演示 |

## 进阶课程

[第 13 章：跟随 DSH 预发布版本升级](tutorials/13-dsh-prerelease-upgrade.md)教你冻结目标、比较 API 与数据格式、定位消费路径，再选择修改集合。`SessionHandle` 与日志 v2 属于独立上游源码审计，不是 rc.1 主线已经实现的功能。

## 动手实验

| 实验 | 接在何处 | 必须交付的证据 |
| --- | --- | --- |
| [1：最小可信 Clip](labs/01-minimum-durable-clip.md) | 第 5 章后 | 合法写入、伪造拒绝、重启读取 |
| [4：有序集合与引用恢复](labs/04-ordered-collection-and-reference-recovery.md) | 第 6 章后 | 集合校验、选择顺序、draft CAS 与缺失 token |
| [5：可拖动浮签](labs/05-draggable-rail.md) | 第 6A 章后 | 几何、组件事件、真实页面避让分层验证 |
| [2：普通衍生 Session](labs/02-derived-session.md) | 第 7 章后 | parent/seed/recall 对照、删除后历史保留 |
| [3：真实模型 Side Chat](labs/03-side-chat-e2e.md) | 第 9 章后 | provider/tool/取消结果与未验证项 |
| [6：隔离安装与发布演练](labs/06-release-rehearsal.md) | 第 11 章后 | 源码→tarball→安装包证据；练习不发布 npm |

## 快速参考

- [版本基线](reference/version-baseline.md)：课程版本的唯一口径。
- [架构与数据流](reference/architecture-map.md)、[DSH Client 架构解读](reference/dsh-client-architecture-rationale.md)：所有权和设计取舍。
- [依赖矩阵](reference/dsh-dependency-map.md)、[Remote API](reference/remote-api.md)、[源码导航](reference/source-map.md)：按问题定位实现。
- [Session 身份与格式迁移](reference/session-identity-and-migrations.md)：seq、offset、lineage、句柄和旧 Clip 重定位风险。
- [兼容性与限制](reference/compatibility-and-limitations.md)、[验证矩阵](reference/verification-matrix.md)：区分代码能力与环境证据。
- [原始资料](RESOURCES.md)、[课程目标](MISSION.md)、[维护约定](MAINTAINING.md)：深入阅读与后续维护。

## 学习约定

每章先理解用户结果，再读对应源码，最后完成检查点。省略 import、变量或业务细节的代码块是“节选/伪代码”，不是可直接替换的完整文件；可执行操作单独标明运行目录。检索练习先独立回答，再看源码和提示。

实验使用 `PASS / FAIL / BLOCKED / NOT RUN` 并注明证据所属环境。模型没调用工具不等于工具通过，Mock 通过不等于 provider 通过，截图不等于持久化通过。未完成的场景写明原因和下一步，不用推测补齐。
