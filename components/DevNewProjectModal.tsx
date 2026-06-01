'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, X } from '@phosphor-icons/react'

type WorkType = 'software' | 'design' | 'marketing' | 'general'

const WORK_TYPES: { id: WorkType; label: string }[] = [
  { id: 'software', label: 'Software' },
  { id: 'design', label: 'Design' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'general', label: 'Allgemein' },
]

type CreatedProject = { id: string; title: string }

/**
 * Two-step dev flow:
 *   1. "form"   — name + work type → POST /api/dev/projects/create
 *   2. "invite" — auto-generates a link-first client invite for the new
 *                 project so the dev can hand it over immediately.
 *
 * Keeps the dev→client loop a single, calm gesture: anlegen → Kunde einladen.
 */
export default function DevNewProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: (project: CreatedProject) => void
}) {
  const [step, setStep] = useState<'form' | 'invite'>('form')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [workType, setWorkType] = useState<WorkType>('software')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<CreatedProject | null>(null)
  const [inviteLink, setInviteLink] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const titleRef = useRef<HTMLInputElement | null>(null)

  // Reset + focus whenever the modal opens.
  useEffect(() => {
    if (!open) return
    setStep('form'); setTitle(''); setDescription(''); setWorkType('software')
    setSubmitting(false); setError(''); setCreated(null); setInviteLink(''); setCopied(false)
    const t = setTimeout(() => titleRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function createProject() {
    if (submitting || !title.trim()) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/dev/projects/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), workType }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Projekt konnte nicht erstellt werden.'); return }
      const project = data.project as CreatedProject
      setCreated(project)
      onCreated?.(project)
      setStep('invite')
      void generateLink(project.id)
    } finally {
      setSubmitting(false)
    }
  }

  async function generateLink(projectId: string) {
    setLinkLoading(true); setError('')
    try {
      const res = await fetch('/api/invites/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'client', projectId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) { setError(data.error || 'Einladungslink fehlgeschlagen.'); return }
      setInviteLink(data.url)
    } finally {
      setLinkLoading(false)
    }
  }

  async function copyLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard blocked — user can select manually */ }
  }

  return (
    <div className="np-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="np-card" onMouseDown={(e) => e.stopPropagation()}>
        <button className="np-close" onClick={onClose} aria-label="Schließen"><X size={17} /></button>

        {step === 'form' ? (
          <>
            <p className="np-kicker">Dev · neues Projekt</p>
            <h2 className="np-title">Projekt anlegen.</h2>
            <p className="np-sub">Leg ein Projekt an und lade direkt im Anschluss deinen Kunden per Link ein.</p>

            <label className="np-label" htmlFor="np-title">Projektname</label>
            <input
              id="np-title"
              ref={titleRef}
              className="np-input"
              value={title}
              maxLength={160}
              placeholder="z.B. Relaunch Onlineshop"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) createProject() }}
            />

            <label className="np-label" htmlFor="np-desc">Kurzbeschreibung <span>optional</span></label>
            <textarea
              id="np-desc"
              className="np-textarea"
              value={description}
              placeholder="Worum geht es grob? Der Kunde verfeinert das später in seinem Brief."
              onChange={(e) => setDescription(e.target.value)}
            />

            <label className="np-label">Art der Arbeit</label>
            <div className="np-types">
              {WORK_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={workType === t.id ? 'on' : ''}
                  onClick={() => setWorkType(t.id)}
                >{t.label}</button>
              ))}
            </div>

            {error && <p className="np-error">{error}</p>}

            <div className="np-actions">
              <button className="np-ghost" onClick={onClose}>Abbrechen</button>
              <button className="dev-primary-btn" onClick={createProject} disabled={!title.trim() || submitting}>
                {submitting ? 'Lege an…' : <>Projekt anlegen <ArrowRight size={14} /></>}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="np-kicker">Projekt steht</p>
            <h2 className="np-title">„{created?.title}" ist angelegt.</h2>
            <p className="np-sub">Teile diesen Link mit deinem Kunden. Er erstellt sein eigenes Konto und sieht das Projekt sofort — dann postet er seinen Brief.</p>

            <label className="np-label">Einladungslink für den Kunden</label>
            <div className="np-linkrow">
              <input className="np-input np-linkinput" readOnly value={linkLoading ? 'Link wird erzeugt…' : inviteLink} onFocus={(e) => e.currentTarget.select()} />
              <button className="np-copy" onClick={copyLink} disabled={!inviteLink}>
                {copied ? <><Check size={14} /> Kopiert</> : <><Copy size={14} /> Kopieren</>}
              </button>
            </div>

            {error && <p className="np-error">{error}</p>}

            <div className="np-actions">
              <button className="dev-primary-btn np-full" onClick={onClose}>Fertig</button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .np-overlay {
          position: fixed; inset: 0; z-index: 1200;
          background: rgba(7,9,11,.58);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          display: flex; align-items: center; justify-content: center;
          padding: 24px; animation: npFade .14s ease both;
        }
        .np-card {
          position: relative;
          width: min(480px, calc(100vw - 32px));
          background: var(--card); border: 1px solid var(--border);
          border-radius: 20px; padding: 26px 24px 22px;
          box-shadow: 0 28px 72px -20px rgba(0,0,0,.45);
          animation: npPop .26s cubic-bezier(.16,1,.3,1) both;
        }
        .np-close {
          position: absolute; top: 14px; right: 14px;
          width: 30px; height: 30px; border-radius: 9px;
          border: 0; background: transparent; color: var(--text-muted); cursor: pointer;
          display: grid; place-items: center; transition: background .14s, color .14s;
        }
        .np-close:hover { background: var(--surface-2); color: var(--text); }
        .np-kicker { margin: 0; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
        .np-title { margin: 8px 0 6px; font-size: 21px; font-weight: 500; letter-spacing: -.01em; color: var(--text); line-height: 1.2; }
        .np-sub { margin: 0 0 18px; font-size: 13px; line-height: 1.55; color: var(--text-secondary); }
        .np-label { display: block; margin: 0 0 6px; font-size: 12px; font-weight: 600; letter-spacing: .01em; color: var(--text-secondary); }
        .np-label span { color: var(--text-muted); font-weight: 500; }
        .np-input, .np-textarea {
          width: 100%; box-sizing: border-box;
          background: var(--inp, var(--surface-2)); border: 1px solid var(--border);
          border-radius: 12px; padding: 11px 13px; color: var(--text);
          font: inherit; font-size: 13.5px; outline: 0; margin-bottom: 16px;
          transition: border-color .14s, box-shadow .14s;
        }
        .np-input:focus, .np-textarea:focus { border-color: var(--border-strong); box-shadow: 0 0 0 3px var(--accent-soft, rgba(106,115,140,.14)); }
        .np-textarea { min-height: 78px; resize: vertical; line-height: 1.5; }
        .np-types { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 18px; }
        .np-types button {
          height: 32px; padding: 0 13px; border-radius: 999px;
          border: 1px solid var(--border); background: transparent; color: var(--text-muted);
          font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
          transition: background .14s, color .14s, border-color .14s;
        }
        .np-types button.on { background: var(--surface-2); color: var(--text); border-color: var(--border-strong); }
        .np-types button:hover:not(.on) { color: var(--text-secondary); }
        .np-linkrow { display: flex; gap: 8px; align-items: stretch; margin-bottom: 16px; }
        .np-linkinput { margin-bottom: 0; flex: 1; font-size: 12.5px; color: var(--text-secondary); }
        .np-copy {
          flex-shrink: 0; height: auto; padding: 0 14px; border-radius: 12px;
          border: 1px solid var(--border); background: var(--surface-2); color: var(--text);
          font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          transition: background .14s, border-color .14s;
        }
        .np-copy:hover:not(:disabled) { border-color: var(--border-strong); }
        .np-copy:disabled { opacity: .5; cursor: not-allowed; }
        .np-error { margin: 0 0 14px; font-size: 12.5px; color: var(--red, #e06666); font-weight: 500; }
        .np-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
        .np-ghost {
          height: 34px; padding: 0 15px; border-radius: 10px;
          border: 1px solid var(--border); background: transparent; color: var(--text-secondary);
          font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background .14s, color .14s;
        }
        .np-ghost:hover { background: var(--surface-2); color: var(--text); }
        .np-full { width: 100%; }
        :global(.np-card .dev-primary-btn) { padding: 0 16px; }
        @keyframes npFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes npPop { from { opacity: 0; transform: translateY(12px) scale(.98) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  )
}
