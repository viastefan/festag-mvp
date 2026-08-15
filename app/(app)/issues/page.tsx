'use client'

/**
 * /issues — Vorfälle (Bugs, Security, technische Schulden). Risiken leben
 * seit der Risk Intelligence unter /risks; diese Seite heißt jetzt wieder,
 * was sie zeigt.
 *
 * Same real data flow as before (API + realtime + connector sync
 * + IssueDrawer/IssueCreateModal), presentation moved to the fps-* shared
 * shell used by Team/Activity/Documents/Decisions.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, LinkSimple, Plus } from '@phosphor-icons/react'
import { FESTAG_PAGE_STYLES } from '@/components/app-shell/festag-page-styles'
import { createClient } from '@/lib/supabase/client'
import { usePortalNavItems } from '@/hooks/usePortalNavItems'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import IssueCreateModal from '@/components/issues/IssueCreateModal'
import IssueDrawer from '@/components/issues/IssueDrawer'
import {
  type Issue, type IssueFilter, type ProjectLite,
  ISSUE_FILTERS, isOpenIssue, issueSeverityLabel, fmtAgo,
} from '@/components/issues/issues-shared'
import { ISSUE_EXTRA_CSS } from '@/components/issues/issues-styles'
import { isOpenIssueStatus } from '@/lib/issues/types'

export default function IssuesPage() {
  return (
    <Suspense fallback={<div className="fps"><p className="fps-empty">Vorfälle werden geladen…</p></div>}>
      <IssuesPageInner />
    </Suspense>
  )
}

function IssuesPageInner() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const { wsMode, loaded: navLoaded } = usePortalNavItems()

  const [issues, setIssues] = useState<Issue[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<IssueFilter>('open')
  const [projectScope, setProjectScope] = useState<string>(searchParams?.get('project') || 'all')
  const [createOpen, setCreateOpen] = useState(searchParams?.get('new') === '1')
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const [tableReady, setTableReady] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [me, setMe] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  useEffect(() => {
    if (navLoaded && wsMode === 'delivery') router.replace('/activity')
  }, [navLoaded, wsMode, router])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12_000)
      let res: Response
      try {
        res = await fetch('/api/issues', { credentials: 'include', signal: controller.signal })
      } finally {
        clearTimeout(timeout)
      }
      const data = res.ok ? await res.json().catch(() => null) : null
      if (!res.ok) {
        setIssues([])
        setProjects({})
        setLoadError((data as any)?.error || 'Vorfälle konnten nicht geladen werden.')
        return
      }
      const rows: Issue[] = data?.issues ?? []
      setIssues(rows)
      setTableReady(data?.table_ready !== false)

      const projIds = Array.from(new Set(rows.map(i => i.project_id).filter(Boolean)))
      if (projIds.length) {
        const { data: projs } = await (supabase as any)
          .from('projects').select('id,title,color,status,workspace_id').in('id', projIds)
        const map: Record<string, ProjectLite> = {}
        for (const p of (projs as ProjectLite[]) ?? []) map[p.id] = p
        setProjects(map)
      } else {
        setProjects({})
      }
    } catch {
      setIssues([])
      setProjects({})
      setLoadError('Vorfälle konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    setOpenId(searchParams?.get('open') || null)
    setCreateOpen(searchParams?.get('new') === '1')
    const project = searchParams?.get('project')
    if (project) setProjectScope(project)
  }, [searchParams])

  useEffect(() => {
    if (!me) return
    const ch = (supabase as any)
      .channel(`issues-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => { void load() })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, me, load])

  const projectList = useMemo(
    () => Object.values(projects).sort((a, b) => a.title.localeCompare(b.title, 'de')),
    [projects],
  )

  const scopedIssues = useMemo(() => {
    if (projectScope === 'all') return issues
    return issues.filter(i => i.project_id === projectScope)
  }, [issues, projectScope])

  const filtered = useMemo(() => {
    let xs = scopedIssues
    if (filter === 'open') xs = xs.filter(i => isOpenIssue(i))
    if (filter === 'critical') xs = xs.filter(i => isOpenIssue(i) && (i.severity === 'critical' || i.severity === 'high'))
    if (filter === 'resolved') xs = xs.filter(i => !isOpenIssueStatus(i.status))
    return [...xs].sort((a, b) => {
      const sev = (s: Issue) => ({ critical: 0, high: 1, medium: 2, low: 3 }[s.severity] ?? 9)
      const ord = sev(a) - sev(b)
      if (ord !== 0) return ord
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [filter, scopedIssues])

  const counts = useMemo(() => ({
    open: scopedIssues.filter(i => isOpenIssue(i)).length,
    critical: scopedIssues.filter(i => isOpenIssue(i) && (i.severity === 'critical' || i.severity === 'high')).length,
  }), [scopedIssues])

  const openIssue = openId ? issues.find(i => i.id === openId) ?? null : null

  function closeDrawer() {
    setOpenId(null)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('open')
    const qs = params.toString()
    router.replace(qs ? `/issues?${qs}` : '/issues', { scroll: false })
  }
  function closeCreate() {
    setCreateOpen(false)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('new')
    const qs = params.toString()
    router.replace(qs ? `/issues?${qs}` : '/issues', { scroll: false })
  }
  function openIssueDrawer(id: string) {
    setOpenId(id)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('open', id)
    router.replace(`/issues?${params.toString()}`, { scroll: false })
  }
  function patchLocal(id: string, patch: Partial<Issue>) {
    setIssues(curr => curr.map(i => i.id === id ? { ...i, ...patch } : i))
  }
  function onCreated(issue: Issue) {
    setIssues(curr => [issue, ...curr.filter(i => i.id !== issue.id)])
    if (issue.project_id && !projects[issue.project_id]) {
      void (async () => {
        const { data: p } = await (supabase as any)
          .from('projects').select('id,title,color,status,workspace_id').eq('id', issue.project_id).maybeSingle()
        if (p) setProjects(prev => ({ ...prev, [p.id]: p }))
      })()
    }
    openIssueDrawer(issue.id)
  }

  async function syncFromConnectors() {
    setSyncBusy(true)
    setSyncNote(null)
    try {
      const res = await fetch('/api/issues/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ project_id: projectScope !== 'all' ? projectScope : undefined, source: 'all', enrich: true }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Sync fehlgeschlagen')
      const rows = data?.synced ?? []
      const imported = rows.reduce((s: number, row: any) => s + (row.issuesImported ?? 0) + (row.issuesUpdated ?? 0), 0)
      const enriched = rows.reduce((s: number, row: any) => s + (row.enriched ?? 0), 0)
      const sources = Array.from(new Set(rows.map((r: any) => r.source).filter(Boolean)))
      const sourceLabel = sources.length > 0 ? sources.join(' + ') : 'Anbindungen'
      if (rows.every((r: any) => r.message === 'no_links')) {
        setSyncNote('Keine verbundenen Quellen — GitHub, Linear oder Jira unter /connectors verknüpfen.')
      } else {
        setSyncNote(
          imported > 0
            ? `${imported} Vorfall${imported === 1 ? '' : 'e'} aus ${sourceLabel}${enriched > 0 ? ` · Tagro hat ${enriched} interpretiert` : ''}.`
            : enriched > 0
              ? `Tagro hat ${enriched} Vorfall${enriched === 1 ? '' : 'e'} interpretiert.`
              : `${sourceLabel}-Sync abgeschlossen — keine neuen Vorfälle.`,
        )
      }
      await load()
    } catch (e: any) {
      setSyncNote(e?.message || 'Connector-Sync fehlgeschlagen')
    } finally {
      setSyncBusy(false)
    }
  }

  if (navLoaded && wsMode === 'delivery') return null

  return (
    <div className="fps">
      <style>{FESTAG_PAGE_STYLES}</style>
      {/* IssueDrawer/IssueCreateModal (reused as-is) depend on this stylesheet
          for their own fixed-overlay positioning. */}
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_CSS + ISSUE_EXTRA_CSS }} />

      <header className="fps-head">
        <h1 className="fps-title">Vorfälle</h1>
        <p className="fps-stat-line">
          <strong>{counts.open}</strong> offen
          {counts.critical > 0 ? <> {' · '}<strong>{counts.critical}</strong> kritisch</> : null}
        </p>
      </header>

      <div className="fps-filters">
        {ISSUE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`fps-filter${filter === f.id ? ' is-on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <button type="button" className="fps-filter" disabled={syncBusy} onClick={() => void syncFromConnectors()}>
          <LinkSimple size={12} weight="regular" style={{ marginRight: 5, verticalAlign: -1 }} />
          {syncBusy ? 'Synchronisiere…' : 'Aus Anbindungen holen'}
        </button>
        <button type="button" className="fps-filter" onClick={() => setCreateOpen(true)}>
          <Plus size={12} weight="bold" style={{ marginRight: 5, verticalAlign: -1 }} />
          Neuer Vorfall
        </button>
      </div>

      {!tableReady ? (
        <p className="fps-stat-line" style={{ marginTop: -8, marginBottom: 18 }}>Vorfälle-Datenbank noch nicht aktiv.</p>
      ) : null}
      {syncNote ? <p className="fps-stat-line" style={{ marginTop: -8, marginBottom: 18 }}>{syncNote}</p> : null}

      {loadError ? (
        <div className="fps-list"><p className="fps-empty">{loadError}</p></div>
      ) : loading && filtered.length === 0 ? (
        <p className="fps-empty">Lade Vorfälle…</p>
      ) : filtered.length === 0 ? (
        <div className="fps-list">
          <p className="fps-empty">
            {issues.length === 0
              ? 'Noch keine Vorfälle. Lege manuell einen an oder importiere später aus GitHub, Jira oder Linear.'
              : 'Keine Vorfälle in dieser Ansicht.'}
          </p>
        </div>
      ) : (
        <div className="fps-list">
          {filtered.map((issue) => {
            const open = isOpenIssue(issue)
            const critical = issue.severity === 'critical' || issue.severity === 'high'
            const project = issue.project_id ? projects[issue.project_id] : null
            return (
              <button
                key={issue.id}
                type="button"
                className="fps-row"
                onClick={() => openIssueDrawer(issue.id)}
              >
                <div className="fps-row-body">
                  <span className={`fps-mark${open ? ` is-attn${critical ? ' is-red' : ''}` : ''}`} aria-hidden>
                    {open ? <span className="fps-mark-dot" /> : <Check size={10} weight="bold" />}
                  </span>
                  <span className="fps-row-copy">
                    <span className="fps-row-title">{issue.title}</span>
                    <span className="fps-row-sub">
                      {[project?.title, issueSeverityLabel(issue.severity)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </div>
                <div className="fps-row-right">
                  <span className="fps-row-meta">{fmtAgo(issue.updated_at)}</span>
                  {!open ? <span className="fps-row-tag is-green">Gelöst</span> : null}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {openIssue && (
        <IssueDrawer
          issue={openIssue}
          project={openIssue.project_id ? projects[openIssue.project_id] : null}
          onClose={closeDrawer}
          onPatch={patchLocal}
        />
      )}

      <IssueCreateModal
        open={createOpen}
        onClose={closeCreate}
        onCreated={onCreated}
        defaultProjectId={projectScope !== 'all' ? projectScope : projectList[0]?.id}
      />
    </div>
  )
}
