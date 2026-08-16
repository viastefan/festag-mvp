'use client'

/**
 * The two things a decision detail page was still missing: the work it holds
 * up, and its own history.
 *
 * Master instruction §14 asks the decision experience to show "affected
 * features/tasks", and Layer 3 states the system maintains a decision history.
 * Both already existed in the schema (decision_links, decision_events) with no
 * read surface — this is that surface.
 */

import type { AffectedWork } from '@/lib/decisions/affected'
import { eventActorLabel, eventLabel } from '@/lib/decisions/center'
import { fmtAgo } from '@/components/decisions/decisions-shared'

export type DecisionEventLite = {
  id: string
  event_type: string
  actor_kind?: string | null
  created_at: string
}

type Props = {
  affected?: AffectedWork | null
  events?: DecisionEventLite[]
}

export default function DecisionTrail({ affected, events }: Props) {
  const blocks = affected?.blocks ?? []
  const affects = affected?.affects ?? []
  const hasAffected = blocks.length > 0 || affects.length > 0
  const trail = events ?? []

  if (!hasAffected && trail.length === 0) return null

  return (
    <div className="dec-trail">
      {hasAffected && (
        <section className="dec-trail-block" aria-label="Betroffene Arbeit">
          <p className="dec-trail-label">
            {blocks.length > 0 ? 'Diese Arbeit wartet darauf' : 'Betroffene Arbeit'}
          </p>
          <ul className="dec-trail-tasks">
            {[...blocks, ...affects].map(task => (
              <li
                key={`${task.link_kind}-${task.id}`}
                className={`dec-trail-task${task.link_kind === 'blocks' ? ' is-blocked' : ''}`}
              >
                <span className="dec-trail-task-dot" aria-hidden />
                <span className="dec-trail-task-name">{task.title}</span>
                <span className="dec-trail-task-kind">
                  {task.link_kind === 'blocks' ? 'blockiert' : 'betroffen'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trail.length > 0 && (
        <section className="dec-trail-block" aria-label="Verlauf">
          <p className="dec-trail-label">Verlauf</p>
          <ol className="dec-trail-events">
            {trail.map(ev => {
              const actor = eventActorLabel(ev.actor_kind)
              return (
                <li key={ev.id} className="dec-trail-event">
                  <span className="dec-trail-event-dot" aria-hidden />
                  <span className="dec-trail-event-copy">
                    <span className="dec-trail-event-title">{eventLabel(ev.event_type)}</span>
                    <span className="dec-trail-event-meta" suppressHydrationWarning>
                      {[actor, fmtAgo(ev.created_at)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}
