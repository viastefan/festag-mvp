'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  Brain,
  CalendarBlank,
  CaretDown,
  ChatCircle,
  Clock,
  HandTap,
  Lightning,
  Plus,
  Sparkle,
  Trash,
  Warning,
  X,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import Modal from '@/components/Modal'
import { BRIEFING_INTELLIGENCE_CSS } from '@/components/briefing/briefing-intelligence-styles'
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
import { useFestagMobile } from '@/hooks/useFestagMobile'

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

function IntelPickerMenu({
  open,
  anchorRef,
  children,
  align = 'start',
}: {
  open: boolean
  anchorRef: RefObject<HTMLDivElement | null>
  children: ReactNode
  align?: 'start' | 'stretch'
}) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const menuW = align === 'stretch' ? r.width : Math.max(r.width, 280)
    let left = r.left
    if (left + menuW > window.innerWidth - 12) left = window.innerWidth - menuW - 12
    setStyle({
      position: 'fixed',
      top: r.bottom + 8,
      left: Math.max(12, left),
      width: align === 'stretch' ? menuW : undefined,
      minWidth: align === 'stretch' ? menuW : 280,
      maxWidth: Math.min(menuW, window.innerWidth - 24),
      zIndex: 9800,
      visibility: 'visible',
    })
  }, [align, anchorRef, open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="bi-menu bi-menu--portal" style={style} onClick={e => e.stopPropagation()}>
      {children}
    </div>,
    document.body,
  )
}

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: (workflow: StatusWorkflow) => void
}

export default function BriefingIntelligenceModal({ open, onClose, onSaved }: Props) {
  const isMobile = useFestagMobile()
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

  const selectTrigger = useCallback((id: WorkflowTriggerId) => {
    setWorkflow(prev => prev ? { ...prev, trigger: id } : prev)
    setTriggerOpen(false)
  }, [])

  const addStep = useCallback((id: WorkflowStepId) => {
    setWorkflow(prev => prev ? { ...prev, steps: [...prev.steps, id] } : prev)
    setStepOpen(false)
  }, [])

  const removeStep = useCallback((index: number) => {
    setWorkflow(prev => {
      if (!prev) return prev
      const steps = [...prev.steps]
      steps.splice(index, 1)
      return { ...prev, steps }
    })
  }, [])

  const openStepMenu = useCallback(() => {
    setStepOpen(true)
    setTriggerOpen(false)
  }, [])

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
      bare
      noPadding
      size="lg"
      surfaceClassName={`festag-modal-surface--briefing-intel${isMobile ? ' festag-modal-surface--briefing-intel-mobile' : ''}`}
      dragHandle={isMobile}
    >
      <style>{BRIEFING_INTELLIGENCE_CSS}</style>
      <div className="bi-shell">
        <button type="button" className="bi-close" onClick={onClose} aria-label="Schließen">
          <X size={16} weight="bold" />
        </button>

        <header className="bi-head">
          <h2 className="bi-title">Intelligenz regeln</h2>
        </header>

        <div className="bi-body">
          <div className="bi-flow">
            <div className="bi-flow-line" aria-hidden />

            <section className="bi-block">
              <p className="bi-block-label">Trigger</p>
              <div className="bi-anchor" ref={triggerRef}>
                <button
                  type="button"
                  className={`bi-card${triggerOpen ? ' is-open' : ''}`}
                  aria-expanded={triggerOpen}
                  onClick={() => { setTriggerOpen(v => !v); setStepOpen(false) }}
                >
                  <span className="bi-card-icon">
                    <TriggerIcon size={18} weight={workflow?.trigger ? 'fill' : 'regular'} />
                  </span>
                  <span className="bi-card-copy">
                    <span className="bi-card-title">{triggerDef?.label ?? 'Trigger wählen'}</span>
                    {triggerDef?.description ? (
                      <span className="bi-card-meta">{triggerDef.description}</span>
                    ) : null}
                  </span>
                  <CaretDown size={14} weight="bold" className={`bi-card-caret${triggerOpen ? ' open' : ''}`} />
                </button>
                <IntelPickerMenu open={triggerOpen} anchorRef={triggerRef} align="stretch">
                  {WORKFLOW_TRIGGERS.map(t => {
                    const Ico = TRIGGER_ICONS[t.id]
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`bi-menu-item${workflow?.trigger === t.id ? ' on' : ''}`}
                        onClick={() => selectTrigger(t.id)}
                      >
                        <span className="bi-menu-icon"><Ico size={16} weight="regular" /></span>
                        <span className="bi-menu-copy">
                          <span className="bi-menu-title">{t.label}</span>
                          <span className="bi-menu-meta">{t.description}</span>
                        </span>
                      </button>
                    )
                  })}
                </IntelPickerMenu>
              </div>
            </section>

            <section className="bi-block">
              <p className="bi-block-label">Schritte</p>
              <div className="bi-steps" ref={stepRef}>
                {workflow?.steps.length ? (
                  <div className="bi-step-list">
                    {workflow.steps.map((stepId, index) => {
                      const def = WORKFLOW_STEPS.find(s => s.id === stepId)
                      return (
                        <div key={`${stepId}-${index}`} className="bi-step">
                          <div className="bi-step-body">
                            <span className="bi-step-title">{def?.label ?? stepId}</span>
                            {def?.description ? (
                              <span className="bi-step-meta">{def.description}</span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="bi-step-remove"
                            aria-label="Schritt entfernen"
                            onClick={() => removeStep(index)}
                          >
                            <Trash size={15} weight="regular" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`bi-card bi-card--empty${stepOpen ? ' is-open' : ''}`}
                    onClick={openStepMenu}
                  >
                    <span className="bi-card-icon bi-card-icon--muted">
                      <Plus size={18} weight="bold" />
                    </span>
                    <span className="bi-card-copy">
                      <span className="bi-card-title">Schritt hinzufügen</span>
                      <span className="bi-card-meta">Was soll Tagro im Briefing tun?</span>
                    </span>
                  </button>
                )}

                <IntelPickerMenu open={stepOpen} anchorRef={stepRef} align="stretch">
                  {availableSteps.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className="bi-menu-item"
                      onClick={() => addStep(s.id)}
                    >
                      <span className="bi-menu-copy">
                        <span className="bi-menu-title">{s.label}</span>
                        <span className="bi-menu-meta">{s.description}</span>
                      </span>
                    </button>
                  ))}
                </IntelPickerMenu>

                {workflow?.steps.length ? (
                  <div className="bi-add-row">
                    <button
                      type="button"
                      className="bi-add-btn"
                      aria-label="Schritt hinzufügen"
                      onClick={openStepMenu}
                      disabled={availableSteps.length === 0}
                    >
                      <Plus size={14} weight="bold" />
                      <span>Schritt</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>

        <footer className="bi-foot">
          <button
            type="button"
            className="bi-save"
            disabled={!canSave || saving}
            onClick={() => { void handleSave() }}
          >
            {saving ? 'Speichern …' : 'Speichern'}
          </button>
        </footer>
      </div>
    </Modal>
  )
}
