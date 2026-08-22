/**
 * Projektsprache — wie ein Projektzustand für Menschen heißt.
 *
 * Ein Kunde soll Software nicht verstehen müssen, um sein Projekt zu
 * verstehen. `planning` ist ein Spaltenwert, kein Wort — es stand trotzdem
 * in der Projektliste. Diese Datei ist die eine Stelle, an der aus einem
 * Zustand ein Satz wird; wer eine Phase anzeigt, holt sie hier.
 *
 * Die Phasen folgen dem Projektlebenszyklus, nicht dem, was zufällig mal in
 * die Spalte geschrieben wurde: Entwurf → Aufnahme → Planung → Bereit →
 * Umsetzung → Review → Test → Lieferung → Abgeschlossen → Betreuung.
 */

export const PROJECT_PHASE_LABEL: Record<string, string> = {
  draft: 'Entwurf',
  intake: 'Aufnahme',
  discovery: 'Discovery',
  planning: 'Planung',
  design: 'Design',
  ready: 'Bereit',
  build: 'Umsetzung',
  development: 'Umsetzung',
  active: 'Umsetzung',
  review: 'Review',
  testing: 'Test',
  launch: 'Launch',
  delivery: 'Lieferung',
  done: 'Abgeschlossen',
  completed: 'Abgeschlossen',
  maintenance: 'Betreuung',
}

/** Der Anzeigename einer Phase. Unbekanntes wird lesbar gemacht, nie roh gezeigt. */
export function projectPhaseLabel(raw?: string | null): string {
  const key = (raw ?? '').toLowerCase().trim().replace(/\s+/g, '_')
  if (!key) return 'Planung'
  const known = PROJECT_PHASE_LABEL[key]
  if (known) return known
  /* Unbekannter Wert: wenigstens nicht wie eine Datenbankspalte aussehen. */
  const words = key.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Die Zeile unter dem Projektnamen.
 *
 * Sie sagt nur, was sie weiß. Vorher stand dort immer dieselbe Kette aus drei
 * Angaben — „planning · 0% · kein Meilenstein gesetzt" —, von denen zwei
 * lediglich mitteilten, dass nichts bekannt ist. Ein Fortschritt von 0 % ist
 * keine Information, und ein fehlender Meilenstein ist keine Nachricht.
 * Schweigen ist hier die ehrlichere Angabe.
 */
export function projectSubline(input: {
  phase?: string | null
  status?: string | null
  progress?: number | null
  nextMilestone?: string | null
}): string {
  const parts: string[] = [projectPhaseLabel(input.phase || input.status)]

  const progress = Math.round(Number(input.progress ?? 0))
  if (Number.isFinite(progress) && progress > 0) parts.push(`${progress} %`)

  const milestone = (input.nextMilestone ?? '').trim()
  if (milestone) parts.push(milestone)

  return parts.join(' · ')
}
