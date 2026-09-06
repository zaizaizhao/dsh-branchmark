/** Batch operations and durable ordering, separate from collection presentation. */
import { useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { Clip, ClipId } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../../domain/client.ts'
import type { BranchMarkUiController } from '../../domain/controller.ts'
import { moveClipInCollection } from '../../domain/clip-order.ts'
import { useBranchMarkText } from '../shared/text.ts'
import type { CollectionMode } from './useClipCollection.ts'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Coordinate explicit selection commands and complete-collection reorder requests.
 * @param props - Visible selection, complete order, scope, and local UI callbacks.
 * @returns Busy state and commands backed by the typed client adapter.
 */
export function useCollectionActions({
  mode,
  workspaceId,
  sessionId,
  selected,
  displayedClips,
  canReorder,
  batchTags,
  client,
  controller,
  onComplete,
  onClosePanel,
  onOrderChange,
}: {
  readonly mode: CollectionMode
  readonly workspaceId: WorkspaceId | undefined
  readonly sessionId: SessionId | undefined
  readonly selected: readonly Clip[]
  readonly displayedClips: readonly Clip[]
  readonly canReorder: boolean
  readonly batchTags: string
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
  readonly onComplete: () => void
  readonly onClosePanel: () => void
  readonly onOrderChange: (ids: readonly ClipId[] | null) => void
}) {
  const t = useBranchMarkText()
  const [batchBusy, setBatchBusy] = useState(false)
  const [orderSaving, setOrderSaving] = useState(false)
  const allPinned = selected.length > 0 && selected.every((clip) => clip.pinnedAt !== undefined)
  const batch = async (kind: 'trash' | 'tags' | 'pin'): Promise<void> => {
    if (workspaceId === undefined) return
    setBatchBusy(true)
    try {
      if (kind === 'trash') {
        await client.batchUpdate({
          workspaceId,
          clipIds: selected.map((clip) => clip.id),
          mutation: { kind: 'set-status', status: 'trashed' },
        })
      } else if (kind === 'tags') {
        const extra = batchTags
          .split(/[,，]/u)
          .map((value) => value.trim())
          .filter(Boolean)
        await client.batchUpdate({
          workspaceId,
          clipIds: selected.map((clip) => clip.id),
          mutation: { kind: 'add-tags', tags: extra },
        })
      } else {
        await client.batchUpdate({
          workspaceId,
          clipIds: selected.map((clip) => clip.id),
          mutation: { kind: 'set-pinned', pinned: !allPinned },
        })
      }
      controller.clipsChanged()
      controller.notify('success', t('batchUpdated', { count: selected.length }))
      onComplete()
    } catch (error) {
      controller.notify('error', errorText(error))
    } finally {
      setBatchBusy(false)
    }
  }
  const selectedSource = selected.find((clip) => clip.source.kind === 'session-message')
  const launcherSource =
    sessionId ??
    (selectedSource?.source.kind === 'session-message' ? selectedSource.source.sessionId : undefined)
  const quoteSelected = (): void => {
    if (sessionId === undefined) {
      controller.notify('error', '请先打开一个会话，再把枝签引用到输入框。')
      return
    }
    const result = client.attachClipsToComposer(sessionId, selected)
    if (result.failed.length > 0) {
      controller.notify(
        'error',
        `已有 ${String(result.inserted.length)} 枚引用成功，${String(result.failed.length)} 枚未能写入输入框。`,
      )
      return
    }
    const detail = result.duplicates.length > 0 ? `；${String(result.duplicates.length)} 枚已存在` : ''
    controller.notify(
      'success',
      `已引用 ${String(result.inserted.length)} 枚枝签到主输入框${detail}，不会自动发送`,
    )
    onComplete()
  }
  const openSelectedSideChat = async (): Promise<void> => {
    if (workspaceId === undefined) return
    const candidates = selected.filter(
      (clip) => clip.source.kind === 'session-message' && clip.source.forkable,
    )
    if (candidates.length === 0) {
      controller.notify('error', '所选枝签没有可恢复的来源消息，不能创建 Side Chat。')
      return
    }
    const sourceSessions = new Set(
      candidates.map((clip) => (clip.source.kind === 'session-message' ? clip.source.sessionId : undefined)),
    )
    if (sourceSessions.size > 1) {
      if (launcherSource !== undefined)
        controller.openLauncher('side-chat', workspaceId, launcherSource, selected)
      onClosePanel()
      return
    }
    const primary = candidates.toSorted((left, right) => {
      const leftSeq = left.source.kind === 'session-message' ? left.source.eventSeq : -1
      const rightSeq = right.source.kind === 'session-message' ? right.source.eventSeq : -1
      return rightSeq - leftSeq
    })[0]!
    if (primary.source.kind !== 'session-message') return
    setBatchBusy(true)
    try {
      const snapshot = await client.createSideChat({
        workspaceId,
        ownerSessionId: primary.source.sessionId,
        primaryClipId: primary.id,
        clips: selected.map((clip) => ({ clipId: clip.id, includeNote: clip.note !== undefined })),
      })
      controller.upsertSideChat(snapshot, true)
      onComplete()
    } catch (error) {
      controller.notify('error', errorText(error))
    } finally {
      setBatchBusy(false)
    }
  }
  const moveClip = async (sourceId: ClipId, targetId: ClipId): Promise<void> => {
    if (workspaceId === undefined || !canReorder || orderSaving || batchBusy) return
    const moved = moveClipInCollection(displayedClips, sourceId, targetId)
    if (!moved.ok) {
      controller.notify(
        'error',
        moved.reason === 'pin-group-mismatch'
          ? '置顶与未置顶枝签不能直接跨组拖动，请先切换置顶状态。'
          : '拖动的枝签已经不在当前集合中。',
      )
      return
    }
    if (moved.clipIds.join('\0') === displayedClips.map((clip) => clip.id).join('\0')) return
    onOrderChange(moved.clipIds)
    setOrderSaving(true)
    try {
      await client.batchUpdate({
        workspaceId,
        clipIds: moved.clipIds,
        mutation: {
          kind: 'reorder',
          scope: mode,
          ...(mode === 'session' && sessionId !== undefined ? { ownerSessionId: sessionId } : {}),
        },
      })
      controller.clipsChanged()
      controller.notify('success', t('orderSaved'), {
        label: t('undo'),
        run: () =>
          client.batchUpdate({
            workspaceId,
            clipIds: displayedClips.map((clip) => clip.id),
            mutation: {
              kind: 'reorder',
              scope: mode,
              ...(mode === 'session' && sessionId !== undefined ? { ownerSessionId: sessionId } : {}),
            },
          }),
      })
    } catch (error) {
      onOrderChange(null)
      controller.notify('error', errorText(error))
    } finally {
      setOrderSaving(false)
    }
  }
  const openSelectedSession = (): void => {
    if (workspaceId === undefined || launcherSource === undefined) {
      controller.notify('error', '所选枝签没有可用的来源会话。')
      return
    }
    onClosePanel()
    controller.openLauncher('session', workspaceId, launcherSource, selected)
  }
  return {
    batchBusy,
    orderSaving,
    allPinned,
    batch,
    quoteSelected,
    openSelectedSideChat,
    moveClip,
    openSelectedSession,
  }
}
