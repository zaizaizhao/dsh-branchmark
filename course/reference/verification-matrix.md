# 验证矩阵与证据边界

本页回答“一个检查究竟证明什么”。测试数量以本次 runner 输出为准，不是课程常量；测试名称和断言才是覆盖依据。本文描述已有测试能力，不预先替任何学习者填写 PASS。

## 自动化检查

| 检查 | 真实使用的对象 | 能证明 | 不能证明 |
| --- | --- | --- | --- |
| [Host spec](../../packages/host/tests/branchmark.spec.ts) | Cordis、Session、Workspace、JSON storage；受控 TestPersistence 和 LLM adapter | 来源校验、visibility、顺序、关系/recall、摘要请求、模型隔离 | 真实 JSONL provider、真实 FS/Web 工具、实际模型回答、进程崩溃恢复 |
| [Client domain spec](../../packages/client/tests/domain.spec.ts) | Controller、纯适配函数、受控 DSH Client 对象 | selection range、Composer 顺序/恢复/CAS、两种 launch、lineage 与偏好 | 宿主 DOM、真实 draft 恢复时序、CSS 与焦点行为 |
| [DockHandle spec](../../packages/client/tests/dock-handle.spec.ts) | Happy DOM 中挂载的真实组件 | 手势阈值、提交/回滚、点击抑制、keyboard、resize、存储失败、cleanup | 实际浏览器的捕获投递、触摸滚动、碰撞和像素布局 |
| [Bundle spec](../../packages/bundle/tests/bundle.spec.ts) | package manifest、patch | 声明和单 Host row | bundle 内容能否独立解析 |
| [verify-bundle](../../scripts/verify-bundle.mjs) | 构建后的 JS/DTS、ModuleLoader wrapper、Typert | 自包含、导出存在、生成 roster、安装包身份 | 真实 Slot 渲染和 provider 可用性 |
| [verify-release](../../scripts/verify-release.mjs) | manifests、实际安装的 peers、产物及发布元数据 | 版本和 generator 对齐、公开包结构 | npm 发布已发生或运行中服务已更新 |
| [verify-course](../../scripts/verify-course.mjs) | 课程、manifest 与导航 | 版本口径、文档命令和链接锚点一致 | 教学深度、真实运行环境或模型质量 |

Host [helper](../../packages/host/tests/helpers.ts)中的 persistence 是 Map-backed TestPersistence，FS 只是注入占位对象。它们不应被描述成真实 JSONL 与文件工具 e2e。新增工具测试要装入适当 provider 或受控执行替身，并标明能证明的层级。

## 真实 Web 场景

以下由实验执行者在本次安装包的真实 DSH profile 上记录结果，不以独立静态 mock 页面代替。

| 场景 | 最小证据 |
| --- | --- |
| Clip 保存与恢复 | 用户/助手、Markdown、跨消息、伪造拒绝；重启后内容/身份一致 |
| visibility 与排序 | 当前 session/project 分开、全量同组重排、筛选禁用、重启顺序保留 |
| Composer | A/C/B 选择顺序、刷新恢复、删除单枚不破坏相邻引用、缺失 token 与发送拒绝 |
| 浮签与 Dock | 默认避让、单轴移动、拖后不误开、键盘、取消/resize、同 origin 刷新、窄宽屏/深浅色 |
| 两种 child | 中间 turn 的 parent/cut/recall、clips-only 无 parent、删除 Clip 后历史保留 |
| 生命周期 | 关闭 Side Chat 后不可 get，其他 tab 不受影响；区分关闭访问与请求停止 |
| provider | 目录、首次摘要、回答、真实 tool-call/result、停止信号分别有证据 |

## 状态判定

| 状态 | 使用条件 | 示例 |
| --- | --- | --- |
| PASS | 执行了对应输入并观察到要求的结果 | 拖动后同一 origin 刷新仍恢复 |
| FAIL | 可复现偏差；需要分类为产品、适配或环境问题 | 把已知项目外文件作为成功工具结果返回 |
| BLOCKED | 缺少必要外部条件，不能完成目标验收 | 无凭证、无可用模型通道、缺少真实浏览器 |
| NOT RUN | 有明确范围但这次未执行 | 未测试 Windows 或移动设备 |

如果 provider 返回 503/model_not_found，记录“请求失败，模型验收 BLOCKED”，不能自动归因为 BranchMark 协议错误；若有效同路由请求可用而只有此功能失败，再追问其差异。菜单列出模型也不能证明该路由可推理。

## 当前需要单独覆盖的风险

- 初次摘要没有接入 send 的 AbortSignal；关闭访问不证明摘要已终止。
- relation/usages 的单条 KV put 与 Session recall append 不是跨系统事务；没有完整故障恢复测试。
- 现有测试没有覆盖五个只读工具、path escape、tool round 上限及所有 provider dialect。
- `maxReadChars` 在完整读取后截断，不限制文件读取峰值内存。
- ForkDivider 的 marker 呈现不代替 lineage；多级 fork、恢复和日志代际要分别验证。
- 当前没有自动跑真实 DSH 浏览器的完整视觉 suite，Happy DOM 不能补这个缺口。
- 后续日志版本的旧 Clip 重定位、schema migration、跨设备同步与多租户授权不属于 rc.1 已实现能力。

## 记录模板

```text
日期 / 执行者 / OS / 浏览器:
BranchMark commit + 工作树差异:
DSH package version + release commit:
CLI 路径 / 专用 home / profile / 端口 / origin:
Tarball 名称与摘要 / 安装包版本:
场景 / 输入 / 预期 / 实际 / PASS|FAIL|BLOCKED|NOT RUN:
脱敏证据路径:
失败 code / 阶段 / 已排除条件:
未验证项及下一步:
```

不要提交密钥、原始用户日志、内部 URL、完整模型请求或包含私有项目内容的截图。发布资格和发布权限分开：证据通过不等于可以自动发布 npm。
