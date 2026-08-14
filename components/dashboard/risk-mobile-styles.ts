/**
 * Mobile Risiko-Erlebnis — Dashboard-Überblick (Screen 1) und Risiko-Flow (Screen 2–5).
 * Nur < 768px. Beide Flächen teilen dieselben Tokens, damit der Übergang nahtlos wirkt.
 */

const TOKENS = `
  --rk-bg: #F7F7F4;
  --rk-surface: #FFFFFF;
  --rk-surface-2: #F2F2EE;
  --rk-line: rgba(24, 24, 27, 0.07);
  --rk-line-strong: rgba(24, 24, 27, 0.12);
  --rk-ink: #16181A;
  --rk-ink-2: #6E7378;
  --rk-ink-3: #A2A6AA;
  --rk-dot: #B9BDC1;
  --rk-green: #4E8A5C;
  --rk-green-soft: #EDF4EE;
  --rk-green-line: #8FB89A;
  --rk-dark: #1A222C;
  --rk-shadow-sm: 0 1px 2px rgba(24, 24, 27, 0.05);
  --rk-shadow-md: 0 4px 16px rgba(24, 24, 27, 0.08);
  --rk-shadow-lg: 0 -10px 40px rgba(24, 24, 27, 0.16);
  --rk-radius: 16px;
`

const TOKENS_DARK = `
  --rk-bg: #0B0B0D;
  --rk-surface: #16171A;
  --rk-surface-2: #1E2024;
  --rk-line: rgba(232, 234, 240, 0.09);
  --rk-line-strong: rgba(232, 234, 240, 0.16);
  --rk-ink: #E8EAF0;
  --rk-ink-2: rgba(232, 234, 240, 0.62);
  --rk-ink-3: rgba(232, 234, 240, 0.38);
  --rk-dot: rgba(232, 234, 240, 0.30);
  --rk-green: #6FB07F;
  --rk-green-soft: rgba(111, 176, 127, 0.14);
  --rk-green-line: rgba(111, 176, 127, 0.55);
  --rk-dark: #E8EAF0;
  --rk-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --rk-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.5);
  --rk-shadow-lg: 0 -10px 40px rgba(0, 0, 0, 0.62);
`

