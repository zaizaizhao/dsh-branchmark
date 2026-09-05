# 第 11 章：测试、故障分类与发布证据

本章训练一个维护者能力：为每项结论选择能证明它的检查。先完成构建与隔离安装；完整测试能力和缺口集中在[验证矩阵](../reference/verification-matrix.md)，不在这里维护会随源码变化的 case 计数。

## 1. 从反例设计测试

每个功能先写一条成功输入和一条能破坏承诺的输入，再选择最小测试层：

| 承诺 | 成功输入 | 必须拒绝或保留原状态的输入 |
| --- | --- | --- |
| Clip 来源可信 | message/range/excerpt 一致 | 同样正文配伪造 message id |
| 完整集合重排 | 全部 active ids，同组移动 | 只提交搜索结果或跨置顶组 |
| Composer 不覆盖编辑 | 当前 span + draftRev | 等待期间用户修改目标文本 |
| 浮签只在松手提交 | pointerup 保存最终位置 | cancel/resize 不保存预览 |
| full-fork 截止来源 turn | 父中间 turn | 把全部最新父历史都带入 |
| 临时工具不越界 | 测试项目内文件 | 已知项目外的无敏感测试文件 |

失败用例不仅断言错误，还检查没有非预期写入。模型没有真的发出 tool-call，不能算工具拒绝或通过；这种安全规则先用确定性执行测试验证，再用真实模型验收组合。

## 2. 正确理解当前 Host harness

[helpers.ts](../../packages/host/tests/helpers.ts)复用真实 Cordis、Session、Workspace 和 JSON storage，持久日志由受控 `TestPersistence.records` 提供，LLM 是可控 adapter，FS 是占位服务。它验证 same-process 行为，不是假装一套真实生产 Web profile。

因此可以在已有 spec 中判断来源、relation 和摘要请求，但不能据此说“JSONL 升级、文件系统 containment 和真实 provider 均测试通过”。若要补后者，应选择其真正的 provider、格式 fixture 或真实环境。

## 3. 让测试观察用户承诺

Client domain 测试验证纯选择、引用、顺序与 launch 编排；Happy DOM 测试挂载真实 DockHandle，验证事件处理和清理。两者都不拥有真实 DSH 布局。

不要把 className 存在当成视觉验收，也不要把调用过 `abort()` 当成后台请求已终止。为取消区分请求发出、adapter 观察到 signal、运行结束、tab 是否保留四个结果；当前初次摘要的取消缺口见[第 9 章](09-side-chat-tools-and-ui.md)。

## 4. 按改动选择命令

以下从 BranchMark 根目录运行，按需求选择，不要求每次全执行：

```sh
pnpm --filter dsh-branchmark-client exec vitest run tests/dock-handle.spec.ts
pnpm --filter dsh-branchmark-client test
pnpm --filter dsh-branchmark-host test
pnpm --filter dsh-branchmark test
pnpm run verify:docs
pnpm run check
```

第一条用于浮签组件，Client 全测用于 Composer/selection/controller，Host 测试自带 Host build，Bundle 测试检查声明。课程文字修改先跑文档检查；生成链/跨包变化使用 `check`，发布候选再使用 `release:check`。同一轮没有代码变化时，不为“提交一次”机械重复已通过命令。

clean-build 证明最好来自新的 checkout 和 frozen lockfile，不在用户当前目录盲目递归清理。新建练习骨架需要先生成自己的 lockfile，不能拿教材 lockfile 验证不一样的依赖图。

## 5. 故障分类决定下一步

| 现象 | 先收集的证据 | 不应该做什么 |
| --- | --- | --- |
| `excerpt-mismatch` | 两端 canonical text、range、slice 与 message identity | 放宽 Host 为 includes |
| `derived-session-mismatch` | parent/isSeeded/cut、source 完整 turn、实际 DSH 版本 | 绕过 Host 验证写 relation |
| UI 没出现 | profile、Host inject、boot graph、factory、Remote、Slot | 先改 Host 业务或复制整个 DSH UI |
| UI 仍是旧浮签 | source/artifact/installed/runtime 四层版本 | 只看全局 CLI version |
| Side Chat 一直 preparing | catalog promise 与 Browser polling | 把 preparing 直接解释成摘要卡死 |
| 第一次回答超时 | catalog/summary/answer 分阶段请求与错误 | 一律判为插件不兼容或无限加 timeout |
| 模型存在但 503/model_not_found | 同 profile 的实际推理可用性、路由与阶段 | 把目录返回当成模型健康检查 |
| 工具没出现 | request.tools、实际 tool-call、参数、provider | 把模型的自然语言回答当成工具输出 |

不要把排错过程中的完整 prompt、密钥或用户日志贴进课程证据。安全的最小复现使用人工测试文本和受控项目目录。

## 6. 部分成功和损失性降级

relation/usages 在一个 KV value 内提交，但 Session recall append 是第二步；当前没有跨系统事务。prompt 也可能在 child 创建后失败。这些情况下先核对已完成的阶段，不能盲目重跑整条创建流程。

摘要失败时可以携带最近消息与完整 Clip 继续，但 UI 必须保留 contextWarning；“降级路径工作”与“历史摘要功能通过”是两个结论。可用目录、短普通回答、带工具回答、长上下文摘要也必须分开记录。

## 7. 实验结果不等于发布操作

[实验 3](../labs/03-side-chat-e2e.md)验证真实模型，[实验 5](../labs/05-draggable-rail.md)验证布局/指针，[实验 6](../labs/06-release-rehearsal.md)验证实际安装包。使用 PASS/FAIL/BLOCKED/NOT RUN 明确范围，记录日期、版本、平台和失败阶段。

[CI](../../.github/workflows/ci.yml)运行自动化与包装检查，不自动发布 npm；它的绿色状态不能替代真实 provider 或浏览器验收。正式发布及 dist-tag 提升需要单独授权，操作步骤由 [RELEASING.md](../../RELEASING.md)维护。

## 8. 本章检查点

为自己最近一项改动提交“承诺→反例→测试层→命令/场景→结果”的五列表。至少包含一个可控失败和一个未验证项，不用“应该没问题”填写空白。

检索练习：为什么 Host harness 的 Map 不能证明冷启动？为什么组件测试通过后还要看真实导航按钮？为什么 503 不能单独证明 RPC 不兼容？为什么恢复错误后不一定能重试整个 create？完成后进入[毕业项目](12-capstone-reproduction.md)。
