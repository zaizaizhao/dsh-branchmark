/** Full immutable Clip reading through the host's modal primitive. */
import { IconPaperclipOutline16, MarkdownText, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Clip } from 'dsh-branchmark-host/types'
import { formatClipSource } from '../../domain/clip-presentation.ts'
import { BRANCHMARK_MARKDOWN_LABELS } from '../markdown.ts'
import { useBranchMarkText } from '../shared/text.ts'

/** Read a Clip in full with an optional Composer attachment action.
 * @param props - Clip, visibility, and explicit close/quote callbacks.
 * @returns A scrollable, labelled reading dialog.
 */
export function ClipFocusDialog({
  clip,
  open,
  onClose,
  onQuote,
}: {
  readonly clip: Clip
  readonly open: boolean
  readonly onClose: () => void
  readonly onQuote?: () => void
}) {
  const t = useBranchMarkText()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('excerptTitle')}
      closeLabel={t('close')}
      description={formatClipSource(clip)}
      className="dbm-focus-modal"
      contentClassName="dbm-focus-modal-content"
      footer={
        <div className="dbm-focus-actions">
          {onQuote !== undefined && (
            <button type="button" className="dbm-button" onClick={onQuote}>
              <IconPaperclipOutline16 size={13} />
              {t('quote')}
            </button>
          )}
          <button type="button" className="dbm-button dbm-button-primary" onClick={onClose}>
            {t('done')}
          </button>
        </div>
      }
    >
      <div className="dbm-focus-copy">
        <MarkdownText text={clip.excerpt} labels={BRANCHMARK_MARKDOWN_LABELS} />
      </div>
      {clip.note !== undefined && (
        <div className="dbm-focus-note">
          <strong>{t('note')}</strong>
          <p>{clip.note}</p>
        </div>
      )}
    </Modal>
  )
}
