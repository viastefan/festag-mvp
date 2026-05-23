'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarBlank, Flag, MapPin, Plus, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import TagroLogo from '@/components/TagroLogo'

/**
 * NewProjectModal — Linear-flavored project intake, one calm surface.
 *
 * Single form. Tagro is not a separate mode anymore — it sits as a quiet
 * "Tagro Setup" toggle below the description. When on and the description
 * has substance, submit routes through /api/ai/decompose so Tagro turns the
 * brief into scope + tasks. When off (or empty), we just insert a project
 * row. Either path classifies the project afterwards.
 *
 * Light + dark are first-class: every color resolves through CSS vars.
 */

const COLORS = ['#5B647D', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6']

const STATUSES = [
  { id: 'intake',   label: 'Backlog' },
  { id: 'planning', label: 'In Planung' },
  { id: 'active',   label: 'Aktiv' },
  { id: 'testing',  label: 'Testing' },
] as const

const PRIORITIES = [
  { id: 'none',     label: 'Keine Priorität' },
  { id: 'critical', label: 'Kritisch' },
  { id: 'high',     label: 'Hoch' },
  { id: 'medium',   label: 'Mittel' },
  { id: 'low',      label: 'Niedrig' },
] as const

type StatusId = typeof STATUSES[number]['id']
type PriorityId = typeof PRIORITIES[number]['id']
type Milestone = { title: string; due: string }

interface Props {
  onClose: () => void
  onCreated?: (projectId: string) => void
}

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [status, setStatus] = useState<StatusId>('intake')
  const [priority, setPriority] = useState<PriorityId>('none')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [msInput, setMsInput] = useState('')
  const [showMsInput, setShowMsInput] = useState(false)
  const [useTagro, setUseTagro] = useState(true)
  const [creating, setCreating] = useState(false)
  const [tagroPhase, setTagroPhase] = useState<'' | 'structuring' | 'classifying'>('')
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !creating) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [creating, onClose])

  const canCreate = name.trim().length > 0 && !creating
  // Tagro only kicks in when there's enough substance to decompose —
  // otherwise we'd waste a model call and confuse the user.
  const tagroWillRun = useTagro && description.trim().length >= 12

  async function persistMilestones(projectId: string) {
    const rows = milestones
      .filter(m => m.title.trim())
      .map((m, i) => ({
        project_id: projectId,
        title: m.title.trim(),
        due_date: m.due || null,
        order_index: i,
      }))
    if (!rows.length) return
    await (supabase as any).from('milestones').insert(rows)
  }

  function fireClassify(projectId: string, descForClassify: string) {
    // Fire-and-forget: classifier mutates project_type etc. server-side,
    // never blocks the create flow.
    fetch('/api/projects/classify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: descForClassify, projectId }),
    }).catch(() => {})
  }

  async function handleCreate() {
    if (!canCreate) return
    setError('')
    setCreating(true)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess.session?.user?.id
      if (!userId) throw new Error('Bitte melde dich erneut an.')

      if (tagroWillRun) {
        setTagroPhase('structuring')
        const chatHistory = [
          { role: 'ai', text: 'Lass uns herausfinden, was du wirklich brauchst.' },
          { role: 'user', text: `${name.trim()}\n\n${description.trim()}` },
        ]
        const res = await fetch('/api/ai/decompose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatHistory, userId }),
        })
        const data = await res.json()
        if (!res.ok || !data.projectId) {
          throw new Error(data.error || 'Tagro konnte das Projekt nicht strukturieren.')
        }
        // Backfill the fields decompose doesn't set (color, status, target,
        // summary). Title + scope come from the LLM but we still want the
        // user's chosen status/color/timeline to win.
        await (supabase as any)
          .from('projects')
          .update({
            color,
            status,
            timeline: targetDate || null,
            scope_summary: summary.trim() || null,
          })
          .eq('id', data.projectId)
        await persistMilestones(data.projectId)
        setTagroPhase('classifying')
        fireClassify(data.projectId, `${name.trim()}\n\n${description.trim()}`)
        onCreated?.(data.projectId)
        onClose()
        return
      }

      const { data: inserted, error: insErr } = await (supabase as any)
        .from('projects')
        .insert({
          user_id: userId,
          title: name.trim(),
          description: description.trim() || summary.trim() || null,
          scope_summary: summary.trim() || null,
          status,
          color,
          timeline: targetDate || null,
        })
        .select('id')
        .single()
      if (insErr || !inserted) {
        throw new Error(insErr?.message || 'Projekt konnte nicht gespeichert werden.')
      }
      await persistMilestones(inserted.id)
      fireClassify(
        inserted.id,
        `${name.trim()}\n\n${description.trim() || summary.trim() || ''}`,
      )
      onCreated?.(inserted.id)
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Erstellen fehlgeschlagen.')
    } finally {
      setCreating(false)
      setTagroPhase('')
    }
  }

  function addMilestone() {
    if (!msInput.trim()) return
    setMilestones(m => [...m, { title: msInput.trim(), due: '' }])
    setMsInput('')
    setShowMsInput(false)
  }

  const tagroHint = tagroPhase === 'structuring'
    ? 'Tagro strukturiert dein Projekt in Scope und Aufgaben…'
    : description.trim().length >= 12
      ? 'Tagro strukturiert deine Beschreibung in Scope, Ziele und erste Aufgaben.'
      : 'Schreibe ein paar Sätze, damit Tagro daraus Aufgaben ableiten kann.'

  const ctaLabel = tagroPhase === 'structuring' ? 'Tagro strukturiert…'
    : tagroPhase === 'classifying' ? 'Klassifiziere…'
    : creating ? 'Erstelle…'
    : 'Projekt erstellen'

  return (
    <div
      className="npm-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget && !creating) onClose() }}
    >
      <style>{CSS}</style>

      <div className="npm-shell" onMouseDown={e => e.stopPropagation()}>
        <header className="npm-head">
          <div className="npm-crumbs">
            <span className="npm-crumb-icon">
              <TagroLogo size={18} thinking={!!tagroPhase} />
            </span>
            <span className="npm-crumb-sep">/</span>
            <span className="npm-crumb-current">Neues Projekt</span>
          </div>
          <button
            className="npm-icon-btn"
            onClick={() => { if (!creating) onClose() }}
            aria-label="Schließen"
            type="button"
          >
            <X size={16} />
          </button>
        </header>

        <div className="npm-body">
          <div className="npm-icon-row">
            <button
              type="button"
              className="npm-color"
              style={{ background: color + '22', borderColor: color + '55' }}
              onClick={() => setShowColorPicker(v => !v)}
              aria-label="Projektfarbe wählen"
            >
              <span className="npm-color-dot" style={{ background: color }} />
            </button>
            {showColorPicker && (
              <div className="npm-color-pop">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setColor(c); setShowColorPicker(false) }}
                    style={{
                      background: c,
                      outline: color === c ? '2px solid var(--text)' : 'none',
                      outlineOffset: 2,
                    }}
                    aria-label={`Farbe ${c}`}
                  />
                ))}
              </div>
            )}
          </div>

          <input
            className="npm-title-input"
            placeholder="Projektname"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && canCreate) { e.preventDefault(); handleCreate() }
            }}
            autoFocus
          />
          <input
            className="npm-summary-input"
            placeholder="Kurze Zusammenfassung…"
            value={summary}
            onChange={e => setSummary(e.target.value)}
          />

          <div className="npm-pills">
            <label className="npm-pill">
              <span className="npm-pill-dot" />
              <select value={status} onChange={e => setStatus(e.target.value as StatusId)}>
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="npm-pill">
              <Flag size={12} weight="fill" style={{ opacity: .7 }} />
              <select value={priority} onChange={e => setPriority(e.target.value as PriorityId)}>
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label className="npm-pill">
              <CalendarBlank size={12} />
              <span>{startDate || 'Start'}</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </label>
            <label className="npm-pill">
              <MapPin size={12} />
              <span>{targetDate || 'Zieldatum'}</span>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
              />
            </label>
          </div>

          <div className="npm-divider" />

          <textarea
            className="npm-desc"
            placeholder="Beschreibe dein Projekt, einen Brief oder sammle Ideen…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={6}
          />

          <div
            className={`npm-tagro-strip${tagroWillRun ? ' on' : ''}`}
            onClick={() => setUseTagro(v => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setUseTagro(v => !v)
              }
            }}
            aria-pressed={useTagro}
          >
            <TagroLogo size={20} thinking={tagroPhase === 'structuring'} />
            <div className="npm-tagro-text">
              <strong>Tagro Setup</strong>
              <span>{tagroHint}</span>
            </div>
            <span
              className={`npm-switch${useTagro ? ' on' : ''}`}
              aria-hidden="true"
            />
          </div>

          <div className="npm-ms-card">
            <div className="npm-ms-head">
              <span>Milestones</span>
              <button
                type="button"
                onClick={() => setShowMsInput(v => !v)}
                className="npm-ms-add"
                aria-label="Milestone hinzufügen"
              >
                <Plus size={13} />
              </button>
            </div>
            {milestones.map((m, i) => (
              <div key={i} className="npm-ms-row">
                <span className="npm-ms-dot" style={{ background: color }} />
                <span className="npm-ms-title">{m.title}</span>
                <input
                  type="date"
                  value={m.due}
                  onChange={e => setMilestones(arr => arr.map((it, j) => j === i ? { ...it, due: e.target.value } : it))}
                  className="npm-ms-date"
                />
                <button
                  type="button"
                  onClick={() => setMilestones(arr => arr.filter((_, j) => j !== i))}
                  aria-label="Entfernen"
                  className="npm-ms-del"
                >×</button>
              </div>
            ))}
            {showMsInput && (
              <div className="npm-ms-input-row">
                <input
                  autoFocus
                  className="npm-ms-input"
                  placeholder="Milestone-Name…"
                  value={msInput}
                  onChange={e => setMsInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); addMilestone() }
                    if (e.key === 'Escape') setShowMsInput(false)
                  }}
                />
                <button type="button" onClick={addMilestone} className="npm-ms-confirm">
                  Hinzufügen
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="npm-foot">
          {error && <span className="npm-error">{error}</span>}
          <button
            type="button"
            className="npm-ghost"
            onClick={() => { if (!creating) onClose() }}
            disabled={creating}
          >Abbrechen</button>
          <button
            type="button"
            className="npm-cta"
            onClick={handleCreate}
            disabled={!canCreate}
            style={{ background: canCreate ? color : undefined }}
          >{ctaLabel}</button>
        </footer>
      </div>
    </div>
  )
}

