import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import SessionStore, {
  SESSION_FORMAT_VERSION, Session, SessionId, type SessionEvent, type SessionHeader,
} from '@deepseek-ai/dsh-session'
import SessionPersistence, {
  SessionPersistenceRevision,
  type SessionInspection,
  type SessionLocation,
  type SessionPersistenceSnapshot,
} from '@deepseek-ai/dsh-session-persistence'
import Storage from '@deepseek-ai/dsh-storage'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import * as StorageJson from '@deepseek-ai/dsh-storage-json'
import WorkspaceRegistry from '@deepseek-ai/dsh-workspace'
import WebRuntime from '@deepseek-ai/dsh-web'
import type { Workspace } from '@deepseek-ai/dsh-workspace/types'
import { BranchMarkService } from '../lib/index.js'

/** Persisted transcript fixture and stable message anchors. */
export interface TranscriptFixture {
  readonly session: Session
  readonly userMessageId: MessageId
  readonly userEventSeq: number
  readonly assistantMessageId: MessageId
  readonly assistantEventSeq: number
  readonly assistantText: string
}

/** Minimal persistence provider whose logical records are controlled by each test. */
export class TestPersistence extends SessionPersistence {
  override readonly supportsRawArtifacts = false
  static inject = ['sessions']

  readonly records = new Map<SessionId, SessionInspection>()

  locate(_meta: SessionHeader): SessionLocation | undefined { return undefined }
  create(_meta: SessionHeader): Promise<void> { return Promise.resolve() }
  append(_id: SessionId, _events: readonly SessionEvent[]): Promise<void> { return Promise.resolve() }

  inspect(id: SessionId): Promise<SessionInspection> {
    const record = this.records.get(id)
    return record === undefined
      ? Promise.reject(new Error(`test persistence: session '${id}' not found`))
      : Promise.resolve(record)
  }

  load(id: SessionId): Promise<SessionInspection> {
    return this.inspect(id)
  }

  readFrom(id: SessionId, fromSeq: number): Promise<SessionInspection> {
    const record = this.records.get(id)
    return record === undefined
      ? Promise.reject(new Error(`test persistence: session '${id}' not found`))
      : Promise.resolve({ meta: record.meta, events: record.events.filter(event => event.seq >= fromSeq) })
  }

  list(): Promise<SessionHeader[]> {
    return Promise.resolve([...this.records.values()].map(record => record.meta))
  }

  listSnapshots(): Promise<SessionPersistenceSnapshot[]> {
    return Promise.resolve([...this.records.values()].map((record, index) => ({
      header: record.meta,
      revision: SessionPersistenceRevision(`test:${String(index)}:${String(record.events.length)}`),
    })))
  }

  persist(session: Session): void {
    this.records.set(session.id, { meta: session.header, events: session.events })
  }

  set(record: SessionInspection): void {
    this.records.set(record.meta.id, record)
  }
}

export interface TestHarness {
  readonly ctx: Context
  readonly persistence: TestPersistence
  readonly workspace: Workspace
  readonly projectRoot: string
  dispose(): Promise<void>
}

/** Compose BranchMark over real DSH Session, Workspace, and JSON storage services. */
export async function createHarness(): Promise<TestHarness> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-branchmark-test-'))
  const projectRoot = join(root, 'project')
  const storageRoot = join(root, 'storage')
  await mkdir(projectRoot)
  const ctx = new Context()
  try {
    await ctx.plugin(SessionStore)
    await ctx.plugin(LlmRuntime)
    ctx.provide('fs', {} as never)
    await ctx.plugin(WebRuntime, {})
    await ctx.plugin(TestPersistence)
    await ctx.plugin(Storage)
    await ctx.plugin(StorageJson, { root: storageRoot })
    await ctx.plugin(StorageDomain, { backend: 'json' })
    await ctx.plugin(WorkspaceRegistry)
    const workspace = await ctx.workspaceRegistry.create(projectRoot)
    await ctx.plugin(BranchMarkService, {
      maxExcerptBytes: 1024,
      maxNoteBytes: 256,
      maxTagsPerClip: 8,
      maxTagBytes: 32,
      recentContextMessages: 4,
      summaryProvider: '',
      summaryModel: '',
      summaryMaxTokens: 256,
      answerMaxTokens: 1024,
      maxToolRounds: 3,
      maxToolOutputChars: 4096,
      maxReadChars: 8192,
      maxSearchFiles: 50,
    })
    return {
      ctx,
      persistence: ctx.sessionPersistence as TestPersistence,
      workspace,
      projectRoot,
      async dispose() {
        await ctx.fiber.dispose()
        await rm(root, { recursive: true, force: true })
      },
    }
  } catch (error) {
    await ctx.fiber.dispose()
    await rm(root, { recursive: true, force: true })
    throw error
  }
}

/** Create and persist one normal message turn, optionally leaving it open. */
export function transcript(
  id: string,
  cwd: string,
  complete = true,
): TranscriptFixture {
  const sessionId = SessionId(id)
  const header: SessionHeader = {
    version: SESSION_FORMAT_VERSION,
    id: sessionId,
    createdAt: 1_700_000_000_000,
    cwd,
  }
  const session = Session.create(sessionId, [], header)
  session.append('request/header', {
    header: { config: { provider: 'test', model: 'test' } },
    reason: 'initial',
  })
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  const user = createUserMessage({
    content: [{ type: 'text', text: 'How should this work?' }],
    source: { kind: 'user' },
  })
  const userEvent = session.append('user/message', user, { surfaceOp: 'append' })
  const assistantText = 'Keep the parent context, then branch at this complete turn.'
  const assistant = createAssistantMessage({
    content: [{ type: 'text', text: assistantText }],
    source: { provider: 'test', model: 'test' },
  })
  const assistantEvent = session.append('assistant/message', {
    turn: 1,
    step: 1,
    message: assistant,
  }, { surfaceOp: 'append' })
  if (complete) {
    session.append('step/end', { turn: 1, step: 1 })
    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  }
  return {
    session,
    userMessageId: user.id,
    userEventSeq: userEvent.seq,
    assistantMessageId: assistant.id,
    assistantEventSeq: assistantEvent.seq,
    assistantText,
  }
}

/** Persist and attach a transcript to the harness Workspace. */
export async function attach(harness: TestHarness, fixture: TranscriptFixture): Promise<void> {
  harness.persistence.persist(fixture.session)
  await harness.workspace.attachSession(fixture.session.id)
}
