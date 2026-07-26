'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain,
  BracketsCurly,
  CalendarBlank,
  CaretDown,
  ChatCircle,
  Clock,
  HandTap,
  Info,
  Lightning,
  Plus,
  Sparkle,
  Trash,
  Warning,
  X,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import Modal from '@/components/Modal'
import { STATUS_WORKFLOW_CSS } from '@/components/workflows/status-workflow-styles'
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

const TRIGGER_ICONS: Record<WorkflowTriggerId, Icon> = {
  manual: HandTap,
  schedule_daily: Clock,
  schedule_weekly: CalendarBlank,
  task_completed: Sparkle,
  blocker_detected: Warning,
  phase_change: Lightning,
  deadline_approaching: Clock,
  client_message: ChatCircle,
  ai_delay_risk: Brain,
}

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: (workflow: StatusWorkflow) => void
  title?: string
}

export default function StatusWorkflowModal({
  open,
  onClose,
  onSaved,
  title = 'Intelligenz regeln',
}: Props) {
  const [workflow, setWorkflow] = useState<StatusWorkflow | null>(null)
  const [triggerOpen, setTriggerOpen] = useState(false)
  const [stepOpen, setStepOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setWorkflow(getOrCreateDefaultWorkflow())
    setTriggerOpen(false)
    setStepOpen(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current && !triggerRef.current.contains(t)) setTriggerOpen(false)
      if (stepRef.current && !stepRef.current.contains(t)) setStepOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const triggerDef = useMemo(
    () => WORKFLOW_TRIGGERS.find(t => t.id === workflow?.trigger),
    [workflow?.trigger],
  )

  const canSave = Boolean(workflow?.trigger && (workflow?.steps.length ?? 0) > 0)

  const availableSteps = useMemo(() => {
    const used = new Set(workflow?.steps ?? [])
    return WORKFLOW_STEPS.filter(s => !used.has(s.id))
  }, [workflow?.steps])

  function selectTrigger(id: WorkflowTriggerId) {
    setWorkflow(prev => prev ? { ...prev, trigger: id } : prev)
    setTriggerOpen(false)
  }

  function addStep(id: WorkflowStepId) {
    setWorkflow(prev => prev ? { ...prev, steps: [...prev.steps, id] } : prev)
    setStepOpen(false)
  }

  function removeStep(index: number) {
    setWorkflow(prev => {
      if (!prev) return prev
      const steps = [...prev.steps]
      steps.splice(index, 1)
      return { ...prev, steps }
    })
  }

  function openStepMenu() {
    setStepOpen(true)
    setTriggerOpen(false)
  }

  async function handleSave() {
    if (!workflow || !canSave) return
    setSaving(true)
    try {
      const saved = upsertStatusWorkflow(workflow)
      onSaved?.(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const TriggerIcon = workflow?.trigger ? TRIGGER_ICONS[workflow.trigger] : Sparkle

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      bare
      noPadding
      surfaceClassName="festag-modal-surface--workflow"
    >
      <style>{STATUS_WORKFLOW_CSS}</style>
      <div className="swf-modal">
        <header className="swf-head">
          <h2 className="swf-title">{title}</h2>
          <div className="swf-head-actions">
            <button type="button" className="swf-preset" aria-label="Workflow-Vorlage">
              <CalendarBlank size={14} weight="regular" aria-hidden />
              {workflow?.name ?? 'Standard'}
              <CaretDown size={12} weight="bold" aria-hidden />
            </button>
            <button type="button" className="swf-close" onClick={onClose} aria-label="Schließen">
              <X size={16} weight="bold" />
            </button>
          </div>
        </header>

        <div className="swf-body">
          <div className="swf-canvas">
            <div className="swf-flow">
              <div className="swf-connector" aria-hidden />

              <p className="swf-section-label">Trigger</p>
              <div className="swf-picker" ref={triggerRef}>
                <button
                  type="button"
                  className={`swf-picker-card${triggerOpen ? ' on' : ''}`}
                  aria-expanded={triggerOpen}
                  onClick={() => { setTriggerOpen(v => !v); setStepOpen(false) }}
                >
                  <span className="swf-picker-ico">
                    <TriggerIcon size={20} weight={workflow?.trigger ? 'fill' : 'regular'} />
                  </span>
                  <span className="swf-picker-copy">
                    <p className="swf-picker-title">
                      {triggerDef?.label ?? 'Trigger wählen'}
                    </p>
                    <p className="swf-picker-sub">
                      {triggerDef?.description ?? 'Ein Trigger startet den Briefing-Workflow'}
                    </p>
                  </span>
                  <CaretDown size={14} weight="bold" className={`swf-picker-caret${triggerOpen ? ' open' : ''}`} />
                </button>

                {triggerOpen && (
                  <div className="swf-menu" role="listbox" aria-label="Trigger">
                    {WORKFLOW_TRIGGERS.map(t => {
                      const Ico = TRIGGER_ICONS[t.id]
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="option"
                          aria-selected={workflow?.trigger === t.id}
                          className={`swf-menu-item${workflow?.trigger === t.id ? ' on' : ''}`}
                          onClick={() => selectTrigger(t.id)}
                        >
                          <span className="swf-picker-ico swf-picker-ico--menu">
                            <Ico size={18} weight="regular" />
                          </span>
                          <span>
                            <p className="swf-menu-item-title">{t.label}</p>
                            <p className="swf-menu-item-sub">{t.description}</p>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <p className="swf-section-label">Schritte</p>
              <div className="swf-steps" ref={stepRef}>
                {workflow?.steps.length ? (
                  <div className="swf-step-list">
                    {workflow.steps.map((stepId, index) => {
                      const def = WORKFLOW_STEPS.find(s => s.id === stepId)
                      return (
                        <div key={`${stepId}-${index}`} className="swf-step-row">
                          <div className="swf-step-draft swf-step-draft--filled">
                            <div className="swf-step-draft-head">
                              <p className="swf-step-draft-label">{def?.label ?? stepId}</p>
                              <button
                                type="button"
                                className="swf-step-remove"
                                aria-label="Schritt entfernen"
                                onClick={() => removeStep(index)}
                              >
                                <Trash size={15} weight="regular" />
                              </button>
                            </div>
                            <p className="swf-step-draft-placeholder">{def?.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`swf-step-draft${stepOpen ? ' on' : ''}`}
                    onClick={openStepMenu}
                  >
                    <p className="swf-step-draft-label">Neuer Schritt</p>
                    <p className="swf-step-draft-placeholder">Was soll Tagro tun?</p>
                    <div className="swf-step-draft-actions">
                      <span className="swf-chip">
                        <Plus size={12} weight="bold" aria-hidden />
                        Quellen
                      </span>
                      <span className="swf-chip">
                        <BracketsCurly size={12} weight="bold" aria-hidden />
                        Input
                      </span>
                    </div>
                  </button>
                )}

                {stepOpen && availableSteps.length > 0 && (
                  <div className="swf-menu swf-menu--steps" role="listbox" aria-label="Schritte">
                    {WORKFLOW_STEPS.filter(s => availableSteps.some(a => a.id === s.id)).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        className="swf-menu-item"
                        onClick={() => addStep(s.id)}
                      >
                        <span>
                          <p className="swf-menu-item-title">{s.label}</p>
                          <p className="swf-menu-item-sub">{s.description}</p>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="swf-add-wrap">
                  <button
                    type="button"
                    className="swf-add-btn"
                    aria-label="Schritt hinzufügen"
                    onClick={openStepMenu}
                    disabled={availableSteps.length === 0}
                  >
                    <Plus size={14} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="swf-foot">
          {!canSave && (
            <span className="swf-foot-hint">
              <Info size={14} weight="regular" aria-hidden />
              Trigger und mindestens ein Schritt nötig
            </span>
          )}
          <button
            type="button"
            className="swf-save"
            disabled={!canSave || saving}
            onClick={() => { void handleSave() }}
          >
            <Clock size={15} weight="regular" aria-hidden />
            {saving ? 'Speichern …' : 'Workflow speichern'}
          </button>
        </footer>
      </div>
    </Modal>
  )
}
