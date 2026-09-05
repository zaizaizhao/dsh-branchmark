# 实验 5：可拖动浮签与布局恢复

本实验用一枚右侧浮签练习几何、状态机、持久偏好和测试分层。先完成第 6、6A 章；在独立练习分支实现，不改 DSH 原生布局。卡片排序不属于本实验。

## 任务 1：先计算，再渲染

按第 6A 章规则实现纯函数，测试 H=720 时默认 top=211、上下限=12/650。测试 H=60 时边距缩小、行程重合不会得到 NaN。用比例保存位置，证明换高窗口后仍位于可用范围。

检查点：测试几何结果，不读取 DOM；对往返换算使用符合舍入规则的近似断言，不能要求所有浮点值严格相等。

## 任务 2：区分预览和提交

实现主指针捕获、6 px 手势阈值和单轴 preview。`pointermove` 更新临时 top，`pointerup` 才写 store；cancel、丢失捕获、resize 都撤销未提交位置。卸载释放捕获和 listener。

至少用 store spy 证明：移动十次但未松手时写入次数为 0；松手后只提交最终位置；取消后仍为原偏好。测试纯水平拖动，确认既不离开边缘，也不误展开。

## 任务 3：让键盘和旧偏好也能工作

实现 ↑/↓、Home/End，并保留按钮的键盘激活。输入旧 JSON（没有 `railPosition`）、字符串位置、越界数字以及拒绝读写的 storage adapter；分别断言默认、clamp 和内存可用结果。

检查点：持久化 payload 只有布局字段，不含 Clip 正文、Session id 或 Side Chat 消息。不要通过清空全部 localStorage 修复一个非法字段。

## 任务 4：在教材组件上核对自己的测试

在 BranchMark 根目录执行：

```sh
pnpm --filter dsh-branchmark-client exec vitest run tests/dock-handle.spec.ts
```

先自己列输入和结果，再看[组件测试](../../packages/client/tests/dock-handle.spec.ts)。测试用 `act()` 提交 React 更新，每个 case 清理 root、DOM、mock 和被替换的全局值；不要让上一例窗口高度决定下一例结果。Happy DOM 的 pointer capture 替身不是浏览器实现。

## 任务 5：安装 tarball 后做真实验收

实验执行者按[第 10 章](../tutorials/10-package-install-and-adapt.md)启动隔离 rc.1 Web profile。使用普通测试 Workspace，记录浏览器、viewport、origin 和插件版本。

| 输入 | 可观察结果 |
| --- | --- |
| 宽屏默认位置 | 浮签位于居中轮次导航上方，导航可点击 |
| 斜向拖动并松手 | 只沿右侧上下移动，不误展开 |
| 下一次正常点击 | 能展开；最小化后回到保存位置 |
| 同一 origin 刷新 | 恢复已提交位置 |
| 拖动途中缩小窗口 | 旧手势取消，未提交位置不写入 |
| 窄屏拖到两端 | 在窗口足够容纳把手时保留边距 |
| 键盘定位再 Enter/Space | 移动和展开均可用 |
| 深浅主题与其他 overlay | 图标、焦点、计数可读；未发现阻塞宿主控件 |

## 提交物与评分

提交纯几何测试、组件行为测试，以及真实页面证据各一份。只交 screenshot 不能通过事件语义项；只交 Happy DOM 绿灯不能通过布局项。没有真实浏览器环境就标 `BLOCKED`，不把“样式里写了 right: 0”当作已验证。

复盘：解释本功能为什么不需要 Host Remote、不升级 `clip_explorer` schema，也不修改 DSH 的消息列宽度。对照实现见[几何函数](../../packages/client/src/domain/rail-position.ts)、[DockHandle](../../packages/client/src/components/DockHandle.tsx)和[布局偏好](../../packages/client/src/domain/controller.ts)。
