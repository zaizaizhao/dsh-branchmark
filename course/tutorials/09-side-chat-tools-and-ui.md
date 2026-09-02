# 第 9 章：只读工具、临时生命周期与 Side Chat UI

本章完成 Side Chat 的工具循环和 Browser 交互。完成后，你应能解释“只读”的精确范围，限制 project path 与输出规模，展示多标签流式状态，并验证隐藏、取消、关闭和保存回答的不同后果。

## 1. 只读是工具能力，不是整个 UI 无写入

Side Chat 给模型的工具全部只读，不允许写文件、执行 shell、修改 Session 或创建 Clip。用户在 UI 中点击“保存回答”时会通过普通 Clip `create` Remote 明确写入一条摘录；这是人发起的持久化动作，不是模型工具副作用。

因此准确表述是：“Side Chat 模型运行时只有固定只读工具，并且不修改父 Session；用户仍可显式把回答保存为 Clip。”

## 2. 五个固定工具

[`TOOLS`](../../packages/host/src/side-chat.ts) 是本插件随每次 answer request 发送的 schema：

| Tool | DSH capability | 用途 |
| --- | --- | --- |
| `project_read` | `ctx.fs.stat/readText` | 读取一个项目内 UTF-8 regular file |
| `project_list` | `ctx.fs.listDir` | 列出一个项目内目录的直接子项 |
| `project_search` | `ctx.fs.listDir/readText` | 有界 breadth-first 字面文本搜索 |
| `web_search` | `ctx.web.search` | 通过部署配置的 search provider 搜索 |
| `web_fetch` | `ctx.web.fetch` | 通过部署配置的 fetch provider 获取 URL |

没有使用 DSH 普通 tool registry，也没有把父 Session 可用工具名单转发进来。新增工具必须同时更新 schema、`executeTool` 的 closed switch、snapshot/UI label 和测试。

## 3. 工具参数要在 wire 后再次收窄

模型返回的 `call.arguments` 是 JSON string。Runtime 用 `JSON.parse` 验证它是非数组 object，再用 `requiredString` 检查必要字段。Tool schema 可以引导 provider，却不能替代执行端 validation；模型输出属于不可信边界。

未知 tool name 直接抛错并产生 `isError=true` 的 tool result，不降级成任意函数查找。这样即使 provider 返回插件没有声明的名字，也不会扩大能力。

## 4. Project path containment

所有文件工具先调用 `projectTarget()`：

```typescript
const workspace = workspaceRegistry.get(entry.workspaceId)
const root = await fs.resolve(workspace.path, { signal })
const target = await fs.resolve(path, { cwd: workspace.path, signal })
if (!fs.contains(root, target)) throw new Error('path resolves outside the current project')
```

检查的是 DSH FS provider 解析后的 target，而不是对用户字符串做 `startsWith`。因此 `../`、符号链接或 provider-specific path identity 都交由 FS abstraction 解析，再用 `contains` 判定所属关系。

`project_read` 还要求 `stat.type === 'file'`。课程不把 `readText` 描述为二进制安全读取；不可读或非文本文件在 search 中被有名称的 catch 跳过。

## 5. Project search 的资源上限

当前 search 从目标目录 breadth-first 遍历，跳过 `.git` 和 `node_modules`，最多扫描 `maxSearchFiles`，最多保留 100 条匹配。每个文件最多读取/搜索 `maxReadChars` 个字符，最终 JSON 再受 `maxToolOutputChars` 限制。

这些是 LLM 上下文和运行成本边界，不是高性能全文索引。大仓库应考虑新增专用 search provider 或索引服务，而不是简单把默认值无限增大。

## 6. Web capability 的部署差异

`web_search` 和 `web_fetch` 复用 DSH Web Service，所以 provider、错误与 AbortSignal 均由宿主能力处理。当前默认 `dsh-base` 挂有 search provider，但明确没有默认 fetch provider；因此 schema 中存在 `web_fetch` 不代表每个安装都能成功执行。

DSH [Web 子系统文档](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/subsystems/web.md)还说明本地 HTTP fetch backend 默认不阻断 private-network target。若部署需要 fetch，管理员必须选配满足自身 SSRF/network policy 的 provider；插件不能把一个通用 `ctx.web.fetch` 调用宣传为自动隔离内网。

Provider unavailable 会变成正常的 error tool result，模型可以据此改用搜索或向用户说明限制，不会让 Runtime 调用任意替代网络库。

## 7. 手工工具循环

每个 LLM round 由 `BlockAssembler` 生成 assistant message。若包含 tool calls，Runtime 按调用顺序执行每个工具，为每个 call id 追加 `createToolResultMessage`，再进入下一轮。

最多执行 `maxToolRounds` 个工具轮；若模型在最后允许的 round 后仍要求调用工具，Runtime 以“exceeded configured read-only tool round limit”结束为 error。无 tool call 时立即完成，不为了用满轮数继续调用模型。

