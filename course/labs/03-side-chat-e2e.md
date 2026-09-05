# 实验 3：真实模型 Side Chat

本实验在已配置真实 LLM provider 的 DSH Web profile 中验收临时 Side Chat。它会产生模型 token 和可能的 Web 请求；先用短 fixture、受限输出和允许访问的测试项目完成，不要把密钥、私有文件内容或内部 URL写进实验记录。

## 学习目标

- 证明 Side Chat 与父 Session、普通 child Session 隔离。
- 观察懒摘要、最近原始消息、完整 Clip 与 note 的组合效果。
- 验证模型独立切换、reasoning、流式 partial 与 Abort。
- 验证 project path containment、Web provider 差异和有界工具循环。
- 区分隐藏、停止、关闭与 Host 重启。

## 环境准备

使用独立 DSH home/profile 安装本次 tarball，并在 DSH 自己的 credentials/settings 中配置 provider。不要把 API key 写入插件 config 或 shell command。

先按[第 10 章](../tutorials/10-package-install-and-adapt.md)固定 rc.1 CLI 和 home。做两阶段 preflight：模型目录能返回；同一 profile 下的实际短推理请求能完成。目录存在不保证 provider 有可用路由。若缺凭证、返回 model_not_found/503 或持续超时，记录失败阶段并把依赖它的验收标 BLOCKED；不要自动换模型后仍说原模型通过。

在测试 Workspace 创建：

```text
README.md          包含唯一短语 CLIP_E2E_ANCHOR
notes/decision.md  包含一个可问答的架构决策
notes/other.md     不包含该短语
```

来源 Session 至少进行 6 个完整 user/assistant turn，使可重建消息数量超过默认 `recentContextMessages=10`。在较早历史明确一个代号和约束，在最近消息加入另一条决定；从一个已完成 assistant turn 摘录 primary，再选第二条 Clip并加 note。当前切分点会向前退到非 tool user message，所以实际保留数可能大于 10。

## 场景 1：创建不应立刻消费摘要

创建并打开 Side Chat，但不要发送问题。等待 model catalog ready，再关闭 tab。

验收：父 Session event 数不变；普通 Session 列表不新增；若 provider 有请求审计，不应出现摘要请求；关闭后旧 Side Chat id 不可读取。

如果只能从 UI 观察，不能把“没有显示回答”当成未调用模型的充分证据；保留 Host test 的 adapter request count 作为自动化证明，真实环境只做行为补充。

## 场景 2：摘要 + recent + Clip recall

新建 Side Chat，默认携带 notes，手工取消第二条 note。提问必须同时依赖：较早历史中的代号、最近消息中的决定、primary excerpt 和第二条 Clip 的正文。

验收：第一次回答能分别指出四类信息；被取消的第二条 note 不应成为依据；UI 没有 `contextWarning`。若回答缺较早信息，先查摘要失败/上下文上限，不要直接判模型“忘了”。

回答质量不能独自证明请求内容：第二条 note 的独有短语不能同时出现在来源历史或其他 Clip 中，否则无法判定是否被排除。请求结构由确定性 Host 用例证明，真实场景只补充模型行为；出现 contextWarning 时分别记录“降级路径结果”和“摘要验收未通过”。

若使用专用摘要 provider/model，记录 DSH 中配置的 id 和 provider request audit 的脱敏证据；不要记录 key 或完整敏感 prompt。

## 场景 3：独立模型切换

在父 Session 记录当前 model；Side Chat 第一次发送前切换到另一个可用 model/reasoning effort并提问，然后回到父 Session。

验收：Side Chat picker 显示新 route；answer 使用新 route；父 Session model 未改变。第一次 context 已准备后再切回另一个 model，确认旧摘要不重新生成、下一回答 route 改变。

## 场景 4：Project read/list/search

依次提出能促使模型调用：

```text
列出项目根目录，不要猜文件。
读取 notes/decision.md 并概括决定。
在项目中搜索字面量 CLIP_E2E_ANCHOR，并给出文件和行号。
```

验收：UI 显示 `List`、`Read`、`Search` activity 与 success output；回答和文件实际内容一致；搜索不遍历 `.git`/`node_modules`，扫描量未超过配置。

