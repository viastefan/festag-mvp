'use client'

/**
 * InviteLinkModal — Link-first Einladung (kein PIN, keine Pflicht-Mail).
 *
 * Der Host wählt:
 *   • Art:     Mitwirkende (Projektzugang) ODER Kunde (Client-Panel, nur Agency)
 *   • Projekt: optional — das Projekt ist nach dem Beitritt sofort sichtbar
 * und bekommt einen Link zum Kopieren. Der Eingeladene erstellt darüber sein
 * EIGENES Konto (eigenes Onboarding) — kein Workspace-Zwang.
 */

import { useState } from 'react'
import { Copy, Check, LinkSimple, UsersThree, Briefcase } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'

type Kind = 'contributor' | 'client'
type ProjectStub = { id: string; title: string; color?: string | null }

export default function InviteLinkModal({
  open,
  onClose,
  allowClient = false,
  defaultKind = 'contributor',
  defaultProjectId = null,
  projects = [],
}: {
  open: boolean
  onClose: () => void
  allowClient?: boolean
  defaultKind?: Kind
  defaultProjectId?: string | null
  projects?: ProjectStub[]
}) {
  const [kind, setKind] = useState<Kind>(allowClient ? defaultKind : 'contributor')
  const [projectId, setProjectId] = useState<string | ''>(defaultProjectId || '')
  const [creating, setCreating] = useState(false)
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function createLink() {
    setError(''); setCreating(true)
    try {
      const res = await fetch('/api/invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, projectId: projectId || null }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error === 'forbidden'
          ? 'Du kannst nur für eigene Projekte einladen.'
          : 'Link konnte nicht erstellt werden.')
        return
      }
      setLink(data.url)
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setCreating(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  function reset() { setLink(''); setCopied(false); setError('') }

  const kindCopy = kind === 'client'
    ? 'Kunden sehen ruhige, geprüfte Statusberichte und Entscheidungen — keine Roh-Arbeit.'
    : 'Mitwirkende bekommen Projektzugang im Execution Panel und ihre Aufgaben.'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Per Link einladen"
      subtitle="Erstelle einen Beitritts-Link und teile ihn selbst — kein PIN, keine Pflicht-Mail."
      footer={
        link ? (
          <>
            <ModalButton variant="ghost" onClick={reset}>Neuer Link</ModalButton>
            <ModalButton variant="primary" onClick={onClose}>Fertig</ModalButton>
          </>
        ) : (
          <>
            <ModalButton variant="secondary" onClick={onClose}>Abbrechen</ModalButton>
            <ModalButton variant="primary" onClick={createLink} loading={creating}>
              Link erstellen
            </ModalButton>
          </>
        )
      }
    >
      <style>{CSS}</style>

      {!link && (
        <>
          {allowClient && (
            <div className="ilm-seg" role="radiogroup" aria-label="Art der Einladung">
              <button
                type="button"
                className={`ilm-seg-btn${kind === 'contributor' ? ' is-on' : ''}`}
                onClick={() => setKind('contributor')}
                role="radio" aria-checked={kind === 'contributor'}
              >
                <UsersThree size={16} weight="regular" />
                <span><span className="ilm-seg-title">Mitwirkende</span><span className="ilm-seg-sub">Projektzugang</span></span>
              </button>
              <button
                type="button"
                className={`ilm-seg-btn${kind === 'client' ? ' is-on' : ''}`}
                onClick={() => setKind('client')}
                role="radio" aria-checked={kind === 'client'}
              >
                <Briefcase size={16} weight="regular" />
                <span><span className="ilm-seg-title">Kunde</span><span className="ilm-seg-sub">Client-Panel</span></span>
              </button>
            </div>
          )}

          <p className="ilm-explain">{kindCopy}</p>

          <label className="ilm-field">
            <span className="ilm-label">Projekt {projects.length === 0 ? '' : '(optional)'}</span>
            <div className="ilm-select-wrap">
              <select
                className="ilm-input"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Kein bestimmtes Projekt</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <span className="ilm-hint">Das gewählte Projekt ist nach dem Beitritt sofort sichtbar.</span>
          </label>

          {error && <p className="ilm-error">{error}</p>}
        </>
      )}

      {link && (
        <div className="ilm-result">
          <div className="ilm-result-mark"><LinkSimple size={16} weight="regular" /></div>
          <p className="ilm-result-title">Link ist bereit</p>
          <p className="ilm-result-sub">Teile ihn mit der Person — sie erstellt darüber ihr eigenes Konto und tritt bei.</p>
          <div className="ilm-link-row">
            <input className="ilm-link-input" readOnly value={link} onFocus={e => e.currentTarget.select()} />
            <button type="button" className="ilm-copy" onClick={copy}>
              {copied ? <><Check size={14} weight="bold" /> Kopiert</> : <><Copy size={14} /> Kopieren</>}
            </button>
          </div>
          <p className="ilm-hint">Der Link ist 30 Tage gültig.</p>
        </div>
      )}
    </Modal>
  )
}

const CSS = `
  .ilm-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
  .ilm-seg-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: 11px;
    border: 1px solid transparent;
    background: color-mix(in srgb, var(--surface-2) 50%, transparent);
    color: var(--text); cursor: pointer; text-align: left;
    font-family: inherit; transition: box-shadow .12s, background .12s;
  }
  .ilm-seg-btn:hover { background: color-mix(in srgb, var(--surface-2) 80%, transparent); }
  .ilm-seg-btn.is-on {
    background: var(--surface-2);
    box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--text) 30%, var(--border));
  }
  .ilm-seg-btn span span { display: block; }
  .ilm-seg-title { font-size: 13px; font-weight: 600; color: var(--text); }
  .ilm-seg-sub { font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }

  .ilm-explain { margin: 0 0 16px; font-size: 12.5px; line-height: 1.55; color: var(--text-secondary); }

  .ilm-field { display: flex; flex-direction: column; gap: 6px; }
  .ilm-label { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); }
  .ilm-select-wrap { position: relative; }
  .ilm-input {
    width: 100%; padding: 10px 12px; border-radius: 8px;
    background: var(--bg); border: 1px solid var(--border); color: var(--text);
    font-family: inherit; font-size: 14px; appearance: none;
  }
  .ilm-input:focus { outline: none; border-color: color-mix(in srgb, var(--text) 35%, var(--border)); }
  .ilm-hint { font-size: 11.5px; color: var(--text-muted); line-height: 1.5; margin-top: 6px; }
  .ilm-error {
    margin: 12px 0 0; padding: 9px 11px; border-radius: 8px;
    background: rgba(192,54,46,.08); color: #c0362e; font-size: 12px;
  }

  .ilm-result { display: flex; flex-direction: column; align-items: flex-start; }
  .ilm-result-mark {
    width: 34px; height: 34px; border-radius: 9px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--surface-2); color: var(--text-secondary); margin-bottom: 12px;
  }
  .ilm-result-title { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--text); }
  .ilm-result-sub { margin: 0 0 14px; font-size: 12.5px; line-height: 1.55; color: var(--text-secondary); }
  .ilm-link-row { display: flex; gap: 8px; width: 100%; }
  .ilm-link-input {
    flex: 1; min-width: 0; padding: 10px 12px; border-radius: 8px;
    background: var(--bg); border: 1px solid var(--border); color: var(--text-secondary);
    font-family: inherit; font-size: 12.5px;
  }
  .ilm-copy {
    flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px;
    padding: 0 14px; border-radius: 8px;
    background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
    font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
    transition: background .12s;
  }
  .ilm-copy:hover { background: var(--border); }
`
