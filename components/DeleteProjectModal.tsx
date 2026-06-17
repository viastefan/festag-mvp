'use client'

import { useEffect, useState } from 'react'
import { Warning, Lock, Trash } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'

type DeletionState = {
  state:              'free' | 'warn' | 'locked' | 'not_found' | 'already_deleted'
  reason:             string
  paid_count:         number
  task_count:         number
  has_paid_milestone: boolean
}

interface Props {
  open:        boolean
  projectId:   string | null
  projectTitle: string
  onClose:     () => void
  onDeleted:   () => void
}

/**
 * Lösch-Dialog. Verwendet das shared Modal-Primitive für einheitliche
 * Skalierung, Animation, Backdrop, ESC, etc.
 *
 * 3 Zustände:
 *   - free:   Direkt löschen
 *   - warn:   Projektname tippen + Enter
 *   - locked: Support-Hinweis (paid milestone reached)
 */
export default function DeleteProjectModal({
  open, projectId, projectTitle, onClose, onDeleted,
}: Props) {
  const [state,   setState]   = useState<DeletionState | null>(null)
  const [confirm, setConfirm] = useState('')
  const [working, setWorking] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open || !projectId) return
    setState(null); setConfirm(''); setError(null)
    fetch(`/api/projects/delete?id=${encodeURIComponent(projectId)}`)
      .then(r => r.json())
      .then(d => setState(d?.state ?? null))
      .catch(() => setError('Konnte Projekt-Status nicht laden.'))
  }, [open, projectId])

  async function doDelete() {
    if (!projectId || working) return
    if (state?.state === 'warn' && confirm.trim().toLowerCase() !== projectTitle.trim().toLowerCase()) {
      setError('Bitte den Projektnamen exakt eingeben.')
      return
    }
    setWorking(true); setError(null)
    try {
      const res = await fetch('/api/projects/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, confirmation: state?.state === 'warn' ? confirm : null }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.reason ?? data.error ?? 'Löschen fehlgeschlagen.')
      } else {
        onDeleted()
      }
    } catch (e: any) {
      setError(e?.message ?? 'Netzwerkfehler.')
    }
    setWorking(false)
  }

  function openSupport() {
    window.dispatchEvent(new CustomEvent('open-support', {
      detail: { topic: 'project-deletion', projectId, projectTitle },
    }))
    onClose()
  }

  const title = state?.state === 'locked' ? 'Löschen gesperrt'
              : state?.state === 'warn'   ? 'Projekt löschen?'
              : 'Projekt löschen'

  const Icon = state?.state === 'locked' ? Lock
             : state?.state === 'warn'   ? Warning
             : Trash
  const iconBg = state?.state === 'locked' ? 'rgba(234,179,8,0.12)'
               : state?.state === 'warn'   ? 'rgba(220,70,70,0.10)'
               : 'var(--surface-2)'
  const iconColor = state?.state === 'locked' ? '#eab308'
                  : state?.state === 'warn'   ? 'var(--red,#D14343)'
                  : 'var(--text-muted)'

  const canDelete = state?.state === 'free' ||
    (state?.state === 'warn' && confirm.trim().toLowerCase() === projectTitle.trim().toLowerCase())

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      bare
      footer={
        <>
          <ModalButton variant="ghost" onClick={onClose}>Abbrechen</ModalButton>
          {state?.state === 'locked' ? (
            <ModalButton variant="primary" onClick={openSupport}>Support kontaktieren</ModalButton>
          ) : state ? (
            <ModalButton variant="danger" onClick={doDelete} disabled={!canDelete} loading={working}>
              {working ? 'Lösche…' : 'Endgültig löschen'}
            </ModalButton>
          ) : null}
        </>
      }
    >
      {/* Header inline (bare-mode) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} weight={state?.state === 'warn' || state?.state === 'locked' ? 'bold' : 'regular'} color={iconColor}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-.2px', color: 'var(--text)' }}>
            {title}
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectTitle}
          </p>
        </div>
      </div>

      {!state && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <span style={{ width: 12, height: 12, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block', opacity: .7 }}/>
          Lade Projekt-Status…
        </div>
      )}

      {state?.state === 'free' && (
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
          Das Projekt wurde noch nicht gestartet. Es wird sofort gelöscht.
        </p>
      )}

      {state?.state === 'warn' && (
        <>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 14px' }}>
            Das Projekt enthält {state.task_count} Task{state.task_count === 1 ? '' : 's'}.
            Tasks und Verlauf werden mitgelöscht.
          </p>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Zur Bestätigung Projektnamen eingeben
          </p>
          <input
            autoFocus
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doDelete() } }}
            placeholder={projectTitle}
            style={{
              width: '100%', padding: '10px 13px',
              background: 'var(--bg)',
              border: '1.5px solid var(--border)',
              borderRadius: 10, fontSize: 14, color: 'var(--text)',
              outline: 'none', fontFamily: 'inherit', fontWeight: 500,
              boxSizing: 'border-box',
              transition: 'border-color .15s cubic-bezier(.16,1,.3,1)',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </>
      )}

      {state?.state === 'locked' && (
        <>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>
            Mindestens ein Meilenstein wurde bezahlt ({state.paid_count}×).
            Aus Sicherheitsgründen kann das Projekt nicht selbst gelöscht werden.
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
            Bitte kontaktiere den Festag Support — wir prüfen die Löschung manuell und kümmern uns um eine
            etwaige Erstattung gemäß deinem Vertrag.
          </p>
        </>
      )}

      {error && (
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          background: 'rgba(220,70,70,0.08)',
          border: '1px solid rgba(220,70,70,.2)',
          borderRadius: 10, fontSize: 12.5, color: 'var(--red,#D14343)',
          lineHeight: 1.5,
        }}>{error}</div>
      )}
    </Modal>
  )
}
