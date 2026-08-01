'use client'

/**
 * Discreet Enter affordance inside primary auth CTAs (Weiter, Bestätigen).
 * Visual only — keyboard submit stays in useAuthEnterSubmit.
 */
export default function AuthEnterGlyph({ ready = true }: { ready?: boolean }) {
  return (
    <span
      className={`al-enter-glyph${ready ? ' is-ready' : ''}`}
      aria-hidden="true"
    >
      ↵
    </span>
  )
}

export const AUTH_ENTER_GLYPH_CSS = `
  .al-btn.al-btn--enter-glyph {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .al-btn.al-btn--enter-glyph.al-btn-primary--ready:not(:disabled) {
    justify-content: space-between;
    padding-left: 14px;
    padding-right: 14px;
  }
  .al-enter-glyph {
    flex-shrink: 0;
    font-size: 15px;
    line-height: 1;
    font-weight: 400;
    letter-spacing: 0;
    color: inherit;
    opacity: 0;
    transform: translateY(1px);
    transition: opacity 0.28s cubic-bezier(.22,1,.36,1), transform 0.28s cubic-bezier(.22,1,.36,1);
    pointer-events: none;
    user-select: none;
  }
  .al-enter-glyph.is-ready {
    opacity: 0.55;
    transform: none;
  }
  .al-btn:disabled .al-enter-glyph {
    opacity: 0 !important;
  }
  /* Full-page light auth — keep column calm and vertically centered */
  .al-root.al-root--centered[data-theme="light"][data-auth-mode="login"] .al-main,
  .al-root.al-root--centered[data-theme="light"][data-auth-mode="signup"] .al-main {
    justify-content: center !important;
    align-items: center !important;
  }
  @media (max-width: 768px) {
    .al-btn.al-btn--enter-glyph.al-btn-primary--ready:not(:disabled) {
      justify-content: center;
      gap: 8px;
    }
    .al-enter-glyph {
      font-size: 14px;
    }
    .al-enter-glyph.is-ready {
      opacity: 0.48;
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
