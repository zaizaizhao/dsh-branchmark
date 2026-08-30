# dsh-branchmark-host

枝签 · BranchMark 的 Host 插件：验证并持久化 Clip 及其置顶和集合顺序、维护普通衍生 Session 关系、把衍生 Clip 记录为 DSH `recall` 上下文，并运行可独立切换模型且不创建 Session 的临时只读 Side Chat。Side Chat 通过纯文本 transcript 摘要较早历史，并从安全的用户消息边界保留最近原始消息，避免拆开工具调用与结果。安装时通常使用 `dsh-branchmark` Bundle，不单独挂载此包。
