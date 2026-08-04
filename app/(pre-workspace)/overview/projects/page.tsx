'use client'

import { openNewProject } from '@/lib/new-project-open'

export default function HomeProjectsPage() {
  return (
    <div className="fas-empty fas-assemble">
      <h1 className="fas-empty-title">Projects</h1>
      <p className="fas-empty-body">
        Projekte leben im Workspace. Mit Tagro anlegen — Chat, Mitwirkende und Einladungen folgen im Popup.
      </p>
      <button type="button" className="fas-btn" onClick={() => openNewProject()}>
        Neues Projekt
      </button>
    </div>
  )
}
