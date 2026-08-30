/** Theme-aware BranchMark presentation layered entirely through Client slots. */

const STYLE_ID = 'dsh-branchmark-styles'

const CSS = String.raw`
body {
  --dbm-surface: var(--dsw-alias-bg-base);
  --dbm-raised: var(--dsw-alias-bg-layer-1);
  --dbm-muted: var(--dsw-alias-bg-layer-2);
  --dbm-floating: var(--dsw-alias-button-floating-fill);
  --dbm-hover: var(--dsw-alias-interactive-bg-hover);
  --dbm-hover-solid: var(--dsw-alias-interactive-bg-hover-solid);
  --dbm-border: var(--dsw-alias-border-l2);
  --dbm-border-strong: var(--dsw-alias-border-l3);
  --dbm-text: var(--dsw-alias-label-primary);
  --dbm-text-2: var(--dsw-alias-label-secondary);
  --dbm-text-3: var(--dsw-alias-label-tertiary);
  --dbm-brand: var(--dsw-alias-state-business-primary);
  --dbm-brand-soft: var(--dsw-alias-state-business-tertiary);
  --dbm-danger: var(--dsw-alias-state-error-primary);
  --dbm-warning: var(--dsw-alias-state-warn-primary);
  --dbm-success: var(--dsw-alias-state-success-primary);
  --dbm-shadow-sm: 0 6px 18px rgba(0, 0, 0, .09);
  --dbm-shadow-md: 0 18px 58px rgba(0, 0, 0, .2);
}

body[data-ds-dark-theme] {
  --dbm-shadow-sm: 0 8px 24px rgba(0, 0, 0, .28);
  --dbm-shadow-md: 0 22px 68px rgba(0, 0, 0, .48);
}

.dbm-overlay-root {
  position: fixed;
  z-index: 10020;
  inset: 0;
  color: var(--dbm-text);
  pointer-events: none;
}

.dbm-overlay-root *, .dbm-overlay-root *::before, .dbm-overlay-root *::after { box-sizing: border-box; }
.dbm-overlay-root button, .dbm-overlay-root input, .dbm-overlay-root textarea { font: inherit; }

.dbm-button {
  appearance: none;
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5px 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--dbm-text-2);
  font-size: 11px;
  line-height: 1.35;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease, transform 150ms ease;
}
.dbm-button:hover:not(:disabled) { border-color: var(--dbm-border); background: var(--dbm-hover); color: var(--dbm-text); }
.dbm-button:active:not(:disabled) { transform: translateY(1px); }
.dbm-button:disabled { opacity: .42; cursor: not-allowed; }
.dbm-button-primary {
  border-color: transparent;
  background: var(--dsw-alias-button-info-fill);
  color: var(--dsw-alias-label-primary-foreground);
  box-shadow: 0 7px 18px color-mix(in srgb, var(--dbm-brand) 24%, transparent);
}
.dbm-button-primary:hover:not(:disabled) { border-color: transparent; background: var(--dsw-alias-button-info-hover); color: var(--dsw-alias-label-primary-foreground); }
.dbm-button-danger { color: var(--dbm-danger); }
.dbm-button-danger:hover:not(:disabled) { border-color: transparent; background: var(--dsw-alias-interactive-bg-hover-danger); color: var(--dbm-danger); }
.dbm-icon-button { width: 30px; flex: 0 0 30px; padding: 5px; }
.dbm-icon-button[data-active="true"] { background: var(--dbm-brand-soft); color: var(--dbm-brand); }

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

.dbm-dock-handle {
  position: absolute;
  z-index: 4;
  top: 50%;
  right: 0;
  display: flex;
  width: 34px;
  min-height: 80px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 5px;
  transform: translateY(-50%);
  border: 1px solid var(--dbm-border-strong);
  border-right: 0;
  border-radius: 12px 0 0 12px;
  background: var(--dbm-floating);
  color: var(--dbm-brand);
  box-shadow: var(--dbm-shadow-sm);
  cursor: pointer;
  pointer-events: auto;
  writing-mode: vertical-rl;
  transition: width 150ms ease, background 150ms ease, transform 150ms ease;
}
.dbm-dock-handle:hover:not(:disabled) { width: 38px; background: color-mix(in srgb, var(--dbm-brand-soft) 55%, var(--dbm-floating)); transform: translateY(-50%) translateX(-1px); }
.dbm-dock-handle:disabled { opacity: .42; cursor: not-allowed; }
.dbm-dock-handle span { font-size: 9px; font-weight: 600; letter-spacing: .08em; }
.dbm-dock-handle i { width: 7px; height: 7px; border: 2px solid var(--dbm-floating); border-radius: 50%; background: var(--dbm-success); animation: dbm-breathe 1.5s ease-in-out infinite; }

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
.dbm-dock-brand { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border-radius: 11px; background: color-mix(in srgb, var(--dbm-session-accent) 14%, var(--dbm-muted)); color: var(--dbm-session-accent); }
.dbm-dock-heading { min-width: 0; flex: 1; }
.dbm-dock-heading strong, .dbm-dock-heading small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dbm-dock-heading strong { font-size: 13px; line-height: 1.4; }
.dbm-dock-heading small { margin-top: 3px; color: var(--dbm-text-3); font-size: 9px; }
.dbm-dock-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; margin: 9px 12px 0; padding: 3px; border-radius: 11px; background: var(--dbm-muted); }
.dbm-dock-tab { border: 0; border-radius: 8px; padding: 7px 5px; background: transparent; color: var(--dbm-text-3); cursor: pointer; font-size: 10px; }
.dbm-dock-tab:hover { color: var(--dbm-text); }
.dbm-dock-tab[data-active="true"] { background: var(--dbm-surface); color: var(--dbm-text); box-shadow: var(--dbm-shadow-sm); }
.dbm-dock-body { min-height: 0; flex: 1; overflow: auto; padding: 13px; }

.dbm-toolbar { display: flex; align-items: center; gap: 7px; margin-bottom: 9px; }
.dbm-search { display: flex; min-width: 0; flex: 1; align-items: center; gap: 7px; padding: 0 9px; border: 1px solid var(--dbm-border); border-radius: 10px; background: var(--dbm-surface); color: var(--dbm-text-3); }
.dbm-search:focus-within { border-color: var(--dbm-brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dbm-brand) 12%, transparent); }
.dbm-search input { width: 100%; min-width: 0; border: 0; outline: 0; padding: 8px 0; background: transparent; color: var(--dbm-text); font-size: 10px; }
.dbm-scope-description { margin: 0 0 11px; color: var(--dbm-text-3); font-size: 9px; line-height: 1.55; }
.dbm-input, .dbm-textarea { width: 100%; border: 1px solid var(--dbm-border); border-radius: 10px; outline: 0; padding: 8px 9px; background: var(--dbm-surface); color: var(--dbm-text); font-size: 11px; line-height: 1.5; }
.dbm-input:focus, .dbm-textarea:focus { border-color: var(--dbm-brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dbm-brand) 12%, transparent); }
.dbm-textarea { resize: vertical; }
.dbm-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.dbm-filter-tags { margin-bottom: 10px; }
.dbm-tag { border: 0; border-radius: 999px; padding: 3px 7px; background: var(--dbm-brand-soft); color: var(--dbm-brand); font-size: 9px; cursor: pointer; }
.dbm-tag[data-active="true"] { background: var(--dbm-brand); color: var(--dsw-alias-label-primary-foreground); }

.dbm-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 9px; }
.dbm-card-grid[data-view="list"] { grid-template-columns: 1fr; }
.dbm-card { position: relative; padding: 12px; border: 1px solid var(--dbm-border); border-radius: 13px; background: var(--dbm-surface); transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }
.dbm-card:hover { transform: translateY(-1px); border-color: var(--dbm-border-strong); box-shadow: var(--dbm-shadow-sm); }
.dbm-card[data-selected="true"] { border-color: var(--dbm-brand); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dbm-brand) 12%, transparent); }
.dbm-card-scope { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: var(--dbm-text-3); font-size: 9px; }
.dbm-card-scope i { width: 6px; height: 6px; flex: 0 0 6px; border-radius: 50%; background: var(--dbm-session-accent, var(--dbm-brand)); }
.dbm-card[data-scope="project"] .dbm-card-scope i { background: #8b63dc; }
.dbm-card-scope span { min-width: 0; flex: 1; }
.dbm-card-scope input { accent-color: var(--dbm-brand); }
.dbm-excerpt { margin: 0; color: var(--dbm-text); font-size: 12px; line-height: 1.68; overflow-wrap: anywhere; }
.dbm-excerpt p:first-child { margin-top: 0; }
.dbm-excerpt p:last-child { margin-bottom: 0; }
.dbm-note { margin: 9px 0 0; padding: 7px 9px; border-left: 2px solid var(--dbm-warning); border-radius: 0 7px 7px 0; background: color-mix(in srgb, var(--dbm-warning) 8%, var(--dbm-muted)); color: var(--dbm-text-2); font-size: 10px; line-height: 1.55; white-space: pre-wrap; }
.dbm-card .dbm-tags { margin-top: 9px; }
.dbm-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; color: var(--dbm-text-3); font-size: 8px; }
.dbm-card-actions { display: flex; flex-wrap: wrap; gap: 2px; margin: 8px -5px -5px; opacity: .68; transition: opacity 140ms ease; }
.dbm-card:hover .dbm-card-actions, .dbm-card:focus-within .dbm-card-actions { opacity: 1; }
.dbm-card-actions .dbm-button { min-height: 25px; padding: 3px 6px; font-size: 9px; }
.dbm-inline-editor { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.dbm-inline-editor-actions { display: flex; justify-content: flex-end; gap: 5px; }
.dbm-derived { margin-top: 9px; padding: 7px; border: 1px solid var(--dbm-border); border-radius: 9px; background: var(--dbm-muted); }
.dbm-derived > span { display: block; margin-bottom: 4px; color: var(--dbm-text-3); font-size: 8px; }
.dbm-derived-link { display: grid; width: 100%; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 6px; border: 0; border-radius: 7px; padding: 5px 6px; background: transparent; color: var(--dbm-text); cursor: pointer; text-align: left; }
.dbm-derived-link:hover { background: var(--dbm-hover); }
.dbm-derived-link span { padding: 2px 5px; border-radius: 999px; background: var(--dbm-brand-soft); color: var(--dbm-brand); font-size: 8px; }
.dbm-derived-link strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; font-weight: 500; }
.dbm-derived-link i { color: var(--dbm-text-3); font-style: normal; }

.dbm-empty { display: grid; min-height: 210px; place-items: center; padding: 26px; color: var(--dbm-text-3); text-align: center; }
.dbm-empty strong { display: block; margin: 9px 0 5px; color: var(--dbm-text-2); font-size: 12px; }
.dbm-empty p { max-width: 280px; margin: 0; font-size: 10px; line-height: 1.55; }
.dbm-empty-orb { display: grid; width: 38px; height: 38px; margin: 0 auto; place-items: center; border-radius: 13px; background: var(--dbm-brand-soft); color: var(--dbm-brand); }
.dbm-loading { padding: 28px; color: var(--dbm-text-3); text-align: center; font-size: 10px; }
.dbm-error, .dbm-warning { padding: 8px 9px; border-radius: 9px; font-size: 10px; line-height: 1.5; }
.dbm-error { border: 1px solid color-mix(in srgb, var(--dbm-danger) 38%, transparent); background: color-mix(in srgb, var(--dbm-danger) 7%, var(--dbm-muted)); color: var(--dbm-danger); }
.dbm-warning { margin-top: 7px; background: var(--dsw-alias-state-warn-tertiary); color: var(--dsw-alias-state-warn-label); }
.dbm-batchbar { position: sticky; bottom: 0; z-index: 3; margin-top: 11px; padding: 8px; border: 1px solid var(--dbm-border-strong); border-radius: 12px; background: var(--dbm-floating); box-shadow: var(--dbm-shadow-sm); }
.dbm-batchbar > span { display: block; margin-bottom: 6px; color: var(--dbm-text-2); font-size: 9px; }
.dbm-batch-actions { display: flex; align-items: center; gap: 4px; overflow-x: auto; }
.dbm-batch-actions .dbm-input { width: 105px; flex: 0 0 105px; padding: 6px 7px; }

.dbm-launch-sheet { position: absolute; z-index: 8; right: 11px; bottom: 11px; left: 11px; display: flex; max-height: calc(100% - 22px); flex-direction: column; overflow: hidden; border: 1px solid var(--dbm-border-strong); border-radius: 15px; background: var(--dbm-raised); box-shadow: var(--dbm-shadow-md); animation: dbm-sheet-in 180ms ease-out; }
.dbm-launch-header { display: flex; align-items: center; gap: 8px; padding: 11px 12px; border-bottom: 1px solid var(--dbm-border); }
.dbm-launch-header > div { min-width: 0; flex: 1; }
.dbm-launch-header strong, .dbm-launch-header span { display: block; }
.dbm-launch-header strong { font-size: 12px; }
.dbm-launch-header span { margin-top: 2px; color: var(--dbm-text-3); font-size: 8px; }
.dbm-launch-scroll { min-height: 0; overflow: auto; padding: 0 12px; }
.dbm-launch-section { padding: 11px 0; border-bottom: 1px solid var(--dbm-border); }
.dbm-launch-section:last-child { border-bottom: 0; }
.dbm-launch-section h3 { margin: 0 0 7px; font-size: 10px; }
.dbm-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.dbm-mode { padding: 9px; border: 1px solid var(--dbm-border); border-radius: 10px; background: var(--dbm-surface); color: var(--dbm-text); cursor: pointer; text-align: left; }
.dbm-mode:hover:not(:disabled) { border-color: var(--dbm-border-strong); }
.dbm-mode[data-active="true"] { border-color: var(--dbm-brand); background: var(--dbm-brand-soft); }
.dbm-mode:disabled { opacity: .42; cursor: not-allowed; }
.dbm-mode strong, .dbm-mode span { display: block; }
.dbm-mode strong { font-size: 10px; }
.dbm-mode span { margin-top: 3px; color: var(--dbm-text-3); font-size: 8px; line-height: 1.45; }
.dbm-source-row { display: flex; align-items: flex-start; gap: 7px; padding: 7px; border-radius: 8px; color: var(--dbm-text-2); }
.dbm-source-row:hover { background: var(--dbm-hover); }
.dbm-source-row > span { min-width: 0; flex: 1; }
.dbm-source-row strong, .dbm-source-row small { display: block; }
.dbm-source-row strong { overflow: hidden; color: var(--dbm-text); text-overflow: ellipsis; white-space: nowrap; font-size: 9px; font-weight: 500; }
.dbm-source-row small { margin-top: 3px; color: var(--dbm-text-3); font-size: 8px; }
.dbm-note-toggle { flex: 0 0 auto; color: var(--dbm-text-3); font-size: 8px; white-space: nowrap; }
.dbm-launch-actions { display: flex; justify-content: flex-end; gap: 5px; padding: 10px 12px; border-top: 1px solid var(--dbm-border); background: var(--dbm-raised); }

.dbm-lineage-tree { padding: 4px 1px; }
.dbm-lineage-node { position: relative; display: grid; width: calc(100% - var(--dbm-depth) * 20px); min-height: 48px; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: 8px; margin-left: calc(var(--dbm-depth) * 20px); padding: 7px 9px; border: 1px solid transparent; border-radius: 11px; background: transparent; color: var(--dbm-text); cursor: pointer; text-align: left; }
.dbm-lineage-node:hover { background: var(--dbm-hover); }
.dbm-lineage-node[data-current="true"] { border-color: color-mix(in srgb, var(--dbm-node-accent) 42%, var(--dbm-border)); background: color-mix(in srgb, var(--dbm-node-accent) 9%, var(--dbm-surface)); }
.dbm-lineage-node::before { position: absolute; top: -10px; bottom: 24px; left: -11px; width: 11px; border-bottom: 1px solid color-mix(in srgb, var(--dbm-node-accent) 48%, var(--dbm-border)); border-left: 1px solid color-mix(in srgb, var(--dbm-node-accent) 48%, var(--dbm-border)); border-radius: 0 0 0 8px; content: ""; }
.dbm-lineage-node[data-depth="0"]::before { display: none; }
.dbm-lineage-icon { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 7px; background: color-mix(in srgb, var(--dbm-node-accent) 14%, var(--dbm-muted)); color: var(--dbm-node-accent); }
.dbm-lineage-copy { min-width: 0; }
.dbm-lineage-copy strong, .dbm-lineage-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dbm-lineage-copy strong { font-size: 10px; }
.dbm-lineage-copy small { margin-top: 3px; color: var(--dbm-text-3); font-size: 8px; }
.dbm-lineage-badge { padding: 3px 6px; border-radius: 999px; background: var(--dbm-muted); color: var(--dbm-text-3); font-size: 8px; }

.dbm-dock-body:has(.dbm-side-view) { overflow: hidden; }
.dbm-side-view { display: flex; height: 100%; min-height: 0; flex-direction: column; }
.dbm-side-tabs { display: flex; gap: 5px; overflow-x: auto; margin-bottom: 9px; }
.dbm-side-tab { display: inline-flex; flex: 0 0 auto; align-items: center; border: 1px solid var(--dbm-border); border-radius: 9px; background: var(--dbm-surface); }
.dbm-side-tab[data-active="true"] { border-color: color-mix(in srgb, var(--dbm-brand) 42%, var(--dbm-border)); background: var(--dbm-brand-soft); }
.dbm-side-tab button { display: inline-flex; align-items: center; gap: 5px; border: 0; padding: 6px 7px; background: transparent; color: var(--dbm-text-2); cursor: pointer; font-size: 9px; }
.dbm-running-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dbm-success); animation: dbm-breathe 1.5s ease-in-out infinite; }
.dbm-side-context { display: flex; gap: 5px; overflow-x: auto; margin-bottom: 8px; }
.dbm-side-context span { max-width: 210px; flex: 0 0 auto; overflow: hidden; padding: 5px 7px; border-radius: 8px; background: var(--dbm-muted); color: var(--dbm-text-2); text-overflow: ellipsis; white-space: nowrap; font-size: 8px; }
.dbm-side-scroll { display: flex; min-height: 0; flex: 1; flex-direction: column; gap: 14px; overflow: auto; padding: 12px 4px 18px; }
.dbm-side-message { position: relative; width: 100%; color: var(--dbm-text); font-size: 11px; line-height: 1.68; overflow-wrap: anywhere; }
.dbm-side-message[data-role="user"] { width: auto; max-width: 84%; align-self: flex-end; padding: 8px 11px; border-radius: 13px 13px 4px 13px; background: var(--dsw-alias-button-info-fill); color: var(--dsw-alias-label-primary-foreground); }
.dbm-side-message[data-role="assistant"] { align-self: stretch; padding: 3px 6px 7px; }
.dbm-side-message[data-streaming="true"] { border-left: 2px solid color-mix(in srgb, var(--dbm-brand) 35%, transparent); }
.dbm-side-message p:first-child { margin-top: 0; }
.dbm-side-message p:last-child { margin-bottom: 0; }
.dbm-side-user-text { margin: 0; white-space: pre-wrap; }
.dbm-side-reasoning { margin: 0 0 9px; color: var(--dbm-text-2); font-size: 9px; }
.dbm-side-reasoning summary { display: flex; min-width: 0; align-items: center; gap: 6px; padding: 3px 0; color: var(--dbm-text-3); cursor: pointer; list-style: none; }
.dbm-side-reasoning summary::-webkit-details-marker { display: none; }
.dbm-side-reasoning summary strong { color: var(--dbm-text-2); font-size: 9px; font-weight: 500; }
.dbm-side-reasoning summary i, .dbm-side-tool summary i { width: 3px; height: 3px; flex: 0 0 3px; border-radius: 50%; background: currentColor; opacity: .52; }
.dbm-side-reasoning summary span { min-width: 0; overflow: hidden; flex: 1; text-overflow: ellipsis; white-space: nowrap; }
.dbm-side-reasoning > div { margin: 5px 0 0 18px; padding-left: 9px; border-left: 1px solid var(--dbm-border); color: var(--dbm-text-2); }
.dbm-side-tool { margin: 5px 0; color: var(--dbm-text-3); font-size: 9px; }
.dbm-side-tool summary { display: flex; min-width: 0; align-items: center; gap: 6px; padding: 5px 0; cursor: pointer; list-style: none; }
.dbm-side-tool summary::-webkit-details-marker { display: none; }
.dbm-side-tool summary strong { flex: 0 0 auto; color: var(--dbm-text-2); font-weight: 500; }
.dbm-side-tool summary span { min-width: 0; overflow: hidden; flex: 1; text-overflow: ellipsis; white-space: nowrap; }
.dbm-side-tool summary small { flex: 0 0 auto; font-size: 8px; }
.dbm-side-tool[data-status="running"] summary small { color: var(--dbm-brand); }
.dbm-side-tool[data-status="error"] summary small { color: var(--dbm-danger); }
.dbm-side-tool > div { margin: 3px 0 7px 18px; padding: 8px; border: 1px solid var(--dbm-border); border-radius: 9px; background: var(--dbm-muted); }
.dbm-side-tool label { display: block; margin: 3px 0; color: var(--dbm-text-3); font-size: 8px; }
.dbm-side-tool pre { max-height: 160px; overflow: auto; margin: 0 0 7px; color: var(--dbm-text-2); font: 9px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; }
.dbm-side-save { min-height: 24px; margin: 7px 0 -4px -5px; padding: 3px 6px; opacity: 0; font-size: 9px; }
.dbm-side-message:hover .dbm-side-save, .dbm-side-message:focus-within .dbm-side-save { opacity: 1; }
.dbm-side-empty { min-height: 240px; flex: 1; }
.dbm-side-composer { position: relative; z-index: 4; margin-top: auto; padding: 8px; border: 1px solid var(--dbm-border-strong); border-radius: 14px; background: var(--dbm-surface); box-shadow: var(--dbm-shadow-sm); }
.dbm-side-composer textarea { width: 100%; min-height: 50px; resize: none; border: 0; outline: 0; padding: 4px; background: transparent; color: var(--dbm-text); font-size: 11px; line-height: 1.5; }
.dbm-side-composer-footer { display: flex; align-items: center; gap: 6px; }
.dbm-side-composer-footer > span { min-width: 0; overflow: hidden; flex: 1; color: var(--dbm-text-3); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.dbm-side-primary {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-button-info-fill);
  color: #fff;
  cursor: pointer;
  transform: translateY(-2px);
  transition: background-color 100ms ease;
}
.dbm-side-primary:hover:not(:disabled) { background: var(--dsw-alias-button-info-hover); }
.dbm-side-primary:disabled { opacity: .4; cursor: default; }
.dbm-side-primary svg { display: block; }
.dbm-side-model { position: relative; flex: 0 0 auto; }
.dbm-side-model-trigger { display: inline-flex; max-width: 160px; align-items: center; gap: 5px; border: 0; border-radius: 8px; padding: 5px 7px; background: transparent; color: var(--dbm-text-2); cursor: pointer; font-size: 9px; }
.dbm-side-model-trigger:hover:not(:disabled), .dbm-side-model-trigger[aria-expanded="true"] { background: var(--dbm-hover); color: var(--dbm-text); }
.dbm-side-model-trigger:disabled { opacity: .5; cursor: not-allowed; }
.dbm-side-model-trigger span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dbm-side-model-trigger small { padding: 1px 4px; border-radius: 5px; background: var(--dbm-muted); color: var(--dbm-text-3); font-size: 7px; }
.dbm-side-model-menu { position: absolute; z-index: 8; bottom: calc(100% + 7px); left: 0; width: min(300px, calc(var(--dbm-dock-width) - 44px)); max-height: 330px; overflow: auto; padding: 6px; border: 1px solid var(--dbm-border-strong); border-radius: 12px; background: var(--dbm-floating); box-shadow: var(--dbm-shadow-md); }
.dbm-side-model-menu section + section { margin-top: 5px; padding-top: 5px; border-top: 1px solid var(--dbm-border); }
.dbm-side-model-menu header { padding: 5px 7px; color: var(--dbm-text-3); font-size: 8px; font-weight: 600; }
.dbm-side-model-menu section > button { display: flex; width: 100%; align-items: center; gap: 8px; border: 0; border-radius: 8px; padding: 7px; background: transparent; color: var(--dbm-text); cursor: pointer; text-align: left; }
.dbm-side-model-menu section > button:hover:not(:disabled) { background: var(--dbm-hover); }
.dbm-side-model-menu section > button > span { min-width: 0; flex: 1; }
.dbm-side-model-menu section > button strong, .dbm-side-model-menu section > button small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dbm-side-model-menu section > button strong { font-size: 9px; font-weight: 500; }
.dbm-side-model-menu section > button small { margin-top: 2px; color: var(--dbm-text-3); font-size: 8px; }
.dbm-side-efforts > div { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 6px 6px; }
.dbm-side-efforts > div button { border: 1px solid var(--dbm-border); border-radius: 999px; padding: 4px 7px; background: var(--dbm-surface); color: var(--dbm-text-2); cursor: pointer; font-size: 8px; }
.dbm-side-efforts > div button[data-active="true"] { border-color: var(--dbm-brand); background: var(--dbm-brand-soft); color: var(--dbm-brand); }
.dbm-side-model-state, .dbm-side-model-warning { padding: 9px; color: var(--dbm-text-3); font-size: 8px; line-height: 1.45; }
.dbm-side-model-warning { color: var(--dbm-warning); }
.dbm-thinking-line { display: flex; align-items: center; gap: 7px; padding: 8px; color: var(--dbm-text-3); font-size: 9px; }
.dbm-thinking-dots { display: inline-flex; gap: 3px; }
.dbm-thinking-dots i { width: 4px; height: 4px; border-radius: 50%; background: var(--dbm-brand); animation: dbm-think 1.1s ease-in-out infinite; }
.dbm-thinking-dots i:nth-child(2) { animation-delay: 140ms; }
.dbm-thinking-dots i:nth-child(3) { animation-delay: 280ms; }
.dbm-caret { animation: dbm-blink 1s steps(2, end) infinite; }

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
  .dbm-mode-grid { grid-template-columns: 1fr; }
  .dbm-card-grid { grid-template-columns: 1fr; }
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

/** Install one tagged stylesheet and return its disposer. */
export function installBranchMarkStyles(): () => void {
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.dataset.plugin = 'dsh-branchmark-client'
  style.textContent = CSS
  document.head.append(style)
  return () => { style.remove() }
}
