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
import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react'
import { devFlowFromLegacy, type DevFlow } from '@/lib/tasks/work-types'

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
      <header className="tl-head">
        <div>
          <p className="dev-eyebrow">DEV · Team</p>
          <h1>Team Layer</h1>
          <p className="meta">
            Operatives Lieferteam mit Live-Workload, offenen Reviews und Blockern — Accountability an einer Stelle.
          </p>
        </div>
        <button className="tl-refresh" onClick={() => load()} title="Aktualisieren" aria-label="Aktualisieren">
          <ArrowsClockwise size={13} />
        </button>
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
        .tl-head {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
          margin-bottom: 18px; flex-wrap: wrap;
        }
        .tl-head h1 { margin: 0; font-size: 22px; font-weight: 500; letter-spacing: -.012em; line-height: 1.15; }
        .tl-head .meta { margin: 6px 0 0; color: var(--text-muted); font-size: 13px; max-width: 560px; line-height: 1.5; }
        .tl-refresh {
          width: 28px; height: 28px; border: 1px solid var(--border); border-radius: 8px;
          background: transparent; color: var(--text-muted); cursor: pointer; flex: 0 0 auto;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .tl-refresh:hover { background: var(--surface-2); color: var(--text); }

        .tl-kpis {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px;
        }

        .tl-list { display: flex; flex-direction: column; }
        .tl-list-head {
          display: grid; grid-template-columns: minmax(220px, 1fr) 180px 260px 130px; gap: 16px;
          padding: 0 14px 10px; align-items: center;
          color: var(--text-muted); font-size: 11px; font-weight: 600;
          letter-spacing: .04em; text-transform: uppercase;
          border-bottom: 1px solid var(--border);
        }
        .tl-empty { padding: 32px 14px; color: var(--text-muted); font-size: 13px; }

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
          padding: 13px 14px; border-radius: 12px;
          border: 1px solid var(--border); background: var(--surface);
        }
        .kpi.warn { border-color: color-mix(in srgb, #8A6B5B 40%, var(--border)); }
        .kpi-val { font-size: 24px; font-weight: 500; letter-spacing: -.02em; line-height: 1; color: var(--text); }
        .kpi.warn .kpi-val { color: #B08160; }
        .kpi-label { margin-top: 6px; font-size: 12px; font-weight: 500; color: var(--text-secondary); }
        .kpi-hint { font-size: 10.5px; color: var(--text-muted); }
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
          align-items: center; min-height: 66px; padding: 12px 14px;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
        }
        .mr:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }

        .mr-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .mr-avatar {
          width: 34px; height: 34px; border-radius: 10px; flex: 0 0 auto;
          display: grid; place-items: center;
          background: var(--surface-2); color: var(--text); border: 1px solid var(--border);
          font-size: 11px; font-weight: 600; letter-spacing: .02em;
        }
        .mr-id-text { min-width: 0; }
        .mr-id-text strong { display: block; font-size: 13.5px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mr-id-text small { display: block; margin-top: 2px; color: var(--text-muted); font-size: 11.5px; }
        .mr-skills { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
        .mr-skill {
          font-size: 10px; font-weight: 500; padding: 1px 6px; border-radius: 6px;
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
          color: var(--text-secondary); border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
        }
        .mr-skill.more { color: var(--text-muted); }

        .mr-avail { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--text-secondary); }
        .mr-avail .muted { color: var(--text-muted); }
        .mr-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }

        .mr-load { display: flex; flex-wrap: wrap; gap: 5px; }
        .stat {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 6px; font-size: 11px; color: var(--text-secondary);
          background: color-mix(in srgb, var(--surface-2) 55%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
        }
        .stat b { font-weight: 600; color: var(--text); }
        .stat.muted { color: var(--text-muted); background: transparent; border-color: transparent; }
        .stat.muted b { color: var(--text-secondary); }
        .stat.warn { color: #B08160; border-color: color-mix(in srgb, #8A6B5B 40%, var(--border)); }
        .stat.warn b { color: #B08160; }
        .stat.warn svg { color: #B08160; flex: 0 0 auto; }

        .mr-last { font-size: 12px; color: var(--text-muted); }

        @media (max-width: 880px) {
          .mr {
            grid-template-columns: 1fr; gap: 12px; padding: 14px;
            border: 1px solid var(--border); border-radius: 14px; margin-bottom: 10px;
            background: var(--surface); min-height: 0;
          }
          .mr:hover { background: var(--surface); }
          .mr-last::before { content: 'Zuletzt aktiv · '; color: var(--text-muted); }
        }
      `}</style>
    </div>
  )
}
