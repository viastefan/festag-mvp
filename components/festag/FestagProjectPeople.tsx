'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import FestagPersonCard, { type FestagPerson } from '@/components/festag/FestagPersonCard'
import { FESTAG_PERSON_CARD_CSS } from '@/components/festag/festag-person-card'
import type { ProjectRole } from '@/lib/platform/roles'

const DecisionAskSheet = dynamic(() => import('@/components/decisions/DecisionAskSheet'), { ssr: false })

type ApiPerson = {
  id: string
  name: string
  handle: string | null
  avatarUrl: string | null
  role: ProjectRole
  isYou: boolean
}

type Props = {
  projectId: string
  /** Shown on the card so the person is placed, not just named. */
  projectTitle?: string | null
}

/**
 * Who is on this project — the counterpart you are actually working with.
 *
 * The action is not decoration: "Frage stellen" opens the ask flow prefilled
 * with this person and this project, and POST /api/decisions/ask turns it into
 * a task plus a decision in their account, notified and filed. A card here
 * without that would be the fake button the product prompt forbids.
 */
export default function FestagProjectPeople({ projectId, projectTitle }: Props) {
  const [people, setPeople] = useState<ApiPerson[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [asking, setAsking] = useState<ApiPerson | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/people`, { credentials: 'include' })
      if (!res.ok) { setFailed(true); return }
      const json = await res.json()
      setPeople(Array.isArray(json?.people) ? json.people : [])
    } catch {
      setFailed(true)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  if (failed || (people && people.length === 0)) return null

  return (
    <section className="fpp" aria-label="Wer hier mitarbeitet">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FESTAG_PERSON_CARD_CSS }} />
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FPP_CSS }} />

      <h2 className="fpp-head">Wer hier mitarbeitet</h2>

      {sent ? <p className="fpp-sent" role="status">{sent}</p> : null}

      <div className="fpp-list">
        {(people ?? []).map((p) => {
          const person: FestagPerson = {
            id: p.id,
            name: p.name,
            handle: p.handle,
            avatarUrl: p.avatarUrl,
            role: p.role,
            context: projectTitle || null,
          }
          return (
            <FestagPersonCard
              key={p.id}
              person={person}
              action={p.isYou ? undefined : { label: 'Frage stellen', onClick: () => setAsking(p) }}
            />
          )
        })}
      </div>

      {asking ? (
        <DecisionAskSheet
          initialPerson={{ id: asking.id, label: asking.name } as any}
          initialProjectId={projectId}
          onClose={() => setAsking(null)}
          onCreated={(info) => {
            setAsking(null)
            setSent(`Frage an ${info.personLabel} gestellt — liegt jetzt in ${info.projectTitle}.`)
          }}
        />
      ) : null}
    </section>
  )
}

const FPP_CSS = `
.fpp { max-width: var(--fst-max, 860px); margin: 32px 0 0; }
.fpp-head {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--fst-text-2, #5B5B66);
}
.fpp-list { display: flex; flex-direction: column; gap: 10px; }
.fpp-sent {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: var(--fst-radius-md, 12px);
  background: var(--fst-accent-soft, rgba(46,107,255,0.10));
  color: var(--fst-accent, #2E6BFF);
  font-size: 14px;
}
`.trim()
