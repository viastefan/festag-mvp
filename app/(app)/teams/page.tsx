'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, Plus, UserPlus, WarningCircle } from '@phosphor-icons/react'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import PortalMobileNavSheet from '@/components/portal/PortalMobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import TeamMemberCardRow from '@/components/teams/TeamMemberCardRow'
import TeamSubNav from '@/components/teams/TeamSubNav'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { ACTIVITY_CSS } from '@/components/activity/activity-styles'
import { TEAMS_CSS } from '@/components/teams/teams-styles'
import { fetchJson } from '@/lib/portal/fetch-api'
import { DEMO_TEAM_OVERVIEW, shouldUseDemoFallback } from '@/lib/demo/portal-preview'
import type { TeamWorkloadOverview } from '@/lib/teams/build-workload'

export default function TeamsOverviewPage() {
  const [overview, setOverview] = useState<TeamWorkloadOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

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

  const pageLeadLine = useMemo(() => {
    if (loading) return 'Team-Überblick wird geladen…'
    if (!overview || overview.totals.members === 0) {
      return 'Lade Developer und Mitglieder ein — Tagro zeigt dann Kapazität und Workload.'
    }
    if (overview.totals.overloaded > 0) {
      return `${overview.totals.overloaded} Person${overview.totals.overloaded === 1 ? '' : 'en'} überlastet — Tagro erkennt Blocker und Review-Backlogs.`
    }
    return 'Tagro erkennt Überlast, Blocker und Review-Backlogs im Team.'
  }, [loading, overview])

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{ACTIVITY_CSS}</style>
      <style>{TEAMS_CSS}</style>

      <PortalMobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="Team"
            lead={pageLeadLine}
            onMenu={() => setNavOpen(true)}
            mobileMenuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
              { id: 'invite', label: 'Mitglied einladen', href: '/invite' },
            ]}
            actions={(
              <>
                <Link href="/invite" className="dec-head-tool" title="Mitglied einladen" aria-label="Mitglied einladen">
                  <UserPlus size={15} />
                </Link>
                <button type="button" className="dec-head-tool" onClick={() => void load()} aria-label="Aktualisieren">
                  <ArrowsClockwise size={15} />
                </button>
              </>
            )}
          />

          <TeamSubNav active="overview" />
        </div>

        <div className="dec-scroll-body">
          {isDemo && <DemoPreviewBanner note="Beispiel-Team — echte Workload-Daten nach Anmeldung." />}

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

              {overview.members.length === 0 ? (
                <div className="dec-empty">
                  <UserPlus size={16} />
                  <p>Noch keine Teammitglieder.</p>
                  <small>Lade Developer unter Einstellungen oder über Einladung ein.</small>
                  <Link href="/invite" className="dec-cta" style={{ marginTop: 16, display: 'inline-flex' }}>
                    <Plus size={14} /> Mitglied einladen
                  </Link>
                </div>
              ) : overview.members.map((m, i) => (
                <TeamMemberCardRow
                  key={m.id}
                  member={m}
                  workload={overview.workloads[m.id]}
                  isLast={i === overview.members.length - 1}
                />
              ))}
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
