'use client'

import { useEffect, useState } from 'react'

/**
 * Festag PWA install prompt — calm system suggestion, not a marketing
 * banner.
 *
 * Behaviour:
 * - Hidden if running as an installed PWA (display-mode: standalone).
 * - Hidden during the onboarding tour (festag:onboarding-active event +
 *   data-onboarding-active attribute on <html>).
 * - Delayed 8 s after the user first lands so it doesn't pop the moment
 *   the page renders.
 * - "Später" / close stores a dismiss stamp; the prompt stays away for
 *   7 days. Install acceptance is permanent.
 * - Chromium uses the native install prompt; iOS Safari sees an
 *   "Anleitung ansehen" link that reveals the home-screen instructions
 *   inline.
 *
 * Visuals: compact glass card (≤ 460 px desktop, full-width bottom
 * sheet ≤ 520 px), Slate primary, no black buttons, dark-mode-aware.
 */

const INSTALL_STATE_KEY = 'festag_pwa_install_state'
const DISMISS_STAMP_KEY = 'festag_pwa_install_dismissed_at'
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000   // 7 days
const FIRST_SHOW_DELAY_MS = 8000                    // 8 s after mount

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosTip, setIosTip] = useState(false)
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [onboardingBlocked, setOnboardingBlocked] = useState(false)
  const [iosFallback, setIosFallback] = useState(false)

  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    let unblockTimer: ReturnType<typeof setTimeout> | null = null

    // Already installed?
    if (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) return
    if (typeof navigator !== 'undefined' && (navigator as any).standalone) return

    try {
      if (localStorage.getItem(INSTALL_STATE_KEY) === 'installed') return
      // Dismiss window — respect the user's "Später".
      const stamp = Number(localStorage.getItem(DISMISS_STAMP_KEY) || '0')
      if (stamp && Date.now() - stamp < DISMISS_WINDOW_MS) return
    } catch {}

    function blockForOnboarding(active: boolean) {
      if (unblockTimer) clearTimeout(unblockTimer)
      if (active) {
        setOnboardingBlocked(true)
        setVisible(false)
        return
      }
      // After the tour ends, give it a 3 s breathing room before we
      // can pop the prompt.
      unblockTimer = setTimeout(() => setOnboardingBlocked(false), 3000)
    }

    if (document.documentElement.hasAttribute('data-onboarding-active')) {
      blockForOnboarding(true)
    }

    function onOnboardingActive(e: Event) {
      const active = Boolean((e as CustomEvent<{ active?: boolean }>).detail?.active)
      blockForOnboarding(active)
    }
    function onOnboardingEnded() { blockForOnboarding(false) }
    window.addEventListener('festag:onboarding-active', onOnboardingActive)
    window.addEventListener('festag:onboarding-ended', onOnboardingEnded)

    function showWhenAllowed() {
      if (document.documentElement.hasAttribute('data-onboarding-active')) return
      setVisible(true)
    }

    // Chromium / Edge / Android Chrome.
    function onBeforePrompt(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      // Delay so the prompt feels like a calm system suggestion.
      fallbackTimer = setTimeout(showWhenAllowed, FIRST_SHOW_DELAY_MS)
    }
    window.addEventListener('beforeinstallprompt', onBeforePrompt)

    // iOS Safari — beforeinstallprompt never fires. Detect and show the
    // calm instructional variant.
    const ua = navigator.userAgent || ''
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua)
    if (isIos && isSafari) {
      setIosFallback(true)
      fallbackTimer = setTimeout(showWhenAllowed, FIRST_SHOW_DELAY_MS)
    } else if (!isIos) {
      // Desktop Safari / in-app browsers that never emit the event —
      // also show after the delay so the prompt isn't lost forever.
      fallbackTimer = setTimeout(() => {
        // If no beforeinstallprompt fired by now, we'll act as fallback.
        showWhenAllowed()
      }, FIRST_SHOW_DELAY_MS + 4000)
    }

    function onInstalled() {
      try { localStorage.setItem(INSTALL_STATE_KEY, 'installed') } catch {}
      setVisible(false)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforePrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('festag:onboarding-active', onOnboardingActive)
      window.removeEventListener('festag:onboarding-ended', onOnboardingEnded)
      if (fallbackTimer) clearTimeout(fallbackTimer)
      if (unblockTimer) clearTimeout(unblockTimer)
    }
  }, [])

  async function install() {
    if (deferred) {
      setInstalling(true)
      try {
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        if (outcome === 'accepted') {
          try { localStorage.setItem(INSTALL_STATE_KEY, 'installed') } catch {}
          setVisible(false)
        }
      } finally {
        setInstalling(false)
      }
    } else {
      setIosTip(v => !v)
    }
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_STAMP_KEY, String(Date.now())) } catch {}
    setVisible(false)
  }

  if (!visible || onboardingBlocked) return null

  // Decide if there's a real install action available.
  const hasInstallAction = Boolean(deferred)
  const showHelpLink = iosFallback || !hasInstallAction

  return (
    <>
      <style>{`
        .pwa-banner {
          position: fixed;
          right: 24px; bottom: 24px;
          z-index: 200;
          width: min(460px, calc(100vw - 28px));
          padding: 14px 14px 14px 14px;
          display: grid;
          grid-template-columns: 56px minmax(0, 1fr) 22px;
          gap: 12px;
          align-items: start;
          border-radius: 24px;
          background: rgba(255, 255, 255, .86);
          border: 1px solid rgba(20, 24, 32, .06);
          box-shadow:
            0 14px 36px -22px rgba(15, 23, 42, .26),
            0 4px 12px -6px rgba(15, 23, 42, .08);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          animation: pwaIn .22s cubic-bezier(.16, 1, .3, 1) both;
        }
        @keyframes pwaIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

        [data-theme="dark"] .pwa-banner,
        [data-theme="classic-dark"] .pwa-banner {
          background: color-mix(in srgb, var(--card) 88%, rgba(255,255,255,.04) 12%);
          border-color: color-mix(in srgb, var(--border) 60%, transparent);
          box-shadow:
            0 18px 44px -22px rgba(0, 0, 0, .55),
            0 4px 12px -6px rgba(0, 0, 0, .35);
        }

        .pwa-logo {
          width: 56px; height: 56px;
          border-radius: 14px;
          display: grid; place-items: center;
          background: transparent;
          line-height: 0;
          flex-shrink: 0;
        }
        .pwa-logo img {
          width: 100%; height: 100%;
          object-fit: contain;
          display: block;
          user-select: none; pointer-events: none;
          filter: drop-shadow(0 6px 14px rgba(15, 23, 42, .12));
        }
        [data-theme="dark"] .pwa-logo img,
        [data-theme="classic-dark"] .pwa-logo img {
          filter: drop-shadow(0 6px 14px rgba(0, 0, 0, .35));
        }

        .pwa-body { min-width: 0; padding-top: 2px; }
        .pwa-title {
          font-size: 14px; font-weight: 500; letter-spacing: -.005em;
          color: var(--text, #0F141B);
          margin: 0 0 3px;
        }
        .pwa-sub {
          font-size: 12.5px; line-height: 1.45;
          font-weight: 500; letter-spacing: .012em;
          color: var(--text-muted, #5A6478);
          margin: 0;
        }
        [data-theme="dark"] .pwa-title,
        [data-theme="classic-dark"] .pwa-title { color: var(--text); }
        [data-theme="dark"] .pwa-sub,
        [data-theme="classic-dark"] .pwa-sub { color: var(--text-muted); }

        .pwa-actions {
          margin-top: 10px;
          display: flex; align-items: center; gap: 6px;
          flex-wrap: wrap;
        }
        .pwa-install, .pwa-later {
          height: 30px;
          font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .012em;
          padding: 0 13px;
          /* Festag rule: same radius as the outer card family — 12-14 here. */
          border-radius: 999px;
          border: 0;
          cursor: pointer;
          transition: background .14s ease, opacity .14s ease, transform .12s ease;
        }
        .pwa-install {
          background: var(--btn-prim, #5B647D);
          color: var(--btn-prim-text, #FFFFFF);
        }
        .pwa-install:hover:not(:disabled) { opacity: .92; }
        .pwa-install:active:not(:disabled) { transform: scale(.97); }
        .pwa-install:disabled { opacity: .55; cursor: not-allowed; }

        .pwa-later {
          background: transparent;
          color: var(--text-secondary, #5A6478);
          border: 1px solid rgba(20, 24, 32, .10);
        }
        [data-theme="dark"] .pwa-later,
        [data-theme="classic-dark"] .pwa-later {
          color: var(--text-secondary);
          border-color: color-mix(in srgb, var(--border) 70%, transparent);
        }
        .pwa-later:hover { background: rgba(20, 24, 32, .04); color: var(--text, #0F141B); }
        [data-theme="dark"] .pwa-later:hover,
        [data-theme="classic-dark"] .pwa-later:hover {
          background: color-mix(in srgb, var(--surface-2) 55%, transparent);
          color: var(--text);
        }

        .pwa-help {
          background: transparent;
          border: 0;
          color: var(--text-muted, #5A6478);
          font: inherit; font-size: 11.5px; font-weight: 500; letter-spacing: .012em;
          padding: 0 4px; height: 30px;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
          text-decoration-color: color-mix(in srgb, var(--text-muted, #5A6478) 40%, transparent);
        }
        .pwa-help:hover { color: var(--text, #0F141B); }
        [data-theme="dark"] .pwa-help:hover,
        [data-theme="classic-dark"] .pwa-help:hover { color: var(--text); }

        .pwa-close {
          flex-shrink: 0;
          width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          border: 0; background: transparent;
          color: var(--text-muted, #5A6478);
          opacity: .55; padding: 0;
          border-radius: 999px;
          cursor: pointer;
          transition: opacity .14s ease, background .14s ease;
        }
        .pwa-close:hover {
          opacity: 1;
          background: rgba(20, 24, 32, .06);
        }
        [data-theme="dark"] .pwa-close:hover,
        [data-theme="classic-dark"] .pwa-close:hover {
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
        }

        .pwa-tip {
          grid-column: 1 / -1;
          margin-top: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--text-muted, #5A6478) 8%, transparent);
          font-size: 11.5px; font-weight: 500; letter-spacing: .012em;
          line-height: 1.5;
          color: var(--text, #0F141B);
        }
        [data-theme="dark"] .pwa-tip,
        [data-theme="classic-dark"] .pwa-tip {
          background: color-mix(in srgb, var(--surface-2) 55%, transparent);
          color: var(--text);
        }
        .pwa-tip strong { font-weight: 500; }

        /* Mobile — bottom sheet style, full width with safe area */
        @media (max-width: 640px) {
          .pwa-banner {
            right: 12px; left: 12px;
            bottom: calc(env(safe-area-inset-bottom, 0px) + 84px);  /* clear bottom nav */
            width: auto;
            grid-template-columns: 48px minmax(0, 1fr) 22px;
            border-radius: 22px;
            padding: 12px;
            gap: 11px;
          }
          .pwa-logo { width: 48px; height: 48px; border-radius: 12px; }
          .pwa-title { font-size: 13.5px; }
          .pwa-sub { font-size: 12px; }
          .pwa-actions { margin-top: 9px; }
          .pwa-install, .pwa-later { flex: 1; justify-content: center; display: inline-flex; align-items: center; }
        }
      `}</style>

      <div className="pwa-banner" role="dialog" aria-label="Festag installieren">
        <span className="pwa-logo" aria-hidden="true">
          <img src="/brand/app-icon.png?v=20260722-split-mark" alt="" />
        </span>
        <div className="pwa-body">
          <p className="pwa-title">Festag immer griffbereit</p>
          <p className="pwa-sub">
            Status, Briefings und Entscheidungen direkt aus deinem Workspace — ohne Browser-Leiste.
          </p>
          <div className="pwa-actions">
            {hasInstallAction && (
              <button type="button" className="pwa-install" onClick={install} disabled={installing}>
                {installing ? 'Installiert…' : 'Installieren'}
              </button>
            )}
            <button type="button" className="pwa-later" onClick={dismiss}>Später</button>
            {showHelpLink && (
              <button type="button" className="pwa-help" onClick={() => setIosTip(v => !v)}>
                {iosTip ? 'Anleitung schließen' : 'Anleitung ansehen'}
              </button>
            )}
          </div>
          {iosTip && (
            <div className="pwa-tip">
              In Safari: tippe auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil) und dann auf <strong>„Zum Home-Bildschirm"</strong>.
            </div>
          )}
        </div>
        <button type="button" className="pwa-close" onClick={dismiss} aria-label="Schließen">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </>
  )
}
