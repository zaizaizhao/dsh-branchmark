import {
  useEffect, useLayoutEffect, useRef, useState,
} from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Clip } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../domain/client.ts'
import type { BranchMarkUiController, ClipSelectionCandidate } from '../domain/controller.ts'
import {
  selectionCreateRequests, selectionToolbarPosition,
} from '../domain/selection-actions.ts'
import type { SelectionIntent } from '../domain/selection-actions.ts'
import { chatNodeText, selectionCandidate, selectionOffset } from '../domain/selection.ts'
import { SelectionActions } from './SelectionActions.tsx'

interface ToolbarLayout {
  readonly toolbar: { readonly width: number; readonly height: number }
  readonly viewport: { readonly width: number; readonly height: number }
}

const INITIAL_LAYOUT: ToolbarLayout = {
  toolbar: { width: 470, height: 38 },
  viewport: { width: 1280, height: 720 },
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function preserveSelection(event: { preventDefault(): void; stopPropagation(): void }): void {
  event.preventDefault()
  event.stopPropagation()
}

/** Capture a continuous DOM Range as one Clip candidate per completed Chat row.
 * @param currentSessionId - Session whose visible Chat rows may be selected.
 * @param client - BranchMark browser adapter for Session snapshots and Workspace identity.
 * @param controller - Shared UI controller receiving the current selection.
 */
export function useChatSelection(
  currentSessionId: SessionId | undefined,
  client: BranchMarkClient,
  controller: BranchMarkUiController,
): void {
  useEffect(() => {
    if (currentSessionId === undefined) {
      controller.setSelection(null)
      return
    }
    const inspect = (): void => {
      const selection = window.getSelection()
      if (selection === null || selection.isCollapsed || selection.rangeCount !== 1) {
        controller.setSelection(null)
        return
      }
      const range = selection.getRangeAt(0)
      const workspaceId = client.workspaceForSession(currentSessionId)
      const snapshot = client.sessionSnapshot(currentSessionId)
      if (workspaceId === undefined || snapshot === undefined) {
        controller.setSelection(null)
        return
      }
      const rows = [...document.querySelectorAll<HTMLElement>('[data-chat-flow-key]')]
        .filter(row => range.intersectsNode(row))
      if (rows.length === 0) {
        controller.setSelection(null)
        return
      }
      const sessionTitle = client.sessionTitle(currentSessionId)
      const candidates: ClipSelectionCandidate[] = []
      for (const row of rows) {
        const nodeKey = row.dataset.chatFlowKey
        if (nodeKey === undefined) continue
        const canonical = chatNodeText(snapshot, nodeKey)
        if (canonical === undefined || canonical === '') continue
        let excerpt: string
        let approximateOffset = 0
        const piece = document.createRange()
        piece.selectNodeContents(row)
        const startsHere = row.contains(range.startContainer)
        const endsHere = row.contains(range.endContainer)
        if (startsHere) piece.setStart(range.startContainer, range.startOffset)
        if (endsHere) piece.setEnd(range.endContainer, range.endOffset)
        const selectedPiece = piece.toString()
        if (startsHere || endsHere) {
          excerpt = selectedPiece
          approximateOffset = startsHere ? selectionOffset(row, range) : 0
        } else excerpt = canonical
        if (excerpt.trim() === '') continue
        const rect = piece.getBoundingClientRect()
        const candidate = selectionCandidate({
          workspaceId,
          sessionId: currentSessionId,
          ...(sessionTitle === undefined ? {} : { sessionTitle }),
          snapshot,
          nodeKey,
          excerpt,
          approximateOffset,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        })
        if (candidate !== undefined) candidates.push(candidate)
      }
      controller.setSelection(candidates.length === 0 ? null : candidates)
    }
    let frame: number | undefined
    const schedule = (): void => {
      if (frame !== undefined) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => { frame = undefined; inspect() })
    }
    const inspectNow = (): void => { inspect(); schedule() }
    document.addEventListener('selectionchange', schedule)
    document.addEventListener('pointerup', inspectNow)
    document.addEventListener('keyup', inspectNow)
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame)
      document.removeEventListener('selectionchange', schedule)
      document.removeEventListener('pointerup', inspectNow)
      document.removeEventListener('keyup', inspectNow)
    }
  }, [client, controller, currentSessionId])
}

