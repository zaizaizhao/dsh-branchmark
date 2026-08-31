# 实验 1：最小可信 Clip

本实验要求你在一个新的练习目录或分支中完成最小纵向切片：从 Browser 调用一个 typed Remote，在 Host 中用真实 Session 日志复核来源，再把 Clip 写入 `storageDomain`。不要复制现有 Host 整文件；只在卡住时查看“提示与对照源码”。

## 学习目标

完成后你应能独立说明并实现：

- 为什么 Browser selection 只能是 observation，不能是来源事实。
- 如何用 `sessionId + eventSeq + messageId + turn + role + range` 证明 excerpt。
- Typert Remote 的生成、挂载与两层结果处理。
- storage domain 的打开、写入、读取、关闭和损坏数据拒绝。

## 先修

完成主线第 1–5 章，并确认空 Host/Client/Bundle 能 build。实验只实现 session-scope active Clip，不实现 UI、project scope、note、tag、trash、Fork 或 Side Chat。

## 约束

- 必须复用 DSH `WorkspaceId`、`SessionId`、`MessageId`，只给 Clip 新建 branded id。
- `excerpt` 与 source 创建后不可修改。
- Client 不能提交 `reopenable/forkable`。
- Host 必须 inspect persisted Session，不能调用 Client 回传的 message text 作为 authority。
- 所有 durable write 经 `storageDomain`，不能直接写 JSON 文件。
- 业务拒绝返回 discriminated result，不用无分类异常表示“找不到来源”。

## 任务 1：定义最小 DTO

定义：

```typescript
type ClipSourceInput = {
  kind: 'session-message'
  sessionId: SessionId
  messageId: MessageId
  eventSeq: number
  turn: number
  role: 'user' | 'assistant'
  range: { start: number; end: number }
}

type ClipSource = ClipSourceInput & {
  reopenable: true
  forkable: boolean
}
```

再定义 `CreateClipRequest`、`ListClipsRequest`、`Clip` 和 `Success | Rejected`。让 TypeScript 拒绝给 Clip source 填一个任意 plain string id。

检查点：运行 typecheck；写一个 `@ts-expect-error` 编译样例或类型测试，证明 `SessionId` 不能误传为 `ClipId`。

## 任务 2：建立 domain v1

建立 `clip_explorer_lab` domain，只有一个 `clips` KV table。Schema 至少检查：id、Workspace/Session/Message ids、合法 range、非空 excerpt、status、时间戳和 source discriminant。

Service init 中 open domain，并注册 disposer close。写入前构造新 frozen object，不原地修改 table 返回值。

检查点：合法 record 可 put/get；把测试介质中的 `range.end` 改成小于 start 后，domain open 或 write 必须失败，而不是静默修复。

## 任务 3：生成两个 Remote

实现：

```text
create(request) -> business result<Clip>
list({ workspaceId, ownerSessionId }) -> business result<Clip[]>
```

为 Service 绑定 namespace，运行 Typert package-mode generation，在 Browser mount generated Remote。Client wrapper 依次处理 Gateway transport result 与 business result。

检查点：generated Remote map 中恰好有两个方法；Browser 不 import Host Service class，只 import DTO types 与 Remote artifact。

## 任务 4：实现来源复核

按顺序实现：

1. Workspace 存在，且 `ownerSessionId` 属于 Workspace。
2. `source.sessionId === ownerSessionId`。
3. `sessionPersistence.inspect(source.sessionId)` 成功。
4. `eventSeq` 对应 append surface 的 `user/message` 或 `assistant/message`。
5. `deriveEventMessage` 后 id/role/turn 一致。
6. canonical message text 的 `slice(range.start, range.end) === excerpt`。
7. 同一 turn 在下一轮开始前存在 `turn/end`，据此写 `forkable`。
8. 所有检查成功后才 `put`。

检查点：把 storage spy 放在最后，证明任意失败路径都没有调用 put。

## 任务 5：写五个行为测试

至少覆盖：

1. 完整 assistant turn 的合法 range 创建成功且 `forkable=true`。
2. 未闭合 turn 创建成功但 `forkable=false`。
3. forged message id 返回 `source-mismatch`，table 仍为空。
4. excerpt 与 range slice 不同返回 `excerpt-mismatch`，table 仍为空。
5. Session 不属于 Workspace 返回 `session-outside-workspace`，不能通过 list 读到数据。

测试 transcript 应使用真实 DSH Session append event 序列，不能把 `inspect()` mock 成一个已经计算好的 message object。

## 验收标准

```text
[ ] clean build 可生成 Remote Host/client artifacts
[ ] 两个 Remote 从 Browser 类型可见
[ ] 合法 Clip 在 Host 重启后仍能 list
[ ] 四类伪造/越权请求均失败且零写入
[ ] source/excerpt 没有 update API
[ ] domain disposer 会排空 pending writes
```

## 提示与对照源码

卡在事件到 message 的映射时，只查看 [`resolvePersistedSource`](../../packages/host/src/index.ts)；卡在 schema 时查看 [`spec.ts`](../../packages/host/src/spec.ts)；卡在生成链时查看 [`host tsdown config`](../../packages/host/tsdown.config.ts)与 DSH [API Gateway 文档](https://github.com/deepseek-ai/deepseek-harness/blob/0a53fb55bea101816fa226bb964ae2bed71c343b/docs/api-gateway.md)。

不要直接复制全部 `types.ts`，否则会把本实验尚未理解的 Side Chat/derived relation 类型一起带入。

## 复盘

完成后写下三句话：Client 提供了什么 observation；Host 从哪份 authoritative state 得到什么事实；storage 在哪一步之后才允许写。若三句中都写“前端传过来”，说明可信边界仍未建立。
