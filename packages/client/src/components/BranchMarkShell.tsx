import { useEffect, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { PropsRuntime, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { IconChevronRightOutline14, IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { BranchMarkClient } from '../domain/client.ts'
import type { BranchMarkDockView, BranchMarkLauncher, BranchMarkUiController } from '../domain/controller.ts'
import {
  BRANCHMARK_DOCK_MAX_WIDTH,
  BRANCHMARK_DOCK_MIN_WIDTH,
  useBranchMarkUi,
} from '../domain/controller.ts'
import { LineageView } from './lineage/LineageView.tsx'
import { BranchMarkTextContext, useBranchMarkText } from './shared/text.ts'
import { NotificationToast } from './shared/NotificationToast.tsx'
import { useDockEscape } from './shared/useDockEscape.ts'
import { BranchMarkLauncherSheet } from './launcher/BranchMarkLauncher.tsx'
import { BranchMarkLogo } from './BranchMarkLogo.tsx'
import { DockHandle } from './DockHandle.tsx'
import { ClipCollection } from './clips/ClipCollection.tsx'
import { SelectionToolbar, useChatSelection } from './SelectionToolbar.tsx'
import { SideChatView } from './SideChat.tsx'

interface ShellFace {
  readonly controller: BranchMarkUiController
  readonly client: BranchMarkClient
}

type ShellProps = PropsRuntime<'shell.overlay'> & PropsLocale<'branchmark'> & ShellFace

interface DockCounts {
  readonly session?: number
  readonly project?: number
}

function clampWidth(value: number): number {
  return Math.min(BRANCHMARK_DOCK_MAX_WIDTH, Math.max(BRANCHMARK_DOCK_MIN_WIDTH, Math.round(value)))
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
    const sessionRequest =
      sessionId === undefined
        ? Promise.resolve(undefined)
        : client.list({ workspaceId, ownerSessionId: sessionId, visibility: 'session-drawer' })
    void Promise.allSettled([
      sessionRequest,
      client.list({ workspaceId, visibility: 'project-library' }),
    ]).then(([sessionResult, projectResult]) => {
      if (!active) return
      setCounts({
        ...(sessionResult.status === 'fulfilled' && sessionResult.value !== undefined
          ? {
              session: sessionResult.value.clips.filter(
                (clip) => clip.scope === 'session' && clip.ownerSessionId === sessionId,
              ).length,
            }
          : {}),
        ...(projectResult.status === 'fulfilled'
          ? { project: projectResult.value.clips.filter((clip) => clip.scope === 'project').length }
          : {}),
      })
    })
    return () => {
      active = false
    }
  }, [client, revision, sessionId, workspaceId])
  return counts
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
      const requestedBottom =
        composerRect === undefined ? 16 : Math.max(16, Math.round(window.innerHeight - composerRect.top + 12))
      const bottom = Math.min(requestedBottom, Math.max(16, window.innerHeight - top - 300))
      setPlacement((previous) =>
        previous.top === top && previous.bottom === bottom ? previous : { top, bottom },
      )
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
  view,
  width,
  placement,
  launcher,
  workspaceId,
  currentSessionId,
  sessionIds,
  sessionsById,
  client,
  controller,
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
  const t = useBranchMarkText()
  const [liveWidth, setLiveWidth] = useState(width)
  useEffect(() => {
    setLiveWidth(width)
  }, [width])
  useDockEscape(controller, launcher !== null)
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
  const titles: Record<BranchMarkDockView, readonly [string, string]> = {
    session: ['本会话枝签', '仅当前会话的私有枝签'],
    project: ['项目枝签', '跨会话搜索显式保存到项目的枝签'],
    lineage: ['会话关系', '查看当前会话所在的父子分支'],
    'side-chat': ['Side Chat', '临时 · 只读工具 · 关闭标签立即销毁'],
  }
  const [title, subtitle] = titles[view]
  const tabs = [
    { view: 'session', label: 'sessionTab' },
    { view: 'project', label: 'projectTab' },
    { view: 'lineage', label: 'lineageTab' },
    { view: 'side-chat', label: 'sideChat' },
  ] as const
  const style = {
    '--dbm-dock-width': `${String(liveWidth)}px`,
    '--dbm-dock-top': `${String(placement.top)}px`,
    '--dbm-dock-bottom': `${String(placement.bottom)}px`,
  } as CSSProperties
  return (
    <section className="dbm-dock-panel" style={style} aria-label={title}>
      <div className="dbm-dock-resizer" title="拖动调整宽度" onPointerDown={startResize} />
      <div className="dbm-dock-layout">
        <header className="dbm-dock-header">
          <span className="dbm-dock-brand">
            <BranchMarkLogo size={26} />
          </span>
          <span className="dbm-dock-heading">
            <strong>{t('brandName')}</strong>
            <small>{current?.displayTitle ?? subtitle}</small>
          </span>
          <button
            type="button"
            className="dbm-button dbm-icon-button"
            title="最小化为右侧把手"
            onClick={() => {
              controller.collapseDock()
            }}
          >
            <IconChevronRightOutline14 />
          </button>
          <button
            type="button"
            className="dbm-button dbm-icon-button"
            title="隐藏枝签 Dock"
            onClick={() => {
              controller.hideDock()
            }}
          >
            <IconCloseOutline16 />
          </button>
        </header>
        <div
          className="dbm-dock-tabs"
          role="tablist"
          aria-label={t('dockViews')}
          onKeyDown={(event) => {
            const index = tabs.findIndex((tab) => tab.view === view)
            const target =
              event.key === 'ArrowRight'
                ? (index + 1) % tabs.length
                : event.key === 'ArrowLeft'
                  ? (index + tabs.length - 1) % tabs.length
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? tabs.length - 1
                      : undefined
            if (target === undefined) return
            event.preventDefault()
            controller.openDock(tabs[target]!.view)
            event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus()
          }}
        >
          {tabs.map((tab) => (
            <button
              type="button"
              role="tab"
              className="dbm-dock-tab"
              key={tab.view}
              data-active={view === tab.view}
              aria-selected={view === tab.view}
              tabIndex={view === tab.view ? 0 : -1}
              onClick={() => {
                controller.openDock(tab.view)
              }}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
        <div className="dbm-dock-body">
          {view === 'session' && (
            <ClipCollection
              key={`session:${workspaceId ?? ''}:${currentSessionId ?? ''}`}
              mode="session"
              workspaceId={workspaceId}
              sessionId={currentSessionId}
              client={client}
              controller={controller}
            />
          )}
          {view === 'project' && (
            <ClipCollection
              key={`project:${workspaceId ?? ''}`}
              mode="project"
              workspaceId={workspaceId}
              sessionId={currentSessionId}
              client={client}
              controller={controller}
            />
          )}
          {view === 'lineage' && (
            <LineageView
              ids={sessionIds}
              byId={sessionsById}
              current={currentSessionId}
              workspaceId={workspaceId}
              client={client}
              controller={controller}
            />
          )}
          {view === 'side-chat' && <SideChatView client={client} controller={controller} />}
        </div>
        {launcher !== null && (
          <BranchMarkLauncherSheet
            key={`${launcher.sourceSessionId}:${launcher.intent}:${launcher.clips.map((clip) => clip.id).join(':')}`}
            launcher={launcher}
            client={client}
            controller={controller}
          />
        )}
      </div>
    </section>
  )
}

/** Root overlay for selection capture, persistent Dock, Side Chats, and feedback.
 * @param props - DSH shell runtime plus BranchMark browser services.
 * @returns The additive BranchMark overlay without resizing the DSH conversation layout.
 */
function BranchMarkShellContent({ useSessions, useWorkspaces, controller, client }: ShellProps) {
  const currentSessionId = useSessions((snapshot: SessionListState) => snapshot.current)
  const sessionIds = useSessions((snapshot: SessionListState) => snapshot.ids)
  const sessionsById = useSessions((snapshot: SessionListState) => snapshot.byId)
  useWorkspaces((snapshot: WorkspaceSnapshot) => snapshot.items)
  const state = useBranchMarkUi(controller)
  const workspaceId = client.currentWorkspace()
  const counts = useDockCounts(client, workspaceId, currentSessionId, state.clipsRevision)
  const sideChatRunning = state.sideChats.tabs.some(
    (tab) => tab.status === 'running' || tab.status === 'preparing',
  )
  const placement = useDockPlacement(state.dock.mode === 'expanded', currentSessionId)
  const handleCount = (counts.session ?? 0) + (counts.project ?? 0)
  useChatSelection(currentSessionId, client, controller)
  useEffect(() => {
    if (currentSessionId === undefined || workspaceId === undefined) return
    return client.watchComposerReferenceRecovery(
      currentSessionId,
      workspaceId,
      (result) => {
        controller.notify('success', `已恢复 ${String(result.inserted.length)} 枚枝签引用`)
      },
      (error) => {
        controller.notify('error', error instanceof Error ? error.message : String(error))
      },
    )
  }, [client, controller, currentSessionId, workspaceId])
  return (
    <div className="dbm-overlay-root">
      {state.selection !== null && (
        <SelectionToolbar candidates={state.selection} client={client} controller={controller} />
      )}
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
      <NotificationToast controller={controller} />
    </div>
  )
}

/** Render the Dock with the Slot-owned translation context.
 * @param props - Framework feeds, locale translator, and BranchMark services.
 * @returns The additive localized overlay.
 */
export function BranchMarkShell(props: ShellProps) {
  return (
    <BranchMarkTextContext.Provider value={props.t}>
      <BranchMarkShellContent {...props} />
    </BranchMarkTextContext.Provider>
  )
}
