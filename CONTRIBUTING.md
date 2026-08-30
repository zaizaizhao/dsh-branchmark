# Contributing to BranchMark

感谢你帮助完善枝签 · BranchMark。普通缺陷、交互建议和兼容性问题可以先提交 [GitHub Issue](https://github.com/zaizaizhao/dsh-branchmark/issues)；安全问题必须按 [`SECURITY.md`](SECURITY.md) 私下报告。

## 开发环境

- Node.js `^22.19.0 || >=24.0.0`
- Corepack 与 pnpm `11.7.0`
- 用于运行时验收的 DeepSeek Harness `0.1.1-rc.2`

```sh
git clone https://github.com/zaizaizhao/dsh-branchmark.git
cd dsh-branchmark
corepack enable
pnpm install --frozen-lockfile
pnpm run check
```

不要提交 API key、DSH 凭据文件、真实会话数据、`node_modules/`、`lib/`、`dist/` 或浏览器验收截图缓存。

## 代码结构

- `packages/host/`：持久化、Remote、来源校验、衍生 Session 和 Side Chat 运行时。
- `packages/client/`：消息选区、Dock、项目集合、Composer 引用、关系树和 Side Chat UI。
- `packages/bundle/`：唯一公开发布包；把 Host、Typert、Remote 与浏览器入口编译为自包含 Bundle。
- `docs/`：产品需求、架构和架构决策。
- `course/`：面向复现与学习的分阶段教程，不是运行时文档。
- `scripts/`：品牌、Bundle 和发布前机械校验。

`dsh-branchmark-host` 与 `dsh-branchmark-client` 必须保持私有。运行时依赖 DSH 提供的 package 应保持 peer dependency，不要把 Cordis 或 DSH 核心 package 改成普通 dependency，否则 profile 可能加载重复框架实例。

## 变更要求

- 保持纯插件实现；不要要求用户修改 DeepSeek Harness 源码。
- 模型可见的新输入必须能从 DSH Session 日志或 BranchMark 持久记录中恢复。
- Session 私有数据必须在 Host Remote 上校验 owner Session，不能只依赖 Client 过滤。
- Side Chat 继续保持临时、只读工具和关闭即销毁；扩大工具权限需要独立的安全设计与文档更新。
- 用户可见行为变化需要同步更新根 README、npm README、相关测试和 `CHANGELOG.md` 的 `Unreleased` 节。
- UI 变化需要在亮色与深色主题、窄屏和宽屏下验收，并在 PR 中附上截图或短录屏。
- 注释和文档描述当前行为、失败条件和安全使用方式，不保留设计讨论过程或评审对话。

## 验证

日常改动先运行覆盖变更表面的最小命令，提交前运行完整 keyless 检查：

```sh
pnpm run check
```

准备可发布产物时运行：

```sh
pnpm run release:check
pnpm audit --prod --audit-level high
pnpm run pack:bundle
```

`release:check` 会构建并测试三个工作区、验证公开包元数据与 peer 声明、运行 publint，并执行 npm dry-run。涉及真实模型回答、摘要或 Web provider 的改动还需在本地配置好的测试 profile 中单独验证；不要把凭据加入测试夹具或 CI。

## Pull request

PR 应保持单一主题，并说明：

- 用户可见的变化与不变项；
- 数据、模型上下文或工具权限是否变化；
- 已运行的确切命令；
- 尚未覆盖的真实 provider 或平台条件；
- UI 变化的视觉证据。

维护者合并前会按 [`RELEASING.md`](RELEASING.md) 的发布边界检查公开 Bundle。提交贡献即表示你的修改按本项目 MIT License 授权。
