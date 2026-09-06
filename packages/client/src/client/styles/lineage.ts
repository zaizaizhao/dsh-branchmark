/** Organic top-down branches with a readable narrow-pane outline. */
export const LINEAGE_CSS = String.raw`
.dbm-tree-heading { display: flex; align-items: center; gap: 10px; }
.dbm-tree-heading strong { flex: 1; font-size: 13px; font-weight: 550; }
.dbm-tree-heading .dbm-button { font-size: 10px; }
.dbm-tree-caption { margin: 4px 0 12px; color: var(--dbm-text-3); font-size: 10px; }
.dbm-tree-viewport { width: 100%; overflow: auto; scrollbar-width: thin; scrollbar-color: var(--dbm-border) transparent; }
.dbm-tree-canvas { position: relative; margin: 0 auto; }
.dbm-branch-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.dbm-branch-svg path { fill: none; stroke: var(--dbm-stem); stroke-width: 2; stroke-linecap: round; }
.dbm-branch-svg path[data-mode="clips-only"] { stroke-dasharray: 5 5; }
.dbm-branch-svg path[data-mode="blank"] { stroke-dasharray: 1 6; }
.dbm-tree-node { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 6px; min-height: 70px; padding: 10px 7px; border: 1px solid transparent; border-radius: 12px; background: var(--dbm-raised); color: var(--dbm-text); text-align: center; cursor: pointer; transition: border-color 150ms, background 150ms; }
.dbm-tree-node:hover, .dbm-tree-node:focus-visible { border-color: var(--dbm-leaf); background: var(--dbm-leaf-soft); }
.dbm-tree-node[data-current="true"] { border-color: color-mix(in srgb, var(--dbm-leaf) 55%, var(--dbm-border)); background: var(--dbm-leaf-soft); }
.dbm-tree-node[data-root="true"] { flex-direction: row; justify-content: center; min-height: 64px; gap: 9px; padding: 10px; border-color: var(--dbm-border); background: var(--dbm-surface); text-align: left; }
.dbm-tree-copy { min-width: 0; }
.dbm-tree-node strong { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 12px; font-weight: 500; line-height: 1.6; overflow-wrap: anywhere; }
.dbm-tree-node small { display: block; margin-top: 3px; color: var(--dbm-text-3); font-size: 10px; line-height: 1.5; }
.dbm-tree-node[data-current="true"] small { color: var(--dbm-leaf); }
.dbm-bud { position: relative; display: block; width: 24px; height: 27px; flex: 0 0 24px; }
.dbm-bud::before, .dbm-bud::after { position: absolute; width: 11px; height: 15px; border: 1px solid var(--dbm-leaf); background: color-mix(in srgb, var(--dbm-leaf) 25%, var(--dbm-surface)); content: ""; }
.dbm-bud::before { left: 1px; top: 4px; border-radius: 2px 10px 1px 10px; transform: rotate(-17deg); }
.dbm-bud::after { right: 1px; top: 0; border-radius: 10px 2px 10px 1px; transform: rotate(17deg); }
.dbm-bud i { position: absolute; left: 11px; bottom: 0; width: 1.5px; height: 17px; background: var(--dbm-stem); transform: rotate(4deg); }
.dbm-tree-node[data-mode="blank"] .dbm-bud::before, .dbm-tree-node[data-mode="blank"] .dbm-bud::after { background: transparent; border-style: dashed; }
.dbm-tree-canvas[data-layout="outline"] .dbm-tree-node { flex-direction: row; justify-content: flex-start; gap: 10px; min-height: 62px; max-height: 66px; padding: 10px 12px; border-color: var(--dbm-border); background: var(--dbm-surface); text-align: left; }
.dbm-tree-canvas[data-layout="outline"] .dbm-tree-node[data-current="true"], .dbm-tree-canvas[data-layout="outline"] .dbm-tree-node:hover { border-color: var(--dbm-leaf); background: var(--dbm-leaf-soft); }
.dbm-tree-canvas[data-layout="outline"] .dbm-tree-node strong { -webkit-line-clamp: 1; }
.dbm-tree-key { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; margin: 12px 0 16px; color: var(--dbm-text-3); font-size: 10px; }
.dbm-tree-key span { display: flex; align-items: center; gap: 6px; }
.dbm-tree-key i { width: 18px; border-top: 2px solid var(--dbm-stem); }
.dbm-tree-key [data-mode="clips-only"] i { border-top-style: dashed; }
.dbm-tree-key [data-mode="blank"] i { border-top-style: dotted; }
.dbm-tree-node:disabled { opacity: .5; cursor: not-allowed; }
.dbm-tree-current { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--dbm-border); border-radius: 11px; background: var(--dbm-surface); }
.dbm-tree-current > span { min-width: 0; flex: 1; }
.dbm-tree-current strong, .dbm-tree-current small { display: block; }
.dbm-tree-current strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 500; }
.dbm-tree-current small { margin-top: 5px; color: var(--dbm-text-3); font-size: 10px; line-height: 1.5; }
.dbm-tree-current button { flex: 0 0 auto; font-size: 11px; }
.dbm-tree-modal { width: min(1120px, calc(100vw - 28px)); max-width: 1120px; color: var(--dbm-text); }
.dbm-tree-modal-content { max-height: 76vh; overflow: auto; }
`
