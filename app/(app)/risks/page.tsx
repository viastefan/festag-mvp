'use client'

/**
 * /risks — die vollständige Risiko-Intelligenz.
 *
 * Das Dashboard zeigt, was jetzt Aufmerksamkeit braucht. Hier steht das
 * ganze Bild: was erkannt wurde, woraus, was daraus folgt. Gleiche fps-*
 * Chrome wie Entscheidungen, Vorfälle und Team.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowsClockwise, Check, Plus } from '@phosphor-icons/react'
import { FESTAG_PAGE_STYLES } from '@/components/app-shell/festag-page-styles'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { createClient } from '@/lib/supabase/client'
import RiskDrawer from '@/components/risks/RiskDrawer'
import RiskCreateModal from '@/components/risks/RiskCreateModal'
import { RISK_EXTRA_CSS } from '@/components/risks/risks-styles'
import {
  CLOSED_STATUS_TAG,
  RISK_FILTERS,
  fmtAgo,
  isOpenRisk,
  matchesFilter,
  severityTone,
  sortRisks,
  type RiskFilter,
  type RiskProjectLite,
} from '@/components/risks/risks-shared'
import { healthLine, type ProjectHealth } from '@/lib/risks/health'
import { riskSummaryLine, severityLabel } from '@/lib/risks/present'
import type { Risk } from '@/lib/risks/types'

export default function RisksPage() {
  return (
    <Suspense fallback={<div className="fps"><p className="fps-empty">Risiken werden geladen…</p></div>}>
      <RisksPageInner />
    </Suspense>
  )
}

function RisksPageInner() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()

  const [risks, setRisks] = useState<Risk[]>([])
  const [projects, setProjects] = useState<Record<string, RiskProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [filter, setFilter] = useState<RiskFilter>('attention')
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [createOpen, setCreateOpen] = useState(searchParams?.get('new') === '1')
  const [health, setHealth] = useState<ProjectHealth | null>(null)
  const [tableReady, setTableReady] = useState(true)
  const [lastScan, setLastScan] = useState<Date | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [me, setMe] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/risks?limit=200', { credentials: 'include' })
      const data = res.ok ? await res.json().catch(() => null) : null
      if (!res.ok) {
        setRisks([])
        setLoadError(data?.error || 'Risiken konnten nicht geladen werden.')
        return
      }
      const rows: Risk[] = data?.risks ?? []
      setRisks(rows)
      setHealth(data?.health ?? null)
      setTableReady(data?.table_ready !== false)

      const ids = Array.from(new Set(rows.map(r => r.project_id).filter(Boolean)))
      if (ids.length) {
        const { data: projs } = await (supabase as any)
          .from('projects').select('id,title').in('id', ids)
        const map: Record<string, RiskProjectLite> = {}
        for (const p of (projs as RiskProjectLite[]) ?? []) map[p.id] = p
        setProjects(map)
      } else {
        setProjects({})
      }
    } catch {
      setRisks([])
      setLoadError('Risiken konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    setOpenId(searchParams?.get('open') || null)
    setCreateOpen(searchParams?.get('new') === '1')
  }, [searchParams])

  // Neue Erkennungen erscheinen sofort, ohne dass jemand neu lädt.
  useEffect(() => {
    if (!me) return
    const ch = (supabase as any)
      .channel(`risks-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risks' }, () => { void load() })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, me, load])

  const scoped = useMemo(() => sortRisks(risks.filter(r => matchesFilter(r, filter))), [risks, filter])
  const summary = useMemo(() => riskSummaryLine(risks), [risks])

  async function scan() {
    if (scanning) return
    setScanning(true)
    try {
      await fetch('/api/risks/detect', { method: 'POST', credentials: 'include' })
      setLastScan(new Date())
      await load()
    } finally {
      setScanning(false)
    }
  }

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (value) params.set(key, value)
    else params.delete(key)
    const qs = params.toString()
    router.replace(qs ? `/risks?${qs}` : '/risks', { scroll: false })
  }

  function patchLocal(risk: Risk) {
    setRisks(curr => curr.map(r => (r.id === risk.id ? { ...r, ...risk } : r)))
  }

  return (
    <div className="fps">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FESTAG_PAGE_STYLES }} />
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_CSS + RISK_EXTRA_CSS }} />

      <header className="fps-head">
        <h1 className="fps-title">Risiken</h1>
        <p className="fps-stat-line">{risks.length === 0 ? 'Nichts Auffälliges' : summary}</p>
        {health && (
          // Eine Einschätzung, keine Messung — deshalb steht der Grund daneben.
          <p className="fps-stat-line" style={{ opacity: 0.8 }}>{healthLine(health)}</p>
        )}
      </header>

      <div className="fps-filters">
        {RISK_FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            className={`fps-filter${filter === f.id ? ' is-on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <button type="button" className="fps-filter" disabled={scanning} onClick={() => void scan()}>
          <ArrowsClockwise size={12} weight="regular" style={{ marginRight: 5, verticalAlign: -1 }} />
          {scanning ? 'Festag prüft…' : 'Jetzt prüfen'}
        </button>
        <button type="button" className="fps-filter" onClick={() => { setCreateOpen(true); setParam('new', '1') }}>
          <Plus size={12} weight="bold" style={{ marginRight: 5, verticalAlign: -1 }} />
          Risiko melden
        </button>
      </div>

      {!tableReady ? (
        <p className="fps-stat-line" style={{ marginTop: -8, marginBottom: 18 }}>
          Risiko-Datenbank noch nicht aktiv.
        </p>
      ) : null}

      {loadError ? (
        <div className="fps-list"><p className="fps-empty">{loadError}</p></div>
      ) : loading && risks.length === 0 ? (
        <p className="fps-empty">Lade Risiken…</p>
      ) : scoped.length === 0 ? (
        <div className="fps-list">
          {/* „Keine Risiken gefunden" klingt nach Ausfall. Das hier ist der
              Normalzustand eines Projekts, das läuft. */}
          <p className="fps-empty">
            {risks.length === 0
              ? 'Alles im Blick. Festag erkennt derzeit nichts, was dein Projekt gefährdet.'
              : 'In dieser Ansicht steht nichts an.'}
          </p>
          {risks.length === 0 && (
            <p className="fps-empty" style={{ paddingTop: 0, opacity: 0.75 }}>
              {lastScan ? `Zuletzt geprüft ${fmtAgo(lastScan.toISOString())}` : 'Signale werden laufend ausgewertet.'}
            </p>
          )}
        </div>
      ) : (
        <div className="fps-list">
          {scoped.map(risk => {
            const open = isOpenRisk(risk)
            const tone = severityTone(risk.severity)
            const project = risk.project_id ? projects[risk.project_id] : null
            const probability = typeof risk.probability === 'number' ? `${Math.round(risk.probability * 100)}%` : null
            return (
              <button
                key={risk.id}
                type="button"
                className="fps-row"
                onClick={() => { setOpenId(risk.id); setParam('open', risk.id) }}
              >
                <div className="fps-row-body">
                  <span
                    className={`fps-mark${open ? ` is-attn${tone === 'red' ? ' is-red' : ''}` : ''}`}
                    aria-hidden
                  >
                    {open ? <span className="fps-mark-dot" /> : <Check size={10} weight="bold" />}
                  </span>
                  <span className="fps-row-copy">
                    <span className="fps-row-title">{risk.title}</span>
                    <span className="fps-row-sub">
                      {[project?.title, severityLabel(risk.severity), probability]
                        .filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </div>
                <div className="fps-row-right">
                  <span className="fps-row-meta">{fmtAgo(risk.last_signal_at || risk.updated_at)}</span>
                  {!open && CLOSED_STATUS_TAG[risk.status]
                    ? <span className="fps-row-tag is-green">{CLOSED_STATUS_TAG[risk.status]}</span>
                    : null}
                  {risk.status === 'decision_required'
                    ? <span className="fps-row-tag">Entscheidung</span>
                    : null}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {openId && (
        <RiskDrawer
          riskId={openId}
          onClose={() => { setOpenId(null); setParam('open', null) }}
          onChanged={patchLocal}
        />
      )}

      <RiskCreateModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setParam('new', null) }}
        onCreated={risk => {
          setRisks(curr => [risk, ...curr.filter(r => r.id !== risk.id)])
          setOpenId(risk.id)
          setParam('open', risk.id)
        }}
      />
    </div>
  )
}
