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
    min-height:100dvh;
    width:100%;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-weight:400;
    -webkit-font-smoothing:antialiased;
    text-rendering:geometricPrecision;
    background:#ffffff;
    color:#1e1e20;
    display:flex;
    flex-direction:column;
    overflow-x:hidden;
    transition: opacity 0.12s ease;
    --festag-btn-dark-bg:#ffffff;
    --festag-btn-dark-bg-hover:#fafafa;
    --festag-btn-dark-bg-active:#f4f4f5;
    --festag-btn-dark-fg:#1e1e20;
    --festag-btn-dark-fg-hover:#1e1e20;
    --festag-btn-dark-fg-active:#1e1e20;
    --festag-btn-dark-border:#e5e5e6;
    --festag-btn-dark-border-hover:#d8d8da;
    --festag-btn-dark-border-active:#d8d8da;
    --festag-btn-dark-shadow:0 1px 2px rgba(0, 0, 0, 0.05);
    --festag-btn-dark-shadow-hover:0 1px 2px rgba(0, 0, 0, 0.07);
    --festag-btn-dark-shadow-active:0 1px 1px rgba(0, 0, 0, 0.04);
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
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
    padding:max(6px, env(safe-area-inset-top, 0px)) 24px 4px;
    flex-shrink:0;
  }
  .ae-wordmark {
    font-family: inherit;
    font-size:19px;
    font-weight:400;
    letter-spacing:0.004em;
    color:#1e1e20;
    line-height:1.2;
    padding:2px 0 3px;
    text-decoration:none;
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
    color:#8e8e93;
    cursor:pointer;
    -webkit-tap-highlight-color:transparent;
  }
  .ae-theme:hover { color:#1e1e20; }

  .ae-main {
    flex:1;
    min-height:0;
    display:flex;
    flex-direction:column;
    padding-bottom:88px;
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
    align-items:center;
    gap:10px;
    width:100%;
    max-width:420px;
    margin:0 auto;
    pointer-events:auto;
  }
  .ae-pill {
    flex:1;
    min-width:0;
    height:54px;
    border-radius:999px;
    border:1px solid var(--festag-btn-dark-border, #e5e5e6);
    background:var(--festag-btn-dark-bg, #ffffff);
    color:var(--festag-btn-dark-fg, #1e1e20);
    font-family:inherit;
    font-size:16px;
    font-weight:400;
    letter-spacing:0.005em;
    cursor:pointer;
    box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.05));
    -webkit-appearance:none;
    appearance:none;
    -webkit-tap-highlight-color:transparent;
    transition: background .15s, border-color .15s, color .15s, transform .08s ease, opacity .15s, box-shadow .15s;
  }
  .ae-pill:hover {
    background:var(--festag-btn-dark-bg-hover, #fafafa);
    color:var(--festag-btn-dark-fg-hover, #1e1e20);
    border-color:var(--festag-btn-dark-border-hover, #d8d8da);
    box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.07));
  }
  .ae-pill:active {
    transform:scale(0.985);
    background:var(--festag-btn-dark-bg-active, #f4f4f5);
    color:var(--festag-btn-dark-fg-active, #1e1e20);
    border-color:var(--festag-btn-dark-border-active, #d8d8da);
    box-shadow:var(--festag-btn-dark-shadow-active, 0 1px 1px rgba(0, 0, 0, 0.04));
  }
  .ae-pill--dev {
    background:#5B647D;
    color:#ffffff;
    border-color:color-mix(in srgb, #5B647D 88%, #000000);
    box-shadow:none;
  }
  .ae-pill--dev:hover { background:#4f576d; border-color:color-mix(in srgb, #5B647D 82%, #000000); box-shadow:none; }
  .ae-pill--dev:active { background:color-mix(in srgb, #5B647D 72%, #000000); border-color:color-mix(in srgb, #5B647D 65%, #000000); box-shadow:none; }

  .ae-root[data-theme="dark"] {
    background:#000000;
    color:#f5f5f7;
    --festag-btn-dark-bg:rgba(186,194,210,0.18);
    --festag-btn-dark-bg-hover:rgba(186,194,210,0.28);
    --festag-btn-dark-bg-active:rgba(186,194,210,0.36);
    --festag-btn-dark-fg:rgba(245,245,247,0.92);
    --festag-btn-dark-fg-hover:#f5f5f7;
    --festag-btn-dark-fg-active:#f5f5f7;
    --festag-btn-dark-border:rgba(255, 255, 255, 0.08);
    --festag-btn-dark-border-hover:rgba(255, 255, 255, 0.12);
    --festag-btn-dark-border-active:rgba(255, 255, 255, 0.12);
    --festag-btn-dark-shadow:0 1px 2px rgba(0, 0, 0, 0.35);
    --festag-btn-dark-shadow-hover:0 1px 2px rgba(0, 0, 0, 0.42);
    --festag-btn-dark-shadow-active:0 1px 1px rgba(0, 0, 0, 0.28);
    --festag-input-fill:#1c1d22;
    --festag-input-fill-focus:#24262c;
  }
  .ae-root[data-theme="dark"] .ae-wordmark { color:#f5f5f7; }
  .ae-root[data-theme="dark"] .ae-theme { color:rgba(186,194,210,0.88); }
  .ae-root[data-theme="dark"] .ae-theme:hover { color:#f5f5f7; }
  .ae-root[data-theme="dark"] .ae-pill {
    background:var(--festag-btn-dark-bg);
    color:var(--festag-btn-dark-fg);
    border:0;
    box-shadow:none;
  }
  .ae-root[data-theme="dark"] .ae-pill:hover,
  .ae-root[data-theme="dark"] .ae-pill:focus-visible {
    background:var(--festag-btn-dark-bg-hover);
    color:var(--festag-btn-dark-fg-hover);
  }
  .ae-root[data-theme="dark"] .ae-pill:active {
    background:var(--festag-btn-dark-bg-active);
    color:var(--festag-btn-dark-fg-active);
    box-shadow:none;
  }
  .ae-root[data-theme="dark"] .ae-pill--dev {
    background:#f5f5f7;
    color:#0c0c0e;
    border:0;
    border-color:transparent;
  }
  .ae-root[data-theme="dark"] .ae-pill--dev:hover,
  .ae-root[data-theme="dark"] .ae-pill--dev:focus-visible {
    background:#e8e8ed;
    color:#0c0c0e;
  }
  .ae-root[data-theme="dark"] .ae-pill--dev:active {
    background:#dcdce3;
    color:#0c0c0e;
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
          <header className="ae-header">
            <span className="ae-wordmark">Festag</span>
            <button
              type="button"
              className="ae-theme no-min-tap"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
          </header>

          <div className="ae-main">
            <EnterCinematicHero theme={theme === 'dark' ? 'dark' : 'light'} />
          </div>

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
