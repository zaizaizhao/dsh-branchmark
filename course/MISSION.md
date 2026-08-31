# Mission: 从零复现 枝签 · BranchMark

## Why

让熟悉 TypeScript 与 React、但尚不了解 DeepSeek Harness 插件体系的开发者，能够只依赖公开扩展点完成一个可安装的摘录、衍生会话与临时 Side Chat 插件，并能根据 DSH 后续版本的真实 API 变化自行适配，而不是复制一份无法维护的代码。

## Success looks like

- 能解释 Host、Client、Bundle、Typert Remote、Session、Side Chat 与本地存储各自负责什么。
- 能从消息选区生成经 Host 校验的 Clip，并实现会话私有与项目全局两种可见性。
- 能实现置顶分组、完整集合排序、固定高度卡片、专注阅读与紧凑批量命令，并说明哪些规则必须由 Host 验证。
- 能通过 DSH 原生 `ReferenceInsert` 把多条 Clip 按选择顺序加入 Composer，并从 draft mirror token 恢复未发送引用且绝不自动提交。
- 能用 DSH 原生 `SessionRuntime.fork` 与 `SessionRuntime.create` 创建两类普通衍生会话，并正确处理父子 lineage、seed 和 Clip 快照。
- 能直接使用 `ctx.llm.stream`、`BlockAssembler`、`ctx.fs` 与 `ctx.web` 实现一个关闭即销毁、只读的 Side Chat。
- 能将 Host、浏览器 Client、Typert 产物打进一个 Bundle tarball，安装到未修改源码的 DSH Web profile，并完成可复现验收。

## Constraints

- 目标宿主是 DSH `0.1.1-rc.2`，源码锚点为 `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`。
- 插件版本为 `0.1.1-rc.2`，只使用 DSH 已公开或已导出的扩展能力，不修改 DSH 核心源码。
- 课程以当前仓库源码、生成 API 与官方文档为依据；遇到版本差异时必须重新核对源码，不能假设兼容。
- 课程使用 Markdown，并把顺序教程与查阅型参考分开。

## Out of scope

- 修改 DSH agent loop、原生侧边栏或 Composer 提交协议。
- 把 Side Chat 实现为可恢复的普通 Session。
- 使用 `ctx.subagents` 代替普通 Session 分叉。
- 导入导出、云同步、多人共享与全文倒排索引。
