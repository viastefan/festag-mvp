/**
 * Project handover — offering a project to someone and what happens when
 * they accept.
 *
 * The relationship is derived from both profiles, never asked of the user:
 * a developer handing a project to a client is a different arrangement than
 * two developers sharing work, and the system sets it up accordingly.
 */

export type HandoverRelationship = 'dev_client' | 'client_dev' | 'dev_dev' | 'unknown'
export type HandoverStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired'

type ServiceClient = { from: (table: string) => any }

const DEV_ROLES = new Set(['dev', 'developer', 'admin'])
const CLIENT_ROLES = new Set(['client', 'customer', 'owner'])

/** Which arrangement is being set up, from the two roles involved. */
export function detectRelationship(
  fromRole: string | null | undefined,
  toRole: string | null | undefined,
): HandoverRelationship {
  const a = (fromRole || '').trim().toLowerCase()
  const b = (toRole || '').trim().toLowerCase()
  if (DEV_ROLES.has(a) && CLIENT_ROLES.has(b)) return 'dev_client'
  if (CLIENT_ROLES.has(a) && DEV_ROLES.has(b)) return 'client_dev'
  if (DEV_ROLES.has(a) && DEV_ROLES.has(b)) return 'dev_dev'
  return 'unknown'
}

/**
 * What the recipient becomes on the project. A client is never made a
 * developer just because a developer handed the project over.
 */
export function roleForRelationship(rel: HandoverRelationship): string {
  return rel === 'dev_client' ? 'client' : 'developer'
}

/** What a handover of this kind needs before it can be sent. */
export function requirementsFor(rel: HandoverRelationship): {
  needsPrice: boolean
  needsContract: boolean
  note: string
} {
  if (rel === 'dev_client' || rel === 'client_dev') {
    return {
      needsPrice: true,
      needsContract: true,
      note: 'Auftragsverhältnis — Preis und Vertrag gehören dazu. Der Preis darf offen bleiben und später vereinbart werden.',
    }
  }
  if (rel === 'dev_dev') {
    return {
      needsPrice: false,
      needsContract: false,
      note: 'Zusammenarbeit im Team — kein Angebot nötig.',
    }
  }
  return { needsPrice: false, needsContract: false, note: '' }
}

export type CreateHandoverInput = {
  projectId: string
  fromUserId: string
  toUserId: string
  message?: string | null
  offerAmount?: number | null
  offerCurrency?: string
  offerNote?: string | null
}

export type HandoverResult =
  | { ok: true; id: string; relationship: HandoverRelationship }
  | { ok: false; error: string }

/**
 * Offer a project to someone. Writes the handover and notifies the
 * recipient. Refuses to hand a project to its own owner.
 */
export async function createHandover(
  service: ServiceClient,
  input: CreateHandoverInput,
): Promise<HandoverResult> {
  if (input.fromUserId === input.toUserId) {
    return { ok: false, error: 'self_handover' }
  }

  const { data: project } = await service
    .from('projects')
    .select('id, title, user_id')
    .eq('id', input.projectId)
    .maybeSingle()
  if (!project) return { ok: false, error: 'project_not_found' }

  const { data: people } = await service
    .from('profiles')
    .select('id, role, full_name')
    .in('id', [input.fromUserId, input.toUserId])

  const from = (people || []).find((p: any) => p.id === input.fromUserId)
  const to = (people || []).find((p: any) => p.id === input.toUserId)
  if (!to) return { ok: false, error: 'recipient_not_found' }

  const relationship = detectRelationship(from?.role, to?.role)
  const hasPrice = typeof input.offerAmount === 'number' && input.offerAmount >= 0

  const { data: row, error } = await service
    .from('project_handovers')
    .insert({
      project_id: input.projectId,
      from_user_id: input.fromUserId,
      to_user_id: input.toUserId,
      relationship,
      role_offered: roleForRelationship(relationship),
      message: input.message ?? null,
      offer_amount: hasPrice ? input.offerAmount : null,
      offer_currency: input.offerCurrency || 'EUR',
      offer_note: input.offerNote ?? null,
      price_open: !hasPrice,
    })
    .select('id')
    .maybeSingle()

  if (error || !row) {
    // The partial unique index means an open offer already exists.
    return { ok: false, error: 'handover_exists' }
  }

  const senderName = from?.full_name || 'Jemand'
  await service.from('notifications').insert({
    user_id: input.toUserId,
    type: 'project_handover',
    kind: 'project_handover',
    title: `${senderName} möchte dir „${project.title}" übergeben`,
    message: hasPrice
      ? `Angebot: ${formatAmount(input.offerAmount as number, input.offerCurrency)}`
      : 'Preis noch offen — kann später vereinbart werden.',
    link: `/projects?handover=${row.id}`,
    project_id: input.projectId,
    payload: { handoverId: row.id, relationship },
  })

  return { ok: true, id: row.id, relationship }
}

export type RespondResult =
  | { ok: true; status: 'accepted' | 'declined' }
  | { ok: false; error: string }

/**
 * Answer a handover. Accepting wires both accounts to the project — the
 * recipient becomes a member with the right role, and the project records
 * who it now belongs to.
 */
export async function respondToHandover(
  service: ServiceClient,
  input: { handoverId: string; userId: string; accept: boolean; reason?: string | null },
): Promise<RespondResult> {
  const { data: h } = await service
    .from('project_handovers')
    .select('id, project_id, from_user_id, to_user_id, relationship, role_offered, status, offer_amount, offer_currency')
    .eq('id', input.handoverId)
    .maybeSingle()

  if (!h) return { ok: false, error: 'not_found' }
  if (h.to_user_id !== input.userId) return { ok: false, error: 'not_allowed' }
  if (h.status !== 'pending') return { ok: false, error: 'already_answered' }

  const status = input.accept ? 'accepted' : 'declined'
  await service
    .from('project_handovers')
    .update({
      status,
      decline_reason: input.accept ? null : input.reason ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', h.id)

  if (input.accept) {
    /* Membership — the recipient can now see and work on the project. */
    await service
      .from('project_members')
      .upsert(
        { project_id: h.project_id, user_id: h.to_user_id, role: h.role_offered },
        { onConflict: 'project_id,user_id' },
      )

    await service.from('project_assignments').upsert(
      {
        project_id: h.project_id,
        user_id: h.to_user_id,
        role_on_project: h.role_offered,
        active: true,
        assigned_by: h.from_user_id,
      },
      { onConflict: 'project_id,user_id' },
    )

    /* Record the arrangement on the project itself. */
    const patch =
      h.role_offered === 'client'
        ? { client_id: h.to_user_id }
        : { assigned_dev: h.to_user_id }
    await service.from('projects').update(patch).eq('id', h.project_id)
  }

  const { data: project } = await service
    .from('projects')
    .select('title')
    .eq('id', h.project_id)
    .maybeSingle()

  await service.from('notifications').insert({
    user_id: h.from_user_id,
    type: input.accept ? 'handover_accepted' : 'handover_declined',
    kind: input.accept ? 'handover_accepted' : 'handover_declined',
    title: input.accept
      ? `„${project?.title || 'Projekt'}" wurde angenommen`
      : `„${project?.title || 'Projekt'}" wurde abgelehnt`,
    message: input.accept
      ? 'Ihr arbeitet ab jetzt gemeinsam daran.'
      : input.reason || 'Kein Grund angegeben.',
    link: `/projects`,
    project_id: h.project_id,
    payload: { handoverId: h.id, celebrate: input.accept },
  })

  return { ok: true, status }
}

function formatAmount(amount: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}
