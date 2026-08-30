import { useEffect, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  SessionId, SessionSummary, WorkspaceId,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import {
  IconArchiveOutline20,
  IconBranchOutline16,
  IconChevronRightOutline14,
  IconCloseOutline16,
  IconFolderOpenOutline16,
  IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { BranchMarkClient } from '../domain/client.ts'
import type {
  BranchMarkDockView, BranchMarkLauncher, BranchMarkUiController,
} from '../domain/controller.ts'
import {
  BRANCHMARK_DOCK_MAX_WIDTH,
  BRANCHMARK_DOCK_MIN_WIDTH,
  useBranchMarkUi,
} from '../domain/controller.ts'
import { deriveCurrentLineage } from '../domain/lineage.ts'
import { BranchMarkLauncherSheet } from './BranchMarkLauncher.tsx'
import { ClipCollection } from './ClipCollection.tsx'
import { SelectionToolbar, useChatSelection } from './SelectionToolbar.tsx'
import { SideChatView } from './SideChat.tsx'

interface ShellFace {
  readonly controller: BranchMarkUiController
  readonly client: BranchMarkClient
}

type ShellProps = PropsRuntime<'shell.overlay'> & ShellFace

interface DockCounts {
  readonly session?: number
  readonly project?: number
}

const BRANCH_COLORS = ['#5578f6', '#8b63dc', '#199d91', '#dc6e65', '#c68a27', '#427eb7'] as const

function clampWidth(value: number): number {
  return Math.min(BRANCHMARK_DOCK_MAX_WIDTH, Math.max(BRANCHMARK_DOCK_MIN_WIDTH, Math.round(value)))
}

function branchColor(branch: number | null): string {
  return branch === null ? '#8a93a4' : BRANCH_COLORS[branch % BRANCH_COLORS.length] ?? '#5578f6'
}

function LineageView({ ids, byId, current, client }: {
  readonly ids: readonly SessionId[]
  readonly byId: Readonly<Record<SessionId, SessionSummary>>
  readonly current: SessionId | undefined
  readonly client: BranchMarkClient
}) {
  if (current === undefined || byId[current] === undefined) {
    return <div className="dbm-empty"><div><strong>暂无会话关系</strong><p>从枝签继承上下文后，会话关系会显示在这里。</p></div></div>
  }
  const rows = deriveCurrentLineage(ids, byId, current)
  return (
    <div className="dbm-lineage-view">
      <p className="dbm-scope-description">父子关系来自 DSH Session 的 parentId；颜色用于区分分支，不修改原生侧边栏。</p>
      <div className="dbm-lineage-tree">
        {rows.map(row => {
          const parent = row.session.parentId === undefined ? undefined : byId[row.session.parentId]
          const color = branchColor(row.branch)
          const style = {
            '--dbm-depth': String(row.depth),
            '--dbm-node-accent': color,
          } as CSSProperties
          return (
            <button
              type="button"
              className="dbm-lineage-node"
              data-current={row.session.id === current}
              data-depth={row.depth}
              style={style}
              key={row.session.id}
              onClick={() => { client.openSession(row.session.id) }}
            >
              <span className="dbm-lineage-icon">{row.depth === 0 ? <IconFolderOpenOutline16 size={14} /> : <IconBranchOutline16 size={14} />}</span>
              <span className="dbm-lineage-copy">
                <strong>{row.session.displayTitle}</strong>
                <small>{parent === undefined ? '父会话 · 分支起点' : `继承自 ${parent.displayTitle}`}</small>
              </span>
              <span className="dbm-lineage-badge">{row.session.id === current ? '当前' : row.depth === 0 ? '父会话' : `L${String(row.depth)}`}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function useDockCounts(
  client: BranchMarkClient,
  workspaceId: WorkspaceId | undefined,
  sessionId: SessionId | undefined,
  revision: number,
): DockCounts {
  const [counts, setCounts] = useState<DockCounts>({})
  useEffect(() => {
    if (workspaceId === undefined) {
      setCounts({})
      return
    }
    let active = true
    const sessionRequest = sessionId === undefined
      ? Promise.resolve(undefined)
      : client.list({ workspaceId, ownerSessionId: sessionId, visibility: 'session-drawer' })
    void Promise.allSettled([
      sessionRequest,
      client.list({ workspaceId, visibility: 'project-library' }),
    ]).then(([sessionResult, projectResult]) => {
      if (!active) return
      setCounts({
        ...(sessionResult.status === 'fulfilled' && sessionResult.value !== undefined
          ? { session: sessionResult.value.clips.filter(clip => clip.scope === 'session' && clip.ownerSessionId === sessionId).length }
          : {}),
        ...(projectResult.status === 'fulfilled'
          ? { project: projectResult.value.clips.filter(clip => clip.scope === 'project').length }
          : {}),
      })
    })
    return () => { active = false }
  }, [client, revision, sessionId, workspaceId])
  return counts
}

function DockHandle({ count, running, disabled, controller }: {
  readonly count: number
  readonly running: boolean
  readonly disabled: boolean
  readonly controller: BranchMarkUiController
}) {
  return (
    <button
      type="button"
      className="dbm-dock-handle"
      aria-label="展开枝签 Dock"
      title="展开枝签 Dock"
      disabled={disabled}
      onClick={() => { controller.reopenDock() }}
    >
      <IconArchiveOutline20 size={16} />
      <span>枝签{count > 0 ? ` ${String(count)}` : ''}</span>
      {running && <i />}
    </button>
  )
}

interface DockPlacement {
  readonly top: number
  readonly bottom: number
}

const DEFAULT_DOCK_PLACEMENT: DockPlacement = { top: 82, bottom: 118 }

function useDockPlacement(expanded: boolean, currentSessionId: SessionId | undefined): DockPlacement {
  const [placement, setPlacement] = useState<DockPlacement>(DEFAULT_DOCK_PLACEMENT)
  useEffect(() => {
    if (!expanded) return
    let resizeObserver: ResizeObserver | undefined
    let frame = 0
    const update = (): void => {
      const scroller = document.querySelector<HTMLElement>('[data-conversation-scroll]')
      if (scroller === null) return
      const composer = scroller.querySelector<HTMLElement>('[data-composer-seat]')
      const scrollRect = scroller.getBoundingClientRect()
      const composerRect = composer?.getBoundingClientRect()
      const top = Math.max(12, Math.round(scrollRect.top + 12))
      const requestedBottom = composerRect === undefined
        ? 16
        : Math.max(16, Math.round(window.innerHeight - composerRect.top + 12))
      const bottom = Math.min(requestedBottom, Math.max(16, window.innerHeight - top - 300))
      setPlacement(previous => previous.top === top && previous.bottom === bottom
        ? previous
        : { top, bottom })
      if (resizeObserver === undefined && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(update)
        resizeObserver.observe(scroller)
        if (composer !== null) resizeObserver.observe(composer)
      }
    }
    frame = window.requestAnimationFrame(update)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      resizeObserver?.disconnect()
    }
  }, [currentSessionId, expanded])
  return placement
}

function DockPanel({
  view, width, placement, launcher, workspaceId, currentSessionId, sessionIds, sessionsById, client, controller,
}: {
  readonly view: BranchMarkDockView
  readonly width: number
  readonly placement: DockPlacement
  readonly launcher: BranchMarkLauncher | null
  readonly workspaceId: WorkspaceId | undefined
  readonly currentSessionId: SessionId | undefined
  readonly sessionIds: readonly SessionId[]
  readonly sessionsById: Readonly<Record<SessionId, SessionSummary>>
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
}) {
  const [liveWidth, setLiveWidth] = useState(width)
  useEffect(() => { setLiveWidth(width) }, [width])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (launcher !== null) controller.closeLauncher()
      else controller.collapseDock()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [controller, launcher])
  const startResize = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = liveWidth
    let finalWidth = startWidth
    document.body.dataset.dbmResizing = 'true'
    const move = (moveEvent: PointerEvent): void => {
      finalWidth = clampWidth(startWidth + startX - moveEvent.clientX)
      setLiveWidth(finalWidth)
    }
    const finish = (): void => {
      delete document.body.dataset.dbmResizing
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      controller.setDockWidth(finalWidth)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }
  const current = currentSessionId === undefined ? undefined : sessionsById[currentSessionId]
  const rows = currentSessionId === undefined ? [] : deriveCurrentLineage(sessionIds, sessionsById, currentSessionId)
  const accent = branchColor(rows.find(row => row.session.id === currentSessionId)?.branch ?? null)
  const titles: Record<BranchMarkDockView, readonly [string, string]> = {
    session: ['本会话枝签', '仅当前会话的私有枝签'],
    project: ['项目枝签', '跨会话搜索显式保存到项目的枝签'],
    lineage: ['会话关系', '查看当前会话所在的父子分支'],
    'side-chat': ['Side Chat', '临时 · 只读工具 · 关闭标签立即销毁'],
  }
  const [title, subtitle] = titles[view]
  const style = {
    '--dbm-dock-width': `${String(liveWidth)}px`,
    '--dbm-dock-top': `${String(placement.top)}px`,
    '--dbm-dock-bottom': `${String(placement.bottom)}px`,
    '--dbm-session-accent': accent,
  } as CSSProperties
  return (
    <section className="dbm-dock-panel" style={style} aria-label={title}>
      <div className="dbm-dock-resizer" title="拖动调整宽度" onPointerDown={startResize} />
      <div className="dbm-dock-layout">
        <header className="dbm-dock-header">
          <span className="dbm-dock-brand">
            {view === 'lineage' ? <IconBranchOutline16 /> : view === 'side-chat' ? <IconSparkle16 /> : <IconArchiveOutline20 />}
          </span>
          <span className="dbm-dock-heading"><strong>{title}</strong><small>{current?.displayTitle ?? subtitle}</small></span>
          <button type="button" className="dbm-button dbm-icon-button" title="最小化为右侧把手" onClick={() => { controller.collapseDock() }}><IconChevronRightOutline14 /></button>
          <button type="button" className="dbm-button dbm-icon-button" title="隐藏枝签 Dock" onClick={() => { controller.hideDock() }}><IconCloseOutline16 /></button>
        </header>
        <div className="dbm-dock-tabs" role="tablist" aria-label="枝签 Dock 视图">
          <button type="button" role="tab" className="dbm-dock-tab" data-active={view === 'session'} onClick={() => { controller.openDock('session') }}>本会话</button>
          <button type="button" role="tab" className="dbm-dock-tab" data-active={view === 'project'} onClick={() => { controller.openDock('project') }}>项目</button>
          <button type="button" role="tab" className="dbm-dock-tab" data-active={view === 'lineage'} onClick={() => { controller.openDock('lineage') }}>关系</button>
          <button type="button" role="tab" className="dbm-dock-tab" data-active={view === 'side-chat'} onClick={() => { controller.openDock('side-chat') }}>Side Chat</button>
        </div>
        <div className="dbm-dock-body">
          {view === 'session' && <ClipCollection key="session" mode="session" workspaceId={workspaceId} sessionId={currentSessionId} client={client} controller={controller} />}
          {view === 'project' && <ClipCollection key="project" mode="project" workspaceId={workspaceId} sessionId={currentSessionId} client={client} controller={controller} />}
          {view === 'lineage' && <LineageView ids={sessionIds} byId={sessionsById} current={currentSessionId} client={client} />}
          {view === 'side-chat' && <SideChatView client={client} controller={controller} />}
        </div>
        {launcher !== null && (
          <BranchMarkLauncherSheet
            key={launcher.clips.map(clip => clip.id).join(':')}
            launcher={launcher}
            client={client}
            controller={controller}
          />
        )}
      </div>
    </section>
  )
}

function Toast({ controller }: { readonly controller: BranchMarkUiController }) {
  const { toast } = useBranchMarkUi(controller)
  useEffect(() => {
    if (toast === null) return
    const timer = window.setTimeout(() => { controller.dismissToast(toast.nonce) }, 3200)
    return () => { window.clearTimeout(timer) }
  }, [controller, toast])
  if (toast === null) return null
  return (
    <button type="button" className="dbm-toast" data-kind={toast.kind} onClick={() => { controller.dismissToast(toast.nonce) }}>
      {toast.kind === 'success' ? '✓' : '!'} {toast.text}
    </button>
  )
}

/** Root overlay for selection capture, persistent Dock, Side Chats, and feedback.
 * @param props - DSH shell runtime plus BranchMark browser services.
 * @returns The additive BranchMark overlay without resizing the DSH conversation layout.
 */
export function BranchMarkShell({ useSessions, useWorkspaces, controller, client }: ShellProps) {
  const currentSessionId = useSessions(snapshot => snapshot.current)
  const sessionIds = useSessions(snapshot => snapshot.ids)
  const sessionsById = useSessions(snapshot => snapshot.byId)
  useWorkspaces(snapshot => snapshot.recentWorkspaceId)
  const state = useBranchMarkUi(controller)
  const workspaceId = client.currentWorkspace()
  const counts = useDockCounts(client, workspaceId, currentSessionId, state.clipsRevision)
  const sideChatRunning = state.sideChats.tabs.some(tab => tab.status === 'running' || tab.status === 'preparing')
  const placement = useDockPlacement(state.dock.mode === 'expanded', currentSessionId)
  const handleCount = (counts.session ?? 0) + (counts.project ?? 0)
  useChatSelection(currentSessionId, client, controller)
  useEffect(() => {
    if (currentSessionId === undefined || workspaceId === undefined) return
    return client.watchComposerReferenceRecovery(
      currentSessionId,
      workspaceId,
      result => { controller.notify('success', `已恢复 ${String(result.inserted.length)} 枚枝签引用`) },
      error => { controller.notify('error', error instanceof Error ? error.message : String(error)) },
    )
  }, [client, controller, currentSessionId, workspaceId])
  return (
    <div className="dbm-overlay-root">
      {state.selection !== null && <SelectionToolbar candidates={state.selection} client={client} controller={controller} />}
      {state.dock.mode === 'rail' && (
        <DockHandle
          count={handleCount}
          running={sideChatRunning}
          controller={controller}
          disabled={workspaceId === undefined && state.sideChats.tabs.length === 0}
        />
      )}
      {state.dock.mode === 'expanded' && (
        <DockPanel
          view={state.dock.view}
          width={state.dock.width}
          placement={placement}
          launcher={state.dock.launcher}
          workspaceId={workspaceId}
          currentSessionId={currentSessionId}
          sessionIds={sessionIds}
          sessionsById={sessionsById}
          client={client}
          controller={controller}
        />
      )}
      <Toast controller={controller} />
    </div>
  )
}
