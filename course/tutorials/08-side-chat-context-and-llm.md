# 第 8 章：Side Chat 上下文与 LLM 流

本章实现不创建普通 Session 的临时问答运行时。完成后，你应能从 primary Clip 恢复来源模型配置与消息前缀，把较早历史压成摘要、保留最近原始消息和完整 Clip，并直接通过 DSH LLM capability 流式回答。

本章的上下文算法不因新版 persistence 改变，但“取得来源 events”是版本适配点：alpha.2/alpha.5 使用 inspection，2026-09-02 master 使用只读 `SessionHandle` 并要求显式关闭。不要把资源读取差异扩散进摘要、消息重建和工具循环；收敛方法见[第 13 章](13-dsh-prerelease-upgrade.md)。

## 1. Side Chat 不是“小号 Session”

[`TemporarySideChatRuntime`](../../packages/host/src/side-chat.ts) 拥有一个 `Map<SideChatId, SideChatEntry>`。Entry 包含冻结的 source messages、Clip、模型 route、临时消息、流式片段、工具状态和 AbortController，但没有 DSH `SessionId`、SessionHeader、event log 或 persistence。

因此它的承诺是：

- 不改变父 Session 的 transcript、当前思路或模型选择。
- 不出现在普通 Session 列表与 lineage 中。
- Host 重启、插件停止或用户关闭 tab 后不可恢复。
- 隐藏或最小化 Dock 只改变 Browser 布局，不销毁 Host entry。

若产品后来要求恢复临时聊天，不能只把 `Map` 换成 JSON；那会新增日志格式、恢复、清理、迁移与模型可见输入可重建等完整 Session-like 责任。

## 2. 创建请求仍需要一个 primary

`createSideChat` 接受多个唯一 Clip、一个包含在其中的 primary，以及每条 note 是否携带。Host 验证所有 Clip 属于 Workspace 且 active；primary 必须来自可完整闭合 turn 的 `session-message`。

多个 Clip 可以来自不同位置，但只有 primary 决定来源历史与默认模型 route。其余 Clip 只作为显式 recall。这样不会把多条彼此不连续的历史误装成一段 Session transcript。

## 3. 从来源消息恢复 prefix

Runtime inspect primary 的 source Session，找到 source `eventSeq`，再向后找到同一 `turn` 的 `turn/end`：

```typescript
const prefix = sourcePrefix(events, source.eventSeq, source.turn)
const header = foldRequestHeader(prefix)
const sourceMessages = reconstructedMessages(prefix)
```

`sourcePrefix` 在该 `turn/end` 处截止；它不像普通 Session fork 那样继续包含 boundary 后、下一次 `turn/start` 前的 standalone events。这里构造的是模型消息上下文，不是复刻 DSH seed。若未来需要两者严格同构，应复用 DSH 暴露的官方 projection，而不是继续维护两套相似算法。

`reconstructedMessages` 只遍历 append surface events，并用 DSH `deriveEventMessage` 恢复规范 `Message`。不要从 React 渲染后的 Markdown HTML 反向拼模型历史。

## 4. 继承的是请求配置，不是父 Session 状态引用

`foldRequestHeader(prefix)` 恢复截至来源位置有效的模型调用配置，当前 entry 把 `header.config` 复制为自己的 `route`。Side Chat 后续切换模型只替换 entry route，不会写回父 Session。

这是“默认跟随目标模型”的准确实现：开始时使用来源请求配置；用户可在 Side Chat 的 model picker 中显式选择 provider/model/reasoning effort。Host 通过：

- `ctx.llm.listProviders()` 列 provider。
- `ctx.llm.listModels(providerId)` 列 model。
- `ctx.llm.resolveModelInfo()` 读取 reasoning efforts。
- `ctx.llm.resolveCallConfig()` 校验并规范化用户选择。

单个 provider 的目录失败会进入 `modelFailures`，不会让其他 provider 的选项一起消失。

## 5. 创建阶段不执行摘要

