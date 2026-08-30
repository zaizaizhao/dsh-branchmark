import type { CreateClipRequest } from 'dsh-branchmark-host/types'
import type { ClipSelectionCandidate } from './controller.ts'

/** User intent exposed by the text-selection toolbar. */
export type SelectionIntent = 'save-session' | 'save-project' | 'side-chat' | 'reference'

/** Viewport position of the text-selection toolbar. */
export interface SelectionToolbarPosition {
  readonly left: number
  readonly top: number
  readonly placement: 'above' | 'below'
}

interface Size {
  readonly width: number
  readonly height: number
}

/** Build Host requests while keeping follow-up actions private to the source Session.
 * @param candidates - Durable message selections captured from visible Chat rows.
 * @param intent - Explicit toolbar action selected by the user.
 * @returns One Clip creation request for each source message selection.
 */
export function selectionCreateRequests(
  candidates: readonly ClipSelectionCandidate[],
  intent: SelectionIntent,
): readonly CreateClipRequest[] {
  const scope = intent === 'save-project' ? 'project' : 'session'
  return candidates.map(candidate => ({
    workspaceId: candidate.workspaceId,
    ownerSessionId: candidate.ownerSessionId,
    source: candidate.source,
    excerpt: candidate.excerpt,
    scope,
  }))
}

/** Place the selection toolbar inside the viewport and prefer the space above the selection.
 * @param candidates - Selected Chat fragments with viewport-relative rectangles.
 * @param toolbar - Measured toolbar dimensions.
 * @param viewport - Current browser viewport dimensions.
 * @returns Clamped viewport coordinates and the chosen vertical placement.
 */
export function selectionToolbarPosition(
  candidates: readonly ClipSelectionCandidate[],
  toolbar: Size,
  viewport: Size,
): SelectionToolbarPosition {
  const margin = 10
  const gap = 8
  const selectionLeft = Math.min(...candidates.map(candidate => candidate.rect.left))
  const selectionRight = Math.max(...candidates.map(candidate => candidate.rect.left + candidate.rect.width))
  const selectionTop = Math.min(...candidates.map(candidate => candidate.rect.top))
  const selectionBottom = Math.max(...candidates.map(candidate => candidate.rect.top + candidate.rect.height))
  const maximumLeft = Math.max(margin, viewport.width - toolbar.width - margin)
  const left = Math.min(maximumLeft, Math.max(margin, (selectionLeft + selectionRight - toolbar.width) / 2))
  const above = selectionTop - toolbar.height - gap
  if (above >= margin) return { left, top: above, placement: 'above' }
  return {
    left,
    top: Math.min(
      Math.max(margin, viewport.height - toolbar.height - margin),
      Math.max(margin, selectionBottom + gap),
    ),
    placement: 'below',
  }
}
