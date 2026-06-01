'use client'

/**
 * ProjectContentIntake — the website content "CMS" intake (slice 1+2).
 *
 *  • No intake yet + canManage → template picker (instantiate).
 *  • Intake exists → guided, autosaving form. Every member can fill; the
 *    section status (offen → ausgefüllt) recomputes server-side and a trigger
 *    notifies the dev. canManage additionally gets per-section „Übernommen"
 *    and an „Inhalte kopieren" export.
 *
 * Live: subscribes to cms_sections + cms_values so the dev sees fills appear
 * without a reload (without clobbering whatever the filler is typing).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CMS_TEMPLATES } from '@/lib/cms/templates'
import { CheckCircle, Circle, Sparkle, Copy, Check } from '@phosphor-icons/react'

type Field = { id: string; key: string; label: string; type: string; help?: string | null; required: boolean; ord: number; value: string }
type Section = { id: string; key: string; title: string; description?: string | null; ord: number; status: string; fields: Field[] }

const STATUS_LABEL: Record<string, string> = { offen: 'Offen', ausgefuellt: 'Ausgefüllt', uebernommen: 'Übernommen' }

export default function ProjectContentIntake({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [hasIntake, setHasIntake] = useState(false)
  const [sections, setSections] = useState<Section[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [savedTick, setSavedTick] = useState(false)
  const [copied, setCopied] = useState(false)
  const editingRef = useRef<string | null>(null)
  const timers = useRef<Record<string, any>>({})

  const load = useCallback(async (preserveValues = false) => {
    const res = await fetch(`/api/projects/${projectId}/cms`, { credentials: 'include' })
    const data = await res.json().catch(() => null)
    if (!data) { setLoading(false); return }
    if (!data.cms) { setHasIntake(false); setSections([]); setLoading(false); return }
    setHasIntake(true)
    const secs = (data.sections ?? []) as Section[]
    setSections(secs)
    if (!preserveValues) {
      const v: Record<string, string> = {}
      for (const s of secs) for (const f of s.fields) v[f.id] = typeof f.value === 'string' ? f.value : (f.value ?? '')
      setValues(v)
    } else {
      // refresh only fields the user isn't editing
      setValues(prev => {
        const next = { ...prev }
        for (const s of secs) for (const f of s.fields) {
          if (editingRef.current !== f.id) next[f.id] = typeof f.value === 'string' ? f.value : (f.value ?? '')
        }
        return next
      })
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  // Live updates — dev sees fills / status changes without reload.
  useEffect(() => {
    const ch = (supabase as any)
      .channel(`cms-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cms_sections', filter: `project_id=eq.${projectId}` }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cms_values', filter: `project_id=eq.${projectId}` }, () => load(true))
      .subscribe()
    return () => { try { (supabase as any).removeChannel(ch) } catch {} }
  }, [supabase, projectId, load])

  async function instantiate(templateKey: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/cms`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'instantiate', template_key: templateKey }),
      })
      if (res.ok) await load()
    } finally { setBusy(false) }
  }

  function onFieldChange(fieldId: string, val: string) {
    editingRef.current = fieldId
    setValues(v => ({ ...v, [fieldId]: val }))
    clearTimeout(timers.current[fieldId])
    timers.current[fieldId] = setTimeout(() => saveValue(fieldId, val), 650)
  }

  async function saveValue(fieldId: string, val: string) {
    try {
      await fetch(`/api/projects/${projectId}/cms`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_value', field_id: fieldId, value: val }),
      })
      setSavedTick(true); setTimeout(() => setSavedTick(false), 1400)
      await load(true) // refresh section status, keep local typing
    } catch {}
  }

  async function setSectionStatus(sectionId: string, status: string) {
    await fetch(`/api/projects/${projectId}/cms`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_section', section_id: sectionId, status }),
    })
    load(true)
  }

  function exportMarkdown() {
    const lines: string[] = []
    for (const s of sections) {
      lines.push(`## ${s.title}`)
      for (const f of s.fields) {
        const v = (values[f.id] ?? '').trim()
        lines.push(`**${f.label}:** ${v || '—'}`)
      }
      lines.push('')
    }
    const text = lines.join('\n')
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }).catch(() => {})
  }

  const progress = useMemo(() => {
    if (!sections.length) return 0
    const done = sections.filter(s => s.status === 'ausgefuellt' || s.status === 'uebernommen').length
    return Math.round((done / sections.length) * 100)
  }, [sections])

  if (loading) return <div className="pci-load">Inhalte werden geladen…</div>

  if (!hasIntake) {
    if (!canManage) {
      return (
        <div className="pci-empty">
          <Sparkle size={22} weight="fill" />
          <p className="pci-empty-title">Noch keine Inhalte angefragt</p>
          <p className="pci-empty-sub">Sobald dein Projektteam das Inhalts-Intake einrichtet, kannst du hier die Texte und Bilder deiner Website bequem eintragen.</p>
          <style jsx>{CSS}</style>
        </div>
      )
    }
    return (
      <div className="pci">
        <div className="pci-head">
          <h2>Website-Inhalte einrichten</h2>
          <p>Wähle eine Vorlage. Dein Kunde füllt danach geführt aus — du wirst bei jedem ausgefüllten Bereich benachrichtigt.</p>
        </div>
        <div className="pci-templates">
          {CMS_TEMPLATES.map(t => (
            <button key={t.key} type="button" className="pci-template" onClick={() => instantiate(t.key)} disabled={busy}>
              <span className="pci-template-title">{t.title}</span>
              <span className="pci-template-sum">{t.summary}</span>
              <span className="pci-template-meta">{t.sections.length} Bereiche</span>
            </button>
          ))}
        </div>
        <style jsx>{CSS}</style>
      </div>
    )
  }

  return (
    <div className="pci">
      <div className="pci-head">
        <div className="pci-head-row">
          <h2>Website-Inhalte</h2>
          <div className="pci-head-actions">
            <span className={`pci-saved${savedTick ? ' on' : ''}`}><Check size={12} weight="bold" /> Gespeichert</span>
            {canManage && (
              <button type="button" className="pci-export" onClick={exportMarkdown}>
                {copied ? <><Check size={13} weight="bold" /> Kopiert</> : <><Copy size={13} /> Inhalte kopieren</>}
              </button>
            )}
          </div>
        </div>
        <div className="pci-progress"><span style={{ width: `${progress}%` }} /></div>
        <p className="pci-progress-label">{sections.filter(s => s.status !== 'offen').length} von {sections.length} Bereichen ausgefüllt</p>
      </div>

      <div className="pci-sections">
        {sections.map(s => (
          <section key={s.id} className="pci-section">
            <header className="pci-section-head">
              <div className="pci-section-title">
                {s.status === 'offen' ? <Circle size={15} /> : <CheckCircle size={15} weight="fill" />}
                <span>{s.title}</span>
              </div>
              <div className="pci-section-right">
                <span className={`pci-badge tone-${s.status}`}>{STATUS_LABEL[s.status] ?? s.status}</span>
                {canManage && s.status === 'ausgefuellt' && (
                  <button type="button" className="pci-mark" onClick={() => setSectionStatus(s.id, 'uebernommen')}>Übernommen</button>
                )}
                {canManage && s.status === 'uebernommen' && (
                  <button type="button" className="pci-mark ghost" onClick={() => setSectionStatus(s.id, 'ausgefuellt')}>Zurücksetzen</button>
                )}
              </div>
            </header>
            {s.description && <p className="pci-section-desc">{s.description}</p>}
            <div className="pci-fields">
              {s.fields.map(f => (
                <label key={f.id} className="pci-field">
                  <span className="pci-label">{f.label}{f.required && <i className="pci-req"> *</i>}</span>
                  {f.type === 'longtext' ? (
                    <textarea
                      className="pci-input pci-area"
                      value={values[f.id] ?? ''}
                      placeholder={f.help || ''}
                      onChange={e => onFieldChange(f.id, e.target.value)}
                      onFocus={() => { editingRef.current = f.id }}
                      onBlur={() => { editingRef.current = null }}
                      rows={4}
                    />
                  ) : (
                    <input
                      className="pci-input"
                      type={f.type === 'link' || f.type === 'image' ? 'url' : 'text'}
                      value={values[f.id] ?? ''}
                      placeholder={f.help || (f.type === 'image' ? 'Bild-URL (Upload folgt)' : '')}
                      onChange={e => onFieldChange(f.id, e.target.value)}
                      onFocus={() => { editingRef.current = f.id }}
                      onBlur={() => { editingRef.current = null }}
                    />
                  )}
                  {f.help && <span className="pci-help">{f.help}</span>}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
      <style jsx>{CSS}</style>
    </div>
  )
}

const CSS = `
  .pci-load, .pci-empty { padding: 40px 20px; color: var(--text-muted); font-size: 13px; text-align: center; }
  .pci-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--text-secondary); }
  .pci-empty :global(svg) { color: var(--text-muted); margin-bottom: 6px; }
  .pci-empty-title { margin: 0; font-size: 15px; font-weight: 500; color: var(--text); }
  .pci-empty-sub { margin: 0; max-width: 380px; font-size: 12.5px; line-height: 1.6; }

  .pci { display: flex; flex-direction: column; gap: 16px; }
  .pci-head h2 { margin: 0 0 4px; font-size: 17px; font-weight: 500; letter-spacing: var(--ls-header, .012em); color: var(--text); }
  .pci-head p { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--text-secondary); }
  .pci-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .pci-head-actions { display: flex; align-items: center; gap: 10px; }
  .pci-saved { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: #2bb069; opacity: 0; transition: opacity .2s; }
  .pci-saved.on { opacity: 1; }
  .pci-export { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); font: inherit; font-size: 12px; font-weight: 500; cursor: pointer; }
  .pci-export:hover { background: var(--surface-2); }

  .pci-progress { height: 4px; border-radius: 999px; background: color-mix(in srgb, var(--surface-2) 70%, transparent); overflow: hidden; margin-top: 10px; }
  .pci-progress span { display: block; height: 100%; background: #6a738c; transition: width .3s cubic-bezier(.16,1,.3,1); }
  .pci-progress-label { margin: 6px 0 0; font-size: 11.5px; color: var(--text-muted); }

  .pci-templates { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .pci-template { display: flex; flex-direction: column; gap: 5px; text-align: left; padding: 16px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; font: inherit; transition: border-color .14s, background .14s; }
  .pci-template:hover { border-color: var(--border-strong); background: var(--surface-2); }
  .pci-template-title { font-size: 14px; font-weight: 500; color: var(--text); }
  .pci-template-sum { font-size: 12px; line-height: 1.5; color: var(--text-secondary); }
  .pci-template-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

  .pci-sections { display: flex; flex-direction: column; gap: 12px; }
  .pci-section { border: 1px solid var(--border); border-radius: 14px; background: var(--surface); padding: 16px 18px; }
  .pci-section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .pci-section-title { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 500; color: var(--text); }
  .pci-section-title :global(svg) { color: var(--text-muted); }
  .pci-section-right { display: flex; align-items: center; gap: 8px; }
  .pci-badge { font-size: 10.5px; font-weight: 500; letter-spacing: .04em; padding: 2px 9px; border-radius: 999px; color: var(--text-muted); border: 1px solid var(--border); }
  .pci-badge.tone-ausgefuellt { color: #2bb069; border-color: color-mix(in srgb, #2bb069 40%, var(--border)); }
  .pci-badge.tone-uebernommen { color: #6a738c; border-color: color-mix(in srgb, #6a738c 50%, var(--border)); }
  .pci-mark { height: 26px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); font: inherit; font-size: 11.5px; font-weight: 500; cursor: pointer; }
  .pci-mark:hover { background: var(--border); }
  .pci-mark.ghost { background: transparent; color: var(--text-muted); }
  .pci-section-desc { margin: 8px 0 0; font-size: 12px; line-height: 1.55; color: var(--text-muted); }
  .pci-fields { display: flex; flex-direction: column; gap: 12px; margin-top: 14px; }
  .pci-field { display: flex; flex-direction: column; gap: 5px; }
  .pci-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
  .pci-req { color: #c0362e; font-style: normal; }
  .pci-input { width: 100%; padding: 9px 11px; border-radius: 8px; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-family: inherit; font-size: 13.5px; }
  .pci-input:focus { outline: none; border-color: color-mix(in srgb, var(--text) 35%, var(--border)); }
  .pci-area { resize: vertical; min-height: 84px; line-height: 1.55; }
  .pci-help { font-size: 11px; color: var(--text-muted); line-height: 1.45; }

  @media (max-width: 640px) { .pci-templates { grid-template-columns: 1fr; } }
`
