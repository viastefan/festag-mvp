'use client'

/**
 * /dev/team — Team Layer (Delivery).
 *
 * Spec (festag_dev_panel.md → Rollen & team_lead/agency_owner):
 *   Teamfortschritt, Mitarbeiter-Aktivität, Risiken (Blocker), Accountability.
 *
 * Zeigt das operative Lieferteam mit Live-Workload pro Person: aktive Tasks,
 * offene Reviews, Blocker, letzte Aktivität, Verfügbarkeit und Skills. Die
 * Buckets entstehen aus `tasks` (assigned_to) über devFlowFromLegacy — also
 * dieselbe Statuslogik wie Review Center und Client-Übersetzung.
 *
 * Datenquellen (alle workspace-/RLS-gescoped):
 *   profiles  — Teammitglieder + Verfügbarkeit/Skills
 *   tasks     — assigned_to → Workload-Buckets
 *
 * Access ist über DevAppShell gegated — kein hard-bounce zu /login von hier.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowsClockwise, WarningCircle, UserPlus } from '@phosphor-icons/react'
import { devFlowFromLegacy, type DevFlow } from '@/lib/tasks/work-types'
import InviteDevModal from '@/components/dev/InviteDevModal'

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

type Member = {
  id: string
  email: string | null
  full_name: string | null
  first_name: string | null
  role: string | null
  position: string | null
  availability: string | null
  skills: string[] | null
  created_at: string | null
}

type TaskLite = {
  id: string
  assigned_to: string | null
  status: string | null
  dev_status: string | null
  updated_at: string | null
  finished_by_dev_at: string | null
}

type Workload = {
  active: number
  review: number
  blocked: number
  open: number
  done: number
  lastActive: string | null
}

// ────────────────────────────────────────────────────────────────────────
// Constants / helpers
// ────────────────────────────────────────────────────────────────────────

// Operative Lieferrollen — Clients und nicht-bestätigte User bleiben außen vor.
const TEAM_ROLES = ['dev', 'developer', 'admin', 'designer', 'reviewer', 'marketer', 'project_owner']

const AVAIL_LABEL: Record<string, string> = {
  full_time: 'Voll verfügbar',
  part_time: 'Teilzeit',
  limited: 'Eingeschränkt',
  unavailable: 'Nicht verfügbar',
}

// Slate-zurückhaltend — kein lautes Grün/Rot. Nur „unavailable" wird gedimmt.
function availTone(a?: string | null): { dot: string; muted: boolean } {
  switch (a ?? 'full_time') {
    case 'full_time':   return { dot: '#5B8A6B', muted: false }
    case 'part_time':   return { dot: '#5B647D', muted: false }
    case 'limited':     return { dot: '#8A7F5B', muted: false }
    case 'unavailable': return { dot: 'var(--text-muted)', muted: true }
    default:            return { dot: '#5B647D', muted: false }
  }
}

function roleLabel(role?: string | null): string {
  switch ((role ?? '').toLowerCase()) {
    case 'project_owner':
    case 'owner':       return 'Project Owner'
    case 'admin':       return 'Admin'
    case 'developer':
    case 'dev':         return 'Developer'
    case 'designer':    return 'Designer'
    case 'reviewer':    return 'Reviewer'
    case 'marketer':    return 'Marketing'
    default:            return role || 'Mitglied'
  }
}

function memberName(m: Member): string {
  return m.full_name?.trim() || m.first_name?.trim() || m.email?.split('@')[0] || 'Developer'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const DONE_FLOWS = new Set<DevFlow>(['completed', 'approved_by_owner'])
const REVIEW_FLOWS = new Set<DevFlow>(['needs_review', 'finished_by_dev', 'verified_by_tagro'])

function fmtAgo(v?: string | null): string {
  if (!v) return 'keine Aktivität'
  const t = new Date(v).getTime()
  if (Number.isNaN(t)) return '—'
  const min = Math.floor((Date.now() - t) / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`
  const w = Math.floor(d / 7)
  if (w < 5) return `vor ${w} Wo`
  try { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(v)) }
  catch { return '—' }
}

// ────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────

export default function DevTeamPage() {
  const supabase = useMemo(() => createClient(), [])
  const [members, setMembers] = useState<Member[]>([])
  const [workloads, setWorkloads] = useState<Record<string, Workload>>({})
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    const { data: memberData } = await supabase
      .from('profiles')
      .select('id,email,full_name,first_name,role,position,availability,skills,created_at')
      .in('role', TEAM_ROLES)
      .order('created_at', { ascending: true })

    const nextMembers = ((memberData as Member[] | null) ?? [])
    const ids = nextMembers.map(m => m.id)

    let nextWorkloads: Record<string, Workload> = {}
    if (ids.length > 0) {
      const { data: taskData } = await (supabase as any)
        .from('tasks')
        .select('id,assigned_to,status,dev_status,updated_at,finished_by_dev_at')
        .in('assigned_to', ids)
        .limit(1500)

      const tasks = (taskData as TaskLite[] | null) ?? []
      const acc: Record<string, Workload> = {}
      for (const id of ids) acc[id] = { active: 0, review: 0, blocked: 0, open: 0, done: 0, lastActive: null }

      for (const t of tasks) {
        const id = t.assigned_to
        if (!id || !acc[id]) continue
        const flow = devFlowFromLegacy(t.status, t.dev_status)
        const bucket = acc[id]
        if (flow === 'in_progress') bucket.active++
        if (REVIEW_FLOWS.has(flow)) bucket.review++
        if (flow === 'blocked') bucket.blocked++
        if (DONE_FLOWS.has(flow)) bucket.done++
        else if (flow !== 'cancelled') bucket.open++
        const stamp = t.updated_at || t.finished_by_dev_at
        if (stamp && (!bucket.lastActive || stamp > bucket.lastActive)) bucket.lastActive = stamp
      }
      nextWorkloads = acc
    }

    setMembers(nextMembers)
    setWorkloads(nextWorkloads)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const kpis = useMemo(() => {
    let availableNow = 0, reviewBacklog = 0, blocked = 0
    for (const m of members) {
      if ((m.availability ?? 'full_time') === 'full_time') availableNow++
      const w = workloads[m.id]
      if (w) { reviewBacklog += w.review; blocked += w.blocked }
    }
    return { members: members.length, availableNow, reviewBacklog, blocked }
  }, [members, workloads])

  return (
    <div className="dev-page">
      <InviteDevModal open={inviteOpen} onClose={() => setInviteOpen(false)} />

      <header className="dv-head">
        <h1 className="dv-title">Team</h1>
        <div className="dv-head-actions">
          <button
            className="dv-btn"
            onClick={() => setInviteOpen(true)}
            type="button"
            title="Developer einladen"
          >
            <UserPlus size={13} weight="regular" />
            Einladen
          </button>
          <button className="dv-btn" onClick={() => load()} title="Aktualisieren" aria-label="Aktualisieren">
            <ArrowsClockwise size={13} />
          </button>
        </div>
      </header>

      <section className="tl-kpis">
        <KpiCard label="Mitglieder" value={kpis.members} />
        <KpiCard label="Voll verfügbar" value={kpis.availableNow} />
        <KpiCard label="Offene Reviews" value={kpis.reviewBacklog} hint="im Team gesamt" />
        <KpiCard label="Blockiert" value={kpis.blocked} warn={kpis.blocked > 0} hint="Risiko" />
      </section>

      <section className="tl-list">
        <div className="tl-list-head">
          <span>Mitglied</span>
          <span>Verfügbarkeit</span>
          <span>Workload</span>
          <span>Zuletzt aktiv</span>
        </div>

        {loading ? (
          <p className="tl-empty">Team wird geladen…</p>
        ) : members.length === 0 ? (
          <p className="tl-empty">Noch keine Teammitglieder im Lieferteam.</p>
        ) : (
          members.map(m => (
            <MemberRow key={m.id} member={m} workload={workloads[m.id]} />
          ))
        )}
      </section>

      <style jsx>{`
        .tl-kpis {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
          margin: 0 var(--dv-4, 32px) var(--dv-3, 24px);
        }

        .tl-list { display: flex; flex-direction: column; }
        .tl-list-head {
          display: grid; grid-template-columns: minmax(220px, 1fr) 180px 260px 130px; gap: 16px;
          padding: 0 var(--dv-4, 32px) 10px; align-items: center;
          color: var(--dv-text-3); font-size: 11px; font-weight: 600;
          letter-spacing: .04em; text-transform: uppercase;
          border-bottom: 1px solid var(--dv-line);
        }
        .tl-empty { padding: 32px var(--dv-4, 32px); color: var(--dv-text-3); font-size: 13px; }

        @media (max-width: 880px) {
          .tl-kpis { grid-template-columns: repeat(2, 1fr); }
          .tl-list-head { display: none; }
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// KPI
// ────────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, hint, warn }: { label: string; value: number; hint?: string; warn?: boolean }) {
  return (
    <div className={`kpi${warn ? ' warn' : ''}`}>
      <span className="kpi-val">{value}</span>
      <span className="kpi-label">{label}</span>
      {hint && <span className="kpi-hint">{hint}</span>}
      <style jsx>{`
        .kpi {
          display: flex; flex-direction: column; gap: 2px;
          padding: 13px 14px; border-radius: var(--dv-r, 12px);
          border: 1px solid var(--dv-line); background: var(--dv-surface);
        }
        .kpi.warn { border-color: var(--dv-error); }
        .kpi-val { font-size: 20px; font-weight: 400; font-variant-numeric: tabular-nums; letter-spacing: -.01em; line-height: 1; color: var(--dv-text); }
        .kpi.warn .kpi-val { color: var(--dv-error); }
        .kpi-label { margin-top: 6px; font-size: 12px; font-weight: 500; color: var(--dv-text-2); }
        .kpi-hint { font-size: 10.5px; color: var(--dv-text-3); }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Member row
// ────────────────────────────────────────────────────────────────────────

function MemberRow({ member, workload }: { member: Member; workload?: Workload }) {
  const name = memberName(member)
  const tone = availTone(member.availability)
  const w = workload ?? { active: 0, review: 0, blocked: 0, open: 0, done: 0, lastActive: null }
  const skills = (member.skills ?? []).filter(Boolean)

  return (
    <div className="mr">
      <div className="mr-id">
        <div className="mr-avatar" aria-hidden>{initials(name)}</div>
        <div className="mr-id-text">
          <strong>{name}</strong>
          <small>{member.position?.trim() || roleLabel(member.role)}</small>
          {skills.length > 0 && (
            <div className="mr-skills">
              {skills.slice(0, 3).map(s => <span key={s} className="mr-skill">{s}</span>)}
              {skills.length > 3 && <span className="mr-skill more">+{skills.length - 3}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="mr-avail">
        <span className="mr-dot" style={{ background: tone.dot }} aria-hidden />
        <span className={tone.muted ? 'muted' : ''}>{AVAIL_LABEL[member.availability ?? 'full_time'] ?? 'Verfügbar'}</span>
      </div>

      <div className="mr-load">
        <span className="stat"><b>{w.active}</b> aktiv</span>
        <span className="stat"><b>{w.review}</b> Prüfung</span>
        <span className={`stat${w.blocked > 0 ? ' warn' : ''}`}>
          {w.blocked > 0 && <WarningCircle size={11} weight="fill" />}
          <b>{w.blocked}</b> blockiert
        </span>
        <span className="stat muted"><b>{w.open}</b> offen</span>
      </div>

      <div className="mr-last">{fmtAgo(w.lastActive)}</div>

      <style jsx>{`
        .mr {
          display: grid; grid-template-columns: minmax(220px, 1fr) 180px 260px 130px; gap: 16px;
          align-items: center; min-height: 56px; padding: 10px var(--dv-4, 32px);
          border-bottom: 1px solid var(--dv-line);
          transition: background var(--dv-speed, .12s);
        }
        .mr:hover { background: var(--dv-surface); }

        .mr-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .mr-avatar {
          width: 32px; height: 32px; border-radius: 8px; flex: 0 0 auto;
          display: grid; place-items: center;
          background: var(--dv-surface); color: var(--dv-text); border: 1px solid var(--dv-line);
          font-size: 10.5px; font-weight: 600; letter-spacing: .02em;
        }
        .mr-id-text { min-width: 0; }
        .mr-id-text strong { display: block; font-size: 13px; font-weight: 500; color: var(--dv-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mr-id-text small { display: block; margin-top: 1px; color: var(--dv-text-3); font-size: 11.5px; }
        .mr-skills { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
        .mr-skill {
          font-size: 10px; font-weight: 500; padding: 1px 6px; border-radius: 6px;
          background: var(--dv-surface); color: var(--dv-text-2);
          border: 1px solid var(--dv-line);
        }
        .mr-skill.more { color: var(--dv-text-3); }

        .mr-avail { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--dv-text-2); }
        .mr-avail .muted { color: var(--dv-text-3); }
        .mr-dot { width: 6px; height: 6px; border-radius: 50%; flex: 0 0 auto; }

        .mr-load { display: flex; flex-wrap: wrap; gap: 5px; }
        .stat {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 6px; font-size: 11px; color: var(--dv-text-2);
          background: var(--dv-surface); border: 1px solid var(--dv-line);
        }
        .stat b { font-weight: 600; color: var(--dv-text); }
        .stat.muted { color: var(--dv-text-3); background: transparent; border-color: transparent; }
        .stat.muted b { color: var(--dv-text-2); }
        .stat.warn { color: var(--dv-error); border-color: var(--dv-error); }
        .stat.warn b { color: var(--dv-error); }
        .stat.warn svg { color: var(--dv-error); flex: 0 0 auto; }

        .mr-last { font-size: 12px; color: var(--dv-text-3); }

        @media (max-width: 880px) {
          .mr {
            grid-template-columns: 1fr; gap: 10px; padding: 14px;
            border: 1px solid var(--dv-line); border-radius: var(--dv-r, 12px);
            margin: 0 var(--dv-3, 24px) 8px; background: var(--dv-surface); min-height: 0;
          }
          .mr:hover { background: var(--dv-surface); }
          .mr-last::before { content: 'Zuletzt aktiv, '; color: var(--dv-text-3); }
        }
      `}</style>
    </div>
  )
}