单个工具失败只形成 `isError=true` 的 tool result，模型仍可在下一轮解释或改用其他工具；LLM stream 自身失败则结束整个当前回答。

## 8. Abort 从 UI 贯穿到 provider

每次 send 创建一个 `AbortController`，signal 同时传给 `ctx.llm.stream`、FS 和 Web calls。三种动作不同：

| 动作 | Host entry | 当前运行 | 已完成消息 |
| --- | --- | --- | --- |
| 最小化/隐藏 Dock | 保留 | 继续 | 保留 |
| “停止” | 保留 | abort，回到 idle | 保留 |
| 关闭 tab | 从 Map 删除 | abort | 全部销毁 |
| 插件 dispose/Host 退出 | Map 清空 | 全部 abort | 全部销毁 |

`cancel` 后 tab 可以继续提问；`close` 后旧 id 的 get/send 返回 `side-chat-not-found`。Browser 不能通过重新打开 Dock 恢复已关闭 entry。

## 9. Browser 用 snapshot 短轮询

[`SideChatView`](../../packages/client/src/components/SideChat.tsx) 每 500 ms 对所有当前 tab 并发调用 `getSideChat`，并用 `controller.upsertSideChat()` 替换 snapshot。它不是 token push、SSE 或 WebSocket：

```text
Host stream updates mutable entry
    ↓ every 500 ms
Browser fetches immutable snapshot
    ↓
React renders partial reasoning/text/tool status
```

`polling` guard 防止前一轮未完成时重入；effect cleanup 清 timer。标签数增加时 Remote 请求数线性增长，这是选择简单实现换来的成本。未来改为 push transport 时，Host runtime 与 DTO 可以保留，Browser observation 层需要替换。

## 10. 多标签与模型选择器

Controller 维护 tab array 与 `activeId`；新 Side Chat 默认创建并打开，也可以 `activate=false` 后台创建。每个 tab 有独立模型 route、messages、status 和 AbortController。

Model picker 展示 provider 分组、model description、reasoning efforts 与单 provider 目录失败。运行中禁用切换；选择后通过 `selectSideChatModel` 在 Host `resolveCallConfig`，Browser 不自行拼 provider-specific 参数。

Tab 标题当前只使用 `Side Chat N`，Clip 不要求标题。关闭按钮先从 Browser controller 移除，再调用 Host close；若 Host 已不存在，Client 将 `side-chat-not-found` 视为关闭后的幂等结果。

## 11. 消息、reasoning 与工具活动展示

Snapshot 不直接返回 raw tool-result messages，而是把 tool call 与同 id result 合并成 `SideChatToolSnapshot`，挂在发起调用的 assistant message 上。UI 使用 `<details>` 展示：工具名、query/path/url 摘要、running/success/error、完整 arguments 与受限 output。

Reasoning 单独放在可折叠区，正文用 DSH `MarkdownText` 渲染；streaming partial 使用 streaming mode 和 caret。Browser 自动滚到底部，但不会把 reasoning 当成可持久 source 的正文。

## 12. 保存 Side Chat 回答

用户可以保存整条 assistant `message.text`，也可以在一条 assistant message 内选择部分文本。两者都创建：

```typescript
source: { kind: 'temporary-answer', role: 'assistant' }
scope: 'session'
ownerSessionId: originalSideChatOwner
```

该 Clip 默认成为启动 Side Chat 的来源会话枝签，可再一键提升为项目级。它没有 durable Side Chat id/message id/range，Host 只能保存提交的 excerpt，因此 `reopenable=false`、`forkable=false`。它可作为 clips-only/Side Chat 附件，不能作为 full-fork primary。

如果未来要让临时回答可重新打开，就必须先把 Side Chat transcript 变成 durable source；仅添加一个字符串 id 不会创造可验证 provenance。

## 13. 本章检查点

在真实 Web profile 中逐项验证：

1. 同时打开两个 Side Chat，分别切换模型并提问，确认 route 与回答不串 tab。
2. 让模型读取一个项目文件，确认 UI 显示 read tool，尝试 `../` 路径并观察 containment 拒绝。
3. 在未配置 fetch provider 的 profile 请求 fetch，确认以工具失败展示而不是 Host crash。
4. 回答中点击停止，确认 tab 仍可继续问；最小化再恢复，确认运行继续。
5. 关闭一个正在回答的 tab，确认 get old id 为 not-found；另一个 tab 不受影响。
6. 保存一段回答，确认出现 session Clip，但 full-fork primary 选择器禁用它。

## 14. 检索练习

1. “Side Chat 永远只读”为什么需要改写成更精确的两层描述？
2. `fs.contains` 应在 resolve 前还是后执行？
3. 为什么 tool schema 存在仍要解析和检查 arguments？
4. 500 ms 轮询与 SSE 的替换边界在哪里？

下一章把 Host、Browser 与生成产物包装成一个可安装 tarball，并在不修改 DSH 源码的情况下装进 Web profile。
