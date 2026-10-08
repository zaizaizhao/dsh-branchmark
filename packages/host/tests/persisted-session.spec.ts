/** Read-handle release and stored excerpt identity across DSH log renumbering. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionId, SessionSeq } from '@deepseek-ai/dsh-session'
import { readPersistedSession } from '../src/persisted-session.ts'
import { branchMarkDomainSpec } from '../src/spec.ts'
import type { ClipId } from '../src/types.ts'
import { createHarness, transcript, type TestHarness } from './helpers.ts'

let harness: TestHarness | undefined
afterEach(async () => {
  vi.restoreAllMocks()
  await harness?.dispose()
  harness = undefined
})

describe('persisted Session reads', () => {
  it('closes independent read handles after successful and failed reads', async () => {
    harness = await createHarness()
    const source = transcript('handle-source', harness.projectRoot)
    harness.persistence.persist(source.session)
    const result = await readPersistedSession(harness.persistence, source.session.id)
    expect(result.events).toEqual(source.session.snapshotEvents())
    expect(harness.persistence.opened).toBe(harness.persistence.closed)

    const handle = await harness.persistence.open(source.session.id, 'read')
    const close = vi.spyOn(handle, 'close')
    vi.spyOn(handle, 'read').mockRejectedValue(new Error('read interrupted'))
    vi.spyOn(harness.persistence, 'open').mockResolvedValue(handle)
    await expect(readPersistedSession(harness.persistence, source.session.id)).rejects.toThrow('read interrupted')
    expect(close).toHaveBeenCalledOnce()
    expect(harness.persistence.opened).toBe(harness.persistence.closed)
  })

  it('relocates a saved excerpt by message identity before exposing it to clients', async () => {
    const id = 'old-clip' as ClipId
    let expectedSeq: number | undefined
    harness = await createHarness(async ({ ctx, persistence, workspace, projectRoot }) => {
      const source = transcript('migrated-source', projectRoot)
      persistence.persist(source.session)
      await workspace.attachSession(source.session.id)
      expectedSeq = source.assistantEventSeq
      const domain = await ctx.storageDomain.open(branchMarkDomainSpec)
      try {
        await domain.table('clips').put(id, {
          id, workspaceId: workspace.id, ownerSessionId: source.session.id, scope: 'session',
          source: {
            kind: 'session-message', sessionId: source.session.id, messageId: source.assistantMessageId,
            eventSeq: source.assistantEventSeq + 11, turn: 1, role: 'assistant',
            range: { start: 9, end: 23 }, reopenable: true, forkable: true,
          },
          excerpt: 'parent context', note: 'Keep my note', tags: ['saved'], status: 'active',
          createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
        })
      } finally { await domain.close() }
    })
    const result = await harness.ctx.branchmark.list({ workspaceId: harness.workspace.id, ownerSessionId: SessionId('migrated-source'), visibility: 'session-drawer' })
    expect(result).toMatchObject({ ok: true, value: { clips: [{ id, excerpt: 'parent context', note: 'Keep my note', source: { eventSeq: expectedSeq, forkable: true } }] } })
    expect(harness.persistence.opened).toBe(harness.persistence.closed)
  })

  it.each(['missing', 'ambiguous'] as const)('preserves user data and disables full forks when the source is %s', async state => {
    const id = 'unresolved-clip' as ClipId
    harness = await createHarness(async ({ ctx, persistence, workspace, projectRoot }) => {
      const source = transcript('unresolved-source', projectRoot)
      persistence.persist(source.session)
      await workspace.attachSession(source.session.id)
      if (state === 'missing') persistence.records.delete(source.session.id)
      else {
        const record = persistence.records.get(source.session.id)
        const event = source.session.eventAt(SessionSeq(source.assistantEventSeq))
        if (record === undefined || event === undefined) throw new Error('source fixture is incomplete')
        persistence.set({ ...record, events: [...record.events, { ...event, seq: SessionSeq(record.events.length) }] })
      }
      const domain = await ctx.storageDomain.open(branchMarkDomainSpec)
      try {
        await domain.table('clips').put(id, {
          id, workspaceId: workspace.id, ownerSessionId: source.session.id, scope: 'session',
          source: {
            kind: 'session-message', sessionId: source.session.id, messageId: source.assistantMessageId,
            eventSeq: source.assistantEventSeq, turn: 1, role: 'assistant',
            range: { start: 9, end: 23 }, reopenable: true, forkable: true,
          },
          excerpt: 'parent context', note: 'Keep my note', tags: ['saved'], status: 'active',
          createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
        })
      } finally { await domain.close() }
    })
    const result = harness.ctx.branchmark.list({ workspaceId: harness.workspace.id, ownerSessionId: SessionId('unresolved-source'), visibility: 'session-drawer' })
    expect(result).toMatchObject({ ok: true, value: { clips: [{
      id, excerpt: 'parent context', note: 'Keep my note', tags: ['saved'],
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', source: { forkable: false },
    }] } })
    expect(await harness.ctx.branchmark.prepareFork({ workspaceId: harness.workspace.id, clipId: id })).toMatchObject({ ok: false, error: { code: 'invalid-request' } })
    expect(harness.persistence.opened).toBe(harness.persistence.closed)
  })
})
