'use client'

import { useEffect, useState } from 'react'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { useTagroHealth } from '@/hooks/useTagroHealth'

type Project = {
  id: string
  title: string
  color: string | null
  staging_url: string | null
  live_url: string | null
}

type Props = {
  className?: string
}

export default function TagroProjectLinks({ className = '' }: Props) {
  const { ready } = useTagroHealth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ready) {
      setProjects([])
      return
    }
    let cancelled = false
    setLoading(true)
    fetch('/api/extension/projects', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const list = (data.projects ?? []) as Project[]
        setProjects(list.filter((p) => p.staging_url || p.live_url).slice(0, 5))
      })
      .catch(() => {
        if (!cancelled) setProjects([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [ready])

  if (!ready) return null
  if (loading) {
    return (
      <>
        <p className="tpl-muted">Projekte werden geladen…</p>
        <style suppressHydrationWarning>{CSS}</style>
      </>
    )
  }
  if (projects.length === 0) return null

  return (
    <>
      <section className={`tpl ${className}`.trim()} aria-label="Projekt-Vorschauen">
        <p className="tpl-kicker">Live-Feedback starten</p>
        <h3 className="tpl-title">Staging-URLs deiner Projekte</h3>
        <p className="tpl-lead">
          Öffne eine Vorschau, markiere ein Element in der Extension — Feedback landet direkt im Projekt.
        </p>
        <ul className="tpl-list" role="list">
          {projects.map((project) => {
            const url = project.staging_url || project.live_url
            if (!url) return null
            const label = project.staging_url ? 'Staging' : 'Live'
            return (
              <li key={project.id}>
                <a className="tpl-link" href={url} target="_blank" rel="noreferrer">
                  <span
                    className="tpl-dot"
                    style={{ background: project.color ?? '#5B647D' }}
                    aria-hidden
                  />
                  <span className="tpl-copy">
                    <strong>{project.title}</strong>
                    <span>{label}</span>
                  </span>
                  <ArrowSquareOut size={14} aria-hidden />
                </a>
              </li>
            )
          })}
        </ul>
      </section>
      <style suppressHydrationWarning>{CSS}</style>
    </>
  )
}

const CSS = `
  .tpl {
    margin: 20px 0;
    padding: 16px;
    border-radius: 16px;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.04);
  }
  [data-theme="dark"] .tpl,
  [data-theme="classic-dark"] .tpl {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .tpl-kicker {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--portal-muted, #86868b);
  }
  .tpl-title {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    color: var(--portal-text, #1d1d1f);
  }
  .tpl-lead {
    margin: 0 0 12px;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  .tpl-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .tpl-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: #fff;
    text-decoration: none;
    color: inherit;
    transition: background .12s ease;
  }
  .tpl-link:hover { background: #ebebed; }
  [data-theme="dark"] .tpl-link,
  [data-theme="classic-dark"] .tpl-link {
    background: rgba(255, 255, 255, 0.06);
  }
  [data-theme="dark"] .tpl-link:hover,
  [data-theme="classic-dark"] .tpl-link:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .tpl-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .tpl-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .tpl-copy strong {
    font-size: 13px;
    font-weight: 500;
    color: var(--portal-text, #1d1d1f);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tpl-copy span {
    font-size: 11px;
    color: var(--portal-muted, #86868b);
  }
  .tpl-muted {
    margin: 12px 0;
    font-size: 12.5px;
    color: var(--portal-muted, #86868b);
  }
`
