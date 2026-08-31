/** Browser-only BranchMark UI state shared by every Client slot entry. */

import { useSyncExternalStore } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type {
  Clip, ClipId, ClipSourceInput, SideChatId, SideChatSnapshot,
} from 'dsh-branchmark-host/types'

export const BRANCHMARK_DOCK_DEFAULT_WIDTH = 430
export const BRANCHMARK_DOCK_MIN_WIDTH = 340
export const BRANCHMARK_DOCK_MAX_WIDTH = 620

export type BranchMarkDockMode = 'hidden' | 'rail' | 'expanded'
export type BranchMarkDockView = 'session' | 'project' | 'lineage' | 'side-chat'

export interface ClipSelectionCandidate {
  readonly workspaceId: WorkspaceId
  readonly ownerSessionId: SessionId
  readonly source: ClipSourceInput
  readonly excerpt: string
  readonly rect: { readonly left: number; readonly top: number; readonly width: number; readonly height: number }
}

/** Inline launch flow rendered inside the expanded Dock. */
export interface BranchMarkLauncher {
  readonly intent: 'side-chat' | 'session'
  readonly workspaceId: WorkspaceId
  readonly sourceSessionId: SessionId
  readonly clips: readonly Clip[]
}

export interface BranchMarkDockSnapshot {
  readonly mode: BranchMarkDockMode
  readonly view: BranchMarkDockView
  readonly width: number
  readonly launcher: BranchMarkLauncher | null
}

export interface BranchMarkUiPreferences {
  readonly mode: BranchMarkDockMode
  readonly view: BranchMarkDockView
  readonly width: number
}

/** Local preference boundary; durable Clip content never passes through it. */
export interface BranchMarkUiPreferenceStore {
  read(): unknown
  write(value: BranchMarkUiPreferences): void
}

export interface BranchMarkUiSnapshot {
  readonly dock: BranchMarkDockSnapshot
  readonly selection: readonly ClipSelectionCandidate[] | null
  readonly sideChats: {
    readonly tabs: readonly SideChatSnapshot[]
    readonly activeId?: SideChatId
  }
  /** Invalidates active Clip queries after a mutation outside their component. */
  readonly clipsRevision: number
  readonly toast: { readonly kind: 'success' | 'error'; readonly text: string; readonly nonce: number } | null
}

const DEFAULT_PREFERENCES: BranchMarkUiPreferences = Object.freeze({
  mode: 'rail',
  view: 'session',
  width: BRANCHMARK_DOCK_DEFAULT_WIDTH,
})

const DOCK_MODES = new Set<BranchMarkDockMode>(['hidden', 'rail', 'expanded'])
const DOCK_VIEWS = new Set<BranchMarkDockView>(['session', 'project', 'lineage', 'side-chat'])

function clampDockWidth(value: number): number {
  return Math.min(BRANCHMARK_DOCK_MAX_WIDTH, Math.max(BRANCHMARK_DOCK_MIN_WIDTH, Math.round(value)))
}

function readPreferences(store: BranchMarkUiPreferenceStore | undefined): BranchMarkUiPreferences {
  const candidate = store?.read()
  if (typeof candidate !== 'object' || candidate === null) return DEFAULT_PREFERENCES
  const value = candidate as Partial<BranchMarkUiPreferences>
  return Object.freeze({
    mode: typeof value.mode === 'string' && DOCK_MODES.has(value.mode as BranchMarkDockMode)
      ? value.mode as BranchMarkDockMode
      : DEFAULT_PREFERENCES.mode,
    view: typeof value.view === 'string' && DOCK_VIEWS.has(value.view as BranchMarkDockView)
      ? value.view as BranchMarkDockView
      : DEFAULT_PREFERENCES.view,
    width: typeof value.width === 'number' && Number.isFinite(value.width)
      ? clampDockWidth(value.width)
      : DEFAULT_PREFERENCES.width,
  })
}

/** Browser localStorage adapter for non-sensitive Dock geometry and view preferences. */
export function browserBranchMarkUiPreferenceStore(storage: Storage): BranchMarkUiPreferenceStore {
  const key = 'dsh-branchmark.ui.v1'
  return {
    read: () => {
      try {
        const raw = storage.getItem(key)
        return raw === null ? undefined : JSON.parse(raw)
      } catch {
        // Browser privacy modes and malformed prior values both fall back to defaults.
        return undefined
      }
    },
    write: (value) => {
      try {
        storage.setItem(key, JSON.stringify(value))
      } catch {
        // A denied or exhausted storage area must not disable the in-memory Dock.
      }
    },
  }
}

function initialSnapshot(store: BranchMarkUiPreferenceStore | undefined): BranchMarkUiSnapshot {
  const preferences = readPreferences(store)
  return Object.freeze({
    dock: Object.freeze({ ...preferences, launcher: null }),
    selection: null,
    sideChats: Object.freeze({ tabs: Object.freeze([]) }),
    clipsRevision: 0,
    toast: null,
  })
}

