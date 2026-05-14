'use client'

import { useEffect, useState } from 'react'

/**
 * Bottom-right "Festag als Webapp installieren" banner.
 *
 * Behavior:
 * - Hidden if the app is already running as an installed PWA
 *   (display-mode: standalone).
 * - Hidden if the user dismissed it before (localStorage flag).
 * - Hidden if the browser doesn't support installation (no
 *   beforeinstallprompt event AND not on iOS Safari).
 * - Otherwise: shows a small card with a "Installieren" button
 *   that triggers the browser's native prompt. On iOS Safari,
 *   the button toggles an instruction popover instead.
 */

const DISMISS_KEY = 'festag_pwa_install_dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosTip, setIosTip] = useState(false)
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Already installed?
    if (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) {
      return
    }
    // Or running as PWA via Apple shorthand?
    if (typeof navigator !== 'undefined' && (navigator as any).standalone) {
      return
    }
    // Dismissed previously?
    try {
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch {}

    // Chromium / Edge / Android Chrome fire this when the app is installable.
    function onBeforePrompt(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforePrompt)

    // Fallback: iOS Safari never fires beforeinstallprompt. Detect and
    // show an instructional banner instead.
    const ua = navigator.userAgent || ''
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua)
    if (isIos && isSafari) {
      setVisible(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforePrompt)
  }, [])

  async function install() {
    if (deferred) {
      setInstalling(true)
      try {
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        if (outcome === 'accepted') {
          try { localStorage.setItem(DISMISS_KEY, 'installed') } catch {}
          setVisible(false)
        }
      } finally {
        setInstalling(false)
      }
    } else {
      // iOS Safari: show instructions
      setIosTip(v => !v)
    }
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        .pwa-banner {
          position:fixed; right:24px; bottom:24px; z-index:200;
          max-width:340px;
          background: var(--legal-bg, color-mix(in srgb, var(--bg, #0F141B) 96%, transparent));
          color: var(--legal-text, var(--text, #E8E8E5));
          border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
          border-radius:14px;
          padding:14px 16px 14px 14px;
          display:flex; gap:12px; align-items:flex-start;
          box-shadow:0 18px 40px -16px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.16);
          font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: pwaIn .22s ease both;
        }
        @keyframes pwaIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .pwa-icon {
          width:36px; height:36px; border-radius:9px;
          flex-shrink:0;
          background: color-mix(in srgb, currentColor 10%, transparent);
          display:flex; align-items:center; justify-content:center;
          font-family:'Qurova DEMO', serif; font-size:16px; font-weight:500;
          letter-spacing:-0.4px;
        }
        .pwa-body { flex:1; min-width:0; }
        .pwa-title { font-size:13.5px; font-weight:500; letter-spacing:0.01em; margin-bottom:2px; }
        .pwa-sub { font-size:12px; font-weight:400; letter-spacing:0.01em; opacity:.6; line-height:1.45; }
        .pwa-actions { margin-top:10px; display:flex; gap:6px; align-items:center; }
        .pwa-install {
          font-family:inherit; font-size:12px; font-weight:500; letter-spacing:0.01em;
          padding:7px 14px; border-radius:999px; border:none; cursor:pointer;
          background: currentColor; color: var(--legal-bg, #0F141B);
          transition: opacity .15s, transform .25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .pwa-install:active:not(:disabled) { transform: scale(0.97); transition: transform .08s ease; }
        .pwa-install:hover:not(:disabled) { opacity: .88; }
        .pwa-install:disabled { opacity:.55; cursor:not-allowed; }
        .pwa-later {
          font-family:inherit; font-size:12px; font-weight:500; letter-spacing:0.01em;
          padding:7px 10px; border-radius:999px; border:none; cursor:pointer;
          background: transparent; color: inherit; opacity:.5;
          transition: opacity .15s;
        }
        .pwa-later:hover { opacity: .9; }
        .pwa-close {
          flex-shrink:0;
          width:22px; height:22px;
          display:flex; align-items:center; justify-content:center;
          border:none; background:transparent; cursor:pointer;
          color:inherit; opacity:.4; padding:0;
          border-radius:6px;
          transition: opacity .15s, background .15s;
        }
        .pwa-close:hover { opacity:.9; background: color-mix(in srgb, currentColor 8%, transparent); }
        .pwa-tip {
          margin-top:10px; padding:10px 12px;
          border-radius:8px;
          background: color-mix(in srgb, currentColor 6%, transparent);
          font-size:11.5px; font-weight:400; letter-spacing:0.01em; line-height:1.55;
          color: inherit; opacity:.85;
        }
        .pwa-tip strong { font-weight:500; opacity:1; }
      `}</style>
      <div className="pwa-banner" role="dialog" aria-label="Festag installieren">
        <div className="pwa-icon" aria-hidden="true">f</div>
        <div className="pwa-body">
          <div className="pwa-title">Festag als App installieren</div>
          <div className="pwa-sub">
            Schneller Zugriff, ohne Browser-Leiste. Für macOS, Windows, iOS und Android.
          </div>
          <div className="pwa-actions">
            <button type="button" className="pwa-install" onClick={install} disabled={installing}>
              {installing ? 'Wird installiert…' : deferred ? 'Installieren' : 'Anleitung zeigen'}
            </button>
            <button type="button" className="pwa-later" onClick={dismiss}>Später</button>
          </div>
          {iosTip && (
            <div className="pwa-tip">
              In Safari: Tippe auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil) und dann
              auf <strong>"Zum Home-Bildschirm"</strong>.
            </div>
          )}
        </div>
        <button type="button" className="pwa-close" onClick={dismiss} aria-label="Schließen">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </>
  )
}
