/** Tree geometry follows actual parentage across every context mode. */
import { describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { DerivedSessionRelation } from 'dsh-branchmark-host/types'
import { deriveCurrentLineage, mergeLineageSessions } from '../src/domain/lineage.ts'
import { layoutLineage } from '../src/domain/lineage-layout.ts'

const id = (value: string) => value as SessionId
const rows = ['root', 'full', 'clips', 'blank', 'grandchild'].map((value) => ({
  id: id(value),
  displayTitle: value,
  running: false,
  blank: false,
  updatedAt: 0,
  ...(value === 'full' ? { parentId: id('root') } : {}),
}))
const byId = Object.fromEntries(rows.map((row) => [row.id, row]))
const relations: DerivedSessionRelation[] = [
  { derivedSessionId: id('clips'), parentSessionId: id('root'), mode: 'clips-only', attachedClipIds: [] },
  { derivedSessionId: id('blank'), parentSessionId: id('full'), mode: 'blank', attachedClipIds: [] },
  { derivedSessionId: id('grandchild'), parentSessionId: id('blank'), mode: 'blank', attachedClipIds: [] },
].map((relation) => ({ ...relation, workspaceId: 'workspace' as WorkspaceId, createdAt: '2026-09-01' }))

describe('Session tree projection', () => {
  it('retains twelve persisted nodes when the native catalog lists only three material Sessions', () => {
    const metadata = Array.from({ length: 12 }, (_, index) => ({
      sessionId: id(`session-${index}`),
      title: `Saved title ${index}`,
      available: index !== 11,
    }))
    const native = metadata.slice(0, 3).map((session) => ({
      id: session.sessionId,
      displayTitle: `Live ${session.title}`,
      ...(session.sessionId === id('session-1') ? {} : { title: `Live ${session.title}` }),
    }))
    const links: DerivedSessionRelation[] = metadata.slice(1).map((session, index) => ({
      derivedSessionId: session.sessionId,
      parentSessionId: metadata[index === 10 ? 9 : Math.floor(index / 3)]!.sessionId,
      mode: index < 2 ? 'full-fork' : index % 2 === 0 ? 'clips-only' : 'blank',
      attachedClipIds: [],
      workspaceId: 'workspace' as WorkspaceId,
      createdAt: '2026-09-01',
    }))
    const merged = mergeLineageSessions(native, metadata, 'Untitled')
    const tree = deriveCurrentLineage(
      metadata.map((session) => session.sessionId),
      merged,
      metadata[0]!.sessionId,
      links,
    )
    expect(tree).toHaveLength(12)
    expect(tree[0]!.session.displayTitle).toBe('Live Saved title 0')
    expect(tree.find((row) => row.session.id === id('session-1'))?.session.displayTitle).toBe('Saved title 1')
    expect(tree.find((row) => row.session.id === id('session-10'))?.session.displayTitle).toBe(
      'Saved title 10',
    )
    expect(tree.find((row) => row.session.id === id('session-11'))?.session.available).toBe(false)
    expect(Math.max(...tree.map((row) => row.depth))).toBe(3)
  })

  it('keeps full, clips-only, and blank branches in the same family from any selected child', () => {
    const projected = deriveCurrentLineage(
      rows.map((row) => row.id),
      byId,
      id('grandchild'),
      relations,
    )
    expect(projected.map((row) => [row.session.id, row.parentId, row.depth, row.mode])).toEqual([
      ['root', undefined, 0, 'root'],
      ['full', 'root', 1, 'full-fork'],
      ['blank', 'full', 2, 'blank'],
      ['grandchild', 'blank', 3, 'blank'],
      ['clips', 'root', 1, 'clips-only'],
    ])
  })

  it('places the root above its descendants and reserves readable space on narrow screens', () => {
    const projected = deriveCurrentLineage(
      rows.map((row) => row.id),
      byId,
      id('root'),
      relations,
    )
    for (const [width, overview] of [
      [1024, true],
      [340, false],
      [360, true],
    ] as const) {
      const layout = layoutLineage(projected, width, overview)
      const points = new Map(layout.points.map((point) => [point.row.session.id, point]))
      for (const point of layout.points) {
        expect(point.x - point.width / 2).toBeGreaterThanOrEqual(0)
        expect(point.x + point.width / 2).toBeLessThanOrEqual(layout.width)
        if (point.row.parentId !== undefined)
          expect(point.y).toBeGreaterThan(points.get(point.row.parentId)!.y)
      }
      const grouped = new Map<number, (typeof layout.points)[number][]>()
      for (const point of layout.points) grouped.set(point.y, [...(grouped.get(point.y) ?? []), point])
      for (const siblings of grouped.values()) {
        siblings.sort((a, b) => a.x - b.x)
        for (let index = 1; index < siblings.length; index++) {
          expect(siblings[index]!.x - siblings[index]!.width / 2).toBeGreaterThan(
            siblings[index - 1]!.x + siblings[index - 1]!.width / 2,
          )
        }
      }
    }
  })

  it('terminates malformed cyclic relations and keeps a selected orphan visible', () => {
    const cycle = [
      ...relations,
      { ...relations[1]!, derivedSessionId: id('root'), parentSessionId: id('grandchild') },
    ]
    const projected = deriveCurrentLineage(
      rows.map((row) => row.id),
      byId,
      id('blank'),
      cycle,
    )
    expect(new Set(projected.map((row) => row.session.id)).size).toBe(projected.length)
    expect(projected.some((row) => row.session.id === 'blank')).toBe(true)
    expect(
      deriveCurrentLineage([id('blank')], { [id('blank')]: byId.blank! }, id('blank'), relations).map(
        (row) => row.session.id,
      ),
    ).toEqual(['blank'])
  })
})
