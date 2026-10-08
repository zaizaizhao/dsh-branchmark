/** Keyless Side Chat execution over released DSH services and isolated project files. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { LlmAdapter, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmModelInfo, StreamChunk, ToolCallBlock } from '@deepseek-ai/dsh-llm'
import { attach, createHarness, transcript, type TestHarness } from './helpers.ts'

let h: TestHarness | undefined
afterEach(async () => {
  await h?.dispose()
  h = undefined
})

class ToolFixtureAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []

  constructor(private readonly calls: readonly ToolCallBlock[]) { super() }

  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return [{ provider, id: 'test', name: 'Offline fixture' }]
  }

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    if (this.requests.length === 1) {
      for (const [index, call] of this.calls.entries()) {
        yield { type: 'block-start', index, blockType: 'tool-call' }
        yield { type: 'tool-call-delta', index, id: call.id, name: call.name, argumentsDelta: call.arguments }
        yield { type: 'block-end', index, block: call }
      }
      yield { type: 'finish', reason: { kind: 'tool-calls' } }
      return
    }
    const text = 'Read-only fixture completed.'
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

class AbortFixtureAdapter extends LlmAdapter {
  readonly started = Promise.withResolvers<void>()
  readonly finished = Promise.withResolvers<void>()
  signal?: AbortSignal

  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return [{ provider, id: 'test', name: 'Offline fixture' }]
  }

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const signal = options.signal
    if (signal === undefined) throw new Error('the answer must carry its cancellation signal')
    this.signal = signal
    const aborted = Promise.withResolvers<void>()
    const onAbort = () => aborted.resolve()
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) aborted.resolve()
    try {
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: 'Unfinished fixture response' }
      this.started.resolve()
      await aborted.promise
      yield { type: 'finish', reason: { kind: 'aborted', failure: { code: 'ABORTED', message: 'fixture stopped' } } }
    } finally {
      signal.removeEventListener('abort', onAbort)
      this.finished.resolve()
    }
  }
}

async function setup(adapter: LlmAdapter) {
  h = await createHarness()
  const source = transcript('side-chat-fixture', h.projectRoot)
  await attach(h, source)
  h.ctx.llm.registerAdapter(['test'], adapter)
  const clip = await h.ctx.branchmark.create({
    workspaceId: h.workspace.id, ownerSessionId: source.session.id,
    source: {
      kind: 'session-message', sessionId: source.session.id, messageId: source.assistantMessageId,
      eventSeq: source.assistantEventSeq, turn: 1, role: 'assistant', range: { start: 9, end: 23 },
    },
    excerpt: 'parent context',
  })
  if (!clip.ok) throw new Error(clip.error.code)
  const chat = await h.ctx.branchmark.createSideChat({
    workspaceId: h.workspace.id, ownerSessionId: source.session.id, primaryClipId: clip.value.id,
    clips: [{ clipId: clip.value.id, includeNote: false }],
  })
  if (!chat.ok) throw new Error(chat.error.code)
  return { harness: h, source, id: chat.value.id }
}

describe('Side Chat released tool messages and lifecycle', () => {
  it('returns all five read-only tools as correlated tool-role messages and rejects project escapes and writes', async () => {
    const calls = [
      ['project_read', { path: 'notes.txt' }],
      ['project_list', {}],
      ['project_search', { query: 'needle' }],
      ['web_search', { query: 'fixture' }],
      ['web_fetch', { url: 'https://example.test/fixture' }],
      ['project_read', { path: '../outside.txt' }],
      ['project_write', { path: 'notes.txt', text: 'mutated' }],
    ].map(([name, args], index): ToolCallBlock => ({
      type: 'tool-call', id: ToolCallId(`fixture-call-${index}`), name: String(name), arguments: JSON.stringify(args),
    }))
    const adapter = new ToolFixtureAdapter(calls)
    const { harness, source, id } = await setup(adapter)
    const file = join(harness.projectRoot, 'notes.txt')
    await writeFile(file, 'first line\nneedle in the project\n')
    await writeFile(join(dirname(harness.projectRoot), 'outside.txt'), 'outside material')
    harness.ctx.web.registerSearchProvider({
      id: 'fixture-search', available: () => true,
      search: async () => ({ sources: [{ url: 'https://example.test/fixture', title: 'Fixture source' }], truncated: false }),
    })
    harness.ctx.web.registerFetchProvider({
      id: 'fixture-fetch', available: () => true,
      fetch: async request => ({ url: request.url, statusCode: 200, body: { kind: 'text', content: 'Offline web fixture' }, truncated: false }),
    })
    const original = source.session.snapshotEvents()
    const sessionsBefore = harness.ctx.sessions.list().map(session => session.id)
    expect(harness.ctx.branchmark.sendSideChat({ id, text: 'Run the read-only fixtures.' }).ok).toBe(true)
    await vi.waitFor(() => expect(harness.ctx.branchmark.getSideChat({ id })).toMatchObject({ ok: true, value: { status: 'idle' } }))
    expect(adapter.requests).toHaveLength(2)
    const results = adapter.requests[1]?.messages.filter(message => message.role === 'tool') ?? []
    expect(results.map(message => message.toolCallId)).toEqual(calls.map(call => call.id))
    expect(results.map(message => message.isError === true)).toEqual([false, false, false, false, false, true, true])
    expect(results.map(message => message.content)).toEqual([
      [{ type: 'text', text: 'first line\nneedle in the project\n' }],
      [{ type: 'text', text: expect.stringContaining('notes.txt') }],
      [{ type: 'text', text: expect.stringContaining('needle in the project') }],
      [{ type: 'text', text: expect.stringContaining('Fixture source') }],
      [{ type: 'text', text: expect.stringContaining('Offline web fixture') }],
      [{ type: 'text', text: 'path resolves outside the current project' }],
      [{ type: 'text', text: 'Side Chat does not provide tool "project_write"' }],
    ])
    expect(harness.ctx.branchmark.getSideChat({ id })).toMatchObject({
      ok: true, value: { messages: [
        { role: 'user' },
        { role: 'assistant', tools: calls.map((call, index) => ({ callId: call.id, status: index < 5 ? 'success' : 'error' })) },
        { role: 'assistant', text: 'Read-only fixture completed.' },
      ] },
    })
    expect(await readFile(file, 'utf8')).toBe('first line\nneedle in the project\n')
    expect(source.session.snapshotEvents()).toEqual(original)
    expect(harness.persistence.records.get(source.session.id)?.events).toEqual(original)
    expect(harness.ctx.sessions.list().map(session => session.id)).toEqual(sessionsBefore)
  })

  it.each(['cancel', 'close'] as const)('aborts an in-flight response on %s and releases its adapter before teardown', async action => {
    const adapter = new AbortFixtureAdapter()
    const { harness, source, id } = await setup(adapter)
    const original = source.session.snapshotEvents()
    expect(harness.ctx.branchmark.sendSideChat({ id, text: 'Wait for cancellation.' }).ok).toBe(true)
    await adapter.started.promise
    expect(harness.ctx.branchmark.getSideChat({ id })).toMatchObject({ ok: true, value: { status: 'running', partialText: 'Unfinished fixture response' } })
    if (action === 'cancel') expect(harness.ctx.branchmark.cancelSideChat({ id }).ok).toBe(true)
    else expect(harness.ctx.branchmark.closeSideChat({ id })).toEqual({ ok: true, value: { destroyed: true } })
    await adapter.finished.promise
    expect(adapter.signal?.aborted).toBe(true)
    if (action === 'cancel') {
      await vi.waitFor(() => expect(harness.ctx.branchmark.getSideChat({ id })).toMatchObject({ ok: true, value: { status: 'idle', partialText: '' } }))
      expect(harness.ctx.branchmark.getSideChat({ id })).toMatchObject({ ok: true, value: { messages: [{ role: 'user' }] } })
    } else {
      expect(harness.ctx.branchmark.getSideChat({ id })).toEqual({ ok: false, error: { code: 'side-chat-not-found', id } })
    }
    expect(harness.persistence.records.get(source.session.id)?.events).toEqual(original)
  })
})
