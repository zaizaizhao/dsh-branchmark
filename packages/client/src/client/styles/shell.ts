/** Shell presentation for the BranchMark overlay. */
import { BRANCHMARK_RAIL_HEIGHT } from '../../domain/rail-position.ts'

export const SHELL_CSS = String.raw`
.dbm-sidebar-nav-row {
  position: relative;
  display: flex;
  width: calc(100% + 4px);
  height: 42px;
  align-items: center;
  gap: 8px;
  margin: 4px -2px;
  padding: 0 10px 0 8px;
  overflow: hidden;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  font-size: 14px;
  line-height: 22px;
  text-align: left;
  transition: background 150ms ease, color 150ms ease;
}
.dbm-sidebar-nav-row:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dbm-sidebar-nav-row[data-active="true"] { background: var(--dsw-specific-sidebar-nav-item-active); color: var(--dbm-brand); }
.dbm-sidebar-nav-row:disabled { opacity: .42; cursor: not-allowed; }
.dbm-sidebar-nav-icon { display: grid; width: 18px; height: 18px; flex: 0 0 18px; place-items: center; }
.dbm-sidebar-nav-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dbm-sidebar-nav-count {
  display: inline-flex;
  min-width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--dbm-brand-soft);
  color: var(--dbm-brand);
  font-size: 9px;
  font-weight: 600;
}
.dbm-sidebar-nav-row[data-wide="false"] { width: 36px; height: 36px; justify-content: center; gap: 0; margin: 8px 0 4px; padding: 0; border-radius: 50%; }
.dbm-sidebar-nav-row[data-wide="false"] .dbm-sidebar-nav-count {
  position: absolute;
  top: -3px;
  right: -5px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border: 2px solid var(--dsw-specific-sidebar-fill);
  background: var(--dbm-brand);
  color: var(--dsw-alias-label-primary-foreground);
  font-size: 7px;
}

.dbm-composer-reference { position: relative; display: inline-flex; }
.dbm-composer-trigger {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 12px;
}
.dbm-composer-trigger:hover:not(:disabled), .dbm-composer-trigger[data-active="true"] { border-color: color-mix(in srgb, var(--dbm-brand) 26%, var(--dbm-border)); background: var(--dbm-brand-soft); color: var(--dbm-brand); }
.dbm-composer-trigger:disabled { opacity: .42; cursor: not-allowed; }
.dbm-composer-trigger b { display: inline-flex; min-width: 16px; height: 16px; align-items: center; justify-content: center; padding: 0 4px; border-radius: 999px; background: color-mix(in srgb, var(--dbm-brand) 16%, transparent); font-size: 8px; font-weight: 650; }
.dbm-reference-popover { position: absolute; z-index: 100; bottom: calc(100% + 10px); left: 0; width: min(320px, calc(100vw - 48px)); overflow: hidden; border: 1px solid var(--dbm-border-strong); border-radius: 14px; background: var(--dbm-floating); box-shadow: var(--dbm-shadow-md); color: var(--dbm-text); animation: dbm-sheet-in 150ms ease-out; }
.dbm-reference-popover header { display: block; padding: 11px 12px 8px; border-bottom: 1px solid var(--dbm-border); }
.dbm-reference-popover header strong, .dbm-reference-popover header small { display: block; }
.dbm-reference-popover header strong { font-size: 11px; }
.dbm-reference-popover header small { margin-top: 3px; color: var(--dbm-text-3); font-size: 8px; }
.dbm-reference-list { display: grid; max-height: 190px; gap: 3px; overflow: auto; padding: 6px; }
.dbm-reference-row { display: flex; min-width: 0; align-items: center; gap: 7px; border-radius: 9px; padding: 6px 7px; background: var(--dbm-muted); }
.dbm-reference-row span { min-width: 0; flex: 1; overflow: hidden; color: var(--dbm-text-2); text-overflow: ellipsis; white-space: nowrap; font-size: 9px; }
.dbm-reference-row button { display: grid; width: 20px; height: 20px; flex: 0 0 20px; place-items: center; border: 0; border-radius: 6px; background: transparent; color: var(--dbm-text-3); cursor: pointer; }
.dbm-reference-row button:hover { background: var(--dbm-hover-solid); color: var(--dbm-text); }
.dbm-reference-manage { width: calc(100% - 12px); height: 30px; margin: 0 6px 6px; border: 0; border-radius: 9px; background: transparent; color: var(--dbm-brand); cursor: pointer; font-size: 9px; }
.dbm-reference-manage:hover { background: var(--dbm-brand-soft); }

.dbm-brandmark { display: block; overflow: visible; color: var(--dbm-text); }
.dbm-brandmark-page { fill: var(--dbm-raised); stroke: currentColor; }
.dbm-brandmark-cover { fill: currentColor; fill-opacity: .14; stroke: currentColor; }
.dbm-brandmark-detail, .dbm-brandmark-branch { fill: none; stroke: currentColor; }
.dbm-brandmark-detail { opacity: .58; }
.dbm-brandmark-binding { fill: none; stroke: currentColor; opacity: .66; }
.dbm-brandmark-leaf { fill: currentColor; stroke: none; opacity: .56; }
.dbm-brandmark-seal { fill: currentColor; stroke: var(--dbm-raised); }

.dbm-dock-handle {
  position: absolute;
  z-index: 4;
  right: 0;
  display: grid;
  width: 46px;
  height: ${BRANCHMARK_RAIL_HEIGHT}px;
  align-items: center;
  justify-content: center;
  padding: 8px 6px;
  border: 1px solid var(--dbm-border-strong);
  border-right: 0;
  border-radius: 16px 0 0 16px;
  background: var(--dbm-floating);
  color: var(--dbm-text);
  box-shadow: var(--dbm-shadow-sm);
  cursor: grab;
  touch-action: none;
  user-select: none;
  pointer-events: auto;
  transition: background 150ms ease;
}
.dbm-dock-handle:hover:not(:disabled) { background: var(--dbm-hover-solid); }
.dbm-dock-handle[data-dragging="true"] { cursor: grabbing; }
.dbm-dock-handle:focus-visible { outline: 2px solid var(--dbm-brand); outline-offset: 2px; }
.dbm-dock-handle:disabled { opacity: .42; cursor: not-allowed; }
.dbm-dock-handle .dbm-brandmark { transition: transform 180ms cubic-bezier(.22, 1, .36, 1); }
.dbm-dock-handle:hover:not(:disabled) .dbm-brandmark { transform: translateY(-1px) rotate(-2deg) scale(1.06); }
.dbm-dock-handle-count { position: absolute; top: 5px; left: 5px; display: grid; min-width: 15px; height: 15px; place-items: center; padding: 0 3px; border: 2px solid var(--dbm-floating); border-radius: 999px; background: var(--dbm-brand); color: var(--dsw-alias-label-primary-foreground); font-size: 7px; font-weight: 650; line-height: 1; }
.dbm-dock-handle i { position: absolute; right: 6px; bottom: 6px; width: 7px; height: 7px; border: 2px solid var(--dbm-floating); border-radius: 50%; background: var(--dbm-success); animation: dbm-breathe 1.5s ease-in-out infinite; }

.dbm-dock-panel {
  position: absolute;
  top: var(--dbm-dock-top);
  right: 16px;
  bottom: var(--dbm-dock-bottom);
  width: var(--dbm-dock-width);
  min-width: 340px;
  min-height: 300px;
  overflow: visible;
  border: 1px solid var(--dbm-border);
  border-radius: 18px;
  background: var(--dbm-raised);
  box-shadow: var(--dbm-shadow-md);
  pointer-events: auto;
  animation: dbm-dock-in 220ms cubic-bezier(.22, 1, .36, 1);
}
.dbm-dock-resizer { position: absolute; z-index: 5; top: 0; bottom: 0; left: -6px; width: 12px; cursor: ew-resize; touch-action: none; }
.dbm-dock-resizer::after { position: absolute; top: calc(50% - 30px); left: 5px; width: 2px; height: 60px; border-radius: 2px; background: transparent; content: ""; transition: background 150ms ease; }
.dbm-dock-resizer:hover::after, body[data-dbm-resizing="true"] .dbm-dock-resizer::after { background: var(--dbm-brand); }
.dbm-dock-layout { position: relative; display: flex; height: 100%; overflow: hidden; flex-direction: column; border-radius: inherit; }
.dbm-dock-header { display: flex; min-height: 64px; align-items: center; gap: 10px; padding: 11px 13px; border-bottom: 1px solid var(--dbm-border); }
.dbm-dock-brand { display: grid; width: 40px; height: 40px; flex: 0 0 40px; place-items: center; border: 1px solid var(--dbm-border); border-radius: 13px; background: var(--dbm-muted); color: var(--dbm-text); }
.dbm-dock-heading { min-width: 0; flex: 1; }
.dbm-dock-heading strong, .dbm-dock-heading small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dbm-dock-heading strong { font-size: 13px; line-height: 1.4; }
.dbm-dock-heading small { margin-top: 3px; color: var(--dbm-text-3); font-size: 11px; }
.dbm-dock-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; margin: 9px 12px 0; padding: 3px; border-radius: 11px; background: var(--dbm-muted); }
.dbm-dock-tab { border: 0; border-radius: 8px; padding: 7px 5px; background: transparent; color: var(--dbm-text-3); cursor: pointer; font-size: 11px; }
.dbm-dock-tab:hover { color: var(--dbm-text); }
.dbm-dock-tab[data-active="true"] { background: var(--dbm-surface); color: var(--dbm-text); box-shadow: var(--dbm-shadow-sm); }
.dbm-dock-body { min-height: 0; flex: 1; overflow: auto; padding: 15px; container-type: inline-size; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--dbm-border) transparent; }
`
