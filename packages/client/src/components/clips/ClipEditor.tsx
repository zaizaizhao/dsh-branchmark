/** Focused editing of mutable Clip metadata. */
import { useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Clip } from 'dsh-branchmark-host/types'
import { useBranchMarkText } from '../shared/text.ts'

/** Edit a note or tags while leaving the source excerpt immutable.
 * @param props - Current Clip, editable field, commit callback, and dismiss callback.
 * @returns A host-owned modal with a labelled form.
 */
export function ClipEditor({
  clip,
  field,
  busy,
  onSave,
  onClose,
}: {
  readonly clip: Clip
  readonly field: 'note' | 'tags'
  readonly busy: boolean
  readonly onSave: (value: string) => void
  readonly onClose: () => void
}) {
  const t = useBranchMarkText()
  const [value, setValue] = useState(field === 'note' ? (clip.note ?? '') : clip.tags.join(', '))
  return (
    <Modal
      open
      onClose={onClose}
      title={t(field === 'note' ? 'editNote' : 'editTags')}
      closeLabel={t('close')}
      className="dbm-edit-modal"
      footer={
        <div className="dbm-focus-actions">
          <button type="button" className="dbm-button" disabled={busy} onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className="dbm-button dbm-button-primary"
            disabled={busy}
            onClick={() => {
              onSave(value)
            }}
          >
            {t('save')}
          </button>
        </div>
      }
    >
      <label className="dbm-field-label">
        {t(field)}
        {field === 'note' ? (
          <textarea
            className="dbm-textarea"
            rows={5}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
            }}
            autoFocus
          />
        ) : (
          <input
            className="dbm-input"
            value={value}
            placeholder={t('tagPlaceholder')}
            onChange={(event) => {
              setValue(event.target.value)
            }}
            autoFocus
          />
        )}
      </label>
    </Modal>
  )
}
