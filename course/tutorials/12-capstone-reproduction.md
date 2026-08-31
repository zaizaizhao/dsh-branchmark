# 第 12 章：毕业项目——从空目录到可安装插件

本章不是再讲一遍源码，而是给出一条可独立执行的重建路线。目标是在新目录中实现等价产品行为，不复制现有整文件；每个阶段都必须先产生可观察证据，再进入下一阶段。

## 1. 毕业标准

最终交付必须满足：

- 不修改 DSH 源码，只通过 bundle/profile 安装。
- 会话级 Clip 仅在所属会话可见；项目级 Clip 跨会话可见。
- 原文与来源不可编辑，note/tags/scope/pinned 可变；支持回收站、永久删除和持久顺序。
- 选区能处理渲染 Markdown，同消息连续选择一条、跨消息拆分。
- 多选只占一个紧凑命令入口；卡片固定折叠高度，可展开或专注阅读且不修改正文。
- 显式 Clip 按选择顺序成为 Composer 原生引用，draft 恢复后可重建 Chip，但任何动作都不自动发送。
- full-fork 从 primary Clip 所在完整 turn 派生；clips-only 是无 parent 的新 Session。
- relation/usages 双向可查，删除 Clip 不改变已创建 child。
- Side Chat 多标签、可隐藏、关闭即销毁，使用摘要 + 最近原始消息 + 完整 Clip。
- Side Chat 模型可独立选择，只有固定只读 project/web tools。
- 一个 tarball即可安装，Host/Remote/Browser/Typert 产物自包含。

## 2. 建立版本证据

先记录目标 DSH package version、Git commit、Node、pnpm 与公开导出。不要先写代码再用类型错误猜 API。核对资源清单位于 [`RESOURCES.md`](../RESOURCES.md)，重点阅读 DSH architecture、Cordis primer、API Gateway、Session、Storage、Client Modules、FS、Web、Workspace，以及本课程的 [DSH Client 架构设计解读](../reference/dsh-client-architecture-rationale.md)。

建立一张适配表，至少记录 API Controller/UI adapter/target/Renderer 的 owner 映射、`ISessions.create/fork`、Host fork boundary、SessionHeader、`session/end-seed`、五个 Slot、Input Trigger reference contract、Conversation/Chat View、Chat row anchor、Remote failure contract、Typert artifacts 和 `dsh.client` format。若目标版本与本课程锚点不同，先更新设计，不照搬实现，也不要用另一个聚合 facade 掩盖 owner 变化。

检查点：你能用源码位置回答“full-fork 最终截止哪个事件”和“Browser client.js 由谁发现与加载”。

## 3. 建立 workspace 与空 package

创建 root workspace 和 `packages/host`、`packages/client`、`packages/bundle`，统一 ESM、Node engine、DSH catalog versions、TypeScript strict、Vitest 与 tsdown。先让三个空入口 build 成功。

Host 加 `typertPlugin({ mode: 'package', faces: ['host'] })`；Client 输出 Node index 与 Browser CJS ModuleLoader wrapper；Bundle 先只 republish一个空 Host plugin。

检查点：clean `pnpm run build` 后生成所有 manifest 声明的文件，Bundle verifier 能 import default export，tarball没有 workspace path。

## 4. 完成最小 durable Clip 纵向切片

只实现一条路径：Browser 提交人工构造 candidate → Remote `create` → Host inspect/validate → storage `put` → Remote `list`。先不写 React selection UI。

顺序是 branded ids 与 DTO → Zod domain v1 → Service init/dispose → `create/list` Remote → generated Remote mount → Host tests。伪造 eventSeq/messageId/range/excerpt 各加一个拒绝用例。

检查点：成功 Clip 重启 Host 后存在；四类伪造请求均不产生记录；其他 Workspace/Session 无法读到它。

对应动手任务见[实验 1](../labs/01-minimum-durable-clip.md)。

## 5. 扩展完整 Clip 生命周期

加入 session/project visibility、note、tags、scope、pinned、search、trash、permanent delete 与 batch prevalidation。保持 source/excerpt 没有 update path；把 durable record frozen，用 table `update` 替换。

检查点：将 session Clip 提升到 project 后从原 session-only query 消失、从 project query 出现；回收/恢复不改 source；多标签为 AND；永久删除后第二次删除返回稳定 not-found。

