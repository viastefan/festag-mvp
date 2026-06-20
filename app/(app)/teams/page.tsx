'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, UsersThree, WarningCircle } from '@phosphor-icons/react'
import MobilePageHeader from '@/components/MobilePageHeader'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { TEAMS_CSS } from '@/components/teams/teams-styles'
import { fetchJson } from '@/lib/portal/fetch-api'
import type { TeamMember, MemberWorkload, TeamWorkloadOverview } from '@/lib/teams/build-workload'

function memberName(m: TeamMember): string {
  return m.full_name?.trim() || m.first_name?.trim() || m.email?.split('@')[0] || 'Mitglied'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function TeamsOverviewPage() {
  const [overview, setOverview] = useState<TeamWorkloadOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchJson<{ overview: TeamWorkloadOverview }>('/api/teams/workload')
    if (res.ok && res.data?.overview) {
      setOverview(res.data.overview)
    } else {
      setOverview(null)
      setError(res.error || 'Team-Überblick konnte nicht geladen werden.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{TEAMS_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <div className="dec-legacy-mph">
            <MobilePageHeader
              title="Team"
              menuItems={[
                { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
                { id: 'projects', label: 'Team-Projekte', href: '/teams/projects' },
              ]}
            />
          </div>

          <header className="dec-page-head">
            <div className="dec-page-head-copy dec-m-title">
              <h1 className="dec-page-title">
                <span className="dec-dt">Team</span>
                <span className="dec-m-t">Team</span>
              </h1>
              <p className="dec-m-subline">
                <span className="dec-m-t dec-m-sub">
                  {loading ? 'Lade…' : `${overview?.totals.members ?? 0} Mitglieder · Kapazität & Workload`}
                </span>
              </p>
              <div className="dec-page-lead dec-dt">
                <p className="dec-page-lead-line">Tagro erkennt Überlast, Blocker und Review-Backlogs im Team.</p>
              </div>
            </div>
            <div className="dec-m-head-actions">
              <CodexMobileActionPill
                onMenu={() => setNavOpen(true)}
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              />
            </div>
            <div className="dec-page-actions dec-dt">
              <Link href="/teams/projects" className="dec-head-tool" title="Projekte">Projekte</Link>
              <button type="button" className="dec-head-tool" onClick={() => void load()} aria-label="Aktualisieren">
                <ArrowsClockwise size={15} />
              </button>
            </div>
          </header>
        </div>

        <div className="dec-scroll-body">
          {loading ? (
            <p className="dec-empty">Lade Team-Überblick…</p>
          ) : error ? (
            <div className="dec-empty">
              <WarningCircle size={16} />
              <p>{error}</p>
              <button type="button" className="dec-cta" style={{ marginTop: 16 }} onClick={() => void load()}>Erneut laden</button>
            </div>
          ) : overview ? (
            <>
              <div className="team-metrics">
                <div className="team-metric"><p className="team-metric-label">Mitglieder</p><p className="team-metric-value">{overview.totals.members}</p></div>
                <div className="team-metric"><p className="team-metric-label">Verfügbar</p><p className="team-metric-value">{overview.totals.available}</p></div>
                <div className="team-metric"><p className="team-metric-label">Reviews</p><p className="team-metric-value">{overview.totals.reviewBacklog}</p></div>
                <div className="team-metric"><p className="team-metric-label">Blockiert</p><p className="team-metric-value">{overview.totals.blocked}</p></div>
                <div className="team-metric"><p className="team-metric-label">Velocity 7d</p><p className="team-metric-value">{overview.totals.velocity_7d}</p></div>
              </div>

              {overview.tagro_insights.length > 0 && (
                <div className="team-insights" role="status">
                  {overview.tagro_insights.map(line => (
                    <p key={line}><WarningCircle size={14} weight="fill" /> {line}</p>
                  ))}
                </div>
              )}

              <div className="team-list">
                {overview.members.length === 0 ? (
                  <p className="dec-empty">Noch keine Teammitglieder — lade Developer unter Einstellungen ein.</p>
                ) : overview.members.map(m => {
                  const w = overview.workloads[m.id] as MemberWorkload | undefined
                  return (
                    <div key={m.id} className={`team-row${w?.atRisk ? ' team-row--risk' : ''}`}>
                      <div className="team-row-left">
                        <span className="team-avatar">{initials(memberName(m))}</span>
                        <div>
                          <p className="team-name">{memberName(m)}</p>
                          <p className="team-role">{m.position || m.role || 'Mitglied'}</p>
                        </div>
                      </div>
                      <div className="team-row-stats">
                        <span><strong>{w?.active ?? 0}</strong> aktiv</span>
                        <span><strong>{w?.review ?? 0}</strong> review</span>
                        <span><strong>{w?.blocked ?? 0}</strong> blockiert</span>
                      </div>
                      {w?.overloaded && <span className="team-risk-pill">Überlastet</span>}
                    </div>
                  )
                })}
              </div>

              <div className="team-foot">
                <Link href="/teams/projects" className="team-foot-link">Team-Projekte</Link>
                <Link href="/teams/tasks" className="team-foot-link">Team-Tasks</Link>
                <Link href="/dev/team" className="team-foot-link">Dev Team Layer</Link>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'empty',
            id: 'teams',
            title: 'Team · Kapazität',
            subtitle: overview ? `${overview.totals.members} Mitglieder` : 'Team Panel',
          }}
        />
      </div>
    </div>
  )
}
