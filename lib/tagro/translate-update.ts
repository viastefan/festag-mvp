import { runOpenAIJson } from '@/lib/tagro/openai'

/**
 * Veyra update translation.
 *
 * Turns a raw developer note ("hero section mobile gefixt, deploy steht,
 * morgen login") into a calm, client-safe status — the voice the client
 * actually reads in their workspace.
 *
 * Uses the OpenAI path when `OPENAI_API_KEY` is set; otherwise
 * `runOpenAIJson` transparently falls back to the heuristic supplied
 * here, so the route never breaks because of a missing key.
 *
 * Hard rules baked into the prompt (festag_product_spec):
 *   • client-safe: no commit hashes, no file names, no dev jargon
 *   • calm, professional, 1–3 sentences
 *   • honest about blockers, never invents progress
 *   • German
 */

export type TranslatedUpdate = {
  clientSummary: string
  currentWork: string[]
  blockers: string[]
  nextSteps: string[]
  confidence: number          // 0..1
  model: string
}

function heuristicFallback(devText: string, projectTitle: string | null): Record<string, unknown> {
  const clean = devText.trim().replace(/^(heute|today)\s*[:\-,]?\s*/i, '')
  const sentence = clean.length > 280 ? clean.slice(0, 277) + '…' : clean
  const isBlocked = /blocker|blockiert|warte|stuck|h[äa]ngt/i.test(devText)
  const intro = projectTitle ? `Update zu ${projectTitle}: ` : 'Heutiger Stand: '
  return {
    client_summary: `${intro}${sentence}`,
    current_work: isBlocked ? [] : [sentence],
    blockers: isBlocked ? [sentence] : [],
    next_steps: [],
    confidence: 0.45,
  }
}

export async function translateDevUpdate(input: {
  devText: string
  projectTitle: string | null
  /** optional: a few prior updates for continuity context */
  recentContext?: string[]
}): Promise<TranslatedUpdate> {
  const { devText, projectTitle, recentContext = [] } = input

  const contextBlock = recentContext.length > 0
    ? `\n\nFrühere Updates (nur Kontext, nicht wiederholen):\n${recentContext.slice(0, 4).map(c => `- ${c}`).join('\n')}`
    : ''

  const prompt = `Ein Entwickler hat folgendes internes Tages-Update geschrieben${projectTitle ? ` zum Projekt "${projectTitle}"` : ''}:

"""${devText.trim()}"""${contextBlock}

Übersetze das in einen ruhigen, klaren Status für den Kunden (Client).

Regeln:
- Client-safe: keine Commit-Hashes, keine Dateinamen, kein technischer Jargon.
- Ruhig, professionell, 1 bis 3 Sätze in "client_summary".
- Ehrlich bei Blockern, niemals Fortschritt erfinden.
- Deutsch, Du-frei (neutrale Sachlichkeit).

Antworte als JSON mit exakt diesen Feldern:
{
  "client_summary": string,        // 1-3 ruhige Sätze für den Client
  "current_work": string[],        // 0-3 kurze Punkte: was gerade läuft (client-safe)
  "blockers": string[],            // 0-2 Punkte: was klemmt, falls vorhanden
  "next_steps": string[],          // 0-3 Punkte: was als nächstes ansteht
  "confidence": number             // 0..1 wie sicher die Übersetzung den Stand trifft
}`

  const result = await runOpenAIJson({
    prompt,
    runType: 'status_translation',
    fallback: () => heuristicFallback(devText, projectTitle),
  })

  const out = result.output as Record<string, any>
  const toStrArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(x => String(x)).filter(Boolean).slice(0, 3) : []

  return {
    clientSummary: String(out.client_summary ?? heuristicFallback(devText, projectTitle).client_summary),
    currentWork: toStrArray(out.current_work),
    blockers: toStrArray(out.blockers),
    nextSteps: toStrArray(out.next_steps),
    confidence: typeof out.confidence === 'number' ? Math.max(0, Math.min(1, out.confidence)) : 0.5,
    model: result.model,
  }
}

/**
 * Aggregate several dev updates from the last 24h into one calm reading —
 * used by the client's on-demand "Status jetzt abrufen" button.
 */
export async function translateStatusDigest(input: {
  projectTitle: string
  updates: Array<{ text: string; blocker: boolean }>
}): Promise<TranslatedUpdate> {
  const { projectTitle, updates } = input

  if (updates.length === 0) {
    return {
      clientSummary: `Heute gibt es noch keine neuen Updates zu ${projectTitle}. Sobald jemand am Projekt arbeitet, fasse ich den Stand hier ruhig zusammen.`,
      currentWork: [], blockers: [], nextSteps: [], confidence: 0.6, model: 'heuristic',
    }
  }

  const updateList = updates.map((u, i) => `${i + 1}. ${u.blocker ? '[Blocker] ' : ''}${u.text}`).join('\n')
  const prompt = `Mehrere interne Entwickler-Updates der letzten 24 Stunden zum Projekt "${projectTitle}":

"""
${updateList}
"""

Verdichte das zu EINEM ruhigen Status für den Kunden.

Regeln:
- Client-safe: kein Jargon, keine Commit-Hashes, keine Dateinamen.
- Ruhig, professionell, 2 bis 4 Sätze in "client_summary".
- Ehrlich bei Blockern.
- Deutsch.

Antworte als JSON:
{
  "client_summary": string,
  "current_work": string[],
  "blockers": string[],
  "next_steps": string[],
  "confidence": number
}`

  const result = await runOpenAIJson({
    prompt,
    runType: 'status_digest',
    fallback: () => {
      const blockerNotes = updates.filter(u => u.blocker).map(u => u.text)
      const work = updates.filter(u => !u.blocker).map(u => u.text)
      const lead = blockerNotes.length > 0
        ? `Aktuell läuft die Arbeit an ${projectTitle}; ein Punkt wartet auf Klärung.`
        : `Die Arbeit an ${projectTitle} ist heute vorangekommen.`
      return {
        client_summary: `${lead}${work[0] ? ` Zuletzt: ${work[0]}.` : ''}`,
        current_work: work.slice(0, 3),
        blockers: blockerNotes.slice(0, 2),
        next_steps: [],
        confidence: 0.5,
      }
    },
  })

  const out = result.output as Record<string, any>
  const toStrArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(x => String(x)).filter(Boolean).slice(0, 3) : []

  return {
    clientSummary: String(out.client_summary ?? ''),
    currentWork: toStrArray(out.current_work),
    blockers: toStrArray(out.blockers),
    nextSteps: toStrArray(out.next_steps),
    confidence: typeof out.confidence === 'number' ? Math.max(0, Math.min(1, out.confidence)) : 0.5,
    model: result.model,
  }
}