随后加入可选 `pinnedAt/sortIndex`，保持 domain version 1，使旧记录解释为未置顶且未手动排序。`list` 先分置顶组，再解释组内索引和稳定回退顺序；scope 或 pinned 变化清除旧索引。`batchUpdate(reorder)` 必须接收一个会话或项目的完整 active 集合，并在任何写入前拒绝成员遗漏、混入其他集合和“未置顶在前、置顶在后”的顺序。

检查点：同组完整重排跨 Host 重启保留；局部结果和跨组请求都返回 `invalid-request`，既有顺序不变。

## 6. 接入真实选区与 Dock

先注册五个 Slot 的占位组件与一个不提供候选项的 Input Trigger source，确认每个 render site 和 reference codec 正确，再实现一个共享 `BranchMarkUiController`。加入 Chat row 发现、ConversationSnapshot anchor、exact range 和 Markdown projection，最后接保存浮层与两个 library views。

不要一开始写完整视觉样式。先用 Client pure tests证明 candidate，Host 再次证明 source；最后增加主题、grid/list、search/tags、resize、rail/hidden 和 accessibility。多选用有序 id 保存勾选顺序，只渲染一个可展开的六项命令胶囊；固定高度卡片把置顶、拖拽、编辑和衍生关系控件放在不可变正文之外，并提供卡片内展开与 DSH Modal 专注阅读。

检查点：普通、重复文本、链接/强调、跨消息、未完成 assistant 各有明确结果；真实 UI 不挡住宿主其他 overlay；localStorage 中没有 Clip 正文；搜索、标签筛选和回收站禁用拖拽，跨置顶组放置不会发送 Remote。

## 7. 接入 Composer

为每条 Clip 生成短 label、版本化 ref 和 `@branchmark:<ClipId>` clipboard projection，通过当前 Session 的公开 `insertReference()` 在 draft 头部插入 DSH 原生 occurrence。多选路径按选择顺序的逆序执行头插，使最终 Chip 与附件结果仍保持选择顺序；重复 Clip 不再次插入。

注册无候选项的 `branchmark` Input Trigger source，由 `codec.serialize()` 在用户提交事务中重新读取 active Clip 并生成模型上下文。序列化失败必须阻止发送并保留 draft，不能降级为 clipboard token 或完整正文草稿。

订阅当前 Session input state。发现 DSH draft mirror 恢复出的 BranchMark token 后，并行读取当前会话私有和项目集合，从右向左以公开 `insertReference()` 替换可解析 token；缺失、已回收或不可见的 Clip 保留原 token。单枚移除使用两次受控 `setDraft()` 与一个临时不可见分隔符，把差分限制到目标 occurrence，避免相邻引用退化成普通文本。

检查点：加入 Clip 后没有网络/模型提交；三枚 Chip 顺序与选择顺序一致；用户追加问题后删除一枚，问题与相邻 Chip 保留；重新绑定 Composer 后可解析 token 恢复为 Chip，缺失 token 留在原位。

对应动手任务见[实验 4](../labs/04-ordered-collection-and-reference-recovery.md)。

## 8. 完成两类普通 Session

先实现 clips-only `sessions.create({ workspaceId })`，验证无 parent/seed，再实现 full-fork `sessions.fork({ atSeq })`。Host `recordDerivedSession` 必须 inspect child header，并按当前 DSH 算法核对 full-fork seed。

写入 relation/usages 后 append `form=recall` user message；创建模式 open child，创建并发送模式调用 child binding `SessionFace.prompt(..., 'queue')`。实现 `listRelations`、Header marker、DSH parentId lineage tree 与 `session/end-seed` divider。

检查点：两类 child 都有 recall 且 Composer 空白；只有 full-fork 有 DSH parent；从父中间 turn 分叉不会带入后续 turn；删除 Clip 后 child 与 usage snapshot 不变。

对应动手任务见[实验 2](../labs/02-derived-session.md)。

## 9. 完成无工具 Side Chat

先不要加工具。实现 Host-memory Map、create/get/send/cancel/close、primary source prefix、request header route、懒 context、summary + recent + Clip recall、直接 `ctx.llm.stream` 和 Browser 500 ms polling。

用 fake adapter证明不创建/修改 Session、关闭后 not-found、两个 tab 独立、模型 route 不改父 Session。随后接 model catalog、reasoning efforts、streaming partial 和 error/warning UI。

检查点：未发送就关闭不触发摘要；第一次发送执行一次 context preparation；cancel 保留 tab；Host 重启不恢复。

## 10. 加入固定只读工具

定义五个 closed schemas，手工执行 tool-call/result loop。Project path 必须 DSH FS resolve 后 contains；所有读取、搜索文件数、matches、tool output 和 rounds 有配置上限。Web 只调用 `ctx.web`，不直接引入 HTTP/search SDK。

