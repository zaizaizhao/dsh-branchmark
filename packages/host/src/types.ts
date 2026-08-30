/** Public JSON-safe types shared by the BranchMark Host and browser plugin. */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'

/** Stable identity of one durable Clip. */
export type ClipId = Branded<'ClipId'>

/** Stable identity of one Clip use frozen into an ordinary Session. */
export type ClipUsageId = Branded<'ClipUsageId'>

/** Process-local identity of one temporary Side Chat tab. */
export type SideChatId = Branded<'SideChatId'>

/** Character offsets into the canonical textual projection of one message. */
export interface ClipTextRange {
  /** Inclusive UTF-16 code-unit offset. */
  readonly start: number
  /** Exclusive UTF-16 code-unit offset. */
  readonly end: number
}

/** Durable source of a Clip captured from a persisted DSH message. */
export interface SessionMessageClipSource {
  readonly kind: 'session-message'
  readonly sessionId: SessionId
  readonly messageId: MessageId
  readonly eventSeq: number
  readonly turn: number
  readonly role: 'user' | 'assistant'
  readonly range: ClipTextRange
  readonly sessionTitleSnapshot?: string
  readonly reopenable: true
  /** Whether the source turn was complete when this Clip was created. */
  readonly forkable: boolean
}

/** Snapshot-only source of a Clip saved from an in-memory Side Chat answer. */
export interface TemporaryAnswerClipSource {
  readonly kind: 'temporary-answer'
  readonly role: 'assistant'
  readonly reopenable: false
  readonly forkable: false
}

/** Immutable provenance carried by one Clip. */
export type ClipSource = SessionMessageClipSource | TemporaryAnswerClipSource

/** Durable Clip record. `excerpt` and `source` never change after creation. */
export interface Clip {
  readonly id: ClipId
  readonly workspaceId: WorkspaceId
  readonly scope: 'session' | 'project'
  readonly ownerSessionId: SessionId
  readonly source: ClipSource
  readonly excerpt: string
  readonly note?: string
  readonly tags: readonly string[]
  readonly status: 'active' | 'trashed'
  readonly createdAt: string
  readonly updatedAt: string
  readonly trashedAt?: string
}

/** Client observation used to create a Clip from one durable message. */
export interface SessionMessageClipSourceInput {
  readonly kind: 'session-message'
  readonly sessionId: SessionId
  readonly messageId: MessageId
  readonly eventSeq: number
  readonly turn: number
  readonly role: 'user' | 'assistant'
  readonly range: ClipTextRange
  readonly sessionTitleSnapshot?: string
}

/** Client observation used to save a temporary Side Chat answer. */
export interface TemporaryAnswerClipSourceInput {
  readonly kind: 'temporary-answer'
  readonly role: 'assistant'
}

/** Source fields accepted at creation; the Host derives reopen and Fork eligibility. */
export type ClipSourceInput = SessionMessageClipSourceInput | TemporaryAnswerClipSourceInput

/** Create one Clip in a DSH Workspace. */
export interface CreateClipRequest {
  readonly workspaceId: WorkspaceId
  readonly ownerSessionId: SessionId
  readonly scope?: 'session' | 'project'
  readonly source: ClipSourceInput
  readonly excerpt: string
  readonly note?: string
  readonly tags?: readonly string[]
}

/** Query one visibility-safe session/project collection or its matching trash. */
export interface ListClipsRequest {
  readonly workspaceId: WorkspaceId
  readonly visibility: 'session-drawer' | 'project-library' | 'session-trash' | 'project-trash'
  readonly ownerSessionId?: SessionId
  readonly search?: string
  readonly tags?: readonly string[]
  readonly forkable?: boolean
  readonly sourceSessionId?: SessionId
}

/** Current Clip list and its normalized tag vocabulary. */
export interface ListClipsValue {
  readonly clips: readonly Clip[]
  readonly tags: readonly string[]
}

