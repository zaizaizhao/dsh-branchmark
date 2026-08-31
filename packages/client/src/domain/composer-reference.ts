/** Native DSH Composer references for BranchMark attachments. */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { InputTriggerSource, ReferenceInsert } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { Clip, ClipId } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from './client.ts'
import { renderClipContext } from './format.ts'

/** Input-trigger owner used to route BranchMark serialization at submit time. */
export const BRANCHMARK_REFERENCE_SOURCE = 'branchmark'

/** Versioned identity retained by one unsent native Composer occurrence. */
export interface ClipReferencePayload {
  readonly version: 1
  readonly workspaceId: WorkspaceId
  readonly ownerSessionId: SessionId
  readonly clipId: ClipId
  readonly includeNote: boolean
}

function compactLabel(text: string): string {
  const normalized = text.replace(/\s+/gu, ' ').trim()
  return normalized.length <= 36 ? normalized : `${normalized.slice(0, 35)}…`
}

function payloadOf(clip: Clip, includeNote: boolean): ClipReferencePayload {
  return {
    version: 1,
    workspaceId: clip.workspaceId,
    ownerSessionId: clip.ownerSessionId,
    clipId: clip.id,
    includeNote,
  }
}

/** Decode and validate the browser-owned Clip reference identity. */
export function parseClipReference(ref: string): ClipReferencePayload {
  let value: unknown
  try {
    value = JSON.parse(ref)
  } catch {
    throw new Error('枝签引用格式无效，请移除后重新添加。')
  }
  if (typeof value !== 'object' || value === null) {
    throw new Error('枝签引用格式无效，请移除后重新添加。')
  }
  const record = value as Record<string, unknown>
  if (record.version !== 1
    || typeof record.workspaceId !== 'string'
    || typeof record.ownerSessionId !== 'string'
    || typeof record.clipId !== 'string'
    || typeof record.includeNote !== 'boolean') {
    throw new Error('枝签引用格式无效，请移除后重新添加。')
  }
  return record as unknown as ClipReferencePayload
}

/** Build one compact native reference; the excerpt is absent from the visible draft. */
export function clipReferenceInsert(clip: Clip, includeNote: boolean): ReferenceInsert {
  const payload = payloadOf(clip, includeNote)
  return {
    source: BRANCHMARK_REFERENCE_SOURCE,
    ref: JSON.stringify(payload),
    label: `枝签 · ${compactLabel(clip.excerpt)}`,
    appearance: 'session',
    clipboardText: `@branchmark:${clip.id}`,
  }
}

async function resolveClip(client: BranchMarkClient, payload: ClipReferencePayload, signal: AbortSignal): Promise<Clip> {
  if (signal.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('枝签引用序列化已取消。')
  const [sessionResult, projectResult] = await Promise.allSettled([
    client.list({
      workspaceId: payload.workspaceId,
      ownerSessionId: payload.ownerSessionId,
      visibility: 'session-drawer',
    }),
    client.list({ workspaceId: payload.workspaceId, visibility: 'project-library' }),
  ])
  if (signal.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('枝签引用序列化已取消。')
  const candidates = [sessionResult, projectResult].flatMap(result => (
    result.status === 'fulfilled' ? result.value.clips : []
  ))
  const clip = candidates.find(candidate => candidate.id === payload.clipId)
  if (clip === undefined || clip.ownerSessionId !== payload.ownerSessionId) {
    throw new Error('枝签不存在、已删除或已移入回收站，请移除引用后重试。')
  }
  return clip
}

/** Registerable source whose codec expands a BranchMark only inside the submit transaction. */
export function createBranchMarkInputTriggerSource(client: BranchMarkClient): InputTriggerSource {
  return {
    trigger: '@',
    name: BRANCHMARK_REFERENCE_SOURCE,
    showGroupTitle: false,
    candidates: () => Promise.resolve([]),
    onPick: () => undefined,
    codec: {
      clipboardText(ref) {
        return `@branchmark:${parseClipReference(ref).clipId}`
      },
      async serialize(ref, signal) {
        const payload = parseClipReference(ref)
        const clip = await resolveClip(client, payload, signal)
        return renderClipContext([{ clip, includeNote: payload.includeNote }])
      },
    },
  }
}
