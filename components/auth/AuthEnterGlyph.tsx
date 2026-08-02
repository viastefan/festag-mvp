'use client'

/**
 * Discreet Enter affordance inside primary auth CTAs (Weiter, Bestätigen).
 * Hairline stroke (not filled) — always readable on light and dark CTAs.
 * Layout: label left, icon right.
 */
export default function AuthEnterGlyph({ ready = true }: { ready?: boolean }) {
  return (
    <span
      className={`al-enter-glyph${ready ? ' is-ready' : ''}`}
      aria-hidden="true"
    >
      <svg
        className="al-enter-glyph-svg"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3.5 9.75h6.25A2.75 2.75 0 0 0 12.5 7V3.5"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.75 7.25 3.5 9.75l2.25 2.5"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export const AUTH_ENTER_GLYPH_CSS = `
  .al-btn.al-btn--enter-glyph {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    padding-left: 14px !important;
    padding-right: 14px !important;
    width: 100%;
  }
  .al-btn.al-btn--enter-glyph .al-btn-label {
    flex: 1 1 auto;
    min-width: 0;
    text-align: left !important;
  }
  .al-enter-glyph {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto !important;
    margin-left: auto;
    width: 15px;
    height: 15px;
    /* Primary cursor slate — always visible on white / bone CTAs */
    color: var(--festag-caret, #5B647D) !important;
    opacity: 0.62;
    transform: none;
    transition: opacity 0.22s cubic-bezier(.22,1,.36,1);
    pointer-events: none;
    user-select: none;
  }
  .al-enter-glyph-svg {
    display: block;
    width: 14px;
    height: 14px;
    overflow: visible;
  }
  .al-btn.al-btn-primary--ready .al-enter-glyph.is-ready,
  .al-enter-glyph.is-ready {
    opacity: 0.92 !important;
  }
  /* Stay visible while loading — only slightly quieter */
  .al-btn:disabled .al-enter-glyph,
  .al-btn:disabled .al-enter-glyph.is-ready {
    opacity: 0.48 !important;
  }
  .al-root[data-theme="dark"] .al-enter-glyph,
  .al-root.onb-sand-dark .al-enter-glyph,
  .dl-root[data-theme="dark"] .al-enter-glyph {
    color: rgba(230, 232, 238, 0.78) !important;
  }
  .al-root[data-theme="dark"] .al-btn-primary--ready .al-enter-glyph,
  .al-root.onb-sand-dark .al-btn-primary--ready .al-enter-glyph,
  .dl-root[data-theme="dark"] .al-btn-primary--ready .al-enter-glyph {
    /* Bone / ready plate — soft dark ink, not washed slate */
    color: rgba(26, 25, 23, 0.55) !important;
  }
  /* Full-page light auth — keep column calm and vertically centered */
  .al-root.al-root--centered[data-theme="light"][data-auth-mode="login"] .al-main,
  .al-root.al-root--centered[data-theme="light"][data-auth-mode="signup"] .al-main {
    justify-content: center !important;
    align-items: center !important;
  }
  @media (max-width: 768px) {
    .al-btn.al-btn--enter-glyph {
      justify-content: space-between !important;
      padding-left: 14px !important;
      padding-right: 14px !important;
    }
    .al-enter-glyph {
      width: 14px;
      height: 14px;
    }
    .al-enter-glyph-svg {
      width: 13px;
      height: 13px;
    }
    .al-btn.al-btn-primary--ready .al-enter-glyph.is-ready,
    .al-enter-glyph.is-ready {
      opacity: 0.9 !important;
    }
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="login"] .al-main,
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="signup"] .al-main {
      justify-content: center !important;
      padding-top: 0 !important;
      padding-bottom: max(20px, env(safe-area-inset-bottom, 0px)) !important;
    }
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="login"] .al-desktop-stage,
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="login"] .al-desktop-left,
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="login"] .al-mobile-sheet,
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="login"] .al-sheet-body,
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="signup"] .al-desktop-stage,
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="signup"] .al-desktop-left,
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="signup"] .al-mobile-sheet,
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="signup"] .al-sheet-body {
      justify-content: center !important;
      align-items: stretch !important;
    }
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="login"] .al-signin,
    .al-root.al-root--centered[data-theme="light"][data-auth-mode="signup"] .al-signin {
      flex: 0 0 auto !important;
      height: auto !important;
    }
  }
`
