'use client'

type Props = {
  projectTitle: string
  title: string
  body: string
  dateLabel: string
  isLast?: boolean
}

export default function TeamReportCardRow({ projectTitle, title, body, dateLabel, isLast }: Props) {
  return (
    <article
      className="dec-card team-report-row"
      style={isLast ? { borderBottom: 'none' } : undefined}
    >
      <div className="dec-card-left">
        <div className="dec-card-title-block">
          <p className="dec-card-title">{title}</p>
          <p className="dec-card-project">{projectTitle}</p>
        </div>
        <span className="dec-card-type-pill">
          <span className="dec-card-dot" style={{ background: '#6366f1' }} />
          Bericht
        </span>
      </div>

      <div className="dec-card-mid">
        <div className="dec-card-section">
          <span className="dec-card-label">Inhalt</span>
          <p className="dec-card-muted team-report-body">{body}</p>
        </div>
      </div>

      <div className="dec-card-meta">
        <div className="dec-card-section">
          <span className="dec-card-label">Datum</span>
          <span className="dec-card-muted">{dateLabel}</span>
        </div>
      </div>
    </article>
  )
}
