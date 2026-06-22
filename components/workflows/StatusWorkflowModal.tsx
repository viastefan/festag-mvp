'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain,
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
import Modal, { ModalButton } from '@/components/Modal'
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

const GROUP_LABELS = {
  user: 'Nutzer',
  system: 'System',
  ai: 'AI',
  report: 'Bericht',
  output: 'Ausgabe',
} as const

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: (workflow: StatusWorkflow) => void
}

export default function StatusWorkflowModal({ open, onClose, onSaved }: Props) {
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

  const triggersByGroup = useMemo(() => {
    const groups: Record<'user' | 'system' | 'ai', typeof WORKFLOW_TRIGGERS> = {
      user: [],
      system: [],
      ai: [],
    }
    for (const t of WORKFLOW_TRIGGERS) groups[t.group].push(t)
    return groups
  }, [])

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
    <Modal open={open} onClose={onClose} size="lg" bare noPadding>
      <style>{STATUS_WORKFLOW_CSS}</style>
      <div className="swf-modal">
        <header className="swf-head">
          <h2 className="swf-title">Neuer Workflow</h2>
          <div className="swf-head-actions">
            <button type="button" className="swf-preset" aria-label="Workflow-Vorlage">
              {workflow?.name ?? 'Standard'}
              <CaretDown size={12} weight="bold" aria-hidden />
            </button>
            <button type="button" className="swf-close" onClick={onClose} aria-label="Schließen">
              <X size={16} weight="bold" />
            </button>
          </div>
        </header>

        <div className="swf-body">
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
                    {triggerDef?.description ?? 'Ein Trigger startet den Statusbericht-Workflow'}
                  </p>
                </span>
                <CaretDown size={14} weight="bold" className={`swf-picker-caret${triggerOpen ? ' open' : ''}`} />
              </button>

              {triggerOpen && (
                <div className="swf-menu" role="listbox">
                  {(['user', 'system', 'ai'] as const).map(group => (
                    <div key={group}>
                      <p className="swf-menu-group">{GROUP_LABELS[group]}</p>
                      {triggersByGroup[group].map(t => {
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
                            <span className="swf-picker-ico">
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
                  ))}
                </div>
              )}
            </div>

            <p className="swf-section-label">Schritte</p>
            <div className="swf-steps">
              {workflow?.steps.length ? (
                <div className="swf-step-list">
                  {workflow.steps.map((stepId, index) => {
                    const def = WORKFLOW_STEPS.find(s => s.id === stepId)
                    return (
                      <div key={`${stepId}-${index}`} className="swf-step-row">
                        <div className="swf-step-card">
                          <span className="swf-step-num">{index + 1}</span>
                          <span className="swf-picker-copy">
                            <p className="swf-picker-title">{def?.label ?? stepId}</p>
                            <p className="swf-picker-sub">{def?.description}</p>
                          </span>
                        </div>
                        <button
                          type="button"
                          className="swf-step-remove"
                          aria-label="Schritt entfernen"
                          onClick={() => removeStep(index)}
                        >
                          <Trash size={16} weight="regular" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="swf-picker" ref={stepRef}>
                  <button
                    type="button"
                    className={`swf-picker-card${stepOpen ? ' on' : ''}`}
                    aria-expanded={stepOpen}
                    onClick={() => { setStepOpen(v => !v); setTriggerOpen(false) }}
                  >
                    <span className="swf-picker-ico">
                      <Plus size={20} weight="bold" />
                    </span>
                    <span className="swf-picker-copy">
                      <p className="swf-picker-title">Ersten Schritt hinzufügen</p>
                      <p className="swf-picker-sub">
                        Zum Beispiel Fortschritt, Blocker oder Ausgabe an Dashboard
                      </p>
                    </span>
                    <CaretDown size={14} weight="bold" className={`swf-picker-caret${stepOpen ? ' open' : ''}`} />
                  </button>

                  {stepOpen && (
                    <div className="swf-menu" role="listbox">
                      {(['report', 'output'] as const).map(group => (
                        <div key={group}>
                          <p className="swf-menu-group">{GROUP_LABELS[group]}</p>
                          {WORKFLOW_STEPS.filter(s => s.group === group).map(s => (
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
                      ))}
                    </div>
                  )}
                </div>
              )}

              {workflow && workflow.steps.length > 0 && (
                <div className="swf-add-wrap" ref={stepRef}>
                  <div className="swf-add-line" aria-hidden />
                  <button
                    type="button"
                    className="swf-add-btn"
                    aria-label="Schritt hinzufügen"
                    onClick={() => { setStepOpen(v => !v); setTriggerOpen(false) }}
                  >
                    <Plus size={14} weight="bold" />
                  </button>
                  {stepOpen && availableSteps.length > 0 && (
                    <div className="swf-menu" style={{ marginTop: 10 }} role="listbox">
                      {(['report', 'output'] as const).map(group => {
                        const items = availableSteps.filter(s => s.group === group)
                        if (!items.length) return null
                        return (
                          <div key={group}>
                            <p className="swf-menu-group">{GROUP_LABELS[group]}</p>
                            {items.map(s => (
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
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
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
          <ModalButton variant="ghost" onClick={onClose}>Abbrechen</ModalButton>
          <button
            type="button"
            className="swf-save"
            disabled={!canSave || saving}
            onClick={() => { void handleSave() }}
          >
            {saving ? 'Speichern …' : 'Workflow speichern'}
          </button>
        </footer>
      </div>
    </Modal>
  )
}
