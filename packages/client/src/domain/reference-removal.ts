/** Draft fields needed to remove one structured Composer occurrence. */
export interface RemovableReferenceOccurrence {
  readonly offset: number
  readonly length: number
}

/** Build the public full-draft writes used to remove one reference.
 * @param draft - Current Composer display draft.
 * @param occurrence - Structured reference range in the current draft.
 * @returns Full replacement drafts in write order.
 */
export function referenceRemovalDrafts(
  draft: string,
  occurrence: RemovableReferenceOccurrence,
): readonly string[] {
  const rawEnd = occurrence.offset + occurrence.length
  const end = draft[rawEnd] === ' ' ? rawEnd + 1 : rawEnd
  let marker = '\u2063'
  while (draft.includes(marker)) marker += '\u2063'
  const marked = draft.slice(0, occurrence.offset) + marker + draft.slice(rawEnd)
  const finalDraft = marked.slice(0, occurrence.offset) + marked.slice(occurrence.offset + marker.length + (end - rawEnd))
  return [marked, finalDraft]
}
