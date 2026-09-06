/** Durable Session links and frozen Clip context, independent of collection mutations. */

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionLogOffset } from '@deepseek-ai/dsh-session'
import { isAppendSurfaceEvent } from '@deepseek-ai/dsh-session/surface'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionInspection } from '@deepseek-ai/dsh-session-persistence'
import { foldSessionTitle } from '@deepseek-ai/dsh-session-title'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { DerivedSessionRecord } from './spec.ts'
import { rejected, success } from './result.ts'
import type {
  Clip,
  ClipId,
  ClipFailure,
  ClipRejected,
  ClipSuccess,
  ClipUsage,
  ClipUsageId,
  DerivedSessionRelation,
  ListRelationsRequest,
  ListRelationsResult,
  RecordDerivedSessionRequest,
  RecordDerivedSessionResult,
  RelatedSessionSummary,
  SessionMessageClipSource,
} from './types.ts'

/** Owns one Workspace-checked relationship record per derived Session. */
export class DerivedSessionStore {
  private readonly pending = new Set<SessionId>()

  constructor(
    private readonly ctx: Context,
    private readonly clips: KvTable<ClipId, Clip>,
    private readonly records: KvTable<SessionId, DerivedSessionRecord>,
  ) {}

  /** Validate a fresh Session and persist its relationship once, including concurrent calls.
   * @param request - Created Session, parent, mode, and explicitly selected attachments.
   * @returns Committed relationship or a validation failure. Blank mode appends no model input.
   */
  async record(request: RecordDerivedSessionRequest): Promise<RecordDerivedSessionResult> {
    if (this.pending.has(request.derivedSessionId)) {
      return rejected({
        code: 'derived-session-already-recorded',
        derivedSessionId: request.derivedSessionId,
      })
    }
    this.pending.add(request.derivedSessionId)
    try {
      return await this.commit(request)
    } finally {
      this.pending.delete(request.derivedSessionId)
    }
  }

