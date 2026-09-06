// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { Clip, ClipId, DerivedSessionRelation } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../src/domain/client.ts'
import { BranchMarkUiController } from '../src/domain/controller.ts'
import { ClipCollection } from '../src/components/clips/ClipCollection.tsx'
import { BranchMarkLauncherSheet } from '../src/components/launcher/BranchMarkLauncher.tsx'
import { SessionTree } from '../src/components/lineage/SessionTree.tsx'
import { LineageView } from '../src/components/lineage/LineageView.tsx'
import { BranchMarkTextContext } from '../src/components/shared/text.ts'
import { useDockEscape } from '../src/components/shared/useDockEscape.ts'
import { zh } from '../src/locales/zh.ts'
import { en } from '../src/locales/en.ts'
import { deriveCurrentLineage } from '../src/domain/lineage.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => {
  const icon = () => createElement('svg', { 'aria-hidden': true })
  return {
    IconBranchOutline16: icon,
    IconChevronDownOutline14: icon,
    IconCloseOutline16: icon,
    IconEditOutline16: icon,
    IconEllipsisOutline16: icon,
    IconFullscreenOutline16: icon,
    IconPaperclipOutline16: icon,
    IconSparkle16: icon,
    IconTrashOutline16: icon,
    IconSearchOutline16: icon,
    IconListPenOutline16: icon,
    MarkdownText: ({ text }: { text: string }) => createElement('p', null, text),
    Modal: ({
      open,
      title,
      children,
      footer,
    }: {
      open: boolean
      title: string
      children: ReactNode
      footer: ReactNode
    }) => (open ? createElement('section', { role: 'dialog', 'aria-label': title }, children, footer) : null),
    Menu: ({
      open,
      anchor,
      items,
      onSelect,
    }: {
      open: boolean
      anchor: ReactNode
      items: { id: string; label?: ReactNode }[]
      onSelect(id: string): void
    }) =>
      createElement(
        'div',
        null,
        anchor,
        open &&
          createElement(
            'div',
            { role: 'menu' },
            items
              .filter((item) => item.label !== undefined)
              .map((item) =>
                createElement(
                  'button',
                  { key: item.id, type: 'button', onClick: () => onSelect(item.id) },
                  item.label,
                ),
              ),
          ),
      ),
  }
})

const workspaceId = 'workspace-ui' as WorkspaceId
const sourceId = 'source-ui' as SessionId
let root: Root
let container: HTMLDivElement

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function clip(id: string, ownerSessionId = sourceId): Clip {
  return {
    id: id as ClipId,
    workspaceId,
    ownerSessionId,
    scope: 'session',
    source: { kind: 'temporary-answer', role: 'assistant', reopenable: false, forkable: false },
    excerpt: `Excerpt ${id}`,
    note: `Note ${id}`,
    tags: ['architecture'],
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  }
}

function translate(dictionary: Record<keyof typeof zh, string>) {
  return (key: string, params?: Record<string, unknown>) =>
    (dictionary[key as keyof typeof zh] ?? key).replace(/\{(\w+)\}/gu, (_, name: string) =>
      String(params?.[name] ?? ''),
    )
}

async function render(element: ReactNode, dictionary: Record<keyof typeof zh, string> = zh) {
  await act(async () => {
    root.render(createElement(BranchMarkTextContext.Provider, { value: translate(dictionary) }, element))
  })
}

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find(
    (element) => element.textContent === label || element.getAttribute('aria-label') === label,
  )
  if (found === undefined) throw new Error(`Missing button: ${label}`)
  return found
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click()
  })
}

function clientWith(clips: readonly Clip[]) {
  return {
    list: vi.fn(async (request: { visibility: string }) => ({
      clips: request.visibility.endsWith('trash') ? [] : clips,
      tags: ['architecture'],
    })),
    relations: vi.fn(async () => ({ relations: [], usages: [], sessions: [] })),
    attachClipToComposer: vi.fn(() => 'inserted' as const),
    launch: vi.fn(async () => ({ sessionId: 'child-ui' as SessionId })),
    sessionTitle: () => 'Parent session',
    openSession: vi.fn(),
  }
}

