'use client'

/**
 * DevTagroOrb — the persistent Tagro entry point in the developer portal.
 *
 * Small, quiet, bottom right. The point of the orb is that Tagro never opens
 * empty: it inherits the route you are standing on, so the first thing it
 * reasons about is your current context rather than a blank prompt.
 */

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { Sparkle } from '@phosphor-icons/react'

import { openTagro } from '@/components/TagroOverlay'

type RouteContext = { title: string; prefill: string }

/**
 * Route-scoped opening questions. Each one asks Tagro to reason about the
 * surface the developer is actually looking at, in the Summary → Analysis →
 * Impact → Recommendation → Next Steps shape the product expects.
 */
const ROUTE_CONTEXT: Array<[string, RouteContext]> = [
  ['/dev/tasks', {
    title: 'Aufgaben',
    prefill: 'Priorisiere meine offenen Aufgaben. Was ist heute wirklich dran, was blockiert, und was kann warten?',
  }],
  ['/dev/review', {
    title: 'Tagro Review',
    prefill: 'Fasse die offenen Verifikationen zusammen. Wo fehlen Nachweise, und was sollte ich zuerst prüfen?',
  }],
  ['/dev/github', {
    title: 'GitHub',
    prefill: 'Fasse die letzte Repository-Aktivität zusammen: Commits, offene PRs, und was davon client-relevant ist.',
  }],
  ['/dev/issues', {
    title: 'Vorfälle',
    prefill: 'Bewerte die offenen Vorfälle nach Risiko und schlage die nächste Maßnahme je Vorfall vor.',
  }],
  ['/dev/briefing', {
    title: 'Tagesbriefing',
    prefill: 'Erstelle aus dem heutigen Stand ein ruhiges, client-sicheres Update.',
  }],
  ['/dev/decisions', {
    title: 'Entscheidungen',
    prefill: 'Welche Entscheidungen hängen, wer muss handeln, und was kostet weiteres Warten?',
  }],
  ['/dev/projects', {
    title: 'Projekte',
    prefill: 'Gib mir den Status aller aktiven Projekte: Fortschritt, Risiken, und wo ich eingreifen sollte.',
  }],
  ['/dev/team', {
    title: 'Team',
    prefill: 'Wie ist die Auslastung im Team verteilt, und wo entstehen Engpässe?',
  }],
  ['/dev/time', {
    title: 'Zeiterfassung',
    prefill: 'Analysiere, wohin meine Zeit zuletzt geflossen ist, und wo die Schätzungen daneben lagen.',
  }],
]

const DEFAULT_CONTEXT: RouteContext = {
  title: 'Heute',
  prefill: 'Was ist heute wichtig? Fasse Aufgaben, Reviews, Blocker und Repository-Aktivität zusammen und nenne die nächsten Schritte.',
}

export default function DevTagroOrb({ hasSignal = false }: { hasSignal?: boolean }) {
  const pathname = usePathname()

  const context = useMemo(() => {
    const match = ROUTE_CONTEXT
      .filter(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))
      .sort((a, b) => b[0].length - a[0].length)[0]
    return match ? match[1] : DEFAULT_CONTEXT
  }, [pathname])

  return (
    <button
      type="button"
      className="dv-tagro-fab"
      data-has-signal={hasSignal ? 'true' : 'false'}
      title={`Tagro — ${context.title}`}
      aria-label={`Tagro öffnen, Kontext ${context.title}`}
      onClick={() => openTagro({
        contextType: 'dev_item',
        id: `dev:${pathname}`,
        title: `Tagro — ${context.title}`,
        prefill: context.prefill,
      })}
    >
      <Sparkle size={18} weight="regular" />
    </button>
  )
}
