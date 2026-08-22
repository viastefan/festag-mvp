'use client'

import { PROJECT_ROLE_LABELS, type ProjectRole } from '@/lib/platform/roles'

export type FestagPerson = {
  id: string
  name: string
  handle?: string | null
  avatarUrl?: string | null
  role: ProjectRole
  /** Where they act — project or workspace name. */
  context?: string | null
  /** Free line: what they are on right now. */
  line?: string | null
  online?: boolean
}

type Props = {
  person: FestagPerson
  /** The one real action. No card ships without one — a button that only looks
      like a button is the thing the product prompt forbids. */
  action?: { label: string; onClick: () => void }
  /** Quiet second action, e.g. open a message thread. */
  secondary?: { label: string; onClick: () => void }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

/**
 * A person on an account: who they are, what role they hold, what they are on.
 *
 * Roles come from lib/platform/roles.ts — `client`, `developer` and `designer`
 * are real project roles there, with an explicit note not to invent parallel
 * "Client App / Developer App" systems. This renders that model; it does not
 * add one.
 */
export default function FestagPersonCard({ person, action, secondary }: Props) {
  const roleLabel = PROJECT_ROLE_LABELS[person.role]

  return (
    <article className="fpc" data-role={person.role}>
      <span className="fpc-avatar" aria-hidden="true">
        {person.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatarUrl} alt="" className="fpc-avatar-img" />
        ) : (
          initials(person.name)
        )}
        {person.online ? <span className="fpc-online" /> : null}
      </span>

      <div className="fpc-body">
        <h3 className="fpc-name">
          {person.name}
          <span className="fpc-role">{roleLabel}</span>
        </h3>

        <p className="fpc-meta">
          {person.handle ? <span className="fpc-handle">{person.handle}</span> : null}
          {person.handle && person.context ? <span className="fpc-dot" aria-hidden /> : null}
          {person.context ? <span>{person.context}</span> : null}
        </p>

        {person.line ? <p className="fpc-line">{person.line}</p> : null}
      </div>

      {action || secondary ? (
        <div className="fpc-actions">
          {secondary ? (
            <button type="button" className="fpc-btn fpc-btn--quiet" onClick={secondary.onClick}>
              {secondary.label}
            </button>
          ) : null}
          {action ? (
            <button type="button" className="fpc-btn fpc-btn--primary" onClick={action.onClick}>
              {action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
