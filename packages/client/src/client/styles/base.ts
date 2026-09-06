/** Base presentation for the BranchMark overlay. */

export const BASE_CSS = String.raw`
body {
  --dbm-surface: #fff;
  --dbm-raised: #f5f6fa;
  --dbm-muted: #e9edf4;
  --dbm-floating: #fff;
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
  --dbm-leaf: #53856b;
  --dbm-leaf-soft: color-mix(in srgb, var(--dbm-leaf) 10%, var(--dbm-surface));
  --dbm-stem: color-mix(in srgb, var(--dbm-leaf) 65%, var(--dbm-border));
  --dbm-shadow-sm: 0 6px 18px rgba(0, 0, 0, .09);
  --dbm-shadow-md: 0 18px 58px rgba(0, 0, 0, .2);
}

body[data-ds-dark-theme] {
  --dbm-surface: #23262e;
  --dbm-raised: #1a1d23;
  --dbm-muted: #292e38;
  --dbm-floating: #2b303b;
  --dbm-leaf: #8fbaa0;
  --dbm-shadow-sm: 0 8px 24px rgba(0, 0, 0, .28);
  --dbm-shadow-md: 0 22px 68px rgba(0, 0, 0, .48);
}

.dbm-overlay-root {
  position: fixed;
  z-index: 900;
  inset: 0;
  color: var(--dbm-text);
  pointer-events: none;
}

.dbm-overlay-root *, .dbm-overlay-root *::before, .dbm-overlay-root *::after { box-sizing: border-box; }
.dbm-overlay-root button, .dbm-overlay-root input, .dbm-overlay-root textarea { font-family: inherit; }

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


.dbm-input, .dbm-textarea { width: 100%; border: 1px solid var(--dbm-border); border-radius: 10px; outline: 0; padding: 8px 9px; background: var(--dbm-surface); color: var(--dbm-text); font-size: 11px; line-height: 1.5; }
.dbm-input:focus, .dbm-textarea:focus { border-color: var(--dbm-brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dbm-brand) 12%, transparent); }
.dbm-textarea { resize: vertical; }
.dbm-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.dbm-filter-tags { margin-bottom: 10px; }
.dbm-tag { border: 0; border-radius: 999px; padding: 3px 7px; background: var(--dbm-brand-soft); color: var(--dbm-brand); font-size: 9px; cursor: pointer; }
.dbm-tag[data-active="true"] { background: var(--dbm-brand); color: var(--dsw-alias-label-primary-foreground); }
.dbm-empty { display: grid; min-height: 210px; place-items: center; padding: 26px; color: var(--dbm-text-3); text-align: center; }
.dbm-empty strong { display: block; margin: 9px 0 5px; color: var(--dbm-text-2); font-size: 12px; }
.dbm-empty p { max-width: 280px; margin: 0; font-size: 10px; line-height: 1.55; }
.dbm-empty-orb { display: grid; width: 38px; height: 38px; margin: 0 auto; place-items: center; border-radius: 13px; background: var(--dbm-muted); color: var(--dbm-text); }
.dbm-loading { padding: 28px; color: var(--dbm-text-3); text-align: center; font-size: 10px; }
.dbm-error, .dbm-warning { padding: 8px 9px; border-radius: 9px; font-size: 10px; line-height: 1.5; }
.dbm-error { border: 1px solid color-mix(in srgb, var(--dbm-danger) 38%, transparent); background: color-mix(in srgb, var(--dbm-danger) 7%, var(--dbm-muted)); color: var(--dbm-danger); }
.dbm-warning { margin-top: 7px; background: var(--dsw-alias-state-warn-tertiary); color: var(--dsw-alias-state-warn-label); }
.dbm-field-label { display: grid; gap: 8px; color: var(--dbm-text-2); font-size: 11px; }
.dbm-button-branch { border-color: color-mix(in srgb, var(--dbm-leaf) 25%, var(--dbm-border)); background: var(--dbm-leaf-soft); color: var(--dbm-leaf); }
.dbm-button-branch:hover:not(:disabled) { border-color: var(--dbm-leaf); background: var(--dbm-leaf-soft); color: var(--dbm-leaf); }
.dbm-overlay-root :is(button,input,textarea):focus-visible { outline: 2px solid var(--dbm-brand); outline-offset: 3px; }
`
