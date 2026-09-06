/** Natural-height cards, independent collection controls, and sortable groups. */
export const CLIPS_CSS = String.raw`
.dbm-toolbar { display: flex; align-items: stretch; gap: 8px; margin-bottom: 10px; }
.dbm-search { display: flex; min-width: 0; flex: 1; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--dbm-border); border-radius: 9px; background: var(--dbm-surface); color: var(--dbm-text-3); }
.dbm-search:focus-within { border-color: var(--dbm-brand); }
.dbm-search input { width: 100%; min-width: 0; border: 0; outline: 0; padding: 10px 0; background: transparent; color: var(--dbm-text); font-size: 11px; }
.dbm-trash-toggle { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 7px 10px; border: 1px solid var(--dbm-border); border-radius: 9px; background: var(--dbm-surface); color: var(--dbm-text-2); font-size: 11px; white-space: nowrap; cursor: pointer; }
.dbm-trash-toggle:hover { border-color: var(--dbm-border-strong); background: var(--dbm-hover); color: var(--dbm-text); }
.dbm-trash-toggle[aria-pressed="true"] { border-color: var(--dbm-brand); background: var(--dbm-brand-soft); color: var(--dbm-brand); }
.dbm-trash-toggle b { display: grid; min-width: 17px; height: 17px; place-items: center; padding: 0 4px; border-radius: 5px; background: var(--dbm-muted); color: var(--dbm-text); font-size: 10px; font-weight: 500; }
.dbm-collection-summary { display: flex; align-items: center; gap: 8px; min-height: 28px; margin: 0 0 8px; color: var(--dbm-text-3); font-size: 10px; }
.dbm-collection-summary > span { min-width: 0; flex: 1; }
.dbm-collection-summary .dbm-button { min-height: 24px; padding: 3px 5px; font-size: 10px; }
.dbm-trash-banner { display: flex; align-items: center; gap: 9px; padding: 10px 0 15px; color: var(--dbm-text-2); }
.dbm-trash-banner > span { min-width: 0; flex: 1; }
.dbm-trash-banner strong, .dbm-trash-banner small { display: block; }
.dbm-trash-banner strong { font-size: 13px; font-weight: 550; }
.dbm-trash-banner small { margin-top: 4px; color: var(--dbm-text-3); font-size: 10px; line-height: 1.5; }
.dbm-trash-banner .dbm-button { flex: 0 0 auto; color: var(--dbm-brand); font-size: 10px; }
.dbm-clip-group + .dbm-clip-group { margin-top: 16px; }
.dbm-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 11px; align-items: start; }
.dbm-card-grid[data-view="list"] { grid-template-columns: 1fr; }
.dbm-collection-divider { display: flex; align-items: center; gap: 10px; margin: 11px 1px 8px; color: var(--dbm-text-3); font-size: 10px; }
.dbm-collection-divider i { height: 1px; flex: 1; background: var(--dbm-border); }
.dbm-sortable-clip { position: relative; min-width: 0; touch-action: auto; }
.dbm-sortable-clip[data-dragging="true"] { opacity: .25; }
.dbm-card { position: relative; min-width: 0; padding: 15px; border: 1px solid var(--dbm-border); border-radius: 14px; background: var(--dbm-surface); color: var(--dbm-text); transition: border-color 160ms ease, box-shadow 160ms ease; }
.dbm-card:hover { border-color: var(--dbm-border-strong); box-shadow: 0 3px 14px #0000000d; }
.dbm-card[data-selected="true"] { border-color: var(--dbm-brand); box-shadow: 0 0 0 1px color-mix(in srgb, var(--dbm-brand) 15%, transparent); }
.dbm-card[data-pinned="true"] { border-top-color: color-mix(in srgb, var(--dbm-leaf) 45%, var(--dbm-border)); }
.dbm-card-scope { display: flex; align-items: center; gap: 6px; min-height: 24px; margin: -3px -3px 9px 0; color: var(--dbm-text-3); font-size: 10px; }
.dbm-card-scope > i { width: 5px; height: 5px; flex: 0 0 5px; border-radius: 50%; background: var(--dbm-leaf); }
.dbm-card-scope > span:not(:last-child) { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dbm-card-scope > input { width: 14px; height: 14px; margin: 0 3px 0 0; flex: 0 0 auto; accent-color: var(--dbm-brand); cursor: pointer; }
.dbm-card-scope .dbm-icon-button { width: 24px; min-height: 24px; padding: 3px; }
.dbm-pin-badge { color: var(--dbm-leaf); font-size: 9px; font-weight: 500; white-space: nowrap; }
.dbm-drag-handle { display: grid; width: 23px; height: 24px; flex: 0 0 23px; place-items: center; border: 0; border-radius: 6px; background: transparent; color: var(--dbm-text-3); cursor: grab; touch-action: none; }
.dbm-drag-handle:hover:not(:disabled) { background: var(--dbm-hover); color: var(--dbm-text); }
.dbm-drag-handle:active { cursor: grabbing; }
.dbm-drag-handle:disabled { opacity: .3; cursor: not-allowed; }
.dbm-excerpt-shell { max-height: 132px; overflow: hidden; }
.dbm-card-reading[data-expanded="true"] .dbm-excerpt-shell { max-height: none; }
.dbm-excerpt { color: var(--dbm-text); font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
.dbm-excerpt p:first-child { margin-top: 0; }
.dbm-excerpt p:last-child { margin-bottom: 0; }
.dbm-reading-actions { display: flex; gap: 4px; margin: 5px -4px 0; }
.dbm-reading-action { display: inline-flex; align-items: center; gap: 4px; min-height: 24px; border: 0; border-radius: 6px; padding: 3px 4px; background: transparent; color: var(--dbm-text-3); cursor: pointer; font-size: 10px; }
.dbm-reading-action:hover { color: var(--dbm-brand); background: var(--dbm-hover); }
.dbm-card-reading[data-expanded="true"] .dbm-reading-action:first-child svg { transform: rotate(180deg); }
.dbm-focus-trigger { margin-left: auto; opacity: 0; }
.dbm-card:hover .dbm-focus-trigger, .dbm-card:focus-within .dbm-focus-trigger { opacity: 1; }
.dbm-note { margin: 9px 0 0; padding: 8px 10px; border-left: 2px solid var(--dbm-border-strong); border-radius: 0 6px 6px 0; background: color-mix(in srgb, var(--dbm-muted) 50%, transparent); color: var(--dbm-text-2); font-size: 11px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
.dbm-note > span { color: var(--dbm-text-3); margin-right: 7px; }
.dbm-card .dbm-tags { margin-top: 11px; }
.dbm-card .dbm-tag { border-radius: 5px; background: var(--dbm-muted); color: var(--dbm-text-2); font-size: 10px; cursor: default; }
.dbm-meta { margin-top: 9px; color: var(--dbm-text-3); font-size: 10px; line-height: 1.6; overflow-wrap: anywhere; }
.dbm-card-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 12px; }
.dbm-card-actions .dbm-button { min-height: 30px; flex: 0 0 auto; padding: 5px 9px; border-radius: 8px; font-size: 11px; }
.dbm-derived { margin-top: 10px; padding-top: 9px; border-top: 1px solid var(--dbm-border); }
.dbm-derived summary { display: flex; align-items: center; gap: 6px; color: var(--dbm-text-3); font-size: 10px; cursor: pointer; list-style: none; }
.dbm-derived summary::-webkit-details-marker { display: none; }
.dbm-derived summary > svg:last-child { margin-left: auto; }
.dbm-derived[open] summary > svg:last-child { transform: rotate(180deg); }
.dbm-derived-link { display: grid; width: 100%; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 6px; border: 0; border-radius: 7px; margin-top: 5px; padding: 6px; background: var(--dbm-muted); color: var(--dbm-text); cursor: pointer; text-align: left; }
.dbm-derived-link:hover { background: var(--dbm-hover); }
.dbm-derived-link span { color: var(--dbm-leaf); font-size: 9px; }
.dbm-derived-link strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; font-weight: 500; }
.dbm-derived-link i { color: var(--dbm-text-3); font-style: normal; }
.dbm-focus-modal { width: min(780px, calc(100vw - 32px)); max-width: 780px; color: var(--dbm-text); }
.dbm-focus-modal-content { max-height: 72vh; overflow: auto; }
.dbm-focus-copy { color: var(--dbm-text); font-size: 14px; line-height: 1.8; overflow-wrap: anywhere; }
.dbm-focus-copy p:first-child { margin-top: 0; }
.dbm-focus-note { margin-top: 18px; padding: 11px 13px; border-left: 2px solid var(--dbm-border-strong); border-radius: 0 9px 9px 0; background: var(--dbm-muted); color: var(--dbm-text-2); }
.dbm-focus-note strong { color: var(--dbm-text); font-size: 11px; }
.dbm-focus-note p { margin: 5px 0 0; white-space: pre-wrap; font-size: 12px; line-height: 1.6; }
.dbm-focus-actions { display: flex; width: 100%; justify-content: flex-end; gap: 6px; }
.dbm-edit-modal { width: min(440px, calc(100vw - 32px)); color: var(--dbm-text); }
.dbm-drag-preview { box-sizing: border-box; box-shadow: var(--dbm-shadow-md); border-color: var(--dbm-brand); transform: rotate(.6deg); cursor: grabbing; font-family: inherit; }
.dbm-drag-preview-excerpt { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; font-size: 13px; line-height: 1.8; white-space: pre-wrap; }
.dbm-batch-toolbar { position: sticky; z-index: 4; bottom: -1px; margin: 14px -4px -4px; padding: 9px 10px; border: 1px solid var(--dbm-border-strong); border-radius: 12px; background: var(--dbm-floating); box-shadow: var(--dbm-shadow-sm); animation: dbm-sheet-in 150ms ease-out; }
.dbm-batch-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.dbm-batch-heading strong { flex: 1; color: var(--dbm-text-2); font-size: 10px; font-weight: 500; }
.dbm-batch-heading .dbm-button { min-height: 22px; padding: 2px 4px; font-size: 10px; }
.dbm-batch-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.dbm-batch-actions .dbm-button { font-size: 11px; padding: 5px 8px; }
@media (hover: none) { .dbm-focus-trigger { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .dbm-sortable-clip, .dbm-drag-preview { transition-duration: .01ms !important; } }
`
