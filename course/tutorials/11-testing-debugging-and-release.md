# 第 11 章：测试、调试与真实验收

本章把验证拆成领域测试、Host 组合测试、Client 纯逻辑测试、Bundle 产物测试和真实 DSH 验收。完成后，你应能根据故障所属边界选择最小证据，并且不会把 mock LLM、成功 build 或 UI 截图误当成完整发布证明。

## 1. 当前自动化测试清单

当前源码包含 23 个 Vitest case：

| 层 | 数量 | 已覆盖行为 |
| --- | ---: | --- |
| Host | 10 | Remote roster；source/forkable；伪造来源拒绝；visibility；note/trash/delete；batch；usage retention/recall；Side Chat 不改 Session；摘要；模型独立切换 |
| Client domain | 17 | 原生 Composer 引用、提交 codec、入口 UI；两类 launch 行为；多 Side Chat tabs；Dock preferences；lineage；普通 selection；Markdown selection；卡片点击不会调用浏览器 `stop()` |
| Bundle | 1 | 单 Host row、client/typert/remote exports 与 manifest |

测试名称可直接在 [`host spec`](../../packages/host/tests/branchmark.spec.ts)、[`client spec`](../../packages/client/tests/domain.spec.ts)和 [`bundle spec`](../../packages/bundle/tests/bundle.spec.ts) 中检索。

这些测试覆盖关键业务路径，但没有自动驾驶真实浏览器、没有调用真实在线 provider，也没有模拟 storage 与 Session log 之间的进程崩溃。

## 2. Host test harness 复用真实 DSH 服务

[`packages/host/tests/helpers.ts`](../../packages/host/tests/helpers.ts) 组装 Cordis context、JSON storage/domain、Session store/persistence、Workspace、LLM 等需要的服务，并创建可 inspect 的事件 transcript。测试直接调用 `ctx.branchmark`，因此能证明 Service 与 DSH 数据模型的 same-process 组合，不只是在 mock repository 上测试字符串。

来源测试必须包含真实顺序：`turn/start → step/start → user/message → assistant/message → step/end → turn/end`。测试 open turn 时省略闭合事件，验证 Host 得出 `forkable=false`。

伪造用例应在写入后再 `list`，证明失败请求没有污染表，而不是只断言返回错误。

## 3. LLM adapter 测试证明协议，不证明模型质量

Host spec 注册了可控 `LlmAdapter`：一个发固定流式文本，一个严格检查 summary/answer request 的 provider-safe message 关系。它们能证明：

- Runtime 使用 DSH `ctx.llm` 而非网络旁路。
- 摘要发生在回答之前。
- tool result 不会失去对应 call。
- Side Chat 发送/关闭不创建或修改普通 Session。
- 切换 route 后 answer request 使用新 model，父 Session request header 不变。

它们不能证明真实 provider 支持相同 reasoning/tool dialect、遵守摘要 prompt、正确处理 token limit 或能访问目标网络。发布前必须做带凭证的实验 3。

## 4. Client test 应聚焦纯适配逻辑

Client domain spec 不渲染完整 DSH 页面，而是测试最容易稳定证明的边界：

- Reference label/ref 分离、原生 occurrence 插入、重复引用拒绝与提交时 Clip 序列化。
- `launch` 只把用户问题交给 `Session.prompt`，不写 Composer、不走错误的 conversation send。
- Controller snapshot、tab、active id 与 localStorage payload。
- Lineage 对缺失/分支数据的纯投影。
- Chat node → message anchor/range。
- Markdown 可见文字 → canonical source slice。

这些测试快且能定位逻辑回归，但 Slot 是否出现、CSS 是否遮挡、DOM selector 是否还存在，需要真实 Browser smoke。

## 5. Bundle test 与产物审计

Bundle spec 检查 manifest；根 [`verify-bundle.mjs`](../../scripts/verify-bundle.mjs) 检查 build output。两者共同捕捉常见发布错误：开发 workspace import 残留、Typert identity 错、方法生成数量变化、Browser 文件不是 ModuleLoader factory、export target 漏打包。

每次改变 `@Remote` 方法、package exports、tsdown external/alwaysBundle、bundle id 或 client entry，都要同时更新 verifier 的明确预期。不要把 invocation 数量检查删成“大于 0”，那会让漏打 API 难以发现。

## 6. 推荐的本地验证阶梯

改动时先运行最窄命令，交付前运行总门：

```sh
pnpm --filter dsh-branchmark-host test
pnpm --filter dsh-branchmark-client test
pnpm --filter dsh-branchmark test
pnpm run typecheck
pnpm run build
pnpm run verify:bundle
pnpm run check
```

`pnpm run check` 已包含 typecheck、全部 tests、build 与 bundle verifier，前面的窄命令用于快速反馈，不需要在同一次无改动验证中机械重复。若要证明 clean build，先精确移除三个 package 的 `lib/` 构建目录，再运行总门；不要删除 storage data 或整个工作区。

## 7. 真实 Browser smoke matrix

至少覆盖以下纵向路径：

