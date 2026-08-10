'use client'

/**
 * /decisions — same real data flow as before (API + realtime + demo
 * fallback + DecisionDrawer for the answer form), presentation moved to
 * the fps-* shared shell used by Team/Activity/Documents.
 */

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check } from '@phosphor-icons/react'
import { FESTAG_PAGE_STYLES } from '@/components/app-shell/festag-page-styles'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import { createClient } from '@/lib/supabase/client'
import {
  type Decision, type ProjectLite,
  getDecisionDemoBundle, isOpenDecisionStatus,
} from '@/components/decisions/decisions-shared'
import { DecisionDrawer } from '@/components/decisions/DecisionDrawer'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { deriveDecisionRisks } from '@/lib/decisions/risks'

type Filter = 'open' | 'all' | 'decided' | 'urgent'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open',    label: 'Offen' },
  { id: 'urgent',  label: 'Dringend' },
  { id: 'decided', label: 'Entschieden' },
  { id: 'all',     label: 'Alle' },
]

function decisionTitle(d: Decision): string {
  return d.client_title || d.title || 'Entscheidung'
}
function decisionSummary(d: Decision): string | null {
  return d.client_summary || d.description || null
}
function fmtDue(iso: string | null): string | null {
  if (!iso) return null
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'überfällig'
  if (days === 0) return 'heute fällig'
  if (days === 1) return 'morgen fällig'
  return `in ${days} Tagen fällig`
}

export default function DecisionsPage() {
  return (
    <Suspense fallback={<div className="fps"><p className="fps-empty">Entscheidungen werden geladen…</p></div>}>
      <DecisionsPageInner />
    </Suspense>
  )
}

