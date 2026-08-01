/**
 * Auth OS visual system — single source of truth.
 *
 * Extracted from Primary Dusk onboarding. Every authentication surface
 * (login, register, create-workspace, join, invite, reset, onboarding)
 * must import this. Do not invent a second auth look.
 *
 * Onboarding-only chrome (command bar, sources list, toggles) stays page-local.
 */

export const AUTH_OS_STYLES = `
  /* ── Primary dusk — Festag primary (#5B647D) atmosphere ── */
  .al-root.onb-sand-dark,
  .al-root.onb-sand-dark[data-theme="dark"] {
    --al-bg: #0C0D12;
    --al-text: #E6E8EE;
    --al-text-muted: #8891a0;
    --al-text-muted-soft: #6B7385;
    --festag-black-canvas: #0C0D12;
    --festag-black-content: #10121A;
    --festag-black-raised: #14161F;
    --festag-black-popup: #171A24;
    --festag-black-peak: #1C2030;
    --fp-bg: #171A24;
    --modal-backdrop: rgba(12, 13, 18, 0.72);
    --festag-night-ink: #E6E8EE;
    --onb-sand: #0C0D12;
    --onb-dusk-fade: #0E1018;
    --al-hero-display-size: 28px;
    --al-hero-display-lh: 30px;
    --al-hero-name-size: 26px;
    --al-hero-name-lh: 32px;
    --al-hero-caret-h: 26px;
    --festag-btn-height: 42px;
    --festag-input-height: 43px;
    --festag-btn-ready-bg: #5B647D;
    --festag-btn-ready-bg-hover: #66708A;
    --festag-btn-ready-bg-active: #515970;
    --festag-btn-ready-fg: #F5F5F7;
    --festag-btn-dark-ready-bg: #5B647D;
    --festag-btn-dark-ready-bg-hover: #66708A;
    --festag-btn-dark-ready-bg-active: #515970;
    background:
      radial-gradient(ellipse 90% 48% at 40% -8%, rgba(255, 255, 255, 0.035), transparent 55%),
      radial-gradient(ellipse 80% 42% at 60% 110%, rgba(255, 255, 255, 0.02), transparent 60%),
      linear-gradient(180deg, #10121A 0%, #0C0D12 48%, #0B0C10 100%) !important;
    color: #E6E8EE;
  }
  /*
   * Portaled popups (Docs sheet, Tagro assist) inherit from html — not .al-root.
   * Keep dusk ladder + scrim on html so overlays match the auth canvas.
   */
  html[data-auth-landing][data-theme="dark"],
  html:has(.al-root.onb-sand-dark) {
    --festag-black-canvas: #0C0D12;
    --festag-black-content: #10121A;
    --festag-black-raised: #14161F;
    --festag-black-popup: #171A24;
    --festag-black-peak: #1C2030;
    --fp-bg: #171A24;
    --modal-backdrop: rgba(12, 13, 18, 0.72);
    --festag-night-ink: #E6E8EE;
  }
  html:has(.al-root.onb-sand-dark),
  html:has(.al-root.onb-sand-dark) body {
    background: #0C0D12 !important;
  }

  /* Auth popups / sheets — same dusk surface as the page, not Night zinc */
  html[data-auth-landing][data-theme="dark"] .auth-rec-panel,
  html[data-auth-landing][data-theme="dark"] .auth-sec-panel,
  html[data-auth-landing][data-theme="dark"] .auth-panel-switch-panel,
  html[data-auth-landing][data-theme="dark"] .onb-wx-panel,
  html:has(.al-root.onb-sand-dark) .auth-rec-panel,
  html:has(.al-root.onb-sand-dark) .auth-sec-panel,
  html:has(.al-root.onb-sand-dark) .auth-panel-switch-panel,
  html:has(.al-root.onb-sand-dark) .onb-wx-panel,
  .al-root.onb-sand-dark .auth-rec-panel,
  .al-root.onb-sand-dark .auth-sec-panel,
  .al-root.onb-sand-dark .auth-panel-switch-panel,
  .al-root.onb-sand-dark .onb-wx-panel {
    background: var(--festag-black-popup, #171A24) !important;
    border-color: rgba(255, 255, 255, 0.06) !important;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45) !important;
  }
  html[data-auth-landing][data-theme="dark"] .auth-rec-backdrop,
  html[data-auth-landing][data-theme="dark"] .auth-sec-backdrop,
  html[data-auth-landing][data-theme="dark"] .auth-panel-switch-backdrop,
  html[data-auth-landing][data-theme="dark"] .onb-wx-backdrop,
  html:has(.al-root.onb-sand-dark) .auth-rec-backdrop,
  html:has(.al-root.onb-sand-dark) .auth-sec-backdrop,
  html:has(.al-root.onb-sand-dark) .auth-panel-switch-backdrop,
  html:has(.al-root.onb-sand-dark) .onb-wx-backdrop,
  .al-root.onb-sand-dark .auth-rec-backdrop,
  .al-root.onb-sand-dark .auth-sec-backdrop,
  .al-root.onb-sand-dark .auth-panel-switch-backdrop,
  .al-root.onb-sand-dark .onb-wx-backdrop {
    background: var(--modal-backdrop, rgba(12, 13, 18, 0.72)) !important;
  }
  html[data-auth-landing][data-theme="dark"] .auth-docs-pop.auth-docs-pop--dark,
  html:has(.al-root.onb-sand-dark) .auth-docs-pop.auth-docs-pop--dark,
  .al-root.onb-sand-dark .auth-docs-pop.auth-docs-pop--dark {
    background: var(--festag-black-popup, #171A24) !important;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.28),
      0 10px 28px rgba(0, 0, 0, 0.36) !important;
  }
  html[data-auth-landing][data-theme="dark"] .auth-docs-mobile-host .festag-popup-backdrop,
  html:has(.al-root.onb-sand-dark) .auth-docs-mobile-host .festag-popup-backdrop {
    background: var(--modal-backdrop, rgba(12, 13, 18, 0.72)) !important;
  }
  html[data-auth-landing][data-theme="dark"] .tfa-bubble--dark,
  html:has(.al-root.onb-sand-dark) .tfa-bubble--dark {
    background: rgba(20, 22, 31, 0.96) !important;
    border-color: rgba(255, 255, 255, 0.07) !important;
  }
  html[data-auth-landing][data-theme="dark"] .tfa-bubble--dark.is-ready,
  html:has(.al-root.onb-sand-dark) .tfa-bubble--dark.is-ready {
    background: rgba(23, 26, 36, 0.97) !important;
  }
  html[data-auth-landing][data-theme="dark"] .tfa-bubble--dark.is-menu-open,
  html:has(.al-root.onb-sand-dark) .tfa-bubble--dark.is-menu-open {
    background: #14161F !important;
  }
  html[data-auth-landing][data-theme="dark"] .tfa-bubble--chip.tfa-bubble--dark,
  html:has(.al-root.onb-sand-dark) .tfa-bubble--chip.tfa-bubble--dark {
    background: rgba(23, 26, 36, 0.96) !important;
  }
  html[data-auth-landing][data-theme="dark"] .tfa-bubble--dark .tfa-menu,
  html:has(.al-root.onb-sand-dark) .tfa-bubble--dark .tfa-menu {
    background: #171A24 !important;
    border-color: rgba(255, 255, 255, 0.07) !important;
  }
  .al-root.onb-sand-dark[data-theme="dark"] .al-container,
  .al-root.onb-sand-dark[data-theme="dark"] .al-main,
  .al-root.onb-sand-dark[data-theme="dark"] .al-desktop-left,
  .al-root.onb-sand-dark[data-theme="dark"] .al-mobile-sheet,
  .al-root.onb-sand-dark[data-theme="dark"] .al-sheet-body,
  .al-root.onb-sand-dark .al-container,
  .al-root.onb-sand-dark .al-main,
  .al-root.onb-sand-dark .al-desktop-left,
  .al-root.onb-sand-dark .al-mobile-sheet,
  .al-root.onb-sand-dark .al-sheet-body {
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
  }

  .al-root.onb-sand-dark .onb-hero-lead,
  .al-root.onb-sand-dark .al-gword-lead {
    color: #E6E8EE;
  }
  .al-root.onb-sand-dark .al-hero-gray {
    color: #8891a0;
  }
  .al-root.onb-sand-dark .onb-field-label,
  .al-root.onb-sand-dark .al-t1,
  .al-root.onb-sand-dark .al-agreements-text,
  .al-root.onb-sand-dark .al-signup-alt,
  .al-root.onb-sand-dark .al-work-email-tip-text {
    color: #8891a0;
  }
  .al-root.onb-sand-dark .onb-field-optional {
    color: #6B7385;
  }

  /* Inputs — fixed 2px stroke, no width jump on focus */
  .al-root.onb-sand-dark .al-input,
  .al-root.onb-sand-dark textarea.al-input {
    color: #E6E8EE !important;
    border-width: 2px !important;
    border-color: rgba(232, 230, 225, 0.12) !important;
    caret-color: #5B647D;
    background: transparent !important;
    transition: border-color .22s ease !important;
    box-shadow: none !important;
  }
  .al-root.onb-sand-dark .al-input:hover,
  .al-root.onb-sand-dark .al-input:not(:placeholder-shown),
  .al-root.onb-sand-dark textarea.al-input:hover,
  .al-root.onb-sand-dark textarea.al-input:not(:placeholder-shown) {
    border-color: rgba(232, 230, 225, 0.20) !important;
  }
  .al-root.onb-sand-dark .al-input:focus,
  .al-root.onb-sand-dark .al-input:focus-visible,
  .al-root.onb-sand-dark textarea.al-input:focus,
  .al-root.onb-sand-dark textarea.al-input:focus-visible {
    border-width: 2px !important;
    border-color: #5B647D !important;
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
  }
  .al-root.onb-sand-dark .al-input::placeholder,
  .al-root.onb-sand-dark textarea.al-input::placeholder {
    color: #6B7385 !important;
    -webkit-text-fill-color: #6B7385 !important;
  }

  /* CTAs — idle ghost, ready = Festag primary (never bone on OS auth) */
  .al-root.onb-sand-dark .al-btn.al-btn-primary,
  .al-root.onb-sand-dark .al-btn.al-btn-ghost,
  .al-root.onb-sand-dark .al-btn.al-btn-google,
  .al-root.onb-sand-dark .al-btn.al-btn-apple {
    transition:
      background .32s cubic-bezier(.22,1,.36,1),
      color .28s ease,
      border-color .28s ease,
      box-shadow .28s ease,
      opacity .28s ease,
      transform .28s cubic-bezier(.22,1,.36,1) !important;
  }
  .al-root.onb-sand-dark .al-btn.al-btn-primary:not(.al-btn-primary--ready),
  .al-root.onb-sand-dark .al-btn.al-btn-ghost,
  .al-root.onb-sand-dark .al-btn.al-btn-google,
  .al-root.onb-sand-dark .al-btn.al-btn-apple {
    background: transparent !important;
    color: rgba(230, 232, 238, 0.62) !important;
    border: 1px solid rgba(230, 232, 238, 0.10) !important;
    box-shadow: none !important;
  }
  .al-root.onb-sand-dark .al-btn.al-btn-google,
  .al-root.onb-sand-dark .al-btn.al-btn-apple {
    color: rgba(245, 245, 247, 0.88) !important;
    background: rgba(255, 255, 255, 0.04) !important;
    border-color: rgba(230, 232, 238, 0.12) !important;
  }
  .al-root.onb-sand-dark .al-btn.al-btn-google:hover:not(:disabled),
  .al-root.onb-sand-dark .al-btn.al-btn-apple:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.06) !important;
    border-color: rgba(230, 232, 238, 0.16) !important;
    color: rgba(245, 245, 247, 0.96) !important;
  }
  .al-root.onb-sand-dark .al-btn-primary--ready,
  .al-root.onb-sand-dark .al-btn.al-btn-primary.al-btn-primary--ready {
    background: #5B647D !important;
    color: #F5F5F7 !important;
    border: 1px solid rgba(255, 255, 255, 0.06) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18) !important;
    transition:
      background .28s cubic-bezier(.22,1,.36,1),
      border-color .28s ease,
      box-shadow .28s ease,
      transform .18s cubic-bezier(.22,1,.36,1) !important;
  }
  .al-root.onb-sand-dark .al-btn-primary--ready:hover:not(:disabled),
  .al-root.onb-sand-dark .al-btn.al-btn-primary.al-btn-primary--ready:hover:not(:disabled) {
    background: #66708A !important;
    color: #F5F5F7 !important;
    border-color: rgba(255, 255, 255, 0.10) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22) !important;
  }
  .al-root.onb-sand-dark .al-btn-primary--ready:active:not(:disabled),
  .al-root.onb-sand-dark .al-btn.al-btn-primary.al-btn-primary--ready:active:not(:disabled) {
    background: #515970 !important;
    color: #F5F5F7 !important;
    transform: scale(0.99);
    box-shadow: none !important;
  }
  .al-root.onb-sand-dark .al-btn-primary--ready:focus-visible,
  .al-root.onb-sand-dark .al-btn.al-btn-primary.al-btn-primary--ready:focus-visible {
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(91, 100, 125, 0.28) !important;
  }

  /* Desktop Enter hint — sits inside the primary CTA, never on mobile */
  .al-root.onb-sand-dark .al-btn--enter-hint,
  .al-root.onb-sand-dark .onb-command-cta.onb-command-cta--enter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
  }
  .al-root.onb-sand-dark .al-btn--enter-hint .al-btn-label,
  .al-root.onb-sand-dark .onb-command-cta .onb-command-label {
    min-width: 0;
  }
  .al-root.onb-sand-dark .al-enter-hint {
    display: none;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    margin: 0;
    padding: 0;
    font-size: 12.5px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1;
    color: rgba(245, 245, 247, 0.55);
    opacity: 0;
    transform: translateY(1px);
    transition: opacity .32s cubic-bezier(.22,1,.36,1), transform .32s cubic-bezier(.22,1,.36,1);
    pointer-events: none;
    user-select: none;
  }
  .al-root.onb-sand-dark .al-enter-hint-key {
    font-size: 13px;
    line-height: 1;
    opacity: 0.9;
  }
  .al-root.onb-sand-dark .al-enter-hint-label {
    font-size: 12.5px;
  }
  @media (min-width: 769px) {
    .al-root.onb-sand-dark .al-btn--enter-hint.al-btn-primary--ready:not(:disabled),
    .al-root.onb-sand-dark .onb-command-cta.onb-command-cta--enter.is-ready:not(:disabled) {
      justify-content: space-between;
    }
    .al-root.onb-sand-dark .al-enter-hint {
      display: inline-flex;
    }
    .al-root.onb-sand-dark .al-enter-hint.is-visible {
      opacity: 1;
      transform: none;
    }
    .al-root.onb-sand-dark .al-btn--enter-hint:disabled .al-enter-hint,
    .al-root.onb-sand-dark .onb-command-cta:disabled .al-enter-hint {
      opacity: 0;
      transform: translateY(1px);
    }
    /* Arrow yields to Enter hint on desktop */
    .al-root.onb-sand-dark .onb-command-cta--enter .onb-command-arrow {
      display: none;
    }
  }

  /* Logo — fluid mark only, same as onboarding */
  .al-root.onb-sand-dark .al-theme-icon--header,
  .al-root.onb-sand-dark .al-theme-icon--footer,
  .al-root.onb-sand-dark .al-footer-center {
    display: none !important;
  }
  .al-root.onb-sand-dark .al-wordmark::before {
    display: none !important;
  }
  .al-root.onb-sand-dark .al-wordmark-img,
  .al-root.onb-sand-dark .al-wordmark-img--dark,
  .al-root.onb-sand-dark .al-wordmark-img--light {
    display: block !important;
    width: 32px !important;
    height: 32px !important;
    object-fit: contain;
    opacity: 0.88;
  }
  .al-root.onb-sand-dark .al-wordmark {
    width: 36px;
    height: 36px;
  }
  .al-root.onb-sand-dark .al-footer-meta {
    display: none !important;
  }
  .al-root.onb-sand-dark .al-auth-switch {
    margin-top: 32px;
  }
  .al-root.onb-sand-dark .al-account-hint {
    text-align: left;
    font-size: 13.5px;
    line-height: 1.5;
    letter-spacing: 0.01em;
    color: rgba(245, 245, 247, 0.42);
  }
  .al-root.onb-sand-dark .al-account-hint-link {
    color: rgba(245, 245, 247, 0.78);
    text-decoration: none;
    font-weight: 400;
  }
  .al-root.onb-sand-dark .al-account-hint-link:hover,
  .al-root.onb-sand-dark .al-account-hint-link:focus-visible {
    color: #F5F5F7;
    text-decoration: none;
  }

  /* One H1 — muted rest is opacity only, never a second title block */
  .al-root.onb-sand-dark .al-hero-gray,
  .al-root.onb-sand-dark .al-gword-inner.al-hero-gray,
  .al-root.onb-sand-dark .onb-word-inner.al-hero-gray {
    color: inherit !important;
    opacity: 0.58;
  }
  .al-root.onb-sand-dark .al-gword-lead,
  .al-root.onb-sand-dark .onb-hero-lead {
    color: #F5F5F7 !important;
    opacity: 1;
  }

  /* Shared OS rhythm: step → hero → support */
  .al-root.onb-sand-dark .onb-step-label,
  .al-root.onb-sand-dark .al-os-step {
    margin: 0 0 14px;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.35;
    letter-spacing: 0.01em;
    color: rgba(245, 245, 247, 0.38);
  }
  .al-root.onb-sand-dark .onb-support,
  .al-root.onb-sand-dark .al-os-support {
    margin: 16px 0 0;
    max-width: 36em;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.55;
    letter-spacing: 0.01em;
    color: rgba(245, 245, 247, 0.52);
  }

  /* Shared OS cards — heavier, calmer, not form chrome */
  .al-root.onb-sand-dark .onb-sources-row,
  .al-root.onb-sand-dark .onb-toggle-row,
  .al-root.onb-sand-dark .al-os-card {
    border-radius: var(--al-os-card-radius, 14px);
    border: 1px solid rgba(255, 255, 255, 0.055);
    background: rgba(255, 255, 255, 0.028);
    padding: var(--al-os-card-pad-y, 16px) var(--al-os-card-pad-x, 16px);
  }
  .al-root.onb-sand-dark .onb-sources-row.is-actionable:hover,
  .al-root.onb-sand-dark .onb-toggle-row:hover,
  .al-root.onb-sand-dark .al-os-card.is-actionable:hover {
    background: rgba(255, 255, 255, 0.045);
    border-color: rgba(255, 255, 255, 0.09);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
    transform: translateY(-1px);
  }
  .al-root.onb-sand-dark .onb-sources-row.is-connected {
    border-color: rgba(255, 255, 255, 0.10);
    background: rgba(255, 255, 255, 0.04);
    box-shadow: none;
  }
  .al-root.onb-sand-dark .al-divider {
    color: #6B7385;
    opacity: 0.72;
  }
  .al-root.onb-sand-dark .al-divider::before,
  .al-root.onb-sand-dark .al-divider::after {
    background: rgba(255, 255, 255, 0.06) !important;
  }

  /* Hero — shared OS scale (mobile + desktop override via tokens) */
  .al-root.onb-sand-dark .onb-hero-line,
  .al-root.onb-sand-dark .al-signin-head .al-title.al-title-display,
  .al-root.onb-sand-dark .al-hero-copy .al-title.al-title-display,
  .al-root.onb-sand-dark .al-glassy-hero {
    margin: 0;
    max-width: 100%;
    font-size: var(--al-hero-display-size, 34px) !important;
    line-height: var(--al-hero-display-lh, 40px) !important;
    letter-spacing: -0.025em !important;
    font-weight: 400 !important;
    text-align: left;
  }
  .al-root.onb-sand-dark .al-signin-head {
    margin-bottom: 22px;
  }
  .al-root.onb-sand-dark .al-hero-copy .al-hero-gray,
  .al-root.onb-sand-dark .al-hero-copy .al-ws-name-input,
  .al-root.onb-sand-dark .al-hero-copy input.al-ws-name-input,
  .al-root.onb-sand-dark .al-hero-copy .auth-expand-compact,
  .al-root.onb-sand-dark .al-hero-copy .auth-expand-slash,
  .al-root.onb-sand-dark .al-hero-copy .auth-expand-idle-caret,
  .al-root.onb-sand-dark .al-hero-copy .al-ws-path,
  .al-root.onb-sand-dark .al-hero-copy button.al-ws-path--editable,
  .al-root.onb-sand-dark .al-hero-copy .al-ws-path .al-ws-slash,
  .al-root.onb-sand-dark .al-hero-secondary {
    font-size: var(--al-hero-name-size, var(--al-hero-display-size, 34px)) !important;
    line-height: var(--al-hero-name-lh, var(--al-hero-display-lh, 40px)) !important;
    letter-spacing: -0.025em !important;
    font-weight: 400 !important;
  }
  .al-root.onb-sand-dark .al-hero-copy .auth-expand-idle-caret,
  .al-root.onb-sand-dark .al-ws-name-line:not(.has-value):not(:focus-within)::after {
    height: var(--al-hero-caret-h, 28px) !important;
    min-height: var(--al-hero-caret-h, 28px) !important;
  }

  /* Mobile — match onboarding: larger H1/username, vertically centered, taller email */
  @media (max-width: 768px) {
    .al-root.onb-sand-dark,
    .al-root.onb-sand-dark[data-theme="dark"] {
      --al-hero-display-size: 34px;
      --al-hero-display-lh: 40px;
      --al-hero-name-size: 34px;
      --al-hero-name-lh: 40px;
      --al-hero-caret-h: 28px;
      --festag-btn-height: 44px;
      --festag-input-height: 44px;
      --festag-email-input-height: 50px;
      --festag-input-font-size: 15.5px;
    }

    .al-root.onb-sand-dark .al-signin-head {
      margin-bottom: clamp(18px, 3vh, 26px);
    }

    /* Vertically center login / register like onboarding */
    .al-root.onb-sand-dark[data-auth-mode="login"] .al-main,
    .al-root.onb-sand-dark[data-auth-mode="signup"] .al-main {
      justify-content: center !important;
      align-items: stretch !important;
      padding-top: 0 !important;
      padding-bottom: max(20px, env(safe-area-inset-bottom, 0px)) !important;
    }
    .al-root.onb-sand-dark[data-auth-mode="login"] .al-desktop-stage,
    .al-root.onb-sand-dark[data-auth-mode="login"] .al-desktop-stage--centered,
    .al-root.onb-sand-dark[data-auth-mode="login"] .al-desktop-left,
    .al-root.onb-sand-dark[data-auth-mode="login"] .al-mobile-sheet,
    .al-root.onb-sand-dark[data-auth-mode="login"] .al-sheet-body,
    .al-root.onb-sand-dark[data-auth-mode="signup"] .al-desktop-stage,
    .al-root.onb-sand-dark[data-auth-mode="signup"] .al-desktop-stage--centered,
    .al-root.onb-sand-dark[data-auth-mode="signup"] .al-desktop-left,
    .al-root.onb-sand-dark[data-auth-mode="signup"] .al-mobile-sheet,
    .al-root.onb-sand-dark[data-auth-mode="signup"] .al-sheet-body {
      justify-content: center !important;
      align-items: stretch !important;
    }
    .al-root.onb-sand-dark[data-auth-mode="login"] .al-signin,
    .al-root.onb-sand-dark[data-auth-mode="signup"] .al-signin {
      flex: 0 0 auto !important;
      justify-content: flex-start !important;
      height: auto !important;
      max-height: none !important;
      padding-bottom: 56px;
    }

    /* CTAs / fields — shared mobile height */
    .al-root.onb-sand-dark .al-btn:not(.al-under-cta-switch) {
      height: var(--festag-btn-height, 44px) !important;
      min-height: var(--festag-btn-height, 44px) !important;
      max-height: var(--festag-btn-height, 44px) !important;
    }
    .al-root.onb-sand-dark .al-input,
    .al-root.onb-sand-dark textarea.al-input:not(.onb-facts-area) {
      height: var(--festag-input-height, 44px) !important;
      min-height: var(--festag-input-height, 44px) !important;
      max-height: var(--festag-input-height, 44px) !important;
    }

    /* Email — slightly taller than OAuth / SSO ghosts */
    .al-root.onb-sand-dark .al-signin-stack .al-method-group > .al-input-shell,
    .al-root.onb-sand-dark .al-signin-stack .al-method-group > .al-input-shell .al-input,
    .al-root.onb-sand-dark .al-sso-group .al-input-shell,
    .al-root.onb-sand-dark .al-sso-group .al-input-shell .al-input,
    .al-root.onb-sand-dark .al-signin-stack > .al-input-shell,
    .al-root.onb-sand-dark .al-signin-stack > .al-input-shell .al-input {
      height: var(--festag-email-input-height, 50px) !important;
      min-height: var(--festag-email-input-height, 50px) !important;
      max-height: var(--festag-email-input-height, 50px) !important;
    }
    .al-root.onb-sand-dark .al-input-shell {
      display: flex;
      align-items: center;
    }
  }

  /*
   * Desktop — classic black-login column (~480px), optically centered.
   * Same calm width as the previous dark login; not a wide marketing stretch.
   */
  @media (min-width: 769px) {
    .al-root.onb-sand-dark,
    .al-root.onb-sand-dark[data-theme="dark"] {
      --al-panel-width: 480px;
      --al-os-gutter: 48px;
      --al-os-content-max: 480px;
      --al-hero-display-size: 40px;
      --al-hero-display-lh: 46px;
      /* Username matches H1 while typing / idle — no size jump on focus. */
      --al-hero-name-size: 40px;
      --al-hero-name-lh: 46px;
      --al-hero-caret-h: 32px;
      --festag-btn-height: 48px;
      --festag-input-height: 50px;
      --festag-input-font-size: 16px;
      --al-desktop-hero-gap: 36px;
      --al-desktop-stack-gap: 14px;
      --al-desktop-divider-gap: 28px;
      --al-desktop-field-gap: 16px;
      --al-desktop-secondary-gap: 28px;
      --al-os-card-radius: 14px;
      --al-os-card-pad-y: 18px;
      --al-os-card-pad-x: 18px;
      --al-os-card-gap: 10px;
      --al-col-pad: max(24px, calc(50% - (var(--al-panel-width) / 2)));
    }

    .al-root.onb-sand-dark.al-root--centered .al-main,
    .al-root.onb-sand-dark .al-main {
      justify-content: center !important;
      align-items: center !important;
      padding-bottom: max(120px, calc(env(safe-area-inset-bottom, 0px) + 96px)) !important;
    }
    .al-root.onb-sand-dark .al-desktop-stage,
    .al-root.onb-sand-dark .al-desktop-stage--centered {
      justify-items: center !important;
      justify-content: center !important;
      width: 100%;
      max-width: none;
    }
    .al-root.onb-sand-dark .al-desktop-left {
      width: 100%;
      max-width: var(--al-panel-width, 480px);
      align-items: stretch !important;
      justify-content: center !important;
      padding:
        clamp(28px, 6vh, 56px)
        0
        clamp(96px, 12vh, 140px) !important;
      margin-inline: auto;
    }
    .al-root.onb-sand-dark .al-header {
      padding: 28px max(40px, calc(50% - (var(--al-panel-width, 480px) / 2))) 8px !important;
    }
    .al-root.onb-sand-dark .al-mobile-sheet,
    .al-root.onb-sand-dark .al-sheet-body,
    .al-root.onb-sand-dark .al-signin {
      width: min(100%, var(--al-panel-width, 480px));
      max-width: var(--al-panel-width, 480px);
      margin-inline: auto;
      align-items: stretch;
    }
    .al-root.onb-sand-dark .al-sheet-body {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    .al-root.onb-sand-dark .al-wordmark-img,
    .al-root.onb-sand-dark .al-wordmark-img--dark,
    .al-root.onb-sand-dark .al-wordmark-img--light {
      width: 30px !important;
      height: 30px !important;
      opacity: 0.82;
    }
    .al-root.onb-sand-dark .al-wordmark {
      width: 34px;
      height: 34px;
    }
    .al-root.onb-sand-dark .onb-hero-line,
    .al-root.onb-sand-dark .al-signin-head .al-title.al-title-display,
    .al-root.onb-sand-dark .al-hero-copy .al-title.al-title-display,
    .al-root.onb-sand-dark .al-glassy-hero {
      font-size: var(--al-hero-display-size, 40px) !important;
      line-height: var(--al-hero-display-lh, 46px) !important;
      letter-spacing: -0.03em !important;
      max-width: none;
    }
    .al-root.onb-sand-dark .al-signin-head {
      margin-bottom: var(--al-desktop-hero-gap, 36px);
      gap: 0;
    }
    .al-root.onb-sand-dark .al-hero-secondary,
    .al-root.onb-sand-dark .al-ws-name-line,
    .al-root.onb-sand-dark .al-ws-name-input,
    .al-root.onb-sand-dark .al-ws-path,
    .al-root.onb-sand-dark .al-hero-copy .auth-expand-compact,
    .al-root.onb-sand-dark .al-hero-copy .auth-expand-slash,
    .al-root.onb-sand-dark .al-hero-copy .auth-expand-idle-caret {
      font-size: var(--al-hero-name-size, 40px) !important;
      line-height: var(--al-hero-name-lh, 46px) !important;
      letter-spacing: -0.03em !important;
    }
    .al-root.onb-sand-dark .al-ws-name-line:not(.has-value):not(:focus-within)::after {
      height: var(--al-hero-caret-h, 32px) !important;
      min-height: var(--al-hero-caret-h, 32px) !important;
    }
    .al-root.onb-sand-dark .al-btn {
      height: var(--festag-btn-height, 48px) !important;
      min-height: var(--festag-btn-height, 48px) !important;
      max-height: var(--festag-btn-height, 48px) !important;
      font-size: 15px !important;
      letter-spacing: -0.01em;
      border-radius: 8px !important;
    }
    .al-root.onb-sand-dark .al-input,
    .al-root.onb-sand-dark textarea.al-input {
      height: var(--festag-input-height, 50px) !important;
      min-height: var(--festag-input-height, 50px) !important;
      max-height: var(--festag-input-height, 50px) !important;
      font-size: 16px !important;
      border-radius: 8px !important;
    }
    .al-root.onb-sand-dark .al-signin-stack {
      gap: var(--al-desktop-stack-gap, 14px) !important;
      max-width: var(--al-panel-width, 480px);
    }
    .al-root.onb-sand-dark .al-method-group {
      gap: var(--al-desktop-field-gap, 16px) !important;
    }
    .al-root.onb-sand-dark .al-divider {
      margin: var(--al-desktop-divider-gap, 28px) 0 !important;
      font-size: 12px;
      letter-spacing: 0.04em;
      opacity: 0.5;
    }
    .al-root.onb-sand-dark .al-sso-group,
    .al-root.onb-sand-dark .al-login-aux,
    .al-root.onb-sand-dark .al-auth-switch {
      margin-top: var(--al-desktop-secondary-gap, 28px) !important;
    }
    .al-root.onb-sand-dark .al-t1,
    .al-root.onb-sand-dark .al-signup-alt,
    .al-root.onb-sand-dark .al-work-email-tip-text {
      font-size: 14px !important;
      line-height: 1.55;
      opacity: 0.55;
    }
    .al-root.onb-sand-dark .onb-support,
    .al-root.onb-sand-dark .al-os-support {
      font-size: 15px;
      max-width: 34em;
    }
    .al-root.onb-sand-dark .onb-sources-list,
    .al-root.onb-sand-dark .onb-focus-list {
      gap: var(--al-os-card-gap, 10px);
      max-width: var(--al-os-content-max, 480px);
    }
    .al-root.onb-sand-dark .onb-sources-row,
    .al-root.onb-sand-dark .onb-toggle-row {
      padding: var(--al-os-card-pad-y, 18px) var(--al-os-card-pad-x, 18px);
    }
    .al-root.onb-sand-dark .onb-sources-name {
      font-size: 15px;
      font-weight: 400;
    }
    .al-root.onb-sand-dark .onb-sources-blurb {
      font-size: 13px;
      color: rgba(245, 245, 247, 0.48);
    }
    .al-root.onb-sand-dark .al-signin {
      padding-bottom: 0;
    }

    /* Soft mode flip — opacity only, no scale wobble */
    .al-root.onb-sand-dark .al-signin {
      transition: opacity 0.18s cubic-bezier(.22, 1, .36, 1) !important;
      transform: none !important;
    }
    .al-root.onb-sand-dark .al-signin.al-signin--out {
      opacity: 0 !important;
      transform: none !important;
    }
    .al-root.onb-sand-dark.al-soft-enter .al-signin:not(.al-signin--out) {
      animation: alOsSoftIn 0.22s cubic-bezier(.22, 1, .36, 1) both !important;
    }
  }

  @keyframes alOsSoftIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (min-width: 1280px) {
    .al-root.onb-sand-dark,
    .al-root.onb-sand-dark[data-theme="dark"] {
      --al-panel-width: 480px;
      --al-os-gutter: 56px;
      --al-os-content-max: 480px;
      --al-hero-display-size: 42px;
      --al-hero-display-lh: 48px;
      --al-hero-name-size: 42px;
      --al-hero-name-lh: 48px;
      --al-desktop-hero-gap: 40px;
    }
  }

  @media (min-width: 769px) and (max-height: 820px) {
    .al-root.onb-sand-dark,
    .al-root.onb-sand-dark[data-theme="dark"] {
      --al-hero-display-size: 36px;
      --al-hero-display-lh: 42px;
      --al-hero-name-size: 36px;
      --al-hero-name-lh: 42px;
      --al-hero-caret-h: 28px;
      --al-desktop-hero-gap: 28px;
      --al-desktop-divider-gap: 22px;
      --al-desktop-secondary-gap: 22px;
      --festag-btn-height: 44px;
      --festag-input-height: 46px;
    }
    .al-root.onb-sand-dark .al-desktop-left {
      padding-top: clamp(20px, 4vh, 36px) !important;
      padding-bottom: clamp(80px, 10vh, 112px) !important;
    }
  }
`