  private async commit(request: RecordDerivedSessionRequest): Promise<RecordDerivedSessionResult> {
    if (this.records.get(request.derivedSessionId) !== undefined) {
      return rejected({
        code: 'derived-session-already-recorded',
        derivedSessionId: request.derivedSessionId,
      })
    }
    const membership = this.validateWorkspaceSession(request.workspaceId, request.derivedSessionId)
    if (membership !== undefined) return rejected(membership)
    if ((request.mode === 'blank') !== (request.attachments.length === 0)) {
      return rejected({ code: 'invalid-request', message: 'only blank branches have no Clip attachments' })
    }
    const attachmentIds = request.attachments.map((attachment) => attachment.clipId)
    if (new Set(attachmentIds).size !== attachmentIds.length) {
      return rejected({ code: 'invalid-request', message: 'Clip attachments must be unique' })
    }
    const clips: Clip[] = []
    for (const attachment of request.attachments) {
      const clip = this.ownedClip(request.workspaceId, attachment.clipId)
      if (!clip.ok) return clip
      if (clip.value.status !== 'active')
        return rejected({ code: 'invalid-request', message: 'trashed Clips cannot start a branch' })
      clips.push(clip.value)
    }
    const primary =
      request.primaryClipId === undefined
        ? undefined
        : clips.find((clip) => clip.id === request.primaryClipId)
    if (request.mode === 'full-fork' ? primary === undefined : request.primaryClipId !== undefined) {
      return rejected({
        code: 'invalid-request',
        message: 'full-fork requires one attached primary Clip; other modes forbid a primary Clip',
      })
    }
    if (primary?.source.kind === 'temporary-answer' || primary?.source.forkable === false) {
      return rejected({ code: 'invalid-request', message: 'the primary Clip is not eligible for full Fork' })
    }
    const parentSessionId = request.parentSessionId
    if (
      parentSessionId === request.derivedSessionId ||
      (request.mode === 'full-fork' &&
        primary?.source.kind === 'session-message' &&
        primary.source.sessionId !== parentSessionId)
    ) {
      return rejected({
        code: 'invalid-request',
        message: 'a branch requires a distinct parent matching its source',
      })
    }
    const parentMembership = this.validateWorkspaceSession(request.workspaceId, parentSessionId)
    if (parentMembership !== undefined) return rejected(parentMembership)
    let inspection: SessionInspection
    try {
      inspection = await this.ctx.sessionPersistence.inspect(request.derivedSessionId)
    } catch {
      return rejected({ code: 'session-not-found', sessionId: request.derivedSessionId })
    }
    let expectedInheritedEventCount: SessionLogOffset | undefined
    if (primary?.source.kind === 'session-message') {
      let sourceInspection: SessionInspection
      try {
        sourceInspection = await this.ctx.sessionPersistence.inspect(primary.source.sessionId)
      } catch {
        return rejected({ code: 'session-not-found', sessionId: primary.source.sessionId })
      }
      expectedInheritedEventCount = this.expectedForkInheritedEventCount(
        sourceInspection.events,
        primary.source,
      )
      if (expectedInheritedEventCount === undefined) {
        return rejected({
          code: 'source-mismatch',
          sessionId: primary.source.sessionId,
          eventSeq: primary.source.eventSeq,
        })
      }
    }
    if (!this.matchesDerivedHeader(request.mode, inspection, primary?.source, expectedInheritedEventCount)) {
      return rejected({ code: 'derived-session-mismatch', derivedSessionId: request.derivedSessionId })
    }
    const derivedSession = this.ctx.sessions.get(request.derivedSessionId)
    if (derivedSession === undefined) {
      return rejected({ code: 'derived-session-unavailable', derivedSessionId: request.derivedSessionId })
    }
    if (request.mode === 'blank' && inspection.events.some(isAppendSurfaceEvent)) {
      return rejected({ code: 'derived-session-mismatch', derivedSessionId: request.derivedSessionId })
    }
    const timestamp = new Date().toISOString()
    const relation: DerivedSessionRelation = Object.freeze({
      derivedSessionId: request.derivedSessionId,
      workspaceId: request.workspaceId,
      mode: request.mode,
      parentSessionId,
      ...(primary?.source.kind === 'session-message'
        ? {
            primaryClipId: primary.id,
            sourceSessionId: primary.source.sessionId,
            sourceMessageId: primary.source.messageId,
            sourceEventSeq: primary.source.eventSeq,
            sourceTurn: primary.source.turn,
          }
        : {}),
      attachedClipIds: Object.freeze(attachmentIds),
      createdAt: timestamp,
    })
    const usages = request.attachments.map((attachment, index): ClipUsage => {
      const clip = clips[index]
      if (clip === undefined) throw new Error('branchmark: attachment lookup lost its matching Clip')
      return Object.freeze({
        id: randomUUID() as ClipUsageId,
        clipId: clip.id,
        derivedSessionId: request.derivedSessionId,
        excerptSnapshot: clip.excerpt,
        ...(attachment.includeNote && clip.note !== undefined ? { noteSnapshot: clip.note } : {}),
        createdAt: timestamp,
      })
    })
    await this.records.put(request.derivedSessionId, {
      relation,
      usages: Object.freeze(usages),
    })
    if (usages.length > 0)
      derivedSession.append(
        'user/message',
        createUserMessage({
          source: { kind: 'plugin', plugin: 'dsh-branchmark', form: 'recall' },
          content: [
            {
              type: 'text',
              text: [
                'Selected Clip context for this derived Session:',
                ...usages.flatMap((usage, index) => [
                  '',
                  `Clip ${String(index + 1)}:`,
                  usage.excerptSnapshot,
                  ...(usage.noteSnapshot === undefined ? [] : [`Note: ${usage.noteSnapshot}`]),
                ]),
              ].join('\n'),
            },
          ],
        }),
        { surfaceOp: 'append' },
      )
    return success({ relation, usages: Object.freeze(usages) })
  }

