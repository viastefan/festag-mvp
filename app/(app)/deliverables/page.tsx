'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowsClockwise, Check, ChatCircle, DownloadSimple, FilmStrip, Package, WarningCircle, X,
} from '@phosphor-icons/react'
import MobilePageHeader from '@/components/MobilePageHeader'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { CLIENT_DELIVERABLES_CSS } from '@/components/client/client-deliverables-styles'
import { fetchJson } from '@/lib/portal/fetch-api'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import {
  DEMO_CLIENT_TIMELINE,
  DEMO_DELIVERABLES,
  shouldUseDemoFallback,
} from '@/lib/demo/portal-preview'
import type { ClientDeliverable } from '@/lib/client/deliverables'
import type { ClientTimelineItem } from '@/lib/client/timeline'

type Tab = 'deliverables' | 'timeline'

function fmtWhen(iso: string) {
  try {
    const d = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  } catch {
    return ''
  }
}

const KIND_LABEL: Record<string, string> = {
  signal: 'Update',
  deliverable: 'Lieferung',
  task: 'Fortschritt',
  meeting: 'Meeting',
  approval: 'Freigabe',
}

export default function DeliverablesPage() {
  const [tab, setTab] = useState<Tab>('deliverables')
  const [deliverables, setDeliverables] = useState<ClientDeliverable[]>([])
  const [timeline, setTimeline] = useState<ClientTimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [feedbackId, setFeedbackId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [delRes, tlRes] = await Promise.all([
      fetchJson<{ items: ClientDeliverable[] }>('/api/client/deliverables'),
      fetchJson<{ items: ClientTimelineItem[] }>('/api/client/timeline?limit=40'),
    ])
    if (delRes.ok) {
      setDeliverables(delRes.data?.items ?? [])
      setIsDemo(false)
    } else if (shouldUseDemoFallback(delRes.status)) {
      setDeliverables(DEMO_DELIVERABLES)
      setTimeline(DEMO_CLIENT_TIMELINE)
      setIsDemo(true)
      setError(null)
    } else {
      setError(delRes.error || 'Lieferungen konnten nicht geladen werden.')
      setIsDemo(false)
    }
    if (tlRes.ok && !shouldUseDemoFallback(delRes.status)) setTimeline(tlRes.data?.items ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function patchDeliverable(id: string, body: object) {
    if (isDemo) {
      setError('In der Beispielansicht sind Aktionen deaktiviert — bitte anmelden.')
      return
    }
    setBusyId(id)
    try {
      const res = await fetch(`/api/client/deliverables/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Aktion fehlgeschlagen')
      }
      setFeedbackId(null)
      setFeedbackText('')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Aktion fehlgeschlagen')
    } finally {
      setBusyId(null)
    }
  }

  const pending = deliverables.filter(d => d.approval_status === 'awaiting_review')

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{CLIENT_DELIVERABLES_CSS}</style>
      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <div className="dec-legacy-mph">
            <MobilePageHeader
              title="Lieferungen"
              menuItems={[
                { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
                { id: 'captures', label: 'Freigaben', href: '/captures' },
              ]}
            />
          </div>

          <header className="dec-page-head">
            <div className="dec-page-head-copy dec-m-title">
              <h1 className="dec-page-title">
                <span className="dec-dt">Lieferungen</span>
                <span className="dec-m-t">Lieferungen</span>
              </h1>
              <p className="dec-m-subline">
                <span className="dec-m-t dec-m-sub">
                  {loading ? 'Lade…' : `${deliverables.length} Lieferungen · ${pending.length} zur Freigabe`}
                </span>
              </p>
              <div className="dec-page-lead dec-dt">
                <p className="dec-page-lead-line">
                  Tagro übersetzt Team-Arbeit in klare Lieferungen — Freigabe, Verlauf und Fortschritt an einem Ort.
                </p>
              </div>
            </div>
            <div className="dec-m-head-actions">
              <CodexMobileActionPill
                onMenu={() => setNavOpen(true)}
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              />
            </div>
            <div className="dec-page-actions dec-dt">
              <button type="button" className="dec-head-tool" onClick={() => void load()} aria-label="Aktualisieren">
                <ArrowsClockwise size={15} />
              </button>
            </div>
          </header>
        </div>

        <div className="dec-scroll-body">
          {isDemo && <DemoPreviewBanner />}

          <div className="cd-tabs">
            <button type="button" className={`cd-tab${tab === 'deliverables' ? ' on' : ''}`} onClick={() => setTab('deliverables')}>
              <Package size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              Lieferungen
            </button>
            <button type="button" className={`cd-tab${tab === 'timeline' ? ' on' : ''}`} onClick={() => setTab('timeline')}>
              <FilmStrip size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              Projektverlauf
            </button>
          </div>

          {error && (
            <div className="dec-empty">
              <WarningCircle size={16} />
              <p>{error}</p>
              <button type="button" className="dec-cta" style={{ marginTop: 12 }} onClick={() => void load()}>Erneut laden</button>
            </div>
          )}

          {!error && loading && <p className="dec-empty">Lade Lieferungen…</p>}

          {!error && !loading && tab === 'deliverables' && (
            <div className="cd-list">
              {deliverables.length === 0 ? (
                <p className="dec-empty">Noch keine Lieferungen — sobald das Team Assets freigibt, erscheinen sie hier.</p>
              ) : deliverables.map(d => (
                <article key={d.id} className="cd-card">
                  <div className="cd-card-head">
                    <div>
                      <h2 className="cd-card-title">{d.title}</h2>
                      <p className="cd-card-meta">
                        {d.project_title ? `${d.project_title} · ` : ''}{d.kind} · {fmtWhen(d.created_at)}
                      </p>
                    </div>
                    {d.approval_status === 'awaiting_review' ? (
                      <span className="cd-pill">Freigabe nötig</span>
                    ) : d.approval_status === 'approved' ? (
                      <span className="cd-pill ok">Freigegeben</span>
                    ) : null}
                  </div>
                  {d.summary && <p className="cd-body">{d.summary}</p>}
                  <div className="cd-actions">
                    {d.approval_status === 'awaiting_review' && (
                      <>
                        <button
                          type="button"
                          className="cd-btn primary"
                          disabled={busyId === d.id}
                          onClick={() => void patchDeliverable(d.id, { action: 'approve' })}
                        >
                          <Check size={14} /> Freigeben
                        </button>
                        <button
                          type="button"
                          className="cd-btn"
                          onClick={() => { setFeedbackId(d.id); setFeedbackText('') }}
                        >
                          <ChatCircle size={14} /> Änderung wünschen
                        </button>
                      </>
                    )}
                    {(d.external_url || d.preview_url) && (
                      <a href={d.external_url || d.preview_url || '#'} target="_blank" rel="noreferrer" className="cd-btn">
                        <DownloadSimple size={14} /> Öffnen
                      </a>
                    )}
                    {d.project_id && (
                      <Link href={`/project/${d.project_id}`} className="cd-btn">Zum Projekt</Link>
                    )}
                  </div>
                  {feedbackId === d.id && (
                    <>
                      <textarea
                        className="cd-feedback"
                        placeholder="Was soll angepasst werden?"
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                      />
                      <div className="cd-actions">
                        <button
                          type="button"
                          className="cd-btn primary"
                          disabled={!feedbackText.trim() || busyId === d.id}
                          onClick={() => void patchDeliverable(d.id, { action: 'request_changes', feedback: feedbackText })}
                        >
                          Senden
                        </button>
                        <button type="button" className="cd-btn" onClick={() => setFeedbackId(null)}>
                          <X size={14} /> Abbrechen
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}

          {!error && !loading && tab === 'timeline' && (
            <div className="cd-timeline">
              {timeline.length === 0 ? (
                <p className="dec-empty">Noch kein Verlauf — Tagro meldet Updates, sobald das Team Fortschritt liefert.</p>
              ) : timeline.map(item => (
                <div key={item.id} className="cd-tl-row">
                  <time className="cd-tl-time">{fmtWhen(item.created_at)}</time>
                  <div>
                    <span className="cd-tl-kind">{KIND_LABEL[item.kind] || item.kind}</span>
                    <p className="cd-tl-title">
                      {item.project_title ? `${item.project_title}: ` : ''}{item.title}
                    </p>
                    <p className="cd-tl-body">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'empty',
            id: 'deliverables',
            title: 'Lieferungen',
            subtitle: pending.length > 0 ? `${pending.length} warten auf Freigabe` : 'Client Panel',
          }}
        />
      </div>
    </div>
  )
}
