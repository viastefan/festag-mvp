/** Master onboarding chrome — 1:1 with festag-master-auth-onboarding canvas. */

export const MASTER_ONBOARDING_STYLES = /* css */ `
  .mob {
    --mob-ink: #1A1917;
    --mob-muted: #8891a0;
    /* Same as Login email --festag-input-placeholder (AUTH_MUTED_LIGHT). */
    --mob-placeholder: #8891a0;
    --mob-hairline: rgba(30, 30, 32, 0.10);
    --mob-hairline-filled: rgba(30, 30, 32, 0.16);
    /* Soft primary stroke — same as AUTH_STROKE / caret (not fill #5B647D). */
    --mob-primary: #7E889F;
    --mob-caret: #7E889F;
    --mob-card-bg: rgba(255, 255, 255, 0.72);
    --mob-card-bg-on: #FFFFFF;
    --mob-card-border: rgba(30, 30, 32, 0.04);
    --mob-card-border-hover: rgba(30, 30, 32, 0.12);
    --mob-icon-tile: rgba(30, 30, 32, 0.04);
    --mob-canvas: #FBF7EE;
    --mob-wash-top: #FCFAF3;
    --mob-wash-bottom: #F3EFE4;
    --mob-lyrics-dim: rgba(26, 25, 23, 0.28);
    --mob-lyrics-lit: #1A1917;
    --mob-gutter: 28px;
    /* Same content column as Login/Register --al-panel-width. */
    --mob-content-max: 380px;
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
  /* Register → onboarding soft enter — opacity only, canvas stays ivory. */
  @keyframes mobPanelEnter {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .mob.is-panel-enter:not(.is-booting):not(.is-exiting) {
    animation: mobPanelEnter 0.32s cubic-bezier(.16, 1, .3, 1) both;
  }
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
    /* Match Login/Register mobile header chrome */
    padding: max(10px, calc(env(safe-area-inset-top, 0px) + 8px)) 16px 10px;
    max-width: none;
    width: 100%;
    margin: 0;
    box-sizing: border-box;
  }
  /* Same fluid mark geometry as Login .al-wordmark / .al-wordmark-img--fluid */
  .mob-wordmark.al-wordmark,
  .mob-header .al-wordmark {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0;
    color: #1e1e20;
    pointer-events: none;
    -webkit-tap-highlight-color: transparent;
    text-decoration: none;
    border: 0;
    background: transparent;
  }
  /* Onboarding: mark is a quiet home → /login */
  .mob-wordmark.mob-wordmark--link {
    pointer-events: auto;
    cursor: pointer;
  }
  .mob-wordmark.mob-wordmark--link:hover .mob-mark {
    opacity: 1;
  }
  .mob-wordmark.mob-wordmark--link:active .mob-mark {
    opacity: 0.78;
  }
  .mob-wordmark .al-wordmark-img--fluid,
  .mob-mark {
    display: block !important;
    width: 36px !important;
    height: 36px !important;
    object-fit: contain;
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
    /* Top-anchored — vertical center reflows on every field/hint height change and feels like shake. */
    padding: clamp(36px, 14vh, 120px) var(--mob-gutter) 100px;
    box-sizing: border-box;
    overflow: hidden;
    touch-action: pan-y;
    justify-content: flex-start;
    align-items: center;
  }
  /* Tagro panel sits under the field — don't clip it. */
  .mob-body:has(.mob-intent-wrap.has-tagro-panel) {
    overflow: visible;
  }
  .mob-body--preparing {
    padding-top: 8px;
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
    /* Connect scrolls its own list — stage itself never rubber-bands. */
    overflow-x: hidden;
    overflow-y: hidden;
    scrollbar-width: none;
    justify-content: flex-start;
    align-items: stretch;
  }
  .mob-stage:has(.mob-intent-wrap.has-tagro-panel) {
    overflow: visible;
    padding-bottom: 120px;
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
    /* Mobile: +3px vs prior 26 — matches perceived canvas weight */
    font-size: 29px;
    line-height: 1.08;
    letter-spacing: var(--auth-tracking-display);
    font-weight: 400;
    font-family: Aeonik, system-ui, sans-serif;
  }
  .mob-h1-ink {
    color: var(--mob-ink);
    display: block;
    line-height: 1.08;
  }
  .mob-h1-muted {
    color: var(--mob-muted);
    display: block;
    line-height: 1.08;
    margin-top: 0;
  }
  .mob-h1-inline { line-height: 1.12; }
  .mob-h1-inline .mob-h1-ink,
  .mob-h1-inline .mob-h1-muted { display: inline; }

  /* AuthGlassyHero inside onboarding — same type + ink as .mob-h1 */
  .mob .al-glassy-hero.mob-glassy-h1 {
    margin: 0;
    max-width: 100%;
    font-size: 29px !important;
    line-height: 1.22 !important;
    letter-spacing: var(--auth-tracking-display) !important;
    font-weight: 400 !important;
    font-family: Aeonik, system-ui, sans-serif;
    color: var(--mob-ink);
  }
  .mob .al-glassy-hero.mob-glassy-h1--inline {
    line-height: 1.22 !important;
  }
  .mob .al-glassy-hero.mob-glassy-h1 .al-gword-lead {
    color: var(--mob-ink);
  }
  .mob .al-glassy-hero.mob-glassy-h1 .al-gword-inner.al-hero-gray {
    color: var(--mob-muted);
  }
  .mob .al-glassy-hero--stacked .al-glassy-hero-line {
    display: block;
    line-height: 1.22;
    /* Stable line box so settle (clip padding off) doesn’t snap layout. */
    min-height: 1.22em;
  }
  /* Full glassy word rise + blur — same language as login AuthGlassyHero. */
  .mob .al-glassy-hero.mob-glassy-h1 .al-gword-inner {
    animation: alGwordIn 0.58s cubic-bezier(0.16, 1, 0.3, 1) both !important;
    animation-delay: calc(var(--i, 0) * 32ms) !important;
    will-change: transform, filter, opacity;
  }
  .mob .al-glassy-hero.mob-glassy-h1.al-glassy-hero--instant .al-gword-inner {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }

  .mob-error {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.4;
    color: #b42318;
  }

  .mob-ready-hint-slot,
  .mob-continue-slot {
    min-height: 46px;
    margin-top: 16px;
    width: 100%;
  }
  /* Intent: Weiter sits further below Tagro / field. */
  .mob-ready-hint-slot--intent {
    margin-top: 48px;
    min-height: 46px;
  }
  .mob-continue-btn {
    width: 100%;
    height: 46px;
    margin: 0;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border-radius: 8px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: #ffffff;
    color: #1e1e20;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    font-family: inherit;
    font-size: 14.5px;
    font-weight: 400;
    letter-spacing: var(--auth-tracking);
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    animation: mobFadeIn 0.22s ease both;
    transition: background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .mob-continue-btn:hover {
    background: #fafafa;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .mob-continue-btn:active {
    background: #f5f5f6;
    box-shadow: none;
  }
  .mob-continue-btn:focus,
  .mob-continue-btn:focus-visible {
    outline: none;
  }
  .mob-continue-btn-label {
    flex: 1;
    text-align: left;
  }
  .mob-continue-btn .mob-enter-ico {
    color: #1e1e20;
    opacity: 0.72;
  }
  @keyframes mobShellIn {
    from {
      opacity: 0;
      filter: blur(12px);
      transform: translate3d(0, 8px, 0);
    }
    to {
      opacity: 1;
      filter: blur(0);
      transform: translate3d(0, 0, 0);
    }
  }
  @keyframes mobFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes mobCardIn {
    from {
      opacity: 0;
      filter: blur(8px);
      transform: translate3d(0, 10px, 0) scale(0.985);
    }
    to {
      opacity: 1;
      filter: blur(0);
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  /* Intent field — stroked input (login geometry), taller for multi-line Ziel */
  .mob-intent-wrap {
    position: relative;
    width: 100%;
    margin-top: 18px;
    z-index: 2;
    box-sizing: border-box;
  }
  /* Room for Tagro orb to the right of the field. */
  .mob-intent-wrap.has-tagro-chip {
    padding-right: 36px;
  }
  .mob-intent-wrap.has-tagro-panel {
    z-index: 20;
    padding-bottom: 8px;
  }
  .mob-intent-shell {
    position: relative;
    border-radius: var(--mob-field-radius, 8px);
    /* Same idle/focus strokes as Login email field. */
    border: 2px solid rgba(30, 30, 32, 0.15) !important;
    box-shadow: none !important;
    background: transparent;
    padding: 14px 16px;
    min-height: 96px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    animation: mobShellIn .34s cubic-bezier(.22,1,.36,1) both;
    transition: border-color .18s ease;
  }
  .mob-intent-shell:hover {
    border-color: rgba(30, 30, 32, 0.20) !important;
  }
  .mob-intent-shell.has-value,
  .mob-intent-shell.is-focused {
    border-color: var(--mob-primary, #7E889F) !important;
    box-shadow: none !important;
  }
  /* Non-bare Tagro orb reserves BR room; bareChip is portaled and needs none. */
  .mob-intent-shell.is-tagro-chip:not(.mob-intent-shell--field),
  .mob-intent-shell.is-tagro-chip-idle:not(.mob-intent-shell--field) {
    padding-bottom: 44px;
  }
  .mob-intent-area {
    width: 100%;
    min-height: 64px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--mob-ink);
    font-size: 17px;
    line-height: 25px;
    font-family: inherit;
    font-weight: 400;
    letter-spacing: var(--auth-tracking);
    resize: none !important;
    outline: none;
    box-sizing: border-box;
    overflow: hidden;
    caret-color: var(--mob-caret);
    transition: height .34s cubic-bezier(.22,1,.36,1);
  }
  .mob-intent-area.is-empty { caret-color: transparent; }

  /* Tagro assist: idle BR orb + panel only on orb click (TagroFieldAssist chip trigger). */

  .mob-intent-example {
    position: absolute;
    left: 16px;
    top: 14px;
    right: 16px;
    font-size: 17px;
    line-height: 25px;
    letter-spacing: var(--auth-tracking);
    color: var(--mob-placeholder);
    pointer-events: none;
    white-space: normal;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
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
    left: 16px;
    top: 16px;
    width: 2px;
    height: 20px;
    border-radius: 1px;
    background: var(--mob-caret);
    pointer-events: none;
    animation: mobCaretBlink 1.05s steps(1, end) infinite;
  }
  /* Name / Position — single-line field */
  .mob-intent-shell--single {
    min-height: 46px;
    padding: 0 16px;
    justify-content: center;
  }
  .mob-intent-input {
    width: 100%;
    height: 46px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--mob-ink);
    font-size: 17px;
    line-height: 25px;
    font-family: inherit;
    font-weight: 400;
    letter-spacing: var(--auth-tracking);
    outline: none;
    box-sizing: border-box;
    caret-color: var(--mob-caret);
  }
  .mob-intent-input.is-empty { caret-color: transparent; }
  .mob-intent-example--single {
    top: 50%;
    transform: translate3d(0, -50%, 0);
    -webkit-line-clamp: 1;
    white-space: nowrap;
    right: 16px;
  }
  .mob-intent-example--single.is-out {
    transform: translate3d(0, calc(-50% + 6px), 0);
  }
  .mob-intent-caret--single {
    top: 50%;
    margin-top: -10px;
  }
  .mob-skip-link {
    display: block;
    width: 100%;
    margin-top: 14px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--mob-muted, rgba(26, 25, 23, 0.48));
    font-size: 14px;
    letter-spacing: var(--auth-tracking);
    font-family: inherit;
    font-weight: 400;
    cursor: pointer;
    text-align: center;
  }
  .mob-skip-link:hover {
    color: var(--mob-ink);
  }
  .mob-continue-slot--done {
    margin-top: 28px;
  }
  .mob-done-wait {
    margin: 12px 0 0;
    text-align: center;
    color: var(--mob-muted, rgba(26, 25, 23, 0.48));
    font-size: 14px;
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
    /* Gutter so 2px selected stroke never clips on overflow parents. */
    padding-inline: 3px;
    box-sizing: border-box;
  }
  .mob-chip {
    text-align: left;
    width: 100%;
    height: 46px;
    min-height: 46px;
    max-height: 46px;
    padding: 0 14px;
    border-radius: 8px;
    /* Always 2px — selected only changes color (no L/R clip). */
    border: 2px solid var(--mob-card-border) !important;
    background: #FFFFFF;
    box-shadow: none;
    color: var(--mob-ink);
    opacity: 0.88;
    font-size: 15px;
    letter-spacing: var(--auth-tracking);
    line-height: 1.25;
    font-family: inherit;
    font-weight: 400;
    cursor: pointer;
    box-sizing: border-box;
    transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, opacity .18s ease;
    animation: mobCardIn 0.48s cubic-bezier(.22, 1, .36, 1) both;
    animation-delay: calc(0.12s + var(--i, 0) * 42ms);
  }
  .mob-chip:hover:not(.is-on) {
    border-color: var(--mob-card-border-hover) !important;
  }
  .mob-chip.is-on {
    border-color: var(--mob-primary) !important;
    background: var(--mob-card-bg-on);
    box-shadow: none !important;
    opacity: 1;
  }
  .mob-chip:focus,
  .mob-chip:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
  .mob-chip.is-on:focus,
  .mob-chip.is-on:focus-visible {
    border-color: var(--mob-primary) !important;
  }
  .mob-chip-hint {
    /* legacy class — continue CTA uses .mob-continue-btn */
    margin: 16px 0 0;
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
    /* Let the soft bottom fade bleed past the list edge (no hard clip). */
    overflow: visible;
  }
  .mob-connect-list {
    max-height: 288px;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 6px;
    /* Gutter so 2px selected strokes never clip L/R. */
    padding: 10px 3px 56px;
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
    background: linear-gradient(
      to bottom,
      var(--mob-canvas) 0%,
      color-mix(in srgb, var(--mob-canvas) 55%, transparent) 55%,
      transparent 100%
    );
  }
  /* Soft canvas fade — same hue as page mid, no hard wash-bottom edge. */
  .mob-connect-fade-bottom {
    bottom: -10px;
    height: 108px;
    background: linear-gradient(
      to top,
      var(--mob-canvas) 0%,
      color-mix(in srgb, var(--mob-canvas) 88%, transparent) 22%,
      color-mix(in srgb, var(--mob-canvas) 48%, transparent) 52%,
      color-mix(in srgb, var(--mob-canvas) 16%, transparent) 78%,
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
    /* Always 2px — selected only changes color (no L/R clip). */
    border: 2px solid var(--mob-card-border) !important;
    background: #FFFFFF;
    box-shadow: none;
    flex-shrink: 0;
    box-sizing: border-box;
    cursor: pointer;
    font-family: inherit;
    width: 100%;
    text-align: left;
    margin: 0;
    transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
    animation: mobCardIn 0.48s cubic-bezier(.22, 1, .36, 1) both;
    animation-delay: calc(0.12s + var(--i, 0) * 42ms);
  }
  .mob-connect-row:hover:not(.is-on) {
    border-color: var(--mob-card-border-hover) !important;
  }
  .mob-connect-row.is-on {
    border-color: var(--mob-primary) !important;
    background: #FFFFFF;
    box-shadow: none !important;
  }
  .mob-connect-row:focus,
  .mob-connect-row:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }
  .mob-connect-row.is-on:focus,
  .mob-connect-row.is-on:focus-visible {
    border-color: var(--mob-primary) !important;
  }
  .mob-connect-icon {
    width: 28px;
    height: 28px;
    border-radius: var(--mob-radius);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--mob-icon-tile);
    color: var(--mob-ink);
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
  /*
   * 3-col grid keeps beads optically centered; back is a real flex hit target
   * (not absolutely parked outside the wrap — that broke clicks).
   */
  .mob-dots-wrap {
    position: relative;
    display: grid;
    grid-template-columns: 44px auto 44px;
    align-items: center;
    justify-items: center;
    column-gap: 10px;
    pointer-events: none;
  }
  .mob-nav-back {
    justify-self: end;
    position: static;
    transform: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent !important;
    box-shadow: none !important;
    color: rgba(26, 25, 23, 0.36);
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.14s ease;
  }
  .mob-nav-back:hover {
    color: rgba(26, 25, 23, 0.72);
    background: transparent !important;
  }
  .mob-nav-back:active {
    color: rgba(26, 25, 23, 0.92);
    background: transparent !important;
  }
  .mob-nav-back svg {
    display: block;
  }
  .mob-nav-spacer {
    width: 44px;
    height: 44px;
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
  /* Beads stay 8px — override global mobile button min-height 44px. */
  .mob-dot {
    display: block;
    width: 8px;
    height: 8px;
    min-width: 8px;
    min-height: 8px !important;
    max-height: 8px;
    border-radius: 999px;
    border: none !important;
    padding: 0;
    margin: 0;
    background: var(--mob-dot-idle);
    cursor: pointer;
    flex-shrink: 0;
    align-self: center;
    box-shadow: none !important;
    outline: none;
    transition: width .38s cubic-bezier(.22,1,.36,1), background .28s ease;
  }
  .mob-dot.is-done { background: var(--mob-dot-done); }
  .mob-dot.is-active {
    width: 26px;
    min-width: 26px;
    height: 8px;
    min-height: 8px !important;
    max-height: 8px;
    background: var(--mob-dot-active);
  }
  .mob-dot:disabled { cursor: default; }

  /* Desktop (≥769): same wider column as mobile onboarding */
  @media (min-width: 769px) {
    .mob {
      --mob-gutter: 48px;
      --mob-content-max: 380px;
    }
    .mob-header {
      width: 100%;
      max-width: none;
      margin: 0;
      /* Match Login/Register desktop centered header */
      padding: 24px 32px 12px;
      box-sizing: border-box;
      justify-content: space-between;
    }
    .mob-wordmark.al-wordmark,
    .mob-header .al-wordmark {
      width: 42px;
      height: 42px;
    }
    .mob-wordmark .al-wordmark-img--fluid,
    .mob-mark {
      width: 38px !important;
      height: 38px !important;
      filter: brightness(0) saturate(100%);
      opacity: 0.9;
    }
    .mob-nav {
      padding: 20px 24px 28px;
      background: transparent;
    }
    .mob-nav-inner { gap: 0; }
    .mob-dots-wrap {
      grid-template-columns: 44px auto 44px;
      column-gap: 12px;
    }
    .mob-nav-back {
      width: 44px;
      height: 44px;
      color: rgba(26, 25, 23, 0.34);
    }
    .mob-nav-back:hover {
      color: rgba(26, 25, 23, 0.68);
      background: transparent !important;
    }
    .mob-dots {
      min-height: 8px;
      padding: 0;
      background: transparent !important;
      box-shadow: none !important;
    }
    .mob-dot {
      width: 9px;
      height: 9px;
      min-height: 9px !important;
      max-height: 9px;
    }
    .mob-dot.is-active {
      width: 28px;
      min-width: 28px;
      height: 9px;
      min-height: 9px !important;
      max-height: 9px;
    }
    .mob-body {
      max-width: none;
      width: 100%;
      padding: clamp(48px, 16vh, 140px) var(--mob-gutter) 120px;
      justify-content: flex-start;
      align-items: center;
    }
    .mob-body--preparing {
      padding-top: 28px;
      padding-bottom: 28px;
      justify-content: center;
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
      font-size: 31px;
      line-height: 1.08;
      letter-spacing: var(--auth-tracking-display);
      text-align: left;
    }
    .mob-intent-shell {
      padding: 16px 18px;
      min-height: 112px;
    }
    .mob-intent-area {
      min-height: 72px;
    }
    .mob-intent-example {
      left: 18px;
      top: 16px;
      right: 18px;
    }
    .mob-intent-caret {
      left: 18px;
      top: 18px;
    }

    .mob .al-glassy-hero.mob-glassy-h1 {
      font-size: 31px !important;
      line-height: 1.22 !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mob-intent-caret { animation: none !important; opacity: 0.7; }
    .mob-intent-example { transition: none !important; filter: none !important; }
    .mob-continue-btn { animation: none !important; }
    .mob-intent-shell,
    .mob-chip,
    .mob-connect-row { animation: none !important; opacity: 1 !important; filter: none !important; transform: none !important; }
    .mob .al-glassy-hero.mob-glassy-h1 .al-gword-inner { animation: none !important; opacity: 1 !important; filter: none !important; transform: none !important; }
    .mob.is-exiting { transition: none !important; }
    .mob.is-panel-enter { animation: none !important; }
    .mob-dot { transition: none !important; }
    .mob-nav-back { transition: none !important; }
  }
`
