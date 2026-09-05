import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { useBranchMarkUi, type BranchMarkUiController } from '../domain/controller.ts'
import { railBounds, railPosition, railTop } from '../domain/rail-position.ts'
import { BranchMarkLogo } from './BranchMarkLogo.tsx'

interface RailDrag {
  readonly element: HTMLButtonElement
  readonly pointerId: number
  readonly startX: number
  readonly startY: number
  readonly startTop: number
  top: number
  moved: boolean
}

function releaseCapture(drag: RailDrag): void {
  if (drag.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId)
}

/** Collapsed Dock entry, draggable vertically without changing the host layout.
 * @param props - Counts, availability, and the shared browser UI controller.
 * @returns A keyboard-accessible button that remembers its relative position.
 */
export function DockHandle({ count, running, disabled, controller }: {
  readonly count: number
  readonly running: boolean
  readonly disabled: boolean
  readonly controller: BranchMarkUiController
}) {
  const { dock } = useBranchMarkUi(controller)
  const [height, setHeight] = useState(() => window.innerHeight)
  const [liveTop, setLiveTop] = useState<number | null>(null)
  const drag = useRef<RailDrag | null>(null)
  const suppressClick = useRef(false)
  const top = liveTop ?? railTop(dock.railPosition, height)

  useEffect(() => {
    const resize = (): void => {
      const active = drag.current
      drag.current = null
      if (active !== null) {
        suppressClick.current = active.moved
        releaseCapture(active)
      }
      setLiveTop(null)
      setHeight(window.innerHeight)
    }
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      const active = drag.current
      drag.current = null
      if (active !== null) releaseCapture(active)
    }
  }, [])

  const start = (event: PointerEvent<HTMLButtonElement>): void => {
    if (disabled || !event.isPrimary || event.button !== 0 || drag.current !== null) return
    suppressClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      element: event.currentTarget, pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY, startTop: top, top, moved: false,
    }
  }

  const update = (event: PointerEvent<HTMLButtonElement>): RailDrag | null => {
    const active = drag.current
    if (active === null || active.pointerId !== event.pointerId) return null
    if (!active.moved && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 6) return active
    active.moved = true
    const { min, max } = railBounds(height)
    active.top = Math.min(max, Math.max(min, active.startTop + event.clientY - active.startY))
    setLiveTop(active.top)
    return active
  }

  const cancel = (event: PointerEvent<HTMLButtonElement>): void => {
    const active = drag.current
    if (active === null || active.pointerId !== event.pointerId) return
    drag.current = null
    suppressClick.current = active.moved
    releaseCapture(active)
    setLiveTop(null)
  }

  const finish = (event: PointerEvent<HTMLButtonElement>): void => {
    const active = update(event)
    if (active === null) return
    drag.current = null
    suppressClick.current = active.moved
    if (active.moved) controller.setRailPosition(railPosition(active.top, height))
    releaseCapture(active)
    setLiveTop(null)
  }

  const reposition = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey || drag.current !== null) return
    const { min, max } = railBounds(height)
    let target: number
    switch (event.key) {
      case 'ArrowUp': target = top - 24; break
      case 'ArrowDown': target = top + 24; break
      case 'Home': target = min; break
      case 'End': target = max; break
      default: return
    }
    event.preventDefault()
    controller.setRailPosition(railPosition(target, height))
  }

  return (
    <button
      type="button"
      className="dbm-dock-handle"
      aria-label="展开枝签 Dock"
      aria-description="单击展开；沿右侧上下拖动；方向键移动，Home/End 移至边缘"
      title="单击展开枝签；沿右侧上下拖动（↑/↓ 移动）"
      style={{ top }}
      data-dragging={liveTop !== null}
      disabled={disabled}
      onPointerDown={start}
      onPointerMove={event => { if (update(event)?.moved) event.preventDefault() }}
      onPointerUp={finish}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={reposition}
      onClick={event => {
        const suppress = suppressClick.current && event.detail !== 0
        suppressClick.current = false
        if (suppress) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        controller.reopenDock()
      }}
    >
      <BranchMarkLogo compact size={26} />
      {count > 0 && <span className="dbm-dock-handle-count" aria-hidden="true">{count}</span>}
      {running && <i />}
    </button>
  )
}
