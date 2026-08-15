'use client'

/**
 * Ein Risiko von Hand melden.
 *
 * Manuell muss immer möglich bleiben — niemand soll mit Tagro reden müssen,
 * um etwas festzuhalten, das er ohnehin schon weiß. Der Schweregrad wird
 * danach serverseitig berechnet, nicht hier gewählt.
 */

import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import FestagPillButton from '@/components/ui/FestagPillButton'
import { createClient } from '@/lib/supabase/client'
import { categoryLabel } from '@/lib/risks/present'
import { RISK_CATEGORIES, type Risk, type RiskCategory, type RiskLevel } from '@/lib/risks/types'
import type { RiskProjectLite } from '@/components/risks/risks-shared'

const IMPACTS: { id: RiskLevel; label: string }[] = [
  { id: 'low', label: 'Gering' },
  { id: 'medium', label: 'Mittel' },
  { id: 'high', label: 'Hoch' },
  { id: 'critical', label: 'Kritisch' },
]

const PROBABILITIES: { id: 'low' | 'medium' | 'high'; label: string }[] = [
  { id: 'low', label: 'Eher unwahrscheinlich' },
  { id: 'medium', label: 'Möglich' },
  { id: 'high', label: 'Wahrscheinlich' },
]

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (risk: Risk) => void
  defaultProjectId?: string | null
}

export default function RiskCreateModal({ open, onClose, onCreated, defaultProjectId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [projects, setProjects] = useState<RiskProjectLite[]>([])
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<RiskCategory>('delivery')
  const [impact, setImpact] = useState<RiskLevel>('medium')
  const [probability, setProbability] = useState<'low' | 'medium' | 'high'>('medium')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setProjectId(defaultProjectId || '')
    setTitle('')
    setDescription('')
    setCategory('delivery')
    setImpact('medium')
    setProbability('medium')
    setError('')
  }, [open, defaultProjectId])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await (supabase as any)
        .from('projects')
        .select('id,title')
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(100)
      if (cancelled) return
      const rows = (data ?? []) as RiskProjectLite[]
      setProjects(rows)
      setProjectId(curr => curr || rows[0]?.id || '')
    })()
    return () => { cancelled = true }
  }, [open, supabase])

  if (!open) return null

  async function submit() {
    if (busy || !projectId || !title.trim()) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          category,
          impact,
          probability_level: probability,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Risiko konnte nicht gespeichert werden.')
      onCreated(data.risk as Risk)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Risiko konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dec-overlay" role="dialog" aria-modal="true" aria-label="Risiko melden">
      <button type="button" className="dec-backdrop" aria-label="Schließen" onClick={onClose} />
      <aside className="dec-panel">
        <div className="dec-drawer-head">
          <div className="dec-drawer-meta">
            <span className="dec-kicker">Risiko melden</span>
            <span className="dec-saved">Tagro ordnet es danach ein</span>
          </div>
          <div className="dec-drawer-actions">
            <button type="button" className="dec-icon-btn" aria-label="Schließen" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="dec-drawer-body">
          <div className="dec-form-grid">
            <label className="dec-form-field">
              <span>Projekt</span>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}>
                {projects.length === 0 && <option value="">Kein Projekt verfügbar</option>}
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>

            <label className="dec-form-field">
              <span>Was ist das Risiko?</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="z. B. Zugang zum Zahlungsanbieter fehlt"
              />
            </label>

            <label className="dec-form-field">
              <span>Beschreibung</span>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Was könnte passieren — und woran merkt man es?"
              />
            </label>

            <div className="dec-form-row">
              <label className="dec-form-field">
                <span>Bereich</span>
                <select value={category} onChange={e => setCategory(e.target.value as RiskCategory)}>
                  {RISK_CATEGORIES.map(c => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
              </label>
              <label className="dec-form-field">
                <span>Auswirkung</span>
                <select value={impact} onChange={e => setImpact(e.target.value as RiskLevel)}>
                  {IMPACTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
              <label className="dec-form-field">
                <span>Wahrscheinlichkeit</span>
                <select
                  value={probability}
                  onChange={e => setProbability(e.target.value as 'low' | 'medium' | 'high')}
                >
                  {PROBABILITIES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {error && <p className="rsk-error">{error}</p>}

          <div className="rsk-actions">
            <FestagPillButton
              variant="primary"
              disabled={busy || !projectId || !title.trim()}
              onClick={() => void submit()}
            >
              <Plus size={14} weight="bold" />
              {busy ? 'Speichere…' : 'Risiko anlegen'}
            </FestagPillButton>
            <FestagPillButton disabled={busy} onClick={onClose}>Abbrechen</FestagPillButton>
          </div>
        </div>
      </aside>
    </div>
  )
}
