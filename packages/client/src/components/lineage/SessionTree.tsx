/** Responsive, keyboard-addressable presentation of persisted Session relationships. */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ClipLineageRow } from '../../domain/lineage.ts'
import { layoutLineage, lineagePath } from '../../domain/lineage-layout.ts'
import { useBranchMarkText } from '../shared/text.ts'

const MODE_KEYS = {
  root: 'rootSession',
  'full-fork': 'fullFork',
  'clips-only': 'clipsOnly',
  blank: 'blankBranch',
} as const

/** Render a tree whose nodes open the actual DSH Session.
 * @param props - Known lineage, current Session, layout mode, and navigation callback.
 * @returns Scrollable SVG branches beneath accessible Session buttons.
 */
export function SessionTree({
  rows,
  current,
  overview = false,
  onOpen,
}: {
  readonly rows: readonly ClipLineageRow[]
  readonly current: SessionId | undefined
  readonly overview?: boolean
  readonly onOpen: (id: SessionId) => void
}) {
  const t = useBranchMarkText()
  const viewport = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(340)
  useEffect(() => {
    const element = viewport.current
    if (element === null) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry !== undefined) setWidth(entry.contentRect.width)
    })
    setWidth(element.clientWidth)
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])
  const layout = useMemo(() => layoutLineage(rows, width, overview), [rows, width, overview])
  const points = new Map(layout.points.map((point) => [point.row.session.id, point]))
  return (
    <div className="dbm-tree-host">
      <div className="dbm-tree-viewport" ref={viewport} aria-label={t('sessionTree')}>
        <div
          className="dbm-tree-canvas"
          data-layout={layout.outline ? 'outline' : 'tree'}
          style={{ width: layout.width, height: layout.height }}
        >
          <svg className="dbm-branch-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
            {layout.points.map((point) => {
              const parent = point.row.parentId === undefined ? undefined : points.get(point.row.parentId)
              return parent === undefined ? null : (
                <path
                  key={point.row.session.id}
                  data-mode={point.row.mode}
                  d={lineagePath(parent, point, layout.outline)}
                />
              )
            })}
          </svg>
          {layout.points.map(({ row, x, y, width: nodeWidth }) => (
            <button
              key={row.session.id}
              type="button"
              className="dbm-tree-node"
              data-root={row.depth === 0}
              data-current={row.session.id === current}
              data-mode={row.mode}
              data-session-id={row.session.id}
              aria-current={row.session.id === current ? 'page' : undefined}
              disabled={row.session.available === false}
              aria-label={t('openSession', { title: row.session.displayTitle })}
              title={row.session.displayTitle}
              style={{ left: x, top: y, width: nodeWidth }}
              onClick={() => {
                onOpen(row.session.id)
              }}
            >
              <span className="dbm-bud" aria-hidden="true">
                <i />
              </span>
              <span className="dbm-tree-copy">
                <strong>{row.session.displayTitle}</strong>
                <small>
                  {t(
                    row.session.available === false
                      ? 'sessionUnavailable'
                      : row.session.id === current
                        ? 'currentSession'
                        : MODE_KEYS[row.mode],
                  )}
                </small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="dbm-tree-key">
        {(['full-fork', 'clips-only', 'blank'] as const).map((mode) => (
          <span key={mode} data-mode={mode}>
            <i />
            {t(MODE_KEYS[mode])}
          </span>
        ))}
      </div>
    </div>
  )
}
