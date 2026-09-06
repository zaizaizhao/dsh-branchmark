/** Session creation delegates to DSH while keeping each context mode explicit. */
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { Clip, ClipId, RelatedSessionSummary } from 'dsh-branchmark-host/types'
import { BranchMarkClient } from '../src/domain/client.ts'

const parent = 'parent' as SessionId
const workspaceId = 'workspace' as WorkspaceId
const selected: Clip = {
  id: 'clip' as ClipId,
  workspaceId,
  ownerSessionId: parent,
  scope: 'session',
  source: { kind: 'temporary-answer', role: 'assistant', reopenable: false, forkable: false },
  excerpt: 'Private excerpt',
  note: 'Private note',
  tags: [],
  status: 'active',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

function fixture() {
  let sequence = 0
  const create = vi.fn(async () => `child-${++sequence}` as SessionId)
  const fork = vi.fn(async () => 'fork-child' as SessionId)
  const open = vi.fn()
  const rename = vi.fn(async () => ({ ok: true, value: {} }))
  const prompt = vi.fn(async () => ({ ok: true, value: {} }))
  const record = vi.fn(async () => ({ ok: true, value: { ok: true, value: {} } }))
  const summaries: RelatedSessionSummary[] = []
  const related = vi.fn(async () => ({
    ok: true,
    value: { ok: true, value: { relations: [], usages: [], sessions: summaries } },
  }))
  const listed: Record<string, { id: SessionId }> = { [parent]: { id: parent } }
  const ctx = {
    sessions: {
      create,
      fork,
      open,
      binding: () => ({ session: { rename, prompt } }),
      list: { getSnapshot: () => ({ byId: listed }) },
    },
    workspaces: {
      list: { getSnapshot: () => ({ items: [{ workspaceId, sessionIds: [parent, 'saved-child'] }] }) },
    },
    remote: { branchmark: { recordDerivedSession: record, listRelations: related } },
  } as unknown as Context
  return { client: new BranchMarkClient(ctx), create, fork, open, rename, prompt, record, related, summaries }
}

describe('ordinary branch launch', () => {
  it('adopts the existing unprompted identity before opening it after reload', async () => {
    const h = fixture()
    const sessionId = 'saved-child' as SessionId
    h.summaries.push({ sessionId, available: true, title: 'Saved blank branch' })
    await h.client.openRelatedSession(sessionId, workspaceId)
    expect(h.related).toHaveBeenCalledWith({ workspaceId, includeSessions: true })
    expect(h.create).toHaveBeenCalledWith({ workspaceId, sessionId })
    expect(h.open).toHaveBeenCalledWith(sessionId)
    expect(h.prompt).not.toHaveBeenCalled()
    expect(h.record).not.toHaveBeenCalled()
    h.create.mockClear()
    h.related.mockClear()
    await h.client.openRelatedSession(parent, workspaceId)
    expect(h.create).not.toHaveBeenCalled()
    expect(h.related).not.toHaveBeenCalled()
  })

  it('refuses to recreate a missing relationship endpoint or adopt another Workspace session', async () => {
    const h = fixture()
    const sessionId = 'saved-child' as SessionId
    h.summaries.push({ sessionId, available: false })
    await expect(h.client.openRelatedSession(sessionId, workspaceId)).rejects.toMatchObject({
      code: 'session-not-found',
    })
    await expect(h.client.openRelatedSession(sessionId, 'outside' as WorkspaceId)).rejects.toMatchObject({
      code: 'session-outside-workspace',
    })
    expect(h.create).not.toHaveBeenCalled()
    expect(h.open).not.toHaveBeenCalled()
  })

  it('drops all selected excerpts and notes in blank mode, then opens the named child', async () => {
    const h = fixture()
    await h.client.launch({
      workspaceId,
      parentSessionId: parent,
      mode: 'blank',
      clips: [selected],
      includeNotes: new Set([selected.id]),
      title: '  A new idea  ',
    })
    expect(h.create).toHaveBeenCalledWith({ workspaceId })
    expect(h.fork).not.toHaveBeenCalled()
    expect(h.record).toHaveBeenCalledWith({
      workspaceId,
      derivedSessionId: 'child-1',
      parentSessionId: parent,
      mode: 'blank',
      attachments: [],
    })
    expect(h.rename).toHaveBeenCalledWith('A new idea')
    expect(h.open).toHaveBeenCalledWith('child-1')
    expect(h.prompt).not.toHaveBeenCalled()
  })

  it('creates a fresh child each time and sends only a newly entered question', async () => {
    const h = fixture()
    const request = {
      workspaceId,
      parentSessionId: parent,
      mode: 'blank' as const,
      clips: [],
      includeNotes: new Set<ClipId>(),
    }
    expect(await h.client.launch(request)).toEqual({ sessionId: 'child-1' })
    expect(await h.client.launch({ ...request, question: 'A new question' })).toEqual({
      sessionId: 'child-2',
    })
    expect(h.create).toHaveBeenCalledTimes(2)
    expect(h.prompt).toHaveBeenCalledWith([{ type: 'text', text: 'A new question' }], 'queue')
    expect(h.open).toHaveBeenCalledTimes(1)
  })

  it('refuses contextless requests before creating an unassociated Session', async () => {
    const h = fixture()
    await expect(
      h.client.launch({
        workspaceId,
        parentSessionId: parent,
        mode: 'clips-only',
        clips: [],
        includeNotes: new Set(),
      }),
    ).rejects.toMatchObject({ code: 'invalid-request' })
    expect(h.create).not.toHaveBeenCalled()
  })
})
