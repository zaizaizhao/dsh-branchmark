/** Pure current-lineage projection for the plugin-owned relationship view. */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  DerivedSessionMode,
  DerivedSessionRelation,
  RelatedSessionSummary,
} from 'dsh-branchmark-host/types'

/** Session fields consumed by the relationship view, independent of list visibility. */
export interface LineageSession {
  readonly id: SessionId
  readonly displayTitle: string
  readonly title?: string
  readonly parentId?: SessionId
  readonly available?: boolean
}

export interface ClipLineageRow {
  readonly session: LineageSession
  readonly depth: number
  readonly parentId?: SessionId
  readonly mode: DerivedSessionMode | 'root'
  /** Stable palette index inherited from the root's first child. */
  readonly branch: number | null
}

/** Merge persisted relationship endpoints with the live Session catalog.
 * @param native - Workspace-filtered native Session summaries.
 * @param related - Metadata for endpoints omitted from the native list.
 * @param fallbackTitle - Locale-owned title for an untitled or unavailable Session.
 * @returns Unique endpoints; live summaries own current titles and status.
 */
export function mergeLineageSessions(
  native: readonly LineageSession[],
  related: readonly RelatedSessionSummary[],
  fallbackTitle: string,
): Readonly<Record<SessionId, LineageSession>> {
  const result: Record<SessionId, LineageSession> = {}
  for (const session of related) {
    result[session.sessionId] = {
      id: session.sessionId,
      displayTitle: session.title ?? fallbackTitle,
      ...(session.title === undefined ? {} : { title: session.title }),
      available: session.available,
      ...(session.nativeParentId === undefined ? {} : { parentId: session.nativeParentId }),
    }
  }
  for (const session of native) {
    result[session.id] = {
      ...session,
      displayTitle: session.title ?? result[session.id]?.title ?? session.displayTitle,
    }
  }
  return result
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

function lineageRoot(current: SessionId, parents: ReadonlyMap<SessionId, SessionId>): SessionId {
  const seen = new Set<SessionId>()
  let cursor = current
  while (!seen.has(cursor)) {
    seen.add(cursor)
    const parent = parents.get(cursor)
    if (parent === undefined) return cursor
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
  byId: Readonly<Record<SessionId, LineageSession>>,
  current: SessionId,
  relations: readonly DerivedSessionRelation[] = [],
): readonly ClipLineageRow[] {
  const known = new Set(ids)
  const relationById = new Map(relations.map((relation) => [relation.derivedSessionId, relation]))
  const parents = new Map<SessionId, SessionId>()
  for (const id of ids) {
    const relation = relationById.get(id)
    const parent = relation?.parentSessionId ?? relation?.sourceSessionId ?? byId[id]?.parentId
    if (parent !== undefined && known.has(parent) && byId[parent] !== undefined && parent !== id)
      parents.set(id, parent)
  }
  const root = lineageRoot(current, parents)
  const children = new Map<SessionId, SessionId[]>()
  for (const id of ids) {
    const parent = parents.get(id)
    if (parent === undefined) continue
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
    const parentId = depth === 0 ? undefined : parents.get(id)
    const mode = relationById.get(id)?.mode ?? (parentId === undefined ? 'root' : 'full-fork')
    rows.push({ session, depth, branch, mode, ...(parentId === undefined ? {} : { parentId }) })
    for (const child of children.get(id) ?? []) {
      visit(child, depth + 1, depth === 0 ? paletteIndex(child) : branch)
    }
  }
  visit(root, 0, null)
  if (!visited.has(current) && byId[current] !== undefined) visit(current, 0, null)
  return Object.freeze(rows)
}
