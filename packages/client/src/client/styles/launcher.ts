/** Explicit context selection and branch naming in the Dock's launch sheet. */
export const LAUNCHER_CSS = String.raw`
.dbm-launch-sheet { position: absolute; z-index: 8; inset: 10px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--dbm-border-strong); border-radius: 15px; background: var(--dbm-raised); box-shadow: var(--dbm-shadow-md); animation: dbm-sheet-in 180ms ease-out; }
.dbm-launch-header { display: flex; align-items: center; gap: 8px; padding: 14px; border-bottom: 1px solid var(--dbm-border); }
.dbm-launch-header > div { min-width: 0; flex: 1; }
.dbm-launch-header strong, .dbm-launch-header span { display: block; }
.dbm-launch-header strong { font-size: 14px; font-weight: 550; }
.dbm-launch-header span { margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dbm-text-3); font-size: 10px; }
.dbm-launch-scroll { min-height: 0; flex: 1; overflow: auto; padding: 0 14px; overscroll-behavior: contain; scrollbar-width: thin; }
.dbm-launch-section { padding: 13px 0; border-bottom: 1px solid var(--dbm-border); }
.dbm-launch-section:last-child { border-bottom: 0; }
.dbm-launch-section h3 { margin: 0 0 9px; font-size: 11px; font-weight: 500; }
.dbm-context-modes { display: grid; gap: 8px; min-width: 0; border: 0; padding: 0; margin: 0; }
.dbm-context-modes legend { padding: 0 0 9px; font-size: 11px; }
.dbm-mode { display: flex; align-items: flex-start; gap: 10px; padding: 11px; border: 1px solid var(--dbm-border); border-radius: 10px; background: var(--dbm-surface); color: var(--dbm-text); cursor: pointer; }
.dbm-mode input { margin: 3px 0 0; accent-color: var(--dbm-leaf); }
.dbm-mode:hover { border-color: var(--dbm-border-strong); }
.dbm-mode[data-active="true"] { border-color: var(--dbm-leaf); background: var(--dbm-leaf-soft); }
.dbm-mode[data-disabled="true"] { opacity: .42; cursor: not-allowed; }
.dbm-mode strong, .dbm-mode small { display: block; }
.dbm-mode strong { font-size: 12px; font-weight: 500; }
.dbm-mode small { margin-top: 4px; color: var(--dbm-text-3); font-size: 10px; line-height: 1.6; }
.dbm-source-row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 6px; border-radius: 8px; color: var(--dbm-text-2); }
.dbm-source-row > span { min-width: 0; flex: 1; }
.dbm-source-row strong, .dbm-source-row small { display: block; }
.dbm-source-row strong { overflow: hidden; color: var(--dbm-text); text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 500; }
.dbm-source-row small { margin-top: 4px; color: var(--dbm-text-3); font-size: 10px; }
.dbm-note-toggle { display: flex; flex: 0 0 auto; align-items: center; color: var(--dbm-text-3); font-size: 10px; white-space: nowrap; }
.dbm-blank-summary { margin: 12px 0 0; color: var(--dbm-leaf); font-size: 11px; line-height: 1.6; }
.dbm-launch-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; padding: 12px 14px; border-top: 1px solid var(--dbm-border); }
`
