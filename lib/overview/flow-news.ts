/**
 * Friendly, positive news lines for Overview flow nodes.
 * Tone: calm OS with a light wink — never alarmist, never dull labels.
 */

import type {
  FlowNewsPulse,
  FlowNodeId,
  FlowTone,
} from '@/components/app-shell/overview/overview-nodes'

export type FlowNews = {
  label: string
  news: string
  meta: string
  metaTone?: FlowTone
  pulse: FlowNewsPulse
}

export type FlowNewsInput = {
  atRisk: number
  pendingDecisions: number
  softDecisions: number
  urgentDecisions: number
  teamMembers: number
  openTasks: number
  healthLabel: string
  hasProjects: boolean
  activityHint?: string | null
  projectTitle?: string | null
}

function pick(n: number, one: string, many: string) {
  return n === 1 ? one : many
}

export function buildFlowNews(id: FlowNodeId, input: FlowNewsInput): FlowNews {
  const team = Math.max(1, input.teamMembers)

  switch (id) {
    case 'communication': {
      const hint = input.activityHint?.trim()
      if (hint) {
        return {
          label: 'Kommunikation',
          news: `${hint} Tagro hält den Faden freundlich sortiert.`,
          meta: 'frisch',
          metaTone: 'blue',
          pulse: 'soft',
        }
      }
      return {
        label: 'Kommunikation',
        news: 'Alles ruhig am Draht — kein Drama, nur gute Vibes.',
        meta: 'klar',
        metaTone: 'blue',
        pulse: 'calm',
      }
    }
    case 'risks': {
      if (input.atRisk <= 0) {
        return {
          label: 'Risiken',
          news: 'Risiko-Radar quietscht vor Langeweile. Magisch.',
          meta: 'alles gut',
          pulse: 'calm',
        }
      }
      return {
        label: 'Risiken',
        news: pick(
          input.atRisk,
          'Ein kleines Risiko winkt höflich — nichts Dramatisches.',
          `${input.atRisk} Risiken melden sich höflich. Wir schaffen das.`,
        ),
        meta: pick(input.atRisk, '1 im Blick', `${input.atRisk} im Blick`),
        metaTone: 'red',
        pulse: input.atRisk >= 2 ? 'hot' : 'soft',
      }
    }
    case 'decisions': {
      const n = input.pendingDecisions
      if (n <= 0) {
        return {
          label: 'Entscheidungen',
          news: 'Keine Entscheidung wartet. Genieß den Freiraum.',
          meta: 'frei',
          pulse: 'calm',
        }
      }
      const soft = Math.max(0, Math.min(input.softDecisions, n))
      const urgent = Math.max(0, Math.min(input.urgentDecisions, n))
      let news: string
      if (n === 1 && urgent === 1) {
        news = 'Eine Entscheidung winkt — und sie meint’s ernst (freundlich).'
      } else if (n === 1) {
        news = 'Eine Entscheidung wartet — du darfst in Ruhe wählen.'
      } else if (soft >= 1 && urgent >= 1) {
        const softBit = soft === 1 ? 'eine darf' : `${soft} dürfen`
        news = `${n} Entscheidungen offen — ${softBit} noch ein bisschen warten.`
      } else if (soft === n) {
        news = `${n} Entscheidungen offen — keine Hetze, alles machbar.`
      } else {
        news = `${n} Entscheidungen offen. Tippen, dann wird’s klar.`
      }
      return {
        label: 'Entscheidungen',
        news,
        meta: pick(n, '1 offen', `${n} offen`),
        metaTone: 'green',
        pulse: urgent > 0 ? 'hot' : 'soft',
      }
    }
    case 'status': {
      if (!input.hasProjects) {
        return {
          label: 'Projektstatus',
          news: 'Noch kein Status zu erzählen — die Bühne ist schon warm.',
          meta: 'bereit',
          pulse: 'calm',
        }
      }
      if (input.healthLabel === 'Stabil') {
        return {
          label: 'Projektstatus',
          news: 'Status: entspannt stabil. Das Team läuft rund.',
          meta: 'stabil',
          metaTone: 'blue',
          pulse: 'calm',
        }
      }
      return {
        label: 'Projektstatus',
        news: 'Ein bisschen Aufmerksamkeit gefragt — nichts Unlösbares.',
        meta: 'im Blick',
        metaTone: 'red',
        pulse: 'soft',
      }
    }
    case 'team': {
      const tasks = input.openTasks
      if (tasks > 0) {
        return {
          label: 'Team',
          news: pick(
            team,
            `Dein Team ist wach — und ${tasks === 1 ? 'eine Aufgabe' : `${tasks} Aufgaben`} sind in Arbeit.`,
            `${team} sind aktiv — ${tasks === 1 ? 'eine Aufgabe' : `${tasks} Aufgaben`} laufen gerade.`,
          ),
          meta: pick(team, '1 aktiv', `${team} aktiv`),
          pulse: 'soft',
        }
      }
      return {
        label: 'Team',
        news: pick(
          team,
          'Dein Team ist da — bereit für den nächsten guten Zug.',
          `${team} sind im Workspace. Kaffee optional, Flow inklusive.`,
        ),
        meta: pick(team, '1 aktiv', `${team} aktiv`),
        pulse: 'calm',
      }
    }
    case 'project': {
      const title = input.projectTitle?.trim()
      if (!input.hasProjects) {
        return {
          label: 'Projekt',
          news: 'Noch kein Projekt — aber der Fluss freut sich schon auf dich.',
          meta: 'starten',
          pulse: 'soft',
        }
      }
      return {
        label: 'Projekt',
        news: title
          ? `„${title}“ hält den Faden. Tippen für den Überblick.`
          : 'Dein Projekt hält den Faden. Tippen für den Überblick.',
        meta: 'Gesamt',
        pulse: 'calm',
      }
    }
  }
}

export function countDecisionUrgency(
  decisions: Array<{ urgency: string | null }>,
): { soft: number; urgent: number } {
  let soft = 0
  let urgent = 0
  for (const d of decisions) {
    const u = (d.urgency || 'normal').toLowerCase()
    if (u === 'high' || u === 'critical' || u === 'urgent') urgent += 1
    else soft += 1
  }
  return { soft, urgent }
}
