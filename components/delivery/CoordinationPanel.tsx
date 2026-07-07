'use client'

/**
 * Delivery Coordination Panel — shared dev/client surface for the
 * request → propose → decide → complete loop without email/WhatsApp.
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, ArrowsClockwise, Broadcast, PaperPlaneTilt, Scales, Sparkle,
} from '@phosphor-icons/react'
import { COORDINATION_CSS } from '@/components/delivery/coordination-styles'
import { useCoordinationState } from '@/hooks/useCoordinationState'
import { openTagro } from '@/components/TagroOverlay'
import type { CoordinationEvent } from '@/lib/delivery/coordination-types'

type Mode = 'dev' | 'client'

type Props = {
  mode: Mode
  projectId: string
  taskId?: string | null
  taskTitle?: string | null
  compact?: boolean
}

function actorLabel(actor: CoordinationEvent['actor']) {
  if (actor === 'client') return 'K'
  if (actor === 'dev') return 'D'
  if (actor === 'tagro') return 'T'
  return '·'
}

function fmtAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  return new Date(iso).toLocaleDateString('de-DE')
}

export default function CoordinationPanel({
  mode,
  projectId,
  taskId,
  taskTitle,
  compact = false,
}: Props) {
  const { state, loading, error, reload } = useCoordinationState(projectId, taskId)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Dev propose form
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState('')
  const [recommendation, setRecommendation] = useState('')

  // Client intake form
  const [requestTitle, setRequestTitle] = useState(taskTitle || '')
  const [requestBody, setRequestBody] = useState('')

  async function submitDevPropose() {
    if (!question.trim()) return
    setBusy(true)
    setLocalError(null)
    setSuccess(null)
    try {
      const optionList = options
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4)

      const res = await fetch('/api/delivery/coordinate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'dev_propose',
          projectId,
          taskId: taskId ?? undefined,
          question: question.trim(),
          suggestedOptions: optionList.length ? optionList : undefined,
          recommendation: recommendation.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Senden fehlgeschlagen')

      setSuccess('Vorschlag an den Kunden gesendet — Tagro hat die Abstimmung gerahmt.')
      setQuestion('')
      setOptions('')
      setRecommendation('')
      await reload()
    } catch (e: any) {
      setLocalError(e?.message || 'Fehler beim Senden')
    } finally {
      setBusy(false)
    }
  }

  async function submitClientRequest() {
    if (!requestTitle.trim()) return
    setBusy(true)
    setLocalError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/delivery/coordinate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'intake_client_request',
          projectId,
          title: requestTitle.trim(),
          description: requestBody.trim() || undefined,
          workType: 'design',
          source: 'client_portal',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Anfrage fehlgeschlagen')

      setSuccess('Anfrage an das Team gesendet — du wirst im Statusbericht informiert.')
      setRequestBody('')
      await reload()
    } catch (e: any) {
      setLocalError(e?.message || 'Fehler')
    } finally {
      setBusy(false)
    }
  }

  const events = state?.events ?? []
  const pendingClient = state?.pendingClientActions ?? 0
  const pendingDev = state?.pendingDevActions ?? 0

  return (
    <section className="coord-panel">
      <style>{COORDINATION_CSS}</style>

      <div className="coord-head">
        <div>
          <p className="coord-kicker">
            <Broadcast size={13} weight="fill" />
            Delivery Coordination
          </p>
          <h3 className="coord-title">
            {mode === 'dev' ? 'Abstimmung mit dem Kunden' : 'Änderung anfragen'}
          </h3>
          <p className="coord-sub">
            {mode === 'dev'
              ? 'Vorschläge, Entscheidungen und Umsetzung — Tagro übersetzt, beide Seiten sehen alles in Benachrichtigungen und Statusbericht.'
              : 'Ohne E-Mail oder WhatsApp — dein Team und Tagro koordinieren den Rest.'}
          </p>
        </div>
        {!compact && (
          <div className="coord-metrics">
            <div className="coord-metric">
              <strong>{pendingDev}</strong>
              <span>Dev offen</span>
            </div>
            <div className="coord-metric">
              <strong>{pendingClient}</strong>
              <span>Kunde offen</span>
            </div>
          </div>
        )}
      </div>

      <div className="coord-flow" aria-hidden>
        <span>{mode === 'dev' ? 'Dev-Vorschlag' : 'Kundenwunsch'}</span>
        <ArrowRight size={11} />
        <span><Sparkle size={11} weight="fill" /> Tagro</span>
        <ArrowRight size={11} />
        <span>Entscheidung</span>
        <ArrowRight size={11} />
        <span>Statusbericht</span>
      </div>

      {loading ? (
        <p className="coord-empty">Koordination wird geladen…</p>
      ) : error ? (
        <p className="coord-empty">{error}</p>
      ) : events.length === 0 ? (
        <p className="coord-empty">
          {mode === 'dev'
            ? 'Noch keine Koordinations-Ereignisse — starte mit einem Vorschlag an den Kunden.'
            : 'Noch keine Anfragen — beschreibe kurz, was geändert werden soll.'}
        </p>
      ) : (
        <div className="coord-timeline">
          {events.slice(0, compact ? 4 : 10).map((ev) => (
            <div
              key={ev.id}
              className={`coord-event${ev.actionable ? ' is-actionable' : ''}`}
            >
              <div className={`coord-event-dot actor-${ev.actor}`}>
                {actorLabel(ev.actor)}
              </div>
              <div className="coord-event-body">
                <h4>{ev.title}</h4>
                {ev.body && <p>{ev.body}</p>}
                {ev.link && mode === 'dev' && ev.link.startsWith('/dev') && (
                  <Link href={ev.link} style={{ fontSize: 11, color: 'var(--accent)' }}>
                    Öffnen
                  </Link>
                )}
                {ev.link && mode === 'client' && ev.link.startsWith('/decisions') && (
                  <Link href={ev.link} style={{ fontSize: 11, color: 'var(--accent)' }}>
                    Entscheiden
                  </Link>
                )}
              </div>
              <span className="coord-event-meta">{fmtAgo(ev.timestamp)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="coord-compose">
        {localError && <p className="coord-error">{localError}</p>}
        {success && <p className="coord-success">{success}</p>}

        {mode === 'dev' ? (
          <>
            <label htmlFor="coord-question">Vorschlag an den Kunden</label>
            <input
              id="coord-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="z. B. Visitenkarten: Farbe dunkler, Logo 10 % kleiner"
              maxLength={240}
            />
            <input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="Optionen (durch | getrennt), z. B. Dunkler | Heller | Wie bisher"
            />
            <input
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="Tagro-Empfehlung (optional), z. B. Dunkler wirkt professioneller"
            />
            <div className="coord-compose-row">
              <button
                type="button"
                className="coord-btn"
                disabled={busy || !question.trim()}
                onClick={() => void submitDevPropose()}
              >
                <PaperPlaneTilt size={14} />
                An Kunden senden
              </button>
              <button
                type="button"
                className="coord-btn tagro"
                disabled={busy}
                onClick={() => openTagro({
                  contextType: 'task',
                  id: taskId ?? undefined,
                  projectId,
                  title: taskTitle ?? 'Aufgabe',
                  prefill: question.trim()
                    ? `Formuliere präzise Kunden-Optionen für: ${question.trim()}`
                    : 'Hilf mir, Kunden-Optionen für diese Design-Änderung zu formulieren.',
                })}
              >
                <Sparkle size={14} weight="fill" />
                Mit Tagro formulieren
              </button>
              <button
                type="button"
                className="coord-btn ghost"
                disabled={loading}
                onClick={() => void reload()}
              >
                <ArrowsClockwise size={14} />
              </button>
              <Link href="/dev/decisions" className="coord-btn ghost" style={{ textDecoration: 'none' }}>
                <Scales size={14} />
                Alle Entscheidungen
              </Link>
            </div>
          </>
        ) : (
          <>
            <label htmlFor="coord-request">Änderung beschreiben</label>
            <input
              id="coord-request"
              value={requestTitle}
              onChange={(e) => setRequestTitle(e.target.value)}
              placeholder="z. B. Visitenkarten: Farbe anpassen"
              maxLength={200}
            />
            <textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              placeholder="Was genau soll anders werden? Farbe, Größe, Logo, Text…"
              rows={3}
            />
            <div className="coord-compose-row">
              <button
                type="button"
                className="coord-btn"
                disabled={busy || !requestTitle.trim()}
                onClick={() => void submitClientRequest()}
              >
                <PaperPlaneTilt size={14} />
                An Team senden
              </button>
              <button
                type="button"
                className="coord-btn tagro"
                disabled={busy}
                onClick={() => openTagro({
                  contextType: 'project',
                  id: projectId,
                  prefill: requestTitle.trim()
                    ? `Ich möchte folgende Änderung: ${requestTitle.trim()}${requestBody.trim() ? ` — ${requestBody.trim()}` : ''}`
                    : 'Ich habe eine Design-Änderung — hilf mir, sie präzise zu formulieren.',
                })}
              >
                <Sparkle size={14} weight="fill" />
                Mit Tagro formulieren
              </button>
              <Link href="/decisions" className="coord-btn ghost" style={{ textDecoration: 'none' }}>
                <Scales size={14} />
                Entscheidungen
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
