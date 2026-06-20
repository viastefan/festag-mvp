import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyProjectCreated } from '@/lib/sync/project-created'
import { translateBudgetNote } from '@/lib/tagro/translate-budget'
import { sendDevAssignmentEmail } from '@/lib/email/send'

/**
 * Client-side delivery choices from NewProjectModal → how the project surfaces
 * in the Dev Panel.
 *
 *   festag_delivery      → „Verfügbar"-Pool (self-enroll via /api/dev/projects/join)
 *   assign_existing_dev  → proposal_received for one dev (Wartet auf Antwort)
 *   invite_new_dev       → dev_invitations → proposal after confirm
 *   team_internal        → project_proposals per team member
 *
 * Dev-created projects (/api/dev/projects/create) skip this bridge — they land
 * directly in „Bei dir aktiv" via project_assignments.
 */

export const CLIENT_DELIVERY_MODELS = [
  'festag_delivery',
  'assign_existing_dev',
  'invite_new_dev',
  'team_internal',
] as const

export type ClientDeliveryModel = (typeof CLIENT_DELIVERY_MODELS)[number]

export type DevPanelSurface = 'pool_available' | 'pool_mine' | 'proposal' | 'none'

export function isClientDeliveryModel(v: unknown): v is ClientDeliveryModel {
  return typeof v === 'string' && (CLIENT_DELIVERY_MODELS as readonly string[]).includes(v)
}

/** Where a project should appear for a given dev (application-level visibility). */
export function devPanelSurfaceForProject(opts: {
  deliveryModel: string | null | undefined
  devHasActiveAssignment: boolean
  devHasActiveProposal: boolean
  projectHasBlockingProposal: boolean
}): DevPanelSurface {
  if (opts.devHasActiveAssignment) return 'pool_mine'
  if (opts.devHasActiveProposal) return 'proposal'
  if (
    opts.deliveryModel === 'festag_delivery'
    && !opts.projectHasBlockingProposal
  ) {
    return 'pool_available'
  }
  return 'none'
}

export type FestagPoolBudget = {
  min?: number | null
  max?: number | null
  currency?: string
  note?: string | null
}

/**
 * Publish a client project to the Festag dev pool.
 * Sets delivery_model, optional budget fields, pool_published_at, and fans out
 * inbox notifications to every approved dev.
 */
export async function publishFestagPool(
  sb: SupabaseClient<any>,
  opts: {
    projectId: string
    actorId: string
    budget?: FestagPoolBudget
    desiredStartDate?: string | null
  },
) {
  const { data: project, error: loadErr } = await sb
    .from('projects')
    .select('id,title,user_id,classifier_metadata')
    .eq('id', opts.projectId)
    .maybeSingle()

  if (loadErr) throw new Error(loadErr.message)
  if (!project) throw new Error('project_not_found')
  if (project.user_id !== opts.actorId) throw new Error('forbidden')

  const budget = opts.budget ?? {}
  const budgetMin = budget.min != null && Number.isFinite(Number(budget.min)) ? Number(budget.min) : null
  const budgetMax = budget.max != null && Number.isFinite(Number(budget.max)) ? Number(budget.max) : null
  const budgetCurrency = budget.currency || 'EUR'
  const budgetNoteRaw = budget.note ? String(budget.note).trim() : null

  let budgetNoteTranslated: string | null = null
  if (budgetNoteRaw) {
    try {
      const translated = await translateBudgetNote({
        rawNote: budgetNoteRaw,
        projectTitle: project.title,
        budgetMin,
        budgetMax,
        currency: budgetCurrency,
      })
      budgetNoteTranslated = translated.translatedNote
    } catch {
      budgetNoteTranslated = budgetNoteRaw
    }
  }

  const prevMeta = (project.classifier_metadata && typeof project.classifier_metadata === 'object')
    ? project.classifier_metadata as Record<string, unknown>
    : {}

  const { error: updErr } = await sb.from('projects').update({
    delivery_model: 'festag_delivery',
    budget_min: budgetMin,
    budget_max: budgetMax,
    budget_currency: budgetCurrency,
    budget_note_raw: budgetNoteRaw,
    budget_note_translated: budgetNoteTranslated,
    desired_start_date: opts.desiredStartDate || null,
    classifier_metadata: {
      ...prevMeta,
      pool_published_at: new Date().toISOString(),
    },
  }).eq('id', opts.projectId)

  if (updErr) throw new Error(updErr.message)

  await notifyProjectCreated({
    sb,
    projectId: opts.projectId,
    projectTitle: project.title || 'Neues Projekt',
    actorId: opts.actorId,
  }).catch(() => {})

  return { ok: true as const, delivery: 'festag_delivery' as const }
}

