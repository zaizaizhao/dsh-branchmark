# 第 13 章：跟随 DSH 预发布版本升级

本章是一条升级审计路线，不是当前 API 目录。先完成第 3、5、6、7、10、11 章，能运行 rc.1 教材，再选择另一个精确 DSH 目标。目标是给出“哪些功能受影响、由谁修改、什么证据足够”的回答，而不是遇到类型错误就加兼容分支。

## 1. 先固定比较基准

[版本基线](../reference/version-baseline.md)固定当前 release 与后续源码快照。升级时至少记录：

| 身份 | 要回答的问题 |
| --- | --- |
| 插件起点 commit 与工作树差异 | 这次到底修改哪份代码？ |
| DSH 已安装 package version | 当前 generator、types 和运行包来自哪里？ |
| 对应 release tag commit | 发布包的源码依据是哪一份？ |
| 新目标 commit | 它是另一个 npm release，还是独立源码实验？ |
| 数据格式与测试副本 | 哪些旧用户记录必须继续解释？ |

分支名和 package version 都不能单独替代 SHA；Git release 也不能证明同号 npm 包已经可安装。没有发布的上游目标先做隔离源码实验，不给当前 npm artifact 增加兼容承诺。

## 2. 用差异判断改动量

在 DSH 源码 checkout，而不是 BranchMark 目录，执行这组已发布版本比较：

```sh
git fetch origin
git rev-parse 'dsh-v0.1.2-alpha.5^{commit}'
git rev-parse 'dsh-v0.1.2-rc.1^{commit}'
git diff --name-only dsh-v0.1.2-alpha.5 dsh-v0.1.2-rc.1
git diff dsh-v0.1.2-alpha.5 dsh-v0.1.2-rc.1 -- packages/core/session/package.json
```

这组差异只包含 package version，不等于 rc.1 release notes 没有功能：release notes 的比较起点可能是更早的 rc.2。评估修改量先写“从哪个 commit 到哪个 commit”；不能把整个版本系列的更新摘要当作自己当前分支的升级 diff。

对任意新目标，先看受影响包和 API，再看数据格式、DOM/Slots 与默认 provider。不是所有上游重构都会传播到插件，也不是所有破坏都能被 TypeScript 捕获。

## 3. 按影响类型分流

| 类型 | 例子 | BranchMark 的处理 |
| --- | --- | --- |
| 发布身份变化 | alpha.5 → rc.1 只变 manifest version | 对齐 catalog、generator、peers、lockfile与产物；仍做安装 smoke |
| API/所有权变化 | inspection → handle，Slot props → selector | 修改真正的集成模块与 fixture，不向所有组件扩散 |
| 数据语义变化 | 日志迁移重排 seq | 保留旧 Clip fixture，审计所有锚点消费者 |
| 用户交互变化 | 轮次导航占据右侧，Chat DOM/输入恢复时序变化 | 真实页面检查，不仅 typecheck |
| provider/部署变化 | 目录有模型但回答 503；fetch 无 provider | 分环境记录失败，不把缺能力藏成成功 fallback |
| 内部优化 | 只列 header、缓存重建、增量 projection | 核对是否改变被依赖的结果，不机械跟改 |

先填写 owner，再写方案：Host 来源/child 校验和 Side Chat 读取在 Host；Session create/fork、Composer 与 Chat snapshot 在 `BranchMarkClient`；Slot-facing props 在 entry components；发布身份在 manifests、build config 与 release verifier。

## 4. 当前依赖表就是审计起点

rc.1 主线使用：

- `SessionPersistence.inspect()` 返回 meta、events 与 inherited cut。
- `SessionHeader.parentSession/isSeeded` 与 `SessionInspection.inheritedEventCount` 校验 lineage。
- live `Session.seq/eventAt/snapshotEvents` 分别表达标量、索引和数组读取。
- `useInput` 订阅 Composer occurrence，公开 insert/codec 完成引用恢复和提交。
- 明确的 Controller、UI adapter、target 与 renderer，而非聚合 Client Runtime。

