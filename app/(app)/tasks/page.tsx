'use client'

import { useMemo, useState } from 'react'
import {
  Bell,
  CheckSquare,
  Circle,
  Clock,
  GitBranch,
  UserCircle,
} from '@phosphor-icons/react'

type TaskTab = 'mine' | 'team' | 'sprint' | 'blockers' | 'created' | 'subscribed'

type TaskRow = {
  id: string
  title: string
  project: string
  status: string
  owner: string
  due: string
  priority: 'low' | 'medium' | 'high'
  tab: TaskTab[]
}

const TABS: { id: TaskTab; label: string }[] = [
  { id: 'mine', label: 'Meine Aufgaben' },
  { id: 'team', label: 'Team Aufgaben' },
  { id: 'sprint', label: 'Sprint Board' },
  { id: 'blockers', label: 'Blocker' },
  { id: 'created', label: 'Erstellt' },
  { id: 'subscribed', label: 'Abonniert' },
]

const TASKS: TaskRow[] = [
  {
    id: 'FT-18',
    title: 'Datenschutzerklaerung finalisieren',
    project: 'Systemische Beratung Praxis-Website',
    status: 'Offen',
    owner: 'Stefan',
    due: 'Heute',
    priority: 'high',
    tab: ['mine', 'team', 'sprint', 'created'],
  },
  {
    id: 'FT-21',
    title: 'Performance-Optimierung pruefen',
    project: 'Praxis-Website',
    status: 'Aktiv',
    owner: 'Team',
    due: 'Morgen',
    priority: 'medium',
    tab: ['team', 'sprint', 'subscribed'],
  },
  {
    id: 'FT-24',
    title: 'WordPress-Hosting-Entscheidung bestaetigen',
    project: 'Systemische Beratung Praxis-Website',
    status: 'Blockiert',
    owner: 'Stefan',
    due: 'Offene Entscheidung',
    priority: 'high',
    tab: ['mine', 'team', 'blockers', 'subscribed'],
  },
  {
    id: 'FT-29',
    title: 'Landing Page Struktur an Tagro uebergeben',
    project: 'Festag Client Panel',
    status: 'Entwurf',
    owner: 'Tagro',
    due: 'Diese Woche',
    priority: 'low',
    tab: ['created', 'subscribed'],
  },
]

function priorityColor(priority: TaskRow['priority']) {
  if (priority === 'high') return 'var(--amber)'
  if (priority === 'medium') return 'var(--blue)'
  return 'var(--text-muted)'
}

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<TaskTab>('mine')
  const visibleTasks = useMemo(
    () => TASKS.filter((task) => task.tab.includes(activeTab)),
    [activeTab],
  )

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth: 1040 }}>
      <style>{`
        .task-tabs {
          display:flex;
          align-items:center;
          gap:4px;
          padding:3px;
          border:1px solid var(--border);
          border-radius:10px;
          background:var(--surface);
          width:max-content;
          max-width:100%;
          overflow:auto;
        }
        .task-tab {
          height:30px;
          padding:0 11px;
          border:0;
          border-radius:7px;
          background:transparent;
          color:var(--text-secondary);
          font:inherit;
          font-size:12px;
          font-weight:650;
          white-space:nowrap;
          cursor:pointer;
        }
        .task-tab.on {
          background:var(--surface-2);
          color:var(--text);
        }
        .task-table {
          margin-top:18px;
          border:1px solid var(--border);
          border-radius:14px;
          overflow:hidden;
          background:var(--surface);
        }
        .task-row {
          display:grid;
          grid-template-columns:minmax(0,1fr) 130px 112px 112px;
          gap:14px;
          align-items:center;
          min-height:54px;
          padding:0 16px;
          border-bottom:1px solid var(--border);
        }
        .task-row:last-child { border-bottom:0; }
        .task-row:hover { background:color-mix(in srgb, var(--surface-2) 62%, transparent); }
        .task-meta {
          display:flex;
          align-items:center;
          gap:7px;
          min-width:0;
          color:var(--text-muted);
          font-size:11.5px;
          font-weight:600;
        }
        @media(max-width:760px) {
          .task-row { grid-template-columns:1fr; gap:5px; padding:13px 14px; align-items:start; }
          .task-tabs { width:100%; }
        }
      `}</style>

      <div className="page-header" style={{ marginBottom: 18 }}>
        <h1>Aufgaben</h1>
        <p>Meine Arbeit, Team-Aufgaben, Sprint-Fokus und Blocker an einem Ort.</p>
      </div>

      <div className="task-tabs" role="tablist" aria-label="Aufgaben Ansichten">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`task-tab${activeTab === tab.id ? ' on' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="task-table">
        {visibleTasks.length > 0 ? visibleTasks.map((task) => (
          <div key={task.id} className="task-row">
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <Circle size={13} weight="bold" color={priorityColor(task.priority)} />
                <p style={{ margin: 0, color: 'var(--text)', fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </p>
              </div>
              <p style={{ margin: '3px 0 0 22px', color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.id} · {task.project}
              </p>
            </div>

            <div className="task-meta">
              <CheckSquare size={14} weight="regular" />
              {task.status}
            </div>
            <div className="task-meta">
              <UserCircle size={14} weight="regular" />
              {task.owner}
            </div>
            <div className="task-meta">
              {activeTab === 'sprint' ? <GitBranch size={14} weight="regular" /> : activeTab === 'blockers' ? <Bell size={14} weight="regular" /> : <Clock size={14} weight="regular" />}
              {task.due}
            </div>
          </div>
        )) : (
          <div style={{ padding: '46px 20px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Keine Aufgaben in dieser Ansicht</p>
            <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
              Sobald Tagro oder dein Team neue Arbeit vorbereitet, erscheint sie hier.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
