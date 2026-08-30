import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type {
  ClientContext, ConversationSnapshot, SessionId, SessionSummary, WorkspaceId,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { Clip, ClipId, SideChatId, SideChatSnapshot } from 'dsh-branchmark-host/types'
import type { BranchMarkUiPreferences, ClipSelectionCandidate } from '../src/domain/controller.ts'
import {
  BRANCHMARK_DOCK_MAX_WIDTH, BRANCHMARK_DOCK_MIN_WIDTH, BranchMarkUiController,
} from '../src/domain/controller.ts'
import {
  BRANCHMARK_REFERENCE_SOURCE,
  clipReferenceInsert,
  createBranchMarkInputTriggerSource,
  parseClipReference,
} from '../src/domain/composer-reference.ts'
import { deriveCurrentLineage } from '../src/domain/lineage.ts'
import { selectionCandidate } from '../src/domain/selection.ts'
import { BranchMarkClient } from '../src/domain/client.ts'
import { BranchMarkDrawerButton, BranchMarkSidebarButton } from '../src/components/EntryButtons.tsx'
import { SideChatPrimaryAction } from '../src/components/SideChat.tsx'
import { referenceRemovalDrafts } from '../src/domain/reference-removal.ts'
import { selectionCreateRequests, selectionToolbarPosition } from '../src/domain/selection-actions.ts'
import { SelectionActions } from '../src/components/SelectionActions.tsx'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  IconArchiveOutline20: () => null,
  IconBranchOutline16: () => null,
  IconCloseOutline16: () => null,
}))

const workspaceId = 'workspace-1' as WorkspaceId
const sessionId = 'session-1' as SessionId
const clipId = 'clip-1' as ClipId

