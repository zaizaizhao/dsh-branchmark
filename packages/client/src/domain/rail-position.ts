/** Geometry for the collapsed Dock's single-axis browser preference. */

/** Fixed handle height shared with its CSS. */
export const BRANCHMARK_RAIL_HEIGHT = 58

/** Available top coordinates, retaining a margin when the viewport has room.
 * @param height - Viewport height in CSS pixels.
 * @returns The inclusive vertical travel limits.
 */
export function railBounds(height: number): { readonly min: number; readonly max: number } {
  const margin = Math.min(12, Math.max(0, (height - BRANCHMARK_RAIL_HEIGHT) / 2))
  return { min: margin, max: Math.max(margin, height - BRANCHMARK_RAIL_HEIGHT - margin) }
}

/** Resolve a saved fraction or the default position above DSH's centered navigation.
 * @param position - Fraction of available travel, or null for the default.
 * @param height - Viewport height in CSS pixels.
 * @returns The bounded top coordinate in CSS pixels.
 */
export function railTop(position: number | null, height: number): number {
  const { min, max } = railBounds(height)
  const requested = position === null
    ? (height - BRANCHMARK_RAIL_HEIGHT) / 2 - 120
    : min + position * (max - min)
  return Math.round(Math.min(max, Math.max(min, requested)))
}

/** Convert a release coordinate into a viewport-independent preference.
 * @param top - Requested top coordinate in CSS pixels.
 * @param height - Viewport height in CSS pixels.
 * @returns A fraction from zero through one.
 */
export function railPosition(top: number, height: number): number {
  const { min, max } = railBounds(height)
  return max === min ? 0 : Math.min(1, Math.max(0, (top - min) / (max - min)))
}
