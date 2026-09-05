# 课程维护约定

本页面向课程维护者。`course/` 是独立 BranchMark 仓库的中文教学资料，不是 DSH 上游文档网站的镜像；保留中文标题、开篇目标、编号步骤和检查点，不套用上游 package README 的双语 frontmatter、折叠段和模板。既有双语 Agent Notes 仍成对维护。

结构与检查的取舍见[课程维护决策](../.agents/notes/implemented/process/2026-09-05-version-pinned-course.zh.md)。

## 每类页面只负责一件事

`tutorials/` 按先修关系解释并实现结果；`labs/` 给任务、失败输入、验收和提示，不把参考实现称作读者已完成；`reference/` 提供可查事实。课程入口只维护路线，版本集中在[版本基线](reference/version-baseline.md)，测试能力与缺口集中在[验证矩阵](reference/verification-matrix.md)。

拆章时保留已有文件链接和锚点，可以用 6A 插入编号。新增页面必须从课程入口可达，旧页迁移内容时留下直达链接。不要把升级案例中的旧 API 写进主线默认路径。

## 示例与证据规则

- 完整脚本有运行目录、工具链、预期结果和恢复方式；无法实际执行的环境步骤指明实验执行者与前置条件。
- 类型和实现节选说明上下文与省略项，并链接源码；不能用伪代码展示不存在的真实 package script。
- 发布命令由根 [RELEASING.md](../RELEASING.md)维护。课程演练停在 tarball/dry-run/隔离安装，不要求发布 npm、推送 tag 或改变日常 profile。
- UI、真实 provider、崩溃恢复各需要对应证据。测试计数以本次运行结果为准，不在各章硬编码。
- durable Clip、Session 权威日志、派生缓存、浏览器布局偏好分别说明恢复责任。布局可丢弃不意味着用户数据也可丢弃。

## 修改后验证

在 BranchMark 根目录执行：

```sh
pnpm run verify:docs
pnpm run verify:course
git diff --check
```

`verify:course` 只读取文件，不联网、不启动 DSH、不执行 Markdown 中的 shell。它检查基线与 manifest、教程命令引用、课程导航锚点及页面可达性，不能证明示例算法或真实浏览器行为。新增规则必须用故意错误的 fixture 证明会拒绝，再验证真实课程。

行为说明变化时运行对应测试，生成/打包说明变化时运行生成和产物检查；缺少模型或平台环境时写明 `BLOCKED` 或 `NOT RUN`。纯课程改动不修改 DSH 源码、Host 业务、用户数据格式或 npm 标签。