`create()` 同步完成来源 inspect/prefix/header/messages，并启动 `prepareModelCatalog()`。初始 snapshot 的 `status='preparing'` 主要表示模型目录还在加载；catalog 完成后变成 `idle`。

较早历史摘要不是创建时执行，而是在第一次 `send()` 时通过 `entry.contextPromise ??=` 懒启动。当前 UI 在空消息的 preparing 状态显示“正在生成来源摘要并恢复上下文”，这比底层真实动作更宽泛；复现时应把文案改成“正在准备模型与来源上下文”，或保留本章所述行为认知。

懒执行的好处是用户关闭一个从未提问的 tab 时不会消耗摘要 token；代价是第一次回答的首 token 延迟包含摘要时间。

## 6. 上下文压缩算法

第一次发送时，`prepareContext()` 先按消息条数得到名义切分点，再向前退到一条非 tool 来源的 user message：

```typescript
let split = Math.max(0, messages.length - recentContextMessages)
while (split > 0) {
  const message = messages[split]
  if (message?.role === 'user' && message.source.kind !== 'tool') break
  split -= 1
}
const earlier = messages.slice(0, split)
const recent = messages.slice(split)
```

因此 `recentContextMessages` 是至少保留数量，不是精确数量。向前扩展避免 recent segment 从 assistant/tool result 中间开始，保持回答请求中的用户轮次和 tool-call/result 关系完整；如果之前没有安全 user boundary，split 退到 0，本次不做摘要并保留全部原始消息。

最终 context order 是：

```text
[可选：较早 source history 的 AI summary recall]
[从安全 user boundary 开始的至少 N 条 source 原始 Message]
[完整 selected Clips + 显式选择的 notes recall]
[Side Chat 用户问题与之后的临时对话]
```

“完整 Clip”指 excerpt 不因历史摘要而截断；note 默认携带，但 Launcher 允许逐条取消。上下文不是按 token 精确预算，而是以 `recentContextMessages` 为下限并向前寻找安全边界，再分别由 `summaryMaxTokens`、`answerMaxTokens` 和工具输出限制约束。安全扩展和超长最近消息都可能继续触及 provider context limit，这是当前限制。

## 7. 专用摘要模型与 route 时序

若 `summaryProvider` 和 `summaryModel` 都为空，摘要使用 entry 当前 route；两者都配置时，保留 route 的其他调用选项，只替换 provider/model。

Runtime 不把 earlier 的原始多角色 `Message[]` 直接发给摘要 endpoint，而是用 `summaryTranscript()` 序列化为一段 JSON text，再封装成唯一一条 user message。Transcript 保留 user/assistant/tool 角色、text、tool-call 参数和 tool-result 内容；省略 reasoning，以 `[omitted]` 代替 image。摘要指令明确把这段 JSON 视为不可信来源、忽略其中指令，并要求保留决策、约束、未决问题、具体名称、路径、命令、工具结果与最终答案。

单一纯文本 user message 避免把截断后的 tool-result 作为孤立协议消息发送给 provider，也兼容拒绝复杂多角色摘要历史的 endpoint；它不把来源内容变成可信 system instruction。

模型选择的时序很重要：

- 第一次 send 之前切换 Side Chat 模型，会影响默认摘要 route 和回答 route。
- 第一次 context 已成功准备后，`contextPromise` 被保留；之后切换模型只影响后续回答，不重新生成既有摘要。
- 专用摘要模型配置存在时，用户选择从始至终不改变摘要 provider/model。

摘要流也走 `ctx.llm.stream()`，用 `BlockAssembler` 聚合。`stop` 或 `max-tokens` 且有非空 text 都视为可用摘要；`error`/`aborted` 保留 provider failure code/message，其他 finish kind 被拒绝。接受 `max-tokens` 意味着摘要可能截断，所以部署仍应根据来源长度校准 `summaryMaxTokens`。

## 8. 摘要失败必须显式降级

