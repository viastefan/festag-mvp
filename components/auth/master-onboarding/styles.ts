/** Master onboarding mobile chrome — 1:1 with festag-master-auth-onboarding canvas. */

export const MASTER_ONBOARDING_STYLES = /* css */ `
  .mob {
    --mob-ink: #1A1917;
    --mob-muted: rgba(26, 25, 23, 0.48);
    --mob-hairline: rgba(30, 30, 32, 0.15);
    --mob-hairline-filled: rgba(30, 30, 32, 0.20);
    --mob-primary: #5B647D;
    --mob-caret: #66708D;
    --mob-card-bg: rgba(255, 255, 255, 0.72);
    --mob-card-bg-on: #FFFFFF;
    --mob-card-border: rgba(30, 30, 32, 0.08);
    --mob-icon-tile: rgba(30, 30, 32, 0.04);
    --mob-canvas: #FAF9F5;
    --mob-wash-top: #FBFAF6;
    --mob-wash-bottom: #F3F0E8;
    --mob-lyrics-dim: rgba(26, 25, 23, 0.28);
    --mob-lyrics-lit: rgba(26, 25, 23, 0.92);
    --mob-gutter: 28px;
    --mob-content-max: 320px;
    --mob-radius: 6px;
    --mob-field-radius: 8px;

    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(ellipse 90% 48% at 40% -8%, rgba(91, 100, 125, 0.04), transparent 55%),
      linear-gradient(180deg, var(--mob-wash-top) 0%, var(--mob-canvas) 48%, var(--mob-wash-bottom) 100%);
    color: var(--mob-ink);
    font-family: Aeonik, system-ui, sans-serif;
    font-weight: 400;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .mob.is-exiting { opacity: 0; transition: opacity .28s ease; pointer-events: none; }
  .mob.is-booting { opacity: 0; }

  .mob-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px var(--mob-gutter) 0;
    max-width: calc(var(--mob-content-max) + var(--mob-gutter) * 2);
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .mob-mark {
    width: 28px;
    height: 28px;
    object-fit: contain;
    display: block;
  }
  .mob-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mob-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: calc(var(--mob-content-max) + var(--mob-gutter) * 2);
    margin: 0 auto;
    padding: 18px var(--mob-gutter) 0;
    box-sizing: border-box;
    overflow: hidden;
    touch-action: pan-y;
  }
  .mob-body--preparing {
    padding-bottom: 28px;
    justify-content: center;
  }
  .mob-stage {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: var(--mob-content-max);
    margin: 0 auto;
    padding-bottom: 100px;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .mob-stage::-webkit-scrollbar { display: none; }
  .mob-stage--preparing {
    padding-bottom: 28px;
    justify-content: center;
    overflow: hidden;
  }

  .mob-h1 {
    margin: 0;
    font-size: 26px;
    line-height: 1.15;
    letter-spacing: -0.01em;
    font-weight: 400;
  }
  .mob-h1-ink { color: var(--mob-ink); display: block; }
  .mob-h1-muted { color: var(--mob-muted); display: block; }
  .mob-h1-inline .mob-h1-ink,
  .mob-h1-inline .mob-h1-muted { display: inline; }

  .mob-error {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.4;
    color: #b42318;
  }

  /* Intent field */
  .mob-intent-wrap { position: relative; width: 100%; margin-top: 18px; }
  .mob-intent-shell {
    position: relative;
    border-radius: 8px;
    border: 1px solid var(--mob-hairline);
    background: transparent;
    padding: 12px 14px;
    min-height: 46px;
    box-sizing: border-box;
    transition: border-color .18s ease, box-shadow .18s ease, padding .28s cubic-bezier(.22,1,.36,1);
  }
  .mob-intent-shell.has-value { border-color: var(--mob-hairline-filled); }
  .mob-intent-shell.is-focused {
    border-color: var(--mob-caret);
    box-shadow: 0 0 0 1px var(--mob-caret);
  }
  .mob-intent-shell.has-chip { padding-bottom: 44px; }
  .mob-intent-area {
    width: 100%;
    min-height: 22px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--mob-ink);
    font-size: 15px;
    line-height: 22px;
    font-family: inherit;
    font-weight: 400;
    resize: none !important;
    outline: none;
    box-sizing: border-box;
    overflow: hidden;
    caret-color: var(--mob-caret);
    field-sizing: content;
  }
  .mob-intent-area.is-empty { caret-color: transparent; }
  .mob-intent-example {
    position: absolute;
    left: 14px;
    top: 14px;
    right: 14px;
    font-size: 15px;
    line-height: 22px;
    color: var(--mob-muted);
    pointer-events: none;
    transition: opacity .42s ease;
  }
  .mob-intent-example.is-out { opacity: 0; }
  .mob-intent-caret {
    display: inline-block;
    width: 1.5px;
    height: 15px;
    margin-left: 1px;
    vertical-align: -2px;
    background: var(--mob-caret);
    animation: mobCaretBlink 1.05s steps(1, end) infinite;
  }
  @keyframes mobCaretBlink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  /* Clarify chips */
  .mob-chip-list {
    margin-top: 22px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .mob-chip {
    text-align: left;
    width: 100%;
    height: 46px;
    min-height: 46px;
    max-height: 46px;
    padding: 0 14px;
    border-radius: 8px;
    border: 2px solid var(--mob-card-border);
    background: var(--mob-card-bg);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    color: var(--mob-ink);
    font-size: 15px;
    letter-spacing: -0.005em;
    line-height: 1.25;
    font-family: inherit;
    font-weight: 400;
    cursor: pointer;
    box-sizing: border-box;
    transition: border-color .18s ease, background .18s ease;
  }
  .mob-chip.is-on {
    border-color: var(--mob-primary);
    background: var(--mob-card-bg-on);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  .mob-chip-hint {
    margin: 14px 0 0;
    font-size: 13px;
    line-height: 1.45;
    letter-spacing: 0.01em;
    color: var(--mob-muted);
  }

  /* Connect list */
  .mob-connect-list-wrap {
    position: relative;
    width: 100%;
    margin-top: 16px;
    margin-bottom: 4px;
  }
  .mob-connect-list {
    max-height: min(288px, 42vh);
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 0 56px;
    scrollbar-width: none;
  }
  .mob-connect-list::-webkit-scrollbar { display: none; }
  .mob-connect-fade-top,
  .mob-connect-fade-bottom {
    position: absolute;
    left: 0;
    right: 0;
    height: 36px;
    pointer-events: none;
    z-index: 2;
    transition: opacity .2s ease;
  }
  .mob-connect-fade-top {
    top: 0;
    background: linear-gradient(to bottom, var(--mob-wash-top), transparent);
  }
  .mob-connect-fade-bottom {
    bottom: 0;
    height: 56px;
    background: linear-gradient(to top, var(--mob-wash-bottom), transparent);
  }
  .mob-connect-row {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 46px;
    min-height: 46px;
    max-height: 46px;
    padding: 0 14px;
    border-radius: 8px;
    border: 2px solid var(--mob-card-border);
    background: var(--mob-card-bg);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    flex-shrink: 0;
    box-sizing: border-box;
    cursor: pointer;
    font-family: inherit;
    width: 100%;
    text-align: left;
    margin: 0;
    transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .mob-connect-row.is-on {
    border-color: var(--mob-primary);
    background: #FFFFFF;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  .mob-connect-icon {
    width: 28px;
    height: 28px;
    border-radius: var(--mob-radius);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--mob-icon-tile);
    flex-shrink: 0;
  }
  .mob-connect-name {
    flex: 1;
    font-size: 15px;
    color: var(--mob-ink);
    letter-spacing: -0.005em;
    line-height: 1.25;
    opacity: 0.88;
  }
  .mob-connect-row.is-on .mob-connect-name { opacity: 1; }
  .mob-connect-state {
    font-size: 12px;
    color: var(--mob-muted);
    letter-spacing: 0.01em;
    flex-shrink: 0;
  }
  .mob-connect-foot {
    margin: 8px 0 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--mob-muted);
  }

  /* Flow dots */
  .mob-dots {
    position: absolute;
    left: 0;
    right: 0;
    bottom: max(28px, env(safe-area-inset-bottom, 0px));
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    pointer-events: auto;
    z-index: 5;
  }
  .mob-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: none;
    padding: 0;
    background: rgba(26, 25, 23, 0.15);
    cursor: pointer;
    transition: background .22s ease, transform .22s ease;
  }
  .mob-dot.is-done { background: rgba(26, 25, 23, 0.35); }
  .mob-dot.is-active {
    background: rgba(26, 25, 23, 0.85);
    transform: scale(1.15);
  }
  .mob-dot:disabled { cursor: default; }

  /* Soft Weiter (connect only — intent uses settle/Enter) */
  .mob-cta {
    margin-top: 18px;
    width: 100%;
    height: 40px;
    border-radius: var(--mob-radius);
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: #ffffff;
    color: #1e1e20;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    font-family: inherit;
    font-size: 15px;
    font-weight: 400;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  }
  .mob-cta:disabled {
    opacity: 0.45;
    cursor: default;
    box-shadow: none;
  }
  .mob-cta:not(:disabled):active {
    background: #f5f5f6;
    box-shadow: none;
  }

  /* Desktop (≥769): keep same composition, slightly taller gutters */
  @media (min-width: 769px) {
    .mob-header,
    .mob-body {
      max-width: 360px;
      --mob-content-max: 320px;
    }
    .mob-body { padding-top: 28px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .mob-intent-caret { animation: none !important; opacity: 0.7; }
    .mob.is-exiting { transition: none !important; }
  }
`
