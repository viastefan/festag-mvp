import type { ReactNode } from 'react'

/**
 * FilterPills — the pill filter row used across pages (.fui-bar / .fui-tab).
 */
export type FilterOption<T extends string = string> = { id: T; label: string }

export default function FilterPills<T extends string>({
  options, value, onChange, trailing,
}: {
  options: FilterOption<T>[]
  value: T
  onChange: (id: T) => void
  trailing?: ReactNode
}) {
  return (
    <div className="fui-bar">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          className={`fui-tab${value === o.id ? ' on' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
      {trailing}
    </div>
  )
}
