/** Durable Clip storage and typed Remote API for BranchMark. */

import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { Context, Service } from '@deepseek-ai/cordis'
import s from '@deepseek-ai/schemastery'
import { createUserMessage, type Message } from '@deepseek-ai/dsh-llm'
import { deriveEventMessage, isAppendSurfaceEvent } from '@deepseek-ai/dsh-session/surface'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionInspection } from '@deepseek-ai/dsh-session-persistence'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import { bindTypertRemote, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-workspace'
import { branchMarkDomainSpec, type DerivedSessionRecord } from './spec.ts'
import type {
  BatchUpdateClipsRequest, BatchUpdateClipsResult, CancelSideChatResult,
  Clip, ClipFailure, ClipId, ClipRejected, ClipSource, ClipSourceInput, ClipSuccess,
  ClipUsage, ClipUsageId, CreateClipRequest, CreateClipResult, DeleteClipRequest,
  CreateSideChatRequest, CreateSideChatResult, DeleteClipResult, DerivedSessionRelation,
  GetSideChatResult, ListClipsRequest, ListClipsResult,
  ListRelationsRequest, ListRelationsResult, RecordDerivedSessionRequest,
  RecordDerivedSessionResult, SendSideChatRequest, SendSideChatResult,
  SelectSideChatModelRequest, SelectSideChatModelResult,
  SetClipStatusRequest, SetClipStatusResult, SideChatIdentityRequest,
  SessionMessageClipSource, SessionMessageClipSourceInput, UpdateClipRequest,
  UpdateClipResult, CloseSideChatResult,
} from './types.ts'
import { TemporarySideChatRuntime, type SideChatRuntimeConfig } from './side-chat.ts'

export type * from './types.ts'
export {
  branchMarkDomainSpec, clipSchema, clipSourceSchema, clipTextRangeSchema,
} from './spec.ts'

/** Required byte and item limits for persisted Clip fields. */
export interface Config extends SideChatRuntimeConfig {
  readonly maxExcerptBytes: number
  readonly maxNoteBytes: number
  readonly maxTagsPerClip: number
  readonly maxTagBytes: number
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    branchmark: BranchMarkService
  }
}

function success<T>(value: T): ClipSuccess<T> {
  return Object.freeze({ ok: true, value })
}

function rejected(error: ClipFailure): ClipRejected {
  return Object.freeze({ ok: false, error: Object.freeze(error) })
}

function now(): string {
  return new Date().toISOString()
}

function clipId(): ClipId {
  return randomUUID() as ClipId
}

function usageId(): ClipUsageId {
  return randomUUID() as ClipUsageId
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8')
}

function compareClips(left: Clip, right: Clip): number {
  const pinOrder = Number(right.pinnedAt !== undefined) - Number(left.pinnedAt !== undefined)
  if (pinOrder !== 0) return pinOrder
  if (left.sortIndex !== undefined && right.sortIndex !== undefined && left.sortIndex !== right.sortIndex) {
    return left.sortIndex - right.sortIndex
  }
  if ((left.sortIndex !== undefined) !== (right.sortIndex !== undefined)) {
    return left.sortIndex === undefined ? -1 : 1
  }
  return right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id)
}

function canonicalMessageText(message: Message): string {
  const texts: string[] = []
  for (const block of message.content) {
    if (block.type === 'text' || block.type === 'reasoning') texts.push(block.text)
  }
  return texts.join('\n\n')
}

function turnAt(events: readonly SessionEvent[], index: number): number | undefined {
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const event = events[cursor]
    if (event?.type === 'turn/start') return event.data.turn
  }
  return undefined
}

function completedTurn(events: readonly SessionEvent[], index: number, turn: number): boolean {
  for (let cursor = index; cursor < events.length; cursor += 1) {
    const event = events[cursor]
    if (event?.type === 'turn/end' && event.data.turn === turn) return true
    if (event?.type === 'turn/start' && event.data.turn !== turn) return false
  }
  return false
}

