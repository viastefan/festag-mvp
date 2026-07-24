'use client'

/**
 * Mobile-first auth entry chooser.
 *
 * ≤768px: cinematic Festag phone hero + Client / Developer pills.
 * Desktop: immediately continue to /login (unchanged product path).
 * Remembered in sessionStorage for the tab; footer deep links still work.
 */

import { useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
import EnterCinematicHero from '@/components/auth/EnterCinematicHero'
import {
  prepareAuthRouteTransition,
  useAuthTheme,
} from '@/lib/auth-theme'
import { applyAppearanceForPath } from '@/lib/theme'
import {
  authPathForChoice,
  getAuthEntryChoice,
  isAuthEntryMobileViewport,
  rememberAuthEntry,
  type AuthEntryChoice,
} from '@/lib/auth-entry'

const ENTER_STYLES = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

  .ae-root {
    position: relative;
    min-height:100dvh;
    width:100%;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-weight:400;
    -webkit-font-smoothing:antialiased;
    text-rendering:geometricPrecision;
    background:#0c0c0e;
    color:#f5f5f7;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    overscroll-behavior:none;
    touch-action:manipulation;
    transition: opacity 0.12s ease;
    /* Same Linear lock as auth Weiter (.al-btn-primary) */
    --festag-btn-dark-bg:#ffffff;
    --festag-btn-dark-bg-hover:#ffffff;
    --festag-btn-dark-bg-active:#f9f9fa;
    --festag-btn-dark-fg:#1e1e20;
    --festag-btn-dark-fg-hover:#1e1e20;
    --festag-btn-dark-fg-active:#1e1e20;
    --festag-btn-dark-border:rgba(30, 30, 32, 0.08);
    --festag-btn-dark-border-hover:rgba(30, 30, 32, 0.08);
    --festag-btn-dark-border-active:rgba(30, 30, 32, 0.08);
    --festag-btn-dark-shadow:0 1px 2px rgba(0, 0, 0, 0.04);
    --festag-btn-dark-shadow-hover:0 2px 6px rgba(0, 0, 0, 0.06);
    --festag-btn-dark-shadow-active:0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .ae-root a,
  .ae-root button,
  .ae-root p,
  .ae-root span,
  .ae-root strong {
    font-weight:400;
  }
  .ae-root.exiting { pointer-events:none; }
  @keyframes aeEnter { from { opacity:0.001; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  .ae-root:not(.exiting):not(.ae-resolving) { animation: aeEnter 0.16s cubic-bezier(.16,1,.3,1) both; }
  .ae-root.ae-resolving { opacity:0; }

  .ae-header {
    position: relative;
    z-index: 2;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    padding:max(10px, calc(env(safe-area-inset-top, 0px) + 8px)) 24px 10px;
    min-height:44px;
    flex-shrink:0;
  }
  /* Brand mark in the same row as theme — shared vertical center. */
  .ae-wordmark {
    position:relative;
    z-index:1;
    flex-shrink:0;
    width:36px;
    height:36px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    margin:0;
    padding:0;
    color:#f5f5f7;
    text-decoration:none;
    pointer-events:none;
    -webkit-tap-highlight-color:transparent;
  }
  .ae-root:not([data-theme="dark"]) .ae-wordmark { color:#1e1e20; }
  .ae-wordmark-mark {
    display:block;
    width:22px;
    height:22px;
    background-color:currentColor;
    -webkit-mask-image:url(/brand/festag-mark.png?v=20260724-split-mark);
    -webkit-mask-size:contain;
    -webkit-mask-repeat:no-repeat;
    -webkit-mask-position:center;
    mask-image:url(/brand/festag-mark.png?v=20260724-split-mark);
    mask-size:contain;
    mask-repeat:no-repeat;
    mask-position:center;
  }
  @media (min-width: 769px) {
    .ae-header {
      padding:24px 32px 12px;
    }
  }
  .ae-theme {
    display:inline-flex;
    align-items:center;
    justify-content:center;
    width:36px;
    height:36px;
    border:0;
    border-radius:999px;
    background:transparent;
    color:rgba(245, 245, 247, 0.88);
    cursor:pointer;
    -webkit-tap-highlight-color:transparent;
  }
  .ae-theme:hover { color:#f5f5f7; }

  .ae-main {
    position: relative;
    z-index: 1;
    flex:1;
    min-height:0;
    display:flex;
    flex-direction:column;
    padding-bottom:calc(148px + env(safe-area-inset-bottom, 0px));
  }

  .ae-dock {
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    z-index:20;
    padding:12px 24px;
    padding-bottom:calc(16px + env(safe-area-inset-bottom, 0px));
    pointer-events:none;
  }
  .ae-dock-row {
    display:flex;
    flex-direction:column;
    align-items:stretch;
    gap:12px;
    width:100%;
    max-width:420px;
    margin:0 auto;
    pointer-events:auto;
  }
  /* Client — black fill + quiet stroke (new auth CTA geometry). */
  .ae-pill {
    width:100%;
    flex:0 0 auto;
    min-width:0;
    height:52px;
    min-height:52px;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:10px;
    padding:0 18px;
    border-radius:999px;
    border:1px solid rgba(255, 255, 255, 0.14);
    outline:none;
    background:#000000;
    color:#f5f5f7;
    font-family:inherit;
    font-size:15px;
    font-weight:400;
    letter-spacing:var(--ls-body, 0.021em);
    white-space:nowrap;
    cursor:pointer;
    box-shadow:0 1px 2px rgba(0, 0, 0, 0.04);
    background-clip:padding-box;
    -webkit-appearance:none;
    appearance:none;
    -webkit-tap-highlight-color:transparent;
    transition:background .15s, border-color .15s, color .15s, transform .08s ease, opacity .15s, box-shadow .15s;
  }
  .ae-pill:hover {
    background:#0a0a0a;
    color:#f5f5f7;
    border-color:rgba(255, 255, 255, 0.18);
    box-shadow:0 1px 2px rgba(0, 0, 0, 0.06);
  }
  .ae-pill:active {
    transform:scale(0.985);
    background:#000000;
    color:#f5f5f7;
    border-color:rgba(255, 255, 255, 0.12);
    box-shadow:none;
  }
  .ae-pill:focus,
  .ae-pill:focus-visible {
    outline:none;
    box-shadow:0 1px 2px rgba(0, 0, 0, 0.04);
  }
  /* Developer — Festag primary slate (#5B647D), same geometry. */
  .ae-pill--dev {
    background:#5B647D;
    color:#ffffff;
    border:1px solid rgba(255, 255, 255, 0.08);
    box-shadow:0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .ae-pill--dev:hover {
    background:color-mix(in srgb, #5B647D 90%, #ffffff);
    color:#ffffff;
    border-color:rgba(255, 255, 255, 0.10);
    box-shadow:0 1px 2px rgba(0, 0, 0, 0.06);
  }
  .ae-pill--dev:active {
    background:color-mix(in srgb, #5B647D 82%, #000000);
    color:#ffffff;
    border-color:rgba(255, 255, 255, 0.08);
    box-shadow:none;
  }
  .ae-pill--dev:focus,
  .ae-pill--dev:focus-visible {
    outline:none;
  }

  .ae-root[data-theme="dark"] {
    background:#000000;
    color:#f5f5f7;
    --festag-btn-dark-bg:rgba(186,194,210,0.08);
    --festag-btn-dark-bg-hover:rgba(186,194,210,0.16);
    --festag-btn-dark-bg-active:rgba(186,194,210,0.22);
    --festag-btn-dark-fg:rgba(245,245,247,0.88);
    --festag-btn-dark-fg-hover:#f5f5f7;
    --festag-btn-dark-fg-active:#f5f5f7;
    --festag-btn-dark-border:rgba(255,255,255,0.06);
    --festag-btn-dark-border-hover:rgba(255,255,255,0.09);
    --festag-btn-dark-border-active:rgba(255,255,255,0.07);
    --festag-btn-dark-shadow:0 1px 2px rgba(0, 0, 0, 0.12);
    --festag-btn-dark-shadow-hover:0 1px 2px rgba(0, 0, 0, 0.16);
    --festag-btn-dark-shadow-active:0 1px 1px rgba(0, 0, 0, 0.1);
  }
  .ae-root[data-theme="dark"] .ae-theme { color:rgba(245, 245, 247, 0.88); }
  .ae-root[data-theme="dark"] .ae-theme:hover { color:#f5f5f7; }
  /* Keep Client black + stroke / Developer primary in both themes. */
  .ae-root[data-theme="dark"] .ae-pill {
    background:#000000;
    color:#f5f5f7;
    border:1px solid rgba(255, 255, 255, 0.14);
    box-shadow:0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .ae-root[data-theme="dark"] .ae-pill:hover,
  .ae-root[data-theme="dark"] .ae-pill:focus-visible {
    background:#0a0a0a;
    color:#f5f5f7;
    border-color:rgba(255, 255, 255, 0.18);
    box-shadow:0 1px 2px rgba(0, 0, 0, 0.06);
  }
  .ae-root[data-theme="dark"] .ae-pill:active {
    background:#000000;
    color:#f5f5f7;
    border-color:rgba(255, 255, 255, 0.12);
    box-shadow:none;
  }
  .ae-root[data-theme="dark"] .ae-pill--dev {
    background:#5B647D;
    color:#ffffff;
    border:1px solid rgba(255, 255, 255, 0.08);
    box-shadow:0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .ae-root[data-theme="dark"] .ae-pill--dev:hover,
  .ae-root[data-theme="dark"] .ae-pill--dev:focus-visible {
    background:color-mix(in srgb, #5B647D 90%, #ffffff);
    color:#ffffff;
    border-color:rgba(255, 255, 255, 0.10);
    box-shadow:0 1px 2px rgba(0, 0, 0, 0.06);
  }
  .ae-root[data-theme="dark"] .ae-pill--dev:active {
    background:color-mix(in srgb, #5B647D 82%, #000000);
    color:#ffffff;
    border-color:rgba(255, 255, 255, 0.08);
    box-shadow:none;
  }

  @media (min-width: 769px) {
    .ae-dock { display:none; }
    .ae-main { display:none; }
    .ae-pill:active { transform:scale(0.98); }
  }
`

export default function EnterPage() {
  const router = useRouter()
  const { mode: theme, setMode: setTheme } = useAuthTheme('client')
  const [ready, setReady] = useState(false)
  const [exiting, setExiting] = useState(false)

  useLayoutEffect(() => {
    applyAppearanceForPath('/enter')
    if (!isAuthEntryMobileViewport()) {
      prepareAuthRouteTransition('/login')
      router.replace('/login')
      return
    }
    const choice = getAuthEntryChoice()
    if (choice) {
      const href = authPathForChoice(choice)
      prepareAuthRouteTransition(href)
      router.replace(href)
      return
    }
    setReady(true)
  }, [router])

  function choose(choice: AuthEntryChoice) {
    if (exiting) return
    rememberAuthEntry(choice)
    const href = authPathForChoice(choice)
    setExiting(true)
    prepareAuthRouteTransition(href)
    requestAnimationFrame(() => router.push(href))
  }

  return (
    <main
      className={`ae-root${exiting ? ' exiting' : ''}${ready ? '' : ' ae-resolving'}`}
      data-theme={theme}
      aria-busy={!ready}
    >
      <style>{ENTER_STYLES}</style>

      {ready ? (
        <>
          <EnterCinematicHero theme={theme === 'dark' ? 'dark' : 'light'} />

          <header className="ae-header">
            <span className="ae-wordmark" aria-label="festag" role="img">
              <span className="ae-wordmark-mark" aria-hidden="true" />
            </span>
            <button
              type="button"
              className="ae-theme no-min-tap"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
          </header>

          <div className="ae-main" />

          <nav className="ae-dock" aria-label="Zugang wählen">
            <div className="ae-dock-row">
              <button
                type="button"
                className="ae-pill"
                onClick={() => choose('client')}
              >
                Client
              </button>
              <button
                type="button"
                className="ae-pill ae-pill--dev"
                onClick={() => choose('dev')}
              >
                Developer
              </button>
            </div>
          </nav>
        </>
      ) : null}
    </main>
  )
}
