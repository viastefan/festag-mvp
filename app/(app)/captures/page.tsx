'use client'

/**
 * /captures — Freigaben: client-side review queue for the Capture Loop.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowsClockwise, Microphone, PencilSimple, SealCheck,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { openCapture } from '@/components/CaptureRecorder'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import TagroContentFab from '@/components/TagroContentFab'
import { openTagro } from '@/components/TagroOverlay'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { ACTIVITY_CSS } from '@/components/activity/activity-styles'
import { CLIENT_DELIVERABLES_CSS } from '@/components/client/client-deliverables-styles'
import { CAPTURES_CSS } from '@/components/captures/captures-styles'
import CaptureCardRow, { type CaptureRow } from '@/components/captures/CaptureCardRow'

type ProjectLite = { id: string; title: string; color?: string | null }

const STATIC_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Alle' },
  { id: 'ready_review', label: 'Prüfen' },
  { id: 'approved', label: 'Gesendet' },
  { id: 'applied', label: 'Erledigt' },
]

export default function CapturesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [captures, setCaptures] = useState<CaptureRow[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/captures').catch(() => null)
    if (!r || !r.ok) { setLoading(false); return }
    const j = await r.json().catch(() => null)
    const rows: CaptureRow[] = j?.captures || []
    setCaptures(rows)

    const ids = Array.from(new Set(rows.map(c => c.project_id)))
    if (ids.length > 0) {
      const { data } = await (supabase as any)
        .from('projects')
        .select('id,title,color')
        .in('id', ids)
      const map: Record<string, ProjectLite> = {}
      ;(data || []).forEach((p: ProjectLite) => { map[p.id] = p })
      setProjects(map)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const ch = (supabase as any)
      .channel('captures-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_captures' }, () => { void load() })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, load])

  const counts = useMemo(() => ({
    all: captures.length,
    ready_review: captures.filter(c => c.status === 'ready_review').length,
    approved: captures.filter(c => ['approved', 'in_dev', 'needs_decision'].includes(c.status)).length,
    applied: captures.filter(c => c.status === 'applied').length,
  }), [captures])

  const filtered = useMemo(() => {
    if (filter === 'all') return captures
    if (filter === 'approved') {
      return captures.filter(c => ['approved', 'in_dev', 'needs_decision'].includes(c.status))
    }
    return captures.filter(c => c.status === filter)
  }, [captures, filter])

  function recordNew() {
    const firstId = captures[0]?.project_id || Object.keys(projects)[0]
    if (firstId) openCapture({ projectId: firstId, projectTitle: projects[firstId]?.title })
  }

  const tagroCaptures = useCallback(() => openTagro({
    contextType: 'empty',
    id: 'captures',
    title: 'Freigaben',
    subtitle: `${counts.all} Captures · ${counts.ready_review} zu prüfen`,
  }), [counts.all, counts.ready_review])

  const pageLeadLine = useMemo(() => {
    if (loading) return 'Freigaben werden geladen…'
    if (counts.ready_review > 0) {
      return `${counts.ready_review} Feedback${counts.ready_review === 1 ? '' : 's'} ${counts.ready_review === 1 ? 'wartet' : 'warten'} auf deine Prüfung.`
    }
    if (counts.all === 0) {
      return 'Starte Live-Feedback in einem Projekt — Tagro strukturiert und leitet an das Team weiter.'
    }
    return `${counts.all} Captures · ${counts.approved} unterwegs · Tagro hält den Überblick.`
  }, [loading, counts.all, counts.ready_review, counts.approved])

  async function approve(id: string) {
    setBusyId(id)
    try {
      await fetch(`/api/captures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      await load()
    } finally { setBusyId(null) }
  }

  async function reject(id: string) {
    const reason = window.prompt('Grund (optional):') ?? ''
    setBusyId(id)
    try {
      await fetch(`/api/captures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      })
      await load()
    } finally { setBusyId(null) }
  }

  function filterLabel(f: { id: string; label: string }) {
    if (f.id === 'all') return `Alle (${counts.all})`
    const n = (counts as Record<string, number>)[f.id]
    return n > 0 ? `${f.label} (${n})` : f.label
  }

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{ACTIVITY_CSS}</style>
      <style>{CLIENT_DELIVERABLES_CSS}</style>
      <style>{CAPTURES_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="Freigaben"
            lead={pageLeadLine}
            onMenu={() => setNavOpen(true)}
            mobileMenuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
              { id: 'record', label: 'Neu aufnehmen', onClick: recordNew },
              { id: 'tagro', label: 'Mit Tagro besprechen', onClick: tagroCaptures },
            ]}
            actions={(
              <>
                <button type="button" className="cap-record-btn" onClick={recordNew}>
                  <Microphone size={14} weight="bold" />
                  Neu aufnehmen
                </button>
                <button type="button" className="dec-head-tool" onClick={() => void load()} aria-label="Aktualisieren">
                  <ArrowsClockwise size={15} />
                </button>
              </>
            )}
          />

          <div className="cap-filters dec-dt">
            {STATIC_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                className={`cap-filter${filter === f.id ? ' on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {filterLabel(f)}
              </button>
            ))}
          </div>

          <div className="dec-m-actions">
            <div className="cap-m-filters" role="tablist" aria-label="Status">
              {STATIC_FILTERS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  className={`cap-filter${filter === f.id ? ' on' : ''}`}
                  onClick={() => setFilter(f.id)}
                >
                  {filterLabel(f)}
                </button>
              ))}
            </div>
            <div className="dec-m-actions-group">
              <button type="button" className="dec-m-ctl" aria-label="Aktualisieren" onClick={() => void load()}>
                <ArrowsClockwise size={17} weight="regular" />
              </button>
            </div>
          </div>
        </div>

        <div className="dec-scroll-body">
          {loading && filtered.length === 0 ? (
            <p className="dec-empty">Lade Freigaben…</p>
          ) : filtered.length === 0 ? (
            <div className="dec-empty">
              <SealCheck size={16} />
              <p>{filter === 'all' ? 'Noch keine Freigaben' : 'Keine Einträge in dieser Ansicht'}</p>
              <small>
                {filter === 'all'
                  ? 'Starte das Live-Feedback in einem Projekt — Tagro übernimmt den Rest.'
                  : 'Wähle einen anderen Filter oder nimm neues Feedback auf.'}
              </small>
              {filter === 'all' && (
                <button type="button" className="cap-record-btn" style={{ marginTop: 16 }} onClick={recordNew}>
                  <Microphone size={14} weight="bold" />
                  Feedback aufnehmen
                </button>
              )}
            </div>
          ) : (
            filtered.map((c, i) => (
              <CaptureCardRow
                key={c.id}
                capture={c}
                project={projects[c.project_id] ?? null}
                isLast={i === filtered.length - 1}
                busy={busyId === c.id}
                onApprove={() => void approve(c.id)}
                onReject={() => void reject(c.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'empty',
            id: 'captures',
            title: 'Freigaben',
            subtitle: `${counts.all} Captures · ${counts.ready_review} zu prüfen`,
          }}
        />
      </div>

      <MobilePageDock
        onDragUp={recordNew}
        primary={{
          id: 'record',
          label: counts.ready_review > 0
            ? `${counts.ready_review} Freigabe${counts.ready_review === 1 ? '' : 'n'} prüfen…`
            : 'Feedback aufnehmen…',
          icon: <Microphone size={14} weight="regular" />,
          onClick: counts.ready_review > 0 ? () => setFilter('ready_review') : recordNew,
          ariaLabel: counts.ready_review > 0 ? 'Zu prüfende Freigaben' : 'Feedback aufnehmen',
        }}
        secondary={{
          id: 'tagro',
          icon: <PencilSimple size={20} weight="regular" />,
          onClick: tagroCaptures,
          ariaLabel: 'Mit Tagro bearbeiten',
        }}
      />
    </div>
  )
}
