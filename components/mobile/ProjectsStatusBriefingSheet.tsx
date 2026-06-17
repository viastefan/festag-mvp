'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowClockwise, Pause, Play, Square, X } from '@phosphor-icons/react'
import TagroDiamondDots from '@/components/dashboard/TagroDiamondDots'
import { openTagro } from '@/components/TagroOverlay'
import {
  briefingDurationLabel,
  buildProjectsOverallFallback,
  normalizeClientReport,
  splitBriefingSentences,
  type ClientStatusReport,
} from '@/lib/client/status-briefing'
import { getVoicePreferences } from '@/lib/voice'

type ProjectLite = { id: string; status?: string | null }
type TaskLite = { project_id?: string | null; status?: string | null }

type Props = {
  open: boolean
  onClose: () => void
  projects: ProjectLite[]
  tasks: TaskLite[]
  stale?: boolean
}

function pickGermanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  const prefs = getVoicePreferences()
  if (prefs.voiceId) {
    const exact = voices.find((v) => `${v.name}__${v.lang}` === prefs.voiceId)
    if (exact) return exact
  }
  return [...voices]
    .filter((v) => v.lang.toLowerCase().startsWith('de'))
    .sort((a, b) => Number(b.localService) - Number(a.localService))[0] ?? null
}

export default function ProjectsStatusBriefingSheet({
  open,
  onClose,
  projects,
  tasks,
  stale = false,
}: Props) {
  const [report, setReport] = useState<ClientStatusReport | null>(null)
  const [revealed, setRevealed] = useState('')
  const [busy, setBusy] = useState(false)
  const [writing, setWriting] = useState(false)
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<HTMLDivElement | null>(null)
  const cancelledRef = useRef(false)
  const writeToken = useRef(0)
  const loadedRef = useRef(false)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const fallback = useMemo(() => buildProjectsOverallFallback(projects, tasks), [projects, tasks])
  const fullText = (revealed.trim() || report?.summary?.trim() || fallback).trim()
  const sentences = useMemo(() => splitBriefingSentences(fullText), [fullText])
  const hasText = sentences.length > 0
  const speaking = playing || writing || busy
  const displayActive = (playing || paused) && active >= 0 ? active : -1
  const durationLabel = briefingDurationLabel(fullText)

  const stamp = report?.createdAt
    ? new Date(report.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null

  const stopSpeech = useCallback(() => {
    cancelledRef.current = true
    try { window.speechSynthesis.cancel() } catch {}
    setPlaying(false)
    setPaused(false)
    setActive(-1)
  }, [])

  async function streamText(text: string) {
    const token = ++writeToken.current
    setWriting(true)
    setRevealed('')
    const parts = text.split(/(\s+)/)
    let acc = ''
    for (const part of parts) {
      if (writeToken.current !== token) return
      acc += part
      setRevealed(acc)
      await new Promise((r) => setTimeout(r, part.trim() ? 18 : 8))
    }
    if (writeToken.current === token) setWriting(false)
  }

  const refreshReport = useCallback(async (force = true) => {
    if (busy) return
    setBusy(true)
    stopSpeech()
    try {
      if (!force) {
        const cached = await fetch('/api/client/status-now?scope=overall', { method: 'GET' })
        const cachedData = await cached.json().catch(() => ({}))
        if (cachedData?.report?.summary) {
          const normalized = normalizeClientReport(cachedData.report)
          setReport(normalized)
          await streamText(normalized.summary)
          return
        }
      }

      const res = await fetch('/api/client/status-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'overall' }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.report?.summary) {
        const normalized = normalizeClientReport(data.report)
        setReport(normalized)
        await streamText(normalized.summary)
      } else {
        setReport(null)
        await streamText(fallback)
      }
    } catch {
      setReport(null)
      await streamText(fallback)
    } finally {
      setBusy(false)
    }
  }, [busy, fallback, stopSpeech])

  useEffect(() => {
    if (!open) {
      loadedRef.current = false
      stopSpeech()
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!loadedRef.current) {
      loadedRef.current = true
      void refreshReport(false)
    }
    return () => {
      document.body.style.overflow = prev
      stopSpeech()
    }
  }, [open, refreshReport, stopSpeech])

  useEffect(() => {
    const body = bodyRef.current
    const flow = flowRef.current
    if (!body || !flow) return
    const line = flow.querySelector<HTMLElement>(`[data-i="${displayActive}"]`)
    if (!line) return
    const target = line.offsetTop + line.offsetHeight / 2 - body.clientHeight / 2
    body.scrollTo({ top: Math.max(0, target), behavior: playing ? 'smooth' : 'auto' })
  }, [displayActive, playing])

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
    if (!supported || !hasText || writing || busy) return
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

  if (!open) return null

  return (
    <div className="psb-wrap" role="dialog" aria-modal="true" aria-label="Statusbericht aller Projekte">
      <button type="button" className="psb-backdrop" aria-label="Schließen" onClick={onClose} />
      <div className="psb-sheet">
        <div className="psb-grip" aria-hidden />
        <header className="psb-head">
          <div>
            <p className="psb-kicker">Gesamtbericht</p>
            <h2>Status aller Projekte</h2>
          </div>
          <button type="button" className="psb-x" onClick={onClose} aria-label="Schließen">
            <X size={16} />
          </button>
        </header>

        {stale && !busy && (
          <button type="button" className="psb-stale" onClick={() => { void refreshReport(true) }}>
            Neue Signale von Dev oder Tagro · Aktualisieren
          </button>
        )}

        <div className="psb-stage">
          <TagroDiamondDots active={speaking} size={48} />

          <div className="psb-lyrics-mask">
            <div className="psb-lyrics" ref={bodyRef}>
              {hasText ? (
                <div className="psb-flow" ref={flowRef}>
                  {sentences.map((s, i) => (
                    <p
                      key={i}
                      data-i={i}
                      className={`psb-line${
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
                <p className="psb-empty">
                  {busy || writing ? 'Tagro schreibt den Statusbericht …' : 'Noch kein Bericht verfügbar.'}
                </p>
              )}
            </div>
          </div>

          <div className="psb-meta">
            <span>{stamp ? `Stand ${stamp}` : 'Alle Projekte'}</span>
            {hasText && <span>{durationLabel}</span>}
          </div>
        </div>

        <footer className="psb-bar">
          <button
            type="button"
            className="psb-btn psb-refresh"
            onClick={() => { void refreshReport(true) }}
            disabled={busy || writing}
          >
            <ArrowClockwise size={16} weight="bold" />
            <span>Neu erstellen</span>
          </button>
          <button
            type="button"
            className="psb-btn psb-play"
            onClick={togglePlay}
            disabled={!hasText || !supported || busy || writing}
            aria-label={playing ? 'Pausieren' : 'Bericht anhören'}
          >
            {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
          </button>
          <button
            type="button"
            className="psb-btn psb-stop"
            onClick={stopSpeech}
            disabled={!playing && !paused}
            aria-label="Stoppen"
          >
            <Square size={14} weight="fill" />
          </button>
          <button
            type="button"
            className="psb-btn psb-tagro"
            onClick={() => openTagro({ contextType: 'status_report', id: 'projects', title: 'Status aller Projekte' })}
          >
            Mit Tagro
          </button>
        </footer>
      </div>

      <style jsx>{`
        .psb-wrap {
          position: fixed;
          inset: 0;
          z-index: 16100;
          display: flex;
          align-items: flex-end;
        }
        .psb-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          padding: 0;
          background: rgba(8, 10, 14, 0.42);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          cursor: default;
        }
        .psb-sheet {
          position: relative;
          width: 100%;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          background: #fcfcfc;
          color: #0f0f10;
          border-radius: 28px 28px 0 0;
          padding: 8px 18px calc(16px + env(safe-area-inset-bottom, 0px));
          box-shadow: 0 -24px 60px -18px rgba(15, 23, 42, 0.28);
          animation: psbUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
        }
        :global([data-theme="dark"]) .psb-sheet,
        :global([data-theme="classic-dark"]) .psb-sheet {
          background: #141416;
          color: #f4f4f4;
          box-shadow: 0 -24px 60px -18px rgba(0, 0, 0, 0.55);
        }
        @keyframes psbUp {
          from { transform: translateY(28px); opacity: 0.55; }
          to { transform: translateY(0); opacity: 1; }
        }
        .psb-grip {
          width: 40px;
          height: 4px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.12);
          margin: 4px auto 14px;
          flex-shrink: 0;
        }
        :global([data-theme="dark"]) .psb-grip,
        :global([data-theme="classic-dark"]) .psb-grip {
          background: rgba(255, 255, 255, 0.18);
        }
        .psb-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          flex-shrink: 0;
        }
        .psb-kicker {
          margin: 0 0 4px;
          font-size: 12px;
          font-weight: 400;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #90959f;
        }
        .psb-head h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .psb-x {
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.05);
          color: #555;
          cursor: pointer;
          flex-shrink: 0;
        }
        :global([data-theme="dark"]) .psb-x,
        :global([data-theme="classic-dark"]) .psb-x {
          background: rgba(255, 255, 255, 0.08);
          color: #aaa;
        }
        .psb-stale {
          width: 100%;
          margin: 0 0 10px;
          padding: 10px 12px;
          border: 1px solid rgba(91, 100, 125, 0.16);
          border-radius: 12px;
          background: rgba(91, 100, 125, 0.08);
          color: #5b647d;
          font: inherit;
          font-size: 13px;
          font-weight: 400;
          text-align: left;
          cursor: pointer;
        }
        .psb-stage {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          padding: 8px 0 12px;
        }
        .psb-stage :global(.tdd-dot) {
          background: #1c1c1e;
        }
        :global([data-theme="dark"]) .psb-stage :global(.tdd-dot),
        :global([data-theme="classic-dark"]) .psb-stage :global(.tdd-dot) {
          background: #f4f4f4;
        }
        .psb-lyrics-mask {
          width: 100%;
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 18%, #000 82%, transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0%, #000 18%, #000 82%, transparent 100%);
        }
        .psb-lyrics {
          height: 132px;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          scroll-behavior: smooth;
        }
        .psb-lyrics::-webkit-scrollbar { display: none; }
        .psb-flow { padding: 18px 8px; }
        .psb-line {
          margin: 0;
          text-align: center;
          font-size: 17px;
          font-weight: 400;
          line-height: 1.55;
          letter-spacing: 0.005em;
          color: rgba(15, 15, 16, 0.24);
          transition: color 0.3s ease;
        }
        .psb-line.near { color: rgba(15, 15, 16, 0.42); }
        .psb-line.on { color: #0f0f10; }
        :global([data-theme="dark"]) .psb-line,
        :global([data-theme="classic-dark"]) .psb-line {
          color: rgba(244, 244, 244, 0.24);
        }
        :global([data-theme="dark"]) .psb-line.near,
        :global([data-theme="classic-dark"]) .psb-line.near {
          color: rgba(244, 244, 244, 0.42);
        }
        :global([data-theme="dark"]) .psb-line.on,
        :global([data-theme="classic-dark"]) .psb-line.on {
          color: #f4f4f4;
        }
        .psb-empty {
          margin: 0;
          padding: 28px 12px;
          text-align: center;
          font-size: 15px;
          line-height: 1.5;
          color: #90959f;
        }
        .psb-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 12px;
          color: #90959f;
        }
        .psb-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          padding-top: 4px;
        }
        .psb-btn {
          border: 0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: inherit;
          font-size: 14px;
          font-weight: 400;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.12s ease, opacity 0.12s ease;
        }
        .psb-btn:active:not(:disabled) { transform: scale(0.97); }
        .psb-btn:disabled { opacity: 0.38; cursor: default; }
        .psb-refresh {
          flex: 1 1 auto;
          min-width: 0;
          height: 48px;
          padding: 0 16px;
          background: #fff;
          color: #2a3032;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 1),
            0 2px 8px rgba(144, 149, 159, 0.12);
        }
        :global([data-theme="dark"]) .psb-refresh,
        :global([data-theme="classic-dark"]) .psb-refresh {
          background: rgba(255, 255, 255, 0.08);
          color: #f4f4f4;
          border-color: rgba(255, 255, 255, 0.1);
        }
        .psb-play,
        .psb-stop {
          width: 48px;
          height: 48px;
          background: #5b647d;
          color: #fff;
          flex-shrink: 0;
        }
        .psb-stop {
          background: rgba(0, 0, 0, 0.06);
          color: #2a3032;
        }
        :global([data-theme="dark"]) .psb-stop,
        :global([data-theme="classic-dark"]) .psb-stop {
          background: rgba(255, 255, 255, 0.1);
          color: #f4f4f4;
        }
        .psb-tagro {
          height: 48px;
          padding: 0 16px;
          background: #1c1c1e;
          color: #fff;
          flex-shrink: 0;
        }
        :global([data-theme="dark"]) .psb-tagro,
        :global([data-theme="classic-dark"]) .psb-tagro {
          background: #fff;
          color: #121214;
        }
      `}</style>
    </div>
  )
}