function DecisionsPageInner() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [decisions, setDecisions] = useState<Decision[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('open')
  const [usingDemo, setUsingDemo] = useState(false)
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [me, setMe] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  useLayoutEffect(() => { setOpenId(null) }, [pathname])

  const load = useCallback(async () => {
    setLoading(true)
    const forceDemo = searchParams?.get('demo') === '1'
    const blockDemo = searchParams?.get('demo') === '0'

    if (forceDemo) {
      const demo = getDecisionDemoBundle()
      setUsingDemo(true)
      setDecisions(demo.decisions)
      setProjects(demo.projects)
      setLoading(false)
      return
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12_000)
      let res: Response
      try {
        res = await fetch('/api/decisions', { credentials: 'include', signal: controller.signal })
      } finally {
        clearTimeout(timeout)
      }
      const data = res.ok ? await res.json().catch(() => null) : null
      const apiRows: Decision[] = data?.decisions ?? []
      const showDemo = !blockDemo && apiRows.length === 0

      if (!res.ok || !data || showDemo) {
        if (!blockDemo) {
          const demo = getDecisionDemoBundle()
          setUsingDemo(true)
          setDecisions(demo.decisions)
          setProjects(demo.projects)
        } else {
          setUsingDemo(false)
          setDecisions(apiRows)
          setProjects({})
        }
        return
      }

      setUsingDemo(false)
      setDecisions(apiRows)

      const projIds = Array.from(new Set(apiRows.map((d: Decision) => d.project_id).filter(Boolean)))
      if (projIds.length) {
        const { data: projs } = await (supabase as any).from('projects').select('id,title,color,status,workspace_id').in('id', projIds)
        const map: Record<string, ProjectLite> = {}
        for (const p of (projs as ProjectLite[]) ?? []) map[p.id] = p
        setProjects(map)
      } else {
        setProjects({})
      }
    } catch {
      if (!blockDemo) {
        const demo = getDecisionDemoBundle()
        setUsingDemo(true)
        setDecisions(demo.decisions)
        setProjects(demo.projects)
      }
    } finally {
      setLoading(false)
    }
  }, [supabase, searchParams])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const open = searchParams?.get('open')
    setOpenId(open || null)
    if (searchParams?.get('tone') === 'risk') setFilter('urgent')
  }, [searchParams])

  useEffect(() => {
    if (!me || usingDemo) return
    const ch = (supabase as any)
      .channel(`decisions-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decisions' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.requested_for === me || payload.new.created_by === me) {
            setDecisions(curr => curr.some(d => d.id === payload.new.id) ? curr : [payload.new, ...curr])
          }
        } else if (payload.eventType === 'UPDATE') {
          setDecisions(curr => curr.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d))
        }
      })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, me, usingDemo])

  function closeDrawer() {
    setOpenId(null)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('open')
    const qs = params.toString()
    router.replace(qs ? `/decisions?${qs}` : '/decisions', { scroll: false })
  }

  const filtered = useMemo(() => {
    let xs = decisions
    if (filter === 'open')    xs = xs.filter(d => isOpenDecisionStatus(d.status))
    if (filter === 'urgent')  xs = xs.filter(d => isOpenDecisionStatus(d.status) && (d.urgency === 'high' || d.urgency === 'critical'))
    if (filter === 'decided') xs = xs.filter(d => d.status === 'decided')
    const order = (d: Decision) => {
      if (!isOpenDecisionStatus(d.status)) return 100
      if (d.urgency === 'critical') return 0
      if (d.urgency === 'high')     return 1
      if (d.urgency === 'normal')   return 2
      return 3
    }
    return [...xs].sort((a, b) => {
      const ord = order(a) - order(b)
      if (ord !== 0) return ord
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity
      if (aDue !== bDue) return aDue - bDue
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [filter, decisions])

  const counts = useMemo(() => ({
    open: decisions.filter(d => isOpenDecisionStatus(d.status)).length,
    urgent: decisions.filter(d => isOpenDecisionStatus(d.status) && (d.urgency === 'high' || d.urgency === 'critical')).length,
  }), [decisions])

  const risks = useMemo(() => deriveDecisionRisks(decisions, projects), [decisions, projects])
  const openDecision = openId ? decisions.find(d => d.id === openId) ?? null : null

  function patchLocal(id: string, patch: Partial<Decision>) {
    setDecisions(curr => curr.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  return (
    <div className="fps">
      <style>{FESTAG_PAGE_STYLES}</style>
      {/* DecisionDrawer (reused as-is for the answer form) depends on this
          stylesheet for its own fixed-overlay positioning. */}
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_CSS }} />

      <header className="fps-head">
        <h1 className="fps-title">Entscheidungen</h1>
        <p className="fps-stat-line">
          <strong>{counts.open}</strong> offen
          {counts.urgent > 0 ? <> {' · '}<strong>{counts.urgent}</strong> dringend</> : null}
          {risks.length > 0 ? <> {' · '}<strong>{risks.length}</strong> {risks.length === 1 ? 'Risiko' : 'Risiken'} damit verbunden</> : null}
        </p>
      </header>

      {usingDemo && <DemoPreviewBanner note="Vorschau mit Beispieldaten — echte Entscheidungen kommen aus dem Execution Panel." />}

      <div className="fps-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`fps-filter${filter === f.id ? ' is-on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && filtered.length === 0 ? (
        <p className="fps-empty">Lade Entscheidungen…</p>
      ) : filtered.length === 0 ? (
        <div className="fps-list">
          <p className="fps-empty">
            {decisions.length === 0
              ? 'Noch keine Entscheidungen. Wenn ein Developer eine Entscheidung anfordert, landet sie hier.'
              : 'Keine Entscheidungen in dieser Ansicht.'}
          </p>
        </div>
      ) : (
        <div className="fps-list">
          {filtered.map((d) => {
            const open = isOpenDecisionStatus(d.status)
            const urgent = d.urgency === 'high' || d.urgency === 'critical'
            const project = d.project_id ? projects[d.project_id] : null
            const due = fmtDue(d.due_date)
            return (
              <button
                key={d.id}
                type="button"
                className="fps-row"
                onClick={() => setOpenId(d.id)}
              >
                <div className="fps-row-body">
                  <span className={`fps-mark${open ? ` is-attn${urgent ? ' is-red' : ''}` : ''}`} aria-hidden>
                    {open ? <span className="fps-mark-dot" /> : <Check size={10} weight="bold" />}
                  </span>
                  <span className="fps-row-copy">
                    <span className="fps-row-title">{decisionTitle(d)}</span>
                    <span className="fps-row-sub">
                      {[project?.title, decisionSummary(d)].filter(Boolean).join(' · ') || (open ? 'Wartet auf deine Freigabe' : 'Entschieden')}
                    </span>
                  </span>
                </div>
                <div className="fps-row-right">
                  {due ? <span className={`fps-row-meta${urgent ? ' is-red' : ''}`}>{due}</span> : null}
                  {!open ? <span className="fps-row-tag is-green">Entschieden</span> : null}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {openDecision && (
        <DecisionDrawer
          decision={openDecision}
          project={openDecision.project_id ? projects[openDecision.project_id] : null}
          me={me}
          isDecider={openDecision.requested_for === me || (!openDecision.requested_for && openDecision.created_by !== me)}
          onClose={closeDrawer}
          onPatch={(patch) => patchLocal(openDecision.id, patch)}
        />
      )}
    </div>
  )
}
