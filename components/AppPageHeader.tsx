'use client'

import type { ReactNode } from 'react'

type AppPageHeaderProps = {
  title: ReactNode
  meta?: ReactNode
  action?: ReactNode
  variant?: 'standard' | 'compact' | 'hero'
  className?: string
}

export default function AppPageHeader({
  title,
  meta,
  action,
  variant = 'standard',
  className = '',
}: AppPageHeaderProps) {
  return (
    <header className={`app-page-header app-page-header--${variant}${className ? ` ${className}` : ''}`}>
      <div className="app-page-header__copy">
        <h1>{title}</h1>
        {meta ? <p>{meta}</p> : null}
      </div>
      {action ? <div className="app-page-header__action">{action}</div> : null}
    </header>
  )
}
