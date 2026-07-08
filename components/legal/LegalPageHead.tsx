type Props = {
  /** @deprecated Eyebrow labels are banned across Festag — ignored. */
  kicker?: string
  title: string
  lead?: string
  meta?: string
}

export default function LegalPageHead({
  title,
  lead,
  meta,
}: Props) {
  return (
    <header className="legal-head">
      <h1 className="legal-title">{title}</h1>
      {lead ? <p className="legal-lead">{lead}</p> : null}
      {meta ? <p className="legal-head-meta">{meta}</p> : null}
    </header>
  )
}
