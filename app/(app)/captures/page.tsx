'use client'

/**
 * /captures — Freigaben: client-side review queue for the Capture Loop.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowsClockwise, Microphone, PencilSimple,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { openCapture } from '@/components/CaptureRecorder'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import TagroContentFab from '@/components/TagroContentFab'
import FestagPillButton from '@/components/ui/FestagPillButton'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import CapturesEmptyIllustration from '@/components/captures/CapturesEmptyIllustration'
import { openTagro } from '@/components/TagroOverlay'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { ACTIVITY_CSS } from '@/components/activity/activity-styles'
import { CLIENT_DELIVERABLES_CSS } from '@/components/client/client-deliverables-styles'
import { CAPTURES_CSS } from '@/components/captures/captures-styles'
import CaptureCardRow, { type CaptureRow } from '@/components/captures/CaptureCardRow'
import { fetchJson } from '@/lib/portal/fetch-api'
import {
  DEMO_CAPTURES,
  DEMO_CAPTURE_PROJECTS,
  shouldUseDemoFallback,
} from '@/lib/demo/portal-preview'

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
  const [projectList, setProjectList] = useState<ProjectLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, title, color')
        .order('updated_at', { ascending: false })
        .limit(24)
      const rows = (data as ProjectLite[] | null) ?? []
      setProjectList(rows)
      setProjects(prev => {
        const next = { ...prev }
        rows.forEach(p => { next[p.id] = p })
        return next
      })
    } catch { /* keep previous */ }
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchJson<{ captures: CaptureRow[] }>('/api/captures')
    if (res.ok) {
      const rows = res.data?.captures ?? []
      setCaptures(rows)
      setIsDemo(false)
      const ids = Array.from(new Set(rows.map(c => c.project_id)))
      if (ids.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('id, title, color')
          .in('id', ids)
        const map: Record<string, ProjectLite> = {}
        ;((data as ProjectLite[] | null) ?? []).forEach(p => { map[p.id] = p })
        setProjects(prev => ({ ...prev, ...map }))
      }
    } else if (shouldUseDemoFallback(res.status) || res.status >= 500) {
      setCaptures(DEMO_CAPTURES)
      setProjects(DEMO_CAPTURE_PROJECTS)
      setProjectList(Object.values(DEMO_CAPTURE_PROJECTS))
      setIsDemo(true)
      setError(null)
    } else {
      setError(res.error || 'Freigaben konnten nicht geladen werden.')
      setIsDemo(false)
    }
    await loadProjects()
    setLoading(false)
  }, [supabase, loadProjects])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (isDemo) return
    const ch = supabase
      .channel('captures-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_captures' }, () => { void load() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, load, isDemo])

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

  const recordNew = useCallback(() => {
    if (isDemo) {
      setError('In der Beispielansicht ist die Aufnahme deaktiviert — bitte anmelden.')
      return
    }
    const list = projectList.length ? projectList : Object.values(projects)
    if (!list.length) {
      setError('Lege zuerst ein Projekt an, um Live-Feedback aufzunehmen.')
      return
    }
    const p = list[0]
    openCapture({ projectId: p.id, projectTitle: p.title })
  }, [isDemo, projectList, projects])

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
    if (isDemo) {
      setError('In der Beispielansicht sind Aktionen deaktiviert — bitte anmelden.')
      return
    }
    setBusyId(id)
    try {
      const res = await fetch(`/api/captures/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Freigabe fehlgeschlagen')
      }
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Freigabe fehlgeschlagen')
    } finally { setBusyId(null) }
  }

  async function reject(id: string) {
    if (isDemo) {
      setError('In der Beispielansicht sind Aktionen deaktiviert — bitte anmelden.')
      return
    }
    const reason = window.prompt('Grund (optional):') ?? ''
    setBusyId(id)
    try {
      const res = await fetch(`/api/captures/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Ablehnen fehlgeschlagen')
      }
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ablehnen fehlgeschlagen')
    } finally { setBusyId(null) }
  }

  function filterLabel(f: { id: string; label: string }) {
    if (f.id === 'all') return `Alle (${counts.all})`
    const n = (counts as Record<string, number>)[f.id]
    return n > 0 ? `${f.label} (${n})` : f.label
  }

  const recordButton = (
    <FestagPillButton variant="primary" className="cap-header-record" onClick={recordNew}>
      <Microphone size={14} weight="bold" />
      Neu aufnehmen
    </FestagPillButton>
  )

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
                {recordButton}
                <button type="button" className="dec-head-tool" onClick={() => void load()} aria-label="Aktualisieren">
                  <ArrowsClockwise size={15} />
                </button>
              </>
            )}
          />

          {isDemo && (
            <div className="dec-dt" style={{ marginBottom: 16 }}>
              <DemoPreviewBanner note="Beispiel-Freigaben — nach Anmeldung erscheinen echte Aufnahmen im Dev-Panel unter Client-Aufnahmen." />
            </div>
          )}

          {error && (
            <p className="dec-page-lead-line festag-page-lead-line" style={{ color: '#ea580c', marginBottom: 12 }}>
              {error}
            </p>
          )}

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
            <div className="cap-empty-state">
              <CapturesEmptyIllustration />
              <h2 className="cap-empty-title">
                {filter === 'all' ? 'Noch keine Freigaben' : 'Keine Einträge in dieser Ansicht'}
              </h2>
              <p className="cap-empty-desc">
                {filter === 'all'
                  ? 'Starte das Live-Feedback in einem Projekt — Tagro strukturiert dein Feedback und leitet es nach deiner Freigabe an das Team weiter.'
                  : 'Wähle einen anderen Filter oder nimm neues Feedback über „Neu aufnehmen" auf.'}
              </p>
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