| 场景 | 可观察证据 |
| --- | --- |
| 简单消息摘录 | 卡片正文与原文一致，刷新/重启仍存在 |
| Markdown/链接摘录 | Host 接受 canonical range，显示完整源片段 |
| 跨消息选区 | 生成多 Clip，各自 anchor 正确 |
| 会话/项目 visibility | 当前抽屉无其他 session private Clip；项目枝签视图仅 project Clip |
| 备注/标签/批量/回收站 | mutation 后查询一致，永久删除保留 child usage |
| Composer | 可见引用进入 draft，绝不自动发送，手改 prefix 后安全拒绝自动删除 |
| full-fork | parent/seed 正确，分隔条、跳回来源、recall 与空 Composer 正确 |
| clips-only | 无 parent/seed，有 relation/recall |
| Side Chat | 多 tab、模型切换、stream/reasoning/tool、stop/hide/close 语义正确 |

最好从父 Session 的中间 turn 做 full-fork，而不是只测最后一轮；只有这样能发现错误的“总是继承到当前末尾”。

## 8. 真实 provider 验收

使用用户已经在 DSH 配置的 provider，不把 key 写进 shell history、测试 fixture、截图或文档。至少做：

1. 来源历史超过 `recentContextMessages`，观察第一次回答前确实执行摘要；问题要求引用较早决策与最近细节。
2. 切换 Side Chat model/reasoning effort，确认父 Session 模型保持不变。
3. 触发 `project_read` 与 `project_search`，检查 tool result 与回答一致。
4. 未配置 fetch provider 时触发 `web_fetch`，确认是可理解失败；配置后再测试部署认可的 URL policy。
5. 流式中停止，再继续提问；关闭运行中 tab，确认 Host entry 销毁。

真实测试可能产生 token/网络成本。先用短 fixture 与低输出上限验证协议，再做质量场景。

## 9. 按边界诊断故障

### 保存报 `excerpt-mismatch`

先打印/测试 Client candidate 的 canonical source text、range 和 `slice`，再 inspect Host event 的 derive text。若 DOM excerpt 带格式消失或空白折叠，修 selection projection；不要放宽 Host 为 `includes(excerpt)`，否则重复文本和伪造锚点无法证明。

### full-fork 后报 `derived-session-mismatch`

核对 child header `parentSession/seedLength`，再对比 DSH API Proxy 当前 boundary 算法与插件 `expectedForkSeedLength`。不要绕过验证直接写 relation。

### UI 没出现但 Host 正常

依次检查 package `dsh.client`、`exports['./client']`、boot graph、client route、ModuleLoader factory、Remote `$mount` 和 Slot registry。浏览器缓存以 bundle rev 为一致性锚；重建后需要让 Client Modules 重新 hash 或重启非 HMR profile。

### Side Chat 一直 preparing

先查模型 catalog provider 是否有挂起/失败，再查 Browser 是否仍轮询。摘要只在 send 后执行，所以创建后 preparing 不是摘要卡死的证据。

### Side Chat 有文字但工具不工作

分清 schema 已发、模型是否真的返回 tool-call、executeTool 是否参数/containment失败、DSH provider 是否存在。尤其 `web_fetch` 默认 provider unavailable 是部署配置，不是 JSON parser bug。

## 10. 当前明确的测试缺口

- 没有随包运行的真实 DSH 页面视觉/交互测试，五个 Slot、Input Trigger 注册和 selection DOM anchor 依赖真实页面 smoke。
- 没有自动测试 `project_read/list/search`、path escape、Web providers 与 tool-round exhaustion 的所有分支。
- 没有故障注入验证 `recordDerivedSession` 在 KV put 成功、Session append 失败后的修复。
- 没有大数据性能基准；Clip list 是扫描，project search 是有界遍历。
- 没有 schema migration、导入导出、跨设备或跨 Host 恢复测试，因为产品当前不承诺这些能力。

复现课程时至少为前两项补测试；稳定版发布前应设计 relation/recall reconciliation，并为真实 Browser flow 增加可重复的集成录制。`0.2.x` 以 public preview 发布时，必须在根 README、npm README 与 release notes 同时披露这个持久化窗口。

## 11. 发布前判定

只有同时满足以下条件才称为可发布候选：

```text
版本锚点与 peer dependency 一致
pnpm run release:check 通过
tarball内容和独立 profile config 正确
Clip 重启持久化与 Side Chat 重启销毁符合承诺
full-fork/clips-only header 与 recall 真实正确
真实 provider 的摘要、answer、tool、cancel 已验收
已知限制写入 release notes，不以 UI 文案掩盖
```

如果只通过 `pnpm run check`，准确报告“本地自动化通过”；不要扩张为“真实 DSH 和所有模型已验证”。

正式操作顺序、临时 `DSH_HOME` smoke、npm dry-run 与发布后复验见根目录 [`RELEASING.md`](../../RELEASING.md)。

## 12. 检索练习

1. Host harness 中使用真实 Session event sequence 比 mock `getMessage()` 有什么价值？
2. Bundle verifier 为什么要检查恰好 14 个 invocation？
3. 哪类问题只能由真实 Browser smoke 发现？
4. 哪类问题只能由真实 provider 验收发现？

下一章把整套知识变成从空目录重建的毕业项目，并用阶段性验收防止一次性复制现有实现。
