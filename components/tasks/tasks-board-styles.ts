/**
 * Aufgaben — board chrome.
 *
 * Built only from the theme tokens (--bg / --surface / --border / --text …)
 * so light, Festag Night and Read all work without a second stylesheet.
 * Motion communicates state changes; nothing animates for decoration.
 */
export const TASKS_BOARD_CSS = `
.tsk-shell { --tsk-gap: 10px; }

/* ── toolbar ─────────────────────────────────────────────────────── */
.tsk-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 0 0 14px;
}
.tsk-search {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  min-width: 200px;
  flex: 1 1 240px;
  max-width: 380px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-2) 45%, transparent);
  color: var(--text-muted);
  transition: border-color .14s ease, background .14s ease;
}
.tsk-search:focus-within {
  border-color: color-mix(in srgb, var(--text) 26%, transparent);
  background: var(--surface);
}
.tsk-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: var(--text);
  outline: none;
}
.tsk-search kbd {
  font: inherit;
  font-size: 10.5px;
  padding: 2px 5px;
  border-radius: 5px;
  border: 1px solid var(--border);
  color: var(--text-muted);
}
.tsk-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}
.tsk-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  border-radius: 9px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  transition: color .12s ease, background .12s ease;
  white-space: nowrap;
}
.tsk-tab:hover { color: var(--text); background: color-mix(in srgb, var(--surface-2) 45%, transparent); }
.tsk-tab.on {
  color: var(--text);
  background: color-mix(in srgb, var(--surface-2) 75%, transparent);
  border-color: var(--border);
}
.tsk-tab em {
  font-style: normal;
  font-size: 11px;
  color: color-mix(in srgb, currentColor 62%, transparent);
  font-variant-numeric: tabular-nums;
}
.tsk-tab.attention { color: #c2410c; }
.tsk-tab.attention.on { background: color-mix(in srgb, #ea580c 12%, transparent); border-color: color-mix(in srgb, #ea580c 26%, transparent); }
.tsk-toolbar-spacer { flex: 1 1 auto; }

.tsk-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background .12s ease, color .12s ease;
  flex-shrink: 0;
}
.tsk-icon-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--surface-2) 60%, transparent); color: var(--text); }
.tsk-icon-btn.on { background: color-mix(in srgb, var(--surface-2) 80%, transparent); color: var(--text); border-color: var(--border); }
.tsk-icon-btn:disabled { opacity: .4; cursor: not-allowed; }

.tsk-primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 14px;
  border-radius: 9px;
  border: 0;
  background: var(--dec-cta-bg, #5b647d);
  color: var(--dec-cta-text, #fff);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: filter .12s ease;
  white-space: nowrap;
}
.tsk-primary-btn:hover:not(:disabled) { filter: brightness(1.08); }
.tsk-primary-btn:disabled { opacity: .45; cursor: not-allowed; }

/* ── attention band ──────────────────────────────────────────────── */
.tsk-attention-band {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, #ea580c 22%, var(--border));
  background: color-mix(in srgb, #ea580c 7%, transparent);
}
.tsk-attention-band svg { color: #ea580c; margin-top: 1px; flex-shrink: 0; }
.tsk-attention-band strong { display: block; font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 2px; }
.tsk-attention-band p { margin: 0; font-size: 12.5px; line-height: 1.45; color: var(--text-secondary, var(--text-muted)); }
.tsk-attention-band button {
  margin-left: auto;
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: #c2410c;
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
}
.tsk-attention-band button:hover { background: color-mix(in srgb, #ea580c 12%, transparent); }

/* ── group headings ──────────────────────────────────────────────── */
.tsk-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 22px 0 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  font-size: 11.5px;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.tsk-group:first-child { margin-top: 4px; }
.tsk-group em { font-style: normal; margin-left: auto; text-transform: none; letter-spacing: 0; font-variant-numeric: tabular-nums; }

/* ── row ─────────────────────────────────────────────────────────── */
.tsk-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px 2px 2px;
  border-radius: 12px;
  transition: background .12s ease;
}
.tsk-row + .tsk-row { border-top: 1px solid color-mix(in srgb, var(--border) 45%, transparent); border-radius: 0; }
.tsk-row:hover { background: color-mix(in srgb, var(--surface-2) 32%, transparent); border-radius: 12px; }
.tsk-row:hover + .tsk-row { border-top-color: transparent; }
.tsk-row.is-focused { background: color-mix(in srgb, var(--surface-2) 42%, transparent); border-radius: 12px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 12%, transparent); }
.tsk-row.is-selected { background: color-mix(in srgb, var(--dec-cta-bg, #5b647d) 10%, transparent); border-radius: 12px; }
.tsk-row.is-busy { opacity: .62; pointer-events: none; }
.tsk-row.is-done .tsk-row-title { color: var(--text-muted); }
.tsk-row.is-cancelled .tsk-row-title { color: var(--text-muted); text-decoration: line-through; text-decoration-thickness: 1px; }

.tsk-row-check {
  width: 20px;
  height: 20px;
  margin-left: 4px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--dec-cta-text, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity .12s ease, background .12s ease;
}
.tsk-row:hover .tsk-row-check, .tsk-row-check.visible, .tsk-row-check:focus-visible { opacity: 1; }
.tsk-row.is-selected .tsk-row-check { background: var(--dec-cta-bg, #5b647d); border-color: transparent; opacity: 1; }

.tsk-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 8px 12px 10px;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: inherit;
}
.tsk-row-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  width: 118px;
  padding-top: 1px;
  font-size: 11.5px;
  color: var(--text-muted);
}
.tsk-row-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--tsk-state, #8790a5);
  flex-shrink: 0;
}
.tsk-row-status-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.tsk-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tsk-row-title-line { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.tsk-row-title {
  font-size: 13.5px;
  color: var(--text);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tsk-row-prio {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  font-size: 10.5px;
  color: var(--tsk-prio, var(--text-muted));
}
.tsk-row-sub { display: flex; align-items: baseline; gap: 8px; min-width: 0; font-size: 11.5px; color: var(--text-muted); }
.tsk-row-context { flex-shrink: 0; }
.tsk-row-update {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: color-mix(in srgb, var(--text-muted) 82%, transparent);
}
.tsk-row-sub .tsk-row-context + .tsk-row-update::before { content: '·'; margin-right: 8px; }
.tsk-row-attention {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-size: 11.5px;
  color: #c2410c;
}
.tsk-row.attn-approval .tsk-row-attention { color: #4f46e5; }
.tsk-row.attn-unassigned .tsk-row-attention { color: var(--text-muted); }

.tsk-row-meta { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.tsk-row-progress {
  width: 40px;
  height: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-2) 85%, transparent);
  overflow: hidden;
  margin-right: 6px;
  flex-shrink: 0;
}
.tsk-row-progress span { display: block; height: 100%; background: var(--dec-cta-bg, #5b647d); border-radius: 999px; transition: width .25s ease; }

.tsk-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 7px;
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 11.5px;
  white-space: nowrap;
}
.tsk-chip.filled { color: var(--text-secondary, var(--text)); }
.tsk-chip.danger { color: #dc2626; }
.tsk-chip--prio { color: var(--tsk-prio, var(--text-muted)); }
.tsk-chip-text { font-variant-numeric: tabular-nums; }
.tsk-avatar {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  color: #fff;
  letter-spacing: .02em;
}
.tsk-avatar.sm { width: 18px; height: 18px; font-size: 8.5px; }

.tsk-row-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  margin-left: 4px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  opacity: 0;
  white-space: nowrap;
  transition: opacity .12s ease, background .12s ease;
}
.tsk-row:hover .tsk-row-primary,
.tsk-row.is-focused .tsk-row-primary,
.tsk-row-primary:focus-visible { opacity: 1; }
.tsk-row-primary:hover { background: color-mix(in srgb, var(--surface-2) 70%, var(--surface)); }
.tsk-row-primary:disabled { opacity: .5; cursor: progress; }
@media (hover: none) { .tsk-row-primary { opacity: 1; } }

/* ── popovers / menus ────────────────────────────────────────────── */
.tsk-pop-wrap, .tsk-menu-wrap { position: relative; display: inline-flex; }
.tsk-pop-wrap.is-static { padding: 0 2px; opacity: .75; }
.tsk-pop-trigger { border: 0; background: transparent; padding: 0; cursor: pointer; display: inline-flex; border-radius: 8px; }
.tsk-pop-trigger:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }

.tsk-pop, .tsk-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 60;
  min-width: 210px;
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 18px 44px rgba(0,0,0,.16);
  animation: tskPop .13s ease;
}
.tsk-menu--left { right: auto; left: 0; }
@keyframes tskPop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

.tsk-pop-label {
  margin: 4px 8px 6px;
  font-size: 10.5px;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.tsk-pop-item, .tsk-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 9px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}
.tsk-pop-item:hover, .tsk-menu-item:hover { background: color-mix(in srgb, var(--surface-2) 62%, transparent); }
.tsk-pop-item.on { color: var(--text); font-weight: 500; }
.tsk-pop-item.on::after { content: '✓'; margin-left: auto; color: var(--text-muted); }
.tsk-menu-item em { margin-left: auto; font-style: normal; font-size: 10.5px; color: var(--text-muted); }
.tsk-menu-item.danger { color: #dc2626; }
.tsk-menu-item.danger:hover { background: color-mix(in srgb, #dc2626 10%, transparent); }
.tsk-menu-sep { height: 1px; margin: 5px 4px; background: var(--border); }
.tsk-pop-dot { width: 7px; height: 7px; border-radius: 999px; flex-shrink: 0; }
.tsk-pop-empty { margin: 6px 9px 8px; font-size: 12px; color: var(--text-muted); }
.tsk-pop-date {
  width: calc(100% - 10px);
  margin: 0 5px 4px;
  height: 32px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  color: var(--text);
}

.tsk-menu-step { padding: 4px 5px 5px; width: 264px; }
.tsk-menu-step-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.tsk-menu-step-head strong { flex: 1; font-size: 12.5px; font-weight: 500; color: var(--text); }
.tsk-menu-back {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 6px; border: 0;
  background: transparent; color: var(--text-muted); cursor: pointer;
}
.tsk-menu-back:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
.tsk-menu-step-note { margin: 0 0 8px; font-size: 11.5px; line-height: 1.45; color: var(--text-muted); }
.tsk-menu-step-input {
  width: 100%;
  padding: 8px 9px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-2) 35%, transparent);
  font: inherit;
  font-size: 12.5px;
  color: var(--text);
  resize: vertical;
  outline: none;
}
.tsk-menu-step-input:focus { border-color: color-mix(in srgb, var(--text) 26%, transparent); }
.tsk-menu-step-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
.tsk-step-btn {
  height: 28px; padding: 0 11px; border-radius: 8px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text); font: inherit; font-size: 12px; cursor: pointer;
}
.tsk-step-btn.primary { background: var(--dec-cta-bg, #5b647d); color: var(--dec-cta-text, #fff); border-color: transparent; }
.tsk-step-btn.primary.danger { background: #dc2626; }
.tsk-step-btn:disabled { opacity: .45; cursor: not-allowed; }

/* ── bulk bar ────────────────────────────────────────────────────── */
.tsk-bulk {
  position: sticky;
  bottom: 16px;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px auto 0;
  padding: 8px 10px 8px 14px;
  width: fit-content;
  max-width: 100%;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 14px 40px rgba(0,0,0,.18);
  animation: tskBulkIn .16s ease;
}
@keyframes tskBulkIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.tsk-bulk-count { font-size: 12.5px; color: var(--text); white-space: nowrap; }
.tsk-bulk-actions { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.tsk-bulk-btn {
  height: 28px; padding: 0 11px; border-radius: 999px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text); font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap;
}
.tsk-bulk-btn:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
.tsk-bulk-btn:disabled { opacity: .45; cursor: not-allowed; }

/* ── toasts ──────────────────────────────────────────────────────── */
.tsk-toasts {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 900;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  pointer-events: none;
  padding: 0 16px;
  max-width: 100%;
}
.tsk-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 460px;
  padding: 10px 12px 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 16px 40px rgba(0,0,0,.2);
  font-size: 12.5px;
  color: var(--text);
  pointer-events: auto;
  animation: tskToastIn .18s ease;
}
@keyframes tskToastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.tsk-toast.error { border-color: color-mix(in srgb, #dc2626 40%, var(--border)); }
.tsk-toast.warn { border-color: color-mix(in srgb, #ea580c 40%, var(--border)); }
.tsk-toast-dot { width: 6px; height: 6px; border-radius: 999px; background: #16a34a; flex-shrink: 0; }
.tsk-toast.error .tsk-toast-dot { background: #dc2626; }
.tsk-toast.warn .tsk-toast-dot { background: #ea580c; }
.tsk-toast p { margin: 0; flex: 1; line-height: 1.4; }
.tsk-toast button {
  border: 0; background: transparent; color: var(--text-muted);
  font: inherit; font-size: 12px; cursor: pointer; padding: 3px 7px; border-radius: 7px; flex-shrink: 0;
}
.tsk-toast button.undo { color: var(--text); border: 1px solid var(--border); }
.tsk-toast button:hover { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }

/* ── states ──────────────────────────────────────────────────────── */
.tsk-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  padding: 56px 24px;
  color: var(--text-muted);
}
.tsk-state strong { font-size: 14px; font-weight: 500; color: var(--text); }
.tsk-state p { margin: 0; max-width: 400px; font-size: 12.5px; line-height: 1.55; }
.tsk-state-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 12px; }
.tsk-skeleton-row {
  height: 58px;
  border-radius: 12px;
  margin-bottom: 2px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--surface-2) 34%, transparent) 25%,
    color-mix(in srgb, var(--surface-2) 62%, transparent) 37%,
    color-mix(in srgb, var(--surface-2) 34%, transparent) 63%);
  background-size: 400% 100%;
  animation: tskShimmer 1.35s ease infinite;
}
@keyframes tskShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
.tsk-spin { animation: tskSpin .9s linear infinite; }
@keyframes tskSpin { to { transform: rotate(360deg); } }

/* ── create modal ────────────────────────────────────────────────── */
.tsk-create { display: flex; flex-direction: column; gap: 14px; }
.tsk-create-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.tsk-create-modes { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
.tsk-create-modes button {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 0 11px; border-radius: 8px; border: 0;
  background: transparent; color: var(--text-muted); font: inherit; font-size: 12px; cursor: pointer;
}
.tsk-create-modes button.on { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.tsk-field { display: flex; flex-direction: column; gap: 6px; }
.tsk-field > span { font-size: 12px; color: var(--text-secondary, var(--text-muted)); display: flex; gap: 6px; align-items: baseline; }
.tsk-field > span em { font-style: normal; font-size: 11px; color: var(--text-muted); }
.tsk-field input[type="text"], .tsk-field input:not([type]), .tsk-field textarea, .tsk-field select, .tsk-quick select, .tsk-quick input {
  width: 100%;
  padding: 9px 11px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-2) 32%, transparent);
  font: inherit;
  font-size: 13px;
  color: var(--text);
  outline: none;
  transition: border-color .14s ease, background .14s ease;
}
.tsk-field input:focus, .tsk-field textarea:focus, .tsk-field select:focus {
  border-color: color-mix(in srgb, var(--text) 26%, transparent);
  background: var(--surface);
}
.tsk-field textarea { resize: vertical; line-height: 1.5; }
.tsk-field--inline { flex-direction: row; align-items: center; gap: 10px; }
.tsk-field--inline > span { flex-shrink: 0; }
.tsk-create-quick { display: flex; gap: 10px; flex-wrap: wrap; }
.tsk-quick { display: flex; flex-direction: column; gap: 5px; flex: 1 1 140px; min-width: 130px; }
.tsk-quick > span { font-size: 11.5px; color: var(--text-muted); }
.tsk-create-more {
  align-self: flex-start;
  border: 0; background: transparent; padding: 2px 0;
  color: var(--text-muted); font: inherit; font-size: 12px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px;
}
.tsk-create-more:hover { color: var(--text); }
.tsk-create-details { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
.tsk-checklist { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tsk-checklist-item {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 8px; border-radius: 8px;
  background: color-mix(in srgb, var(--surface-2) 60%, transparent);
  font-size: 12px; color: var(--text);
}
.tsk-checklist-item button { border: 0; background: transparent; color: var(--text-muted); cursor: pointer; display: inline-flex; padding: 0; }
.tsk-checklist-add { display: inline-flex; align-items: center; gap: 4px; }
.tsk-checklist-add input {
  width: 150px; height: 30px; padding: 0 9px;
  border-radius: 8px; border: 1px dashed var(--border);
  background: transparent; font: inherit; font-size: 12px; color: var(--text); outline: none;
}
.tsk-checklist-add button {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 7px; border: 1px solid var(--border);
  background: transparent; color: var(--text-muted); cursor: pointer;
}
.tsk-create-error {
  margin: 0; padding: 9px 11px; border-radius: 10px;
  border: 1px solid color-mix(in srgb, #dc2626 34%, var(--border));
  background: color-mix(in srgb, #dc2626 8%, transparent);
  font-size: 12.5px; color: #b91c1c;
}
.tsk-create-thinking {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-radius: 10px;
  background: color-mix(in srgb, var(--surface-2) 45%, transparent);
  font-size: 12.5px; color: var(--text-muted);
}
.tsk-create-foot { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--text-muted); }
.tsk-create-empty { text-align: center; padding: 20px 0 8px; }
.tsk-create-empty p { margin: 0 0 6px; font-size: 13.5px; color: var(--text); }
.tsk-create-empty small { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

.tsk-proposal {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--dec-cta-bg, #5b647d) 30%, var(--border));
  background: color-mix(in srgb, var(--dec-cta-bg, #5b647d) 6%, transparent);
  display: flex; flex-direction: column; gap: 7px;
}
.tsk-proposal-head { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-muted); }
.tsk-proposal-head strong { color: var(--text); font-weight: 500; font-size: 12px; }
.tsk-proposal-conf { margin-left: auto; font-variant-numeric: tabular-nums; }
.tsk-proposal-title { margin: 0; font-size: 13.5px; color: var(--text); }
.tsk-proposal-text { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--text-secondary, var(--text-muted)); }
.tsk-proposal-meta { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--text-muted); }
.tsk-proposal-meta strong { font-weight: 500; }
.tsk-proposal-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
.tsk-proposal-actions button {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 0 10px; border-radius: 8px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text); font: inherit; font-size: 12px; cursor: pointer;
}
.tsk-proposal-actions button.primary { background: var(--dec-cta-bg, #5b647d); color: var(--dec-cta-text, #fff); border-color: transparent; }
.tsk-proposal-actions button:disabled { opacity: .5; cursor: not-allowed; }

/* ── mobile ──────────────────────────────────────────────────────── */
@media (max-width: 860px) {
  .tsk-row-status { width: auto; }
  .tsk-row-status-label { display: none; }
  .tsk-row-main { padding: 12px 4px 12px 6px; gap: 9px; }
  .tsk-row-progress { display: none; }
  .tsk-row-primary { display: none; }
  .tsk-chip--prio { display: none; }
  .tsk-search { max-width: none; }
  .tsk-tabs { width: 100%; overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; padding-bottom: 2px; }
  .tsk-tabs::-webkit-scrollbar { display: none; }
  .tsk-pop, .tsk-menu { right: 0; min-width: 200px; }
  .tsk-bulk { bottom: 88px; }
  .tsk-toasts { bottom: 92px; }
}
`
