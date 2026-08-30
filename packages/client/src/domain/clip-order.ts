/** Client-side ordering rules for one complete active Clip collection. */

import type { Clip, ClipId } from 'dsh-branchmark-host/types'

export type MoveClipResult =
  | { readonly ok: true; readonly clipIds: readonly ClipId[] }
  | { readonly ok: false; readonly reason: 'clip-not-found' | 'pin-group-mismatch' }

/**
 * Move one Clip to another card's position without crossing the pinned-group divider.
 * @param clips - Complete active collection in its current rendered order.
 * @param sourceId - Dragged Clip.
 * @param targetId - Card receiving the drop.
 * @returns Complete replacement order or a stable refusal reason.
 */
export function moveClipInCollection(
  clips: readonly Clip[],
  sourceId: ClipId,
  targetId: ClipId,
): MoveClipResult {
  const sourceIndex = clips.findIndex(clip => clip.id === sourceId)
  const targetIndex = clips.findIndex(clip => clip.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0) return { ok: false, reason: 'clip-not-found' }
  const source = clips[sourceIndex]!
  const target = clips[targetIndex]!
  if ((source.pinnedAt !== undefined) !== (target.pinnedAt !== undefined)) {
    return { ok: false, reason: 'pin-group-mismatch' }
  }
  if (sourceIndex === targetIndex) return { ok: true, clipIds: clips.map(clip => clip.id) }
  const reordered = [...clips]
  reordered.splice(sourceIndex, 1)
  reordered.splice(targetIndex, 0, source)
  return { ok: true, clipIds: reordered.map(clip => clip.id) }
}
