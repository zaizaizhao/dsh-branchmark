/** Browser-side Clip actions and mutation feedback, independent of card layout. */
import { useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Clip } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../../domain/client.ts'
import type { BranchMarkUiController, BranchMarkUndoAction } from '../../domain/controller.ts'
import { useBranchMarkText } from '../shared/text.ts'
import type { ClipMenuAction } from './ClipCardMenu.tsx'

export type ClipEditableField = 'note' | 'tags'

/** Expose explicit card operations without putting transport details into its presentation.
 * @param props - Clip identity, public services, and local editor callbacks.
 * @returns Busy state and operations for metadata, quoting, Side Chat, and recovery.
 */
export function useClipActions({
  clip,
  client,
  controller,
  currentSessionId,
  onEdit,
  onFocus,
}: {
  readonly clip: Clip
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
  readonly currentSessionId: SessionId | undefined
  readonly onEdit: (field: ClipEditableField | null) => void
  readonly onFocus: () => void
}) {
  const t = useBranchMarkText()
  const [busy, setBusy] = useState(false)
  const identity = { workspaceId: clip.workspaceId, clipId: clip.id }
  const mutate = async (
    work: () => Promise<unknown>,
    message: string,
    undo?: BranchMarkUndoAction,
  ): Promise<void> => {
    setBusy(true)
    try {
      await work()
      onEdit(null)
      controller.clipsChanged()
      controller.notify('success', message, undo)
    } catch (error) {
      controller.notify('error', error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }
  const quote = (): void => {
    if (currentSessionId === undefined) return
    const outcome = client.attachClipToComposer(currentSessionId, clip, clip.note !== undefined)
    const labels = {
      inserted: 'quoteInserted',
      duplicate: 'quoteDuplicate',
      busy: 'composerBusy',
      unavailable: 'composerUnavailable',
    } as const
    controller.notify(
      outcome === 'inserted' || outcome === 'duplicate' ? 'success' : 'error',
      t(labels[outcome]),
    )
  }
  const startSideChat = async (): Promise<void> => {
    if (clip.source.kind !== 'session-message' || !clip.source.forkable) {
      controller.notify('error', t('sideChatUnavailable'))
      return
    }
    setBusy(true)
    try {
      const snapshot = await client.createSideChat({
        workspaceId: clip.workspaceId,
        ownerSessionId: clip.source.sessionId,
        primaryClipId: clip.id,
        clips: [{ clipId: clip.id, includeNote: clip.note !== undefined }],
      })
      controller.upsertSideChat(snapshot, true)
    } catch (error) {
      controller.notify('error', error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }
  const action = (kind: ClipMenuAction): void => {
    switch (kind) {
      case 'focus':
        onFocus()
        return
      case 'note':
      case 'tags':
        onEdit(kind)
        return
      case 'pin':
        void mutate(
          () => client.update({ ...identity, pinned: clip.pinnedAt === undefined }),
          t(clip.pinnedAt === undefined ? 'pinSaved' : 'pinRemoved'),
        )
        return
      case 'project':
        void mutate(() => client.update({ ...identity, scope: 'project' }), t('projectSaved'))
        return
      case 'trash':
        void mutate(() => client.setStatus({ ...identity, status: 'trashed' }), t('trashMoved'), {
          label: t('undo'),
          run: () => client.setStatus({ ...identity, status: 'active' }),
        })
        return
      case 'delete':
        if (window.confirm(t('deleteConfirmation')))
          void mutate(() => client.deleteForever(identity), t('clipDeleted'))
        return
      default: {
        const unreachable: never = kind
        throw new Error(`Unknown Clip action: ${String(unreachable)}`)
      }
    }
  }
  const saveMetadata = (field: ClipEditableField, value: string): void => {
    void mutate(
      () =>
        client.update({
          ...identity,
          ...(field === 'note'
            ? { note: value.trim() === '' ? null : value }
            : {
                tags: value
                  .split(/[,，]/u)
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              }),
        }),
      t(field === 'note' ? 'noteSaved' : 'tagsSaved'),
    )
  }
  const restore = (): void => {
    void mutate(() => client.setStatus({ ...identity, status: 'active' }), t('clipRestored'))
  }
  return { busy, quote, startSideChat, action, saveMetadata, restore }
}
