'use client'

/**
 * DashboardMobileStart — Figma App-Festag node 252:59 (1:1).
 * „Webapp Startbildschirm Ansicht Lightmode"
 */

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getVoicePreferences } from '@/lib/voice'

const ASSETS = {
  add: '/dashboard-mobile/add.svg',
  playBtn: '/dashboard-mobile/play-btn.svg',
  chevron: '/dashboard-mobile/chevron.svg',
  upload: '/dashboard-mobile/upload.svg',
  headerPill: '/dashboard-mobile/header-pill.svg',
} as const

type Props = {
  sentences: string[]
  busy?: boolean
  openDecisionsCount: number
  blockersCount: number
  onCreateReport: () => void
  onSearch?: () => void
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
  onCreateReport,
  onSearch,
}: Props) {
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<HTMLParagraphElement | null>(null)
  const cancelledRef = useRef(false)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const hasText = sentences.length > 0

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
    const body = bodyRef.current
    const flow = flowRef.current
    if (!body || !flow) return
    const span = flow.querySelector<HTMLElement>(`[data-i="${active}"]`)
    if (!span) return
    const target = span.offsetTop + span.offsetHeight / 2 - body.clientHeight / 2
    body.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [active])

  const stopAll = useCallback(() => {
    cancelledRef.current = true
    try { window.speechSynthesis.cancel() } catch {}
    setPlaying(false)
    setPaused(false)
  }, [])

  useEffect(() => () => { stopAll() }, [stopAll])
  useEffect(() => { stopAll(); setActive(-1) }, [sentences.join('\n')]) // eslint-disable-line react-hooks/exhaustive-deps

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
    speakFrom(Math.max(0, active === -1 ? 0 : active))
  }

  function openSearch() {
    if (onSearch) { onSearch(); return }
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  const decisionsTitle = openDecisionsCount === 0
    ? 'Keine offenen Entscheidungen'
    : openDecisionsCount === 1
      ? '1 offene Entscheidung'
      : `${openDecisionsCount} offene Entscheidungen`

  const blockersTitle = blockersCount === 0
    ? 'Keine aktiven Blocker'
    : blockersCount === 1
      ? '1 aktiver Blocker'
      : `${blockersCount} aktive Blocker`

  return (
    <div className="dms" data-node-id="252:59" role="main" aria-label="Gesamtbericht">
      <h1 className="dms-title" data-node-id="252:93">Gesamtbericht</h1>

      <button type="button" className="dms-head-pill" aria-label="Suchen und Menü" onClick={openSearch}>
        <Image src={ASSETS.headerPill} alt="" width={90} height={45} priority />
      </button>

      <div className="dms-wave" data-node-id="252:61" aria-hidden>
        {Array.from({ length: 30 }).map((_, i) => <span key={i} />)}
      </div>

      <div className="dms-prompter-wrap">
        <div className="dms-text-fade" aria-hidden />
        <div className="dms-prompter" ref={bodyRef}>
          {hasText ? (
            <p className="dms-flow" ref={flowRef} data-node-id="252:60">
              {sentences.map((s, i) => (
                <span key={i} data-i={i} className={`dms-s${i === active ? ' on' : ''}`}>
                  {s}{' '}
                </span>
              ))}
            </p>
          ) : (
            <p className="dms-empty">
              {busy ? 'Tagro schreibt den Statusbericht …' : 'Noch kein Statusbericht — unten erstellen.'}
            </p>
          )}
        </div>
      </div>

      <section className="dms-sheet" data-node-id="252:98" aria-label="Status">
        <div className="dms-grip" data-node-id="252:99" aria-hidden />

        <div className="dms-sheet-body" data-node-id="252:100">
          <div className="dms-row" data-node-id="252:101">
            <p className="dms-row-title" data-node-id="252:103">{decisionsTitle}</p>
            <Link href="/decisions" className="dms-row-link" data-node-id="252:104">
              <span>Entscheidungen ansehen</span>
              <Image src={ASSETS.chevron} alt="" width={4} height={7} />
            </Link>
          </div>
          <div className="dms-row" data-node-id="252:107">
            <p className="dms-row-title" data-node-id="252:109">{blockersTitle}</p>
            <Link href="/decisions?tone=risk" className="dms-row-link" data-node-id="252:110">
              <span>Entscheidungen ansehen</span>
              <Image src={ASSETS.chevron} alt="" width={4} height={7} />
            </Link>
          </div>
        </div>

        <button type="button" className="dms-upload" data-node-id="252:120" aria-label="Bericht teilen">
          <Image src={ASSETS.upload} alt="" width={24} height={24} />
        </button>
      </section>

      <footer className="dms-actions" data-node-id="252:294">
        <button
          type="button"
          className="dms-create"
          data-node-id="252:295"
          onClick={onCreateReport}
          disabled={busy}
        >
          <Image src={ASSETS.add} alt="" width={24} height={24} />
          <span>Statusbericht erstellen</span>
        </button>
        <button
          type="button"
          className="dms-play"
          data-node-id="252:299"
          onClick={togglePlay}
          disabled={!hasText || !supported}
          aria-label={playing ? 'Pausieren' : 'Bericht anhören'}
        >
          <Image src={ASSETS.playBtn} alt="" width={60} height={60} />
        </button>
      </footer>

      <style jsx>{`
        .dms {
          display: none;
        }

        @media (max-width: 768px) {
          .dms {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 500;
            width: 100%;
            max-width: 402px;
            margin: 0 auto;
            background: rgba(252, 252, 252, 0.9);
            font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
            color: #202532;
            overflow: hidden;
            padding-top: env(safe-area-inset-top, 0px);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }

          /* 252:93 — Gesamtbericht */
          .dms-title {
            position: absolute;
            left: 24px;
            top: calc(24px + env(safe-area-inset-top, 0px));
            margin: 0;
            font-size: 25px;
            font-weight: 400;
            line-height: 35px;
            color: #202532;
            white-space: nowrap;
          }

          /* 252:288 — header pill */
          .dms-head-pill {
            position: absolute;
            right: 24px;
            top: calc(24px + env(safe-area-inset-top, 0px));
            width: 90px;
            height: 45px;
            padding: 0;
            border: 0;
            background: transparent;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
          }

          /* 252:61 — waveform */
          .dms-wave {
            position: absolute;
            left: 63px;
            top: 205px;
            width: 267px;
            height: 40px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px;
            overflow: hidden;
            pointer-events: none;
            -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 18%, #000 46%, transparent 100%);
            mask-image: linear-gradient(to right, transparent 0%, #000 18%, #000 46%, transparent 100%);
          }
          .dms-wave span {
            width: 2px;
            height: 20px;
            border-radius: 12px;
            background: #cacfd4;
            flex-shrink: 0;
          }

          /* 252:60 + 252:123 — teleprompter */
          .dms-prompter-wrap {
            position: absolute;
            left: 0;
            right: 0;
            top: 153px;
            bottom: 280px;
          }
          .dms-text-fade {
            position: absolute;
            right: -20%;
            top: 0;
            width: 70%;
            height: 238px;
            pointer-events: none;
            background: linear-gradient(90deg, transparent 0%, rgba(252, 252, 252, 0.85) 55%, rgba(252, 252, 252, 0.98) 100%);
          }
          .dms-prompter {
            position: absolute;
            inset: 119px 0 0;
            overflow-y: auto;
            scrollbar-width: none;
            padding: 0 22px;
            -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 20%, #000 60%, transparent 92%);
            mask-image: linear-gradient(to bottom, transparent 0, #000 20%, #000 60%, transparent 92%);
          }
          .dms-prompter::-webkit-scrollbar { display: none; }
          .dms-flow {
            margin: 0 auto;
            max-width: 358px;
            text-align: center;
            font-size: 25px;
            font-weight: 400;
            line-height: 45px;
            letter-spacing: 0.28px;
            color: rgba(148, 154, 160, 0.4);
            padding: 8vh 0 12vh;
          }
          .dms-s { transition: color .35s ease; }
          .dms-s.on { color: #2e2f33; }
          .dms-empty {
            margin: 0;
            padding: 40px 24px;
            text-align: center;
            font-size: 16px;
            line-height: 1.5;
            color: #90959f;
          }

          /* 252:98 — bottom sheet */
          .dms-sheet {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 246px;
            background: rgba(252, 252, 252, 0.7);
            border-radius: 32px 32px 0 0;
            box-shadow: 0px -2px 4px rgba(144, 149, 159, 0.07);
            padding: 10px 24px 0;
          }
          .dms-grip {
            width: 48px;
            height: 5px;
            margin: 0 auto 22px;
            border-radius: 24px;
            background: rgba(144, 149, 159, 0.25);
          }
          .dms-sheet-body {
            display: flex;
            flex-direction: column;
            gap: 16px;
            max-width: 297px;
          }
          .dms-row { display: flex; flex-direction: column; gap: 4px; }
          .dms-row-title {
            margin: 0;
            font-size: 18px;
            font-weight: 500;
            line-height: 25px;
            color: #0f0f10;
          }
          .dms-row-link {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            font-weight: 400;
            letter-spacing: 0.24px;
            color: #90959f;
            text-decoration: none;
          }

          /* 252:120 — upload */
          .dms-upload {
            position: absolute;
            right: 26px;
            top: 127px;
            width: 28px;
            height: 28px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            border: 0;
            border-radius: 32px;
            background: rgba(251, 251, 255, 0.2);
            box-shadow: 0px 4px 4px rgba(91, 100, 125, 0.25);
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
          }

          /* 252:294 — bottom actions */
          .dms-actions {
            position: absolute;
            left: 24px;
            right: 24px;
            bottom: calc(18px + env(safe-area-inset-bottom, 0px));
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 2;
          }
          .dms-create {
            flex: 1 1 auto;
            max-width: 282px;
            display: inline-flex;
            align-items: center;
            gap: 30px;
            height: 60px;
            padding: 18px 22px;
            border: 0;
            border-radius: 32px;
            background: #fff;
            color: #6e6f71;
            font: inherit;
            font-size: 16px;
            font-weight: 400;
            box-shadow: 0px 2px 2px 0.5px rgba(144, 149, 159, 0.07);
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
          }
          .dms-create:disabled { opacity: .55; cursor: not-allowed; }
          .dms-create span { white-space: nowrap; }
          .dms-play {
            flex-shrink: 0;
            width: 60px;
            height: 60px;
            padding: 0;
            border: 0;
            background: transparent;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
          }
          .dms-play:disabled { opacity: .4; cursor: not-allowed; }
        }

        @media (prefers-reduced-motion: reduce) {
          .dms-s { transition: none; }
        }
      `}</style>
    </div>
  )
}