export const RISK_MOBILE_CSS = `
  .dmo, .rfm { display: none; }

  @media (max-width: 768px) {

    /* ══════════════════ Shared shell ══════════════════ */

    .dmo, .rfm {
      ${TOKENS}
      display: flex;
      flex-direction: column;
      position: fixed;
      inset: 0;
      width: 100%;
      max-width: 430px;
      margin: 0 auto;
      background: var(--rk-bg);
      color: var(--rk-ink);
      font-family: var(--font-aeonik, 'Aeonik', Inter, -apple-system, sans-serif);
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }
    .dmo { z-index: 500; }
    .rfm { z-index: 620; }

    [data-theme='dark'] .dmo, [data-theme='classic-dark'] .dmo,
    [data-theme='dark'] .rfm, [data-theme='classic-dark'] .rfm { ${TOKENS_DARK} }

    .dmo *, .rfm * { box-sizing: border-box; }

    .rk-head {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: calc(10px + env(safe-area-inset-top, 0px)) 18px 10px;
    }
    .rk-head-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 34px;
      padding: 0 6px;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--rk-ink);
      font: inherit;
      font-size: 15px;
      font-weight: 500;
      letter-spacing: -0.01em;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .rk-head-btn:active { opacity: 0.55; }
    .rk-head-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--rk-ink);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .rk-head-icon:active { opacity: 0.55; }

    /* ══════════════════ Screen 1 — Dashboard Überblick ══════════════════ */

    .dmo-graph {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 16px 8px;
    }
    .dmo-graph svg { width: 100%; height: 100%; max-height: 360px; overflow: visible; }

    .dmo-edge { fill: none; stroke: var(--rk-line-strong); stroke-width: 1; }
    .dmo-edge--on { stroke: var(--rk-green-line); stroke-width: 1.4; }

    .dmo-node { fill: var(--rk-dot); }
    .dmo-node--on { fill: var(--rk-green); }
    .dmo-node-hub { fill: var(--rk-green); }
    .dmo-node-halo { fill: var(--rk-green); opacity: 0.13; }

    .dmo-label {
      font-family: inherit;
      font-size: 8.4px;
      font-weight: 500;
      letter-spacing: -0.01em;
      fill: var(--rk-ink-2);
    }
    .dmo-label--hub { font-size: 10.5px; font-weight: 600; fill: var(--rk-ink); }
    .dmo-sub { font-family: inherit; font-size: 7.2px; font-weight: 400; fill: var(--rk-ink-3); }
    .dmo-sub--on { fill: var(--rk-green); }

    .dmo-card {
      flex-shrink: 0;
      margin: 0 16px;
      padding: 20px 18px 16px;
      border-radius: 20px;
      background: var(--rk-surface);
      border: 1px solid var(--rk-line);
      box-shadow: var(--rk-shadow-md);
    }
    .dmo-greet {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.022em;
      line-height: 1.22;
      color: var(--rk-ink);
    }
    .dmo-greet-sub {
      margin: 0 0 16px;
      font-size: 13.5px;
      font-weight: 400;
      line-height: 1.5;
      color: var(--rk-ink-2);
      max-width: 30ch;
    }
    .dmo-risk-row {
      display: flex;
      align-items: center;
      gap: 11px;
      width: 100%;
      padding: 12px 13px;
      border: 1px solid var(--rk-line);
      border-radius: 13px;
      background: var(--rk-surface-2);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: transform 0.16s ease, background 0.16s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .dmo-risk-row:active { transform: scale(0.985); }
    .dmo-risk-icon { flex-shrink: 0; display: inline-flex; color: var(--rk-green); }
    .dmo-risk-copy { flex: 1; min-width: 0; }
    .dmo-risk-title {
      display: block;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.012em;
      color: var(--rk-ink);
    }
    .dmo-risk-sub {
      display: block;
      margin-top: 2px;
      font-size: 11.5px;
      font-weight: 400;
      color: var(--rk-ink-3);
    }
    .dmo-risk-chev { flex-shrink: 0; display: inline-flex; color: var(--rk-ink-3); }

    .dmo-dock {
      flex-shrink: 0;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      padding: 10px 34px calc(14px + env(safe-area-inset-bottom, 0px));
    }
    .dmo-dock-item {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      padding: 4px 0;
      border: 0;
      background: transparent;
      color: var(--rk-ink-3);
      font: inherit;
      font-size: 9.5px;
      font-weight: 500;
      letter-spacing: -0.005em;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .dmo-dock-item:active { opacity: 0.55; }
    .dmo-fab {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border: 0;
      border-radius: 50%;
      background: var(--rk-dark);
      color: var(--rk-bg);
      box-shadow: 0 6px 18px rgba(24, 24, 27, 0.22);
      cursor: pointer;
      transition: transform 0.16s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .dmo-fab:active { transform: scale(0.93); }

    /* ══════════════════ Screen 2–5 — Risiko-Flow ══════════════════ */

    .rfm-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 6px 20px 12px;
      display: flex;
      flex-direction: column;
    }

    /* Fortschrittslinie */
    .rfm-progress {
      position: relative;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0;
      height: 40px;
      margin: 8px 4px 0;
    }
    .rfm-swoosh {
      position: absolute;
      left: -22px;
      bottom: 2px;
      width: 60px;
      height: 46px;
      pointer-events: none;
    }
    .rfm-swoosh path { fill: none; stroke: var(--rk-green-line); stroke-width: 1.4; }
    .rfm-seg { flex: 1; height: 1.2px; background: var(--rk-line-strong); }
    .rfm-seg--on { background: var(--rk-green-line); }
    .rfm-pt {
      position: relative;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--rk-dot);
      transition: all 0.32s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .rfm-pt--done {
      width: 15px;
      height: 15px;
      background: var(--rk-bg);
      border: 1.4px solid var(--rk-green);
      box-shadow: none;
      color: var(--rk-green);
    }
    .rfm-pt--now {
      width: 19px;
      height: 19px;
      background: var(--rk-green);
      box-shadow: 0 0 0 5px var(--rk-green-soft);
    }

    /* Tagro-Empfehlungs-Chip */
    .rfm-hint-wrap { display: flex; justify-content: flex-end; margin: 14px 2px 0; }
    .rfm-hint {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 9px 14px 9px 11px;
      border: 1px solid var(--rk-line);
      border-radius: 13px;
      background: var(--rk-surface);
      box-shadow: var(--rk-shadow-md);
      color: inherit;
      font: inherit;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .rfm-hint:active { transform: scale(0.97); }
    .rfm-hint-spark { display: inline-flex; color: var(--rk-green); }
    .rfm-hint-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; }
    .rfm-hint-label { font-size: 8.5px; font-weight: 400; color: var(--rk-ink-3); letter-spacing: 0.01em; }
    .rfm-hint-value { font-size: 14px; font-weight: 600; letter-spacing: -0.015em; color: var(--rk-ink); }

    /* Kopfbereich eines Schritts */
    .rfm-step {
      margin: 26px 0 0;
      font-size: 11.5px;
      font-weight: 500;
      letter-spacing: 0.005em;
      color: var(--rk-green);
    }
    .rfm-title {
      margin: 8px 0 0;
      font-size: 25px;
      font-weight: 600;
      letter-spacing: -0.028em;
      line-height: 1.16;
      color: var(--rk-ink);
    }
    .rfm-sub {
      margin: 10px 0 0;
      font-size: 13.5px;
      font-weight: 400;
      line-height: 1.5;
      color: var(--rk-ink-2);
      max-width: 32ch;
    }

    /* Risiko-Karte mit Segmenten */
    .rfm-card {
      margin-top: 20px;
      padding: 16px 15px 17px;
      border: 1px solid var(--rk-line);
      border-radius: var(--rk-radius);
      background: var(--rk-surface);
      box-shadow: var(--rk-shadow-sm);
    }
    .rfm-card-title {
      margin: 0;
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: -0.012em;
      color: var(--rk-ink);
    }
    .rfm-card-desc {
      margin: 6px 0 0;
      font-size: 11.8px;
      font-weight: 400;
      line-height: 1.5;
      color: var(--rk-ink-3);
    }
    .rfm-field { margin-top: 16px; }
    .rfm-field-label {
      margin: 0 0 8px;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--rk-ink-2);
    }
    .rfm-seg-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .rfm-chip {
      height: 36px;
      border: 1px solid var(--rk-line-strong);
      border-radius: 9px;
      background: var(--rk-surface);
      color: var(--rk-ink-2);
      font: inherit;
      font-size: 12.5px;
      font-weight: 500;
      letter-spacing: -0.008em;
      cursor: pointer;
      transition: all 0.16s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .rfm-chip:active { transform: scale(0.96); }
    .rfm-chip.on {
      border-color: var(--rk-green);
      background: var(--rk-green-soft);
      color: var(--rk-green);
      font-weight: 600;
    }

    /* Maßnahmen-Radios */
    .rfm-options { display: flex; flex-direction: column; gap: 10px; margin-top: 22px; }
    .rfm-option {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      width: 100%;
      padding: 13px 14px;
      border: 1px solid var(--rk-line-strong);
      border-radius: 13px;
      background: var(--rk-surface);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: all 0.16s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .rfm-option:active { transform: scale(0.985); }
    .rfm-option.on { border-color: var(--rk-green); background: var(--rk-green-soft); }
    .rfm-radio {
      flex-shrink: 0;
      position: relative;
      width: 17px;
      height: 17px;
      margin-top: 1px;
      border: 1.5px solid var(--rk-line-strong);
      border-radius: 50%;
      transition: border-color 0.16s ease;
    }
    .rfm-option.on .rfm-radio { border-color: var(--rk-green); }
    .rfm-option.on .rfm-radio::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 50%;
      background: var(--rk-green);
    }
    .rfm-option-copy { flex: 1; min-width: 0; }
    .rfm-option-title {
      display: block;
      font-size: 13.5px;
      font-weight: 500;
      letter-spacing: -0.012em;
      color: var(--rk-ink);
    }
    .rfm-option-sub {
      display: block;
      margin-top: 3px;
      font-size: 11.5px;
      font-weight: 400;
      line-height: 1.4;
      color: var(--rk-ink-3);
    }

    /* Fußzeile mit Aktionen */
    .rfm-foot {
      flex-shrink: 0;
      display: flex;
      gap: 10px;
      padding: 10px 20px calc(16px + env(safe-area-inset-bottom, 0px));
      background: linear-gradient(to bottom, rgba(247, 247, 244, 0), var(--rk-bg) 26%);
    }
    .rfm-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 50px;
      padding: 0 20px;
      border-radius: 13px;
      border: 1px solid transparent;
      font: inherit;
      font-size: 14.5px;
      font-weight: 500;
      letter-spacing: -0.014em;
      cursor: pointer;
      transition: transform 0.16s ease, opacity 0.16s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .rfm-btn:active { transform: scale(0.975); }
    .rfm-btn--ghost {
      flex: 0 0 auto;
      border-color: var(--rk-line-strong);
      background: var(--rk-surface);
      color: var(--rk-ink-2);
    }
    .rfm-btn--dark {
      flex: 1 1 auto;
      background: var(--rk-dark);
      color: var(--rk-bg);
      font-weight: 500;
      box-shadow: 0 4px 14px rgba(24, 24, 27, 0.16);
    }
    .rfm-btn--dark:disabled { opacity: 0.4; cursor: default; }
    [data-theme='dark'] .rfm-btn--dark,
    [data-theme='classic-dark'] .rfm-btn--dark { color: #0B0B0D; }

    /* Screen 4B — gespeichert */
    .rfm-center {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding-bottom: 60px;
      text-align: center;
    }
    .rfm-orb-wrap { position: relative; display: grid; place-items: center; width: 160px; height: 160px; }
    .rfm-orb {
      display: grid;
      place-items: center;
      width: 86px;
      height: 86px;
      border-radius: 50%;
      background: var(--rk-surface);
      border: 1px solid var(--rk-line);
      box-shadow: var(--rk-shadow-md);
      color: var(--rk-ink);
      animation: rfmOrbIn 0.5s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .rfm-orb--spark { color: var(--rk-green); }
    @keyframes rfmOrbIn {
      from { transform: scale(0.72); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }
    .rfm-sparkle {
      position: absolute;
      color: var(--rk-green);
      opacity: 0;
      animation: rfmTwinkle 2.6s ease-in-out infinite;
    }
    @keyframes rfmTwinkle {
      0%, 100% { opacity: 0; transform: scale(0.6); }
      45%      { opacity: 0.85; transform: scale(1); }
    }
    .rfm-center-title {
      margin: 6px 0 0;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.026em;
      color: var(--rk-ink);
    }
    .rfm-center-sub {
      margin: 10px 0 0;
      max-width: 27ch;
      font-size: 13.5px;
      font-weight: 400;
      line-height: 1.5;
      color: var(--rk-ink-2);
    }

    /* Screen 5 — Outro-Karte */
    .rfm-outro {
      margin: auto 0;
      padding: 34px 24px 32px;
      border-radius: 22px;
      background: var(--rk-surface-2);
      border: 1px solid var(--rk-line);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      animation: rfmOrbIn 0.45s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .rfm-outro .rfm-orb { width: 64px; height: 64px; margin-bottom: 18px; }

    /* ══════════════════ Screen 3 — Tagro Bottom Sheet ══════════════════ */

    .rfs { position: fixed; inset: 0; z-index: 700; display: flex; flex-direction: column; justify-content: flex-end; }
    .rfs-scrim {
      position: absolute;
      inset: 0;
      border: 0;
      padding: 0;
      background: rgba(18, 20, 23, 0.34);
      backdrop-filter: blur(2px) saturate(0.6);
      -webkit-backdrop-filter: blur(2px) saturate(0.6);
      animation: rfsFade 0.24s ease both;
      cursor: pointer;
    }
    @keyframes rfsFade { from { opacity: 0 } to { opacity: 1 } }
    .rfs-sheet {
      ${TOKENS}
      position: relative;
      width: 100%;
      max-width: 430px;
      margin: 0 auto;
      padding: 10px 22px calc(22px + env(safe-area-inset-bottom, 0px));
      border-radius: 24px 24px 0 0;
      background: #FAFAF7;
      box-shadow: var(--rk-shadow-lg);
      font-family: var(--font-aeonik, 'Aeonik', Inter, -apple-system, sans-serif);
      color: var(--rk-ink);
      animation: rfsUp 0.34s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    [data-theme='dark'] .rfs-sheet,
    [data-theme='classic-dark'] .rfs-sheet { ${TOKENS_DARK} background: #16171A; }
    @keyframes rfsUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
    .rfs-sheet * { box-sizing: border-box; }

    .rfs-grip {
      width: 38px;
      height: 4px;
      margin: 0 auto 18px;
      border-radius: 999px;
      background: var(--rk-line-strong);
    }
    .rfs-head { display: flex; align-items: center; gap: 12px; }
    .rfs-badge {
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: var(--rk-green-soft);
      color: var(--rk-green);
    }
    .rfs-name { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: -0.02em; color: var(--rk-ink); }
    .rfs-why { margin: 2px 0 0; font-size: 12.5px; font-weight: 400; color: var(--rk-ink-3); }

    .rfs-list { list-style: none; margin: 20px 0 0; padding: 0; display: flex; flex-direction: column; gap: 13px; }
    .rfs-item { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 400; color: var(--rk-ink); }
    .rfs-check { flex-shrink: 0; display: inline-flex; color: var(--rk-green); }

    .rfs-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 50px;
      margin-top: 24px;
      border: 0;
      border-radius: 13px;
      background: var(--rk-dark);
      color: #FAFAF7;
      font: inherit;
      font-size: 14.5px;
      font-weight: 500;
      letter-spacing: -0.014em;
      cursor: pointer;
      transition: transform 0.16s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .rfs-cta:active { transform: scale(0.975); }
    [data-theme='dark'] .rfs-cta,
    [data-theme='classic-dark'] .rfs-cta { color: #0B0B0D; }

    /* Hintergrund abdunkeln, während das Sheet offen ist */
    .rfm--muted .rfm-body, .rfm--muted .rk-head, .rfm--muted .rfm-foot {
      filter: grayscale(0.55) opacity(0.62);
      transition: filter 0.24s ease;
    }

    /* Die "Compact surfaces"-Regel in globals.css flacht Controls in Menü-artigen
       Containern auf 6px ab — hier gilt die eigene Geometrie. */
    .dmo .dmo-fab, .rfm .rfm-pt, .rfm .rfm-radio, .rfm .rfm-orb { border-radius: 50% !important; }
    .dmo .dmo-risk-row, .rfm .rfm-hint, .rfm .rfm-option,
    .rfm .rfm-btn, .rfs .rfs-cta { border-radius: 13px !important; }
    .rfm .rfm-chip { border-radius: 9px !important; }
    .rfs .rfs-grip { border-radius: 999px !important; }

    @media (prefers-reduced-motion: reduce) {
      .dmo *, .rfm *, .rfs * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  }
`
