/**
 * Decision Trust Loop — calm client-facing wait copy.
 * Used on Entscheidungen list, executive cards, and Client Moments.
 */

export type TrustDecisionLike = {
  due_at?: string | null
  due_date?: string | null
  escalation_level?: number | null
  requested_for?: string | null
  authority?: string | null
}

/** „Wartet auf dich …“ — deadline + silence escalation, no ticket jargon. */
export function trustWaitLine(d: TrustDecisionLike): string {
  const esc = d.escalation_level ?? 0
  const dueRaw = d.due_at || d.due_date
  const due = dueRaw ? new Date(dueRaw) : null
  const dueValid = due && !Number.isNaN(due.getTime())
  const overdue = Boolean(dueValid && due!.getTime() < Date.now())

  if (esc >= 3) {
    return overdue
      ? 'Wartet auf dich — Frist überschritten, Executive-Eskalation aktiv.'
      : 'Wartet auf dich — stille Eskalation hat die Führung erreicht.'
  }
  if (esc >= 2) {
    return overdue
      ? 'Wartet auf dich — Frist überschritten, Owner und Führung wurden informiert.'
      : 'Wartet auf dich — stille Erinnerung an Owner und Führung.'
  }
  if (esc >= 1) {
    return overdue
      ? 'Wartet auf dich — Frist überschritten, ruhige Erinnerung ist gelaufen.'
      : 'Wartet auf dich — stille Erinnerung wurde gesetzt.'
  }
  if (overdue) {
    return 'Wartet auf dich — die Frist ist überschritten.'
  }
  if (dueValid) {
    const days = Math.max(0, Math.ceil((due!.getTime() - Date.now()) / 86_400_000))
    if (days === 0) return 'Wartet auf dich — Entscheidung heute fällig.'
    if (days === 1) return 'Wartet auf dich — Entscheidung morgen fällig.'
    return `Wartet auf dich — Entscheidung in ${days} Tagen fällig.`
  }
  return 'Wartet auf dich — ohne deine Freigabe stockt der nächste Schritt.'
}

/** Short owner / authority line for list meta. */
export function trustOwnerLine(d: TrustDecisionLike): string | null {
  if (d.requested_for?.trim()) return `Owner: ${d.requested_for.trim()}`
  if (d.authority === 'executive') return 'Owner: Führung'
  if (d.authority === 'client') return 'Owner: Kunde'
  return null
}
