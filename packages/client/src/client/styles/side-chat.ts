/** Side chat presentation for the BranchMark overlay. */

export const SIDE_CHAT_CSS = String.raw`
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
`
