/** Secondary Clip operations use the host's accessible anchored menu. */
import { useState } from 'react'
import {
  IconEditOutline16,
  IconEllipsisOutline16,
  IconFullscreenOutline16,
  IconTrashOutline16,
  Menu,
  type MenuEntry,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { Clip } from 'dsh-branchmark-host/types'
import { useBranchMarkText } from '../shared/text.ts'

export type ClipMenuAction = 'focus' | 'note' | 'tags' | 'pin' | 'project' | 'trash' | 'delete'

/** Render compact metadata actions without crowding the three primary card actions.
 * @param props - Clip state, pending mutation, and action dispatcher.
 * @returns A labelled menu trigger and host-owned menu.
 */
export function ClipCardMenu({
  clip,
  busy,
  onAction,
}: {
  readonly clip: Clip
  readonly busy: boolean
  readonly onAction: (action: ClipMenuAction) => void
}) {
  const t = useBranchMarkText()
  const [open, setOpen] = useState(false)
  const items: MenuEntry[] =
    clip.status === 'trashed'
      ? [
          { id: 'focus', label: t('focusReading'), icon: <IconFullscreenOutline16 /> },
          { id: 'delete', label: t('deleteForever'), danger: true, icon: <IconTrashOutline16 /> },
        ]
      : [
          { id: 'focus', label: t('focusReading'), icon: <IconFullscreenOutline16 /> },
          { id: 'note', label: t('editNote'), icon: <IconEditOutline16 /> },
          { id: 'tags', label: t('editTags') },
          { id: 'pin', label: t(clip.pinnedAt === undefined ? 'pin' : 'unpin') },
          ...(clip.scope === 'session' ? [{ id: 'project', label: t('saveToProject') }] : []),
          { type: 'separator', id: 'separator' },
          { id: 'trash', label: t('moveToTrash'), danger: true, icon: <IconTrashOutline16 /> },
        ]
  return (
    <span
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <Menu
        open={open}
        portal
        align="end"
        compact
        items={items}
        className="dbm-card-menu"
        onClose={() => {
          setOpen(false)
        }}
        onSelect={(id) => {
          const action = id as ClipMenuAction
          setOpen(false)
          onAction(action)
        }}
        anchor={
          <button
            type="button"
            className="dbm-button dbm-icon-button"
            aria-label={t('moreActions')}
            aria-haspopup="menu"
            aria-expanded={open}
            disabled={busy}
            onClick={() => {
              setOpen((value) => !value)
            }}
          >
            <IconEllipsisOutline16 />
          </button>
        }
      />
    </span>
  )
}