function clip(): Clip {
  return {
    id: clipId,
    workspaceId,
    ownerSessionId: sessionId,
    scope: 'session',
    source: {
      kind: 'session-message',
      sessionId,
      messageId: 'message-1' as MessageId,
      eventSeq: 3,
      turn: 1,
      role: 'assistant',
      range: { start: 0, end: 5 },
      reopenable: true,
      forkable: true,
    },
    excerpt: 'alpha',
    note: 'remember this',
    tags: ['design'],
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function sideChat(id: string): SideChatSnapshot {
  return {
    id: id as SideChatId,
    workspaceId,
    ownerSessionId: sessionId,
    primaryClipId: clipId,
    clips: [clip()],
    model: { provider: 'test', model: 'test' },
    modelGroups: [],
    modelFailures: [],
    modelCatalogStatus: 'ready',
    messages: [],
    status: 'idle',
    partialText: '',
    partialReasoning: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function sessionSummary(id: string, parentId?: SessionId): SessionSummary {
  return {
    id: id as SessionId,
    displayTitle: id,
    ...(parentId === undefined ? {} : { parentId }),
    running: false,
    blank: false,
    updatedAt: 0,
  }
}

describe('BranchMark browser domain', () => {
  it('keeps Clip card controls from invoking the browser stop() global', () => {
    const source = readFileSync(new URL('../src/components/ClipCard.tsx', import.meta.url), 'utf8')
    expect(source).not.toContain('onClick={stop}')
  })

  it('keeps the full Clip out of the visible native Composer reference', () => {
    const reference = clipReferenceInsert(clip(), true)
    expect(reference).toMatchObject({
      source: BRANCHMARK_REFERENCE_SOURCE,
      label: '枝签 · alpha',
      appearance: 'session',
      clipboardText: `@branchmark:${clipId}`,
    })
    expect(reference.label).not.toContain('remember this')
    expect(parseClipReference(reference.ref)).toEqual({
      version: 1,
      workspaceId,
      ownerSessionId: sessionId,
      clipId,
      includeNote: true,
    })
  })

  it('inserts a Clip through the native reference table without replacing the Composer draft', () => {
    const insertReference = vi.fn().mockReturnValue(true)
    const setDraft = vi.fn()
    const scoped = {} as ClientContext
    const context = {
      sessions: { scope: () => scoped },
      conversation: {
        input: {
          for: () => ({
            state: { getSnapshot: () => ({ draft: 'What follows?', draftRev: 7, occurrences: [] }) },
            insertReference,
            setDraft,
          }),
        },
      },
    } as unknown as ClientContext
    const client = new BranchMarkClient(context)
    expect(client.attachClipToComposer(sessionId, clip(), true)).toBe('inserted')
    expect(insertReference).toHaveBeenCalledWith(
      expect.objectContaining({ source: BRANCHMARK_REFERENCE_SOURCE, label: '枝签 · alpha' }),
      { start: 0, end: 0, draftRev: 7 },
    )
    expect(setDraft).not.toHaveBeenCalled()
  })

  it('does not insert the same Clip reference twice', () => {
    const reference = clipReferenceInsert(clip(), true)
    const insertReference = vi.fn()
    const scoped = {} as ClientContext
    const context = {
      sessions: { scope: () => scoped },
      conversation: {
        input: {
          for: () => ({
            state: {
              getSnapshot: () => ({
                draft: '@枝签 · alpha ',
                draftRev: 3,
                occurrences: [{ source: BRANCHMARK_REFERENCE_SOURCE, ref: reference.ref }],
              }),
            },
            insertReference,
          }),
        },
      },
    } as unknown as ClientContext
    const client = new BranchMarkClient(context)
    expect(client.attachClipToComposer(sessionId, clip(), true)).toBe('duplicate')
    expect(insertReference).not.toHaveBeenCalled()
  })

  it('serializes a native reference to the current Clip and optional note only at submit time', async () => {
    const list = vi.fn(async (request: { visibility: string }) => ({
      clips: request.visibility === 'session-drawer' ? [clip()] : [],
      tags: [],
    }))
    const client = { list } as unknown as BranchMarkClient
    const source = createBranchMarkInputTriggerSource(client)
    const withNote = clipReferenceInsert(clip(), true)
    const withoutNote = clipReferenceInsert(clip(), false)
    await expect(source.codec?.serialize(withNote.ref, new AbortController().signal)).resolves.toMatch(
      /alpha[\s\S]*remember this/u,
    )
    await expect(source.codec?.serialize(withoutNote.ref, new AbortController().signal)).resolves.not.toContain(
      'remember this',
    )
    expect(list).toHaveBeenCalledWith({
      workspaceId,
      ownerSessionId: sessionId,
      visibility: 'session-drawer',
    })
  })

  it('renders the Composer entry as a compact counted reference control', () => {
    const reference = clipReferenceInsert(clip(), true)
    const html = renderToStaticMarkup(createElement(BranchMarkDrawerButton, {
      sessionId,
      input: {
        draft: '@枝签 · alpha ',
        occurrences: [{
          occurrenceId: 1,
          source: BRANCHMARK_REFERENCE_SOURCE,
          ref: reference.ref,
          label: reference.label,
          offset: 0,
          length: reference.label.length + 1,
        }],
      },
      inputActions: { setDraft: vi.fn() },
      controller: new BranchMarkUiController(),
      client: { workspaceForSession: () => workspaceId },
    } as never))
    expect(html).toContain('引用枝签')
    expect(html).toContain('<b>1</b>')
    expect(html).not.toContain('remember this')
  })

  it('removes one of several common-prefix references without declassifying its neighbor', () => {
    const labels = ['@枝签 · Alpha', '@枝签 · Beta', '@枝签 · Gamma']
    let draft = `${labels.join(' ')} `
    let offset = 0
    let occurrences = labels.map((label, index) => {
      const occurrence = { id: index + 1, offset, length: label.length }
      offset += label.length + 1
      return occurrence
    })
    const target = occurrences[1]!
    const diff = (previous: string, next: string) => {
      let start = 0
      const maxCommon = Math.min(previous.length, next.length)
      while (start < maxCommon && previous[start] === next[start]) start += 1
      let suffix = 0
      const maxSuffix = maxCommon - start
      while (suffix < maxSuffix && previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix += 1
      return { start, end: previous.length - suffix, insertedLength: next.length - suffix - start }
    }
    for (const next of referenceRemovalDrafts(draft, target)) {
      const range = diff(draft, next)
      const delta = range.insertedLength - (range.end - range.start)
      occurrences = occurrences.flatMap(occurrence => {
        if (occurrence.offset + occurrence.length <= range.start) return [occurrence]
        if (occurrence.offset >= range.end) return [{ ...occurrence, offset: occurrence.offset + delta }]
        return []
      })
      draft = next
    }
    expect(occurrences.map(occurrence => occurrence.id)).toEqual([1, 3])
    expect(draft).toBe(`${labels[0]} ${labels[2]} `)
  })

  it('renders the global Clip library entry with the same row-level navigation geometry as Settings', () => {
    const html = renderToStaticMarkup(createElement(BranchMarkSidebarButton, {
      wide: true,
      useSessions: (selector: (value: { current: SessionId }) => unknown) => selector({ current: sessionId }),
      useWorkspaces: (selector: (value: { recentWorkspaceId: WorkspaceId }) => unknown) => selector({ recentWorkspaceId: workspaceId }),
      controller: new BranchMarkUiController(),
      client: { currentWorkspace: () => workspaceId },
    } as never))
    expect(html).toContain('class="dbm-sidebar-nav-row"')
    expect(html).toContain('枝签')
  })

  it('maps every selection action to its explicit durable Clip scope', () => {
    const candidate: ClipSelectionCandidate = {
      workspaceId,
      ownerSessionId: sessionId,
      source: {
        kind: 'session-message',
        sessionId,
        messageId: 'message-selection' as MessageId,
        eventSeq: 8,
        turn: 3,
        role: 'assistant',
        range: { start: 4, end: 9 },
      },
      excerpt: 'alpha',
      rect: { left: 20, top: 30, width: 50, height: 18 },
    }
    expect(selectionCreateRequests([candidate], 'save-session')).toEqual([
      expect.objectContaining({ scope: 'session', excerpt: 'alpha' }),
    ])
    expect(selectionCreateRequests([candidate], 'save-project')).toEqual([
      expect.objectContaining({ scope: 'project', excerpt: 'alpha' }),
    ])
    expect(selectionCreateRequests([candidate], 'side-chat')).toEqual([
      expect.objectContaining({ scope: 'session' }),
    ])
    expect(selectionCreateRequests([candidate], 'reference')).toEqual([
      expect.objectContaining({ scope: 'session' }),
    ])
  })

  it('keeps the measured selection toolbar inside the viewport and moves it below a top-edge selection', () => {
    const candidate: ClipSelectionCandidate = {
      workspaceId,
      ownerSessionId: sessionId,
      source: {
        kind: 'session-message',
        sessionId,
        messageId: 'message-position' as MessageId,
        eventSeq: 1,
        turn: 1,
        role: 'assistant',
        range: { start: 0, end: 5 },
      },
      excerpt: 'alpha',
      rect: { left: 2, top: 2, width: 30, height: 18 },
    }
    expect(selectionToolbarPosition(
      [candidate],
      { width: 470, height: 40 },
      { width: 800, height: 600 },
    )).toEqual({ left: 10, top: 28, placement: 'below' })
    expect(selectionToolbarPosition(
      [{ ...candidate, rect: { left: 780, top: 200, width: 18, height: 18 } }],
      { width: 470, height: 40 },
      { width: 800, height: 600 },
    )).toEqual({ left: 320, top: 152, placement: 'above' })
  })

  it('renders the four explicit selection actions in workflow order', () => {
    const html = renderToStaticMarkup(createElement(SelectionActions, {
      disabled: false,
      onSaveSession: vi.fn(),
      onSaveProject: vi.fn(),
      onSideChat: vi.fn(),
      onReference: vi.fn(),
    }))
    expect(html).toContain('>摘录到会话</button>')
    expect(html).toContain('>摘录到项目</button>')
    expect(html).toContain('>Ask in side</button>')
    expect(html).toContain('>引用到输入框</button>')
    expect(html.indexOf('摘录到会话')).toBeLessThan(html.indexOf('摘录到项目'))
    expect(html.indexOf('摘录到项目')).toBeLessThan(html.indexOf('Ask in side'))
    expect(html.indexOf('Ask in side')).toBeLessThan(html.indexOf('引用到输入框'))
    expect(html).not.toContain('<svg')
  })

  it('renders Side Chat send and stop as DSH Composer-style icon-only primary actions', () => {
    const send = renderToStaticMarkup(createElement(SideChatPrimaryAction, {
      mode: 'send',
      disabled: true,
      onClick: vi.fn(),
    }))
    const stop = renderToStaticMarkup(createElement(SideChatPrimaryAction, {
      mode: 'stop',
      onClick: vi.fn(),
    }))
    expect(send).toContain('class="dbm-side-primary"')
    expect(send).toContain('aria-label="发送消息"')
    expect(send).toContain('disabled=""')
    expect(send).not.toContain('>发送<')
    expect(stop).toContain('aria-label="停止生成"')
    expect(stop).not.toContain('>停止<')
  })

  it('keeps derived-Session Composers clean and sends only the user question through Session.prompt', async () => {
    const firstDerived = 'derived-open' as SessionId
    const secondDerived = 'derived-send' as SessionId
    const create = vi.fn()
      .mockResolvedValueOnce(firstDerived)
      .mockResolvedValueOnce(secondDerived)
    const open = vi.fn()
    const setDraft = vi.fn()
    const conversationSend = vi.fn().mockResolvedValue(undefined)
    const prompt = vi.fn().mockResolvedValue({ ok: true, value: { accepted: true } })
    const recordDerivedSession = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        ok: true,
        value: {
          relation: {},
          usages: [],
        },
      },
    })
    const context = {
      sessions: {
        create,
        open,
        scope: () => ({ conversation: { send: conversationSend } }),
        binding: () => ({ session: { prompt } }),
      },
      conversation: {
        input: {
          for: () => ({ setDraft }),
        },
      },
      remote: { branchmark: { recordDerivedSession } },
    } as unknown as ClientContext
    const client = new BranchMarkClient(context)
    const input = {
      workspaceId,
      clips: [clip()],
      mode: 'clips-only' as const,
      includeNotes: new Set<ClipId>([clipId]),
    }

    await expect(client.launch(input)).resolves.toEqual({ sessionId: firstDerived })
    expect(open).toHaveBeenCalledWith(firstDerived)
    expect(setDraft).not.toHaveBeenCalled()

    await expect(client.launch({ ...input, question: 'What follows?' })).resolves.toEqual({
      sessionId: secondDerived,
    })
    expect(prompt).toHaveBeenCalledWith([{ type: 'text', text: 'What follows?' }], 'queue')
    expect(conversationSend).not.toHaveBeenCalled()
  })

  it('keeps several temporary Side Chats in the Dock, activates tabs, and removes them', () => {
    const controller = new BranchMarkUiController()
    const first = sideChat('side-1')
    const second = sideChat('side-2')
    controller.upsertSideChat(first, true)
    controller.upsertSideChat(second, true)
    expect(controller.getSnapshot().dock).toMatchObject({ mode: 'expanded', view: 'side-chat' })
    expect(controller.getSnapshot().sideChats).toMatchObject({ activeId: second.id })
    expect(controller.getSnapshot().sideChats.tabs).toHaveLength(2)
    controller.activateSideChat(first.id)
    expect(controller.getSnapshot().sideChats).toMatchObject({ activeId: first.id })
    controller.removeSideChat(first.id)
    expect(controller.getSnapshot().sideChats.activeId).toBe(second.id)
    controller.removeSideChat(second.id)
    expect(controller.getSnapshot().sideChats.tabs).toEqual([])
  })

  it('persists Dock view, visibility, and bounded width without persisting Clip content', () => {
    const writes: BranchMarkUiPreferences[] = []
    const controller = new BranchMarkUiController({
      read: () => undefined,
      write: value => { writes.push(value) },
    })
    expect(controller.getSnapshot().dock).toMatchObject({ mode: 'rail', view: 'session', width: 430 })
    controller.openDock('project')
    expect(controller.getSnapshot().dock).toMatchObject({ mode: 'expanded', view: 'project' })
    controller.setDockWidth(10_000)
    expect(controller.getSnapshot().dock.width).toBe(BRANCHMARK_DOCK_MAX_WIDTH)
    controller.setDockWidth(1)
    expect(controller.getSnapshot().dock.width).toBe(BRANCHMARK_DOCK_MIN_WIDTH)
    controller.collapseDock()
    expect(controller.getSnapshot().dock.mode).toBe('rail')
    controller.hideDock()
    expect(controller.getSnapshot().dock.mode).toBe('hidden')
    controller.reopenDock()
    expect(controller.getSnapshot().dock).toMatchObject({ mode: 'expanded', view: 'project' })
    expect(writes.at(-1)).toEqual({ mode: 'expanded', view: 'project', width: BRANCHMARK_DOCK_MIN_WIDTH })
    expect(writes.some(value => Object.hasOwn(value, 'clips'))).toBe(false)
  })

  it('projects the current Session lineage in stable pre-order with inherited branch colors', () => {
    const root = sessionSummary('root')
    const childA = sessionSummary('child-a', root.id)
    const grandchild = sessionSummary('grandchild', childA.id)
    const childB = sessionSummary('child-b', root.id)
    const unrelated = sessionSummary('unrelated')
    const sessions = [root, childA, grandchild, childB, unrelated]
    const byId = Object.fromEntries(sessions.map(session => [session.id, session])) as Record<SessionId, SessionSummary>
    const rows = deriveCurrentLineage(
      [root.id, childA.id, grandchild.id, childB.id, unrelated.id],
      byId,
      grandchild.id,
    )
    expect(rows.map(row => [row.session.id, row.depth])).toEqual([
      [root.id, 0],
      [childA.id, 1],
      [grandchild.id, 2],
      [childB.id, 1],
    ])
    expect(rows[0]?.branch).toBeNull()
    expect(rows[1]?.branch).not.toBeNull()
    expect(rows[2]?.branch).toBe(rows[1]?.branch)
  })

  it('maps a visible completed DSH Chat node to the persisted message anchor and exact range', () => {
    const messageId = 'message-7' as MessageId
    const snapshot = {
      chat: {
        nodes: new Map([['node-1', {
          key: 'node-1',
          kind: 'user',
          id: messageId,
          visibility: 'visible',
          location: { kind: 'turn', turn: { turn: 4 } },
          data: { seq: 11, content: [{ type: 'text', text: 'alpha beta alpha' }] },
        }]]),
      },
    } as unknown as ConversationSnapshot
    const candidate = selectionCandidate({
      workspaceId,
      sessionId,
      snapshot,
      nodeKey: 'node-1',
      excerpt: 'alpha',
      approximateOffset: 12,
      rect: { left: 1, top: 2, width: 3, height: 4 },
    })
    expect(candidate).toMatchObject({
      excerpt: 'alpha',
      source: {
        kind: 'session-message',
        messageId,
        eventSeq: 11,
        turn: 4,
        role: 'user',
        range: { start: 11, end: 16 },
      },
    })
  })

  it('maps a rendered Markdown selection back to its exact durable source slice', () => {
    const messageId = 'message-markdown' as MessageId
    const markdown = 'Read the [official guide](https://example.com/guide) before continuing.'
    const snapshot = {
      chat: {
        nodes: new Map([['node-markdown', {
          key: 'node-markdown',
          kind: 'assistant-step',
          id: messageId,
          visibility: 'visible',
          location: { kind: 'turn', turn: { turn: 5 } },
          data: {
            status: 'settled',
            turn: 5,
            blocks: [{ kind: 'text', text: markdown }],
            finalNode: { messageId, seq: 13 },
          },
        }]]),
      },
    } as unknown as ConversationSnapshot
    const candidate = selectionCandidate({
      workspaceId,
      sessionId,
      snapshot,
      nodeKey: 'node-markdown',
      excerpt: 'Read the official guide before continuing.',
      approximateOffset: 0,
      rect: { left: 1, top: 2, width: 3, height: 4 },
    })
    const raw = 'Read the [official guide](https://example.com/guide) before continuing.'
    expect(candidate).toMatchObject({
      excerpt: raw,
      source: { range: { start: 0, end: raw.length } },
    })
  })

  it('maps a long DOM selection even when adjacent Markdown blocks contribute no whitespace', () => {
    const messageId = 'message-long-markdown' as MessageId
    const markdown = 'First paragraph.\n\nSecond paragraph with **bold** text.'
    const snapshot = {
      chat: {
        nodes: new Map([['node-long-markdown', {
          key: 'node-long-markdown',
          kind: 'assistant-step',
          id: messageId,
          visibility: 'visible',
          location: { kind: 'turn', turn: { turn: 6 } },
          data: {
            status: 'settled',
            turn: 6,
            blocks: [{ kind: 'text', text: markdown }],
            finalNode: { messageId, seq: 15 },
          },
        }]]),
      },
    } as unknown as ConversationSnapshot
    const candidate = selectionCandidate({
      workspaceId,
      sessionId,
      snapshot,
      nodeKey: 'node-long-markdown',
      excerpt: 'First paragraph.Second paragraph with bold text.',
      approximateOffset: 0,
      rect: { left: 1, top: 2, width: 3, height: 4 },
    })
    expect(candidate).toMatchObject({
      excerpt: markdown,
      source: { range: { start: 0, end: markdown.length } },
    })
  })
})
