/** Selection presentation for the BranchMark overlay. */

export const SELECTION_CSS = String.raw`
.dbm-selection-toolbar { position: fixed; z-index: 10040; display: grid; min-height: 40px; max-width: calc(100vw - 20px); grid-auto-columns: max-content; grid-auto-flow: column; align-items: stretch; overflow: hidden; border: 1px solid var(--dbm-border-strong); border-radius: 12px; background: var(--dbm-floating); box-shadow: var(--dbm-shadow-md); pointer-events: auto; animation: dbm-toolbar-in 120ms ease-out; }
.dbm-selection-action { min-width: 0; border: 0; padding: 0 13px; background: transparent; color: var(--dbm-text); cursor: pointer; font-size: 11px; font-weight: 520; line-height: 38px; white-space: nowrap; transition: background 100ms ease, color 100ms ease; }
.dbm-selection-action + .dbm-selection-action { border-left: 1px solid var(--dbm-border); }
.dbm-selection-action:hover:not(:disabled) { background: var(--dbm-hover-solid); }
.dbm-selection-action[data-kind="project"] { color: var(--dbm-brand); }
.dbm-selection-action[data-kind="side-chat"] { border-left-color: var(--dbm-border-strong); }
.dbm-selection-action:disabled { opacity: .45; cursor: default; }
.dbm-toast { position: fixed; z-index: 10060; right: 70px; bottom: 20px; display: flex; max-width: min(420px, calc(100vw - 90px)); align-items: center; gap: 8px; padding: 10px 13px; border: 1px solid var(--dbm-border-strong); border-radius: 12px; background: var(--dbm-floating); color: var(--dbm-text); box-shadow: var(--dbm-shadow-md); cursor: pointer; pointer-events: auto; font-size: 11px; }
.dbm-toast[data-kind="success"] { border-left: 3px solid var(--dbm-success); }
.dbm-toast[data-kind="error"] { border-left: 3px solid var(--dbm-danger); }

.dbm-lineage-pill { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; padding: 4px 8px; background: var(--dsw-alias-state-business-tertiary); color: var(--dsw-alias-state-business-primary); cursor: pointer; font-size: 9px; }
.dbm-lineage-pill[data-mode="clips-only"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dbm-fork-divider { display: flex; width: 100%; align-items: center; gap: 8px; margin: 10px 0; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.dbm-fork-divider::before, .dbm-fork-divider::after { height: 1px; flex: 1; background: var(--dsw-alias-border-l2); content: ""; }

@keyframes dbm-dock-in { from { opacity: 0; transform: translateX(12px) scale(.99); } to { opacity: 1; transform: none; } }
@keyframes dbm-sheet-in { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }
@keyframes dbm-toolbar-in { from { opacity: 0; transform: translateY(4px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes dbm-breathe { 50% { opacity: .42; transform: scale(.86); } }
@keyframes dbm-think { 50% { opacity: .3; transform: translateY(-2px); } }
@keyframes dbm-blink { 50% { opacity: 0; } }

@media (max-width: 1050px) {
  .dbm-dock-panel { right: 12px; width: min(var(--dbm-dock-width), calc(100vw - 24px)); min-width: 0; }
}

@media (max-width: 720px) {
  .dbm-dock-panel { top: max(10px, var(--dbm-dock-top)); right: 8px; bottom: 10px; width: calc(100vw - 16px); }
  .dbm-dock-resizer { display: none; }
  .dbm-launch-actions { flex-wrap: wrap; }
}

@media (max-width: 560px) {
  .dbm-selection-toolbar { width: calc(100vw - 20px); grid-auto-flow: row; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dbm-selection-action { width: 100%; padding: 0 8px; text-align: center; }
  .dbm-selection-action:nth-child(3) { border-left: 0; }
  .dbm-selection-action:nth-child(n + 3) { border-top: 1px solid var(--dbm-border); }
}

@media (prefers-reduced-motion: reduce) {
  .dbm-overlay-root *, .dbm-overlay-root *::before, .dbm-overlay-root *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
`
