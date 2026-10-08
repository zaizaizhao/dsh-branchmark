/** Multi-selection actions share the same compact commands as individual cards. */
import {
  IconBranchOutlineMedium,
  IconEllipsisOutlineMedium,
  IconPaperclipOutlineMedium,
  IconSparkleMedium,
  Menu,
  Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useBranchMarkText } from '../shared/text.ts'

/** Render the batch toolbar only after the collection selects several Clips.
 * @param props - Selection state and public batch action callbacks.
 * @returns Primary commands plus a host-owned metadata menu and tag editor.
 */
export function ClipBatchActions({
  count,
  open,
  tagEditorOpen,
  tagValue,
  allPinned,
  canQuote,
  busy = false,
  onOpenChange,
  onTagValueChange,
  onCloseTagEditor,
  onApplyTags,
  onQuote,
  onSideChat,
  onNewSession,
  onTogglePinned,
  onOpenTagEditor,
  onTrash,
  onClearSelection,
}: {
  readonly count: number
  readonly open: boolean
  readonly tagEditorOpen: boolean
  readonly tagValue: string
  readonly allPinned: boolean
  readonly canQuote: boolean
  readonly busy?: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onTagValueChange: (value: string) => void
  readonly onCloseTagEditor: () => void
  readonly onApplyTags: () => void
  readonly onQuote: () => void
  readonly onSideChat: () => void
  readonly onNewSession: () => void
  readonly onTogglePinned: () => void
  readonly onOpenTagEditor: () => void
  readonly onTrash: () => void
  readonly onClearSelection: () => void
}) {
  const t = useBranchMarkText()
  return (
    <div className="dbm-batch-toolbar" role="region" aria-label={t('batchActions')}>
      <div className="dbm-batch-heading">
        <strong>{t('selectedCount', { count })}</strong>
        <button type="button" className="dbm-button" disabled={busy} onClick={onClearSelection}>
          {t('clearSelection')}
        </button>
      </div>
      <div className="dbm-batch-actions">
        <button type="button" className="dbm-button dbm-button-branch" disabled={busy} onClick={onNewSession}>
          <IconBranchOutlineMedium size={13} />
          {t('newSession')}
        </button>
        <button type="button" className="dbm-button" disabled={busy || !canQuote} onClick={onQuote}>
          <IconPaperclipOutlineMedium size={13} />
          {t('quote')}
        </button>
        <button type="button" className="dbm-button" disabled={busy} onClick={onSideChat}>
          <IconSparkleMedium size={13} />
          {t('sideChat')}
        </button>
        <Menu
          open={open}
          portal
          align="end"
          side="top"
          compact
          onClose={() => {
            onOpenChange(false)
          }}
          items={[
            { id: 'pin', label: t(allPinned ? 'unpin' : 'pin'), disabled: busy },
            { id: 'tags', label: t('addTags'), disabled: busy },
            { id: 'trash', label: t('moveToTrash'), danger: true, disabled: busy },
          ]}
          onSelect={(id) => {
            onOpenChange(false)
            if (id === 'pin') onTogglePinned()
            else if (id === 'tags') onOpenTagEditor()
            else if (id === 'trash') onTrash()
          }}
          anchor={
            <button
              type="button"
              className="dbm-button dbm-icon-button"
              disabled={busy}
              aria-label={t('moreActions')}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => {
                onOpenChange(!open)
              }}
            >
              <IconEllipsisOutlineMedium />
            </button>
          }
        />
      </div>
      <Modal
        open={tagEditorOpen}
        onClose={onCloseTagEditor}
        title={t('selectionTags', { count })}
        closeLabel={t('close')}
        className="dbm-edit-modal"
        footer={
          <button
            type="button"
            className="dbm-button dbm-button-primary"
            disabled={busy || tagValue.trim() === ''}
            onClick={onApplyTags}
          >
            {t('applyTags')}
          </button>
        }
      >
        <label className="dbm-field-label">
          {t('tags')}
          <input
            className="dbm-input"
            value={tagValue}
            placeholder={t('tagPlaceholder')}
            onChange={(event) => {
              onTagValueChange(event.target.value)
            }}
            autoFocus
          />
        </label>
      </Modal>
    </div>
  )
}
