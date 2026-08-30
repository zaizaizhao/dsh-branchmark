/** Typed Remote and DSH Client Runtime orchestration for BranchMark. */

import type {
  ClientContext, SessionId, SessionRuntime, WorkspaceId,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-gateway/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: merges this plugin's generated Remote namespace into DSH's client transport.
import type {} from 'dsh-branchmark-host/remote'
import type {
  Clip, ClipAttachmentSelection, ClipId, CreateClipRequest, ListClipsRequest,
  ListClipsValue, ListRelationsRequest, ListRelationsValue, RecordDerivedSessionValue,
  CreateSideChatRequest, SideChatId, SideChatSnapshot,
  SideChatModelSelection,
  BatchUpdateClipsRequest, BatchUpdateClipsValue,
} from 'dsh-branchmark-host/types'
import {
  BRANCHMARK_REFERENCE_SOURCE, clipReferenceInsert, parseClipReference,
} from './composer-reference.ts'

/** Business rejection from a successful Typed Remote transport call. */
export class BranchMarkClientError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
    this.name = 'BranchMarkClientError'
  }
}

function remoteError(code: string, message: string): BranchMarkClientError {
  return new BranchMarkClientError(code, message)
}

/** Browser port that keeps transport errors, DSH Session APIs, and draft admission out of components. */
export class BranchMarkClient {
  constructor(private readonly ctx: ClientContext) {}

  workspaceForSession(sessionId: SessionId): WorkspaceId | undefined {
    return this.ctx.workspaces.list.getSnapshot().items
      .find(workspace => workspace.sessionIds.includes(sessionId))?.workspaceId
  }

  currentWorkspace(): WorkspaceId | undefined {
    const current = this.ctx.sessions.list.getSnapshot().current
    return current === undefined
      ? this.ctx.workspaces.list.getSnapshot().recentWorkspaceId
      : this.workspaceForSession(current)
  }

  sessionTitle(sessionId: SessionId): string | undefined {
    return this.ctx.sessions.list.getSnapshot().byId[sessionId]?.title
  }

  sessionSnapshot(sessionId: SessionId) {
    return this.ctx.sessions.binding(sessionId)?.session.getSnapshot()
  }

  /** Insert one compact native reference at the start of the current Composer draft. */
  attachClipToComposer(
    sessionId: SessionId,
    clip: Clip,
    includeNote: boolean,
  ): 'inserted' | 'duplicate' | 'unavailable' | 'busy' {
    const scoped = this.ctx.sessions.scope(sessionId)
    if (scoped === undefined) return 'unavailable'
    const input = this.ctx.conversation.input.for(scoped)
    const snapshot = input.state.getSnapshot()
    const duplicate = snapshot.occurrences.some((occurrence) => {
      if (occurrence.source !== BRANCHMARK_REFERENCE_SOURCE) return false
      try {
        return parseClipReference(occurrence.ref).clipId === clip.id
      } catch {
        return false
      }
    })
    if (duplicate) return 'duplicate'
    const inserted = input.insertReference(
      clipReferenceInsert(clip, includeNote),
      { start: 0, end: 0, draftRev: snapshot.draftRev },
    )
    return inserted ? 'inserted' : 'busy'
  }

