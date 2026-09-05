# 第 6A 章：Dock 交互、可拖动浮签与布局偏好

本章接在第 6 章后，专注一个用户结果：右侧枝签入口可上下移动，松手不会误展开，刷新和缩放仍可找到，键盘用户也能操作。完成后，你能解释临时手势与已保存偏好的不同生命周期，并知道为什么 Happy DOM 测试不能证明真实页面没有遮挡。

## 1. 先写交互规则，再写坐标

浮签贴住右边缘，只允许垂直移动；正常点击展开 Dock，拖动不展开。默认位置在垂直中线上方 120 px，用来避开 DSH 居中的轮次导航。用户仍可能拖到其他控件上，所以这是默认避让加人工调整，不是自动碰撞检测。

不要混淆两种“拖拽”：Clip 卡片排序修改 Host 的 `sortIndex`，浮签移动只修改本浏览器的布局偏好。二者没有共同的 Remote、排序事务或权限含义。

## 2. 为三种状态选择所有者

| 状态 | 所有者 | 保存时机 | 生命周期 |
| --- | --- | --- | --- |
| pointer id、起始坐标、是否越过阈值 | `DockHandle` 的 ref | 不保存 | 一次手势 |
| `liveTop` | `DockHandle` 的 React state | 不保存 | 预览期间，取消即丢弃 |
| `railPosition`、Dock mode/view/width | `BranchMarkUiController` | 松手或键盘命令后 | 内存状态，可写入浏览器偏好 |

[`controller.ts`](../../packages/client/src/domain/controller.ts)使用稳定 snapshot 对象：`getSnapshot()` 在没有更新时返回同一对象，更新时构造新对象再通知订阅者。`useSyncExternalStore` 据此判断更新；不能每次读取都临时拼一个新 snapshot，也不能原地修改旧 snapshot 后期待 React 发现变化。

`dsh-branchmark.ui.v1` 只保存 `mode/view/width/railPosition`。没有 Clip 正文、Session 日志、选区或 Side Chat 消息。未提交拖动不调用 preference store，所以中途取消不会污染刷新恢复位置。

## 3. 用比例保存位置，用像素渲染

[`rail-position.ts`](../../packages/client/src/domain/rail-position.ts)把几何计算提取为三个纯函数：`railBounds`、`railTop`、`railPosition`。高度为 H、把手高度为 58 时，正常窗口两端留 12 px；窄小高度下减少边距。

```text
min/max = 当前窗口允许的 top 范围
top = min + position × (max - min)
position = clamp((top - min) / (max - min), 0, 1)
默认 top = clamp((H - 58) / 2 - 120, min, max)
```

`null` 或旧偏好缺少字段表示默认位置，数字 0 表示顶边，1 表示底边。两端重合时比例返回 0，不能除以零。`railTop` 对保存位置四舍五入，测试比较恢复值时允许相应像素舍入；高度小于把手本身时无法保证整枚可见，这不是 clamp 能消除的物理限制。

以 H=720 为例：可用 top 为 12–650，默认 top=211；拖到 411 后保存 `(411-12)/638`，而不是 411。换一个窗口高度，比例按新的可用行程还原，不需要改写 Host 数据。

## 4. Pointer Capture 与点击分流

[`DockHandle.tsx`](../../packages/client/src/components/DockHandle.tsx)只接受主指针、主按钮，并且一次只持有一个 pointer id。[Pointer Capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)让手指或鼠标离开按钮区域后，后续指针事件仍发送给该按钮，直到释放或取消。

```text
pointerdown → 捕获指针，记录起点
  ├── 移动距离 < 6 px → 仍视为点击候选
  └── 移动距离 ≥ 6 px → 预览受限 top
        ├── pointerup → 提交比例，释放捕获，抑制本次指针 click
        └── cancel / lost capture / resize → 回滚预览，不提交
```

阈值用二维移动距离判断用户是否在拖动，但坐标只使用 Y 差值：横向拖出很远也不能变成一次误点击，同时按钮不会离开右边缘。不要只监听 `pointermove`；释放事件可能带有最后一次未观察到的新坐标，`finish()` 会再计算一次位置。

浏览器可在拖动后产生兼容 `click`。组件只抑制这一枚指针点击，下一次点击仍可展开；`detail=0` 的键盘激活不能一起吞掉。CSS 的 `touch-action: none` 限于浮签，不能给全屏 overlay 禁止滚动。

## 5. 取消与释放也属于功能

三条退出路径必须独立检查：正常松手提交；`pointercancel` 和 `lostpointercapture` 回滚；resize 取消旧手势后使用新窗口高度重算已提交位置。组件卸载要释放捕获并移除 resize listener。

释放前先清空当前 drag ref，防止 `releasePointerCapture()` 导致的丢失捕获事件再次处理同一次手势。并发指针和已禁用按钮不取得手势所有权；这个规则不应该由“用户通常只用一根手指”代替。

## 6. 键盘与偏好异常

浮签保留原生 button 语义：聚焦后 ↑/↓ 每次移动 24 px，Home/End 到达可用顶/底边，Enter/Space 展开。不要把按钮改成没有语义的 div，也不要为支持拖动而统一阻止所有键盘事件。

偏好从 JSON 进入时属于不可信持久输入：缺失、字符串、NaN 或非有限位置使用默认，越界数字限制到 0–1。存储读取失败使用默认；写入被隐私模式或配额拒绝时，本次内存交互仍可用，但下次刷新不承诺恢复。这个可丢弃策略只适用于布局，不能复制到 Clip domain。

## 7. 三层验证各证明什么

先在 BranchMark 根目录运行现有组件测试：

```sh
pnpm --filter dsh-branchmark-client exec vitest run tests/dock-handle.spec.ts
```

[`dock-handle.spec.ts`](../../packages/client/tests/dock-handle.spec.ts)挂载真实组件，覆盖鼠标/触摸、阈值、取消、resize、存储异常、键盘与清理。它的捕获替身只记录本按钮的所有权；不能由此证明浏览器实际的 Pointer Capture 投递或 CSS hit testing。

| 验证层 | 断言 | 仍不能证明 |
| --- | --- | --- |
| 纯几何 | 比例、clamp、默认值、零行程 | DOM 事件顺序 |
| Happy DOM 组件 | event handler、提交时机、点击抑制、cleanup | 真实布局、触摸滚动、浏览器生成的兼容 click |
| 已安装 tarball 的 DSH 页面 | 右边缘、轮次导航可点击、主题/尺寸/刷新 | 所有浏览器和设备均兼容 |

真实页面测试由实验执行者完成，使用第 10 章的隔离安装；不要用一个独立静态按钮页面代替真实 DSH。保持同一 origin 复验刷新偏好，换端口会改变 localStorage 所属 origin。

## 8. 检查点与检索练习

完成[实验 5](../labs/05-draggable-rail.md)，交付默认位置、拖后位置、刷新恢复和键盘操作的证据；同时记录尚未测过的平台。

1. 为什么 `liveTop` 不在每次 pointermove 时写入 controller？
2. 为什么 0 不能表示“没有保存位置”？
3. 横向拖动不改变 top，为什么仍要抑制 click？
4. 删除 resize listener 后，为什么还要释放 pointer capture？
5. 哪一层测试能证明 DSH 的轮次导航不被挡住？

提示：依次回看状态所有者、null 的含义、二维意图/单轴坐标、两个独立资源、真实页面验证。接下来学习[第 7 章](07-derived-sessions-and-lineage.md)。
