/** Statusabfrage — portal shell + Spotify-style read/play body. */
export const STATUSABFRAGE_CSS = `
  .st-dashboard.dec-os {
    --dec-soft: var(--portal-muted, #90959f);
    --dec-dark: var(--portal-text, #0f0f10);
    --dec-muted: var(--portal-muted, #90959f);
    --dec-pill-surface: var(--portal-pill-bg, rgba(255,255,255,.06));
    --dec-cta-bg: var(--portal-btn-primary, #5b647d);
    --dec-cta-hover: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 88%, #000);
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

  .st-static-top {
    flex-shrink: 0;
    padding: clamp(20px, 3vh, 32px) var(--festag-content-pad-x, 56px) 0;
    max-width: var(--festag-content-max, 1080px);
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .st-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .st-head-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .st-title {
    margin: 0;
    font-size: 29px;
    font-weight: 400;
    letter-spacing: -0.03em;
    line-height: 1.12;
    color: var(--dec-dark);
  }
  .st-lead {
    margin: 0;
    font-size: 17px;
    font-weight: 400;
    line-height: 1.35;
    color: var(--dec-soft);
  }
  .st-head-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 4px;
  }

  .st-scope, .st-filter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: var(--dec-pill-surface);
    color: var(--dec-soft);
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background .14s, border-color .14s, color .14s;
  }
  .st-filter { width: 34px; padding: 0; color: var(--dec-dark); }
  .st-scope:hover, .st-filter:hover {
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
    color: var(--dec-dark);
  }

  .st-pop-wrap { position: relative; }
  .st-backdrop { position: fixed; inset: 0; z-index: 40; background: transparent; border: 0; cursor: default; }
  .st-menu {
    position: absolute; top: calc(100% + 6px); right: 0; z-index: 41;
    min-width: 210px; padding: 5px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 16px 40px -20px rgba(0,0,0,.35);
    display: flex; flex-direction: column; gap: 1px;
  }
  .st-menu-left { left: 0; right: auto; }
  .st-menu-item {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border: 0; border-radius: 8px;
    background: transparent; color: var(--text);
    font: inherit; font-size: 13px; text-align: left; cursor: pointer;
  }
  .st-menu-item:hover, .st-menu-item.on {
    background: color-mix(in srgb, var(--surface-2) 75%, transparent);
  }
  .st-menu-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .st-dot { width: 7px; height: 7px; border-radius: 999px; flex-shrink: 0; }

  .st-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    padding: 20px var(--festag-content-pad-x, 56px) 12px;
    max-width: var(--festag-content-max, 1080px);
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .st-scroll::-webkit-scrollbar { display: none; }

  .st-flow {
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 0.15em;
  }

  /* Lesemodus — normaler Fließtext, nicht Teleprompter-Wand */
  .st-flow.is-reading .st-line {
    display: block;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.58;
    letter-spacing: -0.01em;
    color: var(--dec-dark);
  }

  /* Wiedergabe — Spotify-Karaoke */
  .st-scroll.is-playing {
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14%, #000 68%, transparent 96%);
    mask-image: linear-gradient(to bottom, transparent 0, #000 14%, #000 68%, transparent 96%);
  }
  .st-scroll.is-playing .st-flow {
    padding: min(22vh, 140px) 0 min(18vh, 120px);
  }
  .st-flow.is-playing .st-line {
    display: block;
    font-size: 16px;
    line-height: 1.5;
    color: color-mix(in srgb, var(--dec-dark) 22%, transparent);
    transition: color .28s ease, font-size .24s ease;
  }
  .st-flow.is-playing .st-line.near {
    font-size: 17px;
    color: color-mix(in srgb, var(--dec-dark) 48%, transparent);
  }
  .st-flow.is-playing .st-line.on {
    font-size: 20px;
    font-weight: 500;
    line-height: 1.38;
    letter-spacing: -0.02em;
    color: var(--dec-dark);
  }

  .st-empty {
    margin: 0;
    max-width: 480px;
    font-size: 15px;
    line-height: 1.55;
    color: var(--dec-soft);
  }

  .st-player {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px var(--festag-content-pad-x, 56px) calc(12px + env(safe-area-inset-bottom, 0px));
    max-width: var(--festag-content-max, 1080px);
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
    background: color-mix(in srgb, var(--portal-card, var(--surface)) 94%, transparent);
  }

  .st-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 14px 0 32px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: transparent;
    color: var(--dec-soft);
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background .14s, color .14s, border-color .14s;
  }
  .st-btn-ico {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    color: var(--dec-dark);
  }
  .st-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--surface-2) 50%, transparent);
    color: var(--dec-dark);
  }
  .st-btn:disabled { opacity: .5; cursor: not-allowed; }
  .st-btn--primary {
    background: var(--dec-cta-bg);
    border-color: transparent;
    color: #fff;
  }
  .st-btn--primary .st-btn-ico { color: #fff; }
  .st-btn--primary:hover:not(:disabled) { background: var(--dec-cta-hover); color: #fff; }

  .st-wave-wrap {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    padding: 0 8px;
  }
  .st-wave {
    width: 100%;
    max-width: 280px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    opacity: .55;
    -webkit-mask-image: linear-gradient(to right, transparent 0, #000 20%, #000 80%, transparent 100%);
    mask-image: linear-gradient(to right, transparent 0, #000 20%, #000 80%, transparent 100%);
  }
  .st-wave span {
    width: 2px;
    height: 100%;
    border-radius: 999px;
    background: var(--dec-soft);
  }
  .st-dur {
    font-size: 11px;
    color: var(--dec-soft);
    font-variant-numeric: tabular-nums;
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
    background: #f0f0f0;
    color: #111;
  }
  .st-play:hover:not(:disabled) { opacity: .9; }
  .st-play:active:not(:disabled) { transform: scale(.96); }
  .st-play:disabled { opacity: .35; cursor: not-allowed; }

  @media (max-width: 900px) {
    .st-wave-wrap { display: none; }
    .st-btn { padding-right: 12px; }
  }
  @media (max-width: 768px) {
    .st-dashboard .st-shell { display: none; }
  }
`
