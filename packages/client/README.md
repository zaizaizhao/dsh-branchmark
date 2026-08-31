# dsh-branchmark-client

枝签 · BranchMark 的浏览器插件：贡献支持跨 Markdown 块反向映射的紧凑选区工具条、不改变宿主布局且避开 Header 与 Composer 的可调宽度浮动 Dock、随 DSH 明暗主题切换的线装本品牌 Logo 和状态角标、固定高度与聚焦阅读卡片、多选命令胶囊、置顶与同组拖拽排序、严格分离的本会话与项目枝签视图、可从 draft mirror 的可解析投影恢复的 DSH 原生 Composer 引用、会话关系树，以及带独立模型选择、思考和只读工具活动的多标签 Side Chat。无法解析的投影保留为可见文字，不会被伪装成有效上下文。`BranchMarkClient` 集中调用 DSH API Session/Workspace Controller、UI Conversation/Chat 和配套的 `dsh-branchmark-host` Typed Remote；视图组件不直接解释这些服务的内部投影，也不要求修改 DSH 源码。
