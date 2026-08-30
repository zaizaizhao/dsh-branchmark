import { afterEach, describe, expect, it } from 'vitest'
import { SessionId } from '@deepseek-ai/dsh-session'
import {
  CallId, createAssistantMessage, createToolResultMessage, createUserMessage, LlmAdapter,
} from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import type { Clip, CreateClipRequest } from '../lib/types.js'
import { attach, createHarness, transcript, type TestHarness } from './helpers.ts'

const harnesses: TestHarness[] = []

class SideChatAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([
      { provider, id: 'test', name: 'Test Model' },
      { provider, id: 'alternate', name: 'Alternate Model' },
    ])
  }

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const text = 'A temporary answer that never entered the parent Session.'
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

class StrictSummaryAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []
  rejectSummaries = false

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([{ provider, id: 'test', name: 'Test Model' }])
  }

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const isSummary = options.tools === undefined
    if (isSummary) {
      if (this.rejectSummaries) {
        yield {
          type: 'finish',
          reason: {
            kind: 'error',
            failure: { code: 'RATE_LIMIT', message: 'summary endpoint temporarily unavailable' },
          },
        }
        return
      }
      const message = options.messages.length === 1 ? options.messages[0] : undefined
      const providerSafe = message?.role === 'user'
        && message.content.length === 1
        && message.content[0]?.type === 'text'
      if (!providerSafe) {
        yield {
          type: 'finish',
          reason: {
            kind: 'error',
            failure: { code: 'INVALID_REQUEST', message: 'structured history rejected by summary endpoint' },
          },
        }
        return
      }
    } else {
      const calls = new Set<string>()
      for (const message of options.messages) {
        for (const block of message.content) {
          if (block.type === 'tool-call') calls.add(block.id)
          if (block.type === 'tool-result' && !calls.has(block.toolCallId)) {
            yield {
              type: 'finish',
              reason: {
                kind: 'error',
                failure: { code: 'INVALID_REQUEST', message: 'orphaned tool result in answer history' },
              },
            }
            return
          }
        }
      }
    }
    const text = isSummary ? 'A compact provider-safe source summary.' : 'Answer after summary preparation.'
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

async function settledSideChat(h: TestHarness, id: Parameters<TestHarness['ctx']['branchmark']['getSideChat']>[0]['id']) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const result = h.ctx.branchmark.getSideChat({ id })
    if (result.ok && result.value.status !== 'running' && result.value.status !== 'preparing') return result.value
    await new Promise(resolve => setTimeout(resolve, 2))
  }
  throw new Error('Side Chat did not settle')
}

async function harness(): Promise<TestHarness> {
  const created = await createHarness()
  harnesses.push(created)
  return created
}

afterEach(async () => {
  await Promise.all(harnesses.splice(0).map(value => value.dispose()))
})

function expectClip(result: Awaited<ReturnType<TestHarness['ctx']['branchmark']['create']>>): Clip {
  if (!result.ok) throw new Error(`expected Clip, got ${result.error.code}`)
  return result.value
}

function request(
  h: TestHarness,
  fixture: ReturnType<typeof transcript>,
  overrides: Partial<CreateClipRequest> = {},
): CreateClipRequest {
  const start = fixture.assistantText.indexOf('parent context')
  const end = start + 'parent context'.length
  return {
    workspaceId: h.workspace.id,
    ownerSessionId: fixture.session.id,
    source: {
      kind: 'session-message',
      sessionId: fixture.session.id,
      messageId: fixture.assistantMessageId,
      eventSeq: fixture.assistantEventSeq,
      turn: 1,
      role: 'assistant',
      range: { start, end },
      sessionTitleSnapshot: 'Source session',
    },
    excerpt: 'parent context',
    ...overrides,
  }
}

