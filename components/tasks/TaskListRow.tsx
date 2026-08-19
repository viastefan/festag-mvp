'use client'

import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  CalendarBlank,
  Check,
  CircleNotch,
  Flag,
  UserCircle,
  Warning,
} from '@phosphor-icons/react'
import {
  LIFECYCLE_DE,
  PRIORITY_DE,
  TASK_ACTIONS,
  TASK_PRIORITIES,
  attentionOf,
  dueLabel,
  isOverdue,
  lifecycleLabel,
  primaryAction,
  type TaskAction,
  type TaskLifecycle,
  type TaskViewerRole,
} from '@/lib/tasks/lifecycle'
import { getTaskGroup } from '@/lib/tasks/groups'
import { autoAvatarColor, avatarInitials } from '@/lib/avatar'
import TaskActionMenu from '@/components/tasks/TaskActionMenu'
import type { PersonRecord, ProjectRecord, TaskRecord } from '@/lib/tasks/client-api'

type Props = {
  task: TaskRecord
  project: ProjectRecord | null
  assignee: PersonRecord | null
  people: PersonRecord[]
  flow: TaskLifecycle
  role: TaskViewerRole
  canAssign: boolean
  canEdit: boolean
  canDelete: boolean
  busy: boolean
  selected: boolean
  selectionMode: boolean
  focused: boolean
  onOpen: () => void
  onToggleSelect: (event: { shiftKey: boolean }) => void
  onAction: (action: TaskAction, reason?: string | null) => void
  onAssign: (userId: string | null) => void
  onPriority: (priority: string | null) => void
  onDueDate: (due: string | null) => void
  onDelete: () => void
}

