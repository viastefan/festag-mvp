'use client'

/**
 * Discreet Enter affordance inside primary auth CTAs (Weiter, Bestätigen).
 * SVG (not ↵ text) so Aeonik / custom fonts never drop the glyph.
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
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12.5 3.5v5.25a1.75 1.75 0 0 1-1.75 1.75H4.56l1.72 1.72a.75.75 0 1 1-1.06 1.06l-3-3a.75.75 0 0 1 0-1.06l3-3a.75.75 0 0 1 1.06 1.06L4.56 8.75h6.19c.14 0 .25-.11.25-.25V3.5a.75.75 0 0 1 1.5 0Z"
          fill="currentColor"
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
    width: 16px;
    height: 16px;
    color: #5B647D !important;
    opacity: 0;
    transform: translateY(0.5px);
    transition: opacity 0.28s cubic-bezier(.22,1,.36,1), transform 0.28s cubic-bezier(.22,1,.36,1);
    pointer-events: none;
    user-select: none;
  }
  .al-enter-glyph-svg {
    display: block;
    width: 15px;
    height: 15px;
  }
  .al-btn.al-btn-primary--ready .al-enter-glyph.is-ready,
  .al-enter-glyph.is-ready {
    opacity: 0.78 !important;
    transform: none;
  }
  .al-btn:disabled .al-enter-glyph,
  .al-btn:disabled .al-enter-glyph.is-ready {
    opacity: 0 !important;
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
      width: 15px;
      height: 15px;
    }
    .al-enter-glyph-svg {
      width: 14px;
      height: 14px;
    }
    .al-btn.al-btn-primary--ready .al-enter-glyph.is-ready,
    .al-enter-glyph.is-ready {
      opacity: 0.72 !important;
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
