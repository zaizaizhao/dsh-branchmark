# Security Policy

## Supported versions

BranchMark 与 DeepSeek Harness 的预发布扩展点直接集成，因此只维护 npm 已发布的精确同号组合。

| BranchMark | DeepSeek Harness | Security fixes |
| --- | --- | --- |
| `0.1.2-alpha.5` | `0.1.2-alpha.5` | Supported (`alpha`) |
| `0.1.1-rc.2` | `0.1.1-rc.2` | Supported (`latest`) |
| 其他或交叉组合 | 不同号 | Not supported |

## Reporting a vulnerability

请使用 GitHub 的 [private vulnerability reporting](https://github.com/zaizaizhao/dsh-branchmark/security/advisories/new) 提交安全报告。不要为未修复漏洞创建公开 Issue，也不要在报告中附上真实 API key、完整凭据文件或无关的私人会话数据。

报告应包含受影响版本、DSH 版本、可最小化复现的步骤、预期安全属性、实际结果和影响范围。可以使用虚构文本或经过脱敏的最小日志。维护者会在同一条私有 advisory 中协调确认、修复和披露；在修复版本可用前，请避免公开利用细节。

仓库首次公开发布前，维护者必须在 GitHub 的 Security 设置中启用 private vulnerability reporting。如果上述私有入口不可用，请不要发送敏感细节；先通过仓库所有者的 GitHub 主页请求一个私密联系方式。

## Security-relevant behavior

- 枝签、备注、标签、回收站状态和衍生关系存储在 DSH 本地 `clip_explorer` storage domain。BranchMark 不提供作者托管的同步服务。
- Session 私有记录由 Host Remote 校验 Workspace 与 owner Session。Client 过滤不是安全边界。
- 用户向 Side Chat 或衍生会话发送问题时，所选枝签、启用的备注与恢复出的来源上下文可能进入当前 DSH 模型 provider 的请求。
- Side Chat 提供项目文件读取、目录列举、项目文本搜索、Web 搜索和 Web 抓取。工具本身不写文件，但工具结果可能进入模型请求；Web 请求由 DSH 配置的 provider 执行。
- Side Chat 数据只存在于 Host 内存，关闭标签、插件卸载或 Host 退出时销毁。普通衍生 Session 由 DSH 持久化，不随枝签删除而重写。
- 插件运行在 DSH Host 进程中，拥有 profile 授予其依赖服务的能力。只从可信来源安装 tarball，并在安装前核对 package 名称、版本和完整性。

## Out of scope

DSH、模型 provider、Web provider、Node.js 或操作系统本身的漏洞应报告给各自维护者。BranchMark 配置之外的模型输出质量、提示注入和第三方网页内容并不自动构成 BranchMark 漏洞；如果它们能绕过插件声明的会话隔离、只读工具限制或显式发送要求，则属于本项目的安全范围。
