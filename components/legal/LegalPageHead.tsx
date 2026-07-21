import type { ReactNode } from 'react'
import { LEGAL_STAND_DATE } from '@/lib/legal-company'

type Props = {
  /** @deprecated Eyebrow labels are banned across Festag — ignored. */
  kicker?: string
  title: string
  /** @deprecated Page leads under h1 are banned — ignored. */
  lead?: string
  /** @deprecated Meta under h1 is banned — use LegalStand at article end. */
  meta?: string
}

/** Title only — no kickers, leads, or meta under the h1 (Festag rules). */
export default function LegalPageHead({ title }: Props) {
  return (
    <header className="legal-head">
      <h1 className="legal-title">{title}</h1>
    </header>
  )
}

type StandProps = {
  /** Optional version label, e.g. "4.0" — joined with commas, never middle dots. */
  version?: string
  children?: ReactNode
}

/**
 * Quiet revision line at the end of the article — not under the title.
 * Format: „Stand: 21. Juli 2026, Version 4.0, gültig ab diesem Datum.“
 */
export function LegalStand({ version, children }: StandProps) {
  if (children) return <p className="legal-stand">{children}</p>
  const parts = [`Stand: ${LEGAL_STAND_DATE}`]
  if (version) parts.push(`Version ${version}`)
  parts.push('gültig ab diesem Datum')
  return <p className="legal-stand">{parts.join(', ')}.</p>
}
