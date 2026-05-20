'use client'

import { useEffect, useState } from 'react'

/**
 * Bottom-right "Festag als Webapp installieren" banner.
 *
 * Behavior:
 * - Hidden if the app is already running as an installed PWA
 *   (display-mode: standalone).
 * - Shows for every non-installed app session so every user can discover
 *   the Webapp install flow.
 * - Chromium uses the native install prompt when available. Other browsers
 *   get a compact instruction popover.
 */

const INSTALL_STATE_KEY = 'festag_pwa_install_state'

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
      fallbackTimer = setTimeout(() => setVisible(true), 900)
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
          position:fixed; right:18px; bottom:18px; z-index:200;
          width:min(430px, calc(100vw - 24px));
          background: color-mix(in srgb, var(--surface) 98%, transparent);
          color: var(--text);
          border:none;
          border-radius:18px;
          padding:14px;
          display:grid;
          grid-template-columns:56px minmax(0, 1fr) 24px;
          gap:12px;
          align-items:start;
          box-shadow:
            0 28px 80px -42px rgba(15,23,42,0.62),
            0 14px 30px -24px rgba(15,23,42,0.32),
            0 1px 0 rgba(255,255,255,0.78) inset;
          font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: pwaIn .22s ease both;
        }
        @keyframes pwaIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .pwa-logo {
          width:56px; height:56px;
          flex-shrink:0;
          display:grid;
          place-items:center;
          background:transparent;
          border-radius:16px;
          overflow:visible;
          line-height:0;
          filter:drop-shadow(0 12px 18px rgba(15,23,42,.10));
        }
        .pwa-logo img {
          grid-area:1 / 1;
          width:100%;
          height:100%;
          object-fit:contain;
          object-position:center;
          display:block;
          user-select:none;
          pointer-events:none;
        }
        .pwa-logo-dark { display:none; }
        [data-theme="dark"] .pwa-logo-light,
        [data-theme="classic-dark"] .pwa-logo-light { display:none; }
        [data-theme="dark"] .pwa-logo-dark,
        [data-theme="classic-dark"] .pwa-logo-dark { display:block; }
        [data-theme="dark"] .pwa-logo,
        [data-theme="classic-dark"] .pwa-logo {
          filter:drop-shadow(0 12px 18px rgba(0,0,0,.24));
        }
        .pwa-body { min-width:0; padding-top:1px; overflow:hidden; }
        .pwa-title { font-size:14px; font-weight:500; letter-spacing:-0.01em; margin-bottom:4px; }
        .pwa-sub { font-size:12.5px; font-weight:500; letter-spacing:0.01em; color:var(--text-muted); line-height:1.38; max-width:none; }
        .pwa-actions { margin-top:13px; display:flex; gap:8px; align-items:center; }
        .pwa-install {
          height:34px;
          font-family:inherit; font-size:12.5px; font-weight:500; letter-spacing:.012em;
          padding:0 15px; border-radius:8px; border:none; cursor:pointer;
          background:#383C44; color:#fff;
          box-shadow:0 1px 2px rgba(15,23,42,.12);
          transition: background .15s ease;
        }
        .pwa-install:hover:not(:disabled) { background:#2c2f36; }
        .pwa-install:disabled { opacity:.55; cursor:not-allowed; }
        .pwa-later {
          height:34px;
          font-family:inherit; font-size:12.5px; font-weight:500; letter-spacing:.012em;
          padding:0 13px; border-radius:8px; border:none;
          background: color-mix(in srgb, var(--text) 5%, transparent);
          color: var(--text-muted);
          box-shadow:0 1px 0 rgba(255,255,255,.72) inset;
          transition: opacity .15s, background .15s;
        }
        .pwa-later:hover { background: color-mix(in srgb, var(--text) 8%, transparent); }
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
          margin-top:10px; padding:10px 11px;
          border-radius:10px;
          background: color-mix(in srgb, currentColor 6%, transparent);
          font-size:11.5px; font-weight:500; letter-spacing:0.01em; line-height:1.48;
          color: inherit; opacity:.85;
        }
        .pwa-tip strong { font-weight:500; opacity:1; }
        [data-theme="dark"] .pwa-banner,
        [data-theme="classic-dark"] .pwa-banner {
          background: color-mix(in srgb, var(--surface) 92%, #111722 8%);
          box-shadow:
            0 28px 80px -44px rgba(0,0,0,0.78),
            0 1px 0 rgba(255,255,255,0.05) inset;
        }
        @media (max-width: 520px) {
          .pwa-banner {
            right:12px;
            bottom:12px;
            width:calc(100vw - 24px);
            grid-template-columns:50px 1fr 24px;
            border-radius:16px;
            padding:12px;
          }
          .pwa-logo { width:50px; height:50px; }
          .pwa-sub { max-width:none; }
        }
      `}</style>
      <div className="pwa-banner" role="dialog" aria-label="Festag installieren">
        <span className="pwa-logo" aria-hidden="true">
          <img className="pwa-logo-light" src="/brand/app-icon.png?v=20260519-frame57-mark" alt="" />
          <img className="pwa-logo-dark" src="/brand/app-icon.png?v=20260519-frame57-mark" alt="" />
        </span>
        <div className="pwa-body">
          <div className="pwa-title">Festag als Webapp installieren</div>
          <div className="pwa-sub">
            Schneller Zugriff ohne Browser-Leiste. Für Desktop und Mobile.
          </div>
          <div className="pwa-actions">
            <button type="button" className="pwa-install" onClick={install} disabled={installing}>
              {installing ? 'Installiert…' : deferred ? 'Installieren' : 'Anleitung'}
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