const CSS = `
  .npm-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(8,10,14,.5);
    backdrop-filter: blur(10px) saturate(120%);
    -webkit-backdrop-filter: blur(10px) saturate(120%);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: npmFadeIn .14s ease both;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .npm-shell {
    width: min(720px, calc(100vw - 40px));
    max-height: min(820px, calc(100dvh - 48px));
    background: var(--card);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 22px;
    box-shadow: 0 28px 72px -20px var(--glow), 0 1px 2px rgba(0,0,0,.06);
    display: flex; flex-direction: column;
    overflow: hidden;
    animation: npmPop .26s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes npmFadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes npmPop { from { opacity: 0; transform: translateY(12px) scale(.99) } to { opacity: 1; transform: none } }

  .npm-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .npm-crumbs { display: flex; align-items: center; gap: 10px; min-width: 0; font-size: 13px; }
  .npm-crumb-icon {
    width: 28px; height: 28px; border-radius: 8px;
    background: var(--surface-2);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted);
  }
  .npm-crumb-sep { color: var(--text-muted); opacity: .5; }
  .npm-crumb-current {
    color: var(--text-secondary); font-weight: 500; letter-spacing: .015em;
  }
  .npm-icon-btn {
    width: 30px; height: 30px; border: 0; background: transparent; cursor: pointer;
    color: var(--text-muted); border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .npm-icon-btn:hover { background: var(--surface-2); color: var(--text); }

  .npm-body { padding: 22px 26px 18px; overflow-y: auto; flex: 1 1 auto; }

  .npm-icon-row { position: relative; margin-bottom: 12px; }
  .npm-color {
    width: 36px; height: 36px; border-radius: 10px;
    border: 1.5px solid; background: transparent;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
  }
  .npm-color-dot { width: 14px; height: 14px; border-radius: 4px; display: block; }
  .npm-color-pop {
    position: absolute; top: 42px; left: 0; z-index: 5;
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;
    padding: 10px; border-radius: 12px;
    background: var(--card); border: 1px solid var(--border);
    box-shadow: 0 12px 32px -8px var(--glow);
  }
  .npm-color-pop button {
    width: 22px; height: 22px; border-radius: 6px; border: 0; cursor: pointer;
  }

  .npm-title-input {
    display: block; width: 100%;
    border: 0; outline: 0; background: transparent;
    font-family: inherit; color: var(--text);
    font-size: 26px; font-weight: 500; letter-spacing: -.005em;
    padding: 0; margin: 0 0 6px;
  }
  .npm-title-input::placeholder { color: var(--text-muted); opacity: .55; }
  .npm-summary-input {
    display: block; width: 100%;
    border: 0; outline: 0; background: transparent;
    font-family: inherit; color: var(--text-secondary);
    font-size: 14px; font-weight: 500; letter-spacing: .015em;
    padding: 0; margin: 0 0 18px;
  }
  .npm-summary-input::placeholder { color: var(--text-muted); opacity: .55; }

  .npm-pills {
    display: flex; flex-wrap: wrap; gap: 6px;
    margin-bottom: 18px;
  }
  .npm-pill {
    position: relative;
    display: inline-flex; align-items: center; gap: 6px;
    height: 28px; padding: 0 11px;
    border: 1px solid var(--border); border-radius: 999px;
    background: transparent; color: var(--text-secondary);
    font-size: 12px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; white-space: nowrap;
    transition: border-color .12s, color .12s, background .12s;
  }
  .npm-pill:hover {
    background: var(--surface-2);
    color: var(--text);
    border-color: var(--border-strong);
  }
  .npm-pill-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); }
  .npm-pill select {
    border: 0; outline: 0; background: transparent;
    font: inherit; color: inherit; cursor: pointer; padding: 0;
  }
  .npm-pill input[type=date] {
    position: absolute; inset: 0;
    opacity: 0; cursor: pointer;
    color-scheme: light dark;
  }

  .npm-divider { height: 1px; background: var(--border); margin: 4px 0 18px; }

  .npm-desc {
    display: block; width: 100%;
    border: 0; outline: 0; background: transparent; resize: vertical;
    font-family: inherit; color: var(--text);
    font-size: 14px; line-height: 1.6; font-weight: 500; letter-spacing: .015em;
    min-height: 120px; padding: 0; margin: 0 0 18px;
  }
  .npm-desc::placeholder { color: var(--text-muted); opacity: .55; }

  .npm-tagro-strip {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 14px;
    border-radius: 14px; border: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface-2) 60%, transparent);
    margin-bottom: 18px; cursor: pointer;
    transition: border-color .12s, background .12s;
  }
  .npm-tagro-strip:hover { border-color: var(--border-strong); }
  .npm-tagro-strip.on { border-color: color-mix(in srgb, var(--accent) 35%, var(--border)); }
  .npm-tagro-text {
    display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; gap: 2px;
  }
  .npm-tagro-text strong {
    font-size: 13px; font-weight: 500; color: var(--text); letter-spacing: -.005em;
  }
  .npm-tagro-text span {
    font-size: 12px; color: var(--text-muted);
    letter-spacing: .015em; line-height: 1.45;
  }
  .npm-switch {
    width: 32px; height: 18px; border-radius: 999px;
    background: var(--surface-2); border: 1px solid var(--border);
    position: relative; flex-shrink: 0;
    transition: background .15s, border-color .15s;
  }
  .npm-switch::after {
    content: ''; position: absolute; left: 2px; top: 50%;
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--text-muted);
    transform: translateY(-50%);
    transition: left .18s cubic-bezier(.16,1,.3,1), background .15s;
  }
  .npm-switch.on { background: var(--btn-prim); border-color: var(--btn-prim); }
  .npm-switch.on::after { left: 16px; background: var(--btn-prim-text); }

  .npm-ms-card {
    border: 1px solid var(--border); border-radius: 14px;
    padding: 12px 14px;
    margin-bottom: 4px;
  }
  .npm-ms-head { display: flex; align-items: center; justify-content: space-between; }
  .npm-ms-head span {
    font-size: 13px; font-weight: 500; color: var(--text); letter-spacing: -.005em;
  }
  .npm-ms-add {
    width: 24px; height: 24px; border: 1px solid var(--border);
    background: transparent; border-radius: 7px;
    color: var(--text-muted); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .npm-ms-add:hover { color: var(--text); border-color: var(--border-strong); }
  .npm-ms-row {
    display: grid; grid-template-columns: 8px 1fr auto 20px;
    align-items: center; gap: 10px; padding: 8px 0;
    border-top: 1px solid var(--border);
    margin-top: 8px;
  }
  .npm-ms-dot { width: 8px; height: 8px; border-radius: 50%; }
  .npm-ms-title { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
  .npm-ms-date {
    border: 0; outline: 0; background: transparent;
    color: var(--text-muted); font: inherit; font-size: 12px;
    color-scheme: light dark;
  }
  .npm-ms-del {
    border: 0; background: transparent; color: var(--text-muted);
    cursor: pointer; font-size: 16px; line-height: 1;
  }
  .npm-ms-del:hover { color: var(--text); }
  .npm-ms-input-row { display: flex; gap: 8px; margin-top: 10px; }
  .npm-ms-input {
    flex: 1 1 auto; height: 32px; padding: 0 10px;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--text); border-radius: 8px; outline: 0;
    font: inherit; font-size: 13px;
  }
  .npm-ms-input:focus { border-color: var(--border-strong); }
  .npm-ms-confirm {
    height: 32px; padding: 0 12px;
    border: 1px solid var(--border); background: var(--surface-2);
    color: var(--text); border-radius: 8px; cursor: pointer;
    font: inherit; font-size: 12px; font-weight: 500;
  }

  .npm-foot {
    display: flex; align-items: center; justify-content: flex-end; gap: 10px;
    padding: 14px 18px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .npm-error {
    margin-right: auto; color: #d53939;
    font-size: 12px; font-weight: 500;
  }
  .npm-ghost {
    height: 34px; padding: 0 14px; border-radius: 10px;
    background: transparent; border: 1px solid var(--border);
    color: var(--text-secondary);
    font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
  }
  .npm-ghost:hover { background: var(--surface-2); color: var(--text); }
  .npm-cta {
    height: 34px; padding: 0 16px; border-radius: 10px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    border: 0; font: inherit; font-size: 13px; font-weight: 500;
    cursor: pointer; letter-spacing: .015em;
    transition: opacity .12s, transform .12s;
  }
  .npm-cta:hover:not(:disabled) { opacity: .92; }
  .npm-cta:active:not(:disabled) { transform: scale(.98); }
  .npm-cta:disabled { opacity: .5; cursor: not-allowed; }

  @media (max-width: 640px) {
    .npm-overlay { padding: 0; align-items: flex-end; }
    .npm-shell {
      width: 100%;
      max-height: calc(100dvh - 24px);
      border-radius: 22px 22px 0 0;
    }
    .npm-body { padding: 20px 18px 14px; }
    .npm-head, .npm-foot { padding-left: 14px; padding-right: 14px; }
    .npm-title-input { font-size: 22px; }
  }
`
