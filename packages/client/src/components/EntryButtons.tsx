import { useEffect, useRef, useState } from 'react'
import {
  IconBranchOutline16, IconCloseOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { InputState } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { DerivedSessionRelation } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../domain/client.ts'
import type { BranchMarkUiController } from '../domain/controller.ts'
import { useBranchMarkUi } from '../domain/controller.ts'
import { BRANCHMARK_REFERENCE_SOURCE } from '../domain/composer-reference.ts'
import { referenceRemovalDrafts } from '../domain/reference-removal.ts'
import { BranchMarkLogo } from './BranchMarkLogo.tsx'

interface EntryFace {
  readonly controller: BranchMarkUiController
  readonly client: BranchMarkClient
}

type SidebarProps = PropsRuntime<'sidebar.footer.action'> & EntryFace

/** Project-level entry beside the DSH sidebar Settings action. */
export function BranchMarkSidebarButton({ wide, useSessions, useWorkspaces, controller, client }: SidebarProps) {
  useSessions((snapshot: SessionListState) => snapshot.current)
  useWorkspaces((snapshot: WorkspaceSnapshot) => snapshot.items)
  const state = useBranchMarkUi(controller)
  const workspaceId = client.currentWorkspace()
  const [count, setCount] = useState<number | undefined>()
  useEffect(() => {
    if (workspaceId === undefined) {
      setCount(undefined)
      return
    }
    let active = true
    void client.list({ workspaceId, visibility: 'project-library' }).then(
      value => { if (active) setCount(value.clips.filter(clip => clip.scope === 'project').length) },
      () => { if (active) setCount(undefined) },
    )
    return () => { active = false }
  }, [client, state.clipsRevision, workspaceId])
  const active = state.dock.mode === 'expanded' && state.dock.view === 'project'
  return (
    <button
      type="button"
      className="dbm-sidebar-nav-row"
      data-wide={wide}
      data-active={active}
      title="打开项目枝签"
      disabled={workspaceId === undefined}
      onClick={() => { if (workspaceId !== undefined) controller.openDock('project') }}
    >
      <span className="dbm-sidebar-nav-icon"><BranchMarkLogo compact size={wide ? 15 : 16} /></span>
      {wide && <span className="dbm-sidebar-nav-label">枝签</span>}
      {count !== undefined && count > 0 && <span className="dbm-sidebar-nav-count">{count > 99 ? '99+' : String(count)}</span>}
    </button>
  )
}

type ComposerTriggerProps = PropsRuntime<'conversation.input.left'> & EntryFace

/** Session-scoped Dock trigger inside the native Composer tool row. */
export function BranchMarkDrawerButton({ sessionId, useInput, inputActions, controller, client }: ComposerTriggerProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement | null>(null)
  const workspaceId = client.workspaceForSession(sessionId)
  const draft: string = useInput((input: InputState) => input.draft)
  const occurrences: InputState['occurrences'] = useInput((input: InputState) => input.occurrences)
  const references = occurrences.filter(occurrence => occurrence.source === BRANCHMARK_REFERENCE_SOURCE)
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent): void => {
      if (root.current?.contains(event.target as Node) !== true) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])
  const remove = (occurrenceId: number): void => {
    const occurrence = occurrences.find(candidate => candidate.occurrenceId === occurrenceId)
    if (occurrence === undefined) return
    if (references.length === 1) setOpen(false)
    for (const nextDraft of referenceRemovalDrafts(draft, occurrence)) inputActions.setDraft(nextDraft)
  }
  const activate = (): void => {
    if (workspaceId === undefined) return
    if (references.length === 0) controller.openDock('session')
    else setOpen(value => !value)
  }
  return (
    <div className="dbm-composer-reference" ref={root}>
      <button
        type="button"
        className="dbm-composer-trigger"
        data-active={open}
        title={references.length === 0 ? '引用本会话枝签' : `管理已引用的 ${String(references.length)} 枚枝签`}
        aria-haspopup={references.length === 0 ? undefined : 'dialog'}
        aria-expanded={references.length === 0 ? undefined : open}
        disabled={workspaceId === undefined}
        onClick={activate}
      >
        <BranchMarkLogo compact size={15} />
        <span>引用枝签</span>
        {references.length > 0 && <b>{references.length > 99 ? '99+' : String(references.length)}</b>}
      </button>
      {open && (
        <section className="dbm-reference-popover" aria-label="当前消息引用的枝签">
          <header><strong>已引用 {String(references.length)} 枚枝签</strong><small>发送前才会展开为模型上下文</small></header>
          <div className="dbm-reference-list">
            {references.map(occurrence => (
              <div className="dbm-reference-row" key={occurrence.occurrenceId}>
                <span>{occurrence.label}</span>
                <button type="button" aria-label={`移除${occurrence.label}`} onClick={() => { remove(occurrence.occurrenceId) }}>
                  <IconCloseOutline16 size={12} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="dbm-reference-manage" onClick={() => { setOpen(false); controller.openDock('session') }}>
            打开本会话枝签
          </button>
        </section>
      )}
    </div>
  )
}

type LineageProps = PropsRuntime<'conversation.session.header.actions'> & EntryFace

/** Derived-session marker that opens the plugin-owned relationship tree. */
export function BranchMarkLineageAction({ sessionId, controller, client }: LineageProps) {
  const [relation, setRelation] = useState<DerivedSessionRelation | null>(null)
  useEffect(() => {
    const abort = new AbortController()
    const workspaceId = client.workspaceForSession(sessionId)
    if (workspaceId === undefined) return () => { abort.abort() }
    void client.relations({ workspaceId, derivedSessionId: sessionId }).then(
      value => { if (!abort.signal.aborted) setRelation(value.relations[0] ?? null) },
      () => { if (!abort.signal.aborted) setRelation(null) },
    )
    return () => { abort.abort() }
  }, [client, sessionId])
  if (relation === null) return null
  return (
    <button
      type="button"
      className="dbm-lineage-pill"
      data-mode={relation.mode}
      title="在枝签 Dock 中查看父子会话关系"
      onClick={() => { controller.openDock('lineage') }}
    >
      <IconBranchOutline16 size={14} />
      {relation.mode === 'full-fork' ? '继承来源上下文' : '由枝签创建'}
    </button>
  )
}
