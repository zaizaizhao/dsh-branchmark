/** Escape belongs to an active dialog, menu, or sorting gesture before the Dock. */
import { useEffect } from 'react'
import type { BranchMarkUiController } from '../../domain/controller.ts'

/** Preserve modal and drag dismissal while supporting the Dock's own Escape action.
 * @param controller - Dock state owner.
 * @param launcherOpen - Whether Escape closes the launcher before minimizing the Dock.
 */
export function useDockEscape(controller: BranchMarkUiController, launcherOpen: boolean): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (
        document.querySelector(
          '[role="dialog"][aria-modal="true"], [role="menu"], [data-dragging="true"]',
        ) !== null
      )
        return
      if (launcherOpen) controller.closeLauncher()
      else controller.collapseDock()
    }
    // Capture observes dialogs before DSH's document listener removes them.
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [controller, launcherOpen])
}
