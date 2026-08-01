/** Master onboarding chrome — 1:1 with festag-master-auth-onboarding canvas. */

export const MASTER_ONBOARDING_STYLES = /* css */ `
  .mob {
    --mob-ink: #1A1917;
    --mob-muted: #8891a0;
    --mob-hairline: rgba(30, 30, 32, 0.10);
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
    --mob-lyrics-lit: #1A1917;
    --mob-gutter: 28px;
    --mob-content-max: 300px;
    --mob-radius: 6px;
    --mob-field-radius: 8px;
    --mob-dot-idle: rgba(26, 25, 23, 0.15);
    --mob-dot-done: rgba(26, 25, 23, 0.35);
    --mob-dot-active: rgba(26, 25, 23, 0.85);

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
    padding: 18px var(--mob-gutter) 8px;
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
    padding: 8px var(--mob-gutter) 0;
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
  .mob-h1-inline { line-height: 1.2; }
  .mob-h1-inline .mob-h1-ink,
  .mob-h1-inline .mob-h1-muted { display: inline; }

  .mob-error {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.4;
    color: #b42318;
  }

  .mob-ready-hint {
    margin: 14px 0 0;
    font-size: 13px;
    line-height: 1.45;
    letter-spacing: 0.01em;
    color: var(--mob-muted);
    animation: mobShellIn .28s ease both;
  }
  @keyframes mobShellIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Intent field */
  .mob-intent-wrap { position: relative; width: 100%; margin-top: 18px; }
  .mob-intent-shell {
    position: relative;
    border-radius: 8px;
    border: 1px solid var(--mob-hairline);
    background: transparent;
    padding: 11px 14px;
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
    top: 11px;
    right: 14px;
    font-size: 15px;
    line-height: 22px;
    letter-spacing: 0.01em;
    color: var(--mob-muted);
    pointer-events: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.72;
    transform: translate3d(0, 0, 0);
    filter: blur(0);
    transition:
      opacity .42s cubic-bezier(.22,1,.36,1),
      transform .42s cubic-bezier(.22,1,.36,1),
      filter .42s ease;
  }
  .mob-intent-example.is-focused { opacity: 0.42; }
  .mob-intent-example.is-out {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
    filter: blur(6px);
  }
  .mob-intent-caret {
    position: absolute;
    left: 14px;
    top: 13px;
    width: 2px;
    height: 18px;
    border-radius: 1px;
    background: var(--mob-caret);
    pointer-events: none;
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
    height: 22px;
    background: linear-gradient(to bottom, var(--mob-wash-top), transparent);
  }
  .mob-connect-fade-bottom {
    bottom: 0;
    height: 64px;
    background: linear-gradient(
      to top,
      var(--mob-wash-bottom) 0%,
      rgba(243, 240, 232, 0.92) 22%,
      transparent 100%
    );
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
    font-size: 12.5px;
    color: var(--mob-muted);
    letter-spacing: 0.01em;
    flex-shrink: 0;
  }
  .mob-connect-foot {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 1.4;
    letter-spacing: 0.02em;
    color: var(--mob-muted);
  }

  /* Apple-style flow beads — canvas 1:1 */
  .mob-dots {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: max(28px, env(safe-area-inset-bottom, 0px));
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 0;
    background: transparent;
    pointer-events: auto;
    z-index: 5;
  }
  .mob-dot {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    border: none;
    padding: 0;
    margin: 0;
    background: var(--mob-dot-idle);
    cursor: pointer;
    flex-shrink: 0;
    transition: width .38s cubic-bezier(.22,1,.36,1), background .28s ease;
  }
  .mob-dot.is-done { background: var(--mob-dot-done); }
  .mob-dot.is-active {
    width: 26px;
    background: var(--mob-dot-active);
  }
  .mob-dot:disabled { cursor: default; }

  /* Desktop (≥769): same 300px column as Login/Register */
  @media (min-width: 769px) {
    .mob {
      --mob-gutter: 48px;
      --mob-content-max: 300px;
    }
    .mob-header {
      max-width: none;
      width: 100%;
      padding: 14px 36px 0;
    }
    .mob-body {
      max-width: none;
      width: 100%;
      padding: clamp(32px, 6vh, 64px) var(--mob-gutter) 0;
      justify-content: center;
      align-items: center;
    }
    .mob-stage {
      width: 100%;
      max-width: var(--mob-content-max);
      flex: 0 1 auto;
      max-height: calc(100dvh - 160px);
      padding-bottom: 88px;
      margin: 0;
    }
    .mob-h1 {
      font-size: 28px;
      line-height: 30px;
      letter-spacing: -0.02em;
    }
    .mob-dots {
      bottom: max(32px, env(safe-area-inset-bottom, 0px));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mob-intent-caret { animation: none !important; opacity: 0.7; }
    .mob-intent-example { transition: none !important; filter: none !important; }
    .mob-ready-hint { animation: none !important; }
    .mob.is-exiting { transition: none !important; }
    .mob-dot { transition: none !important; }
  }
`
