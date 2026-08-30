# Changelog

BranchMark 的公开变化记录遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)；版本号遵循 [Semantic Versioning](https://semver.org/)。由于 DeepSeek Harness 仍处于预发布阶段，每个 BranchMark 版本同时声明已验证的 DSH 版本。

## [Unreleased]

尚无公开变化。

## [0.2.0] - 2026-08-30

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

- 衍生 Session 的 BranchMark 关系记录与 DSH `recall` 日志当前没有跨子系统事务。Host 在两次持久写入之间异常退出可能留下部分提交；`0.2.x` public preview 尚未提供自动对账修复。

[Unreleased]: https://github.com/zaizaizhao/dsh-branchmark/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/zaizaizhao/dsh-branchmark/releases/tag/v0.2.0
