'use client'

/**
 * Ein Risiko im Detail: was es ist, warum Festag es erkannt hat, was es
 * betrifft — und die Maßnahme, die man daraus wählt.
 *
 * Die Belege sind kein Beiwerk. Sie sind der Grund, warum man der Einstufung
 * glauben kann, und stehen deshalb vor den Aktionen.
 */

import { useCallback, useEffect, useState } from 'react'
import { ArrowsClockwise, X } from '@phosphor-icons/react'
import FestagPillButton from '@/components/ui/FestagPillButton'
import TagroSpark from '@/components/dashboard/TagroSpark'
import { fmtAgo } from '@/components/risks/risks-shared'
import {
  categoryLabel,
  delayLabel,
  severityLabel,
  statusLabel,
} from '@/lib/risks/present'
import type { Risk, RiskEvent, RiskSignal } from '@/lib/risks/types'

type LinkedTask = { id: string; title: string; status?: string | null; dev_status?: string | null }

type Detail = {
  risk: Risk
  signals: RiskSignal[]
  tasks: LinkedTask[]
  events: RiskEvent[]
  project: { id: string; title: string } | null
  audience: 'client' | 'delivery'
}

type Props = {
  riskId: string
  onClose: () => void
  onChanged: (risk: Risk) => void
}

