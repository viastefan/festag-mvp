'use client'

import { useEffect, useRef, useState } from 'react'
import {
  getOrCreateDefaultWorkflow,
  upsertStatusWorkflow,
} from '@/lib/workflows/status-workflow-store'
import {
  WORKFLOW_STEPS,
  WORKFLOW_TRIGGERS,
  type StatusWorkflow,
  type WorkflowStepId,
  type WorkflowTriggerId,
} from '@/lib/workflows/status-workflow-types'

const BRIEFING_TRIGGERS: WorkflowTriggerId[] = [
  'schedule_weekly',
  'schedule_daily',
  'manual',
  'blocker_detected',
  'ai_delay_risk',
]

const BRIEFING_STEPS: WorkflowStepId[] = [
  'blockers',
  'next_steps',
  'ai_insight',
  'output_audio',
]

type Props = {
  compact?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onOpenFullWorkflow: () => void
}

export default function BriefingIntelligenceRulesMenu({
  compact,
  open: openProp,
  onOpenChange,
  onOpenFullWorkflow,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const [workflow, setWorkflow] = useState<StatusWorkflow | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setWorkflow(getOrCreateDefaultWorkflow())
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [open])

  function setTrigger(id: WorkflowTriggerId) {
    setWorkflow(prev => prev ? { ...prev, trigger: id } : prev)
  }

  function toggleStep(id: WorkflowStepId) {
    setWorkflow(prev => {
      if (!prev) return prev
      const has = prev.steps.includes(id)
      const steps = has ? prev.steps.filter(s => s !== id) : [...prev.steps, id]
      return { ...prev, steps }
    })
  }

  async function handleSave() {
    if (!workflow?.trigger) return
    setSaving(true)
    try {
      upsertStatusWorkflow(workflow)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  function openFull() {
    setOpen(false)
    onOpenFullWorkflow()
  }

  const triggerDefs = BRIEFING_TRIGGERS
    .map(id => WORKFLOW_TRIGGERS.find(t => t.id === id))
    .filter(Boolean)

  const stepDefs = BRIEFING_STEPS
    .map(id => WORKFLOW_STEPS.find(s => s.id === id))
    .filter(Boolean)

  return (
    <div className="wsb-intel-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`wsb-intel-cta${compact ? ' wsb-intel-cta--compact' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={e => {
          e.stopPropagation()
          setOpen(!open)
        }}
      >
        Intelligenz regeln
      </button>

      {open && workflow && (
        <div
          className="wsb-intel-menu"
          role="dialog"
          aria-label="Intelligenz regeln"
          onClick={e => e.stopPropagation()}
        >
          <p className="wsb-intel-menu-title">Intelligenz regeln</p>
          <p className="wsb-intel-menu-sub">
            Steuere, wann Tagro Briefings erstellt und was darin enthalten ist.
          </p>

          <p className="wsb-intel-section">Rhythmus</p>
          <div className="wsb-intel-options">
            {triggerDefs.map(t => (
              <button
                key={t!.id}
                type="button"
                className={workflow.trigger === t!.id ? 'on' : ''}
                onClick={() => setTrigger(t!.id)}
              >
                <span className="wsb-intel-option-title">{t!.label}</span>
                <span className="wsb-intel-option-sub">{t!.description}</span>
              </button>
            ))}
          </div>

          <p className="wsb-intel-section">Im Briefing</p>
          <div className="wsb-intel-checks">
            {stepDefs.map(s => {
              const on = workflow.steps.includes(s!.id)
              return (
                <label key={s!.id} className="wsb-intel-check">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleStep(s!.id)}
                  />
                  <span>
                    <span className="wsb-intel-option-title">{s!.label}</span>
                    <span className="wsb-intel-option-sub">{s!.description}</span>
                  </span>
                </label>
              )
            })}
          </div>

          <div className="wsb-intel-foot">
            <button type="button" className="wsb-intel-link" onClick={openFull}>
              Workflow bearbeiten
            </button>
            <button
              type="button"
              className="wsb-intel-save"
              disabled={!workflow.trigger || saving}
              onClick={() => { void handleSave() }}
            >
              {saving ? 'Speichern …' : 'Speichern'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
