'use client'

/**
 * DashboardMobileStart — Codex voice dashboard (mobile).
 * Full-screen, minimal: diamond dots, Spotify-style status lines,
 * scope context, three bottom controls (stop · mic · close).
 */

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Microphone, Square, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { getVoicePreferences } from '@/lib/voice'
import { openTagro } from '@/components/TagroOverlay'
import TagroDiamondDots from '@/components/dashboard/TagroDiamondDots'
import CodexMobileTopBar from '@/components/mobile/CodexMobileTopBar'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'

type ScopeOption = { id: string; label: string; color?: string | null }

type Props = {
  sentences: string[]
  busy?: boolean
  openDecisionsCount: number
  blockersCount: number
  scopeLabel: string
  scopeOptions?: ScopeOption[]
  activeScopeId?: string
  onScopeChange?: (id: string) => void
  periodLabel?: string
  periodOptions?: string[]
  onPeriodChange?: (p: string) => void
  onCreateReport: () => void
}

function pickGermanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  const prefs = getVoicePreferences()
  if (prefs.voiceId) {
    const exact = voices.find(v => `${v.name}__${v.lang}` === prefs.voiceId)
    if (exact) return exact
  }
  return [...voices]
    .filter(v => v.lang.toLowerCase().startsWith('de'))
    .sort((a, b) => Number(b.localService) - Number(a.localService))[0] ?? null
}