/** Mutable fields of one Clip. Omitted fields retain their current values. */
export interface UpdateClipRequest {
  readonly workspaceId: WorkspaceId
  readonly clipId: ClipId
  /** `null` removes the note. */
  readonly note?: string | null
  readonly tags?: readonly string[]
  readonly scope?: 'session' | 'project'
}

/** Move one Clip between active storage and the recoverable trash. */
export interface SetClipStatusRequest {
  readonly workspaceId: WorkspaceId
  readonly clipId: ClipId
  readonly status: 'active' | 'trashed'
}

/** Permanently remove one Clip record without changing derived Sessions. */
export interface DeleteClipRequest {
  readonly workspaceId: WorkspaceId
  readonly clipId: ClipId
}

/** One batch mutation applied to a prevalidated Clip set. */
export type BatchClipMutation =
  | { readonly kind: 'add-tags'; readonly tags: readonly string[] }
  | { readonly kind: 'set-scope'; readonly scope: 'session' | 'project' }
  | { readonly kind: 'set-status'; readonly status: 'active' | 'trashed' }

/** Batch metadata operation used by the project library selection bar. */
export interface BatchUpdateClipsRequest {
  readonly workspaceId: WorkspaceId
  readonly clipIds: readonly ClipId[]
  readonly mutation: BatchClipMutation
}

/** Committed Clips in request order. */
export interface BatchUpdateClipsValue {
  readonly clips: readonly Clip[]
}

/** One selected Clip and whether its current note is included. */
export interface ClipAttachmentSelection {
  readonly clipId: ClipId
  readonly includeNote: boolean
}

/** Frozen use of one Clip by an ordinary DSH Session. */
export interface ClipUsage {
  readonly id: ClipUsageId
  readonly clipId: ClipId
  readonly derivedSessionId: SessionId
  readonly excerptSnapshot: string
  readonly noteSnapshot?: string
  readonly createdAt: string
}

/** Plugin-owned semantics associated with a DSH ordinary Session. */
export interface DerivedSessionRelation {
  readonly derivedSessionId: SessionId
  readonly workspaceId: WorkspaceId
  readonly mode: 'full-fork' | 'clips-only'
  readonly primaryClipId?: ClipId
  readonly sourceSessionId?: SessionId
  readonly sourceMessageId?: MessageId
  readonly sourceEventSeq?: number
  readonly sourceTurn?: number
  readonly attachedClipIds: readonly ClipId[]
  readonly createdAt: string
}

/** Record the immutable Clip snapshot after DSH creates an ordinary Session. */
export interface RecordDerivedSessionRequest {
  readonly derivedSessionId: SessionId
  readonly workspaceId: WorkspaceId
  readonly mode: 'full-fork' | 'clips-only'
  readonly primaryClipId?: ClipId
  readonly attachments: readonly ClipAttachmentSelection[]
}

/** Relation and use snapshots committed for one ordinary Session. */
export interface RecordDerivedSessionValue {
  readonly relation: DerivedSessionRelation
  readonly usages: readonly ClipUsage[]
}

/** Query either side of the Clip-to-Session relationship. */
export interface ListRelationsRequest {
  readonly workspaceId: WorkspaceId
  readonly clipId?: ClipId
  readonly derivedSessionId?: SessionId
}

/** Matching relations and retained usage snapshots. */
export interface ListRelationsValue {
  readonly relations: readonly DerivedSessionRelation[]
  readonly usages: readonly ClipUsage[]
}

/** Create one non-durable Side Chat from explicitly selected Clips. */
export interface CreateSideChatRequest {
  readonly workspaceId: WorkspaceId
  readonly ownerSessionId: SessionId
  readonly clips: readonly ClipAttachmentSelection[]
  /** Session-message Clip whose completed turn defines the source context boundary. */
  readonly primaryClipId: ClipId
}