/** Storage-domain service that validates every durable source against persisted DSH history. */
export class BranchMarkService extends Service {
  static inject = ['storageDomain', 'sessionPersistence', 'sessions', 'workspaceRegistry', 'llm', 'fs', 'web']

  static Config: s<Config> = s.object({
    maxExcerptBytes: s.number().step(1).min(1).required(),
    maxNoteBytes: s.number().step(1).min(1).required(),
    maxTagsPerClip: s.number().step(1).min(1).required(),
    maxTagBytes: s.number().step(1).min(1).required(),
    recentContextMessages: s.number().step(1).min(1).required(),
    summaryProvider: s.string().required(),
    summaryModel: s.string().required(),
    summaryMaxTokens: s.number().step(1).min(1).required(),
    answerMaxTokens: s.number().step(1).min(1).required(),
    maxToolRounds: s.number().step(1).min(1).required(),
    maxToolOutputChars: s.number().step(1).min(1).required(),
    maxReadChars: s.number().step(1).min(1).required(),
    maxSearchFiles: s.number().step(1).min(1).required(),
  })

  private readonly config: Config
  readonly typertRemote = bindTypertRemote(this, 'branchmark')
  private clips?: KvTable<ClipId, Clip>
  private derivedSessions?: KvTable<SessionId, DerivedSessionRecord>
  private readonly sideChats: TemporarySideChatRuntime

  constructor(ctx: Context, config: Config) {
    super(ctx, 'branchmark')
    this.config = config
    this.sideChats = new TemporarySideChatRuntime(ctx, config)
  }

