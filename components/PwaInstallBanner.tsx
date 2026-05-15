'use client'

import { useEffect, useState } from 'react'

/**
 * Bottom-right "Festag als Webapp installieren" banner.
 *
 * Behavior:
 * - Hidden if the app is already running as an installed PWA
 *   (display-mode: standalone).
 * - Counts one dashboard/app entry per browser session and shows on every
 *   second entry until the app is installed.
 * - Chromium uses the native install prompt when available. Other browsers
 *   get a compact instruction popover.
 */

const INSTALL_STATE_KEY = 'festag_pwa_install_state'
const ENTRY_COUNT_KEY = 'festag_pwa_entry_count'
const SESSION_COUNTED_KEY = 'festag_pwa_entry_counted'

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
    let shouldShowThisEntry = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    // Already installed?
    if (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) {
      return
    }
    // Or running as PWA via Apple shorthand?
    if (typeof navigator !== 'undefined' && (navigator as any).standalone) {
      return
    }

    // Installed through the native prompt in this browser.
    try {
      if (localStorage.getItem(INSTALL_STATE_KEY) === 'installed') return
    } catch {}

    try {
      if (!sessionStorage.getItem(SESSION_COUNTED_KEY)) {
        const nextCount = Number(localStorage.getItem(ENTRY_COUNT_KEY) || '0') + 1
        localStorage.setItem(ENTRY_COUNT_KEY, String(nextCount))
        sessionStorage.setItem(SESSION_COUNTED_KEY, '1')
        shouldShowThisEntry = nextCount % 2 === 0
      } else {
        shouldShowThisEntry = sessionStorage.getItem('festag_pwa_show_this_entry') === '1'
      }
      sessionStorage.setItem('festag_pwa_show_this_entry', shouldShowThisEntry ? '1' : '0')
    } catch {
      shouldShowThisEntry = true
    }

    if (!shouldShowThisEntry) return

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
    } else {
      // Desktop Safari and some in-app browsers do not emit beforeinstallprompt.
      fallbackTimer = setTimeout(() => setVisible(true), 1200)
    }

    function onInstalled() {
      try { localStorage.setItem(INSTALL_STATE_KEY, 'installed') } catch {}
      setVisible(false)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforePrompt)
      window.removeEventListener('appinstalled', onInstalled)
      if (fallbackTimer) clearTimeout(fallbackTimer)
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
      // iOS Safari: show instructions
      setIosTip(v => !v)
    }
  }

  function dismiss() {
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        .pwa-banner {
          position:fixed; right:24px; bottom:24px; z-index:200;
          width:min(370px, calc(100vw - 32px));
          background: color-mix(in srgb, var(--surface) 94%, transparent);
          color: var(--text);
          border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
          border-radius:18px;
          padding:16px;
          display:flex; gap:12px; align-items:flex-start;
          box-shadow:0 24px 70px -34px rgba(0,0,0,0.42), 0 1px 2px rgba(0,0,0,0.12);
          font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: pwaIn .22s ease both;
        }
        @keyframes pwaIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .pwa-icon {
          width:40px; height:40px; border-radius:12px;
          flex-shrink:0;
          background: color-mix(in srgb, var(--text) 9%, transparent);
          display:flex; align-items:center; justify-content:center;
          font-family:'Qurova DEMO', serif; font-size:16px; font-weight:500;
          letter-spacing:-0.4px;
        }
        .pwa-body { flex:1; min-width:0; }
        .pwa-title { font-size:14px; font-weight:620; letter-spacing:-0.01em; margin-bottom:3px; }
        .pwa-sub { font-size:12.5px; font-weight:400; letter-spacing:0.01em; color:var(--text-muted); line-height:1.45; }
        .pwa-actions { margin-top:12px; display:flex; gap:8px; align-items:center; }
        .pwa-install {
          min-width:132px;
          height:34px;
          font-family:inherit; font-size:12.5px; font-weight:620; letter-spacing:0.01em;
          padding:0 16px; border-radius:999px; border:1px solid var(--text);
          background: var(--text); color: var(--bg);
          transition: opacity .15s, transform .25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .pwa-install:active:not(:disabled) { transform: scale(0.97); transition: transform .08s ease; }
        .pwa-install:hover:not(:disabled) { opacity: .88; }
        .pwa-install:disabled { opacity:.55; cursor:not-allowed; }
        .pwa-later {
          height:34px;
          font-family:inherit; font-size:12.5px; font-weight:580; letter-spacing:0.01em;
          padding:0 12px; border-radius:999px; border:none;
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
