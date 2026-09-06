/** Pure top-down and narrow-outline coordinates for a known Session tree. */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ClipLineageRow } from './lineage.ts'

export interface LineagePoint {
  readonly row: ClipLineageRow
  readonly x: number
  readonly y: number
  readonly width: number
}

export interface LineageLayout {
  readonly points: readonly LineagePoint[]
  readonly width: number
  readonly height: number
  readonly outline: boolean
}

/** Position parents above children, retaining readable labels at narrow widths.
 * @param rows - A preorder projection with cycle-free parent references.
 * @param availableWidth - Width of the scrollable viewport in CSS pixels.
 * @param overview - Whether the full tree may use a wide branching layout.
 * @returns Canvas dimensions and node centers; large trees remain scrollable.
 */
export function layoutLineage(
  rows: readonly ClipLineageRow[],
  availableWidth: number,
  overview: boolean,
): LineageLayout {
  const outline = !overview || availableWidth < 640
  const children = new Map<SessionId, SessionId[]>()
  for (const row of rows) {
    if (row.parentId === undefined) continue
    const siblings = children.get(row.parentId) ?? []
    siblings.push(row.session.id)
    children.set(row.parentId, siblings)
  }
  const depth = Math.max(0, ...rows.map((row) => row.depth))
  if (outline) {
    const width = Math.max(availableWidth, depth * 22 + 220)
    return {
      outline,
      width,
      height: rows.length * 78 + 8,
      points: rows.map((row, index) => {
        const left = row.depth * 22 + 6
        const nodeWidth = width - left - 6
        return { row, x: left + nodeWidth / 2, y: index * 78 + 36, width: nodeWidth }
      }),
    }
  }
  const leaves = rows.filter((row) => !children.has(row.session.id)).length
  const width = Math.max(availableWidth, leaves * 146 + 32)
  const positions = new Map<SessionId, number>()
  let leaf = 0
  for (const row of [...rows].reverse()) {
    const next = children.get(row.session.id) ?? []
    const childPositions = next.flatMap((id) => (positions.has(id) ? [positions.get(id)!] : []))
    positions.set(
      row.session.id,
      childPositions.length === 0
        ? width - 16 - ((leaf++ + 0.5) * (width - 32)) / Math.max(1, leaves)
        : (Math.min(...childPositions) + Math.max(...childPositions)) / 2,
    )
  }
  return {
    outline,
    width,
    height: (depth + 1) * 136,
    points: rows.map((row) => ({
      row,
      x: positions.get(row.session.id)!,
      y: 46 + row.depth * 136,
      width: row.depth === 0 ? 164 : 130,
    })),
  }
}

/** Draw one curved branch between measured node centers.
 * @param parent - Parent node coordinates.
 * @param child - Child node coordinates.
 * @param outline - Whether connections enter the child's left edge.
 * @returns An SVG cubic Bézier path.
 */
export function lineagePath(parent: LineagePoint, child: LineagePoint, outline: boolean): string {
  if (outline) {
    const x = parent.x - parent.width / 2 + 12
    const endX = child.x - child.width / 2
    return `M ${x} ${parent.y + 31} V ${child.y - 12} Q ${x} ${child.y} ${endX} ${child.y}`
  }
  const startY = parent.y + 38
  const endY = child.y - 34
  const mid = (startY + endY) / 2
  return `M ${parent.x} ${startY} C ${parent.x} ${mid}, ${child.x} ${mid}, ${child.x} ${endY}`
}