/** Observable UI controller for one mounted browser plugin instance. */
export class BranchMarkUiController {
  private current: BranchMarkUiSnapshot
  private readonly listeners = new Set<() => void>()
  private nonce = 0

  constructor(private readonly preferences?: BranchMarkUiPreferenceStore) {
    this.current = initialSnapshot(preferences)
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  readonly getSnapshot = (): BranchMarkUiSnapshot => this.current

  openDock(view: BranchMarkDockView): void {
    this.setDock({ ...this.current.dock, mode: 'expanded', view, launcher: null })
  }

  collapseDock(): void {
    this.setDock({ ...this.current.dock, mode: 'rail', launcher: null })
  }

  hideDock(): void {
    this.setDock({ ...this.current.dock, mode: 'hidden', launcher: null })
  }

  reopenDock(): void {
    this.setDock({ ...this.current.dock, mode: 'expanded', launcher: null })
  }

  setDockWidth(width: number): void {
    const next = clampDockWidth(width)
    if (next === this.current.dock.width) return
    this.setDock({ ...this.current.dock, width: next })
  }

  openLauncher(
    intent: BranchMarkLauncher['intent'],
    workspaceId: WorkspaceId,
    sourceSessionId: SessionId,
    clips: readonly Clip[],
  ): void {
    this.setDock({
      ...this.current.dock,
      mode: 'expanded',
      launcher: Object.freeze({ intent, workspaceId, sourceSessionId, clips: Object.freeze([...clips]) }),
    })
  }

  closeLauncher(): void {
    if (this.current.dock.launcher === null) return
    this.setDock({ ...this.current.dock, launcher: null })
  }

  setSelection(selection: readonly ClipSelectionCandidate[] | null): void {
    if (this.current.selection === selection) return
    this.publish({ ...this.current, selection: selection === null ? null : Object.freeze([...selection]) })
  }

  clipsChanged(): void {
    this.publish({ ...this.current, clipsRevision: this.current.clipsRevision + 1 })
  }

  upsertSideChat(snapshot: SideChatSnapshot, activate = false): void {
    const tabs = this.current.sideChats.tabs.some(tab => tab.id === snapshot.id)
      ? this.current.sideChats.tabs.map(tab => tab.id === snapshot.id ? snapshot : tab)
      : [...this.current.sideChats.tabs, snapshot]
    const sideChats = Object.freeze({
      tabs: Object.freeze(tabs),
      activeId: activate ? snapshot.id : this.current.sideChats.activeId ?? snapshot.id,
    })
    if (activate) {
      const dock = Object.freeze({
        ...this.current.dock,
        mode: 'expanded' as const,
        view: 'side-chat' as const,
        launcher: null,
      })
      this.publish({ ...this.current, dock, sideChats })
      this.persistDock(dock)
      return
    }
    this.publish({ ...this.current, sideChats })
  }

  activateSideChat(id: SideChatId): void {
    if (!this.current.sideChats.tabs.some(tab => tab.id === id)) return
    const dock = Object.freeze({
      ...this.current.dock,
      mode: 'expanded' as const,
      view: 'side-chat' as const,
      launcher: null,
    })
    this.publish({
      ...this.current,
      dock,
      sideChats: Object.freeze({ ...this.current.sideChats, activeId: id }),
    })
    this.persistDock(dock)
  }

  removeSideChat(id: SideChatId): void {
    const tabs = this.current.sideChats.tabs.filter(tab => tab.id !== id)
    const activeId = this.current.sideChats.activeId === id
      ? tabs.at(-1)?.id
      : this.current.sideChats.activeId
    this.publish({
      ...this.current,
      sideChats: Object.freeze({
        tabs: Object.freeze(tabs),
        ...(activeId === undefined ? {} : { activeId }),
      }),
    })
  }

  notify(kind: 'success' | 'error', text: string): void {
    this.nonce += 1
    this.publish({ ...this.current, toast: { kind, text, nonce: this.nonce } })
  }

  dismissToast(nonce: number): void {
    if (this.current.toast?.nonce !== nonce) return
    this.publish({ ...this.current, toast: null })
  }

  private setDock(dock: BranchMarkDockSnapshot): void {
    const frozen = Object.freeze(dock)
    this.publish({ ...this.current, dock: frozen })
    this.persistDock(frozen)
  }

  private persistDock(dock: BranchMarkDockSnapshot): void {
    this.preferences?.write({ mode: dock.mode, view: dock.view, width: dock.width })
  }

  private publish(snapshot: BranchMarkUiSnapshot): void {
    this.current = Object.freeze(snapshot)
    for (const listener of [...this.listeners]) listener()
  }
}

/** React binding over the controller's identity-stable snapshots. */
export function useBranchMarkUi(controller: BranchMarkUiController): BranchMarkUiSnapshot {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
}

/** Return one Clip by id without widening the brand to a plain string. */
export function clipById(clips: readonly Clip[], id: ClipId): Clip | undefined {
  return clips.find(clip => clip.id === id)
}
