# 兼容性、限制与升级检查

本页记录会影响“纯插件可实现性”的 DSH 事实，以及当前实现主动接受的限制。它不是未来承诺；每次升级都要重新执行检查。

## 当前版本依赖的关键事实

| 事实 | 当前证据 | 失效后的处理 |
| --- | --- | --- |
| concrete `SessionRuntime.create` 是公开导出且创建后立即可 binding | DSH Client Runtime `SessionRuntime.create` | 明确报 `session-create-unavailable`；不能用可能复用空白 Session 的其他入口冒充 |
| `SessionRuntime.fork({ atSeq })` 存在 | DSH Client contract/runtime | 禁用 full-fork；不能复制文本后标记为继承上下文 |
| Host API 把消息 seq 对齐到第一个 `seq >= atSeq` 的 `turn/end` | `host/apiproxy` 的 `session.fork` | 重新实现边界验证或调整交互；不得假设仍按完整 turn |
| fork child header 持久化 `parentSession` 与 `seedLength` | Session header + API Proxy | 无法证明 lineage 时拒绝记录插件关系 |
| seeded Session 写 `session/end-seed` | `Session` constructor | fork divider 需要改用宿主提供的新边界事件；不能猜 seq |
| Browser list 投影 `parentSessionId → SessionSummary.parentId` | Client Runtime `projectList` | 关系树改读新的官方字段，不扫描标题或插件关系猜父子 |
| Chat 行有 `[data-chat-flow-key]` 且 snapshot 暴露 Chat nodes | `ChatNodeSeat` + Client Runtime | 选区捕获必须迁移到新的官方 selection/slot API；DOM 猜测需要重新验收 |
| 五个 Slot 名和 props contract 存在 | layout/sidebar/conversation SlotMap | 编译并逐席位验收；不要注册到 `root` 替换整页 |
| `ReferenceInsert`、`InputTriggerSource.codec`、`SessionInput.insertReference()` 与 draft persistence mirror 存在 | ui-input-trigger + ui-conversation input contract | 缺失时拒绝装载；不得回退为完整摘录正文草稿；重新设计 token 恢复而不能猜 occurrence 内部格式 |
| Browser module接受 `window.__ModuleLoader__.load` 包装 | Client Modules | 按新的官方 bundle format 重新构建 client.js |
| Typert package mode生成 Host 与 Remote artifacts | generator + API Gateway | 调整 build order/exports；不提交手写 codec 作为长期替代 |

## `SessionRuntime.create` 是当前 concrete API

DSH 的窄接口 `ISessions` 暴露 `fork`，但没有 `create`。当前包仍导出 concrete `SessionRuntime`，插件在 [`BranchMarkClient.launch`](../../packages/client/src/domain/client.ts) 中显式收窄并检查 `typeof sessions.create === 'function'`。这是有意的兼容性边界，不应藏在 `as any` 中。

如果后续 DSH 把 create 加入稳定接口，只需移除 concrete cast；如果移除导出，需要官方新建 Session API。不要回退到会复用现有 blank Session 的入口，因为这会让“仅枝签新会话”修改一个已有对象。

## full-fork 不是复制消息

当前 DSH fork 在 Host 读取 attached state 或 persistence，选择来源完整 turn，复制事件 seed，继承 cwd/agent preset，并写 header lineage。插件只传来源 message 的 `eventSeq`，不重建 UI 中看到的消息。

任何降级方案若只把 Clip 文本贴到新 Session，都只能叫 clips-only，不能继续显示“继承来源上下文”。

## Composer 引用依赖原生 Input Trigger codec

当前 DSH 的 `ReferenceInsert` 把短 label 和版本化 ref 存入 Composer occurrence table，并由来源 `codec.serialize()` 在提交事务中生成模型文本。BranchMark 使用这条公开链路，因此输入框不含完整摘录，序列化失败也会阻止提交并保留 draft。普通衍生 Session 仍采用另一条路径：Host append `form: 'recall'` 的日志消息，Composer 保持空白。

结构化 occurrence 只存在于当前输入机器，但 DSH 会把每枚 occurrence 的 clipboard projection 写入按 Session 持久化的 draft mirror。BranchMark 的 projection 是 `@branchmark:<id>`；重新绑定或刷新 Composer 后，Shell 观察这些 token，分别读取当前会话私有集合与项目集合，再从右向左调用公开 `insertReference()` 重建 occurrence。可解析的 active Clip 恢复为原生 Chip，无法解析、已回收或不可见的 token 保持普通可见文字。

这项恢复服从目标 DSH 的 draft 持久化生命周期，不是 BranchMark 自有同步协议。它不会跨浏览器设备、清除站点存储后或 DSH 不再恢复该 draft 时凭空找回输入；它也不会恢复其他 Session 的 private Clip。两类可见集合都读取失败时不修改 draft，恢复期间 span 或 `draftRev` 变化时不覆盖用户编辑。

## Web fetch 不是默认可用能力

DSH `dsh-base` 默认配置 search provider，并明确没有挂载 fetch provider。`ctx.web.fetch` 方法仍存在，但调用会以结构化 provider-unavailable 错误失败。BranchMark 的 `web_fetch` schema 因此代表“允许模型请求这个只读操作”，不代表目标部署一定能执行。

