'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import { openNewProject, PROJECT_CREATED_EVENT } from '@/lib/new-project-open'
import { getActiveWorkspaceId, WORKSPACE_SWITCHED_EVENT } from '@/lib/active-workspace'
import { WORKSPACE_CREATED_EVENT } from '@/lib/workspace-create-open'

type ProjectRow = {
  id: string
  title: string
  phase: string | null
  progress: number
  status: string | null
  nextMilestone: string | null
}

export default function HomeProjectsPage() {
  const [loading, setLoading] = useState(true)
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectRow[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const wsId = getActiveWorkspaceId()
      const qs = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : ''
      const res = await fetch(`/api/workspaces/overview${qs}`, { cache: 'no-store' })
      if (!res.ok) {
        setProjects([])
        setWorkspaceName(null)
        return
      }
      const json = await res.json()
      setWorkspaceName(json?.workspace?.name || null)
      setProjects(Array.isArray(json?.projects) ? json.projects : [])
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    function onChanged() {
      void refresh()
    }
    window.addEventListener(PROJECT_CREATED_EVENT, onChanged)
    window.addEventListener(WORKSPACE_SWITCHED_EVENT, onChanged)
    window.addEventListener(WORKSPACE_CREATED_EVENT, onChanged)
    return () => {
      window.removeEventListener(PROJECT_CREATED_EVENT, onChanged)
      window.removeEventListener(WORKSPACE_SWITCHED_EVENT, onChanged)
      window.removeEventListener(WORKSPACE_CREATED_EVENT, onChanged)
    }
  }, [refresh])

  if (loading) {
    return (
      <div className="fas-empty fas-assemble" aria-busy="true">
        <div className="fas-wo-skeleton" />
      </div>
    )
  }

  if (!workspaceName) {
    return (
      <div className="fas-empty fas-assemble">
        <h1 className="fas-empty-title">Projects</h1>
        <p className="fas-empty-body">
          Lege zuerst einen Workspace an — dann leben Projekte darin.
        </p>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="fas-empty fas-assemble">
        <h1 className="fas-empty-title">Projects</h1>
        <p className="fas-empty-body">
          Noch keine Projekte in {workspaceName}. Mit Tagro anlegen — Chat, Mitwirkende und Einladungen folgen im Popup.
        </p>
        <button type="button" className="fas-btn" onClick={() => openNewProject()}>
          Neues Projekt
        </button>
      </div>
    )
  }

  return (
    <div className="fas-home fas-assemble">
      <div className="fas-wo-section-head" style={{ marginBottom: 16 }}>
        <h1 className="fas-empty-title" style={{ margin: 0 }}>Projects</h1>
        <button type="button" className="fas-btn" onClick={() => openNewProject()}>
          Neues Projekt
        </button>
      </div>
      <div className="fas-wo-project-grid">
        {projects.map((p) => (
          <article key={p.id} className="fas-wo-project">
            <div className="fas-wo-project-top">
              <h2 className="fas-wo-project-title">{p.title}</h2>
              <span className="fas-wo-project-status">{p.phase || p.status || 'Planning'}</span>
            </div>
            <div className="fas-wo-progress" aria-label={`Progress ${p.progress}%`}>
              <span className="fas-wo-progress-bar" style={{ width: `${p.progress}%` }} />
            </div>
            <dl className="fas-wo-project-meta">
              <div>
                <dt>Progress</dt>
                <dd>{p.progress}%</dd>
              </div>
              <div>
                <dt>Next</dt>
                <dd>{p.nextMilestone || '—'}</dd>
              </div>
            </dl>
            <Link href={`/project/${p.id}`} className="fas-wo-project-open">
              Open Project
              <ArrowRight size={13} weight="bold" />
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}
