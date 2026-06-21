import type { Objective, ObjectiveStatus } from '@/lib/objectives/types'

export type ProjectLite = {
  id: string
  title: string
  color?: string | null
}

export type ObjectiveFilter = 'active' | 'all' | 'at_risk'

export const OBJECTIVE_FILTERS: { id: ObjectiveFilter; label: string }[] = [
  { id: 'active', label: 'Aktiv' },
  { id: 'at_risk', label: 'Gefährdet' },
  { id: 'all', label: 'Alle' },
]

export const OBJECTIVE_STATUS_OPTIONS: { id: ObjectiveStatus; label: string }[] = [
  { id: 'active', label: 'Aktiv' },
  { id: 'completed', label: 'Abgeschlossen' },
  { id: 'paused', label: 'Pausiert' },
  { id: 'cancelled', label: 'Abgebrochen' },
]

export type LinkedTask = {
  id: string
  title: string
  status: string
}

export function fmtDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtAgo(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  if (days < 14) return `vor ${days} Tag${days === 1 ? '' : 'en'}`
  return fmtDate(iso)
}

export function objectiveStatusLabel(status: Objective['status']): string {
  return OBJECTIVE_STATUS_OPTIONS.find(o => o.id === status)?.label ?? status
}

export function isDemoObjectiveId(id: string): boolean {
  return id.startsWith('demo-obj-')
}
