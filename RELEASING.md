# Releasing BranchMark

本流程发布唯一的公开 package `dsh-branchmark`。`packages/host` 与 `packages/client` 是私有实现工作区，不得单独发布。

## 1. Release prerequisites

- GitHub 仓库为 `https://github.com/zaizaizhao/dsh-branchmark`，默认分支启用 CI 与必要的合并保护。
- GitHub Security 已启用 private vulnerability reporting。
- npm 账户拥有 `dsh-branchmark` package，启用双因素认证；如果使用 trusted publishing，应先在 npm 与 GitHub 配置对应 workflow，再单独评审发布 workflow。
- 当前机器使用 Node.js `^22.19.0 || >=24.0.0` 和 pnpm `11.7.0`。
- 发布版本已在根目录、Host、Client 与 Bundle 四份 `package.json` 中保持一致，`CHANGELOG.md` 已从 `Unreleased` 移入带日期的版本节。

首次发布前确认 package 名称仍可用：

```sh
npm view dsh-branchmark name version
```

未发布 package 会返回 `E404`；这不代表后续仍会保留名称，正式发布前需要再次检查。

## 2. Build and inspect

从干净 checkout 执行：

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run release:check
pnpm audit --prod --audit-level high
pnpm run pack:bundle
```

`release:check` 包含类型检查、全部 keyless 单元测试、三工作区构建、Bundle 自包含检查、公开元数据检查、publint 和 npm dry-run。publint 当前会提示 `./client` 是在 `type: module` package 中交付的 CommonJS 文件；这是 DSH 动态浏览器插件要求的 lazy-CJS factory 格式，只要 DSH 的 Bundle smoke test 通过，该警告不是发布阻塞项。

检查 tarball 只包含公开运行所需文件：

```sh
tar -tf dist/dsh-branchmark-0.2.0.tgz
pnpm --dir packages/bundle publish --dry-run --access public --no-git-checks
```

预期只包含清单列出的编译后 JS/DTS 入口、`cordis.patch.yml`、`README.md`、`LICENSE` 和 `package.json`；不得包含 source map、源码目录、测试、凭据、真实会话数据或私有工作区文件。

## 3. Fresh-profile smoke test

使用临时 DSH home，避免改变日常 profile 与已有 `clip_explorer` 数据：

```sh
BRANCHMARK_SMOKE_HOME="$(mktemp -d)"
DSH_HOME="$BRANCHMARK_SMOKE_HOME" dsh plugin --profile web add "$(pwd)/dist/dsh-branchmark-0.2.0.tgz"
DSH_HOME="$BRANCHMARK_SMOKE_HOME" dsh --profile web --dump-config
DSH_HOME="$BRANCHMARK_SMOKE_HOME" dsh --profile web
```

完成以下人工验收：

- Web profile 无 plugin tree、peer 或 browser module 加载错误；
- 用户与助手消息的连续文本选择都出现四个操作；
- 会话私有枝签只出现在来源 Session，“项目”只显示显式保存到项目的枝签；
- Composer 只显示可移除的引用 Chip，发送前不出现完整正文，也不会自动发送；
- 完整分叉、仅枝签、创建并打开、创建并发送都符合来源关系与 Composer 规则；
- Side Chat 可选模型与思考强度，可停止、最小化、切换多个标签并在关闭后立即销毁；
- 亮色、深色、窄屏和宽屏下 Dock、选区工具条与弹层没有遮挡或对比度问题；
- 配置可用的测试 provider 后，至少完成一次摘要、一次普通回答和一次只读工具调用。

测试结束后可以删除临时目录；先核对 `BRANCHMARK_SMOKE_HOME` 确实指向刚创建的专用目录，不要对用户 home、`~/.dsh` 或仓库目录执行递归删除。

## 4. Publish and verify

确认工作树、版本和 tarball 与已评审内容一致后发布：

```sh
pnpm --dir packages/bundle publish --access public --no-git-checks
npm view dsh-branchmark@0.2.0 name version dist.tarball engines peerDependencies
```

随后从 npm 在新的临时 profile 中重复最小安装 smoke test，再创建签名 tag 与 GitHub Release：

```sh
git tag -s v0.2.0 -m "BranchMark 0.2.0"
git push origin v0.2.0
```

GitHub Release 说明应从对应 `CHANGELOG.md` 版本节整理，并附上兼容 DSH 版本、安装命令、数据迁移说明和已知限制。

## 5. Failed release

不要覆盖已发布版本。发现问题后先暂停推广；对不应继续安装的版本使用 npm deprecation message，修复后发布新的 patch 版本，并在 changelog 与 GitHub Release 中说明影响和升级路径。只有满足 npm unpublish policy 且确有安全必要时才考虑 unpublish。