  /** Open the plugin-owned local data domain and close it after pending writes drain. */
  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(branchMarkDomainSpec)
    this.ctx.effect(() => async () => { await domain.close() }, 'branchmark.domain')
    this.clips = domain.table('clips')
    this.derivedSessions = domain.table('derived_sessions')
    this.ctx.effect(() => () => { this.sideChats.destroy() }, 'branchmark.sideChats')
  }

  /** Create one process-local Side Chat and prepare its source snapshot in the background. */
  @Remote('createSideChat')
  async createSideChat(request: CreateSideChatRequest): Promise<CreateSideChatResult> {
    const membership = this.validateWorkspaceSession(request.workspaceId, request.ownerSessionId)
    if (membership !== undefined) return rejected(membership)
    if (request.clips.length === 0) {
      return rejected({ code: 'invalid-request', message: 'at least one Clip is required for Side Chat' })
    }
    const ids = request.clips.map(selection => selection.clipId)
    if (new Set(ids).size !== ids.length || !ids.includes(request.primaryClipId)) {
      return rejected({ code: 'invalid-request', message: 'Side Chat Clips must be unique and include the primary Clip' })
    }
    const clips: Clip[] = []
    for (const selection of request.clips) {
      const owned = this.ownedClip(request.workspaceId, selection.clipId)
      if (!owned.ok) return owned
      if (owned.value.status !== 'active') {
        return rejected({ code: 'invalid-request', message: 'trashed Clips cannot start a Side Chat' })
      }
      clips.push(owned.value)
    }
    const primary = clips.find(clip => clip.id === request.primaryClipId)
    if (primary?.source.kind !== 'session-message' || !primary.source.forkable) {
      return rejected({ code: 'invalid-request', message: 'Side Chat primary Clip needs one complete persisted source turn' })
    }
    let snapshot
    try {
      snapshot = await this.sideChats.create(request, clips)
    } catch {
      snapshot = undefined
    }
    return snapshot === undefined
      ? rejected({ code: 'side-chat-context-unavailable', sessionId: primary.source.sessionId })
      : success(snapshot)
  }

  /** Read the latest immutable browser snapshot of one process-local Side Chat. */
  @Remote('getSideChat')
  getSideChat(request: SideChatIdentityRequest): GetSideChatResult {
    const snapshot = this.sideChats.get(request.id)
    return snapshot === undefined ? rejected({ code: 'side-chat-not-found', id: request.id }) : success(snapshot)
  }

  /** Admit one question without waiting for the model answer to finish. */
  @Remote('sendSideChat')
  sendSideChat(request: SendSideChatRequest): SendSideChatResult {
    const text = this.validateRequiredText('text', request.text, this.config.maxExcerptBytes)
    if (!text.ok) return text
    const snapshot = this.sideChats.send(request.id, text.value)
    if (snapshot === undefined) return rejected({ code: 'side-chat-not-found', id: request.id })
    if (snapshot === 'busy') return rejected({ code: 'side-chat-busy', id: request.id })
    return success(snapshot)
  }

  /** Change the model for later answers without mutating the source Session selection. */
  @Remote('selectSideChatModel')
  async selectSideChatModel(request: SelectSideChatModelRequest): Promise<SelectSideChatModelResult> {
    const selected = await this.sideChats.selectModel(request.id, request.selection)
    if (selected === undefined) return rejected({ code: 'side-chat-not-found', id: request.id })
    if (selected === 'busy') return rejected({ code: 'side-chat-busy', id: request.id })
    if ('unavailable' in selected) {
      return rejected({
        code: 'side-chat-model-unavailable',
        provider: request.selection.provider,
        model: request.selection.model,
        message: selected.unavailable,
      })
    }
    return success(selected)
  }

  /** Cancel the in-flight answer while retaining the temporary tab. */
  @Remote('cancelSideChat')
  cancelSideChat(request: SideChatIdentityRequest): CancelSideChatResult {
    const snapshot = this.sideChats.cancel(request.id)
    return snapshot === undefined ? rejected({ code: 'side-chat-not-found', id: request.id }) : success(snapshot)
  }

  /** Abort and immediately destroy one Side Chat; no durable record remains. */
  @Remote('closeSideChat')
  closeSideChat(request: SideChatIdentityRequest): CloseSideChatResult {
    return this.sideChats.close(request.id)
      ? success({ destroyed: true })
      : rejected({ code: 'side-chat-not-found', id: request.id })
  }

  /**
   * Validate one observed selection and persist an immutable Clip source and excerpt.
   * @param request - Workspace, owner Session, source observation, and mutable initial metadata.
   * @returns the committed Clip or a stable business failure.
   */
  @Remote('create')
  async create(request: CreateClipRequest): Promise<CreateClipResult> {
    const workspaceFailure = this.validateWorkspaceSession(request.workspaceId, request.ownerSessionId)
    if (workspaceFailure !== undefined) return rejected(workspaceFailure)
    const excerpt = this.validateRequiredText('excerpt', request.excerpt, this.config.maxExcerptBytes)
    if (!excerpt.ok) return excerpt
    const note = this.validateOptionalText('note', request.note, this.config.maxNoteBytes)
    if (!note.ok) return note
    const tags = this.validateTags(request.tags ?? [])
    if (!tags.ok) return tags
    const source = await this.resolveSource(request.source, request.ownerSessionId, excerpt.value)
    if (!source.ok) return source
    const timestamp = now()
    const clip: Clip = Object.freeze({
      id: clipId(),
      workspaceId: request.workspaceId,
      scope: request.scope ?? 'session',
      ownerSessionId: request.ownerSessionId,
      source: source.value,
      excerpt: excerpt.value,
      ...(note.value === undefined ? {} : { note: note.value }),
      tags: Object.freeze(tags.value),
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await this.requireClips().put(clip.id, clip)
    return success(clip)
  }

  /**
   * List only Clips visible in the requested product surface.
   * @param request - Workspace visibility mode and optional search filters.
   * @returns sorted immutable records and the matching tag vocabulary.
   */
  @Remote('list')
  list(request: ListClipsRequest): ListClipsResult {
    if (this.ctx.workspaceRegistry.get(request.workspaceId) === undefined) {
      return rejected({ code: 'workspace-not-found', workspaceId: request.workspaceId })
    }
    if ((request.visibility === 'session-drawer' || request.visibility === 'session-trash')
      && request.ownerSessionId === undefined) {
      return rejected({ code: 'invalid-request', message: 'session visibility requires ownerSessionId' })
    }
    const search = request.search?.trim().toLocaleLowerCase()
    const tags = this.normalizeQueryTags(request.tags ?? [])
    const clips = [...this.requireClips().entries()].map(([, clip]) => clip).filter((clip) => {
      if (clip.workspaceId !== request.workspaceId) return false
      if (request.visibility === 'session-trash' || request.visibility === 'project-trash') {
        if (clip.status !== 'trashed') return false
      } else if (clip.status !== 'active') return false
      if ((request.visibility === 'project-library' || request.visibility === 'project-trash')
        && clip.scope !== 'project') return false
      if ((request.visibility === 'session-drawer' || request.visibility === 'session-trash')
        && (clip.scope !== 'session' || clip.ownerSessionId !== request.ownerSessionId)) return false
      if (request.forkable !== undefined && clip.source.forkable !== request.forkable) return false
      if (request.sourceSessionId !== undefined
        && (clip.source.kind !== 'session-message' || clip.source.sessionId !== request.sourceSessionId)) return false
      if (tags.length > 0 && tags.some(tag => !clip.tags.includes(tag))) return false
      if (search !== undefined && search !== '') {
        const haystack = `${clip.excerpt}\n${clip.note ?? ''}`.toLocaleLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    }).sort(compareClips)
    const tagVocabulary = [...new Set(clips.flatMap(clip => clip.tags))].sort()
    return success({ clips: Object.freeze(clips), tags: Object.freeze(tagVocabulary) })
  }

  /**
   * Replace only mutable Clip fields; source and excerpt remain unchanged.
   * @param request - Clip identity and any mutable replacement fields.
   * @returns the committed Clip or a stable business failure.
   */
  @Remote('update')
  async update(request: UpdateClipRequest): Promise<UpdateClipResult> {
    const current = this.ownedClip(request.workspaceId, request.clipId)
    if (!current.ok) return current
    const note = request.note === undefined
      ? success(current.value.note)
      : this.validateOptionalText('note', request.note ?? undefined, this.config.maxNoteBytes)
    if (!note.ok) return note
    const tags = request.tags === undefined ? success(current.value.tags) : this.validateTags(request.tags)
    if (!tags.ok) return tags
    const timestamp = now()
    const updated = await this.requireClips().update(request.clipId, (clip) => {
      const {
        note: _priorNote,
        pinnedAt: _priorPinnedAt,
        sortIndex: _priorSortIndex,
        ...stable
      } = clip
      const scope = request.scope ?? clip.scope
      const pinned = request.pinned ?? clip.pinnedAt !== undefined
      const collectionChanged = scope !== clip.scope || pinned !== (clip.pinnedAt !== undefined)
      return Object.freeze({
        ...stable,
        scope,
        ...(note.value === undefined ? {} : { note: note.value }),
        tags: Object.freeze([...tags.value]),
        ...(pinned ? { pinnedAt: clip.pinnedAt ?? timestamp } : {}),
        ...(!collectionChanged && clip.sortIndex !== undefined ? { sortIndex: clip.sortIndex } : {}),
        updatedAt: timestamp,
      })
    })
    return success(updated)
  }

  /**
   * Move one Clip to or from the recoverable trash without changing its provenance.
   * @param request - Clip identity and target status.
   * @returns the committed Clip or a stable business failure.
   */
  @Remote('setStatus')
  async setStatus(request: SetClipStatusRequest): Promise<SetClipStatusResult> {
    const current = this.ownedClip(request.workspaceId, request.clipId)
    if (!current.ok) return current
    if (current.value.status === request.status) return current
    const timestamp = now()
    const updated = await this.requireClips().update(request.clipId, (clip) => {
      const { trashedAt: _priorTrashedAt, ...withoutTrashedAt } = clip
      return Object.freeze({
        ...withoutTrashedAt,
        status: request.status,
        updatedAt: timestamp,
        ...(request.status === 'trashed' ? { trashedAt: timestamp } : {}),
      })
    })
    return success(updated)
  }

  /**
   * Permanently remove one Clip while retaining all ordinary-Session usage snapshots.
   * @param request - Workspace and Clip identity.
   * @returns a stable deleted postcondition or `clip-not-found`.
   */
  @Remote('deleteForever')
  async deleteForever(request: DeleteClipRequest): Promise<DeleteClipResult> {
    const current = this.ownedClip(request.workspaceId, request.clipId)
    if (!current.ok) return current
    await this.requireClips().delete(request.clipId)
    return success({ deleted: true })
  }

  /** Prevalidate and apply one metadata mutation to several Clips in request order. */
  @Remote('batchUpdate')
  async batchUpdate(request: BatchUpdateClipsRequest): Promise<BatchUpdateClipsResult> {
    if (request.clipIds.length === 0 || new Set(request.clipIds).size !== request.clipIds.length) {
      return rejected({ code: 'invalid-request', message: 'batch Clip ids must be non-empty and unique' })
    }
    const current: Clip[] = []
    for (const id of request.clipIds) {
      const owned = this.ownedClip(request.workspaceId, id)
      if (!owned.ok) return owned
      current.push(owned.value)
    }
    if (request.mutation.kind === 'reorder') {
      const mutation = request.mutation
      if (mutation.scope === 'session' && mutation.ownerSessionId === undefined) {
        return rejected({ code: 'invalid-request', message: 'session reorder requires ownerSessionId' })
      }
      const collection = [...this.requireClips().entries()].map(([, clip]) => clip).filter((clip) => {
        if (clip.workspaceId !== request.workspaceId || clip.status !== 'active') return false
        if (mutation.scope === 'project') return clip.scope === 'project'
        return clip.scope === 'session' && clip.ownerSessionId === mutation.ownerSessionId
      })
      const collectionIds = new Set(collection.map(clip => clip.id))
      if (collection.length !== current.length || current.some(clip => !collectionIds.has(clip.id))) {
        return rejected({ code: 'invalid-request', message: 'reorder requires the complete active Clip collection' })
      }
      let reachedUnpinned = false
      for (const clip of current) {
        if (clip.pinnedAt === undefined) reachedUnpinned = true
        else if (reachedUnpinned) {
          return rejected({ code: 'invalid-request', message: 'pinned Clips must remain before unpinned Clips' })
        }
      }
      const timestamp = now()
      const committed: Clip[] = []
      for (const [sortIndex, clip] of current.entries()) {
        committed.push(await this.requireClips().update(clip.id, value => Object.freeze({
          ...value,
          sortIndex,
          updatedAt: timestamp,
        })))
      }
      return success({ clips: Object.freeze(committed) })
    }
    let tags: readonly string[] | undefined
    if (request.mutation.kind === 'add-tags') {
      const validated = this.validateTags(request.mutation.tags)
      if (!validated.ok) return validated
      tags = validated.value
      for (const clip of current) {
        const merged = this.validateTags([...clip.tags, ...tags])
        if (!merged.ok) return merged
      }
    }
    const committed: Clip[] = []
    for (const clip of current) {
      if (request.mutation.kind === 'set-status') {
        const result = await this.setStatus({
          workspaceId: request.workspaceId,
          clipId: clip.id,
          status: request.mutation.status,
        })
        if (!result.ok) return result
        committed.push(result.value)
      } else {
        const result = await this.update({
          workspaceId: request.workspaceId,
          clipId: clip.id,
          ...(request.mutation.kind === 'set-scope'
            ? { scope: request.mutation.scope }
            : request.mutation.kind === 'set-pinned'
              ? { pinned: request.mutation.pinned }
              : { tags: [...new Set([...clip.tags, ...(tags ?? [])])] }),
        })
        if (!result.ok) return result
        committed.push(result.value)
      }
    }
    return success({ clips: Object.freeze(committed) })
  }

  /**
   * Freeze the selected Clip text and note after DSH creates an ordinary Session.
   * DSH Session headers remain authoritative for full-Fork parent and seed facts.
   * @param request - created Session, launch mode, primary Clip, and note selections.
   * @returns the committed relation and use snapshots, or a stable mismatch.
   */
  @Remote('recordDerivedSession')
  async recordDerivedSession(request: RecordDerivedSessionRequest): Promise<RecordDerivedSessionResult> {
    if (this.requireDerivedSessions().get(request.derivedSessionId) !== undefined) {
      return rejected({ code: 'derived-session-already-recorded', derivedSessionId: request.derivedSessionId })
    }
    if (request.attachments.length === 0) {
      return rejected({ code: 'invalid-request', message: 'at least one Clip attachment is required' })
    }
    const attachmentIds = request.attachments.map(attachment => attachment.clipId)
    if (new Set(attachmentIds).size !== attachmentIds.length) {
      return rejected({ code: 'invalid-request', message: 'Clip attachments must be unique' })
    }
    const clips: Clip[] = []
    for (const attachment of request.attachments) {
      const clip = this.ownedClip(request.workspaceId, attachment.clipId)
      if (!clip.ok) return clip
      clips.push(clip.value)
    }
    const primary = request.primaryClipId === undefined
      ? undefined
      : clips.find(clip => clip.id === request.primaryClipId)
    if ((request.mode === 'full-fork') !== (primary !== undefined)) {
      return rejected({
        code: 'invalid-request',
        message: 'full-fork requires one attached primary Clip; clips-only forbids a primary Clip',
      })
    }
    if (primary?.source.kind === 'temporary-answer' || primary?.source.forkable === false) {
      return rejected({ code: 'invalid-request', message: 'the primary Clip is not eligible for full Fork' })
    }
    let inspection: SessionInspection
    try {
      inspection = await this.ctx.sessionPersistence.inspect(request.derivedSessionId)
    } catch {
      return rejected({ code: 'session-not-found', sessionId: request.derivedSessionId })
    }
    let expectedSeedLength: number | undefined
    if (primary?.source.kind === 'session-message') {
      let sourceInspection: SessionInspection
      try {
        sourceInspection = await this.ctx.sessionPersistence.inspect(primary.source.sessionId)
      } catch {
        return rejected({ code: 'session-not-found', sessionId: primary.source.sessionId })
      }
      expectedSeedLength = this.expectedForkSeedLength(sourceInspection.events, primary.source)
      if (expectedSeedLength === undefined) {
        return rejected({ code: 'source-mismatch', sessionId: primary.source.sessionId, eventSeq: primary.source.eventSeq })
      }
    }
    if (!this.matchesDerivedHeader(request.mode, inspection, primary?.source, expectedSeedLength)) {
      return rejected({ code: 'derived-session-mismatch', derivedSessionId: request.derivedSessionId })
    }
    const derivedSession = this.ctx.sessions.get(request.derivedSessionId)
    if (derivedSession === undefined) {
      return rejected({ code: 'derived-session-unavailable', derivedSessionId: request.derivedSessionId })
    }
    const timestamp = now()
    const relation: DerivedSessionRelation = Object.freeze({
      derivedSessionId: request.derivedSessionId,
      workspaceId: request.workspaceId,
      mode: request.mode,
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
        id: usageId(),
        clipId: clip.id,
        derivedSessionId: request.derivedSessionId,
        excerptSnapshot: clip.excerpt,
        ...(attachment.includeNote && clip.note !== undefined ? { noteSnapshot: clip.note } : {}),
        createdAt: timestamp,
      })
    })
    await this.requireDerivedSessions().put(request.derivedSessionId, {
      relation,
      usages: Object.freeze(usages),
    })
    derivedSession.append('user/message', createUserMessage({
      source: { kind: 'plugin', plugin: 'dsh-branchmark', form: 'recall' },
      content: [{
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
      }],
    }), { surfaceOp: 'append' })
    return success({ relation, usages: Object.freeze(usages) })
  }

  /**
   * Read bidirectional Clip-to-Session relations without resolving live Clip records.
   * @param request - Workspace plus an optional Clip or derived Session filter.
   * @returns retained immutable relations and usage snapshots.
   */
  @Remote('listRelations')
  listRelations(request: ListRelationsRequest): ListRelationsResult {
    if (request.clipId === undefined && request.derivedSessionId === undefined) {
      return rejected({ code: 'invalid-request', message: 'clipId or derivedSessionId is required' })
    }
    const records = [...this.requireDerivedSessions().entries()].map(([, record]) => record)
    const relations = records.map(record => record.relation)
      .filter(relation => relation.workspaceId === request.workspaceId)
      .filter(relation => request.derivedSessionId === undefined
        || relation.derivedSessionId === request.derivedSessionId)
      .filter(relation => request.clipId === undefined
        || relation.attachedClipIds.includes(request.clipId))
    const relationIds = new Set(relations.map(relation => relation.derivedSessionId))
    const usages = records.flatMap(record => record.usages)
      .filter(usage => relationIds.has(usage.derivedSessionId))
      .filter(usage => request.clipId === undefined || usage.clipId === request.clipId)
    return success({ relations: Object.freeze(relations), usages: Object.freeze(usages) })
  }

  private validateWorkspaceSession(
    workspaceId: CreateClipRequest['workspaceId'],
    sessionId: SessionId,
  ): ClipFailure | undefined {
    const workspace = this.ctx.workspaceRegistry.get(workspaceId)
    if (workspace === undefined) return { code: 'workspace-not-found', workspaceId }
    if (!workspace.sessionIds.includes(sessionId)) {
      return { code: 'session-outside-workspace', workspaceId, sessionId }
    }
    return undefined
  }

  private async resolveSource(
    input: ClipSourceInput,
    ownerSessionId: SessionId,
    excerpt: string,
  ): Promise<ClipSuccess<ClipSource> | ClipRejected> {
    if (input.kind === 'temporary-answer') {
      return success(Object.freeze({
        kind: 'temporary-answer', role: 'assistant', reopenable: false, forkable: false,
      }))
    }
    if (input.sessionId !== ownerSessionId) {
      return rejected({ code: 'source-mismatch', sessionId: input.sessionId, eventSeq: input.eventSeq })
    }
    let inspection: SessionInspection
    try {
      inspection = await this.ctx.sessionPersistence.inspect(input.sessionId)
    } catch {
      return rejected({ code: 'session-not-found', sessionId: input.sessionId })
    }
    return this.resolvePersistedSource(input, inspection, excerpt)
  }

  private resolvePersistedSource(
    input: SessionMessageClipSourceInput,
    inspection: SessionInspection,
    excerpt: string,
  ): ClipSuccess<SessionMessageClipSource> | ClipRejected {
    const index = inspection.events.findIndex(event => event.seq === input.eventSeq)
    const event = inspection.events[index]
    if (event === undefined || !isAppendSurfaceEvent(event)
      || (event.type !== 'user/message' && event.type !== 'assistant/message')) {
      return rejected({ code: 'source-not-found', sessionId: input.sessionId, eventSeq: input.eventSeq })
    }
    const message = deriveEventMessage(event)
    const turn = turnAt(inspection.events, index)
    if (message === null || message.id !== input.messageId || message.role !== input.role || turn !== input.turn
      || (event.type === 'user/message' && event.data.source.kind !== 'user')) {
      return rejected({ code: 'source-mismatch', sessionId: input.sessionId, eventSeq: input.eventSeq })
    }
    const text = canonicalMessageText(message)
    if (input.range.end > text.length || text.slice(input.range.start, input.range.end) !== excerpt) {
      return rejected({ code: 'excerpt-mismatch' })
    }
    return success(Object.freeze({
      ...input,
      reopenable: true,
      forkable: completedTurn(inspection.events, index, turn),
    }))
  }

  private validateRequiredText(
    field: string,
    value: string,
    maximumBytes: number,
  ): ClipSuccess<string> | ClipRejected {
    if (value.trim() === '') return rejected({ code: 'invalid-request', message: `${field} must not be blank` })
    const actual = byteLength(value)
    if (actual > maximumBytes) {
      return rejected({ code: 'invalid-request', message: `${field} exceeds ${String(maximumBytes)} UTF-8 bytes` })
    }
    return success(value)
  }

  private validateOptionalText(
    field: string,
    value: string | undefined,
    maximumBytes: number,
  ): ClipSuccess<string | undefined> | ClipRejected {
    if (value === undefined) return success(undefined)
    return this.validateRequiredText(field, value, maximumBytes)
  }

  private validateTags(values: readonly string[]): ClipSuccess<readonly string[]> | ClipRejected {
    if (values.length > this.config.maxTagsPerClip) {
      return rejected({
        code: 'invalid-request',
        message: `tags exceed the ${String(this.config.maxTagsPerClip)}-item limit`,
      })
    }
    const tags: string[] = []
    for (const value of values) {
      const tag = value.trim().toLocaleLowerCase()
      if (tag === '') return rejected({ code: 'invalid-request', message: 'tags must not be blank' })
      if (byteLength(tag) > this.config.maxTagBytes) {
        return rejected({
          code: 'invalid-request',
          message: `a tag exceeds ${String(this.config.maxTagBytes)} UTF-8 bytes`,
        })
      }
      if (!tags.includes(tag)) tags.push(tag)
    }
    return success(Object.freeze(tags))
  }

  private normalizeQueryTags(values: readonly string[]): readonly string[] {
    return [...new Set(values.map(value => value.trim().toLocaleLowerCase()).filter(Boolean))]
  }

  private ownedClip(
    workspaceId: CreateClipRequest['workspaceId'],
    id: ClipId,
  ): ClipSuccess<Clip> | ClipRejected {
    const clip = this.requireClips().get(id)
    return clip === undefined || clip.workspaceId !== workspaceId
      ? rejected({ code: 'clip-not-found', clipId: id })
      : success(clip)
  }

  private matchesDerivedHeader(
    mode: RecordDerivedSessionRequest['mode'],
    inspection: SessionInspection,
    source: SessionMessageClipSource | undefined,
    expectedSeedLength: number | undefined,
  ): boolean {
    if (mode === 'clips-only') {
      return inspection.meta.parentSession === undefined && inspection.meta.seedLength === undefined
    }
    return source !== undefined
      && expectedSeedLength !== undefined
      && inspection.meta.parentSession === source.sessionId
      && inspection.meta.seedLength === expectedSeedLength
  }

  private expectedForkSeedLength(
    events: readonly SessionEvent[],
    source: SessionMessageClipSource,
  ): number | undefined {
    const sourceIndex = events.findIndex(event => event.seq === source.eventSeq)
    if (sourceIndex < 0) return undefined
    const boundaryIndex = events.findIndex((event, index) => index >= sourceIndex
      && event.type === 'turn/end' && event.data.turn === source.turn)
    if (boundaryIndex < 0) return undefined
    let cut = boundaryIndex + 1
    while (cut < events.length && events[cut]?.type !== 'turn/start') cut += 1
    return cut
  }

  private requireClips(): KvTable<ClipId, Clip> {
    if (this.clips === undefined) throw new Error('branchmark: Clip table is not initialized')
    return this.clips
  }

  private requireDerivedSessions(): KvTable<SessionId, DerivedSessionRecord> {
    if (this.derivedSessions === undefined) throw new Error('branchmark: derived Session table is not initialized')
    return this.derivedSessions
  }
}

export default BranchMarkService
