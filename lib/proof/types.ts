/**
 * Proof capsules — calm evidence chips for clients/CEOs.
 * Proof of what happened, not status theater or %.
 */

export type ProofCapsuleKind =
  | 'signal'
  | 'decision'
  | 'issue'
  | 'proof'
  | 'activity'
  | 'deliverable'

export type ProofCapsule = {
  id: string
  label: string
  kind: ProofCapsuleKind
  /** ISO timestamp when the underlying event occurred. */
  occurredAt?: string | null
  /** Optional deep link (client-safe). */
  href?: string | null
  /** Proof strength when sourced from evidence rows. */
  strength?: 'weak' | 'medium' | 'strong' | 'verified' | null
}

export function clampProofLabel(s: string, max = 52): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}
