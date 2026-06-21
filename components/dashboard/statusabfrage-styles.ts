/** Statusabfrage — portal header + Spotify-style read stage + AI waveform footer. */
export const STATUSABFRAGE_CSS = `
  .st-dashboard.dec-os {
    --dec-soft: var(--portal-muted, #90959f);
    --dec-dark: var(--portal-text, #0f0f10);
    --dec-muted: var(--portal-muted, #90959f);
    width: 100%;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: transparent;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  [data-theme="dark"] .st-dashboard.dec-os,
  [data-theme="classic-dark"] .st-dashboard.dec-os {
    --dec-soft: var(--portal-muted, #9aa0ac);
    --dec-dark: var(--portal-text, #f4f4f4);
  }

  .st-shell {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Padding + gradient come from .dec-static-top — do not override top inset */
  .st-static-top { flex-shrink: 0; }
  .st-head-actions { gap: 6px !important; }
  .st-kicker {
    margin: 0;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: var(--dec-soft);
    line-height: 1.35;
  }

  .st-scope-wrap,
  .st-period-wrap { position: relative; }

  .st-scope-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 32px;
    padding: 0 12px;
    border: none;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.05);
    color: var(--dec-soft);
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
    transition: background .12s, color .12s;
  }
  .st-scope-pill:hover,
  .st-scope-pill.on {
    background: rgba(15, 23, 42, 0.08);
    color: var(--dec-dark);
  }
  [data-theme="dark"] .st-scope-pill,
  [data-theme="classic-dark"] .st-scope-pill {
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    color: var(--dec-soft);
  }
  [data-theme="dark"] .st-scope-pill:hover,
  [data-theme="classic-dark"] .st-scope-pill:hover,
  [data-theme="dark"] .st-scope-pill.on,
  [data-theme="classic-dark"] .st-scope-pill.on {
    background: rgba(255, 255, 255, 0.1);
    color: var(--dec-dark);
  }

  .st-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: transparent;
    border: 0;
    cursor: default;
  }
  .st-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 41;
    min-width: 210px;
    padding: 5px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 16px 40px -20px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .st-menu-left { left: 0; right: auto; }
  .st-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }
  .st-menu-item:hover,
  .st-menu-item.on {
    background: color-mix(in srgb, var(--surface-2) 75%, transparent);
  }
  .st-menu-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .st-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .st-stage {
    flex: 1 1 auto;
    min-height: 0;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .st-stage.has-text:not(.is-playing) {
    justify-content: center;
  }
  .st-stage::before,
  .st-stage::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    z-index: 2;
    pointer-events: none;
  }
  .st-stage.is-playing::before {
    top: 0;
    height: 28%;
    background: linear-gradient(to bottom, var(--portal-card, #0c0c0e) 0%, transparent 100%);
  }
  .st-stage.is-playing::after {
    bottom: 0;
    height: 28%;
    background: linear-gradient(to top, var(--portal-card, #0c0c0e) 0%, transparent 100%);
  }

  .st-scroll {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    max-width: var(--festag-content-max, 1080px);
    margin: 0 auto;
    padding: 0 var(--festag-content-pad-x, 56px);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .st-scroll.is-idle {
    overflow: hidden;
    flex: 0 1 auto;
    min-height: min(42vh, 320px);
  }
  .st-scroll.is-playing {
    flex: 1 1 auto;
    overflow: hidden;
    justify-content: flex-start;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%);
    mask-image: linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%);
  }

  .st-hero {
    margin: 0;
    max-width: min(560px, 92%);
    text-align: center;
    font-size: clamp(24px, 3vw, 34px);
    font-weight: 400;
    line-height: 1.28;
    letter-spacing: -0.035em;
    color: var(--dec-dark);
  }

  .st-flow {
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65em;
  }

  /* Play mode — centered read-along with smooth translateY */
  .st-flow.is-playing {
    padding: 50vh 0;
    will-change: transform;
    transition: transform 0.58s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .st-flow.is-playing .st-line {
    margin: 0;
    font-size: clamp(16px, 1.8vw, 19px);
    font-weight: 400;
    line-height: 1.38;
    letter-spacing: -0.02em;
    color: color-mix(in srgb, var(--dec-dark) 18%, transparent);
    transition: color .32s ease, font-size .28s ease, opacity .32s ease, transform .28s ease;
    transform: scale(0.97);
    opacity: 0.34;
  }
  .st-flow.is-playing .st-line.far {
    font-size: clamp(15px, 1.6vw, 17px);
    opacity: 0.2;
  }
  .st-flow.is-playing .st-line.near {
    font-size: clamp(20px, 2.4vw, 24px);
    color: color-mix(in srgb, var(--dec-dark) 50%, transparent);
    opacity: 0.68;
    transform: scale(0.98);
  }
  .st-flow.is-playing .st-line.on {
    font-size: clamp(26px, 3.2vw, 34px);
    font-weight: 400;
    line-height: 1.22;
    letter-spacing: -0.035em;
    color: var(--dec-dark);
    opacity: 1;
    transform: scale(1);
  }

  .st-empty {
    margin: 0;
    padding: 32px 0 40px;
    max-width: 480px;
    text-align: center;
    font-size: 17px;
    line-height: 1.58;
    letter-spacing: -0.01em;
    color: var(--dec-soft);
  }

  .st-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px var(--festag-content-pad-x, 56px) calc(14px + env(safe-area-inset-bottom, 0px));
    max-width: var(--festag-content-max, 1080px);
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    border-top: 1px solid color-mix(in srgb, var(--border) 45%, transparent);
  }

  .st-footer-wave {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding-right: 12px;
  }

  .st-wave {
    width: 100%;
    max-width: min(360px, 46vw);
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
    -webkit-mask-image: linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%);
    mask-image: linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%);
  }
  .st-wave span {
    flex: 1 1 0;
    max-width: 3px;
    height: 100%;
    border-radius: 999px;
    background: var(--dec-soft);
    transform-origin: center center;
    transform: scaleY(var(--st-bar, 0.14));
    transition: transform .08s linear, background .2s ease;
    opacity: 0.55;
  }
  .st-wave span.is-live {
    background: color-mix(in srgb, var(--dec-dark) 70%, var(--dec-soft));
    opacity: 0.85;
  }

  .st-dur {
    font-size: 11px;
    color: var(--dec-soft);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  .st-footer-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .st-play {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 999px;
    background: var(--dec-dark);
    color: var(--portal-card, #fff);
    cursor: pointer;
    transition: opacity .14s, transform .14s;
  }
  [data-theme="dark"] .st-play,
  [data-theme="classic-dark"] .st-play {
    background: #f2f2f4;
    color: #111;
  }
  .st-play:hover:not(:disabled) { opacity: 0.92; }
  .st-play:active:not(:disabled) { transform: scale(0.96); }
  .st-play:disabled { opacity: 0.35; cursor: not-allowed; }

  .st-tagro-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
    background: color-mix(in srgb, var(--portal-card, var(--surface)) 92%, transparent);
    color: var(--dec-dark);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background .14s, border-color .14s;
  }
  .st-tagro-btn:hover {
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
  }
  [data-theme="dark"] .st-tagro-btn,
  [data-theme="classic-dark"] .st-tagro-btn {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: var(--dec-dark);
  }

  @media (max-width: 768px) {
    .st-dashboard .st-shell { display: none; }
  }
  @media (max-width: 900px) {
    .st-footer-wave { display: none; }
    .st-footer { justify-content: flex-end; }
  }
`