  /**
   * Read bidirectional Clip-to-Session relations without resolving live Clip records.
   * @param request - Workspace, optional filters, and opt-in Session metadata reads.
   * @returns Retained relations, frozen usages, and any requested endpoint metadata.
   */
  async list(request: ListRelationsRequest): Promise<ListRelationsResult> {
    if (this.ctx.workspaceRegistry.get(request.workspaceId) === undefined) {
      return rejected({ code: 'workspace-not-found', workspaceId: request.workspaceId })
    }
    const records = [...this.records.entries()].map(([, record]) => record)
    const relations = records
      .map((record) => record.relation)
      .filter((relation) => relation.workspaceId === request.workspaceId)
      .filter(
        (relation) =>
          request.derivedSessionId === undefined || relation.derivedSessionId === request.derivedSessionId,
      )
      .filter((relation) => request.clipId === undefined || relation.attachedClipIds.includes(request.clipId))
    const relationIds = new Set(relations.map((relation) => relation.derivedSessionId))
    const usages = records
      .flatMap((record) => record.usages)
      .filter((usage) => relationIds.has(usage.derivedSessionId))
      .filter((usage) => request.clipId === undefined || usage.clipId === request.clipId)
    const sessions: RelatedSessionSummary[] = []
    if (request.includeSessions) {
      const ids = new Set<SessionId>()
      for (const relation of relations) {
        const parent = relation.parentSessionId ?? relation.sourceSessionId
        if (parent !== undefined) ids.add(parent)
        ids.add(relation.derivedSessionId)
      }
      for (const id of ids) sessions.push(await this.sessionSummary(request.workspaceId, id))
    }
    return success({
      relations: Object.freeze(relations),
      usages: Object.freeze(usages),
      sessions: Object.freeze(sessions),
    })
  }

  private async sessionSummary(
    workspaceId: WorkspaceId,
    sessionId: SessionId,
  ): Promise<RelatedSessionSummary> {
    if (this.validateWorkspaceSession(workspaceId, sessionId) !== undefined) {
      return { sessionId, available: false }
    }
    let inspection: SessionInspection
    try {
      inspection = await this.ctx.sessionPersistence.inspect(sessionId)
    } catch {
      // Retained links survive a deleted or unreadable Session log.
      return { sessionId, available: false }
    }
    const title = foldSessionTitle(inspection.events)?.title
    return {
      sessionId,
      available: true,
      ...(title === undefined ? {} : { title }),
      ...(inspection.meta.parentSession === undefined
        ? {}
        : { nativeParentId: inspection.meta.parentSession }),
    }
  }

  private validateWorkspaceSession(workspaceId: WorkspaceId, sessionId: SessionId): ClipFailure | undefined {
    const workspace = this.ctx.workspaceRegistry.get(workspaceId)
    if (workspace === undefined) return { code: 'workspace-not-found', workspaceId }
    if (!workspace.sessionIds.includes(sessionId)) {
      return { code: 'session-outside-workspace', workspaceId, sessionId }
    }
    return undefined
  }

  private matchesDerivedHeader(
    mode: RecordDerivedSessionRequest['mode'],
    inspection: SessionInspection,
    source: SessionMessageClipSource | undefined,
    expectedInheritedEventCount: SessionLogOffset | undefined,
  ): boolean {
    if (mode !== 'full-fork') {
      return (
        inspection.meta.parentSession === undefined &&
        !inspection.meta.isSeeded &&
        inspection.inheritedEventCount === 0
      )
    }
    return (
      source !== undefined &&
      expectedInheritedEventCount !== undefined &&
      inspection.meta.parentSession === source.sessionId &&
      inspection.meta.isSeeded &&
      inspection.inheritedEventCount === expectedInheritedEventCount
    )
  }

  private expectedForkInheritedEventCount(
    events: readonly SessionEvent[],
    source: SessionMessageClipSource,
  ): SessionLogOffset | undefined {
    const sourceIndex = events.findIndex((event) => event.seq === source.eventSeq)
    if (sourceIndex < 0) return undefined
    const boundaryIndex = events.findIndex(
      (event, index) => index >= sourceIndex && event.type === 'turn/end' && event.data.turn === source.turn,
    )
    if (boundaryIndex < 0) return undefined
    let cut = boundaryIndex + 1
    while (cut < events.length && events[cut]?.type !== 'turn/start') cut += 1
    return SessionLogOffset(cut)
  }

  private ownedClip(workspaceId: WorkspaceId, id: ClipId): ClipSuccess<Clip> | ClipRejected {
    const clip = this.clips.get(id)
    return clip === undefined || clip.workspaceId !== workspaceId
      ? rejected({ code: 'clip-not-found', clipId: id })
      : success(clip)
  }
}
