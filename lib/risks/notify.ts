// ─────────────────────────────────────────────────────────────────────────────
// Wann ein Risiko jemanden stört.
//
// Selten. Ein Signal ist keine Nachricht, und ein mittleres Risiko auch nicht.
// Gemeldet wird nur, was kritisch und offen ist — alles andere findet man auf
// der Risikoseite, wenn man hinschaut.
//
// Der Kunde bekommt die Kundenfassung, das Team die Lieferfassung — dieselbe
// Sache, zwei Sprachen. Und jedes Risiko meldet sich höchstens einmal;
// dafür steht der Verlauf ein, nicht ein Zähler im Speicher.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { writeEvent } from '@/lib/risks/engine'
import { delayLabel, severityLabel } from '@/lib/risks/present'
import type { Risk } from '@/lib/risks/types'
import { safeTableRows } from '@/lib/supabase/safe-table'

type AnyClient = SupabaseClient<any, any, any>

/**
 * Nur ein kritisches, noch offenes Risiko unterbricht jemanden. Alles
 * darunter findet man auf der Risikoseite, wenn man hinschaut.
 *
 * Entscheidungen melden sich selbst — der Decision Engine benachrichtigt den
 * Entscheider bereits, hier würde dieselbe Sache ein zweites Mal klingeln.
 */
function isWorthNotifying(risk: Risk): boolean {
  if (risk.severity !== 'critical') return false
  return risk.status === 'detected' || risk.status === 'active' || risk.status === 'monitoring'
}

/** Wurde für dieses Risiko schon einmal benachrichtigt? */
async function alreadyNotified(supa: AnyClient, riskId: string): Promise<boolean> {
  const rows = await safeTableRows<any>(
    (supa as any)
      .from('risk_events')
      .select('id')
      .eq('risk_id', riskId)
      .eq('event_type', 'notified')
      .limit(1),
  )
  return rows.length > 0
}

export async function notifyAboutRisk(
  supa: AnyClient,
  risk: Risk,
): Promise<{ notified: string[] } | null> {
  if (!isWorthNotifying(risk)) return null
  if (await alreadyNotified(supa, risk.id)) return null

  const { data: project } = await (supa as any)
    .from('projects')
    .select('id,title,user_id,client_id,assigned_dev')
    .eq('id', risk.project_id)
    .maybeSingle()
  if (!project) return null

  const consequence = delayLabel(risk.potential_delay_days)
  const recipients: Array<{ userId: string; audience: 'client' | 'dev' }> = []

  // Wer das Projekt verantwortet, erfährt es in Kundensprache.
  for (const id of [project.client_id, project.user_id]) {
    if (id && !recipients.some(r => r.userId === id)) {
      recipients.push({ userId: id, audience: 'client' })
    }
  }
  // Wer daran arbeitet, erfährt es in Liefersprache.
  const dev = project.assigned_dev ?? risk.owner_id
  if (dev && !recipients.some(r => r.userId === dev)) {
    recipients.push({ userId: dev, audience: 'dev' })
  }

  if (!recipients.length) return null

  const clientTitle = risk.client_title || risk.title
  const clientBody = [
    risk.client_summary || '',
    consequence ? `Mögliche Auswirkung: ${consequence}.` : '',
  ].filter(Boolean).join(' ').slice(0, 400)

  const devBody = [
    risk.description || '',
    risk.recommendation ? `Empfohlen: ${risk.recommendation}` : '',
  ].filter(Boolean).join(' — ').slice(0, 400)

  const notified: string[] = []
  for (const recipient of recipients) {
    const isClient = recipient.audience === 'client'
    const title = isClient
      ? clientTitle
      : `${severityLabel(risk.severity)}: ${risk.title}`
    const body = isClient ? clientBody : devBody

    const { error } = await (supa as any).from('notifications').insert({
      user_id: recipient.userId,
      project_id: risk.project_id,
      audience: recipient.audience,
      kind: 'risk_detected',
      type: 'risk_detected',
      title: title.slice(0, 240),
      body,
      message: body,
      // Es gibt eine Risikoseite, nicht zwei — die Fassung entscheidet die Rolle.
      link: `/risks?open=${risk.id}`,
      read: false,
      payload: {
        risk_id: risk.id,
        severity: risk.severity,
        project_title: project.title ?? null,
      },
    })
    if (!error) notified.push(recipient.userId)
  }

  if (!notified.length) return null

  // Der Verlauf ist zugleich die Dedupe-Sperre: einmal gemeldet, nie wieder.
  await writeEvent(supa, risk.id, {
    event_type: 'notified',
    actor_kind: 'system',
    summary: 'Über dieses Risiko wurde informiert.',
    payload: { recipients: notified },
  })

  return { notified }
}

/** Nach einem Erkennungslauf: melden, was wirklich stört. */
export async function notifyAboutRisks(supa: AnyClient, risks: Risk[]): Promise<number> {
  let count = 0
  for (const risk of risks) {
    const result = await notifyAboutRisk(supa, risk).catch(() => null)
    if (result) count += 1
  }
  return count
}
