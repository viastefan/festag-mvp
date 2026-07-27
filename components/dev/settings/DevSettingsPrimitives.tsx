'use client'

import type { ReactNode } from 'react'

export function SettingsSection({
  title,
  children,
  soon,
}: {
  title: string
  children: ReactNode
  soon?: string
}) {
  return (
    <section className="ds-section">
      <h2 className="ds-section-title">{title}</h2>
      <div className="ds-section-card">
        {children}
        {soon ? <p className="ds-soon">{soon}</p> : null}
      </div>
    </section>
  )
}

export function SettingsRow({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="ds-row">
      <div className="ds-row-copy">
        <p className="ds-row-title">{title}</p>
        {description ? <p className="ds-row-desc">{description}</p> : null}
      </div>
      <div className="ds-row-control">{children}</div>
    </div>
  )
}

export function SettingsToggle({
  on,
  onToggle,
  label,
}: {
  on: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      className={`ds-toggle${on ? ' on' : ''}`}
      onClick={onToggle}
      aria-pressed={on}
      aria-label={label}
    />
  )
}

export function SettingsSegmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div className="ds-seg" role="group">
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          className={value === opt.id ? 'on' : ''}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
