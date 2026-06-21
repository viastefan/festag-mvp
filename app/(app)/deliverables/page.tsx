'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowsClockwise, FilmStrip, Package, WarningCircle,
} from '@phosphor-icons/react'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import PortalMobileNavSheet from '@/components/portal/PortalMobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import DeliverableCardRow from '@/components/client/DeliverableCardRow'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { ACTIVITY_CSS } from '@/components/activity/activity-styles'
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
    } else if (shouldUseDemoFallback(delRes.status) || delRes.status >= 500) {
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

  const pageLeadLine = useMemo(() => {
    if (loading) return 'Lieferungen werden geladen…'
    if (pending.length > 0) {
      return `${pending.length} Lieferung${pending.length === 1 ? '' : 'en'} warten auf deine Freigabe.`
    }
    if (deliverables.length === 0) {
      return 'Sobald das Team Assets freigibt, erscheinen klare Lieferungen hier.'
    }
    return 'Tagro übersetzt Team-Arbeit in klare Lieferungen — Freigabe und Verlauf an einem Ort.'
  }, [loading, pending.length, deliverables.length])

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{ACTIVITY_CSS}</style>
      <style>{CLIENT_DELIVERABLES_CSS}</style>
      <PortalMobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="Lieferungen"
            lead={pageLeadLine}
            onMenu={() => setNavOpen(true)}
            mobileMenuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
              { id: 'captures', label: 'Freigaben', href: '/captures' },
            ]}
            actions={(
              <button type="button" className="dec-head-tool" onClick={() => void load()} aria-label="Aktualisieren">
                <ArrowsClockwise size={15} />
              </button>
            )}
          />

          <div className="act-filters dec-dt">
            <button type="button" className={`act-filter${tab === 'deliverables' ? ' on' : ''}`} onClick={() => setTab('deliverables')}>
              <Package size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              Lieferungen{!loading ? ` (${deliverables.length})` : ''}
            </button>
            <button type="button" className={`act-filter${tab === 'timeline' ? ' on' : ''}`} onClick={() => setTab('timeline')}>
              <FilmStrip size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              Projektverlauf
            </button>
          </div>
        </div>

        <div className="dec-scroll-body">
          {isDemo && <DemoPreviewBanner />}

          {error && (
            <div className="dec-empty">
              <WarningCircle size={16} />
              <p>{error}</p>
              <button type="button" className="dec-cta" style={{ marginTop: 12 }} onClick={() => void load()}>Erneut laden</button>
            </div>
          )}

          {!error && loading && <p className="dec-empty">Lade Lieferungen…</p>}

          {!error && !loading && tab === 'deliverables' && (
            <>
              {deliverables.length === 0 ? (
                <div className="dec-empty">
                  <Package size={16} />
                  <p>Noch keine Lieferungen.</p>
                  <small>Sobald das Team Assets freigibt, erscheinen sie hier.</small>
                </div>
              ) : deliverables.map((d, i) => (
                <DeliverableCardRow
                  key={d.id}
                  deliverable={d}
                  isLast={i === deliverables.length - 1}
                  busy={busyId === d.id}
                  feedbackOpen={feedbackId === d.id}
                  feedbackText={feedbackText}
                  onFeedbackText={setFeedbackText}
                  onApprove={() => void patchDeliverable(d.id, { action: 'approve' })}
                  onRequestChanges={() => void patchDeliverable(d.id, { action: 'request_changes', feedback: feedbackText })}
                  onOpenFeedback={() => { setFeedbackId(d.id); setFeedbackText('') }}
                  onCloseFeedback={() => setFeedbackId(null)}
                />
              ))}
            </>
          )}

          {!error && !loading && tab === 'timeline' && (
            <div className="cd-timeline">
              {timeline.length === 0 ? (
                <div className="dec-empty">
                  <FilmStrip size={16} />
                  <p>Noch kein Verlauf.</p>
                  <small>Tagro meldet Updates, sobald das Team Fortschritt liefert.</small>
                </div>
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