检查点：正常 read/search 成功；escape path 失败；未知 tool 失败；未配置 fetch provider 以 tool error 返回；round exhaustion 可控；Abort 可中断 LLM 与正在运行的 FS/Web。

对应真实模型任务见[实验 3](../labs/03-side-chat-e2e.md)。

## 11. 保存临时回答

为整段按钮与部分选择都创建 `temporary-answer` Clip。明确它只有提交正文和 owner Session，没有 durable Side Chat anchor，因此永远不可 reopen/full-fork。

检查点：保存后出现在来源会话 drawer，可提升为 project，可作为 clips-only 或新 Side Chat attachment，不能选为 full-fork primary。

## 12. 收口单包交付

让 Bundle 内联 Host/Remote/Client 专用代码，保持 DSH peers external；修正 Typert package identity；提供一条完整 `cordis.patch.yml` config；增加 bundle test 与产物 verifier。

在独立 `DSH_HOME` 安装 tarball，检查 profile manifest、dump-config、boot graph、client route、Remote namespace 与 UI。不要在 monorepo node_modules 恰好能解析开发包的环境中宣告自包含成功。

检查点：把 tarball复制到没有 `dsh-branchmark-host/client` workspace sibling 的位置仍可安装启动。

## 13. 建立可维护性防线

完成前逐项补齐：

- Remote roster 与 error mapping。
- Client inject roster、Controller/UI/target owner 映射，以及禁止混入旧 Runtime package 的依赖图检查。
- schema version 和未来 migration 决策。
- storage→Session append 跨系统失败的 reconciliation 方案。
- Browser selection/Slot 的版本适配说明。
- Input Trigger occurrence、clipboard projection、draft mirror 恢复和提交 codec 的版本适配说明。
- 默认无 fetch provider 与 network policy 说明。
- 真实浏览器回归与真实 provider 验收记录。
- 导入/导出、索引、push streaming 若进入未来范围时的独立 ADR。

不要把未来能力预埋成当前空 abstraction。先保持 Clip store、ordinary Session launcher 与 Side Chat runtime 三个清楚模块，等新的生命周期真的出现再深化接口。

## 14. 最终演示脚本

用一个包含至少四轮对话的真实项目演示：

1. 在第 2 轮 assistant 回答中选择 Markdown 文本，保存为 session Clip并加 note。
2. 提升另一条为 project Clip，在新 Session 的项目视图中证明可见，而本会话视图仍不混入它。
3. 依次多选三条，展开命令胶囊；切换置顶并在组内拖拽，重启后证明顺序保留。
4. 把同三条按选择顺序引用到 Composer，保留一个问题后重新绑定；展示原生 Chip 恢复、逐条移除和绝不自动发送。
5. 选 primary + 第二条 Clip，full-fork 到第 2 轮，创建但不发送；展示 parent tree、divider、recall 和空 Composer。
6. 用相同 Clip clips-only 并创建并发送；展示它没有 parent。
7. 启动两个 Side Chat，一个换模型、一个调用 project search；最小化后恢复。
8. 停止一个回答，关闭另一个，保存第一条临时回答为 Clip。
9. 删除原 Clip，展示两个普通 child 不受影响且 relation usage 仍可读；未发送引用无法伪装成有效上下文。
10. 重启 DSH，展示 Clip/Session/手动顺序仍在，Side Chat 已消失。

这段演示同时覆盖产品叙事和技术事实，适合作为发布验收录制。

## 15. 自评问题

不看源码回答：

1. 哪三个位置分别拥有 canonical source、Browser candidate 和 durable Clip？
2. full-fork 与 Side Chat 的 source prefix 为什么不能共用“复制字符串”实现？
3. 哪些状态进入 storage、Session log、Browser localStorage 和 Host Map？
4. 哪个 DSH API 让 Browser 调 Host，哪个 API 让 Side Chat 调模型？
5. 为什么 clips-only 有 plugin relation 却没有 DSH parent？
6. 为什么 reorder 要提交完整 active 集合，且拖拽不能跨置顶组？
7. 为什么 draft mirror token 要从右向左恢复，缺失 token 又必须保留可见？
8. 纯插件实现最脆弱的五个版本适配点是什么？

若任何一题只能回答“源码里就是这样”，回到相应章节重新完成检索练习。毕业标准不是记住文件名，而是能从产品承诺推导出正确的生命周期、可信边界和 DSH extension point。
