/** Master onboarding chrome — 1:1 with festag-master-auth-onboarding canvas. */

export const MASTER_ONBOARDING_STYLES = /* css */ `
  .mob {
    --mob-ink: #1A1917;
    --mob-muted: #8891a0;
    /* Same as Login email --festag-input-placeholder (AUTH_MUTED_LIGHT). */
    --mob-placeholder: #8891a0;
    --mob-hairline: rgba(30, 30, 32, 0.10);
    --mob-hairline-filled: rgba(30, 30, 32, 0.16);
    --mob-primary: #5B647D;
    --mob-caret: #66708D;
    --mob-card-bg: rgba(255, 255, 255, 0.72);
    --mob-card-bg-on: #FFFFFF;
    --mob-card-border: rgba(30, 30, 32, 0.04);
    --mob-card-border-hover: rgba(30, 30, 32, 0.12);
    --mob-icon-tile: rgba(30, 30, 32, 0.04);
    --mob-canvas: #FAF9F5;
    --mob-wash-top: #FBFAF6;
    --mob-wash-bottom: #F3F0E8;
    --mob-lyrics-dim: rgba(26, 25, 23, 0.28);
    --mob-lyrics-lit: #1A1917;
    --mob-gutter: 28px;
    /* Same column as Login/Register --al-panel-width (AUTH_DESKTOP_CHROME_VARS). */
    --mob-content-max: 300px;
    --mob-radius: 6px;
    --mob-field-radius: 8px;
    --mob-dot-idle: rgba(26, 25, 23, 0.15);
    --mob-dot-done: rgba(26, 25, 23, 0.35);
    --mob-dot-active: rgba(26, 25, 23, 0.85);
    --mob-kb-shift: 0px;
    /* Shared with Login/Register (auth-chrome-tokens AUTH_TRACKING_*). */
    --auth-tracking: 0.01em;
    --auth-tracking-display: 0.006em;

    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(ellipse 90% 48% at 40% -8%, rgba(91, 100, 125, 0.04), transparent 55%),
      linear-gradient(180deg, var(--mob-wash-top) 0%, var(--mob-canvas) 48%, var(--mob-wash-bottom) 100%);
    color: var(--mob-ink);
    font-family: 'Aeonik', system-ui, sans-serif;
    font-weight: 400;
    letter-spacing: var(--auth-tracking);
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    transform: translate3d(0, calc(-1 * var(--mob-kb-shift, 0px)), 0);
    transition: transform .18s ease;
  }
  /* Beat globals Medium (500) — canvas SSOT is Aeonik Regular */
  .mob,
  .mob h1,
  .mob h2,
  .mob p,
  .mob span,
  .mob button,
  .mob input,
  .mob textarea,
  .mob label,
  .mob a {
    font-family: 'Aeonik', system-ui, sans-serif !important;
    font-weight: 400 !important;
    font-synthesis: none;
  }
  .mob.is-exiting { opacity: 0; transition: opacity .28s ease; pointer-events: none; }
  .mob.is-booting { opacity: 0; }
  .mob[data-kb-open] .mob-nav {
    opacity: 0;
    pointer-events: none;
    transition: opacity .18s ease;
  }

  .mob-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px 0;
    max-width: none;
    width: 100%;
    margin: 0;
    box-sizing: border-box;
  }
  .mob-mark {
    width: 28px;
    height: 28px;
    object-fit: contain;
    display: block;
    /* Light/read ivory: fluid mark is light art — ink like Login. */
    filter: brightness(0) saturate(100%);
    opacity: 0.9;
  }
  .mob-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mob-header-actions .auth-docs-trigger {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
    max-width: 36px !important;
    max-height: 36px !important;
  }

  .mob-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: calc(var(--mob-content-max) + var(--mob-gutter) * 2);
    margin: 0 auto;
    /* Bottom pad clears absolute nav so center sits in the visible band */
    padding: 8px var(--mob-gutter) 100px;
    box-sizing: border-box;
    overflow: hidden;
    touch-action: pan-y;
    justify-content: center;
    align-items: center;
  }
  .mob-body--preparing {
    padding-bottom: 28px;
    justify-content: center;
  }
  .mob-stage {
    flex: 0 1 auto;
    min-height: 0;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: var(--mob-content-max);
    margin: 0 auto;
    padding-bottom: 0;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    justify-content: flex-start;
    align-items: stretch;
  }
  .mob[data-kb-open] .mob-body {
    justify-content: flex-start;
    padding-bottom: 28px;
  }
  .mob[data-kb-open] .mob-stage {
    flex: 1 1 auto;
    padding-bottom: 28px;
  }
  .mob-stage::-webkit-scrollbar { display: none; }
  .mob-stage--preparing {
    flex: 1 1 auto;
    padding-bottom: 28px;
    justify-content: center;
    overflow: hidden;
  }

  .mob-h1 {
    margin: 0;
    font-size: 26px;
    line-height: 1.15;
    letter-spacing: var(--auth-tracking-display);
    font-weight: 400;
    font-family: Aeonik, system-ui, sans-serif;
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
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.45;
    letter-spacing: var(--auth-tracking);
    color: var(--mob-muted);
    opacity: 0.72;
    animation: mobShellIn .28s ease both;
  }
  .mob-ready-hint.is-ready {
    opacity: 1;
    color: var(--mob-ink);
  }
  @keyframes mobShellIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Intent field — taller idle (2 lines), login placeholder gray, rotating examples */
  .mob-intent-wrap { position: relative; width: 100%; margin-top: 18px; }
  .mob-intent-shell {
    position: relative;
    border-radius: 8px;
    border: 1px solid var(--mob-hairline);
    background: transparent;
    padding: 14px 14px;
    min-height: 64px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
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
    min-height: 44px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--mob-ink);
    font-size: 15px;
    line-height: 22px;
    font-family: inherit;
    font-weight: 400;
    letter-spacing: var(--auth-tracking);
    resize: none !important;
    outline: none;
    box-sizing: border-box;
    overflow: hidden;
    caret-color: var(--mob-caret);
  }
  .mob-intent-area.is-empty { caret-color: transparent; }

  /* Canvas Tagro chip — pinned inside field */
  .mob-tagro-chip {
    position: absolute;
    right: 8px;
    bottom: 8px;
    z-index: 12;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    min-width: 90px;
    padding: 0 14px 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: rgba(91, 100, 125, 0.10);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    color: rgba(26, 25, 23, 0.72);
    font-size: 12.5px;
    letter-spacing: var(--auth-tracking);
    font-family: inherit;
    cursor: pointer;
    animation: mobTagroChipIn .32s cubic-bezier(.22,1,.36,1) both;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    white-space: nowrap;
  }
  .mob-tagro-chip-ico {
    display: inline-flex;
    color: var(--mob-primary);
  }
  @keyframes mobTagroChipIn {
    from { opacity: 0; transform: translateY(4px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Canvas Tagro panel — anchored under field (no portal) */
  .mob-tagro-panel {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 10px);
    z-index: 12;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(30, 30, 32, 0.08);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 28px rgba(0, 0, 0, 0.08);
    animation: mobTagroFloatIn .34s cubic-bezier(.22,1,.36,1) both;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    color: var(--mob-ink);
    pointer-events: auto;
  }
  @keyframes mobTagroFloatIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .mob-tagro-panel-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .mob-tagro-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px 3px 5px;
    border-radius: 7px;
    font-size: 12px;
    letter-spacing: var(--auth-tracking);
    line-height: 1.3;
    background: rgba(91, 100, 125, 0.10);
    color: rgba(26, 25, 23, 0.72);
    white-space: nowrap;
  }
  .mob-tagro-busy {
    margin-left: auto;
    font-size: 11.5px;
    color: var(--mob-muted);
  }
  .mob-tagro-modes {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }
  .mob-tagro-auto-wrap { position: relative; }
  .mob-tagro-auto {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 8px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--mob-ink);
    font-size: 12.5px;
    letter-spacing: var(--auth-tracking);
    font-family: inherit;
    cursor: pointer;
  }
  .mob-tagro-auto.is-open,
  .mob-tagro-auto:hover {
    background: rgba(30, 30, 32, 0.05);
  }
  .mob-tagro-auto:disabled { opacity: 0.45; cursor: default; }
  .mob-tagro-auto-menu {
    position: absolute;
    left: 0;
    bottom: calc(100% + 8px);
    z-index: 4;
    margin: 0;
    padding: 5px;
    list-style: none;
    min-width: 176px;
    border-radius: 12px;
    background: #FFFFFF;
    border: 1px solid rgba(30, 30, 32, 0.08);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.10);
  }
  .mob-tagro-auto-menu button {
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--mob-ink);
    font-family: inherit;
    cursor: pointer;
  }
  .mob-tagro-auto-menu button.is-on,
  .mob-tagro-auto-menu button:hover {
    background: rgba(30, 30, 32, 0.05);
  }
  .mob-tagro-auto-label { display: block; font-size: 13px; }
  .mob-tagro-auto-hint {
    display: block;
    font-size: 11.5px;
    color: var(--mob-muted);
    margin-top: 2px;
  }
  .mob-tagro-mode {
    height: 28px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: transparent;
    color: var(--mob-ink);
    font-size: 12.5px;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
  }
  .mob-tagro-mode.is-on {
    border-color: rgba(91, 100, 125, 0.55);
    background: rgba(91, 100, 125, 0.16);
  }
  .mob-tagro-mode:disabled {
    color: var(--mob-muted);
    cursor: default;
    opacity: 0.7;
  }

  .mob-intent-example {
    position: absolute;
    left: 14px;
    top: 14px;
    right: 14px;
    font-size: 15px;
    line-height: 22px;
    letter-spacing: var(--auth-tracking);
    color: var(--mob-placeholder);
    pointer-events: none;
    white-space: normal;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    opacity: 1;
    transform: translate3d(0, 0, 0);
    filter: blur(0);
    transition:
      opacity .42s cubic-bezier(.22,1,.36,1),
      transform .42s cubic-bezier(.22,1,.36,1),
      filter .42s ease;
  }
  .mob-intent-example.is-focused { opacity: 0.55; }
  .mob-intent-example.is-out {
    opacity: 0;
    transform: translate3d(0, 8px, 0);
    filter: blur(5px);
  }
  .mob-intent-caret {
    position: absolute;
    left: 14px;
    top: 16px;
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

  /* Clarify chips — same height as login field (46) */
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
    border: 1px solid var(--mob-card-border);
    background: #FFFFFF;
    box-shadow: none;
    color: var(--mob-ink);
    font-size: 15px;
    letter-spacing: var(--auth-tracking);
    line-height: 1.25;
    font-family: inherit;
    font-weight: 400;
    cursor: pointer;
    box-sizing: border-box;
    transition: border-color .18s ease, border-width .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .mob-chip:hover:not(.is-on) {
    border-color: var(--mob-card-border-hover);
  }
  .mob-chip.is-on {
    border: 2px solid var(--mob-primary);
    background: var(--mob-card-bg-on);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  .mob-chip-hint {
    margin: 14px 0 0;
    font-size: 13px;
    line-height: 1.45;
    letter-spacing: var(--auth-tracking);
    color: var(--mob-muted);
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .mob-enter-ico {
    display: inline-flex;
    flex-shrink: 0;
    color: inherit;
    opacity: 0.92;
  }
  .mob-enter-ico svg {
    display: block;
  }

  /* Connect list */
  .mob-connect-list-wrap {
    position: relative;
    width: 100%;
    margin-top: 16px;
    margin-bottom: 4px;
  }
  .mob-connect-list {
    max-height: 288px;
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
    border: 1px solid var(--mob-card-border);
    background: #FFFFFF;
    box-shadow: none;
    flex-shrink: 0;
    box-sizing: border-box;
    cursor: pointer;
    font-family: inherit;
    width: 100%;
    text-align: left;
    margin: 0;
    transition: border-color .18s ease, border-width .18s ease, background .18s ease, box-shadow .18s ease;
  }
  .mob-connect-row:hover:not(.is-on) {
    border-color: var(--mob-card-border-hover);
  }
  .mob-connect-row.is-on {
    border: 2px solid var(--mob-primary);
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
    letter-spacing: var(--auth-tracking);
    line-height: 1.25;
    opacity: 0.88;
  }
  .mob-connect-row.is-on .mob-connect-name { opacity: 1; }
  .mob-connect-state {
    font-size: 12.5px;
    color: var(--mob-muted);
    letter-spacing: var(--auth-tracking);
    flex-shrink: 0;
  }
  .mob-connect-foot {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 1.4;
    letter-spacing: var(--auth-tracking);
    color: var(--mob-muted);
  }

  /* Bottom navi — bare beads only (canvas SSOT, no glass capsule) */
  .mob-nav {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 6;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px calc(12px + max(12px, env(safe-area-inset-bottom, 0px)));
    background: transparent;
    box-sizing: border-box;
    pointer-events: none;
  }
  .mob-nav-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    pointer-events: none;
  }
  .mob-dots {
    position: relative;
    left: auto;
    transform: none;
    bottom: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 8px;
    padding: 0;
    margin: 0;
    border-radius: 0;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    pointer-events: auto;
  }
  .mob-dot {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    border: none !important;
    padding: 0;
    margin: 0;
    background: var(--mob-dot-idle);
    cursor: pointer;
    flex-shrink: 0;
    box-shadow: none !important;
    outline: none;
    transition: width .38s cubic-bezier(.22,1,.36,1), background .28s ease;
  }
  .mob-dot.is-done { background: var(--mob-dot-done); }
  .mob-dot.is-active {
    width: 26px;
    background: var(--mob-dot-active);
  }
  .mob-dot:disabled { cursor: default; }

  /* Desktop (≥769): same 300px column as Login/Register buttons/fields */
  @media (min-width: 769px) {
    .mob {
      --mob-gutter: 48px;
      --mob-content-max: 300px;
    }
    .mob-header {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: 18px 36px 8px;
      box-sizing: border-box;
      justify-content: space-between;
    }
    .mob-mark {
      width: 28px;
      height: 28px;
      filter: brightness(0) saturate(100%);
      opacity: 0.9;
    }
    .mob-nav {
      padding: 20px 24px 28px;
      background: transparent;
    }
    .mob-nav-inner { gap: 0; }
    .mob-dots {
      min-height: 8px;
      padding: 0;
      background: transparent !important;
      box-shadow: none !important;
    }
    .mob-dot {
      width: 9px;
      height: 9px;
    }
    .mob-dot.is-active { width: 28px; }
    .mob-body {
      max-width: none;
      width: 100%;
      /* Bottom pad clears absolute nav so center sits in the visible band */
      padding: 28px var(--mob-gutter) 120px;
      justify-content: center;
      align-items: center;
    }
    .mob-body--preparing {
      padding-bottom: 28px;
    }
    .mob-stage {
      width: 100%;
      max-width: var(--mob-content-max);
      flex: 0 1 auto;
      min-height: 0;
      max-height: 100%;
      padding-bottom: 0;
      margin: 0 auto;
      justify-content: flex-start;
      align-items: stretch;
    }
    .mob-stage--preparing {
      flex: 1 1 auto;
      max-height: none;
      justify-content: center;
    }
    .mob-h1 {
      font-size: 28px;
      line-height: 1.18;
      letter-spacing: var(--auth-tracking-display);
      text-align: left;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mob-intent-caret { animation: none !important; opacity: 0.7; }
    .mob-intent-example { transition: none !important; filter: none !important; }
    .mob-ready-hint { animation: none !important; }
    .mob-tagro-chip,
    .mob-tagro-panel { animation: none !important; }
    .mob.is-exiting { transition: none !important; }
    .mob-dot { transition: none !important; }
  }
`
