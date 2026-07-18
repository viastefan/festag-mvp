import type { ReactNode } from 'react'

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

/** Quiet revision line at the end of the article — not under the title. */
export function LegalStand({ children }: { children: ReactNode }) {
  return <p className="legal-stand">{children}</p>
}
