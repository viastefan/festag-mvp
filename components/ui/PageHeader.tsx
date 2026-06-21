import type { ReactNode } from 'react'

/**
 * PageHeader — legacy compact header (.fui-top) for settings/admin surfaces.
 * Portal list pages (Entscheidungen, Lieferungen, Aktivität, …) use
 * {@link PortalPageHeader} + DECISION_CSS for the large title + lead line.
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