describe('BranchMarkService', () => {
  it('publishes the generated Remote namespace and method roster', async () => {
    const h = await harness()
    expect(h.ctx.branchmark.typertRemote).toMatchObject({
      serviceKey: 'branchmark',
      namespace: 'branchmark',
    })
    expect(remoteMethods(h.ctx.branchmark)).toEqual([
      { method: 'createSideChat', invocation: { kind: 'direct' } },
      { method: 'getSideChat', invocation: { kind: 'direct' } },
      { method: 'sendSideChat', invocation: { kind: 'direct' } },
      { method: 'selectSideChatModel', invocation: { kind: 'direct' } },
      { method: 'cancelSideChat', invocation: { kind: 'direct' } },
      { method: 'closeSideChat', invocation: { kind: 'direct' } },
      { method: 'create', invocation: { kind: 'direct' } },
      { method: 'list', invocation: { kind: 'direct' } },
      { method: 'update', invocation: { kind: 'direct' } },
      { method: 'setStatus', invocation: { kind: 'direct' } },
      { method: 'deleteForever', invocation: { kind: 'direct' } },
      { method: 'batchUpdate', invocation: { kind: 'direct' } },
      { method: 'recordDerivedSession', invocation: { kind: 'direct' } },
      { method: 'listRelations', invocation: { kind: 'direct' } },
    ])
  })

  it('validates a persisted source range and computes Fork eligibility on the Host', async () => {
    const h = await harness()
    const source = transcript('source', h.projectRoot)
    await attach(h, source)
    const clip = expectClip(await h.ctx.branchmark.create(request(h, source, {
      note: 'Keep this decision',
      tags: ['Architecture', ' architecture ', 'Fork'],
    })))

    expect(clip).toMatchObject({
      workspaceId: h.workspace.id,
      scope: 'session',
      ownerSessionId: source.session.id,
      excerpt: 'parent context',
      note: 'Keep this decision',
      tags: ['architecture', 'fork'],
      status: 'active',
      source: {
        kind: 'session-message',
        sessionId: source.session.id,
        messageId: source.assistantMessageId,
        eventSeq: source.assistantEventSeq,
        turn: 1,
        reopenable: true,
        forkable: true,
      },
    })
    expect(Object.isFrozen(clip)).toBe(true)

    const open = transcript('open-source', h.projectRoot, false)
    await attach(h, open)
    expect(expectClip(await h.ctx.branchmark.create(request(h, open))).source.forkable).toBe(false)
  })

  it('rejects forged message anchors and excerpts without writing a Clip', async () => {
    const h = await harness()
    const source = transcript('source-mismatch', h.projectRoot)
    await attach(h, source)

    await expect(h.ctx.branchmark.create(request(h, source, {
      excerpt: 'different text',
    }))).resolves.toEqual({ ok: false, error: { code: 'excerpt-mismatch' } })
    await expect(h.ctx.branchmark.create(request(h, source, {
      source: {
        ...request(h, source).source,
        kind: 'session-message',
        turn: 2,
      },
    }))).resolves.toEqual({
      ok: false,
      error: { code: 'source-mismatch', sessionId: source.session.id, eventSeq: source.assistantEventSeq },
    })

    const listed = h.ctx.branchmark.list({
      workspaceId: h.workspace.id,
      visibility: 'session-drawer',
      ownerSessionId: source.session.id,
    })
    expect(listed).toEqual({ ok: true, value: { clips: [], tags: [] } })
  })

  it('keeps the Session drawer private and exposes promoted Clips only in the project library', async () => {
    const h = await harness()
    const first = transcript('first', h.projectRoot)
    const second = transcript('second', h.projectRoot)
    await attach(h, first)
    await attach(h, second)
    const firstPrivate = expectClip(await h.ctx.branchmark.create(request(h, first)))
    expectClip(await h.ctx.branchmark.create(request(h, second)))

    const promoted = await h.ctx.branchmark.update({
      workspaceId: h.workspace.id,
      clipId: firstPrivate.id,
      scope: 'project',
      tags: ['Shared'],
    })
    if (!promoted.ok) throw new Error(promoted.error.code)
    expect(promoted.value.id).toBe(firstPrivate.id)

    const firstDrawer = h.ctx.branchmark.list({
      workspaceId: h.workspace.id,
      visibility: 'session-drawer',
      ownerSessionId: first.session.id,
    })
    const secondDrawer = h.ctx.branchmark.list({
      workspaceId: h.workspace.id,
      visibility: 'session-drawer',
      ownerSessionId: second.session.id,
    })
    const library = h.ctx.branchmark.list({
      workspaceId: h.workspace.id,
      visibility: 'project-library',
      tags: ['shared'],
    })
    if (!firstDrawer.ok || !secondDrawer.ok || !library.ok) throw new Error('expected list success')
    expect(firstDrawer.value.clips).toEqual([])
    expect(secondDrawer.value.clips).toHaveLength(1)
    expect(secondDrawer.value.clips[0]?.ownerSessionId).toBe(second.session.id)
    expect(library.value.clips.map(clip => clip.id)).toEqual([firstPrivate.id])
  })

  it('supports note edits, trash recovery, and permanent deletion', async () => {
    const h = await harness()
    const source = transcript('lifecycle', h.projectRoot)
    await attach(h, source)
    const clip = expectClip(await h.ctx.branchmark.create(request(h, source)))

    const noted = await h.ctx.branchmark.update({
      workspaceId: h.workspace.id,
      clipId: clip.id,
      note: 'A mutable note',
    })
    if (!noted.ok) throw new Error(noted.error.code)
    expect(noted.value).toMatchObject({ excerpt: clip.excerpt, source: clip.source, note: 'A mutable note' })

    const trashed = await h.ctx.branchmark.setStatus({
      workspaceId: h.workspace.id,
      clipId: clip.id,
      status: 'trashed',
    })
    if (!trashed.ok) throw new Error(trashed.error.code)
    expect(trashed.value.trashedAt).toBeDefined()
    const trash = h.ctx.branchmark.list({
      workspaceId: h.workspace.id,
      visibility: 'session-trash',
      ownerSessionId: source.session.id,
    })
    if (!trash.ok) throw new Error(trash.error.code)
    expect(trash.value.clips.map(item => item.id)).toEqual([clip.id])

    await h.ctx.branchmark.setStatus({ workspaceId: h.workspace.id, clipId: clip.id, status: 'active' })
    await expect(h.ctx.branchmark.deleteForever({ workspaceId: h.workspace.id, clipId: clip.id }))
      .resolves.toEqual({ ok: true, value: { deleted: true } })
    await expect(h.ctx.branchmark.deleteForever({ workspaceId: h.workspace.id, clipId: clip.id }))
      .resolves.toEqual({ ok: false, error: { code: 'clip-not-found', clipId: clip.id } })
  })

  it('prevalidates and applies batch tags, scope, and trash operations', async () => {
    const h = await harness()
    const source = transcript('batch', h.projectRoot)
    await attach(h, source)
    const first = expectClip(await h.ctx.branchmark.create(request(h, source)))
    const second = expectClip(await h.ctx.branchmark.create(request(h, source, { excerpt: 'parent context' })))
    const tagged = await h.ctx.branchmark.batchUpdate({
      workspaceId: h.workspace.id,
      clipIds: [first.id, second.id],
      mutation: { kind: 'add-tags', tags: ['Review'] },
    })
    if (!tagged.ok) throw new Error(tagged.error.code)
    expect(tagged.value.clips.map(clip => clip.tags)).toEqual([['review'], ['review']])
    const promoted = await h.ctx.branchmark.batchUpdate({
      workspaceId: h.workspace.id,
      clipIds: [first.id, second.id],
      mutation: { kind: 'set-scope', scope: 'project' },
    })
    if (!promoted.ok) throw new Error(promoted.error.code)
    expect(promoted.value.clips.every(clip => clip.scope === 'project')).toBe(true)
    const trashed = await h.ctx.branchmark.batchUpdate({
      workspaceId: h.workspace.id,
      clipIds: [first.id, second.id],
      mutation: { kind: 'set-status', status: 'trashed' },
    })
    if (!trashed.ok) throw new Error(trashed.error.code)
    expect(trashed.value.clips.every(clip => clip.status === 'trashed')).toBe(true)
  })

  it('persists pin state and one complete order per visible Clip collection', async () => {
    const h = await harness()
    const source = transcript('ordered-library', h.projectRoot)
    await attach(h, source)
    const first = expectClip(await h.ctx.branchmark.create(request(h, source)))
    const second = expectClip(await h.ctx.branchmark.create(request(h, source)))
    const third = expectClip(await h.ctx.branchmark.create(request(h, source)))

    const pinned = await h.ctx.branchmark.batchUpdate({
      workspaceId: h.workspace.id,
      clipIds: [second.id],
      mutation: { kind: 'set-pinned', pinned: true },
    })
    if (!pinned.ok) throw new Error(pinned.error.code)
    expect(pinned.value.clips[0]?.pinnedAt).toBeDefined()

    const reordered = await h.ctx.branchmark.batchUpdate({
      workspaceId: h.workspace.id,
      clipIds: [second.id, third.id, first.id],
      mutation: {
        kind: 'reorder',
        scope: 'session',
        ownerSessionId: source.session.id,
      },
    })
    if (!reordered.ok) throw new Error(reordered.error.code)
    expect(reordered.value.clips.map(clip => clip.sortIndex)).toEqual([0, 1, 2])

    const listed = h.ctx.branchmark.list({
      workspaceId: h.workspace.id,
      visibility: 'session-drawer',
      ownerSessionId: source.session.id,
    })
    if (!listed.ok) throw new Error(listed.error.code)
    expect(listed.value.clips.map(clip => clip.id)).toEqual([second.id, third.id, first.id])

    await expect(h.ctx.branchmark.batchUpdate({
      workspaceId: h.workspace.id,
      clipIds: [second.id, first.id],
      mutation: {
        kind: 'reorder',
        scope: 'session',
        ownerSessionId: source.session.id,
      },
    })).resolves.toEqual({
      ok: false,
      error: { code: 'invalid-request', message: 'reorder requires the complete active Clip collection' },
    })
    await expect(h.ctx.branchmark.batchUpdate({
      workspaceId: h.workspace.id,
      clipIds: [first.id, second.id, third.id],
      mutation: {
        kind: 'reorder',
        scope: 'session',
        ownerSessionId: source.session.id,
      },
    })).resolves.toEqual({
      ok: false,
      error: { code: 'invalid-request', message: 'pinned Clips must remain before unpinned Clips' },
    })

    const unchanged = h.ctx.branchmark.list({
      workspaceId: h.workspace.id,
      visibility: 'session-drawer',
      ownerSessionId: source.session.id,
    })
    if (!unchanged.ok) throw new Error(unchanged.error.code)
    expect(unchanged.value.clips.map(clip => clip.id)).toEqual([second.id, third.id, first.id])
  })

  it('retains immutable Clip usage after the Clip is permanently deleted', async () => {
    const h = await harness()
    const source = transcript('fork-source', h.projectRoot)
    await attach(h, source)
    const clip = expectClip(await h.ctx.branchmark.create(request(h, source, {
      note: 'Carry this note',
    })))
    const childId = SessionId('fork-child')
    const child = h.ctx.sessions.create(childId, {
      seed: source.session.events,
      meta: {
        createdAt: 1_700_000_000_100,
        cwd: h.projectRoot,
        parentSession: source.session.id,
        seedLength: source.session.events.length,
      },
    })
    h.persistence.persist(child)
    await h.workspace.attachSession(childId)

    const recorded = await h.ctx.branchmark.recordDerivedSession({
      derivedSessionId: childId,
      workspaceId: h.workspace.id,
      mode: 'full-fork',
      primaryClipId: clip.id,
      attachments: [{ clipId: clip.id, includeNote: true }],
    })
    if (!recorded.ok) throw new Error(recorded.error.code)
    expect(recorded.value.relation).toMatchObject({
      derivedSessionId: childId,
      mode: 'full-fork',
      primaryClipId: clip.id,
      sourceSessionId: source.session.id,
      sourceMessageId: source.assistantMessageId,
      sourceEventSeq: source.assistantEventSeq,
    })
    expect(recorded.value.usages[0]).toMatchObject({
      clipId: clip.id,
      derivedSessionId: childId,
      excerptSnapshot: clip.excerpt,
      noteSnapshot: 'Carry this note',
    })
    expect(child.events.at(-1)).toMatchObject({
      type: 'user/message',
      data: {
        source: { kind: 'plugin', plugin: 'dsh-branchmark', form: 'recall' },
        content: [{ type: 'text', text: expect.stringContaining('Carry this note') }],
      },
      surfaceOp: 'append',
    })

    await h.ctx.branchmark.deleteForever({ workspaceId: h.workspace.id, clipId: clip.id })
    const relations = h.ctx.branchmark.listRelations({
      workspaceId: h.workspace.id,
      derivedSessionId: childId,
    })
    if (!relations.ok) throw new Error(relations.error.code)
    expect(relations.value.relations).toEqual([recorded.value.relation])
    expect(relations.value.usages).toEqual(recorded.value.usages)
  })

  it('runs a temporary Side Chat without creating or changing a normal Session', async () => {
    const h = await harness()
    const source = transcript('side-chat-source', h.projectRoot)
    await attach(h, source)
    const clip = expectClip(await h.ctx.branchmark.create(request(h, source, { note: 'Bring the note' })))
    const adapter = new SideChatAdapter()
    h.ctx.llm.registerAdapter(['test'], adapter)
    const sessionsBefore = h.ctx.sessions.list().map(session => session.id)

    const created = await h.ctx.branchmark.createSideChat({
      workspaceId: h.workspace.id,
      ownerSessionId: source.session.id,
      primaryClipId: clip.id,
      clips: [{ clipId: clip.id, includeNote: true }],
    })
    if (!created.ok) throw new Error(created.error.code)
    expect(created.value).toMatchObject({
      ownerSessionId: source.session.id,
      primaryClipId: clip.id,
      status: 'preparing',
      messages: [],
    })

    const admitted = h.ctx.branchmark.sendSideChat({ id: created.value.id, text: 'Explain this.' })
    if (!admitted.ok) throw new Error(admitted.error.code)
    expect(admitted.value.status).toBe('running')
    const finished = await settledSideChat(h, created.value.id)
    expect(finished.status).toBe('idle')
    expect(finished.messages).toEqual([
      expect.objectContaining({ role: 'user', text: 'Explain this.' }),
      expect.objectContaining({ role: 'assistant', text: 'A temporary answer that never entered the parent Session.' }),
    ])
    expect(adapter.requests).toHaveLength(1)
    expect(adapter.requests[0]?.messages.at(-1)?.content).toEqual([{ type: 'text', text: 'Explain this.' }])
    expect(h.ctx.sessions.list().map(session => session.id)).toEqual(sessionsBefore)

    expect(h.ctx.branchmark.closeSideChat({ id: created.value.id })).toEqual({ ok: true, value: { destroyed: true } })
    expect(h.ctx.branchmark.getSideChat({ id: created.value.id })).toEqual({
      ok: false,
      error: { code: 'side-chat-not-found', id: created.value.id },
    })
  })

  it('summarizes older source history through one provider-safe text message before answering', async () => {
    const h = await harness()
    const source = transcript('side-chat-summary-source', h.projectRoot)
    let assistantMessageId = source.assistantMessageId
    let assistantEventSeq = source.assistantEventSeq
    let assistantText = source.assistantText
    for (let turn = 2; turn <= 4; turn += 1) {
      source.session.append('turn/start', { turn })
      source.session.append('step/start', { turn, step: 1 })
      source.session.append('user/message', createUserMessage({
        source: { kind: 'user' },
        content: [{ type: 'text', text: `Question ${String(turn)}` }],
      }), { surfaceOp: 'append' })
      if (turn === 3) {
        const callId = CallId('summary-boundary-call')
        const argumentsJson = '{"query":"context"}'
        source.session.append('assistant/message', {
          turn,
          step: 1,
          message: createAssistantMessage({
            source: { provider: 'test', model: 'test' },
            content: [{ type: 'tool-call', id: callId, name: 'search', arguments: argumentsJson }],
          }),
        }, { surfaceOp: 'append' })
        const call = source.session.append('tool/call', {
          turn,
          step: 1,
          callId,
          name: 'search',
          arguments: argumentsJson,
        })
        source.session.append('tool/result', {
          turn,
          step: 1,
          message: createToolResultMessage({
            callId,
            content: [{ type: 'text', text: 'Search result used by the final answer.' }],
            isError: false,
          }),
        }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
      }
      assistantText = turn === 4
        ? 'Final parent context for the selected Clip.'
        : `Intermediate answer ${String(turn)}`
      const assistant = createAssistantMessage({
        source: { provider: 'test', model: 'test' },
        content: [{ type: 'text', text: assistantText }],
      })
      const event = source.session.append('assistant/message', {
        turn,
        step: 1,
        message: assistant,
      }, { surfaceOp: 'append' })
      assistantMessageId = assistant.id
      assistantEventSeq = event.seq
      source.session.append('step/end', { turn, step: 1 })
      source.session.append('turn/end', { turn, reason: { kind: 'completed' } })
    }
    const expanded = { ...source, assistantMessageId, assistantEventSeq, assistantText }
    await attach(h, expanded)
    const clip = expectClip(await h.ctx.branchmark.create(request(h, expanded, {
      source: {
        kind: 'session-message',
        sessionId: source.session.id,
        messageId: assistantMessageId,
        eventSeq: assistantEventSeq,
        turn: 4,
        role: 'assistant',
        range: {
          start: assistantText.indexOf('parent context'),
          end: assistantText.indexOf('parent context') + 'parent context'.length,
        },
        sessionTitleSnapshot: 'Summary source',
      },
    })))
    const adapter = new StrictSummaryAdapter()
    h.ctx.llm.registerAdapter(['test'], adapter)
    const created = await h.ctx.branchmark.createSideChat({
      workspaceId: h.workspace.id,
      ownerSessionId: source.session.id,
      primaryClipId: clip.id,
      clips: [{ clipId: clip.id, includeNote: false }],
    })
    if (!created.ok) throw new Error(created.error.code)
    const admitted = h.ctx.branchmark.sendSideChat({ id: created.value.id, text: 'Continue.' })
    if (!admitted.ok) throw new Error(admitted.error.code)

    const finished = await settledSideChat(h, created.value.id)
    expect(finished.status).toBe('idle')
    expect(finished.contextWarning).toBeUndefined()
    expect(finished.messages.at(-1)?.text).toBe('Answer after summary preparation.')
    expect(adapter.requests).toHaveLength(2)
    expect(adapter.requests[0]?.messages).toHaveLength(1)
    expect(adapter.requests[0]?.messages[0]).toMatchObject({
      role: 'user',
      content: [{ type: 'text', text: expect.stringContaining('Question 2') }],
    })

    adapter.rejectSummaries = true
    const retry = await h.ctx.branchmark.createSideChat({
      workspaceId: h.workspace.id,
      ownerSessionId: source.session.id,
      primaryClipId: clip.id,
      clips: [{ clipId: clip.id, includeNote: false }],
    })
    if (!retry.ok) throw new Error(retry.error.code)
    const retryAdmitted = h.ctx.branchmark.sendSideChat({ id: retry.value.id, text: 'Continue without summary.' })
    if (!retryAdmitted.ok) throw new Error(retryAdmitted.error.code)
    const degraded = await settledSideChat(h, retry.value.id)
    expect(degraded.status).toBe('idle')
    expect(degraded.contextWarning).toContain('RATE_LIMIT: summary endpoint temporarily unavailable')
    expect(degraded.messages.at(-1)?.text).toBe('Answer after summary preparation.')
  })

  it('switches a Side Chat model independently from its source Session', async () => {
    const h = await harness()
    const source = transcript('side-chat-model-source', h.projectRoot)
    await attach(h, source)
    const clip = expectClip(await h.ctx.branchmark.create(request(h, source)))
    const adapter = new SideChatAdapter()
    h.ctx.llm.registerAdapter(['test'], adapter)
    const created = await h.ctx.branchmark.createSideChat({
      workspaceId: h.workspace.id,
      ownerSessionId: source.session.id,
      primaryClipId: clip.id,
      clips: [{ clipId: clip.id, includeNote: false }],
    })
    if (!created.ok) throw new Error(created.error.code)
    const ready = await settledSideChat(h, created.value.id)
    expect(ready.modelGroups[0]?.models.map(model => model.id)).toEqual(['test', 'alternate'])

    const selected = await h.ctx.branchmark.selectSideChatModel({
      id: created.value.id,
      selection: { provider: 'test', model: 'alternate' },
    })
    if (!selected.ok) throw new Error(selected.error.code)
    expect(selected.value.model).toEqual({ provider: 'test', model: 'alternate' })
    const sent = h.ctx.branchmark.sendSideChat({ id: created.value.id, text: 'Use the alternate model.' })
    if (!sent.ok) throw new Error(sent.error.code)
    await settledSideChat(h, created.value.id)
    expect(adapter.requests.at(-1)?.model).toBe('alternate')
    expect(source.session.requestHeader()?.config.model).toBe('test')
  })
})
