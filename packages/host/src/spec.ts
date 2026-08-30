/** Durable storage declaration for Clips and their ordinary-Session relations. */

import { z } from 'zod'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type {
  Clip, ClipId, ClipSource, ClipTextRange, ClipUsage, ClipUsageId, DerivedSessionRelation,
} from './types.ts'

const safeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const nonEmptyString = z.string().min(1)

const clipIdSchema = nonEmptyString.transform(value => value as ClipId)
const clipUsageIdSchema = nonEmptyString.transform(value => value as ClipUsageId)
const sessionIdSchema = nonEmptyString.transform(value => value as SessionId)
const workspaceIdSchema = nonEmptyString.transform(value => value as WorkspaceId)
const messageIdSchema = nonEmptyString.transform(value => value as MessageId)

export const clipTextRangeSchema = z.object({
  start: safeInteger,
  end: safeInteger,
}).refine(range => range.end > range.start, {
  message: 'Clip text range end must be greater than start',
}) as z.ZodType<ClipTextRange>

const sessionMessageSourceSchema = z.object({
  kind: z.literal('session-message'),
  sessionId: sessionIdSchema,
  messageId: messageIdSchema,
  eventSeq: safeInteger,
  turn: safeInteger,
  role: z.union([z.literal('user'), z.literal('assistant')]),
  range: clipTextRangeSchema,
  sessionTitleSnapshot: z.string().optional(),
  reopenable: z.literal(true),
  forkable: z.boolean(),
})

const temporaryAnswerSourceSchema = z.object({
  kind: z.literal('temporary-answer'),
  role: z.literal('assistant'),
  reopenable: z.literal(false),
  forkable: z.literal(false),
})

export const clipSourceSchema = z.discriminatedUnion('kind', [
  sessionMessageSourceSchema,
  temporaryAnswerSourceSchema,
]) as z.ZodType<ClipSource>

export const clipSchema = z.object({
  id: clipIdSchema,
  workspaceId: workspaceIdSchema,
  scope: z.union([z.literal('session'), z.literal('project')]),
  ownerSessionId: sessionIdSchema,
  source: clipSourceSchema,
  excerpt: nonEmptyString,
  note: nonEmptyString.optional(),
  tags: z.array(nonEmptyString),
  pinnedAt: nonEmptyString.optional(),
  sortIndex: safeInteger.optional(),
  status: z.union([z.literal('active'), z.literal('trashed')]),
  createdAt: nonEmptyString,
  updatedAt: nonEmptyString,
  trashedAt: nonEmptyString.optional(),
}).superRefine((clip, ctx) => {
  if (new Set(clip.tags).size !== clip.tags.length) {
    ctx.addIssue({ code: 'custom', path: ['tags'], message: 'Clip tags must be unique' })
  }
  if ((clip.status === 'trashed') !== (clip.trashedAt !== undefined)) {
    ctx.addIssue({ code: 'custom', path: ['trashedAt'], message: 'trashedAt must match Clip status' })
  }
}) as z.ZodType<Clip>

export const clipUsageSchema = z.object({
  id: clipUsageIdSchema,
  clipId: clipIdSchema,
  derivedSessionId: sessionIdSchema,
  excerptSnapshot: nonEmptyString,
  noteSnapshot: nonEmptyString.optional(),
  createdAt: nonEmptyString,
}) as z.ZodType<ClipUsage>

export const derivedSessionRelationSchema = z.object({
  derivedSessionId: sessionIdSchema,
  workspaceId: workspaceIdSchema,
  mode: z.union([z.literal('full-fork'), z.literal('clips-only')]),
  primaryClipId: clipIdSchema.optional(),
  sourceSessionId: sessionIdSchema.optional(),
  sourceMessageId: messageIdSchema.optional(),
  sourceEventSeq: safeInteger.optional(),
  sourceTurn: safeInteger.optional(),
  attachedClipIds: z.array(clipIdSchema).min(1),
  createdAt: nonEmptyString,
}).superRefine((relation, ctx) => {
  const sourceFields = [
    relation.primaryClipId,
    relation.sourceSessionId,
    relation.sourceMessageId,
    relation.sourceEventSeq,
    relation.sourceTurn,
  ]
  const expected = relation.mode === 'full-fork'
  if (sourceFields.some(value => value !== undefined) !== expected
    || (expected && sourceFields.some(value => value === undefined))) {
    ctx.addIssue({
      code: 'custom',
      message: 'full-fork relations require every source field; clips-only relations require none',
    })
  }
  if (new Set(relation.attachedClipIds).size !== relation.attachedClipIds.length) {
    ctx.addIssue({ code: 'custom', path: ['attachedClipIds'], message: 'attached Clip ids must be unique' })
  }
}) as z.ZodType<DerivedSessionRelation>

/** One atomic storage record for a derived Session relation and every frozen Clip use. */
export interface DerivedSessionRecord {
  readonly relation: DerivedSessionRelation
  readonly usages: readonly ClipUsage[]
}

export const derivedSessionRecordSchema = z.object({
  relation: derivedSessionRelationSchema,
  usages: z.array(clipUsageSchema).min(1),
}).superRefine((record, ctx) => {
  if (record.usages.some(usage => usage.derivedSessionId !== record.relation.derivedSessionId)) {
    ctx.addIssue({ code: 'custom', path: ['usages'], message: 'usage Session ids must match their relation' })
  }
  if (record.usages.map(usage => usage.clipId).join('\0') !== record.relation.attachedClipIds.join('\0')) {
    ctx.addIssue({ code: 'custom', path: ['usages'], message: 'usage Clip ids must match relation attachment order' })
  }
}) as z.ZodType<DerivedSessionRecord>

export const branchMarkDomainSpec = defineDomain({
  name: 'clip_explorer',
  version: 1,
  tables: {
    clips: domainTable<ClipId, Clip>(clipSchema),
    derived_sessions: domainTable<SessionId, DerivedSessionRecord>(derivedSessionRecordSchema),
  },
})