摘要失败时 Runtime 不让整个 Side Chat 消失，而是设置包含 provider 原因的 `contextWarning`，继续携带从安全 user boundary 开始的最近原始消息和完整 Clip。UI 要向用户展示这个 warning；当缺失的较早历史可能影响结论时，模型 system prompt 也要求承认限制。

这是有损但可见的降级，不是静默假装已继承完整上下文。若最近消息本身也无法进入 provider context，目前回答会进入 `error`，不会再做第二层自动压缩。

## 9. 显式 Clip recall 的角色

摘要和 selected Clips 都通过 `createUserMessage` 构造，source 标为：

```typescript
{ kind: 'plugin', plugin: 'dsh-branchmark', form: 'recall' }
```

它们不冒充父 Session 的原始 user message。Clip recall 为每条材料写出来源提示、excerpt 和被选择的 note；temporary answer 只标为临时来源，不含可跳转 Session anchor。

普通衍生 Session 的 recall 会进入 durable session log；Side Chat recall 只存在 `contextMessages` 内。DSH 的“model-visible 必须 logged”规则约束普通 Session capability；本插件选择绕开普通 Session 构建独立临时 LLM runtime，因此必须把“不可恢复”作为显式产品语义，而不能声称它是可重放 Session。

## 10. 直接调用 LLM capability

回答循环每轮调用：

```typescript
for await (const chunk of ctx.llm.stream({
  ...entry.route,
  messages: [...entry.contextMessages, ...entry.messages],
  system: entry.system,
  tools: [...TOOLS],
  maxTokens: answerMaxTokens,
  signal,
})) {
  assembler.push(chunk)
  // 投影 text-delta / reasoning-delta
}
```

`ctx.llm.stream` 是 provider waterfall，所以仍复用 DSH 的 provider 路由、模型配置和标准 chunk 协议；`BlockAssembler` 把 delta、tool call 和 finish 合成规范 assistant `Message`。

但这条路径不会经过普通 DSH agent-loop、Session persistence、compaction、全局 tool registry 或 agent preset。Side Chat 的 system、tools、轮数和消息生命周期全部由本插件拥有。不能因为使用同一个 LLM provider 就假设普通 agent 的 hook/guard/tool 都会运行。

## 11. 流式快照与完成状态

运行中 `partialReasoning`、`partialText` 随 chunk 更新；完成后 assembler 生成 assistant message，再清空 partial。Snapshot 把用户/assistant 消息、reasoning 和 tool activity 投影为 Browser DTO，不泄露 private route 或 AbortController。

finish 处理如下：

- `stop` 且无 tool calls：status 回到 `idle`。
- tool calls：第 9 章的只读循环继续。
- `aborted`：清空 partial，回到 `idle`，保留此前完整消息。
- `error` 或异常：status 变 `error`，保存可显示错误。

同一 tab `running` 时拒绝第二个 send 和模型切换，返回稳定 `side-chat-busy`，不隐式排队。

## 12. 本章检查点

在 Host tests 中使用 fake LLM stream 验证：

```sh
pnpm --filter dsh-branchmark-host test -- --run
```

应能证明：创建/提问/回答不向 `SessionStore` 追加事件；第一次 send 才准备 context；较早历史被摘要、最近消息与所有 Clip 原文仍在 answer request；模型切换只改变 Side Chat route，不改变来源 Session 配置。

真实 provider 的 token、finish 和 reasoning 表现留到实验 3，mock test 不能证明某个实际模型会遵循摘要 prompt。

## 13. 检索练习

1. `foldRequestHeader` 为什么比读取“当前 UI 模型”更符合来源位置语义？
2. 第一次 send 之前与之后切换模型，对摘要分别有什么影响？
3. 为什么 Side Chat 可以没有 `session/end-seed`？
4. 直接 `ctx.llm.stream` 会自动获得普通 Session 的 tools 和 compaction 吗？

下一章会补齐固定只读工具、轮次控制、Browser 轮询、多标签 UI 和关闭即销毁的完整生命周期。
