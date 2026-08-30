/** Pure current-lineage projection for the plugin-owned relationship view. */

import type { SessionId, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'

export interface ClipLineageRow {
  readonly session: SessionSummary
  readonly depth: number
  /** Stable palette index inherited from the root's first child. */
  readonly branch: number | null
}

const BRANCH_COLOR_COUNT = 6

function paletteIndex(id: SessionId): number {
  let hash = 2166136261
  for (const char of id) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % BRANCH_COLOR_COUNT
}

function lineageRoot(current: SessionId, byId: Readonly<Record<SessionId, SessionSummary>>): SessionId {
  const seen = new Set<SessionId>()
  let cursor = current
  while (!seen.has(cursor)) {
    seen.add(cursor)
    const parent = byId[cursor]?.parentId
    if (parent === undefined || byId[parent] === undefined) return cursor
    cursor = parent
  }
  return current
}

/**
 * Return the current Session's complete known tree with stable sibling order.
 * Missing parents and cycles keep the current Session visible as a root.
 */
export function deriveCurrentLineage(
  ids: readonly SessionId[],
  byId: Readonly<Record<SessionId, SessionSummary>>,
  current: SessionId,
): readonly ClipLineageRow[] {
  const root = lineageRoot(current, byId)
  const children = new Map<SessionId, SessionId[]>()
  for (const id of ids) {
    const parent = byId[id]?.parentId
    if (parent === undefined || byId[parent] === undefined) continue
    const siblings = children.get(parent) ?? []
    siblings.push(id)
    children.set(parent, siblings)
  }
  const rows: ClipLineageRow[] = []
  const visited = new Set<SessionId>()
  const visit = (id: SessionId, depth: number, branch: number | null): void => {
    if (visited.has(id)) return
    const session = byId[id]
    if (session === undefined) return
    visited.add(id)
    rows.push({ session, depth, branch })
    for (const child of children.get(id) ?? []) {
      visit(child, depth + 1, depth === 0 ? paletteIndex(child) : branch)
    }
  }
  visit(root, 0, null)
  if (!visited.has(current) && byId[current] !== undefined) visit(current, 0, null)
  return Object.freeze(rows)
}
