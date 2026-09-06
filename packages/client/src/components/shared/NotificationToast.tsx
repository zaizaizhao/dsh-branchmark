/** Short-lived action feedback, including one explicit reversible operation. */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBranchMarkUi, type BranchMarkUiController } from '../../domain/controller.ts'
import { useBranchMarkText } from './text.ts'

/** Keep feedback above host dialogs without changing the Dock's stacking order.
 * @param props - Shared UI controller.
 * @returns A dismissible notification, with Undo when the operation is reversible.
 */
export function NotificationToast({ controller }: { readonly controller: BranchMarkUiController }) {
  const t = useBranchMarkText()
  const { toast } = useBranchMarkUi(controller)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (toast === null || busy) return
    const timer = window.setTimeout(
      () => {
        controller.dismissToast(toast.nonce)
      },
      toast.undo === undefined ? 3200 : 8000,
    )
    return () => {
      window.clearTimeout(timer)
    }
  }, [controller, toast, busy])
  if (toast === null) return null
  const undo = async (): Promise<void> => {
    if (toast.undo === undefined) return
    setBusy(true)
    try {
      await toast.undo.run()
      controller.clipsChanged()
      if (controller.getSnapshot().toast?.nonce === toast.nonce) controller.notify('success', t('undone'))
    } catch (error) {
      controller.notify('error', error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }
  return createPortal(
    <div className="dbm-toast" data-kind={toast.kind} role={toast.kind === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{toast.kind === 'success' ? '✓' : '!'}</span>
      <span>{toast.text}</span>
      {toast.undo !== undefined && (
        <button
          type="button"
          className="dbm-button"
          disabled={busy}
          onClick={() => {
            void undo()
          }}
        >
          {toast.undo.label}
        </button>
      )}
      <button
        type="button"
        className="dbm-button dbm-icon-button"
        aria-label={t('close')}
        disabled={busy}
        onClick={() => {
          controller.dismissToast(toast.nonce)
        }}
      >
        ×
      </button>
    </div>,
    document.body,
  )
}
