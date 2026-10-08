/** Write synthetic released-format history and Clip records into an isolated smoke home. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, readdir, realpath } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve, join, dirname, basename, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const [runtimeRoot, home, project, provider = 'deepseek', model = 'deepseek-v4-pro'] = process.argv.slice(2)
assert.ok(runtimeRoot && home && project, 'provide the npm runtime, isolated home, and synthetic project')
const require = createRequire(join(resolve(runtimeRoot), 'package.json'))
const sessionApi = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-session')).href)
const llm = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-llm')).href)
const workspacePath = join(home, 'storages', 'workspace.json')
const workspaceData = JSON.parse(await readFile(workspacePath, 'utf8'))
const projectPath = await realpath(project)
assert.ok((await realpath(home)).startsWith((await realpath(tmpdir())) + sep), 'the smoke home must be under the system temporary directory')
const workspace = Object.entries(workspaceData.tables.workspaces).find(([, value]) => value.path === projectPath)
assert.ok(workspace, 'add the synthetic workspace through the real Web UI first')
const [workspaceId, workspaceRecord] = workspace
const id = sessionApi.SessionId('session-branchmark-offline-fixture')
assert.ok(!workspaceRecord.sessionIds.includes(id), 'the fixture already exists')

async function directories(root) {
  const result = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = join(root, entry.name)
    result.push(path, ...await directories(path))
  }
  return result
}
const existing = (await directories(join(home, 'sessions'))).find(path => workspaceRecord.sessionIds.includes(path.split('/').at(-1)))
assert.ok(existing, 'the synthetic workspace needs one persisted Session to establish its storage directory')
const fixtureRoot = join(home, 'fixture-sessions')
const directory = join(fixtureRoot, basename(dirname(existing)), id)
await mkdir(directory, { recursive: true })
// Transcript metadata uses a shipped route; this script never invokes a model or loads credentials.
const route = { provider, model }
const createdAt = Date.now()
const session = sessionApi.Session.create(id, [], {
  version: sessionApi.SESSION_FORMAT_VERSION, id, createdAt, cwd: projectPath, isSeeded: false,
})
session.append('turn/start', { turn: 1 })
session.append('step/start', { turn: 1, step: 1 })
session.append('request/header', { header: { config: route }, reason: 'initial' })
const user = llm.createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text: 'Discuss useful excerpts and conversation branches.' }] })
session.append('user/message', user, { surfaceOp: 'append' })
const text = 'BranchMark saves **useful excerpts**.\n\nBranches keep conversations organized.'
const chunks = [
  { type: 'block-start', index: 0, blockType: 'text' },
  { type: 'text-delta', index: 0, text },
  { type: 'block-end', index: 0, block: { type: 'text', text } },
  { type: 'finish', reason: { kind: 'stop' } },
]
const accumulator = new llm.AssistantStreamAccumulator()
chunks.forEach((chunk, index) => accumulator.push({ time: createdAt + index, chunk }))
const assistant = llm.createAssistantMessage({ source: route, content: [{ type: 'text', text }] })
session.append('assistant/message', { turn: 1, step: 1, message: assistant, stream: accumulator.snapshot() }, { surfaceOp: 'append' })
session.append('step/end', { turn: 1, step: 1 })
session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
session.append('session/title', { title: 'BranchMark offline fixture', source: { kind: 'user' }, messageSeqs: [] })
const rows = []
let oldAssistantSeq
let oldUserSeq
for (const event of session.snapshotEvents()) {
  if (event.type === 'assistant/message') {
    const refs = []
    for (const chunk of chunks) {
      refs.push(rows.length)
      rows.push({ type: 'assistant/chunk', seq: rows.length, time: createdAt + rows.length, data: { turn: 1, step: 1, chunk }, ignorable: true })
    }
    oldAssistantSeq = rows.length
    const { stream, ...data } = event.data
    rows.push({ ...event, seq: rows.length, time: createdAt + rows.length, data, sourceEventSeqs: refs })
  } else {
    if (event.type === 'user/message') oldUserSeq = rows.length
    rows.push({ ...event, seq: rows.length, time: createdAt + rows.length })
  }
}
const header = { type: 'session', version: 1, id, createdAt, cwd: projectPath, delegationDepth: 0 }
const log = [header, ...rows].map(value => JSON.stringify(value)).join('\n') + '\n'
await writeFile(join(directory, 'session.v1.jsonl'), log, { flag: 'wx' })
const clips = {}
for (const [clipId, message, eventSeq, excerpt, scope] of [
  ['old-assistant-clip', assistant, oldAssistantSeq, 'useful excerpts', 'session'],
  ['old-user-clip', user, oldUserSeq, 'conversation branches', 'project'],
]) {
  const start = message.content[0].text.indexOf(excerpt)
  clips[clipId] = {
    id: clipId, workspaceId, ownerSessionId: id, scope,
    source: { kind: 'session-message', sessionId: id, messageId: message.id, eventSeq, turn: 1, role: message.role, range: { start, end: start + excerpt.length }, reopenable: true, forkable: true },
    excerpt, note: 'Preserve this existing note', tags: ['migration'], status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
  }
}
await writeFile(join(home, 'storages', 'clip_explorer.json'), JSON.stringify({ unit: { name: 'clip_explorer', version: 1 }, global: {}, tables: { clips, derived_sessions: {} } }, null, 2) + '\n', { flag: 'wx' })
workspaceRecord.sessionIds.push(id)
await writeFile(workspacePath, JSON.stringify(workspaceData, null, 2) + '\n')
await writeFile(join(home, 'offline-fixture.overlay.yml'), JSON.stringify([{ id: 'session-persistence-jsonl', config: { root: fixtureRoot, compression: 'none' } }], null, 2) + '\n')
await writeFile(join(home, 'offline-fixture.json'), JSON.stringify({ id, workspaceId, oldAssistantSeq, oldUserSeq, logDirectory: directory }, null, 2) + '\n')
console.log('Prepared a released V1 transcript and two saved Clips without invoking a model.')