再请求读取 `../` 指向项目外的已知测试路径。验收：tool result 为 error，消息说明 path outside project；不得返回外部内容。不要为了演示创建或读取敏感文件。

必须看到真正的 tool-call 与对应 error result。若模型拒绝发起工具调用，只能记录未触达执行路径，不能算 containment 通过。`maxReadChars` 是完整 readText 后的截断，不把这个场景当作大文件内存上限测试。

## 场景 5：Web provider 差异

先调用 `web_search`，确认当前 profile 的 search provider 可用。再请求 `web_fetch`：默认 `dsh-base` 没有 fetch provider，因此未额外配置时预期是结构化工具失败，不是成功。

只有在管理员已经配置符合部署 network/SSRF policy 的 fetch provider 时，才测试一个公开、无敏感 query 的 URL。DSH 本地 HTTP fetch backend 默认不自动阻断 private-network target，不能把本实验当成安全审计。

## 场景 6：停止、隐藏与关闭

提出一个会触发多步读取的长问题：

1. 流式开始后最小化 Dock，等待几秒再恢复；回答应继续。
2. 下一次提问流式开始后点停止；partial 清理、tab 回 idle，已完成消息保留，可再次提问。
3. 再开始一次回答并直接关闭 tab；Host 应 abort 并删除 entry，恢复 Dock 不出现旧 tab。
4. 保留另一个 Side Chat 后重启 DSH；普通 Clip/Session 恢复，临时 tab 消失。

补测“首次摘要尚未结束时停止/关闭”：当前摘要没有接入同一 AbortSignal，cancel 的返回 snapshot 也可能仍 running。关闭后 get 失效和上游请求结束是两个验收项；明确记录此限制，不把点击按钮作为请求停止的证据。

## 场景 7：保存回答

从一条 assistant answer 选择部分文字并保存，再点击另一条回答的“保存整段回答”。

验收：产生两条来源为 temporary answer 的 session Clip；它们能加 note、提升为 project、作为 clips-only/Side Chat attachment；full-fork primary UI 不允许选择它们，也没有“跳回 Side Chat”承诺。

## 证据记录模板

```text
DSH package version / release commit / CLI path:
BranchMark version / source commit / tarball:
OS / Browser / origin:
Profile name:
Provider/model ids（无密钥）:
Source message count / recentContextMessages:

Create-without-send:
Context summary/recent/Clip result:
Model isolation:
Project tools:
Web search/fetch:
Hide/cancel/close/restart:
Temporary answer Clip:

Failures and exact error codes/messages:
Unverified items:
每项状态（PASS / FAIL / BLOCKED / NOT RUN）及下一步:
```

不要只记录“通过”。为每个场景保存可复核的 Session id、Clip id、工具状态或脱敏截图；Side Chat id 重启后失效是预期证据。

## 通过条件

```text
[ ] Side Chat 全程不新增/修改普通 Session event
[ ] 摘要成功与降级 warning 路径分别记录，未以降级冒充摘要成功
[ ] Side Chat model 变化不影响父 Session
[ ] 三个 project tools 成功，项目外 path 被拒绝
[ ] Web 行为与当前 provider 配置一致
[ ] hide/cancel/close/restart 四种生命周期结果不同且符合约定
[ ] 保存回答产生不可 reopen/fork 的 temporary-answer Clip
```

## 失败时的最短诊断路线

```text
没有模型选项 → listProviders/listModels/resolveModelInfo
一直 preparing → catalog promise + Browser polling
第一次回答很慢 → contextPromise/summary provider
较早信息丢失 → contextWarning + token/context limits
工具不出现 → provider tool-call support + request.tools
路径越界成功 → projectTarget resolve/contains，立即停止发布
fetch 失败 → 是否配置 fetch provider
停止无效 → AbortSignal 是否传到 LLM/FS/Web adapter
首次摘要期间停止无效 → 当前摘要取消链缺口，不代表回答阶段 signal 同样缺失
关闭后仍可 get → Host Map delete/disposer
```

实验结束后，把不能从当前证据证明的项写进 `Unverified items`，不要用推断补齐。
