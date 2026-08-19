'use client'

import { useEffect, useRef, useState } from 'react'
import { CaretLeft, DotsThree, X } from '@phosphor-icons/react'
import { TASK_ACTIONS, actionsFor, type TaskAction, type TaskLifecycle, type TaskViewerRole } from '@/lib/tasks/lifecycle'

type Props = {
  flow: TaskLifecycle
  role: TaskViewerRole
  busy?: boolean
  /** actions already offered inline in the row — not repeated in the menu */
  hidden?: TaskAction[]
  onAction: (action: TaskAction, reason?: string | null) => void | Promise<unknown>
  extra?: { id: string; label: string; tone?: 'default' | 'danger'; onSelect: () => void }[]
  align?: 'left' | 'right'
  label?: string
}

/**
 * Every lifecycle action a person may take, in one place.
 *
 * Actions that need a reason or a confirmation open *inside* the menu rather
 * than throwing a modal at the screen — the least disruptive interaction that
 * still carries enough context (Interaction design §7).
 */
export default function TaskActionMenu({
  flow, role, busy, hidden = [], onAction, extra = [], align = 'right', label = 'Weitere Aktionen',
}: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<TaskAction | null>(null)
  const [reason, setReason] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const available = actionsFor(flow, role).filter((action) => !hidden.includes(action))

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) close()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  useEffect(() => {
    if (step) inputRef.current?.focus()
  }, [step])

  function close() {
    setOpen(false)
    setStep(null)
    setReason('')
  }

  function pick(action: TaskAction) {
    const definition = TASK_ACTIONS[action]
    if (definition.reason || definition.confirm) {
      setStep(action)
      setReason('')
      return
    }
    void onAction(action)
    close()
  }

  function confirmStep() {
    if (!step) return
    const definition = TASK_ACTIONS[step]
    const trimmed = reason.trim()
    if (definition.reason === 'required' && !trimmed) {
      inputRef.current?.focus()
      return
    }
    void onAction(step, trimmed || null)
    close()
  }

  if (!available.length && !extra.length) return null

  const stepDefinition = step ? TASK_ACTIONS[step] : null

  return (
    <div className="tsk-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`tsk-icon-btn${open ? ' on' : ''}`}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
          setStep(null)
        }}
      >
        <DotsThree size={18} weight="bold" />
      </button>

      {open && (
        <div
          className={`tsk-menu${align === 'left' ? ' tsk-menu--left' : ''}`}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {!stepDefinition ? (
            <>
              {available.map((action) => {
                const definition = TASK_ACTIONS[action]
                return (
                  <button
                    key={action}
                    type="button"
                    role="menuitem"
                    className={`tsk-menu-item${definition.tone === 'danger' ? ' danger' : ''}`}
                    onClick={() => pick(action)}
                  >
                    <span>{definition.label}</span>
                    {definition.reason === 'required' && <em>Begründung</em>}
                  </button>
                )
              })}
              {extra.length > 0 && available.length > 0 && <div className="tsk-menu-sep" />}
              {extra.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={`tsk-menu-item${item.tone === 'danger' ? ' danger' : ''}`}
                  onClick={() => { item.onSelect(); close() }}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </>
          ) : (
            <div className="tsk-menu-step">
              <div className="tsk-menu-step-head">
                <button type="button" className="tsk-menu-back" onClick={() => setStep(null)} aria-label="Zurück">
                  <CaretLeft size={13} weight="bold" />
                </button>
                <strong>{stepDefinition.label}</strong>
                <button type="button" className="tsk-menu-back" onClick={close} aria-label="Schließen">
                  <X size={13} weight="bold" />
                </button>
              </div>
              <p className="tsk-menu-step-note">{stepDefinition.consequence}</p>
              {stepDefinition.reason && (
                <textarea
                  ref={inputRef}
                  className="tsk-menu-step-input"
                  rows={3}
                  value={reason}
                  placeholder={stepDefinition.reason === 'required'
                    ? 'Worum geht es? (wird im Verlauf festgehalten)'
                    : 'Optionale Notiz…'}
                  onChange={(event) => setReason(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) confirmStep()
                  }}
                />
              )}
              <div className="tsk-menu-step-actions">
                <button type="button" className="tsk-step-btn" onClick={() => setStep(null)}>Abbrechen</button>
                <button
                  type="button"
                  className={`tsk-step-btn primary${stepDefinition.tone === 'danger' ? ' danger' : ''}`}
                  onClick={confirmStep}
                  disabled={stepDefinition.reason === 'required' && !reason.trim()}
                >
                  {stepDefinition.label}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
