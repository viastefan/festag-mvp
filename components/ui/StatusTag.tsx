import type { ReactNode } from 'react'

/** StatusTag — consistent status chip (.fui-tag) with a tone + optional dot. */
export type StatusTone = 'good' | 'warn' | 'risk' | 'accent' | 'muted'

export default function StatusTag({
  tone = 'muted', dot = true, children,
}: { tone?: StatusTone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`fui-tag tone-${tone}`}>
      {dot ? <span className="fui-tag-dot" /> : null}
      {children}
    </span>
  )
}
