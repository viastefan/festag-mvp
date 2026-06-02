/**
 * ProofGrid evidence — shared types and labels.
 *
 * Evidence is proof-of-work attached to a project: what happened, how strongly
 * it's proven (weak → verified), and whether the client may see it. Feeds the
 * project Belege (ProofGrid) feed and — later — Nexora readiness checks and
 * report sources.
 */

export type ProofStrength = 'weak' | 'medium' | 'strong' | 'verified'

export type EvidenceRow = {
  id: string
  project_id: string
  evidence_type: string
  title: string | null
  description: string | null
  proof_strength: ProofStrength
  source: string
  url: string | null
  client_visible: boolean
  related_type: string | null
  related_id: string | null
  metadata: Record<string, any>
  created_by: string | null
  created_at: string
  updated_at: string
}

export const PROOF_STRENGTH: Record<ProofStrength, { label: string; color: string; hint: string }> = {
  weak:     { label: 'Notiz',     color: '#6F7A89', hint: 'Manuelle Aussage, noch nicht belegt.' },
  medium:   { label: 'Beleg',     color: '#6a738c', hint: 'Etwas wurde angelegt oder hochgeladen.' },
  strong:   { label: 'Nachweis',  color: '#0E9F6E', hint: 'Mit Daten oder Datei belegt.' },
  verified: { label: 'Bestätigt', color: '#3FB984', hint: 'Vom Kunden freigegeben oder verifiziert.' },
}

export const PROOF_ORDER: ProofStrength[] = ['weak', 'medium', 'strong', 'verified']

// Project-type-agnostic evidence types for the MVP. Marketing/video/etc. add
// their own later — the feed stays the same.
export const EVIDENCE_TYPES: { id: string; label: string }[] = [
  { id: 'note',              label: 'Notiz / Update' },
  { id: 'work_done',         label: 'Arbeit erledigt' },
  { id: 'file_uploaded',     label: 'Datei hochgeladen' },
  { id: 'link',              label: 'Link / Quelle' },
  { id: 'deployment',        label: 'Deployment / Release' },
  { id: 'review',            label: 'Review / QA' },
  { id: 'client_approval',   label: 'Kundenfreigabe' },
  { id: 'milestone_reached', label: 'Meilenstein erreicht' },
]

export function evidenceTypeLabel(id: string): string {
  return EVIDENCE_TYPES.find(t => t.id === id)?.label ?? id
}
