'use client'

/**
 * Filter — hidden until asked for, functional when opened.
 *
 * Only facets that exist in the loaded set are offered: no empty "Projekt"
 * group when everything belongs to one project, no priority chip for a
 * priority nothing has. An option that would return nothing is noise.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  URGENCY_LABEL,
  resolveDecisionType,
  type Decision,
  type ProjectLite,
} from '@/components/decisions/decisions-shared'

export type DecisionFilters = {
  projectIds: string[]
  urgencies: string[]
  types: string[]
  /** Only decisions whose answer would unblock work. */
  blockingOnly: boolean
  /** Only decisions Tagro has a recommendation for. */
  recommendedOnly: boolean
}

export const EMPTY_FILTERS: DecisionFilters = {
  projectIds: [],
  urgencies: [],
  types: [],
  blockingOnly: false,
  recommendedOnly: false,
}

export function countActiveFilters(f: DecisionFilters): number {
  return f.projectIds.length + f.urgencies.length + f.types.length
    + (f.blockingOnly ? 1 : 0) + (f.recommendedOnly ? 1 : 0)
}

/** Applies the filters. Kept pure so the page can memoise it. */
export function applyDecisionFilters(
  decisions: Decision[],
  f: DecisionFilters,
  blockedCount: (id: string) => number,
): Decision[] {
  return decisions.filter(d => {
    if (f.projectIds.length && (!d.project_id || !f.projectIds.includes(d.project_id))) return false
    if (f.urgencies.length && !f.urgencies.includes(d.urgency)) return false
    if (f.types.length && (!d.decision_type || !f.types.includes(d.decision_type))) return false
    if (f.blockingOnly && blockedCount(d.id) === 0) return false
    if (f.recommendedOnly && !d.recommended_option && !d.tagro_recommendation_reason) return false
    return true
  })
}

type Props = {
  decisions: Decision[]
  projects: Record<string, ProjectLite>
  value: DecisionFilters
  anchor: DOMRect | null
  onChange: (next: DecisionFilters) => void
  onClose: () => void
}

const URGENCY_ORDER = ['critical', 'high', 'normal', 'low']

export default function DecisionFilterPopover({
  decisions, projects, value, anchor, onChange, onClose,
}: Props) {
  const popRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<DecisionFilters>(value)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Live: the list updates as chips are toggled, no "Apply" round trip.
  useEffect(() => { onChange(draft) }, [draft, onChange])

  const facets = useMemo(() => {
    const projectIds = new Set<string>()
    const urgencies = new Set<string>()
    const types = new Set<string>()
    for (const d of decisions) {
      if (d.project_id) projectIds.add(d.project_id)
      if (d.urgency) urgencies.add(d.urgency)
      if (d.decision_type) types.add(d.decision_type)
    }
    return {
      projectIds: Array.from(projectIds),
      urgencies: URGENCY_ORDER.filter(u => urgencies.has(u)),
      types: Array.from(types),
    }
  }, [decisions])

  function toggle(key: 'projectIds' | 'urgencies' | 'types', v: string) {
    setDraft(curr => {
      const list = curr[key]
      return { ...curr, [key]: list.includes(v) ? list.filter(x => x !== v) : [...list, v] }
    })
  }

  const style: React.CSSProperties = anchor
    ? { top: Math.round(anchor.bottom + 8), left: Math.round(Math.max(16, anchor.right - 300)) }
    : { top: 96, right: 32 }

  return (
    <div className="dcf-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={popRef} className="dcf-pop" style={style} role="dialog" aria-label="Entscheidungen filtern">
        {facets.projectIds.length > 1 && (
          <div className="dcf-group">
            <p className="dcf-group-label">Projekt</p>
            <div className="dcf-chips">
              {facets.projectIds.map(id => (
                <button
                  key={id}
                  type="button"
                  className={`dcf-chip${draft.projectIds.includes(id) ? ' is-on' : ''}`}
                  onClick={() => toggle('projectIds', id)}
                >
                  {projects[id]?.title || 'Projekt'}
                </button>
              ))}
            </div>
          </div>
        )}

        {facets.urgencies.length > 1 && (
          <div className="dcf-group">
            <p className="dcf-group-label">Priorität</p>
            <div className="dcf-chips">
              {facets.urgencies.map(u => (
                <button
                  key={u}
                  type="button"
                  className={`dcf-chip${draft.urgencies.includes(u) ? ' is-on' : ''}`}
                  onClick={() => toggle('urgencies', u)}
                >
                  {URGENCY_LABEL[u] || u}
                </button>
              ))}
            </div>
          </div>
        )}

        {facets.types.length > 1 && (
          <div className="dcf-group">
            <p className="dcf-group-label">Art</p>
            <div className="dcf-chips">
              {facets.types.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`dcf-chip${draft.types.includes(t) ? ' is-on' : ''}`}
                  onClick={() => toggle('types', t)}
                >
                  {resolveDecisionType(t).label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="dcf-group">
          <p className="dcf-group-label">Nur zeigen</p>
          <div className="dcf-chips">
            <button
              type="button"
              className={`dcf-chip${draft.blockingOnly ? ' is-on' : ''}`}
              onClick={() => setDraft(c => ({ ...c, blockingOnly: !c.blockingOnly }))}
            >
              Blockiert Arbeit
            </button>
            <button
              type="button"
              className={`dcf-chip${draft.recommendedOnly ? ' is-on' : ''}`}
              onClick={() => setDraft(c => ({ ...c, recommendedOnly: !c.recommendedOnly }))}
            >
              Mit Tagro-Empfehlung
            </button>
          </div>
        </div>

        <div className="dcf-foot">
          <button type="button" className="dcf-clear" onClick={() => setDraft(EMPTY_FILTERS)}>
            Zurücksetzen
          </button>
          <button type="button" className="dcf-done" onClick={onClose}>Fertig</button>
        </div>
      </div>
    </div>
  )
}