/** Provider/model choice owned by one temporary Side Chat. */
export interface SideChatModelSelection {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

/** One adapter-owned reasoning level exposed by a Side Chat model. */
export interface SideChatReasoningEffort {
  readonly id: string
  readonly name: string
  readonly description?: string
}

/** Reasoning metadata for one exact Side Chat route. */
export interface SideChatModelReasoning {
  readonly efforts: readonly SideChatReasoningEffort[]
  readonly defaultEffort?: string
}

/** One selectable model in the shared DSH provider catalog. */
export interface SideChatModelOption {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly reasoning?: SideChatModelReasoning
}

/** One selectable DSH provider and its advertised Side Chat models. */
export interface SideChatModelGroup {
  readonly id: string
  readonly name: string
  readonly models: readonly SideChatModelOption[]
}

/** One provider whose advisory model catalog could not be loaded. */
export interface SideChatModelCatalogFailure {
  readonly id: string
  readonly name: string
  readonly message: string
}

/** Change the model used by subsequent answers in one Side Chat. */
export interface SelectSideChatModelRequest {
  readonly id: SideChatId
  readonly selection: SideChatModelSelection
}

/** Read-only tool activity associated with one assistant step. */
export interface SideChatToolSnapshot {
  readonly callId: string
  readonly name: string
  readonly arguments: string
  readonly status: 'running' | 'success' | 'error'
  readonly output?: string
}

/** Browser-safe view of one process-local Side Chat. */
export interface SideChatMessageSnapshot {
  /** Reuses the DSH message identity while omitting provider replay and unknown content blocks from the wire. */
  readonly messageId: MessageId
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly reasoning?: string
  readonly tools?: readonly SideChatToolSnapshot[]
}

/** Browser-safe view of one process-local Side Chat. */
export interface SideChatSnapshot {
  readonly id: SideChatId
  readonly workspaceId: WorkspaceId
  readonly ownerSessionId: SessionId
  readonly primaryClipId: ClipId
  readonly clips: readonly Clip[]
  readonly model: SideChatModelSelection
  readonly modelGroups: readonly SideChatModelGroup[]
  readonly modelFailures: readonly SideChatModelCatalogFailure[]
  readonly modelCatalogStatus: 'loading' | 'ready'
  /** Only the Side Chat exchange; reconstructed source context remains hidden. */
  readonly messages: readonly SideChatMessageSnapshot[]
  readonly status: 'preparing' | 'idle' | 'running' | 'error'
  readonly partialText: string
  readonly partialReasoning: string
  readonly contextWarning?: string
  readonly error?: string
  readonly createdAt: string
  readonly updatedAt: string
}

/** Submit one user question to an existing temporary Side Chat. */
export interface SendSideChatRequest {
  readonly id: SideChatId
  readonly text: string
}

/** Read, cancel, or immediately destroy one temporary Side Chat. */
export interface SideChatIdentityRequest {
  readonly id: SideChatId
}

/** The requested Workspace does not exist. */
export interface ClipWorkspaceNotFound {
  readonly code: 'workspace-not-found'
  readonly workspaceId: WorkspaceId
}

/** The requested Session does not exist or cannot be inspected. */
export interface ClipSessionNotFound {
  readonly code: 'session-not-found'
  readonly sessionId: SessionId
}

/** A Session is not owned by the addressed Workspace. */
export interface ClipSessionOutsideWorkspace {
  readonly code: 'session-outside-workspace'
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
}

/** The event seq does not identify an append-origin user or assistant message. */
export interface ClipSourceNotFound {
  readonly code: 'source-not-found'
  readonly sessionId: SessionId
  readonly eventSeq: number
}

/** The observed message identity, role, or turn differs from persisted history. */
export interface ClipSourceMismatch {
  readonly code: 'source-mismatch'
  readonly sessionId: SessionId
  readonly eventSeq: number
}

/** The selected range does not reproduce the submitted excerpt. */
export interface ClipExcerptMismatch {
  readonly code: 'excerpt-mismatch'
}

/** One request field violates the configured limits or a domain invariant. */
export interface ClipInvalidRequest {
  readonly code: 'invalid-request'
  readonly message: string
}

/** No Clip exists under the requested id and Workspace. */
export interface ClipNotFound {
  readonly code: 'clip-not-found'
  readonly clipId: ClipId
}

/** A derived Session relation already exists and is immutable. */
export interface DerivedSessionAlreadyRecorded {
  readonly code: 'derived-session-already-recorded'
  readonly derivedSessionId: SessionId
}

/** A requested full Fork does not match DSH's persisted parent and seed facts. */
export interface DerivedSessionMismatch {
  readonly code: 'derived-session-mismatch'
  readonly derivedSessionId: SessionId
}

/** The created Session is not currently attached, so Clip context cannot be recorded into its log. */
export interface DerivedSessionUnavailable {
  readonly code: 'derived-session-unavailable'
  readonly derivedSessionId: SessionId
}

/** The addressed temporary Side Chat has already been destroyed or never existed. */
export interface SideChatNotFound {
  readonly code: 'side-chat-not-found'
  readonly id: SideChatId
}

/** A temporary Side Chat accepts only one running answer at a time. */
export interface SideChatBusy {
  readonly code: 'side-chat-busy'
  readonly id: SideChatId
}

/** The chosen provider/model/reasoning route cannot serve Side Chat requests. */
export interface SideChatModelUnavailable {
  readonly code: 'side-chat-model-unavailable'
  readonly provider: string
  readonly model: string
  readonly message: string
}

/** The selected source has no complete persisted request configuration. */
export interface SideChatContextUnavailable {
  readonly code: 'side-chat-context-unavailable'
  readonly sessionId: SessionId
}

/** Shared business failures returned inside a successful Remote call. */
export type ClipFailure =
  | ClipWorkspaceNotFound
  | ClipSessionNotFound
  | ClipSessionOutsideWorkspace
  | ClipSourceNotFound
  | ClipSourceMismatch
  | ClipExcerptMismatch
  | ClipInvalidRequest
  | ClipNotFound
  | DerivedSessionAlreadyRecorded
  | DerivedSessionMismatch
  | DerivedSessionUnavailable
  | SideChatNotFound
  | SideChatBusy
  | SideChatModelUnavailable
  | SideChatContextUnavailable

/** Successful BranchMark business result. */
export interface ClipSuccess<T> {
  readonly ok: true
  readonly value: T
}

/** Rejected BranchMark business result. */
export interface ClipRejected {
  readonly ok: false
  readonly error: ClipFailure
}

export type CreateClipResult = ClipSuccess<Clip> | ClipRejected
export type ListClipsResult = ClipSuccess<ListClipsValue> | ClipRejected
export type UpdateClipResult = ClipSuccess<Clip> | ClipRejected
export type SetClipStatusResult = ClipSuccess<Clip> | ClipRejected
export type DeleteClipResult = ClipSuccess<{ readonly deleted: true }> | ClipRejected
export type BatchUpdateClipsResult = ClipSuccess<BatchUpdateClipsValue> | ClipRejected
export type RecordDerivedSessionResult = ClipSuccess<RecordDerivedSessionValue> | ClipRejected
export type ListRelationsResult = ClipSuccess<ListRelationsValue> | ClipRejected
export type CreateSideChatResult = ClipSuccess<SideChatSnapshot> | ClipRejected
export type GetSideChatResult = ClipSuccess<SideChatSnapshot> | ClipRejected
export type SendSideChatResult = ClipSuccess<SideChatSnapshot> | ClipRejected
export type SelectSideChatModelResult = ClipSuccess<SideChatSnapshot> | ClipRejected
export type CancelSideChatResult = ClipSuccess<SideChatSnapshot> | ClipRejected
export type CloseSideChatResult = ClipSuccess<{ readonly destroyed: true }> | ClipRejected
