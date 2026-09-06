# dsh-branchmark-client

枝签 · BranchMark 的浏览器插件：通过 DSH Slot 提供选区工具条、可调宽度 Dock、可拖动浮签、自然高度的枝签卡片、按需显示的多选工具栏、独立回收站和会话树。卡片保留创建新会话、引用和 Side Chat 三个紧凑操作；编辑与整理放入菜单，长正文可展开或聚焦阅读。指针和键盘均可在同一置顶分组内排序，搜索、标签筛选和回收站禁止重排，删除与排序支持即时撤销。

`components/clips/` 分开集合读取、异步操作、拖拽与卡片呈现；`components/lineage/` 组合 DSH 已知会话与持久化组织关联，`domain/lineage-layout.ts` 计算纵向和全景坐标；`components/launcher/` 提供三种上下文模式与可选会话名称。新界面的文案由 `locales/` 注册为 DSH 的 `branchmark` 命名空间，样式由 `client/styles/` 按功能拆分并统一安装。

`BranchMarkClient` 集中调用 DSH Session/Workspace Controller、Composer 和 Typed Remote。完整分叉继承主要枝签所在完整轮次；仅枝签写入所选材料的 recall；空白分支只保存组织关联，创建时不携带任何历史、摘录或备注。会话树点击节点直接打开真实会话，窄面板保持可读层级，全景视图从主节点向下展开。Side Chat 仍是独立模型选择、只读工具和多标签的临时交流，不进入持久化会话树。

DSH 原生 Composer 引用仍从 draft mirror 恢复，无法解析的投影保留为文字。浏览器偏好只保存 Dock 布局；正文、备注、关系和顺序由 Host 持久化。接口与数据保证见[技术架构](../../docs/ARCHITECTURE.md)。
