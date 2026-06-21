import Link from 'next/link'
import { FolderSimple, ListChecks, NotePencil, UsersThree } from '@phosphor-icons/react'

const TABS = [
  { id: 'overview' as const, href: '/teams', label: 'Übersicht', Icon: UsersThree },
  { id: 'projects' as const, href: '/teams/projects', label: 'Projekte', Icon: FolderSimple },
  { id: 'tasks' as const, href: '/teams/tasks', label: 'Aufgaben', Icon: ListChecks },
  { id: 'reports' as const, href: '/teams/reports', label: 'Berichte', Icon: NotePencil },
]

export default function TeamSubNav({ active }: { active: typeof TABS[number]['id'] }) {
  return (
    <div className="act-filters dec-dt team-subnav">
      {TABS.map(tab => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`act-filter${active === tab.id ? ' on' : ''}`}
        >
          <tab.Icon size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