export default function DashboardMobileStart({
  sentences,
  busy,
  openDecisionsCount,
  blockersCount,
  scopeLabel,
  scopeOptions = [],
  activeScopeId,
  onScopeChange,
  periodLabel,
  periodOptions = [],
  onPeriodChange,
  onCreateReport,
}: Props) {
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [navOpen, setNavOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<HTMLDivElement | null>(null)
  const cancelledRef = useRef(false)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const hasText = sentences.length > 0
  const speaking = playing || !!busy
  const displayActive = (playing || paused) && active >= 0 ? active : -1

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => {
      document.body.classList.toggle('festag-dashboard-mobile', mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => {
      mq.removeEventListener('change', sync)
      document.body.classList.remove('festag-dashboard-mobile')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user || cancelled) return
        const { data: profile } = await sb
          .from('profiles')
          .select('company_name,full_name,first_name')
          .eq('id', user.id)
          .maybeSingle()
        const { data: ws } = await sb
          .from('workspaces')
          .select('name')
          .eq('primary_owner_id', user.id)
          .eq('is_personal', true)
          .maybeSingle()
        const name =
          (ws as { name?: string } | null)?.name?.trim()
          || (profile as { company_name?: string } | null)?.company_name?.trim()
          || (profile as { full_name?: string } | null)?.full_name?.trim()
          || (profile as { first_name?: string } | null)?.first_name?.trim()
          || 'Festag'
        if (!cancelled) setWorkspaceName(name)
      } catch {
        if (!cancelled) setWorkspaceName('Festag')
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const body = bodyRef.current
    const flow = flowRef.current
    if (!body || !flow) return
    const line = flow.querySelector<HTMLElement>(`[data-i="${displayActive}"]`)
    if (!line) return
    const target = line.offsetTop + line.offsetHeight / 2 - body.clientHeight / 2
    body.scrollTo({ top: Math.max(0, target), behavior: playing ? 'smooth' : 'auto' })
  }, [displayActive, playing])

  const stopAll = useCallback(() => {
    cancelledRef.current = true
    try { window.speechSynthesis.cancel() } catch {}
    setPlaying(false)
    setPaused(false)
    setActive(-1)
  }, [])

  useEffect(() => () => { stopAll() }, [stopAll])
  useEffect(() => { stopAll() }, [sentences.join('\n')]) // eslint-disable-line react-hooks/exhaustive-deps

  const speakFrom = useCallback((startIdx: number) => {
    if (!supported || sentences.length === 0) return
    cancelledRef.current = false
    try { window.speechSynthesis.cancel() } catch {}
    const prefs = getVoicePreferences()
    const voice = pickGermanVoice()

    const queue = (i: number) => {
      if (cancelledRef.current || i >= sentences.length) {
        if (!cancelledRef.current) { setPlaying(false); setPaused(false); setActive(-1) }
        return
      }
      const u = new SpeechSynthesisUtterance(sentences[i])
      u.lang = 'de-DE'
      u.rate = prefs.rate ?? 1
      u.pitch = prefs.pitch ?? 1
      if (voice) u.voice = voice
      u.onstart = () => setActive(i)
      u.onend = () => queue(i + 1)
      u.onerror = () => { setPlaying(false); setPaused(false) }
      window.speechSynthesis.speak(u)
    }
    setPlaying(true)
    setPaused(false)
    setActive(startIdx)
    queue(startIdx)
  }, [sentences, supported])

  function togglePlay() {
    if (!supported || !hasText) return
    if (playing) {
      window.speechSynthesis.pause()
      setPlaying(false)
      setPaused(true)
      return
    }
    if (paused) {
      window.speechSynthesis.resume()
      setPlaying(true)
      setPaused(false)
      return
    }
    speakFrom(0)
  }

  function handleMic() {
    if (!hasText && !busy) {
      onCreateReport()
      return
    }
    openTagro({ contextType: 'status_report', id: 'dashboard', title: 'Statusabfrage · Heute' })
  }

  const metaParts: string[] = []
  if (openDecisionsCount > 0) {
    metaParts.push(
      openDecisionsCount === 1 ? '1 Entscheidung' : `${openDecisionsCount} Entscheidungen`,
    )
  }
  if (blockersCount > 0) {
    metaParts.push(blockersCount === 1 ? '1 Blocker' : `${blockersCount} Blocker`)
  }

  return (
    <div className="dms" role="main" aria-label="Statusabfrage">
      <CodexMobileTopBar
        left="menu"
        right="more"
        onLeft={() => setNavOpen(true)}
        onRight={() => setMenuOpen(v => !v)}
      />
      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      {menuOpen && (
        <>
          <button type="button" className="dms-menu-backdrop" aria-label="Schließen" onClick={() => setMenuOpen(false)} />
          <div className="dms-menu" role="menu">
            <p className="dms-menu-head">Bericht</p>
            {scopeOptions.map(o => (
              <button
                key={o.id}
                type="button"
                className={`dms-menu-item${o.id === activeScopeId ? ' on' : ''}`}
                onClick={() => { onScopeChange?.(o.id); setMenuOpen(false) }}
              >
                <span>{o.label}</span>
                {o.id === activeScopeId ? <Check size={14} weight="bold" /> : null}
              </button>
            ))}
            {periodOptions.length > 0 && (
              <>
                <p className="dms-menu-head">Zeitraum</p>
                {periodOptions.map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`dms-menu-item${p === periodLabel ? ' on' : ''}`}
                    onClick={() => { onPeriodChange?.(p); setMenuOpen(false) }}
                  >
                    <span>{p}</span>
                    {p === periodLabel ? <Check size={14} weight="bold" /> : null}
                  </button>
                ))}
              </>
            )}
            <button
              type="button"
              className="dms-menu-item"
              onClick={() => {
                setMenuOpen(false)
                window.dispatchEvent(new CustomEvent('open-command-palette'))
              }}
            >
              <span>Suchen</span>
            </button>
          </div>
        </>
      )}

      <header className="dms-head">
        <p className="dms-brand">{workspaceName}</p>
      </header>

      <div className="dms-stage">
        <TagroDiamondDots active={speaking} size={52} />

        <button
          type="button"
          className="dms-lyrics-btn"
          onClick={hasText ? togglePlay : onCreateReport}
          disabled={busy && !hasText}
          aria-label={hasText ? (playing ? 'Pausieren' : 'Bericht anhören') : 'Statusbericht erstellen'}
        >
          <div className="dms-lyrics-mask">
            <div className="dms-lyrics" ref={bodyRef}>
              {hasText ? (
                <div className="dms-flow" ref={flowRef}>
                  {sentences.map((s, i) => (
                    <p
                      key={i}
                      data-i={i}
                      className={`dms-line${
                        i === displayActive ? ' on'
                        : i === displayActive - 1 || i === displayActive + 1 ? ' near'
                        : ''
                      }`}
                    >
                      {s}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="dms-empty">
                  {busy ? 'Tagro schreibt den Statusbericht …' : 'Tippe auf das Mikrofon, um einen Bericht zu erstellen.'}
                </p>
              )}
            </div>
          </div>
        </button>

        <div className="dms-context">
          <span className="dms-scope">{scopeLabel}</span>
          {metaParts.length > 0 && (
            <div className="dms-meta">
              {openDecisionsCount > 0 && (
                <Link href="/decisions" className="dms-meta-link">{metaParts[0]}</Link>
              )}
              {openDecisionsCount > 0 && blockersCount > 0 && <span className="dms-meta-sep">·</span>}
              {blockersCount > 0 && (
                <Link href="/decisions?tone=risk" className="dms-meta-link">
                  {openDecisionsCount > 0 ? metaParts[metaParts.length - 1] : metaParts[0]}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="dms-controls" aria-label="Steuerung">
        <button
          type="button"
          className="dms-ctl dms-stop"
          onClick={stopAll}
          disabled={!playing && !paused}
          aria-label="Stoppen"
        >
          <Square size={14} weight="fill" />
        </button>
        <button
          type="button"
          className="dms-ctl dms-mic"
          onClick={handleMic}
          disabled={busy && !hasText}
          aria-label={hasText ? 'Mit Tagro sprechen' : 'Statusbericht erstellen'}
        >
          <Microphone size={26} weight="bold" />
        </button>
        <button
          type="button"
          className="dms-ctl dms-close"
          onClick={stopAll}
          aria-label="Schließen"
        >
          <X size={18} weight="bold" />
        </button>
      </footer>

      <style jsx>{`
        .dms {
          display: none;
        }

        @media (max-width: 768px) {
          .dms {
            --dms-bg: #000;
            --dms-text: #fff;
            --dms-text-dim: rgba(255, 255, 255, 0.28);
            --dms-text-near: rgba(255, 255, 255, 0.42);
            --dms-dot: #fff;
            --dms-ctl-bg: rgba(255, 255, 255, 0.1);
            --dms-ctl-fg: rgba(255, 255, 255, 0.85);
            --dms-mic-bg: #fff;
            --dms-mic-fg: #000;
            --dms-scope-fg: rgba(255, 255, 255, 0.72);

            display: flex;
            flex-direction: column;
            position: fixed;
            inset: 0;
            z-index: 500;
            width: 100%;
            max-width: 430px;
            margin: 0 auto;
            background: var(--dms-bg);
            color: var(--dms-text);
            font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
            overflow: hidden;
            padding:
              calc(12px + env(safe-area-inset-top, 0px))
              24px
              calc(20px + env(safe-area-inset-bottom, 0px));
          }

          :global([data-theme="light"]) .dms,
          :global([data-theme="read"]) .dms,
          :global([data-theme="pure-light"]) .dms {
            --dms-bg: #fcfcfc;
            --dms-text: #0f0f10;
            --dms-text-dim: rgba(15, 15, 16, 0.22);
            --dms-text-near: rgba(15, 15, 16, 0.38);
            --dms-dot: #1c1c1e;
            --dms-ctl-bg: rgba(15, 15, 16, 0.06);
            --dms-ctl-fg: rgba(15, 15, 16, 0.72);
            --dms-mic-bg: #1c1c1e;
            --dms-mic-fg: #fff;
            --dms-scope-fg: rgba(15, 15, 16, 0.55);
          }

          .dms-head {
            flex-shrink: 0;
            display: flex;
            justify-content: center;
            padding: 52px 0 0;
          }
          .dms-brand {
            margin: 0;
            font-size: 13px;
            font-weight: 400;
            letter-spacing: 0.02em;
            color: var(--dms-scope-fg);
          }

          .dms-stage {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 28px;
            padding: 0 4px;
          }

          .dms-lyrics-btn {
            width: 100%;
            border: 0;
            background: transparent;
            padding: 0;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            font: inherit;
            color: inherit;
          }
          .dms-lyrics-btn:disabled {
            cursor: default;
          }

          .dms-lyrics-mask {
            width: 100%;
            -webkit-mask-image: linear-gradient(
              to bottom,
              transparent 0%,
              #000 22%,
              #000 78%,
              transparent 100%
            );
            mask-image: linear-gradient(
              to bottom,
              transparent 0%,
              #000 22%,
              #000 78%,
              transparent 100%
            );
          }

          .dms-lyrics {
            height: 84px;
            overflow-y: auto;
            overflow-x: hidden;
            scrollbar-width: none;
            scroll-behavior: smooth;
          }
          .dms-lyrics::-webkit-scrollbar { display: none; }

          .dms-flow {
            padding: 28px 8px;
          }
          .dms-line {
            margin: 0;
            text-align: center;
            font-size: 18px;
            font-weight: 400;
            line-height: 28px;
            letter-spacing: 0.01em;
            color: var(--dms-text-dim);
            transition: color 0.35s ease, opacity 0.35s ease;
          }
          .dms-line.near {
            color: var(--dms-text-near);
          }
          .dms-line.on {
            color: var(--dms-text);
          }
          .dms-empty {
            margin: 0;
            padding: 20px 12px;
            text-align: center;
            font-size: 16px;
            line-height: 1.5;
            color: var(--dms-text-near);
          }

          .dms-context {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            min-height: 40px;
          }
          .dms-scope {
            font-size: 13px;
            font-weight: 400;
            letter-spacing: 0.02em;
            color: var(--dms-scope-fg);
          }
          .dms-meta {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
          }
          .dms-meta-link {
            color: var(--dms-text-near);
            text-decoration: none;
          }
          .dms-meta-sep {
            color: var(--dms-text-dim);
          }

          .dms-controls {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 28px;
            padding-top: 8px;
          }
          .dms-ctl {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 0;
            border-radius: 999px;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            transition: transform 0.14s ease, opacity 0.14s ease;
          }
          .dms-ctl:active:not(:disabled) {
            transform: scale(0.96);
          }
          .dms-ctl:disabled {
            opacity: 0.35;
            cursor: default;
          }
          .dms-stop,
          .dms-close {
            width: 48px;
            height: 48px;
            background: var(--dms-ctl-bg);
            color: var(--dms-ctl-fg);
          }
          .dms-mic {
            width: 64px;
            height: 64px;
            background: var(--dms-mic-bg);
            color: var(--dms-mic-fg);
            box-shadow: 0 8px 28px -10px rgba(0, 0, 0, 0.45);
          }

          .dms-menu-backdrop {
            position: fixed; inset: 0; z-index: 520;
            background: rgba(0, 0, 0, 0.35);
            border: 0; padding: 0; cursor: default;
          }
          .dms-menu {
            position: fixed;
            top: calc(env(safe-area-inset-top, 0px) + 60px);
            right: 20px;
            z-index: 521;
            min-width: 220px;
            padding: 8px;
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 16px 48px rgba(15, 23, 42, 0.18);
            font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          }
          :global([data-theme="dark"]) .dms-menu,
          :global([data-theme="classic-dark"]) .dms-menu {
            background: #1c1c1e;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
          }
          .dms-menu-head {
            margin: 6px 10px 4px;
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--dms-scope-fg);
          }
          .dms-menu-item {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            min-height: 40px;
            padding: 0 12px;
            border: 0;
            border-radius: 10px;
            background: transparent;
            color: var(--dms-text);
            font: inherit;
            font-size: 14px;
            font-weight: 400;
            text-align: left;
            cursor: pointer;
          }
          .dms-menu-item.on {
            background: var(--dms-ctl-bg);
          }
          .dms-menu-item:active {
            background: var(--dms-ctl-bg);
          }
          :global([data-theme="light"]) .dms-mic,
          :global([data-theme="read"]) .dms-mic,
          :global([data-theme="pure-light"]) .dms-mic {
            box-shadow: 0 8px 24px -10px rgba(15, 15, 16, 0.28);
          }

          .dms :global(.cx-orb) {
            --cx-orb-bg: rgba(255, 255, 255, 0.1);
            --cx-orb-bg-active: rgba(255, 255, 255, 0.14);
            --cx-orb-fg: rgba(255, 255, 255, 0.88);
            box-shadow: none;
          }
          :global([data-theme="light"]) .dms :global(.cx-orb),
          :global([data-theme="read"]) .dms :global(.cx-orb),
          :global([data-theme="pure-light"]) .dms :global(.cx-orb) {
            --cx-orb-bg: #fff;
            --cx-orb-bg-active: #f8f8f8;
            --cx-orb-fg: #1c1c1e;
            box-shadow:
              0 2px 10px rgba(0, 0, 0, 0.07),
              0 1px 3px rgba(0, 0, 0, 0.04);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dms-line { transition: none; }
          .dms-lyrics { scroll-behavior: auto; }
        }
      `}</style>
    </div>
  )
}