当前官方 Web 文档还指出本地 HTTP fetch provider 不默认阻断 private-network target。需要 fetch 的部署必须选择符合自身 SSRF 策略的 provider；插件不应把 `ctx.web.fetch` 描述为对所有部署都安全的公共互联网隔离器。

## Side Chat 的已知限制

- 所有状态只在单个 Host 进程内存中，重启、插件卸载或关闭标签后不可恢复。
- Browser 以 500 ms 短轮询观察流式状态，不是 SSE/WebSocket；标签很多时请求数量线性增长。
- 同一个 Side Chat 同时只运行一个回答；`side-chat-busy` 不排队。
- 创建阶段只恢复来源 prefix 并加载模型目录；较早历史摘要在第一次发送时懒执行。当前空状态文案比这一真实时序更宽泛。
- `recentContextMessages` 是最低保留数；切分点向前扩展到非 tool user message，可能保留更多原始上下文并增加 token 使用。
- 较早历史先转换为一条不可信 JSON text transcript 再请求摘要；reasoning 被省略，image 只保留 omitted 标记，tool call/result 文本会保留。
- 较早历史摘要失败时只保留安全边界后的最近原始消息和完整 Clip，并通过包含 provider 原因的 `contextWarning` 告知用户。
- 直接 LLM 调用不使用普通 Session agent loop、工具注册表、重试/compaction/persistence 的完整组合；只会经过 `ctx.llm.stream` waterfall 和 provider 行为。
- 只读工具的 project search 是受限的 breadth-first 文本扫描，不是 ripgrep，也没有索引；会跳过 `.git`、`node_modules` 和不可读/非文本文件。
- Tool output 和 read content 按字符截断；这限制模型输入，不是文件级授权机制。
- temporary answer Clip 只保存用户提交的正文与 owner Session，没有 durable Side Chat/message anchor，因此不可重新打开或 full-fork。

## Clip 存储与检索限制

- `storageDomain` 当前没有二级索引；`list` 会扫描 domain 内记录，再按 Workspace、visibility、标签和文本过滤。
- 全文搜索只匹配 excerpt 和 note，不匹配来源标题，也不会进行分词或语义搜索。
- 多标签筛选是 AND 语义。
- 置顶与排序只作用于 active 的精确会话集合或项目集合；回收站没有手动顺序。
- 手动重排要求完整集合替换，搜索或标签筛选时禁用；置顶与未置顶之间不能直接拖拽，必须先显式切换置顶状态。
- 当前没有直接键盘排序操作；键盘用户可以切换置顶和使用全部批量命令。
- Clip 绑定 Workspace 与 owner Session，不绑定 Worktree。
- 没有导入、导出、同步、冲突合并或 schema migration；domain version 不匹配会失败，不会猜测转换。
- Markdown selection 使用 AST leaf projection 加空白规范化，不是任意宿主 renderer 的完整逆变换；复杂自定义渲染需要真实 Browser 回归。

## 跨 durable subsystem 的提交限制

一个 derived record 内的 relation 与 usages 在同一个 KV value 中提交，但 `recordDerivedSession` 随后还要向 DSH Session log append recall。当前顺序是 storage put 后 Session append，二者之间没有跨系统事务；若第二步发生突发失败，relation 可能已经存在。长期发布需要 `preparing/ready + retry` 或对账 repair，当前自动化没有故障注入覆盖这一窗口。

## 升级 DSH 的检查顺序

1. 把 [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) 中全部 `@deepseek-ai/dsh-*` catalog 版本作为一组更新，不混用两个预发布版本。
2. 在目标 DSH 源码中重新搜索 `SessionRuntime.create`、`SessionRuntime.fork`、Host `session.fork`、`SessionHeader` 与 `session/end-seed`。
3. 对五个 Slot 名逐一核对 `SlotMap` 类型、scope、kind、owner props 与 render site，并核对 Input Trigger source/codec、`SessionInput.insertReference()`、draft mirror projection 和 input state 订阅语义。
4. 核对 `dsh.client` manifest、`exports["./client"]`、ModuleLoader wrapper 和 Client Modules 扫描规则。
5. 核对 Typert generator 的 package mode、Remote 方法限制、四个生成文件名和 Gateway `$mount()`。
6. 核对 `storageDomain`、Workspace、FS 与 Web Service 方法签名及 provider 默认组合。
7. 删除 `lib/` 后执行 `pnpm run check`，确认生成链不依赖旧产物。
8. 打新 tarball并安装到全新的 DSH home/profile，检查 `--dump-config` 中只有一个 `dsh-branchmark` Loader 行。
9. 完成无 key 的 Clip/Fork/UI 验收和有 key 的摘要/流式/tool/cancel 验收。
10. 只有运行事实一致后才更新本课程版本锚点和兼容性结论。

## 升级验证命令

```sh
cd /absolute/path/to/dsh-branchmark
rm -rf packages/host/lib packages/client/lib packages/bundle/lib
pnpm install
pnpm run check
pnpm --dir packages/bundle pack --pack-destination ../../dist
dsh plugin --profile web add /absolute/path/to/new-tarball.tgz
dsh --profile web --dump-config
dsh --profile web
```

清理 `lib/` 是构建验证，不应删除 `clip_explorer` storage data。测试安装应使用独立 `DSH_HOME`，避免把开发产物覆盖到用户真实 profile。