细节集中在[依赖矩阵](../reference/dsh-dependency-map.md)和[Session 身份参考](../reference/session-identity-and-migrations.md)。每项记录“保留、改名、语义改变、移除、待核对”之一；“能 import”不能直接填成兼容。

## 5. 后续目标不能只改四个 inspect

在固定上游源码中，read handle 有显式 close 责任，日志 v2 又可能重排 event seq。这是两个独立问题：

```text
资源适配：open(read) → read → finally close
数据适配：旧 Clip identity → 当前 message → 校验 → 当前 eventSeq
```

只完成第一行，旧 Clip 仍可能指向错误位置；只在 Host 记录关系时修复第二行，又晚于 Client 的 fork 创建。所有消费者与失败策略见[来源重定位设计](../reference/session-identity-and-migrations.md#6-重定位设计必须覆盖全部消费者)。

练习只设计读取模块的输入/输出和失败用例，不把未实现 helper 放进当前源码导航；也不要用 `if ("inspect" in service)` 同时支持两套预发布 API。一个包对应一个经过验证的 DSH 目标。

## 6. 用户数据要用旧记录验收

至少准备以下数据副本：

| fixture | 想发现的错误 |
| --- | --- |
| 升级前的含 chunk 日志 + 已保存 Clip | 新 seq 与旧锚点不一致 |
| 父中间 turn 的 full-fork | 错误地继承到当前末尾 |
| 已恢复/二次 fork 的 Session | 把任意 end-seed marker 当作唯一继承切点 |
| 无排序字段的 Clip v1 | 可选元数据缺省语义丢失 |
| relation 已写、recall 失败的模拟结果 | 错把跨系统提交当成原子事务 |
| 旧 Composer token + 同时编辑 draft | 错位替换、覆盖用户输入或自动发送 |

不要在唯一的用户 home 上先启动新版本观察结果。日志代际保留不代表可降级；DSH cache 和 BranchMark 用户数据也不能采用同一种丢弃策略。

## 7. 把改动收敛后再验证

成组更新 DSH catalog、根 generator、peers/dev dependencies、bundle inject/external、lockfile与版本检查。新增 API 后先 build Host 再 typecheck Client；修改 source 不会自动更新已装 tarball。

验证层次采用[第 11 章](11-testing-debugging-and-release.md)和[验证矩阵](../reference/verification-matrix.md)：

1. 针对实际改变的行为运行测试；假实现与真实 API 同步迁移。
2. 生成、typecheck、build、Bundle 自包含与 release metadata 检查。
3. 精确 CLI + 新 home 安装本次 tarball，核对真实 Web 流程。
4. 用旧数据副本验证升级，而不只测新建空数据。
5. 对需要模型的摘要、回答、工具和取消分别记录环境结果。

不引用以前临时工作区的绿灯作为本次结果。没有执行的测试写 `NOT RUN`，缺少 provider 写 `BLOCKED`，可复现产品偏差写 `FAIL`。

## 8. 发布与源码实验分开

本项目的正式包版本跟随已发布 DSH 目标；发布步骤与可用 npm 通道只由 [RELEASING.md](../../RELEASING.md)维护。源码实验没有义务发到 npm，也不能把 master-compatible 产物伪装成 rc.1 包。

若将来确需给外部测试者发 edge 包，应先单独确定发布身份、标签和对应 verifier 政策。当前检查要求同号依赖，不是把一个带 SHA 的版本字符串写进 package.json 就完成了发布设计。本课程不会创建 edge 标签或执行发布。

## 9. 本章交付物

交付一张兼容表，每行写“起点事实、目标事实、插件 owner、用户数据风险、检查命令/场景、结果”。最后用下面三句话给出结论：

- 当前已验证的目标是哪个 package version 与 commit？
- 修改范围属于依赖/构建、API、数据迁移还是 UI 适配，依据是什么？
- 哪些检查仍是 FAIL/BLOCKED/NOT RUN，谁需要提供什么才能继续？

检索题：为什么 seq brand 不能证明事件存在？为什么只改 handle 不足以修复旧 Clip？为什么 release notes 很长，alpha.5→rc.1 的代码改动却可能很小？回答后分别核对[身份参考](../reference/session-identity-and-migrations.md)、Client launch 和本章的精确 diff。