export default function RiskDrawer({ riskId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/risks/${riskId}`, { credentials: 'include' })
      const data = res.ok ? await res.json().catch(() => null) : null
      if (!res.ok || !data) throw new Error(data?.error || 'Risiko konnte nicht geladen werden.')
      setDetail(data as Detail)
      setError('')
    } catch (e: any) {
      setError(e?.message || 'Risiko konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [riskId])

  useEffect(() => { void load() }, [load])

  async function post(path: string, body?: Record<string, unknown>, label = 'action') {
    if (busy) return
    setBusy(label)
    setError('')
    try {
      const res = await fetch(`/api/risks/${riskId}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body ?? {}),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Aktion fehlgeschlagen')
      if (data?.risk) {
        setDetail(prev => (prev ? { ...prev, risk: data.risk } : prev))
        onChanged(data.risk)
      }
      await load()
      setNote('')
    } catch (e: any) {
      setError(e?.message || 'Aktion fehlgeschlagen')
    } finally {
      setBusy(null)
    }
  }

  const risk = detail?.risk
  const probability = typeof risk?.probability === 'number' ? Math.round(risk.probability * 100) : null
  const consequence = delayLabel(risk?.potential_delay_days)
  const isOpen = !!risk && !['resolved', 'dismissed', 'mitigated'].includes(risk.status)

  return (
    <div className="dec-overlay" role="dialog" aria-modal="true" aria-label={risk?.title || 'Risiko'}>
      <button type="button" className="dec-backdrop" aria-label="Schließen" onClick={onClose} />
      <aside className="dec-panel">
        <div className="dec-drawer-head">
          <div className="dec-drawer-meta">
            <span className="dec-kicker">Risiko</span>
            <span className="dec-saved">
              {detail?.project ? <>{detail.project.title} · </> : null}
              {risk ? `${categoryLabel(risk.category)} · ${severityLabel(risk.severity)} · ${statusLabel(risk.status)}` : '…'}
            </span>
          </div>
          <div className="dec-drawer-actions">
            <button type="button" className="dec-icon-btn" aria-label="Schließen" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="dec-drawer-body">
          {loading && !risk ? (
            <p className="dec-card-muted">Lade Risiko…</p>
          ) : !risk ? (
            <p className="rsk-error">{error || 'Risiko nicht gefunden.'}</p>
          ) : (
            <>
              <h2 className="dec-detail-title">{risk.title}</h2>
              <p className="rsk-body-text">{risk.description}</p>

              <div className="rsk-meta">
                <div className="rsk-meta-cell">
                  <span className="rsk-meta-label">Wahrscheinlichkeit</span>
                  <span className="rsk-meta-value">{probability !== null ? `${probability}%` : '—'}</span>
                </div>
                <div className="rsk-meta-cell">
                  <span className="rsk-meta-label">Auswirkung</span>
                  <span className="rsk-meta-value">{severityLabel(risk.impact)}</span>
                </div>
                <div className="rsk-meta-cell">
                  <span className="rsk-meta-label">Mögliche Folge</span>
                  <span className="rsk-meta-value">{consequence ?? 'nicht beziffert'}</span>
                </div>
              </div>

              {detail!.signals.length > 0 && (
                <section className="rsk-section">
                  <h3 className="rsk-section-title">Warum Festag das erkannt hat</h3>
                  <ul className="rsk-evidence">
                    {detail!.signals.map(signal => (
                      <li key={signal.id}>
                        <span className="rsk-evidence-dot" aria-hidden />
                        <span>
                          {signal.label}
                          {signal.occurrences > 1 ? ` (${signal.occurrences}×)` : ''}
                          {signal.detail ? <span className="rsk-evidence-detail">{signal.detail}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {detail!.tasks.length > 0 && (
                <section className="rsk-section">
                  <h3 className="rsk-section-title">Betroffen</h3>
                  <ul className="rsk-evidence">
                    {detail!.tasks.map(task => (
                      <li key={task.id}>
                        <span className="rsk-evidence-dot" aria-hidden />
                        <span>{task.title}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {risk.recommendation && (
                <div className="rsk-reco">
                  <p className="rsk-reco-title">Festag empfiehlt: {risk.recommendation}</p>
                  {risk.recommendation_reason && <p className="rsk-reco-why">{risk.recommendation_reason}</p>}
                </div>
              )}

              {isOpen && (
                <label className="dec-form-field" style={{ marginBottom: 14 }}>
                  <span>Notiz (optional)</span>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Was ist entschieden worden?"
                  />
                </label>
              )}

              <div className="rsk-actions">
                {isOpen && (
                  <>
                    <FestagPillButton
                      variant="primary"
                      disabled={!!busy}
                      onClick={() => void post('/respond', {
                        response: 'mitigate',
                        followed_recommendation: true,
                        note: note.trim() || undefined,
                      }, 'mitigate')}
                    >
                      {busy === 'mitigate' ? <ArrowsClockwise size={14} className="spin" /> : null}
                      Empfehlung übernehmen
                    </FestagPillButton>
                    <FestagPillButton
                      disabled={!!busy}
                      onClick={() => void post('/respond', {
                        response: 'delegate',
                        note: note.trim() || undefined,
                      }, 'delegate')}
                    >
                      Entscheidung anfordern
                    </FestagPillButton>
                    <FestagPillButton
                      disabled={!!busy}
                      onClick={() => void post('/respond', {
                        response: 'accept',
                        note: note.trim() || undefined,
                      }, 'accept')}
                    >
                      Bewusst akzeptieren
                    </FestagPillButton>
                    <FestagPillButton
                      disabled={!!busy}
                      onClick={() => void post('/status', { status: 'resolved', note: note.trim() || undefined }, 'resolved')}
                    >
                      Erledigt
                    </FestagPillButton>
                    <FestagPillButton
                      disabled={!!busy}
                      onClick={() => void post('/status', { status: 'dismissed', note: note.trim() || undefined }, 'dismissed')}
                    >
                      Verwerfen
                    </FestagPillButton>
                  </>
                )}
                {!isOpen && (
                  <FestagPillButton
                    disabled={!!busy}
                    onClick={() => void post('/status', { status: 'active' }, 'reopen')}
                  >
                    Wieder öffnen
                  </FestagPillButton>
                )}
                <FestagPillButton
                  disabled={!!busy}
                  onClick={() => void post('/analyze', {}, 'analyze')}
                >
                  {busy === 'analyze'
                    ? <ArrowsClockwise size={14} className="spin" />
                    : <TagroSpark size={13} />}
                  Mit Tagro analysieren
                </FestagPillButton>
              </div>

              {risk.decision_id && (
                <p className="rsk-note">
                  Dazu läuft eine Entscheidung —{' '}
                  <a className="dec-detail-link" href={`/decisions?open=${risk.decision_id}`}>öffnen</a>
                </p>
              )}
              {error && <p className="rsk-error">{error}</p>}

              {detail!.events.length > 0 && (
                <section className="rsk-section" style={{ marginTop: 24 }}>
                  <h3 className="rsk-section-title">Verlauf</h3>
                  <ul className="rsk-history">
                    {detail!.events.map(event => (
                      <li key={event.id}>
                        {event.summary}
                        <span className="rsk-history-when">{fmtAgo(event.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
