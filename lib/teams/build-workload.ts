import type { SupabaseClient } from '@supabase/supabase-js'
import { devFlowFromLegacy, type DevFlow } from '@/lib/tasks/work-types'

export type TeamMember = {
  id: string
  email: string | null
  full_name: string | null
  first_name: string | null
  role: string | null
  position: string | null
  availability: string | null
}

export type MemberWorkload = {
  active: number
  review: number
  blocked: number
  open: number
  done: number
  lastActive: string | null
  overloaded: boolean
  atRisk: boolean
}

export type TeamWorkloadOverview = {
  members: TeamMember[]
  workloads: Record<string, MemberWorkload>
  totals: {
    members: number
    available: number
    reviewBacklog: number
    blocked: number
    overloaded: number
  }
  tagro_insights: string[]
}

const TEAM_ROLES = ['dev', 'developer', 'admin', 'designer', 'reviewer', 'marketer', 'project_owner']
const DONE_FLOWS = new Set<DevFlow>(['completed', 'approved_by_owner'])
const REVIEW_FLOWS = new Set<DevFlow>(['needs_review', 'finished_by_dev', 'verified_by_tagro'])

function deriveRisk(w: MemberWorkload): { overloaded: boolean; atRisk: boolean } {
  const overloaded = w.active >= 6 || (w.active + w.review) >= 8
  const atRisk = w.blocked > 0 || overloaded
  return { overloaded, atRisk }
}

export async function buildTeamWorkload(
  sb: SupabaseClient<any>,
): Promise<TeamWorkloadOverview> {
  const { data: memberData } = await sb
    .from('profiles')
    .select('id,email,full_name,first_name,role,position,availability')
    .in('role', TEAM_ROLES)
    .order('created_at', { ascending: true })

  const members = ((memberData as TeamMember[] | null) ?? [])
  const ids = members.map(m => m.id)
  const workloads: Record<string, MemberWorkload> = {}

  if (ids.length > 0) {
    const { data: taskData } = await sb
      .from('tasks')
      .select('id,assigned_to,status,dev_status,updated_at,finished_by_dev_at')
      .in('assigned_to', ids)
      .limit(2000)

    for (const id of ids) {
      workloads[id] = {
        active: 0, review: 0, blocked: 0, open: 0, done: 0, lastActive: null,
        overloaded: false, atRisk: false,
      }
    }

    for (const t of (taskData as any[]) ?? []) {
      const id = t.assigned_to
      if (!id || !workloads[id]) continue
      const flow = devFlowFromLegacy(t.status, t.dev_status)
      const bucket = workloads[id]
      if (flow === 'in_progress') bucket.active++
      if (REVIEW_FLOWS.has(flow)) bucket.review++
      if (flow === 'blocked') bucket.blocked++
      if (DONE_FLOWS.has(flow)) bucket.done++
      else if (flow !== 'cancelled') bucket.open++
      const stamp = t.updated_at || t.finished_by_dev_at
      if (stamp && (!bucket.lastActive || stamp > bucket.lastActive)) bucket.lastActive = stamp
    }

    for (const id of ids) {
      const risk = deriveRisk(workloads[id])
      workloads[id] = { ...workloads[id], ...risk }
    }
  }

  let available = 0
  let reviewBacklog = 0
  let blocked = 0
  let overloaded = 0
  for (const m of members) {
    if ((m.availability ?? 'full_time') === 'full_time') available++
    const w = workloads[m.id]
    if (w) {
      reviewBacklog += w.review
      blocked += w.blocked
      if (w.overloaded) overloaded++
    }
  }

  const tagro_insights: string[] = []
  if (overloaded > 0) tagro_insights.push(`${overloaded} Teammitglied${overloaded === 1 ? '' : 'er'} überlastet`)
  if (blocked > 0) tagro_insights.push(`${blocked} offene Blocker im Team`)
  if (reviewBacklog >= 5) tagro_insights.push(`Review-Backlog: ${reviewBacklog} Tasks warten auf Freigabe`)

  return {
    members,
    workloads,
    totals: {
      members: members.length,
      available,
      reviewBacklog,
      blocked,
      overloaded,
    },
    tagro_insights,
  }
}