function TaskListRow({
  task, project, assignee, people, flow, role, canAssign, canEdit, canDelete,
  busy, selected, selectionMode, focused,
  onOpen, onToggleSelect, onAction, onAssign, onPriority, onDueDate, onDelete,
}: Props) {
  const meta = LIFECYCLE_DE[flow]
  const attention = attentionOf(task, role)
  const group = getTaskGroup(task)
  const primary = primaryAction(flow, role)
  const overdue = isOverdue(task.due_date, flow)
  const isDone = flow === 'completed' || flow === 'approved_by_owner'
  const isCancelled = flow === 'cancelled'
  const progress = Math.max(0, Math.min(100, task.progress ?? 0))

  const context = [
    project?.title,
    group.label,
  ].filter(Boolean).join(' · ')

  const updateLine = (task.latest_client_update || task.tagro_client_summary || task.description || '').trim()

  return (
    <div
      className={[
        'tsk-row',
        selected ? 'is-selected' : '',
        focused ? 'is-focused' : '',
        busy ? 'is-busy' : '',
        isDone ? 'is-done' : '',
        isCancelled ? 'is-cancelled' : '',
        attention ? `has-attention attn-${attention.kind}` : '',
      ].filter(Boolean).join(' ')}
      data-task-id={task.id}
    >
      <button
        type="button"
        className={`tsk-row-check${selectionMode || selected ? ' visible' : ''}`}
        role="checkbox"
        aria-checked={selected}
        aria-label={selected ? 'Auswahl aufheben' : 'Aufgabe auswählen'}
        onClick={(event) => { event.stopPropagation(); onToggleSelect({ shiftKey: event.shiftKey }) }}
      >
        {selected ? <Check size={11} weight="bold" /> : null}
      </button>

      <button type="button" className="tsk-row-main" onClick={onOpen} aria-label={`${task.title} öffnen`}>
        <span className="tsk-row-status" style={{ ['--tsk-state' as string]: meta.color }}>
          <span className="tsk-row-dot" aria-hidden />
          <span className="tsk-row-status-label">{lifecycleLabel(flow, role)}</span>
        </span>

        <span className="tsk-row-body">
          <span className="tsk-row-title-line">
            <span className="tsk-row-title">{task.title}</span>
            {task.priority && task.priority !== 'medium' && (
              <span
                className="tsk-row-prio"
                style={{ ['--tsk-prio' as string]: PRIORITY_DE[task.priority as keyof typeof PRIORITY_DE]?.color }}
                title={`Priorität: ${PRIORITY_DE[task.priority as keyof typeof PRIORITY_DE]?.label}`}
              >
                <Flag size={10} weight="fill" />
                {PRIORITY_DE[task.priority as keyof typeof PRIORITY_DE]?.label}
              </span>
            )}
          </span>
          <span className="tsk-row-sub">
            {context && <span className="tsk-row-context">{context}</span>}
            {updateLine && <span className="tsk-row-update">{updateLine}</span>}
          </span>
          {attention && (
            <span className="tsk-row-attention">
              <Warning size={11} weight="fill" />
              {attention.label}
            </span>
          )}
        </span>
      </button>

      <div className="tsk-row-meta">
        {!isDone && !isCancelled && progress > 0 && (
          <span className="tsk-row-progress" title={`${progress}% Fortschritt`} aria-hidden>
            <span style={{ width: `${progress}%` }} />
          </span>
        )}

        <Popover
          label={assignee ? assignee.name : 'Nicht zugewiesen'}
          disabled={!canAssign}
          trigger={(
            <span className="tsk-chip tsk-chip--person">
              {assignee ? (
                <span
                  className="tsk-avatar"
                  style={{ background: autoAvatarColor(assignee.id) }}
                  aria-hidden
                >
                  {avatarInitials(null, assignee.name, assignee.email)}
                </span>
              ) : (
                <UserCircle size={15} weight="regular" />
              )}
            </span>
          )}
        >
          {(close) => (
            <div className="tsk-pop-list" role="menu">
              <p className="tsk-pop-label">Verantwortlich</p>
              <button
                type="button"
                role="menuitem"
                className={`tsk-pop-item${!task.assigned_to ? ' on' : ''}`}
                onClick={() => { onAssign(null); close() }}
              >
                Niemand
              </button>
              {people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  role="menuitem"
                  className={`tsk-pop-item${task.assigned_to === person.id ? ' on' : ''}`}
                  onClick={() => { onAssign(person.id); close() }}
                >
                  <span className="tsk-avatar sm" style={{ background: autoAvatarColor(person.id) }} aria-hidden>
                    {avatarInitials(null, person.name, person.email)}
                  </span>
                  {person.name}
                </button>
              ))}
              {!people.length && <p className="tsk-pop-empty">Noch niemand im Projekt.</p>}
            </div>
          )}
        </Popover>

        <Popover
          label={task.due_date ? dueLabel(task.due_date) : 'Kein Termin'}
          disabled={!canEdit}
          trigger={(
            <span className={`tsk-chip${overdue ? ' danger' : ''}${task.due_date ? ' filled' : ''}`}>
              <CalendarBlank size={13} weight="regular" />
              {task.due_date ? <span className="tsk-chip-text">{dueLabel(task.due_date)}</span> : null}
            </span>
          )}
        >
          {(close) => (
            <div className="tsk-pop-list" role="menu">
              <p className="tsk-pop-label">Termin</p>
              <input
                type="date"
                className="tsk-pop-date"
                defaultValue={task.due_date ?? ''}
                onChange={(event) => { onDueDate(event.target.value || null); close() }}
              />
              {task.due_date && (
                <button type="button" className="tsk-pop-item" onClick={() => { onDueDate(null); close() }}>
                  Termin entfernen
                </button>
              )}
            </div>
          )}
        </Popover>

        <Popover
          label="Priorität"
          disabled={!canEdit}
          trigger={(
            <span
              className="tsk-chip tsk-chip--prio"
              style={{ ['--tsk-prio' as string]: PRIORITY_DE[(task.priority ?? '') as keyof typeof PRIORITY_DE]?.color ?? 'var(--dec-soft)' }}
            >
              <Flag size={13} weight={task.priority ? 'fill' : 'regular'} />
            </span>
          )}
        >
          {(close) => (
            <div className="tsk-pop-list" role="menu">
              <p className="tsk-pop-label">Priorität</p>
              {TASK_PRIORITIES.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  role="menuitem"
                  className={`tsk-pop-item${task.priority === priority ? ' on' : ''}`}
                  onClick={() => { onPriority(priority); close() }}
                >
                  <span className="tsk-pop-dot" style={{ background: PRIORITY_DE[priority].color }} aria-hidden />
                  {PRIORITY_DE[priority].label}
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                className={`tsk-pop-item${!task.priority ? ' on' : ''}`}
                onClick={() => { onPriority(null); close() }}
              >
                Keine Priorität
              </button>
            </div>
          )}
        </Popover>

        {primary && (
          <button
            type="button"
            className="tsk-row-primary"
            disabled={busy}
            onClick={(event) => { event.stopPropagation(); onAction(primary) }}
            title={TASK_ACTIONS[primary].consequence}
          >
            {busy ? <CircleNotch size={13} weight="bold" className="tsk-spin" /> : null}
            {TASK_ACTIONS[primary].label}
            {!busy && <ArrowRight size={12} weight="bold" />}
          </button>
        )}

        <TaskActionMenu
          flow={flow}
          role={role}
          busy={busy}
          hidden={primary ? [primary] : []}
          onAction={onAction}
          extra={canDelete ? [{ id: 'delete', label: 'Endgültig löschen', tone: 'danger', onSelect: onDelete }] : []}
        />
      </div>
    </div>
  )
}

/** Small anchored popover — used for the inline meta editors. */
function Popover({
  trigger, children, label, disabled,
}: {
  trigger: ReactNode
  children: (close: () => void) => ReactNode
  label: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false) }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  if (disabled) {
    return <span className="tsk-pop-wrap is-static" title={label}>{trigger}</span>
  }

  return (
    <div className="tsk-pop-wrap" ref={wrapRef}>
      <button
        type="button"
        className="tsk-pop-trigger"
        aria-label={label}
        title={label}
        aria-expanded={open}
        onClick={(event) => { event.stopPropagation(); setOpen((value) => !value) }}
      >
        {trigger}
      </button>
      {open && (
        <div className="tsk-pop" onClick={(event) => event.stopPropagation()}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export default memo(TaskListRow)
