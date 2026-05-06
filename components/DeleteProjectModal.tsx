'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Warning, Lock, Trash, X } from '@phosphor-icons/react'

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
 * Lösch-Dialog mit 3 Zuständen:
 *   - free:   Direkt löschen (Confirm-Button)
 *   - warn:   Projektname tippen + Enter
 *   - locked: Support-Hinweis, kein Self-Delete
 */
export default function DeleteProjectModal({ open, projectId, projectTitle, onClose, onDeleted }: Props) {
  const [state,   setState]   = useState<DeletionState | null>(null)
  const [confirm, setConfirm] = useState('')
  const [working, setWorking] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Lifecycle-State holen
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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            style={{
              position:'fixed', inset:0, zIndex:9000,
              background:'rgba(0,0,0,0.55)',
              backdropFilter:'blur(10px) saturate(140%)',
              WebkitBackdropFilter:'blur(10px) saturate(140%)',
            }}
          />
          <div style={{
            position:'fixed', inset:0, zIndex:9001,
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:'24px', pointerEvents:'none',
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit   ={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ type:'spring', stiffness:380, damping:32 }}
              style={{
                pointerEvents:'auto',
                width:'min(460px, 100%)',
                background:'var(--surface)',
                border:'1px solid var(--border-strong)',
                borderRadius: 16,
                boxShadow:'0 28px 80px rgba(0,0,0,0.32)',
                overflow:'hidden',
              }}
            >
              {/* Header */}
              <div style={{ padding:'18px 20px 14px', display:'flex', alignItems:'flex-start', gap: 12, borderBottom:'1px solid var(--border)' }}>
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background: state?.state === 'locked'
                    ? 'rgba(234,179,8,0.12)'
                    : state?.state === 'warn'
                      ? 'rgba(220,70,70,0.10)'
                      : 'var(--surface-2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {state?.state === 'locked'
                    ? <Lock size={16} weight="bold" color="#eab308"/>
                    : state?.state === 'warn'
                      ? <Warning size={16} weight="bold" color="var(--red,#D14343)"/>
                      : <Trash size={16} weight="regular" color="var(--text-muted)"/>}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-.2px', color:'var(--text)' }}>
                    {state?.state === 'locked' ? 'Löschen gesperrt'
                      : state?.state === 'warn' ? 'Projekt löschen?'
                      : 'Projekt löschen'}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {projectTitle}
                  </p>
                </div>
                <button onClick={onClose}
                  style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
                  <X size={12} weight="bold"/>
                </button>
              </div>

              {/* Body */}
              <div style={{ padding:'18px 20px 14px' }}>
                {!state && (
                  <p style={{ fontSize: 13, color:'var(--text-muted)', margin:0 }}>Lade Projekt-Status …</p>
                )}

                {state?.state === 'free' && (
                  <p style={{ fontSize: 13.5, color:'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                    Das Projekt wurde noch nicht gestartet. Es wird ohne weitere Bestätigung gelöscht.
                  </p>
                )}

                {state?.state === 'warn' && (
                  <>
                    <p style={{ fontSize: 13.5, color:'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 14px' }}>
                      Das Projekt ist bereits gestartet ({state.task_count} Task{state.task_count === 1 ? '' : 's'}).
                      Tasks und Verlauf werden mitgelöscht.
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 700, color:'var(--text-muted)', letterSpacing: '.08em', textTransform:'uppercase', margin: '0 0 6px' }}>
                      Zur Bestätigung Projektnamen eingeben
                    </p>
                    <input
                      autoFocus
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doDelete() } }}
                      placeholder={projectTitle}
                      style={{
                        width:'100%', padding:'11px 14px',
                        background:'var(--inp)', border:'1.5px solid var(--inp-border)',
                        borderRadius: 10, fontSize: 14, color:'var(--text)',
                        outline:'none', fontFamily:'inherit', fontWeight: 500,
                      }}
                    />
                  </>
                )}

                {state?.state === 'locked' && (
                  <>
                    <p style={{ fontSize: 13.5, color:'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>
                      Mindestens ein Meilenstein wurde bezahlt ({state.paid_count}× paid).
                      Aus Sicherheitsgründen kann das Projekt nicht selbst gelöscht werden.
                    </p>
                    <p style={{ fontSize: 12.5, color:'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
                      Bitte kontaktiere den Festag Support — wir prüfen die Löschung manuell und kümmern uns um eine
                      etwaige Erstattung gemäß deinem Vertrag.
                    </p>
                  </>
                )}

                {error && (
                  <div style={{
                    marginTop: 12,
                    padding:'10px 14px',
                    background:'rgba(220,70,70,0.08)',
                    border:'1px solid rgba(220,70,70,.2)',
                    borderRadius: 10, fontSize: 12.5, color:'var(--red,#D14343)',
                    lineHeight: 1.5,
                  }}>{error}</div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', gap: 8, justifyContent:'flex-end' }}>
                <button onClick={onClose}
                  style={{ padding:'8px 14px', borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor:'pointer', fontFamily:'inherit' }}>
                  Abbrechen
                </button>

                {state?.state === 'locked' ? (
                  <button onClick={openSupport}
                    style={{ padding:'8px 14px', borderRadius:9, border:'none', background:'var(--btn-prim)', color:'var(--btn-prim-text)', fontSize: 13, fontWeight: 700, cursor:'pointer', fontFamily:'inherit' }}>
                    Support kontaktieren
                  </button>
                ) : state ? (
                  <button onClick={doDelete} disabled={working || (state.state === 'warn' && confirm.trim().toLowerCase() !== projectTitle.trim().toLowerCase())}
                    style={{
                      padding:'8px 14px', borderRadius:9, border:'none',
                      background: 'var(--red,#D14343)', color:'#fff',
                      fontSize: 13, fontWeight: 700, cursor:'pointer', fontFamily:'inherit',
                      opacity: working || (state.state === 'warn' && confirm.trim().toLowerCase() !== projectTitle.trim().toLowerCase()) ? .55 : 1,
                      transition:'opacity .15s',
                      display:'flex', alignItems:'center', gap: 6,
                    }}>
                    {working ? 'Lösche …' : 'Endgültig löschen'}
                    {!working && <span style={{ fontSize: 10, opacity: .7 }}>↵</span>}
                  </button>
                ) : null}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