/** Render and orchestrate the action strip attached to a DSH text selection.
 * @param props - Captured selections plus the Client and shared UI controller.
 * @returns A viewport-clamped toolbar that preserves the browser selection while clicked.
 */
export function SelectionToolbar({ candidates, client, controller }: {
  readonly candidates: readonly ClipSelectionCandidate[]
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
}) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [working, setWorking] = useState(false)
  const [layout, setLayout] = useState<ToolbarLayout>(INITIAL_LAYOUT)
  useLayoutEffect(() => {
    let frame = 0
    let resizeObserver: ResizeObserver | undefined
    const measure = (): void => {
      const rect = toolbarRef.current?.getBoundingClientRect()
      if (rect === undefined) return
      const next: ToolbarLayout = {
        toolbar: { width: rect.width, height: rect.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }
      setLayout(previous => (
        previous.toolbar.width === next.toolbar.width
        && previous.toolbar.height === next.toolbar.height
        && previous.viewport.width === next.viewport.width
        && previous.viewport.height === next.viewport.height
          ? previous
          : next
      ))
    }
    frame = window.requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    if (typeof ResizeObserver !== 'undefined' && toolbarRef.current !== null) {
      resizeObserver = new ResizeObserver(measure)
      resizeObserver.observe(toolbarRef.current)
    }
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      resizeObserver?.disconnect()
    }
  }, [])
  const clearSelection = (): void => {
    controller.setSelection(null)
    controller.clipsChanged()
    window.getSelection()?.removeAllRanges()
  }
  const run = async (intent: SelectionIntent): Promise<void> => {
    setWorking(true)
    try {
      const clips: readonly Clip[] = await Promise.all(
        selectionCreateRequests(candidates, intent).map(request => client.create(request)),
      )
      if (intent === 'side-chat') {
        const primary = [...clips].reverse().find(clip => clip.source.kind === 'session-message' && clip.source.forkable)
        if (primary === undefined) throw new Error('所选内容没有可恢复的完整来源消息，不能创建 Side Chat。')
        const snapshot = await client.createSideChat({
          workspaceId: primary.workspaceId,
          ownerSessionId: primary.ownerSessionId,
          primaryClipId: primary.id,
          clips: clips.map(clip => ({ clipId: clip.id, includeNote: false })),
        })
        controller.upsertSideChat(snapshot, true)
      } else if (intent === 'reference') {
        for (const clip of [...clips].reverse()) {
          const outcome = client.attachClipToComposer(clip.ownerSessionId, clip, false)
          if (outcome !== 'inserted') throw new Error(
            outcome === 'busy'
              ? '输入框正在发送或处理命令；枝签已保存，但没有全部引用到输入框。'
              : '当前会话输入框尚未就绪；枝签已保存，但没有全部引用到输入框。',
          )
        }
      }
      clearSelection()
      if (intent === 'save-session') controller.notify('success', `已保存 ${String(clips.length)} 枚本会话枝签`)
      if (intent === 'save-project') controller.notify('success', `已保存 ${String(clips.length)} 枚项目枝签`)
      if (intent === 'reference') controller.notify('success', `已引用 ${String(clips.length)} 枚枝签，不会自动发送`)
    } catch (error) {
      controller.clipsChanged()
      controller.notify('error', errorText(error))
    } finally {
      setWorking(false)
    }
  }
  const position = selectionToolbarPosition(candidates, layout.toolbar, layout.viewport)
  return (
    <div
      ref={toolbarRef}
      className="dbm-selection-toolbar"
      data-placement={position.placement}
      style={{ left: position.left, top: position.top }}
      role="toolbar"
      aria-label={`所选内容操作，共 ${String(candidates.length)} 条`}
      onPointerDown={preserveSelection}
    >
      <SelectionActions
        disabled={working}
        onSaveSession={() => { void run('save-session') }}
        onSaveProject={() => { void run('save-project') }}
        onSideChat={() => { void run('side-chat') }}
        onReference={() => { void run('reference') }}
      />
    </div>
  )
}