  async create(request: CreateClipRequest): Promise<Clip> {
    const transport = await this.ctx.remote.branchmark.create(request)
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async list(request: ListClipsRequest): Promise<ListClipsValue> {
    const transport = await this.ctx.remote.branchmark.list(request)
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async update(request: Parameters<ClientContext['remote']['branchmark']['update']>[0]): Promise<Clip> {
    const transport = await this.ctx.remote.branchmark.update(request)
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async setStatus(request: Parameters<ClientContext['remote']['branchmark']['setStatus']>[0]): Promise<Clip> {
    const transport = await this.ctx.remote.branchmark.setStatus(request)
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async deleteForever(request: Parameters<ClientContext['remote']['branchmark']['deleteForever']>[0]): Promise<void> {
    const transport = await this.ctx.remote.branchmark.deleteForever(request)
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
  }

  async batchUpdate(request: BatchUpdateClipsRequest): Promise<BatchUpdateClipsValue> {
    const transport = await this.ctx.remote.branchmark.batchUpdate(request)
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async relations(request: ListRelationsRequest): Promise<ListRelationsValue> {
    const transport = await this.ctx.remote.branchmark.listRelations(request)
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async createSideChat(request: CreateSideChatRequest): Promise<SideChatSnapshot> {
    const transport = await this.ctx.remote.branchmark.createSideChat(request)
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async getSideChat(id: SideChatId): Promise<SideChatSnapshot> {
    const transport = await this.ctx.remote.branchmark.getSideChat({ id })
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async sendSideChat(id: SideChatId, text: string): Promise<SideChatSnapshot> {
    const transport = await this.ctx.remote.branchmark.sendSideChat({ id, text })
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async selectSideChatModel(id: SideChatId, selection: SideChatModelSelection): Promise<SideChatSnapshot> {
    const transport = await this.ctx.remote.branchmark.selectSideChatModel({ id, selection })
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async cancelSideChat(id: SideChatId): Promise<SideChatSnapshot> {
    const transport = await this.ctx.remote.branchmark.cancelSideChat({ id })
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  async closeSideChat(id: SideChatId): Promise<void> {
    const transport = await this.ctx.remote.branchmark.closeSideChat({ id })
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok && transport.value.error.code !== 'side-chat-not-found') {
      throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    }
  }

  async launch(input: {
    readonly workspaceId: WorkspaceId
    readonly clips: readonly Clip[]
    readonly mode: 'full-fork' | 'clips-only'
    readonly primaryClipId?: ClipId
    readonly includeNotes: ReadonlySet<ClipId>
    readonly question?: string
  }): Promise<{ readonly sessionId: SessionId }> {
    if (input.clips.length === 0) throw remoteError('invalid-request', '请至少选择一枚枝签。')
    const primary = input.primaryClipId === undefined
      ? undefined
      : input.clips.find(clip => clip.id === input.primaryClipId)
    let sessionId: SessionId
    if (input.mode === 'full-fork') {
      if (primary?.source.kind !== 'session-message' || !primary.source.forkable) {
        throw remoteError('fork-unavailable', '主要来源当前不能完整分叉，请显式切换为仅携带枝签。')
      }
      sessionId = await this.ctx.sessions.fork({
        sessionId: primary.source.sessionId,
        atSeq: primary.source.eventSeq,
        increaseTitle: true,
      })
    } else {
      // ISessions intentionally omits creation, but DSH exports the concrete Runtime;
      // using its existing create path guarantees a distinct ordinary Session instead
      // of connectWorkspace's documented blank-session reuse.
      const sessions = this.ctx.sessions as SessionRuntime
      if (typeof sessions.create !== 'function') {
        throw remoteError('session-create-unavailable', '当前 DSH 客户端未提供可用的 SessionRuntime.create。')
      }
      sessionId = await sessions.create({ workspaceId: input.workspaceId })
    }

    const attachments: ClipAttachmentSelection[] = input.clips.map(clip => ({
      clipId: clip.id,
      includeNote: input.includeNotes.has(clip.id),
    }))
    await this.recordDerived({
      derivedSessionId: sessionId,
      workspaceId: input.workspaceId,
      mode: input.mode,
      ...(input.mode === 'full-fork' && primary !== undefined ? { primaryClipId: primary.id } : {}),
      attachments,
    })
    if (input.question === undefined) {
      this.ctx.sessions.open(sessionId)
      return { sessionId }
    }
    const binding = this.ctx.sessions.binding(sessionId)
    if (binding === undefined) throw remoteError('session-unavailable', '新会话已经创建，但客户端尚未建立其绑定。')
    const result = await binding.session.prompt([{ type: 'text', text: input.question }], 'queue')
    if (!result.ok) throw remoteError(result.error.code, result.error.message)
    return { sessionId }
  }

  openSession(sessionId: SessionId): void {
    this.ctx.sessions.open(sessionId)
  }

  private async recordDerived(
    request: Parameters<ClientContext['remote']['branchmark']['recordDerivedSession']>[0],
  ): Promise<RecordDerivedSessionValue> {
    const transport = await this.ctx.remote.branchmark.recordDerivedSession(request)
    if (!transport.ok) throw remoteError(transport.error.code, transport.error.message)
    if (!transport.value.ok) throw remoteError(transport.value.error.code, this.failureMessage(transport.value.error))
    return transport.value.value
  }

  private failureMessage(error: { readonly code: string; readonly message?: string }): string {
    if (error.message !== undefined) return error.message
    switch (error.code) {
      case 'workspace-not-found': return '项目不存在或已经被移除。'
      case 'session-not-found': return '来源会话不存在或无法读取。'
      case 'session-outside-workspace': return '来源会话不属于当前项目。'
      case 'source-not-found': return '来源消息已经不存在。'
      case 'source-mismatch': return '来源消息已变化，请重新选择枝签。'
      case 'excerpt-mismatch': return '选区无法映射到消息原文，请缩小选区后重试。'
      case 'clip-not-found': return '枝签不存在或已经删除。'
      case 'derived-session-already-recorded': return '该衍生会话已经记录过枝签关系。'
      case 'derived-session-mismatch': return '新会话的 DSH 分叉事实与主要来源不一致。'
      case 'derived-session-unavailable': return '新会话当前未挂载，无法写入枝签上下文。'
      case 'side-chat-not-found': return 'Side Chat 已关闭或宿主已经重启。'
      case 'side-chat-busy': return 'Side Chat 正在回答，请等待或先取消。'
      case 'side-chat-model-unavailable': return error.message ?? '所选模型当前不可用。'
      case 'side-chat-context-unavailable': return '无法从主要来源的完整轮次重建 Side Chat 上下文。'
      default: return error.code
    }
  }
}
