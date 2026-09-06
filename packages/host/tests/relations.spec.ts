/** Branch semantics exercised through the real Session and storage services. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session'
import { deriveEventMessage, isAppendSurfaceEvent } from '@deepseek-ai/dsh-session/surface'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { SessionInspection } from '@deepseek-ai/dsh-session-persistence'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import { derivedSessionRecordSchema } from '../src/spec.ts'
import { attach, createHarness, transcript, type TestHarness } from './helpers.ts'

let h: TestHarness | undefined
afterEach(async () => {
  vi.restoreAllMocks()
  await h?.dispose()
  h = undefined
})

async function setup() {
  h = await createHarness()
  const source = transcript('source', h.projectRoot)
  await attach(h, source)
  const created = await h.ctx.branchmark.create({
    workspaceId: h.workspace.id,
    ownerSessionId: source.session.id,
    source: {
      kind: 'session-message',
      sessionId: source.session.id,
      messageId: source.assistantMessageId,
      eventSeq: source.assistantEventSeq,
      turn: 1,
      role: 'assistant',
      range: { start: 9, end: 23 },
    },
    excerpt: 'parent context',
    note: 'A selected note',
  })
  if (!created.ok) throw new Error(created.error.code)
  return { h, source, clip: created.value }
}

async function child(harness: TestHarness, id: string, source?: ReturnType<typeof transcript>) {
  const seed = source?.session.snapshotEvents() ?? []
  const session = harness.ctx.sessions.create(SessionId(id), {
    seed,
    meta: {
      createdAt: 1_700_000_000_100,
      cwd: harness.projectRoot,
      isSeeded: source !== undefined,
      ...(source === undefined ? {} : { parentSession: source.session.id }),
    },
    inheritedEventCount: SessionLogOffset(seed.length),
  })
  harness.persistence.persist(session)
  await harness.workspace.attachSession(session.id)
  return session
}

describe('persisted branch relationships', () => {
  it('resolves unprompted Session metadata without exposing or changing its context', async () => {
    const { h, source } = await setup()
    const blank = await child(h, 'unprompted')
    await h.ctx.branchmark.recordDerivedSession({
      workspaceId: h.workspace.id,
      derivedSessionId: blank.id,
      parentSessionId: source.session.id,
      mode: 'blank',
      attachments: [],
    })
    blank.append('session/title', { title: 'Named blank branch', source: { kind: 'user' }, messageSeqs: [] })
    h.persistence.persist(blank)
    const before = blank.snapshotEvents()
    const inspect = vi.spyOn(h.persistence, 'inspect')
    expect(await h.ctx.branchmark.listRelations({ workspaceId: h.workspace.id })).toMatchObject({
      ok: true,
      value: { sessions: [] },
    })
    expect(inspect).not.toHaveBeenCalled()
    const request = { workspaceId: h.workspace.id, includeSessions: true }
    const result = await h.ctx.branchmark.listRelations(request)
    if (!result.ok) throw new Error(result.error.code)
    expect(result.value.sessions).toEqual([
      { sessionId: source.session.id, available: true },
      { sessionId: blank.id, available: true, title: 'Named blank branch' },
    ])
    expect(blank.snapshotEvents()).toEqual(before)
    h.persistence.records.delete(blank.id)
    const missing = await h.ctx.branchmark.listRelations(request)
    if (!missing.ok) throw new Error(missing.error.code)
    expect(missing.value.sessions.at(-1)).toEqual({ sessionId: blank.id, available: false })
    expect(missing.value.relations).toHaveLength(1)
  })

  it('records all three branch modes with distinct model contexts', async () => {
    const { h, source, clip } = await setup()
    const sourceBefore = source.session.snapshotEvents()
    const observed = []
    for (const mode of ['full-fork', 'clips-only', 'blank'] as const) {
      const session = await child(h, mode, mode === 'full-fork' ? source : undefined)
      const result = await h.ctx.branchmark.recordDerivedSession({
        workspaceId: h.workspace.id,
        derivedSessionId: session.id,
        parentSessionId: source.session.id,
        mode,
        ...(mode === 'full-fork' ? { primaryClipId: clip.id } : {}),
        attachments: mode === 'blank' ? [] : [{ clipId: clip.id, includeNote: true }],
      })
      if (!result.ok) throw new Error(result.error.code)
      expect(derivedSessionRecordSchema.parse(result.value)).toEqual(result.value)
      observed.push({
        mode,
        nativeParent: session.header.parentSession ?? null,
        inheritsHistory: session.inheritedEventCount > 0,
        parent: result.value.relation.parentSessionId,
        attachedClips: result.value.relation.attachedClipIds.length,
        messages: session
          .snapshotEvents()
          .filter(isAppendSurfaceEvent)
          .flatMap((event) => {
            const message = deriveEventMessage(event)
            return message === null
              ? []
              : [
                  {
                    role: message.role,
                    text: message.content
                      .filter((block) => block.type === 'text')
                      .map((block) => block.text)
                      .join('\n'),
                  },
                ]
          }),
      })
    }
    const retained = await h.ctx.branchmark.listRelations({ workspaceId: h.workspace.id })
    expect(retained.ok && retained.value.relations.map((relation) => relation.mode)).toEqual([
      'full-fork',
      'clips-only',
      'blank',
    ])
    expect(source.session.snapshotEvents()).toEqual(sourceBefore)
    await expect(JSON.stringify(observed, null, 2) + '\n').toMatchFileSnapshot(
      './expected/branch-context.json',
    )
  })

  it('rejects blank branches carrying clips, history, or an invalid organizational parent', async () => {
    const { h, source, clip } = await setup()
    const fresh = await child(h, 'fresh')
    const request = {
      workspaceId: h.workspace.id,
      derivedSessionId: fresh.id,
      parentSessionId: source.session.id,
      mode: 'blank' as const,
      attachments: [],
    }
    expect(
      await h.ctx.branchmark.recordDerivedSession({
        ...request,
        attachments: [{ clipId: clip.id, includeNote: true }],
      }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-request' } })
    expect(
      await h.ctx.branchmark.recordDerivedSession({ ...request, parentSessionId: fresh.id }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-request' } })
    expect(await h.ctx.branchmark.recordDerivedSession({ ...request, primaryClipId: clip.id })).toMatchObject(
      { ok: false, error: { code: 'invalid-request' } },
    )
    expect(
      await h.ctx.branchmark.recordDerivedSession({ ...request, parentSessionId: SessionId('outside') }),
    ).toMatchObject({ ok: false, error: { code: 'session-outside-workspace' } })
    const inherited = await child(h, 'inherited', source)
    expect(
      await h.ctx.branchmark.recordDerivedSession({ ...request, derivedSessionId: inherited.id }),
    ).toMatchObject({ ok: false, error: { code: 'derived-session-mismatch' } })
    fresh.append(
      'user/message',
      createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text: 'Existing context' }] }),
      { surfaceOp: 'append' },
    )
    h.persistence.persist(fresh)
    expect(await h.ctx.branchmark.recordDerivedSession(request)).toMatchObject({
      ok: false,
      error: { code: 'derived-session-mismatch' },
    })
    expect(await h.ctx.branchmark.listRelations({ workspaceId: h.workspace.id })).toMatchObject({
      ok: true,
      value: { relations: [] },
    })
    expect(
      await h.ctx.branchmark.listRelations({ workspaceId: 'missing-workspace' as WorkspaceId }),
    ).toMatchObject({ ok: false, error: { code: 'workspace-not-found' } })
  })

  it('rejects concurrent attempts to record the same child before appending duplicate context', async () => {
    const { h, source, clip } = await setup()
    const session = await child(h, 'concurrent')
    const inspect = h.persistence.inspect.bind(h.persistence)
    const entered = Promise.withResolvers<void>()
    const release = Promise.withResolvers<SessionInspection>()
    vi.spyOn(h.persistence, 'inspect').mockImplementation((id) => {
      if (id !== session.id) return inspect(id)
      entered.resolve()
      return release.promise
    })
    const request = {
      workspaceId: h.workspace.id,
      derivedSessionId: session.id,
      parentSessionId: source.session.id,
      mode: 'clips-only' as const,
      attachments: [{ clipId: clip.id, includeNote: false }],
    }
    const first = h.ctx.branchmark.recordDerivedSession(request)
    try {
      await entered.promise
      expect(await h.ctx.branchmark.recordDerivedSession(request)).toMatchObject({
        ok: false,
        error: { code: 'derived-session-already-recorded' },
      })
    } finally {
      release.resolve(await inspect(session.id))
      await first
    }
    expect(session.snapshotEvents().filter(isAppendSurfaceEvent)).toHaveLength(1)
  })

  it('preserves older relation records and rejects contradictory blank snapshots', async () => {
    const { h, source, clip } = await setup()
    const session = await child(h, 'legacy')
    const result = await h.ctx.branchmark.recordDerivedSession({
      workspaceId: h.workspace.id,
      derivedSessionId: session.id,
      parentSessionId: source.session.id,
      mode: 'clips-only',
      attachments: [{ clipId: clip.id, includeNote: false }],
    })
    if (!result.ok) throw new Error(result.error.code)
    const { parentSessionId: _, ...legacy } = result.value.relation
    expect(derivedSessionRecordSchema.safeParse({ ...result.value, relation: legacy }).success).toBe(true)
    const blank = {
      relation: { ...legacy, mode: 'blank', parentSessionId: source.session.id, attachedClipIds: [] },
      usages: [],
    }
    expect(derivedSessionRecordSchema.safeParse(blank).success).toBe(true)
    expect(derivedSessionRecordSchema.safeParse({ ...blank, usages: result.value.usages }).success).toBe(
      false,
    )
    expect(
      derivedSessionRecordSchema.safeParse({
        ...blank,
        relation: { ...blank.relation, parentSessionId: session.id },
      }).success,
    ).toBe(false)
  })
})
