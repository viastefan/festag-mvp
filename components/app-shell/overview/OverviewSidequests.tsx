'use client'

/**
 * Sidequests — calm editorial facts beside the Overview flow.
 * Sentences, not widgets. No dashboard KPIs.
 */

import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'

export type SidequestItem = {
  id: string
  /** React-friendly segments for inline emphasis + optional avatar. */
  parts: Array<
    | { type: 'text'; text: string }
    | { type: 'mention'; name: string; avatarUrl?: string | null }
  >
  action?: { label: string; href?: string }
}

type Props = {
  items: SidequestItem[]
  onOpenScore?: () => void
}

export function buildOverviewSidequests(input: {
  team: OverviewPayload['team']
  activity: OverviewPayload['activity']
  atRisk: number
  pendingDecisions: number
  intelligence?: OverviewPayload['intelligence'] | null
  firstName?: string
}): SidequestItem[] {
  const items: SidequestItem[] = []

  const join =
    input.team.find((m) => m.name && m.name.trim() && !isSelfName(m.name, input.firstName)) ||
    input.team[0] ||
    null
  if (join?.name) {
    const handle = mentionFromName(join.name)
    items.push({
      id: `join-${join.id}`,
      parts: [
        { type: 'text', text: 'Dev’ler ' },
        { type: 'mention', name: handle, avatarUrl: join.avatarUrl },
        { type: 'text', text: ' ist deinem Projekt erfolgreich beigetreten.' },
      ],
    })
  } else {
    const recent = input.activity[0]
    if (recent?.title) {
      items.push({
        id: `activity-${recent.id}`,
        parts: [{ type: 'text', text: calmActivitySentence(recent.title) }],
      })
    }
  }

  const score = input.intelligence?.score ?? 0
  if (score > 0) {
    items.push({
      id: 'score',
      parts: [
        {
          type: 'text',
          text: `Dein Projekt läuft ruhig — Tagro sieht ${score}%.`,
        },
      ],
      action: { label: 'Score anzeigen' },
    })
  } else if (input.intelligence?.headline) {
    items.push({
      id: 'headline',
      parts: [{ type: 'text', text: softenHeadline(input.intelligence.headline) }],
    })
  }

  if (input.atRisk === 0 && input.pendingDecisions === 0) {
    items.push({
      id: 'calm',
      parts: [{ type: 'text', text: 'Wir haben aktuell keine weiteren Sorgen.' }],
    })
  } else if (input.pendingDecisions > 0) {
    items.push({
      id: 'wait',
      parts: [
        {
          type: 'text',
          text:
            input.pendingDecisions === 1
              ? 'Eine Entscheidung wartet noch auf deine Freigabe.'
              : `${input.pendingDecisions} Entscheidungen warten noch auf deine Freigabe.`,
        },
      ],
    })
  } else if (input.atRisk > 0) {
    items.push({
      id: 'risk',
      parts: [
        {
          type: 'text',
          text:
            input.atRisk === 1
              ? 'Ein Risiko bleibt im Blick — Tagro hält dich auf dem Laufenden.'
              : `${input.atRisk} Risiken bleiben im Blick — Tagro hält dich auf dem Laufenden.`,
        },
      ],
    })
  }

  return items.slice(0, 3)
}

function isSelfName(name: string, firstName?: string) {
  if (!firstName) return false
  return name.trim().toLowerCase().startsWith(firstName.trim().toLowerCase())
}

function mentionFromName(name: string) {
  const first = name.trim().split(/\s+/)[0] || name
  return `@${first.replace(/^@/, '')}`
}

function calmActivitySentence(title: string) {
  const t = title.trim().replace(/\s+/g, ' ')
  if (/beitreten|joined|eingeladen/i.test(t)) return t.endsWith('.') ? t : `${t}.`
  return t.endsWith('.') ? t : `${t}.`
}

function softenHeadline(headline: string) {
  return headline
    .replace(/läuft effizient\.?/i, 'läuft ruhig.')
    .replace(/Mehraufwand\.?/i, 'etwas mehr Aufmerksamkeit.')
}

export default function OverviewSidequests({ items, onOpenScore }: Props) {
  if (items.length === 0) return null

  return (
    <section className="ffl-sq" aria-label="Sidequests">
      <h2 className="ffl-sq-title">Sidequests</h2>
      <ul className="ffl-sq-list">
        {items.map((item) => (
          <li key={item.id} className="ffl-sq-item">
            <p className="ffl-sq-line">
              {item.parts.map((part, i) => {
                if (part.type === 'text') {
                  return <span key={i}>{part.text}</span>
                }
                return (
                  <span key={i} className="ffl-sq-mention">
                    <strong>{part.name}</strong>
                    {part.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="ffl-sq-avatar" src={part.avatarUrl} alt="" />
                    ) : (
                      <span className="ffl-sq-avatar is-fallback" aria-hidden>
                        {part.name.replace(/^@/, '').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>
                )
              })}
            </p>
            {item.action ? (
              <button
                type="button"
                className="ffl-sq-action"
                onClick={item.id === 'score' ? onOpenScore : undefined}
              >
                {item.action.label}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
