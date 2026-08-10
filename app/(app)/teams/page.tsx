'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, UserPlus } from '@phosphor-icons/react'
import { FESTAG_PAGE_STYLES } from '@/components/app-shell/festag-page-styles'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import { fetchJson } from '@/lib/portal/fetch-api'
import { DEMO_TEAM_OVERVIEW, shouldUseDemoFallback } from '@/lib/demo/portal-preview'
import type { TeamWorkloadOverview, TeamMember, MemberWorkload } from '@/lib/teams/build-workload'

function initials(m: TeamMember): string {
  const name = m.full_name || m.first_name || m.email || '?'
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] || ''
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (a + b).toUpperCase() || '?'
}

function displayName(m: TeamMember): string {
  return m.full_name || m.first_name || m.email || 'Unbenannt'
}

function workloadLabel(w: MemberWorkload | undefined): { text: string; tone?: 'red' | 'blue' } {
  if (!w) return { text: '—' }
  if (w.blocked > 0) return { text: `${w.blocked} blockiert`, tone: 'red' }
  if (w.active > 0) return { text: `${w.active} aktiv`, tone: 'blue' }
  if (w.review > 0) return { text: `${w.review} in Review`, tone: 'blue' }
  return { text: 'frei' }
}

export default function TeamsOverviewPage() {
  const [overview, setOverview] = useState<TeamWorkloadOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchJson<{ overview: TeamWorkloadOverview }>('/api/teams/workload')
    if (res.ok && res.data?.overview) {
      setOverview(res.data.overview)
      setIsDemo(false)
    } else if (shouldUseDemoFallback(res.status)) {
      setOverview(DEMO_TEAM_OVERVIEW)
      setIsDemo(true)
      setError(null)
    } else {
      setOverview(null)
      setError(res.error || 'Team-Überblick konnte nicht geladen werden.')
      setIsDemo(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="fps">
      <style>{FESTAG_PAGE_STYLES}</style>

      <header className="fps-head">
        <h1 className="fps-title">Team</h1>
        {overview ? (
          <p className="fps-stat-line">
            <strong>{overview.totals.members}</strong> {overview.totals.members === 1 ? 'Mitglied' : 'Mitglieder'}
            {' · '}
            <strong>{overview.totals.available}</strong> verfügbar
            {overview.totals.reviewBacklog > 0 ? (
              <> {' · '}<strong>{overview.totals.reviewBacklog}</strong> {overview.totals.reviewBacklog === 1 ? 'Review offen' : 'Reviews offen'}</>
            ) : null}
          </p>
        ) : null}
      </header>

      {isDemo && <DemoPreviewBanner note="Beispiel-Team — echte Workload-Daten nach Anmeldung." />}

      {overview?.tagro_insights.length ? (
        <p className="fps-stat-line" style={{ marginTop: -20, marginBottom: 20 }}>
          {overview.tagro_insights[0]}
        </p>
      ) : null}

      {loading ? (
        <p className="fps-empty">Lade Team-Überblick…</p>
      ) : error ? (
        <div className="fps-empty">
          <p>{error}</p>
          <button type="button" className="fps-filter" style={{ marginTop: 12 }} onClick={() => void load()}>
            Erneut laden
          </button>
        </div>
      ) : overview && overview.members.length > 0 ? (
        <div className="fps-list">
          {overview.members.map((m) => {
            const w = overview.workloads[m.id]
            const memberLoad = workloadLabel(w)
            const needsAttention = Boolean(w?.blocked || w?.overloaded)
            return (
              <div key={m.id} className="fps-row">
                <div className="fps-row-body">
                  <span className="fps-row-avatar" aria-hidden>{initials(m)}</span>
                  <span className="fps-row-copy">
                    <span className="fps-row-title">{displayName(m)}</span>
                    {m.position || m.role ? (
                      <span className="fps-row-sub">{m.position || m.role}</span>
                    ) : null}
                  </span>
                </div>
                <div className="fps-row-right">
                  <span className={`fps-row-meta${memberLoad.tone ? ` is-${memberLoad.tone}` : ''}`}>{memberLoad.text}</span>
                  <span className={`fps-mark${needsAttention ? ' is-attn is-red' : ''}`} aria-hidden>
                    {needsAttention ? <span className="fps-mark-dot" /> : <Check size={10} weight="bold" />}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="fps-list">
          <div className="fps-empty">
            <p>Noch keine Teammitglieder.</p>
            <Link href="/invite" className="fps-filter" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, textDecoration: 'none' }}>
              <UserPlus size={13} weight="bold" /> Mitglied einladen
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
