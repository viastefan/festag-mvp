import type { ReactNode } from 'react'

/**
 * PageHeader — the one header bar across Festag pages (Tasks/Entscheidungen
 * language): small title + optional subtitle, hairline underline, actions on
 * the right. Styles live in globals.css (.fui-top*).
 */
export default function PageHeader({
  title, subtitle, actions,
}: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="fui-top">
      <div className="fui-top-left">
        <h1 className="fui-title">{title}</h1>
        {subtitle ? <p className="fui-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="fui-actions">{actions}</div> : null}
    </div>
  )
}
