// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DockHandle } from '../src/components/DockHandle.tsx'
import {
  BranchMarkUiController, browserBranchMarkUiPreferenceStore,
} from '../src/domain/controller.ts'

let root: Root | undefined
let container: HTMLDivElement

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('innerHeight', 720)
  container = document.createElement('div')
  document.body.append(container)
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = undefined
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mount(controller = new BranchMarkUiController(), disabled = false) {
  root = createRoot(container)
  act(() => { root?.render(createElement(DockHandle, { count: 3, running: false, disabled, controller })) })
  const button = container.querySelector('button')!
  const captures = new Set<number>()
  button.setPointerCapture = vi.fn(id => { captures.add(id) })
  button.hasPointerCapture = id => captures.has(id)
  button.releasePointerCapture = vi.fn(id => { captures.delete(id) })
  return { button, controller, captures }
}

function pointer(button: HTMLButtonElement, type: string, x: number, y: number, extra: PointerEventInit = {}) {
  act(() => {
    button.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: x, clientY: y,
      pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse', ...extra,
    }))
  })
}

function click(button: HTMLButtonElement, detail = 1) {
  act(() => { button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail })) })
}

function top(button: HTMLButtonElement) { return Number.parseFloat(button.style.top) }

describe('right-edge Dock handle', () => {
  it('starts above the centered DSH turn navigation without changing horizontal placement', () => {
    const { button } = mount()
    expect(top(button)).toBe(211)
    expect(top(button) + 58).toBeLessThan(315)
    expect(button.style.left).toBe('')
  })

  it('moves vertically, persists the release position, and does not open after a drag', () => {
    const data = new Map<string, string>()
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value) },
    } as Storage
    const preferences = browserBranchMarkUiPreferenceStore(storage)
    const { button, controller, captures } = mount(new BranchMarkUiController(preferences))
    pointer(button, 'pointerdown', 1257, 240)
    pointer(button, 'pointermove', 900, 440)
    expect(top(button)).toBe(411)
    expect(data.size).toBe(0)
    pointer(button, 'pointerup', 900, 440)
    click(button)
    expect(controller.getSnapshot().dock.mode).toBe('rail')
    expect(captures.size).toBe(0)
    expect(button.style.left).toBe('')
    const restored = new BranchMarkUiController(preferences)
    expect(restored.getSnapshot().dock.railPosition).toBeCloseTo((411 - 12) / 638)
    click(button)
    expect(controller.getSnapshot().dock.mode).toBe('expanded')
  })

  it('keeps a click with small pointer jitter as a normal open action', () => {
    const { button, controller } = mount()
    pointer(button, 'pointerdown', 1257, 240)
    pointer(button, 'pointermove', 1258, 242)
    pointer(button, 'pointerup', 1258, 242)
    click(button)
    expect(controller.getSnapshot().dock.mode).toBe('expanded')
    expect(controller.getSnapshot().dock.railPosition).toBeNull()
  })

  it('suppresses a horizontal drag without allowing the handle to leave the edge', () => {
    const { button, controller } = mount()
    pointer(button, 'pointerdown', 1257, 240)
    pointer(button, 'pointermove', 700, 240)
    pointer(button, 'pointerup', 700, 240)
    click(button)
    expect(top(button)).toBe(211)
    expect(button.style.left).toBe('')
    expect(controller.getSnapshot().dock.mode).toBe('rail')
  })

  it('accepts a new click after a drag when the browser emitted no compatibility click', () => {
    const { button, controller } = mount()
    pointer(button, 'pointerdown', 1257, 240)
    pointer(button, 'pointerup', 1257, 400)
    pointer(button, 'pointerdown', 1257, 400)
    pointer(button, 'pointerup', 1257, 400)
    click(button)
    expect(controller.getSnapshot().dock.mode).toBe('expanded')
  })

  it('does not capture a pointer while the entry is disabled', () => {
    const { button, captures } = mount(undefined, true)
    pointer(button, 'pointerdown', 1257, 240)
    pointer(button, 'pointermove', 1257, 400)
    expect(captures.size).toBe(0)
    expect(top(button)).toBe(211)
  })

  it('keeps touch dragging within both viewport edges', () => {
    const { button, controller } = mount()
    pointer(button, 'pointerdown', 1257, 240, { pointerType: 'touch' })
    pointer(button, 'pointermove', 1257, -2000, { pointerType: 'touch' })
    expect(top(button)).toBe(12)
    pointer(button, 'pointermove', 1257, 5000, { pointerType: 'touch' })
    expect(top(button)).toBe(650)
    pointer(button, 'pointerup', 1257, 5000, { pointerType: 'touch' })
    expect(controller.getSnapshot().dock.railPosition).toBe(1)
  })

  it.each(['pointercancel', 'lostpointercapture'])('rolls back an interrupted drag on %s', eventType => {
    const { button, controller } = mount()
    pointer(button, 'pointerdown', 1257, 240)
    pointer(button, 'pointermove', 1257, 400)
    pointer(button, eventType, 1257, 400)
    expect(top(button)).toBe(211)
    expect(controller.getSnapshot().dock.railPosition).toBeNull()
    click(button, 0)
    expect(controller.getSnapshot().dock.mode).toBe('expanded')
  })

  it('ignores another pointer and non-primary input', () => {
    const { button, controller } = mount()
    pointer(button, 'pointerdown', 1257, 240, { isPrimary: false, pointerId: 2 })
    pointer(button, 'pointermove', 1257, 400, { isPrimary: false, pointerId: 2 })
    expect(top(button)).toBe(211)
    pointer(button, 'pointerdown', 1257, 240, { button: 2 })
    pointer(button, 'pointermove', 1257, 400)
    expect(top(button)).toBe(211)
    pointer(button, 'pointerdown', 1257, 240)
    pointer(button, 'pointermove', 1257, 600, { pointerId: 2 })
    pointer(button, 'pointerup', 1257, 600, { pointerId: 2 })
    expect(controller.getSnapshot().dock.railPosition).toBeNull()
  })

  it('rescales a saved position when the viewport shrinks', () => {
    const controller = new BranchMarkUiController({ read: () => ({ railPosition: 1 }), write: () => {} })
    const { button } = mount(controller)
    expect(top(button)).toBe(650)
    vi.stubGlobal('innerHeight', 320)
    act(() => { window.dispatchEvent(new Event('resize')) })
    expect(top(button)).toBe(250)
    vi.stubGlobal('innerHeight', 60)
    act(() => { window.dispatchEvent(new Event('resize')) })
    expect(top(button)).toBe(1)
  })

  it('cancels a drag during resize without persisting stale coordinates', () => {
    const { button, controller, captures } = mount()
    pointer(button, 'pointerdown', 1257, 240)
    pointer(button, 'pointermove', 1257, 400)
    vi.stubGlobal('innerHeight', 320)
    act(() => { window.dispatchEvent(new Event('resize')) })
    expect(top(button)).toBe(12)
    expect(captures.size).toBe(0)
    expect(controller.getSnapshot().dock.railPosition).toBeNull()
  })

  it.each([undefined, null, '0.5', Number.NaN, Number.POSITIVE_INFINITY])('defaults an invalid stored position: %s', value => {
    const controller = new BranchMarkUiController({ read: () => ({ mode: 'rail', railPosition: value }), write: () => {} })
    const { button } = mount(controller)
    expect(top(button)).toBe(211)
    expect(controller.getSnapshot().dock.railPosition).toBeNull()
  })

  it.each([[-10, 12], [10, 650]])('bounds stored position %s', (value, expected) => {
    const { button } = mount(new BranchMarkUiController({ read: () => ({ railPosition: value }), write: () => {} }))
    expect(top(button)).toBe(expected)
  })

  it('remains usable when browser preference writes are denied', () => {
    const storage = {
      getItem: () => { throw new DOMException('Denied', 'SecurityError') },
      setItem: () => { throw new DOMException('Denied', 'SecurityError') },
    } as unknown as Storage
    const { button, controller } = mount(new BranchMarkUiController(browserBranchMarkUiPreferenceStore(storage)))
    pointer(button, 'pointerdown', 1257, 240)
    pointer(button, 'pointerup', 1257, 400)
    expect(top(button)).toBe(371)
    expect(controller.getSnapshot().dock.mode).toBe('rail')
  })

  it('supports keyboard repositioning while retaining keyboard activation', () => {
    const { button, controller } = mount()
    const key = (value: string) => act(() => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }))
    })
    key('ArrowDown')
    expect(top(button)).toBe(235)
    key('ArrowUp')
    expect(top(button)).toBe(211)
    key('End')
    expect(top(button)).toBe(650)
    key('Home')
    expect(top(button)).toBe(12)
    click(button, 0)
    expect(controller.getSnapshot().dock.mode).toBe('expanded')
  })

  it('releases capture on unmount and removes the resize listener', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { button, captures } = mount()
    pointer(button, 'pointerdown', 1257, 240)
    act(() => { root?.unmount() })
    root = undefined
    expect(captures.size).toBe(0)
    expect(remove.mock.calls.some(([type]) => type === 'resize')).toBe(true)
  })
})