/** Direct proposal to an existing dev — surfaces as „Wartet auf Antwort" in Dev Panel. */
export async function publishAssignExistingDev(
  sb: SupabaseClient<any>,
  opts: {
    projectId: string
    actorId: string
    devHandle?: string
    devEmail?: string
    budgetNote?: string | null
    appBaseUrl: string
  },
) {
  const { data: project, error: loadErr } = await sb
    .from('projects')
    .select('id,title,user_id,scope_summary,budget_min,budget_max,budget_currency')
    .eq('id', opts.projectId)
    .maybeSingle()

  if (loadErr) throw new Error(loadErr.message)
  if (!project) throw new Error('project_not_found')
  if (project.user_id !== opts.actorId) throw new Error('forbidden')

  const devHandle = opts.devHandle?.trim()
  const devEmail = opts.devEmail?.trim().toLowerCase()
  if (!devHandle && !devEmail) throw new Error('missing_dev_identifier')

  let devProfile: any = null
  if (devHandle) {
    const { data } = await sb
      .from('profiles')
      .select('id,email,full_name,dev_username,role')
      .eq('dev_username', devHandle)
      .maybeSingle()
    devProfile = data
  }
  if (!devProfile && devEmail) {
    const { data } = await sb
      .from('profiles')
      .select('id,email,full_name,dev_username,role')
      .ilike('email', devEmail)
      .maybeSingle()
    devProfile = data
  }
  if (!devProfile) throw new Error('dev_not_found')

  const budgetNote = opts.budgetNote?.trim() || null
  let budgetNoteTranslated: string | null = null
  if (budgetNote) {
    try {
      const t = await translateBudgetNote({
        rawNote: budgetNote,
        projectTitle: project.title,
        budgetMin: project.budget_min,
        budgetMax: project.budget_max,
      })
      budgetNoteTranslated = t.translatedNote
    } catch {
      budgetNoteTranslated = budgetNote
    }
  }

  const projectPatch: Record<string, unknown> = { delivery_model: 'assign_existing_dev' }
  if (budgetNote) {
    projectPatch.budget_note_raw = budgetNote
    projectPatch.budget_note_translated = budgetNoteTranslated
  }
  await sb.from('projects').update(projectPatch).eq('id', opts.projectId)

  await sb.from('project_proposals').upsert({
    project_id: opts.projectId,
    dev_id: devProfile.id,
    invited_by: opts.actorId,
    status: 'proposed',
    role_on_project: 'developer',
  }, { onConflict: 'project_id,dev_id' })

  await sb.from('notifications').insert({
    user_id: devProfile.id,
    project_id: opts.projectId,
    audience: 'dev',
    kind: 'proposal_received',
    type: 'proposal_received',
    title: `Neues Projektangebot: ${project.title}`,
    body: `Du wurdest für „${project.title}" vorgeschlagen. Prüfe das Briefing und entscheide.`,
    message: `Neues Projektangebot für „${project.title}".`,
    read: false,
    payload: {
      project_id: opts.projectId,
      project_title: project.title,
      budget_min: project.budget_min,
      budget_max: project.budget_max,
      scope_summary: project.scope_summary,
    },
  })

  if (devProfile.email) {
    await sendDevAssignmentEmail({
      to: devProfile.email,
      devName: devProfile.full_name,
      projectTitle: project.title || 'Dein Projekt',
      scope: project.scope_summary,
      devPanelUrl: `${opts.appBaseUrl}/dev`,
      fromName: 'Festag',
    }).catch(() => {})
  }

  return { ok: true as const, delivery: 'assign_existing_dev' as const, devId: devProfile.id }
}
