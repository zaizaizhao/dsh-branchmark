# dsh-branchmark-host

枝签 · BranchMark 的 Host 插件：验证并持久化 Clip、备注、标签、置顶和集合顺序；保存普通衍生 Session 的组织关联与不可变使用快照；运行不创建 Session 的临时只读 Side Chat。安装时使用 `dsh-branchmark` Bundle。

`BranchMarkService` 提供 Typed Remote 和 Clip 操作，`DerivedSessionStore` 独立持有关系校验与存储。记录新关系时必须显式指定 `parentSessionId`，父子 Session 都必须属于请求的 Workspace；完整分叉还需验证 DSH parent、seeded 位和精确继承长度。仅枝签追加选中材料的 recall，空白分支必须没有附件和消息内容，且不追加模型输入。同一子 Session 的并发记录请求只能提交一次。

`listRelations` 可读取整个 Workspace，或按 Clip/子 Session 缩小范围。`includeSessions: true` 还读取关系端点的标题和可用性，使用 DSH 的 `foldSessionTitle`，不向 Browser 返回日志正文；普通卡片查询不产生这些额外读取。已有记录继续读取；缺少组织父标识的旧关系不推测父会话。关系与使用快照仍在一个 KV 值中提交，永久删除 Clip 不改写衍生会话。携带材料的模式在保存关系后追加 DSH recall，两个持久化系统之间没有跨系统事务。详细保证见[技术架构](../../docs/ARCHITECTURE.md)。