describe('BranchMark collection and branch UI', () => {
  it('gives Escape to dialogs and sorting before closing the launcher or Dock', async () => {
    const controller = new BranchMarkUiController()
    const collapse = vi.spyOn(controller, 'collapseDock')
    const close = vi.spyOn(controller, 'closeLauncher')
    function Probe({ launcherOpen }: { launcherOpen: boolean }) {
      useDockEscape(controller, launcherOpen)
      return null
    }
    await render(createElement(Probe, { launcherOpen: true }))
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    container.append(dialog)
    const dismiss = () => {
      dialog.remove()
    }
    document.addEventListener('keydown', dismiss)
    try {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      expect(dialog.isConnected).toBe(false)
      expect(close).not.toHaveBeenCalled()
      expect(collapse).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('keydown', dismiss)
      dialog.remove()
    }
    container.dataset.dragging = 'true'
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(close).not.toHaveBeenCalled()
    delete container.dataset.dragging
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(close).toHaveBeenCalledOnce()
    await render(createElement(Probe, { launcherOpen: false }))
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(collapse).toHaveBeenCalledOnce()
  })

  it('opens persisted blank nodes omitted by the native list and disables missing nodes', async () => {
    const blank = 'saved-blank' as SessionId
    const missing = 'missing-blank' as SessionId
    const relations: DerivedSessionRelation[] = [blank, missing].map((derivedSessionId) => ({
      derivedSessionId,
      workspaceId,
      parentSessionId: sourceId,
      mode: 'blank',
      attachedClipIds: [],
      createdAt: '2026-09-01',
    }))
    const client = {
      workspaceForSession: () => workspaceId,
      relations: vi.fn(async () => ({
        relations,
        usages: [],
        sessions: [
          { sessionId: blank, title: 'Saved blank', available: true },
          { sessionId: missing, available: false },
        ],
      })),
      openRelatedSession: vi.fn(async () => {}),
    }
    await render(
      createElement(LineageView, {
        ids: [sourceId],
        byId: {
          [sourceId]: { id: sourceId, displayTitle: 'Root', running: false, blank: false, updatedAt: 0 },
        },
        current: sourceId,
        workspaceId,
        client: client as unknown as BranchMarkClient,
        controller: new BranchMarkUiController(),
      }),
    )
    expect(container.querySelectorAll('.dbm-tree-node')).toHaveLength(3)
    expect(client.relations).toHaveBeenCalledWith({ workspaceId, includeSessions: true })
    await click(button('打开会话：Saved blank'))
    expect(client.openRelatedSession).toHaveBeenCalledWith(blank, workspaceId)
    expect(button('打开会话：未命名会话').disabled).toBe(true)
    expect(container.textContent).toContain('会话不可用')
    await render(
      createElement(LineageView, {
        ids: [],
        byId: {},
        current: undefined,
        workspaceId,
        client: client as unknown as BranchMarkClient,
        controller: new BranchMarkUiController(),
      }),
    )
    expect(container.querySelectorAll('.dbm-tree-node')).toHaveLength(2)
    expect(container.querySelector('.dbm-tree-current')).toBeNull()
    await click(button('打开会话：Saved blank'))
    expect(client.openRelatedSession).toHaveBeenCalledTimes(2)
  })

  it('shows batch actions only for multiple selection and keeps quote clicks out of selection', async () => {
    const client = clientWith([clip('one'), clip('two')])
    const controller = new BranchMarkUiController()
    await render(
      createElement(ClipCollection, {
        mode: 'session',
        workspaceId,
        sessionId: sourceId,
        client: client as unknown as BranchMarkClient,
        controller,
      }),
    )
    const checkboxes = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    expect(checkboxes).toHaveLength(2)
    expect(container.querySelector('.dbm-batch-toolbar')).toBeNull()
    await click(checkboxes[0]!)
    expect(container.querySelector('.dbm-batch-toolbar')).toBeNull()
    await click(button('引用'))
    expect(client.attachClipToComposer).toHaveBeenCalledOnce()
    expect(checkboxes[0]?.checked).toBe(true)
    expect(checkboxes[1]?.checked).toBe(false)
    await click(checkboxes[1]!)
    expect(container.querySelector('.dbm-batch-toolbar')?.textContent).toContain('已选择 2 枚')
    expect(container.querySelectorAll('.dbm-card-actions')).toHaveLength(2)
    expect(container.querySelector('.dbm-trash-toggle')?.closest('.dbm-search')).toBeNull()
    expect(container.querySelector('.dbm-trash-toggle b')).toBeNull()
    await click(button('回收站'))
    expect(container.querySelector('.dbm-batch-toolbar')).toBeNull()
    expect(container.textContent).toContain('回收站为空')
    expect(container.textContent).toContain('随时可以恢复')
    expect(container.querySelector('.dbm-trash-toggle')?.getAttribute('aria-pressed')).toBe('true')
    await click(button('返回枝签'))
    expect(container.querySelectorAll('article')).toHaveLength(2)
  })

  it('clears private content immediately on scope changes and ignores late reads', async () => {
    const nextSession = 'next-session' as SessionId
    const oldRead = Promise.withResolvers<{ clips: readonly Clip[]; tags: readonly string[] }>()
    const client = clientWith([])
    client.list.mockImplementation((request) =>
      request.visibility.endsWith('trash') ? Promise.resolve({ clips: [], tags: [] }) : oldRead.promise,
    )
    const props = {
      mode: 'session' as const,
      workspaceId,
      sessionId: sourceId,
      client: client as unknown as BranchMarkClient,
      controller: new BranchMarkUiController(),
    }
    await render(createElement(ClipCollection, props))
    client.list.mockImplementation(async (request) => ({
      clips: request.visibility.endsWith('trash') ? [] : [clip('new', nextSession)],
      tags: [],
    }))
    await render(createElement(ClipCollection, { ...props, sessionId: nextSession }))
    expect(container.textContent).toContain('Excerpt new')
    await act(async () => {
      oldRead.resolve({ clips: [clip('old')], tags: [] })
      await oldRead.promise
    })
    expect(container.textContent).not.toContain('Excerpt old')
    expect(container.querySelectorAll('article')).toHaveLength(1)
  })

  it('opens a blank branch without exposing selected excerpts and responds to locale changes', async () => {
    const client = clientWith([clip('private')])
    const controller = new BranchMarkUiController()
    const launcher = {
      intent: 'session' as const,
      workspaceId,
      sourceSessionId: sourceId,
      clips: [clip('private')],
    }
    const element = createElement(BranchMarkLauncherSheet, {
      launcher,
      client: client as unknown as BranchMarkClient,
      controller,
    })
    await render(element)
    const blank = [...container.querySelectorAll('label')].find((label) =>
      label.textContent?.includes('空白分支'),
    )!
    await click(blank.querySelector('input')!)
    expect(container.textContent).toContain('新会话将从空白开始')
    expect(container.textContent).not.toContain('Excerpt private')
    expect(container.textContent).not.toContain('Note private')
    await click(button('创建并打开'))
    expect(client.launch).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'blank', parentSessionId: sourceId }),
    )
    await render(element, en)
    expect(container.textContent).toContain('Blank branch')
    expect(container.textContent).not.toContain('空白分支')
  })

  it('opens real Session identities from a mixed tree and records its user-visible labels', async () => {
    const sessions = ['root', 'full', 'clips', 'blank'].map((id) => ({
      id: id as SessionId,
      displayTitle: `Session ${id}`,
      running: false,
      blank: id === 'blank',
      updatedAt: 0,
      ...(id === 'full' ? { parentId: 'root' as SessionId } : {}),
    }))
    const byId = Object.fromEntries(sessions.map((session) => [session.id, session]))
    const relations: DerivedSessionRelation[] = ['clips', 'blank'].map((mode) => ({
      derivedSessionId: mode as SessionId,
      workspaceId,
      mode: mode === 'clips' ? 'clips-only' : 'blank',
      parentSessionId: 'root' as SessionId,
      attachedClipIds: mode === 'blank' ? [] : ['clip' as ClipId],
      createdAt: '2026-09-01T00:00:00Z',
    }))
    const rows = deriveCurrentLineage(
      sessions.map((session) => session.id),
      byId,
      'root' as SessionId,
      relations,
    )
    const open = vi.fn()
    await render(createElement(SessionTree, { rows, current: 'root' as SessionId, onOpen: open }))
    await click(button('打开会话：Session blank'))
    expect(open).toHaveBeenCalledWith('blank')
    const observed = [...container.querySelectorAll('.dbm-tree-node')].map((node) => ({
      name: node.getAttribute('aria-label'),
      mode: node.getAttribute('data-mode'),
      current: node.getAttribute('aria-current'),
      label: node.textContent,
    }))
    await expect(JSON.stringify(observed, null, 2) + '\n').toMatchFileSnapshot('./expected/session-tree.json')
  })
})
