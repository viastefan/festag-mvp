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

  /* Auth popups / sheets — dusk only when the popup itself is dark.
   * Read/ivory auth (login) keeps sand panels even if html was Night earlier. */
  .auth-rec-backdrop[data-theme="dark"] .auth-rec-panel,
  .auth-sec-backdrop[data-theme="dark"] .auth-sec-panel,
  .auth-panel-switch-backdrop[data-theme="dark"] .auth-panel-switch-panel,
  .onb-wx-backdrop[data-theme="dark"] .onb-wx-panel,
  html:has(.al-root.onb-sand-dark) .auth-rec-backdrop:not([data-theme="read"]):not([data-theme="light"]) .auth-rec-panel,
  html:has(.al-root.onb-sand-dark) .auth-sec-backdrop:not([data-theme="read"]):not([data-theme="light"]) .auth-sec-panel,
  html:has(.al-root.onb-sand-dark) .auth-panel-switch-backdrop:not([data-theme="read"]):not([data-theme="light"]) .auth-panel-switch-panel,
  html:has(.al-root.onb-sand-dark) .onb-wx-backdrop:not([data-theme="read"]):not([data-theme="light"]) .onb-wx-panel,
  .al-root.onb-sand-dark .auth-rec-backdrop:not([data-theme="read"]):not([data-theme="light"]) .auth-rec-panel,
  .al-root.onb-sand-dark .auth-sec-backdrop:not([data-theme="read"]):not([data-theme="light"]) .auth-sec-panel,
  .al-root.onb-sand-dark .auth-panel-switch-backdrop:not([data-theme="read"]):not([data-theme="light"]) .auth-panel-switch-panel,
  .al-root.onb-sand-dark .onb-wx-backdrop:not([data-theme="read"]):not([data-theme="light"]) .onb-wx-panel {
    background: var(--festag-black-popup, #171A24) !important;
    border-color: rgba(255, 255, 255, 0.06) !important;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45) !important;
  }
  .auth-rec-backdrop[data-theme="dark"],
  .auth-sec-backdrop[data-theme="dark"],
  .auth-panel-switch-backdrop[data-theme="dark"],
  .onb-wx-backdrop[data-theme="dark"],
  html:has(.al-root.onb-sand-dark) .auth-rec-backdrop:not([data-theme="read"]):not([data-theme="light"]),
  html:has(.al-root.onb-sand-dark) .auth-sec-backdrop:not([data-theme="read"]):not([data-theme="light"]),
  html:has(.al-root.onb-sand-dark) .auth-panel-switch-backdrop:not([data-theme="read"]):not([data-theme="light"]),
  html:has(.al-root.onb-sand-dark) .onb-wx-backdrop:not([data-theme="read"]):not([data-theme="light"]),
  .al-root.onb-sand-dark .auth-rec-backdrop:not([data-theme="read"]):not([data-theme="light"]),
  .al-root.onb-sand-dark .auth-sec-backdrop:not([data-theme="read"]):not([data-theme="light"]),
  .al-root.onb-sand-dark .auth-panel-switch-backdrop:not([data-theme="read"]):not([data-theme="light"]),
  .al-root.onb-sand-dark .onb-wx-backdrop:not([data-theme="read"]):not([data-theme="light"]) {
    background: var(--modal-backdrop, rgba(12, 13, 18, 0.72)) !important;
  }

  /* Ivory Read lock on auth landing — beats any leftover html Night */
  html[data-auth-landing] .auth-rec-backdrop[data-theme="read"] .auth-rec-panel,
  html[data-auth-landing] .auth-rec-backdrop[data-theme="light"] .auth-rec-panel,
  html[data-auth-landing] .auth-sec-backdrop[data-theme="read"] .auth-sec-panel,
  html[data-auth-landing] .auth-sec-backdrop[data-theme="light"] .auth-sec-panel,
  html[data-auth-landing] .onb-wx-backdrop[data-theme="read"] .onb-wx-panel,
  html[data-auth-landing] .onb-wx-backdrop[data-theme="light"] .onb-wx-panel,
  html[data-theme="dark"] .auth-rec-backdrop[data-theme="read"] .auth-rec-panel,
  html[data-theme="dark"] .auth-sec-backdrop[data-theme="read"] .auth-sec-panel,
  html[data-theme="dark"] .onb-wx-backdrop[data-theme="read"] .onb-wx-panel,
  .al-root .auth-rec-backdrop[data-theme="read"] .auth-rec-panel,
  .al-root .auth-sec-backdrop[data-theme="read"] .auth-sec-panel,
  .al-root .onb-wx-backdrop[data-theme="read"] .onb-wx-panel {
    background: #FAF9F5 !important;
    border-color: rgba(30, 30, 32, 0.10) !important;
    box-shadow: 0 16px 40px rgba(30, 30, 32, 0.12) !important;
  }
  html[data-auth-landing] .auth-rec-backdrop[data-theme="read"],
  html[data-auth-landing] .auth-rec-backdrop[data-theme="light"],
  html[data-auth-landing] .auth-sec-backdrop[data-theme="read"],
  html[data-auth-landing] .auth-sec-backdrop[data-theme="light"],
  html[data-auth-landing] .onb-wx-backdrop[data-theme="read"],
  html[data-auth-landing] .onb-wx-backdrop[data-theme="light"],
  html[data-theme="dark"] .auth-rec-backdrop[data-theme="read"],
  html[data-theme="dark"] .auth-sec-backdrop[data-theme="read"],
  html[data-theme="dark"] .onb-wx-backdrop[data-theme="read"],
  .al-root .auth-rec-backdrop[data-theme="read"],
  .al-root .auth-sec-backdrop[data-theme="read"],
  .al-root .onb-wx-backdrop[data-theme="read"] {
    background: rgba(26, 25, 23, 0.34) !important;
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
    caret-color: var(--festag-input-caret, #66708D);
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
    border-color: var(--festag-input-border-focus, #66708D) !important;
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
    width: 36px !important;
    height: 36px !important;
    object-fit: contain;
    opacity: 0.9;
  }
  .al-root.onb-sand-dark .al-wordmark {
    width: 40px;
    height: 40px;
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

  /* One H1 — white lead + gray rest, same font size (never a second title block) */
  .al-root.onb-sand-dark .al-gword-lead,
  .al-root.onb-sand-dark .onb-hero-lead {
    color: #F5F5F7 !important;
    opacity: 1 !important;
  }
  .al-root.onb-sand-dark .al-hero-gray,
  .al-root.onb-sand-dark .al-gword-inner.al-hero-gray,
  .al-root.onb-sand-dark .onb-word-inner.al-hero-gray {
    color: #8B909A !important;
    opacity: 1 !important;
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
      width: 34px !important;
      height: 34px !important;
      opacity: 0.88;
    }
    .al-root.onb-sand-dark .al-wordmark {
      width: 38px;
      height: 38px;
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
      border-radius: 6px !important;
    }
    .al-root.onb-sand-dark .al-input,
    .al-root.onb-sand-dark textarea.al-input {
      height: var(--festag-input-height, 50px) !important;
      min-height: var(--festag-input-height, 50px) !important;
      max-height: var(--festag-input-height, 50px) !important;
      font-size: 16px !important;
      border-radius: var(--festag-input-radius, 8px) !important;
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

    /* Soft mode flip — panel stays; content fades via glassy-hero soft rules */
    .al-root.onb-sand-dark .al-signin {
      transition: none !important;
      transform: none !important;
    }
    .al-root.onb-sand-dark .al-signin.al-signin--out {
      opacity: 0 !important;
      transform: none !important;
    }
    .al-root.onb-sand-dark.al-soft-mode .al-signin:not(.al-signin--out),
    .al-root.onb-sand-dark.al-soft-enter .al-signin:not(.al-signin--out) {
      animation: none !important;
      opacity: 1 !important;
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

  /* ═══════════════════════════════════════════════════════════════
   * Auth gate — ChatGPT-style technical popup over destination preview
   * Login → dimmed dashboard. Register → dimmed onboarding name step.
   * ═══════════════════════════════════════════════════════════════ */
  .al-root.al-root--gate {
    overflow: hidden;
    background: transparent !important;
  }
  .al-root.al-root--gate .auth-sand-ambient {
    display: none !important;
  }
  .al-root.al-root--gate .al-container {
    position: relative;
    z-index: 2;
    background: transparent !important;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }
  /*
   * Gate dialog — compact OS setup sheet (Apple-style), not a landing page.
   * Headline stays quiet; Account Name is the only large type focus.
   */
  .al-root.al-root--gate,
  .al-root.al-root--gate[data-theme="dark"] {
    --al-gate-title-size: 17px;
    --al-gate-title-lh: 22px;
    --al-hero-display-size: 17px;
    --al-hero-display-lh: 22px;
    --al-hero-name-size: 28px;
    --al-hero-name-lh: 34px;
    --al-hero-caret-h: 24px;
    --festag-btn-height: 36px;
    --festag-input-height: 38px;
    --festag-email-input-height: 38px;
    --festag-input-font-size: 14px;
    --al-panel-width: 340px;
  }
  /* Ambient chrome — Docs only, flush to viewport edges. Logo lives in the dialog. */
  .al-root.al-root--gate .al-header,
  .al-root.al-root--gate .al-header--gate-chrome {
    position: relative;
    z-index: 3;
    width: 100%;
    max-width: none;
    justify-content: space-between;
    background: transparent !important;
    padding: 18px 28px 8px !important;
  }
  .al-root.al-root--gate .al-header-spacer {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }
  .al-root.al-root--gate .al-os-support,
  .al-root.al-root--gate .al-hint {
    display: none !important;
  }
  .al-root.al-root--gate .al-gate-brand {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin: 0 0 14px;
  }
  .al-root.al-root--gate .al-gate-brand-img {
    display: block;
    width: 28px;
    height: 28px;
    object-fit: contain;
    opacity: 0.92;
  }

  .al-dest-preview {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    user-select: none;
  }
  .al-root.al-soft-enter .al-dest-preview {
    animation: alSoftSwapFade 0.2s ease both;
  }
  @keyframes alSoftSwapFade {
    from { opacity: 0.72; }
    to { opacity: 1; }
  }
  .al-dest-scrim {
    position: absolute;
    inset: 0;
    z-index: 2;
    background:
      radial-gradient(ellipse 80% 60% at 50% 40%, rgba(12, 13, 18, 0.35), rgba(12, 13, 18, 0.78) 70%),
      rgba(8, 9, 12, 0.62);
    backdrop-filter: blur(2.5px) saturate(0.92);
    -webkit-backdrop-filter: blur(2.5px) saturate(0.92);
  }

  /* Dashboard silhouette */
  .al-dest-dash {
    position: absolute;
    inset: 0;
    display: flex;
    background: #070708;
    color: rgba(245, 245, 247, 0.88);
  }
  .al-dest-side {
    width: 240px;
    flex-shrink: 0;
    padding: 22px 16px;
    display: flex;
    flex-direction: column;
    gap: 22px;
    border-right: 1px solid rgba(255, 255, 255, 0.04);
    background: #070708;
  }
  .al-dest-side-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .al-dest-mark {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: rgba(245, 245, 247, 0.14);
    flex-shrink: 0;
  }
  .al-dest-side-ws {
    height: 12px;
    width: 96px;
    border-radius: 999px;
    background: rgba(245, 245, 247, 0.12);
  }
  .al-dest-side-nav {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }
  .al-dest-nav-item {
    display: block;
    height: 34px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.035);
  }
  .al-dest-nav-item.is-active {
    background: rgba(91, 100, 125, 0.28);
    box-shadow: inset 0 0 0 1px rgba(91, 100, 125, 0.35);
  }
  .al-dest-side-foot {
    margin-top: auto;
  }
  .al-dest-main-col {
    flex: 1;
    min-width: 0;
    padding: 10px 10px 10px 0;
  }
  .al-dest-plate {
    height: 100%;
    border-radius: 16px;
    background: #0E0E10;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.03) inset,
      0 24px 64px rgba(0, 0, 0, 0.45);
    padding: 36px 40px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .al-dest-plate-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }
  .al-dest-h1 {
    font-size: 34px;
    line-height: 1.1;
    letter-spacing: -0.03em;
    font-weight: 400;
    color: rgba(245, 245, 247, 0.92);
  }
  .al-dest-head-actions {
    display: flex;
    gap: 8px;
  }
  .al-dest-pill {
    width: 72px;
    height: 32px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
  }
  .al-dest-cards {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 640px;
  }
  .al-dest-card {
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.055);
    background: rgba(255, 255, 255, 0.028);
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .al-dest-card--soft {
    opacity: 0.72;
  }
  .al-dest-line {
    height: 11px;
    border-radius: 999px;
    background: rgba(245, 245, 247, 0.12);
    width: 88%;
  }
  .al-dest-line--lg {
    height: 14px;
    width: 52%;
    background: rgba(245, 245, 247, 0.2);
  }
  .al-dest-line--mid { width: 64%; }
  .al-dest-line--short { width: 38%; }

  /* Onboarding name-step silhouette */
  .al-dest-onb {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 90% 48% at 40% -8%, rgba(255, 255, 255, 0.035), transparent 55%),
      linear-gradient(180deg, #10121A 0%, #0C0D12 48%, #0B0C10 100%);
    display: flex;
    flex-direction: column;
  }
  .al-dest-onb-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 40px;
  }
  .al-dest-ghost-pill {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
  .al-dest-onb-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 0 40px 120px;
    gap: 36px;
  }
  .al-dest-onb-hero,
  .al-dest-onb-field {
    width: min(100%, 480px);
  }
  .al-dest-onb-h1 {
    font-size: 42px;
    line-height: 1.1;
    letter-spacing: -0.03em;
    font-weight: 400;
    color: rgba(245, 245, 247, 0.94);
  }
  .al-dest-onb-sub {
    margin-top: 10px;
    font-size: 15.5px;
    line-height: 1.5;
    color: rgba(245, 245, 247, 0.42);
    max-width: 28em;
  }
  .al-dest-onb-label {
    font-size: 13px;
    color: rgba(245, 245, 247, 0.4);
    margin-bottom: 10px;
  }
  .al-dest-onb-input {
    height: 50px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: transparent;
    display: flex;
    align-items: center;
    padding: 0 14px;
  }
  .al-dest-onb-caret {
    width: 2px;
    height: 22px;
    background: rgba(245, 245, 247, 0.55);
    animation: alDestCaret 1.05s steps(1) infinite;
  }
  @keyframes alDestCaret {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  .al-dest-onb-bar {
    position: absolute;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 28px);
    transform: translateX(-50%);
    width: min(calc(100% - 48px), 520px);
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 12px 10px 18px;
    border-radius: 14px;
    background: rgba(23, 26, 36, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  }
  .al-dest-onb-dots {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .al-dest-onb-dots i {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgba(232, 230, 225, 0.16);
    display: block;
  }
  .al-dest-onb-dots i.is-active {
    width: 22px;
    background: rgba(245, 245, 247, 0.88);
  }
  .al-dest-onb-count {
    font-size: 12.5px;
    color: rgba(245, 245, 247, 0.38);
    margin-right: auto;
  }
  .al-dest-onb-cta {
    padding: 11px 16px;
    border-radius: 8px;
    background: #5B647D;
    color: #F5F5F7;
    font-size: 14.5px;
  }

  /* Gate panel — compact OS dialog over dimmed destination */
  .al-root.al-root--gate .al-main {
    flex: 1;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 20px 16px max(24px, env(safe-area-inset-bottom)) !important;
    min-height: 0;
  }
  .al-root.al-root--gate .al-desktop-stage,
  .al-root.al-root--gate .al-desktop-stage--centered,
  .al-root.al-root--gate .al-desktop-left,
  .al-root.al-root--gate .al-mobile-sheet,
  .al-root.al-root--gate .al-sheet-body {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    background: transparent !important;
  }
  .al-root.al-root--gate .al-signin {
    width: min(100%, 340px) !important;
    max-width: 340px !important;
    margin: 0 auto !important;
    padding: 20px 20px 16px !important;
    border-radius: 14px !important;
    background: rgba(20, 22, 31, 0.94) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 22px 64px rgba(0, 0, 0, 0.5),
      0 6px 18px rgba(0, 0, 0, 0.32) !important;
    backdrop-filter: blur(22px) saturate(1.15);
    -webkit-backdrop-filter: blur(22px) saturate(1.15);
    flex: 0 0 auto !important;
    height: auto !important;
    max-height: min(82dvh, 640px);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    animation: alGatePanelIn 0.42s cubic-bezier(.22, 1, .36, 1) both;
  }
  .al-root.al-root--gate.al-soft-mode .al-signin:not(.al-signin--out),
  .al-root.al-root--gate.al-soft-mode .al-signin.al-gate-sheet:not(.al-signin--out),
  .al-root.al-root--gate.al-soft-enter .al-signin:not(.al-signin--out),
  .al-root.al-root--gate.al-soft-enter .al-signin.al-gate-sheet:not(.al-signin--out) {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
  @keyframes alGatePanelIn {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.988);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .al-root.al-root--gate .al-signin-head {
    margin-bottom: 16px !important;
  }
  .al-root.al-root--gate .al-hero-copy {
    gap: 0 !important;
  }
  /* Quiet headline — one short sentence, never competes with account name */
  .al-root.al-root--gate .al-hero-copy .al-title.al-title-display,
  .al-root.al-root--gate .al-glassy-hero {
    font-size: var(--al-gate-title-size, 17px) !important;
    line-height: var(--al-gate-title-lh, 22px) !important;
    letter-spacing: -0.015em !important;
    max-width: none !important;
    font-weight: 400 !important;
    color: rgba(245, 245, 247, 0.55) !important;
  }
  .al-root.al-root--gate .al-glassy-hero .al-gword-lead,
  .al-root.al-root--gate .al-glassy-hero .al-gword-inner {
    color: rgba(245, 245, 247, 0.55) !important;
  }
  .al-root.al-root--gate .al-hero-copy--status .al-glassy-hero,
  .al-root.al-root--gate .al-hero-copy--status .al-glassy-hero .al-gword-lead,
  .al-root.al-root--gate .al-hero-copy--status .al-glassy-hero .al-gword-inner {
    color: #F5F5F7 !important;
  }
  /* Account name — the only large visual focus */
  .al-root.al-root--gate .al-hero-secondary--focus,
  .al-root.al-root--gate .al-hero-secondary--focus .al-ws-name-line,
  .al-root.al-root--gate .al-hero-secondary--focus .al-ws-name-input,
  .al-root.al-root--gate .al-hero-secondary--focus .al-ws-path,
  .al-root.al-root--gate .al-hero-secondary--focus .al-ws-slash,
  .al-root.al-root--gate .al-hero-secondary--focus .auth-expand-compact,
  .al-root.al-root--gate .al-hero-secondary--focus .auth-expand-slash,
  .al-root.al-root--gate .al-hero-secondary--focus .auth-expand-idle-caret {
    font-size: var(--al-hero-name-size, 28px) !important;
    line-height: var(--al-hero-name-lh, 34px) !important;
    letter-spacing: -0.03em !important;
    font-weight: 400 !important;
    max-width: none !important;
    color: #F5F5F7 !important;
  }
  .al-root.al-root--gate .al-hero-secondary--focus {
    margin-top: 10px !important;
  }
  .al-root.al-root--gate .al-hero-secondary--focus .auth-expand-idle-caret,
  .al-root.al-root--gate .al-hero-secondary--focus .al-ws-name-line:not(.has-value):not(:focus-within)::after {
    height: var(--al-hero-caret-h, 24px) !important;
    min-height: var(--al-hero-caret-h, 24px) !important;
  }
  .al-root.al-root--gate .al-btn {
    height: var(--festag-btn-height, 36px) !important;
    min-height: var(--festag-btn-height, 36px) !important;
    max-height: var(--festag-btn-height, 36px) !important;
    font-size: 13px !important;
    border-radius: 6px !important;
  }
  .al-root.al-root--gate .al-input,
  .al-root.al-root--gate .al-input-shell,
  .al-root.al-root--gate .al-input-shell .al-input {
    height: var(--festag-input-height, 38px) !important;
    min-height: var(--festag-input-height, 38px) !important;
    max-height: var(--festag-input-height, 38px) !important;
    font-size: var(--festag-input-font-size, 14px) !important;
  }
  .al-root.al-root--gate .al-method-group,
  .al-root.al-root--gate .al-signin-stack {
    gap: 7px !important;
    max-width: none !important;
  }
  .al-root.al-root--gate .al-sso-group {
    margin-top: 2px;
  }
  .al-root.al-root--gate .al-divider {
    margin: 8px 0 !important;
    font-size: 11.5px !important;
  }
  .al-root.al-root--gate .al-account-hint {
    font-size: 12.5px !important;
    text-align: center;
    color: rgba(245, 245, 247, 0.38);
  }
  .al-root.al-root--gate .al-auth-switch {
    margin-top: 12px !important;
  }
  .al-root.al-root--gate .al-test-jumps {
    z-index: 5;
  }

  @media (min-width: 769px) {
    .al-root.al-root--gate,
    .al-root.al-root--gate[data-theme="dark"] {
      --al-gate-title-size: 17px;
      --al-gate-title-lh: 22px;
      --al-hero-display-size: 17px;
      --al-hero-display-lh: 22px;
      --al-hero-name-size: 28px;
      --al-hero-name-lh: 34px;
      --al-hero-caret-h: 24px;
      --festag-btn-height: 36px;
      --festag-input-height: 38px;
      --festag-email-input-height: 38px;
      --festag-input-font-size: 14px;
      --al-panel-width: 340px;
    }
    .al-root.al-root--gate .al-header,
    .al-root.al-root--gate .al-header--gate-chrome {
      padding: 22px 40px 10px !important;
    }
  }

  @media (max-width: 768px) {
    .al-dest-side { display: none; }
    .al-dest-main-col { padding: 0; }
    .al-dest-plate {
      border-radius: 0;
      border: 0;
      padding: 88px 28px 40px;
      box-shadow: none;
      background: #070708;
    }
    .al-dest-h1 { font-size: 36px; letter-spacing: -0.03em; }
    .al-dest-head-actions { display: none; }
    .al-dest-cards { gap: 12px; max-width: none; }
    .al-dest-card { padding: 18px 16px; border-radius: 16px; }
    .al-dest-onb-header { padding: 16px 20px; }
    .al-dest-onb-body {
      padding: 0 28px 160px;
      align-items: stretch;
      justify-content: flex-start;
      padding-top: 72px;
    }
    .al-dest-onb-h1 { font-size: 34px; }
    .al-dest-onb-bar {
      width: calc(100% - 28px);
      bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
    }
    .al-dest-scrim {
      background:
        linear-gradient(180deg, rgba(8, 9, 12, 0.28) 0%, rgba(8, 9, 12, 0.55) 42%, rgba(8, 9, 12, 0.82) 100%),
        rgba(8, 9, 12, 0.35);
      backdrop-filter: blur(3px) saturate(0.9);
      -webkit-backdrop-filter: blur(3px) saturate(0.9);
    }

    /* Mobile gate — centered OS popup (no bottom sheet / drag handle) */
    .al-root.al-root--gate,
    .al-root.al-root--gate[data-theme="dark"] {
      --al-gate-title-size: 16px;
      --al-gate-title-lh: 21px;
      --al-hero-display-size: 16px;
      --al-hero-display-lh: 21px;
      --al-hero-name-size: 26px;
      --al-hero-name-lh: 32px;
      --al-hero-caret-h: 22px;
      --festag-btn-height: 40px;
      --festag-input-height: 40px;
      --festag-email-input-height: 40px;
      --festag-input-font-size: 15px;
      --al-panel-width: 320px;
    }
    .al-root.al-root--gate .al-header,
    .al-root.al-root--gate .al-header--gate-chrome {
      position: fixed !important;
      top: 0;
      left: 0;
      right: 0;
      z-index: 4;
      width: 100%;
      max-width: none;
      padding:
        max(10px, calc(env(safe-area-inset-top, 0px) + 6px))
        16px
        8px !important;
      background: transparent !important;
    }
    .al-root.al-root--gate .al-container {
      min-height: 100dvh;
      padding: 0 !important;
    }
    .al-root.al-root--gate .al-main {
      align-items: center !important;
      justify-content: center !important;
      min-height: 100dvh !important;
      height: 100dvh !important;
      padding:
        max(64px, calc(env(safe-area-inset-top, 0px) + 52px))
        16px
        max(20px, calc(env(safe-area-inset-bottom, 0px) + 16px)) !important;
    }
    .al-root.al-root--gate .al-desktop-stage,
    .al-root.al-root--gate .al-desktop-stage--centered,
    .al-root.al-root--gate .al-desktop-left,
    .al-root.al-root--gate .al-mobile-sheet,
    .al-root.al-root--gate .al-sheet-body {
      width: 100% !important;
      max-width: none !important;
      height: auto !important;
      min-height: 0 !important;
      flex: 0 0 auto !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      margin: 0 !important;
      background: transparent !important;
      overflow: visible !important;
    }
    .al-root.al-root--gate .al-signin.al-gate-sheet {
      width: min(100%, 320px) !important;
      max-width: 320px !important;
      margin: 0 auto !important;
      border-radius: 14px !important;
      padding: 18px 18px 14px !important;
      max-height: min(78dvh, 580px);
      background: rgba(18, 20, 28, 0.96) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.04) inset,
        0 22px 64px rgba(0, 0, 0, 0.55),
        0 6px 18px rgba(0, 0, 0, 0.32) !important;
      backdrop-filter: blur(28px) saturate(1.2);
      -webkit-backdrop-filter: blur(28px) saturate(1.2);
      animation: alGatePanelIn 0.4s cubic-bezier(.22, 1, .36, 1) both !important;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }
    .al-root.al-root--gate.al-soft-mode .al-signin.al-gate-sheet:not(.al-signin--out),
    .al-root.al-root--gate.al-soft-enter .al-signin.al-gate-sheet:not(.al-signin--out) {
      animation: none !important;
      transform: none !important;
      opacity: 1 !important;
    }
    .al-root.al-root--gate .al-signin.al-gate-sheet .festag-popup-drag-area,
    .al-root.al-root--gate .al-signin.al-gate-sheet .festag-popup-drag-handle {
      display: none !important;
    }
    .al-root.al-root--gate .al-gate-brand {
      margin: 0 0 12px;
    }
    .al-root.al-root--gate .al-gate-brand-img {
      width: 26px;
      height: 26px;
    }
    .al-root.al-root--gate .al-signin-head {
      margin-bottom: 14px !important;
      padding-top: 0;
    }
    .al-root.al-root--gate .al-hero-copy .al-title.al-title-display,
    .al-root.al-root--gate .al-glassy-hero {
      font-size: var(--al-gate-title-size, 16px) !important;
      line-height: var(--al-gate-title-lh, 21px) !important;
    }
    .al-root.al-root--gate .al-hero-secondary--focus,
    .al-root.al-root--gate .al-hero-secondary--focus .al-ws-name-line,
    .al-root.al-root--gate .al-hero-secondary--focus .al-ws-name-input,
    .al-root.al-root--gate .al-hero-secondary--focus .al-ws-path,
    .al-root.al-root--gate .al-hero-secondary--focus .auth-expand-compact,
    .al-root.al-root--gate .al-hero-secondary--focus .auth-expand-slash {
      font-size: var(--al-hero-name-size, 26px) !important;
      line-height: var(--al-hero-name-lh, 32px) !important;
    }
    .al-root.al-root--gate .al-btn {
      height: var(--festag-btn-height, 40px) !important;
      min-height: var(--festag-btn-height, 40px) !important;
      max-height: var(--festag-btn-height, 40px) !important;
      font-size: 14px !important;
    }
    .al-root.al-root--gate .al-input,
    .al-root.al-root--gate .al-input-shell,
    .al-root.al-root--gate .al-input-shell .al-input {
      height: var(--festag-input-height, 40px) !important;
      min-height: var(--festag-input-height, 40px) !important;
      max-height: var(--festag-input-height, 40px) !important;
      font-size: var(--festag-input-font-size, 15px) !important;
    }
    .al-root.al-root--gate .al-method-group,
    .al-root.al-root--gate .al-signin-stack {
      gap: 8px !important;
    }
    .al-root.al-root--gate .al-divider {
      margin: 8px 0 !important;
    }
    /* Strip microcopy — keep only the dialog actions */
    .al-root.al-root--gate .al-hint,
    .al-root.al-root--gate .al-login-aux,
    .al-root.al-root--gate .al-code-help,
    .al-root.al-root--gate .al-flow-info,
    .al-root.al-root--gate .auth-help,
    .al-root.al-root--gate details {
      display: none !important;
    }
    .al-root.al-root--gate .al-auth-switch {
      margin-top: 12px !important;
      text-align: center;
    }
    .al-root.al-root--gate .al-account-hint {
      font-size: 13px !important;
      text-align: center;
    }
    .al-root.al-root--gate .al-test-jumps {
      bottom: max(12px, env(safe-area-inset-bottom, 0px));
      left: 14px;
      z-index: 6;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .al-dest-onb-caret { animation: none; opacity: 1; }
    .al-root.al-root--gate .al-signin {
      animation: none !important;
    }
  }

  /*
   * Gate Light — serious, calm, subscribe-ready.
   * Soft Apple-gray atmosphere + white OS dialog. Dark only as opt-in elsewhere.
   */
  .al-root.al-root--gate[data-theme="light"],
  .al-root.al-root--gate:not([data-theme="dark"]):not([data-theme="classic-dark"]):not([data-theme="read"]) {
    --al-bg: #F5F5F7;
    --al-text: #1d1d1f;
    --al-text-muted: #6e6e73;
    --al-text-muted-soft: #8e8e93;
    --festag-btn-ready-bg: #ffffff;
    --festag-btn-ready-bg-hover: #fafafa;
    --festag-btn-ready-bg-active: #f5f5f6;
    --festag-btn-ready-fg: #1e1e20;
    --festag-btn-dark-ready-bg: #ffffff;
    --festag-btn-dark-ready-bg-hover: #fafafa;
    --festag-btn-dark-ready-bg-active: #f5f5f6;
    --festag-btn-dark-bg: #ffffff;
    --festag-btn-dark-bg-hover: #fafafa;
    --festag-btn-dark-bg-active: #f5f5f6;
    --festag-btn-dark-fg: #1e1e20;
    --festag-btn-dark-border: rgba(30, 30, 32, 0.08);
    --festag-btn-dark-border-hover: rgba(30, 30, 32, 0.08);
    --festag-btn-dark-border-active: rgba(30, 30, 32, 0.08);
    --festag-btn-dark-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    --festag-btn-dark-shadow-hover: 0 1px 2px rgba(0, 0, 0, 0.04);
    --festag-btn-dark-shadow-active: none;
    --festag-input-border: rgba(30, 30, 32, 0.14);
    --festag-input-border-hover: rgba(30, 30, 32, 0.2);
    --festag-input-border-width: 1px;
    --festag-input-border-focus: #5B647D;
    --festag-input-border-width-focus: 1.5px;
    background: #F5F5F7 !important;
    color: #1d1d1f;
  }
  html:has(.al-root.al-root--gate[data-theme="light"]),
  html:has(.al-root.al-root--gate[data-theme="light"]) body {
    background: #F5F5F7 !important;
  }

  .al-root.al-root--gate[data-theme="light"] .al-dest-scrim {
    background:
      radial-gradient(ellipse 85% 55% at 50% 38%, rgba(245, 245, 247, 0.2), rgba(245, 245, 247, 0.72) 68%),
      rgba(245, 245, 247, 0.55);
    backdrop-filter: blur(3px) saturate(0.95);
    -webkit-backdrop-filter: blur(3px) saturate(0.95);
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-dash {
    background: #F5F5F7;
    color: rgba(29, 29, 31, 0.88);
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-side {
    background: #EEEEF0;
    border-right-color: rgba(15, 23, 42, 0.06);
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-mark,
  .al-root.al-root--gate[data-theme="light"] .al-dest-side-ws,
  .al-root.al-root--gate[data-theme="light"] .al-dest-nav-item,
  .al-root.al-root--gate[data-theme="light"] .al-dest-line,
  .al-root.al-root--gate[data-theme="light"] .al-dest-pill,
  .al-root.al-root--gate[data-theme="light"] .al-dest-ghost-pill,
  .al-root.al-root--gate[data-theme="light"] .al-dest-onb-input,
  .al-root.al-root--gate[data-theme="light"] .al-dest-onb-dots i {
    background: rgba(15, 23, 42, 0.08);
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-nav-item.is-active {
    background: rgba(91, 100, 125, 0.18);
    box-shadow: inset 0 0 0 1px rgba(91, 100, 125, 0.22);
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-plate {
    background: #FFFFFF;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 36px rgba(15, 23, 42, 0.06);
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-h1,
  .al-root.al-root--gate[data-theme="light"] .al-dest-onb-h1 {
    color: #1d1d1f;
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-card {
    background: #F8F8FA;
    border-color: rgba(15, 23, 42, 0.05);
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-onb {
    background: #F5F5F7;
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-onb-sub,
  .al-root.al-root--gate[data-theme="light"] .al-dest-onb-label,
  .al-root.al-root--gate[data-theme="light"] .al-dest-onb-count {
    color: rgba(29, 29, 31, 0.45);
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-onb-bar {
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-onb-cta {
    background: #5B647D;
    color: #F5F5F7;
  }
  .al-root.al-root--gate[data-theme="light"] .al-dest-onb-dots i.is-active {
    background: rgba(29, 29, 31, 0.7);
  }

  .al-root.al-root--gate[data-theme="light"] .al-signin {
    background: #FFFFFF !important;
    border: 1px solid rgba(15, 23, 42, 0.07) !important;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.9) inset,
      0 18px 48px rgba(15, 23, 42, 0.1),
      0 4px 14px rgba(15, 23, 42, 0.05) !important;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .al-root.al-root--gate[data-theme="light"] .al-gate-brand-img {
    opacity: 0.92;
    filter: none;
  }
  .al-root.al-root--gate[data-theme="light"] .al-hero-copy .al-title.al-title-display,
  .al-root.al-root--gate[data-theme="light"] .al-glassy-hero,
  .al-root.al-root--gate[data-theme="light"] .al-glassy-hero .al-gword-lead,
  .al-root.al-root--gate[data-theme="light"] .al-glassy-hero .al-gword-inner {
    color: rgba(29, 29, 31, 0.48) !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-hero-copy--status .al-glassy-hero,
  .al-root.al-root--gate[data-theme="light"] .al-hero-copy--status .al-glassy-hero .al-gword-lead,
  .al-root.al-root--gate[data-theme="light"] .al-hero-copy--status .al-glassy-hero .al-gword-inner {
    color: #1d1d1f !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-hero-secondary--focus,
  .al-root.al-root--gate[data-theme="light"] .al-hero-secondary--focus .al-ws-name-line,
  .al-root.al-root--gate[data-theme="light"] .al-hero-secondary--focus .al-ws-name-input,
  .al-root.al-root--gate[data-theme="light"] .al-hero-secondary--focus .al-ws-path,
  .al-root.al-root--gate[data-theme="light"] .al-hero-secondary--focus .al-ws-slash,
  .al-root.al-root--gate[data-theme="light"] .al-hero-secondary--focus .auth-expand-compact,
  .al-root.al-root--gate[data-theme="light"] .al-hero-secondary--focus .auth-expand-slash,
  .al-root.al-root--gate[data-theme="light"] .al-hero-secondary--focus .auth-expand-idle-caret {
    color: #1d1d1f !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-primary,
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-ghost,
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-google,
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-apple {
    background: #ffffff !important;
    color: #1e1e20 !important;
    border: 1px solid rgba(30, 30, 32, 0.08) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-primary:hover:not(:disabled),
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-ghost:hover:not(:disabled),
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-google:hover:not(:disabled),
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-apple:hover:not(:disabled) {
    background: #fafafa !important;
    border-color: rgba(30, 30, 32, 0.08) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  }
  /* Ready Weiter — light fill + enter glyph; serious without black pills */
  .al-root.al-root--gate[data-theme="light"] .al-btn-primary--ready,
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-primary.al-btn-primary--ready {
    background: #ffffff !important;
    color: #1e1e20 !important;
    border: 1px solid rgba(30, 30, 32, 0.12) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-btn-primary--ready:hover:not(:disabled),
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-primary.al-btn-primary--ready:hover:not(:disabled) {
    background: #fafafa !important;
    color: #1e1e20 !important;
    border-color: rgba(30, 30, 32, 0.12) !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-btn-primary--ready:active:not(:disabled),
  .al-root.al-root--gate[data-theme="light"] .al-btn.al-btn-primary.al-btn-primary--ready:active:not(:disabled) {
    background: #f5f5f6 !important;
    box-shadow: none !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-btn-primary--ready .al-enter-glyph.is-ready {
    opacity: 0.88;
    color: var(--festag-caret, #66708D) !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-input,
  .al-root.al-root--gate[data-theme="light"] .al-input-shell .al-input {
    background: transparent !important;
    color: #1d1d1f !important;
    border: 1px solid rgba(30, 30, 32, 0.14) !important;
    box-shadow: none !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-input:hover,
  .al-root.al-root--gate[data-theme="light"] .al-input:not(:placeholder-shown) {
    border-color: rgba(30, 30, 32, 0.2) !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-input:focus,
  .al-root.al-root--gate[data-theme="light"] .al-input:focus-visible {
    border-width: var(--festag-input-border-width-focus, 1.5px) !important;
    border-color: var(--festag-input-border-focus, #66708D) !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-input-fake-ph,
  .al-root.al-root--gate[data-theme="light"] .al-input::placeholder {
    color: #8e8e93 !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-divider {
    color: #8e8e93;
  }
  .al-root.al-root--gate[data-theme="light"] .al-divider::before,
  .al-root.al-root--gate[data-theme="light"] .al-divider::after {
    background: rgba(30, 30, 32, 0.1) !important;
  }
  .al-root.al-root--gate[data-theme="light"] .al-account-hint {
    color: rgba(29, 29, 31, 0.42);
  }
  .al-root.al-root--gate[data-theme="light"] .al-account-hint-link {
    color: rgba(29, 29, 31, 0.72);
  }
  .al-root.al-root--gate[data-theme="light"] .al-account-hint-link:hover,
  .al-root.al-root--gate[data-theme="light"] .al-account-hint-link:focus-visible {
    color: #1d1d1f;
  }
  .al-root.al-root--gate[data-theme="light"] .al-error {
    color: #b42318;
  }
  .al-root.al-root--gate[data-theme="light"] .al-back {
    color: rgba(29, 29, 31, 0.55);
  }

  /* Soften dark gate slightly when still used (opt-in / legacy) */
  .al-root.al-root--gate[data-theme="dark"] .al-signin {
    background: rgba(28, 30, 38, 0.96) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }
  .al-root.al-root--gate[data-theme="dark"] .al-dest-scrim {
    background:
      radial-gradient(ellipse 80% 60% at 50% 40%, rgba(28, 30, 38, 0.25), rgba(28, 30, 38, 0.62) 70%),
      rgba(20, 22, 28, 0.48);
  }
`
