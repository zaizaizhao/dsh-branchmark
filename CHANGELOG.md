# Changelog

BranchMark 的公开变化记录遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)。公开 npm 版本与已验证的 DeepSeek Harness 版本完全同号，npm dist-tag 表示兼容通道。

## [Unreleased]

### Added

- 右侧枝签浮签支持鼠标与触摸上下拖动，位置作为浏览器偏好保存；方向键、Home 和 End 提供键盘移动。

### Fixed

- 默认浮签位置上移 120px，避开 DSH 居中的轮次导航；拖动结束不会误打开面板，取消、窗口缩放和卸载均释放拖动状态。

### Changed

- 当前源码和全部 DSH 构建、peer 依赖对齐 npm `0.1.2-rc.1`；唯一目标发布包为 `dsh-branchmark@0.1.2-rc.1`。
- 发布检查从清单读取版本，并验证实际安装的 DSH peer 与 Typert generator 一致。

### Compatibility

- `clip_explorer` domain 和会话来源格式保持不变；既有 `dsh-branchmark.ui.v1` 偏好可缺省新的 `railPosition` 字段。
- 这些变化尚未作为 npm 版本发布；Git 提交或构建不会更新远端 dist-tag。

### Documentation

- 课程统一到 rc.1 主线，区分本地源码、npm 标签与后续上游目标；修正生成命令、来源 marker、取消和读取限制的说明。
- 拆出浮签交互课，补充布局、发布演练、Session 身份与验证矩阵；保留既有章节文件链接。
- 文档检查增加课程基线、脚本引用、生成入口和导航验证，并用纯反例测试防止课程漂移。

## [0.1.2-alpha.5] - 2026-09-02

### Changed

- 将 alpha 通道整体更新为 DeepSeek Harness `0.1.2-alpha.5`，并把 BranchMark 直接使用的 DSH package、开发依赖、peer dependency 和发布检查固定到同一版本。
- 衍生 Session 校验改用 `SessionHeader.isSeeded` 与 `SessionInspection.inheritedEventCount`，用 `SessionLogOffset` 明确表示完整分叉继承的日志前缀长度。
- Composer 枝签入口改从 Session 标准 `useInput` selector 读取草稿和引用，继续通过稳定的 `inputActions` 删除引用，不依赖已移除的可变 owner snapshot。
- 测试 persistence fixture 改用 `Session.inheritedEventCount` 与 `snapshotEvents()`，保持与 alpha.5 的 Session 读取接口一致。

### Compatibility

- 本版本只对应 DSH npm/tag `0.1.2-alpha.5`。它保留该发布版的 `sessionPersistence.inspect()`，不包含 DSH 后续 `master` 尚未发布的 `SessionHandle` persistence API。
- `clip_explorer` domain、Clip 记录、备注、标签、回收站、衍生关系和 Side Chat 内存状态不需要数据迁移。

### Documentation

- README 和 Bundle README 同时列出 npm `latest` 的 `0.1.1-rc.2` 稳定组合与 npm `alpha` 的 `0.1.2-alpha.5` 组合，并更新源码构建、tarball 安装和真实 Profile 验收命令。
- 发布说明按 `release/dsh-0.1.1-rc`、`release/dsh-0.1.2-alpha` 两条兼容通道维护，精确发布使用不可变 Git tag。

## [0.1.2-alpha.2] - 2026-09-01

### Changed

- 将唯一受支持的宿主版本更新为 DeepSeek Harness `0.1.2-alpha.2`，并统一使用 Cordis `4.0.2` 与对应 DSH package family。
- Browser 集成改用 API Session/Workspace Controller、UI Conversation/Chat、UI Renderer 和 Session/Workspace 标准 Hook；Session 创建与分叉直接调用公开的 `ISessions`。
- Conversation 快照从 UI Conversation binding 取得，消息选区从 Chat View 读取；当前没有打开 Session 时，项目入口按 DSH 的最近活跃 Workspace 规则选择目标。
- DSH Markdown primitive 所需的复制与脚注文案由 BranchMark 单一模块提供。
- 侧边栏、Composer、创建流程、空状态与右侧 Dock 统一使用线装本和环抱枝条组成的枝签品牌标志；图形随 DSH 明暗主题切换为深色或浅色，并缩小视觉尺寸，紧凑把手继续保留枝签数量与 Side Chat 运行状态。

