'use client'

/**
 * Mobile auth entry chooser (≤768px).
 * Desktop visitors are redirected server-side in app/enter/page.tsx.
 */

import { useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
import {
  prepareAuthRouteTransition,
  useAuthTheme,
} from '@/lib/auth-theme'
import { applyAppearanceForPath } from '@/lib/theme'
import {
  authPathForChoice,
  getAuthEntryChoice,
  rememberAuthEntry,
  type AuthEntryChoice,
} from '@/lib/auth-entry'
import AuthSandAmbient from '@/components/auth/AuthSandAmbient'
import { AUTH_SAND_AMBIENT_STYLES } from '@/components/auth/auth-sand-ambient-styles'

const COMMIT_DELAY_MS = 260

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
    background:#f7f8f8;
    color:#1e1e20;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    overscroll-behavior:none;
    touch-action:manipulation;
    transition: background-color .2s ease;
  }
  .ae-root a,
  .ae-root button,
  .ae-root p,
  .ae-root span,
  .ae-root strong {
    font-weight:400;
  }
  .ae-root[data-theme="dark"] {
    background:#070708;
    color:#f5f5f7;
  }
  .ae-root.exiting { pointer-events:none; }
  @keyframes aeEnter { from { opacity:0.001; } to { opacity:1; } }
  .ae-root:not(.exiting) { animation: aeEnter 0.18s cubic-bezier(.16,1,.3,1) both; }

  .ae-header {
    position: relative;
    z-index: 2;
    display:flex;
    align-items:center;
    justify-content:flex-end;
    padding:max(10px, calc(env(safe-area-inset-top, 0px) + 8px)) 32px 10px;
    min-height:44px;
    flex-shrink:0;
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
    color:rgba(30, 30, 32, 0.72);
    cursor:pointer;
    -webkit-tap-highlight-color:transparent;
    transition:color .15s ease, background .15s ease;
  }
  .ae-theme:hover { color:#1e1e20; background:rgba(30,30,32,0.05); }
  .ae-root[data-theme="dark"] .ae-theme { color:rgba(245, 245, 247, 0.72); }
  .ae-root[data-theme="dark"] .ae-theme:hover { color:#f5f5f7; background:rgba(255,255,255,0.06); }

  .ae-main {
    position: relative;
    z-index: 1;
    flex:1;
    min-height:0;
    display:flex;
    align-items:center;
    justify-content:center;
    padding-bottom:calc(160px + env(safe-area-inset-bottom, 0px));
  }

  .ae-logo-wrap {
    position:relative;
    width:88px;
    height:88px;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .ae-logo-mark {
    position:absolute;
    inset:0;
    animation: aeLogoSpin 11s linear infinite;
    will-change: transform;
  }
  @keyframes aeLogoSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .ae-logo-mark { animation:none; }
  }
  .ae-logo-mark--dark { display:none; }
  .ae-logo-mark--silver {
    display:block;
    -webkit-mask-image:url(/brand/festag-mark.png?v=20260726-enter-spin);
    -webkit-mask-size:contain;
    -webkit-mask-repeat:no-repeat;
    -webkit-mask-position:center;
    -webkit-mask-mode:alpha;
    mask-image:url(/brand/festag-mark.png?v=20260726-enter-spin);
    mask-size:contain;
    mask-repeat:no-repeat;
    mask-position:center;
    mask-mode:alpha;
    background-image:linear-gradient(
      145deg,
      #ffffff 0%,
      #f7f8fa 11%,
      #cfd4dc 27%,
      #858c98 43%,
      #f9fafb 57%,
      #b7bdc7 72%,
      #737a86 88%,
      #d8dce2 100%
    );
    filter:
      drop-shadow(0 -0.5px 0 rgba(255, 255, 255, 0.92))
      drop-shadow(0 3px 5px rgba(30, 30, 32, 0.16))
      drop-shadow(0 9px 18px rgba(30, 30, 32, 0.08));
  }
  .ae-root[data-theme="dark"] .ae-logo-mark--silver { display:none; }
  .ae-root[data-theme="dark"] .ae-logo-mark--dark {
    display:block;
    background-image:linear-gradient(145deg, #ffffff 0%, #e4e7eb 42%, #ffffff 58%, #aeb4bd 100%);
    -webkit-mask-image:url(/brand/festag-mark.png?v=20260726-enter-spin);
    -webkit-mask-size:contain;
    -webkit-mask-repeat:no-repeat;
    -webkit-mask-position:center;
    mask-image:url(/brand/festag-mark.png?v=20260726-enter-spin);
    mask-size:contain;
    mask-repeat:no-repeat;
    mask-position:center;
    filter:
      drop-shadow(0 -0.5px 0 rgba(255,255,255,0.38))
      drop-shadow(0 4px 12px rgba(0,0,0,0.72));
  }

  .ae-sheet {
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    z-index:20;
    padding:18px 32px calc(20px + env(safe-area-inset-bottom, 0px));
    border-radius:28px 28px 0 0;
    background:#ffffff;
    box-shadow:0 -16px 44px rgba(15, 23, 42, 0.10);
    transform:translate3d(0, 100%, 0);
    transition:transform 0.5s cubic-bezier(.16,1,.3,1);
    will-change:transform;
  }
  .ae-sheet.is-up { transform:translate3d(0, 0, 0); }
  .ae-root[data-theme="dark"] .ae-sheet {
    background:#0c0c0e;
    box-shadow:0 -16px 44px rgba(0, 0, 0, 0.5);
  }
  .ae-sheet-grip {
    width:36px;
    height:4px;
    border-radius:999px;
    background:rgba(30, 30, 32, 0.14);
    margin:0 auto 16px;
  }
  .ae-root[data-theme="dark"] .ae-sheet-grip {
    background:rgba(255, 255, 255, 0.18);
  }

  .ae-toggle {
    position:relative;
    display:grid;
    grid-template-columns:1fr 1fr;
    height:56px;
    border-radius:999px;
    background:rgba(30, 30, 32, 0.05);
    padding:5px;
  }
  .ae-root[data-theme="dark"] .ae-toggle {
    background:rgba(255, 255, 255, 0.06);
  }
  .ae-toggle-thumb {
    position:absolute;
    top:5px;
    left:5px;
    width:calc(50% - 5px);
    height:calc(100% - 10px);
    border-radius:999px;
    background:#000000;
    box-shadow:0 1px 2px rgba(0,0,0,0.14);
    transition:transform .32s cubic-bezier(.16,1,.3,1), background .2s ease;
    transform:translate3d(0, 0, 0);
  }
  .ae-toggle-thumb.is-dev {
    transform:translate3d(100%, 0, 0);
    background:#F0F2F5;
  }
  .ae-toggle-opt {
    position:relative;
    z-index:1;
    display:flex;
    align-items:center;
    justify-content:center;
    border:0;
    background:transparent;
    font-family:inherit;
    font-size:15px;
    font-weight:400;
    letter-spacing:var(--ls-body, 0.021em);
    color:rgba(30, 30, 32, 0.5);
    cursor:pointer;
    -webkit-tap-highlight-color:transparent;
    transition:color .2s ease;
  }
  .ae-toggle-opt[aria-selected="true"] { color:#ffffff; }
  .ae-root[data-theme="dark"] .ae-toggle-opt { color:rgba(245, 245, 247, 0.5); }
  .ae-root[data-theme="dark"] .ae-toggle-opt[aria-selected="true"] { color:#ffffff; }
  .ae-sheet.is-committing .ae-toggle-opt { pointer-events:none; }
` + AUTH_SAND_AMBIENT_STYLES

export default function EnterMobileClient() {
  const router = useRouter()
  const { mode: theme, toggleLightDark } = useAuthTheme('client')
  const [exiting, setExiting] = useState(false)
  const [sheetUp, setSheetUp] = useState(false)
  const [previewChoice, setPreviewChoice] = useState<AuthEntryChoice>('client')
  const [committing, setCommitting] = useState(false)
  const commitTimer = useRef<number | null>(null)

  useLayoutEffect(() => {
    applyAppearanceForPath('/enter')
    const choice = getAuthEntryChoice()
    if (choice) {
      const href = authPathForChoice(choice)
      prepareAuthRouteTransition(href)
      router.replace(href)
      return
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetUp(true))
    })
    return () => cancelAnimationFrame(id)
  }, [router])

  useLayoutEffect(() => () => {
    if (commitTimer.current) window.clearTimeout(commitTimer.current)
  }, [])

  function choose(choice: AuthEntryChoice) {
    if (exiting || committing) return
    setPreviewChoice(choice)
    setCommitting(true)
    commitTimer.current = window.setTimeout(() => {
      rememberAuthEntry(choice)
      const href = authPathForChoice(choice)
      setExiting(true)
      prepareAuthRouteTransition(href)
      requestAnimationFrame(() => router.push(href))
    }, COMMIT_DELAY_MS)
  }

  return (
    <main
      className={`ae-root${exiting ? ' exiting' : ''}`}
      data-theme={theme}
    >
      <style>{ENTER_STYLES}</style>
      <AuthSandAmbient />

      <header className="ae-header">
        <button
          type="button"
          className="ae-theme no-min-tap"
          aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
          onClick={() => toggleLightDark()}
        >
          {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
        </button>
      </header>

      <div className="ae-main">
        <div className="ae-logo-wrap" aria-hidden="true">
          <span className="ae-logo-mark ae-logo-mark--silver" />
          <span className="ae-logo-mark ae-logo-mark--dark" />
        </div>
      </div>

      <nav
        className={`ae-sheet${sheetUp ? ' is-up' : ''}${committing ? ' is-committing' : ''}`}
        aria-label="Zugang wählen"
      >
        <div className="ae-sheet-grip" aria-hidden />
        <div className="ae-toggle" role="tablist" aria-label="Client oder Developer">
          <span
            className={`ae-toggle-thumb${previewChoice === 'dev' ? ' is-dev' : ''}`}
            aria-hidden="true"
          />
          <button
            type="button"
            role="tab"
            aria-selected={previewChoice === 'client'}
            className="ae-toggle-opt"
            onClick={() => choose('client')}
          >
            Client
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={previewChoice === 'dev'}
            className="ae-toggle-opt"
            onClick={() => choose('dev')}
          >
            Developer
          </button>
        </div>
      </nav>
    </main>
  )
}