### Removed

- 移除对已被 DSH 删除的 `@deepseek-ai/dsh-client-runtime`、concrete `SessionRuntime` 和 rc.2 混合依赖图的全部引用。

### Compatibility

- `clip_explorer` domain、Clip 记录、衍生关系和 Side Chat Host 语义保持不变，不需要数据迁移。

### Documentation

- 新增 DSH Client 架构设计解读，并在课程中补充 API Controller、UI adapter、Conversation/Chat target、显式 Client composition 与统一 Remote failure 的官方动机、收益、代价和 BranchMark 落点。

## [0.1.1-rc.2] - 2026-09-01

### Added

- 新增窄宽度优先的多选命令胶囊，集中提供批量引用、Side Chat、新会话、置顶、标签和回收站操作。
- 新增固定高度枝签卡片、卡片内正文展开与居中聚焦阅读。
- 新增会话集合和项目集合的置顶与同组拖拽排序，并把顺序持久化到既有本地 storage domain。

### Changed

- 批量引用现在严格保持用户勾选顺序，并继续使用 DSH 原生 Reference Chip，不修改或自动发送 Composer 正文。
- Side Chat 与新会话批量入口分别打开对应流程；同一来源的 Side Chat 直接创建，多来源时才要求选择主要来源。
- 搜索或标签筛选期间禁用拖拽；Host 拒绝不完整集合与跨置顶组的排序请求，避免隐藏枝签被意外重排。
- DSH 重载 Composer 后，Client 会把 draft mirror 中可解析的 `@branchmark:<id>` 持久化投影重新构造成原生 Reference Chip，并保留其余草稿文字；无法解析的 token 保持可见。

## Pre-public source preview - 2026-08-30

### Added

- 新增消息选区工具条，支持保存为会话私有枝签、保存为项目全局枝签、启动 Side Chat 和加入 DSH 原生 Composer 引用。
- 新增可最小化、隐藏和调整宽度的右侧 Dock，以及会话视图、项目卡片/列表、搜索、多标签筛选和回收站。
- 新增完整分叉与仅携带枝签两种衍生会话模式，支持创建后打开或输入问题后后台发送，并保留双向来源关系。
- 新增多标签临时 Side Chat，支持模型与思考强度选择、上下文摘要、最近消息恢复、思考过程、只读项目/Web 工具活动和流式 Markdown 回答。
- 新增亮色与深色主题适配、会话关系树、稳定分支色和 Side Chat 回答二次保存。
- 新增自包含 DSH Bundle、npm 发布元数据、发布前校验、Node 22.19/24 CI、安全报告说明和贡献指南。

### Security

- Session 私有记录在 Host Remote 上按 Workspace 与 owner Session fail closed；项目记录只有在用户显式操作后才进入模型上下文。
- Composer 引用在发送事务中重新读取并校验枝签；不存在、已删除或进入回收站的引用会阻止发送。
- Side Chat 工具集合固定为只读能力，并对单次读取、搜索范围、工具输出和工具轮次设置可配置上限。

### Known limitations

- 衍生 Session 的 BranchMark 关系记录与 DSH `recall` 日志当前没有跨子系统事务。Host 在两次持久写入之间异常退出可能留下部分提交；插件不提供自动对账修复。

[Unreleased]: https://github.com/zaizaizhao/dsh-branchmark/compare/v0.1.2-alpha.5...HEAD
[0.1.2-alpha.5]: https://github.com/zaizaizhao/dsh-branchmark/compare/v0.1.2-alpha.2...v0.1.2-alpha.5
[0.1.2-alpha.2]: https://github.com/zaizaizhao/dsh-branchmark/compare/v0.1.1-rc.2...v0.1.2-alpha.2
[0.1.1-rc.2]: https://github.com/zaizaizhao/dsh-branchmark/tree/v0.1.1-rc.2
