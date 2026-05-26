'use client'

/**
 * /decisions — Festag Entscheidungen.
 *
 * Linear-style flat table (mirrors .task-os DNA) where the client sees
 * every open + recently-decided decision they own. Clicking opens a
 * right-side drawer with the dev's context, Tagro's recommendation
 * (on-demand), and the answer form (option select + free-text note).
 *
 * Data flow: devs POST /api/decisions from their dev panel → DB trigger
 * fans an inbox notification + populates the sidebar badge → client
 * lands here, clicks Tagro, picks an answer → /decide route notifies
 * the dev back.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowsClockwise, CheckCircle, Clock, FunnelSimple, Sparkle, Warning, X,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type Option = { id: string; label: string; hint?: string }

type Decision = {
  id: string
  project_id: string | null
  title: string
  description: string | null
  options_json: Option[]
  recommended_option: string | null
  tagro_reasoning: string | null
  tagro_run_at: string | null
  status: string
  selected_option: string | null
  decision_note: string | null
  urgency: 'low' | 'normal' | 'high' | 'critical'
  due_date: string | null
  source_task_id: string | null
  created_by: string | null
  requested_for: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

type ProjectLite = { id: string; title: string; color?: string | null; status?: string | null }

type Filter = 'open' | 'all' | 'decided' | 'urgent'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open',    label: 'Offen' },
  { id: 'urgent',  label: 'Dringend' },
  { id: 'decided', label: 'Entschieden' },
  { id: 'all',     label: 'Alle' },
]

const URGENCY_LABEL: Record<string, string> = {
  low: 'Niedrig', normal: 'Normal', high: 'Hoch', critical: 'Kritisch',
}
const URGENCY_TONE: Record<string, 'good' | 'amber' | 'red' | 'muted'> = {
  low: 'muted', normal: 'muted', high: 'amber', critical: 'red',
}

const OPEN_STATES = new Set(['open', 'waiting_for_client', 'in_progress'])

function fmtAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} Tag${d === 1 ? '' : 'en'}`
  return new Date(iso).toLocaleDateString('de-DE')
}

function fmtDueIn(due: string | null) {
  if (!due) return null
  const ms = new Date(due).getTime() - Date.now()
  const d = Math.round(ms / (24 * 3600 * 1000))
  if (d < 0) return `${Math.abs(d)} Tag${Math.abs(d) === 1 ? '' : 'e'} überfällig`
  if (d === 0) return 'heute'
  if (d === 1) return 'morgen'
  return `in ${d} Tagen`
}

export default function DecisionsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--text-muted)' }}>Entscheidungen werden geladen…</div>}>
      <DecisionsPageInner />
    </Suspense>
  )
}

function DecisionsPageInner() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()

  const [decisions, setDecisions] = useState<Decision[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('open')
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [me, setMe] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/decisions', { credentials: 'include' })
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setDecisions(data.decisions ?? [])

      // Pull projects in one round-trip
      const projIds = Array.from(new Set((data.decisions ?? []).map((d: Decision) => d.project_id).filter(Boolean)))
      if (projIds.length) {
        const { data: projs } = await (supabase as any).from('projects').select('id,title,color,status').in('id', projIds)
        const map: Record<string, ProjectLite> = {}
        for (const p of (projs as ProjectLite[]) ?? []) map[p.id] = p
        setProjects(map)
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Realtime — pick up new decisions live
  useEffect(() => {
    if (!me) return
    const ch = (supabase as any)
      .channel(`decisions-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decisions' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.requested_for === me || payload.new.created_by === me) {
            setDecisions(curr => curr.some(d => d.id === payload.new.id) ? curr : [payload.new, ...curr])
          }
        } else if (payload.eventType === 'UPDATE') {
          setDecisions(curr => curr.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d))
        }
      })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, me])

  const filtered = useMemo(() => {
    let xs = decisions
    if (filter === 'open')    xs = xs.filter(d => OPEN_STATES.has(d.status))
    if (filter === 'urgent')  xs = xs.filter(d => OPEN_STATES.has(d.status) && (d.urgency === 'high' || d.urgency === 'critical'))
    if (filter === 'decided') xs = xs.filter(d => d.status === 'decided')
    // Sort: open first by urgency, then due_date, then created_at
    const order = (d: Decision) => {
      if (!OPEN_STATES.has(d.status)) return 100
      if (d.urgency === 'critical') return 0
      if (d.urgency === 'high')     return 1
      if (d.urgency === 'normal')   return 2
      return 3
    }
    return [...xs].sort((a, b) => {
      const ord = order(a) - order(b)
      if (ord !== 0) return ord
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity
      if (aDue !== bDue) return aDue - bDue
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [decisions, filter])

  const counts = useMemo(() => ({
    open: decisions.filter(d => OPEN_STATES.has(d.status)).length,
    urgent: decisions.filter(d => OPEN_STATES.has(d.status) && (d.urgency === 'high' || d.urgency === 'critical')).length,
    decided: decisions.filter(d => d.status === 'decided').length,
  }), [decisions])

  const openDecision = openId ? decisions.find(d => d.id === openId) ?? null : null

  function patchLocal(id: string, patch: Partial<Decision>) {
    setDecisions(curr => curr.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  return (
    <div className="dec-os">
      <style jsx>{CSS}</style>

      <div className="dec-static-top">
        <div className="dec-top">
          <div className="dec-top-left">
            <h1 className="dec-title">Entscheidungen</h1>
            <span className="dec-count-pill">
              {loading ? '…' : `${counts.open} offen${counts.urgent > 0 ? ` · ${counts.urgent} dringend` : ''}`}
            </span>
          </div>
          <button className="dec-ghost" type="button" onClick={load} disabled={loading}>
            <ArrowsClockwise size={11} className={loading ? 'dec-spin' : ''} />
            {loading ? 'Lade…' : 'Aktualisieren'}
          </button>
        </div>

        <nav className="dec-tabs" role="tablist">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`dec-tab${filter === f.id ? ' on' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id === 'open' && counts.open > 0 && <span className="dec-tab-count">{counts.open}</span>}
              {f.id === 'urgent' && counts.urgent > 0 && <span className="dec-tab-count">{counts.urgent}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="dec-scroll-body">
        <div className="dec-table-head">
          <span>Entscheidung</span><span>Projekt</span><span>Dringlichkeit</span><span>Frist</span><span>Status</span><span>Erstellt</span>
        </div>

        {loading && filtered.length === 0 ? (
          <p className="dec-empty">Lade Entscheidungen…</p>
        ) : filtered.length === 0 ? (
          <div className="dec-empty">
            <FunnelSimple size={14} />
            <p>Keine Entscheidungen in dieser Ansicht.</p>
            <small>Wenn ein Developer eine Entscheidung anfordert, landet sie hier — du bekommst gleichzeitig Push, Mail oder WhatsApp (wenn aktiviert).</small>
          </div>
        ) : filtered.map(d => {
          const proj = d.project_id ? projects[d.project_id] : null
          const dueIn = fmtDueIn(d.due_date)
          const isOpen = OPEN_STATES.has(d.status)
          const statusLabel = d.status === 'decided' ? 'Entschieden'
            : d.status === 'cancelled' ? 'Abgebrochen'
            : d.status === 'in_progress' ? 'In Arbeit'
            : 'Offen'
          const statusTone = d.status === 'decided' ? 'good' : d.status === 'cancelled' ? 'muted' : isOpen ? 'amber' : 'muted'
          return (
            <button
              key={d.id}
              type="button"
              className={`dec-row${openId === d.id ? ' on' : ''}`}
              onClick={() => setOpenId(d.id)}
            >
              <span className="dec-row-main">
                <strong>{d.title}</strong>
                {d.description && <small>{d.description.slice(0, 140)}</small>}
              </span>
              <span className="dec-row-proj">
                {proj ? (
                  <><span className="dec-row-dot" style={{ background: proj.color || 'var(--text-muted)' }} />{proj.title}</>
                ) : <span className="dec-row-mute">—</span>}
              </span>
              <span className={`dec-pill tone-${URGENCY_TONE[d.urgency] || 'muted'}`}>{URGENCY_LABEL[d.urgency] || 'Normal'}</span>
              <span className="dec-row-mute">
                {dueIn ? <><Clock size={10} /> {dueIn}</> : '—'}
              </span>
              <span className={`dec-pill tone-${statusTone}`}>{statusLabel}</span>
              <span className="dec-row-mute">{fmtAgo(d.created_at)}</span>
            </button>
          )
        })}
      </div>

      {openDecision && (
        <Drawer
          decision={openDecision}
          project={openDecision.project_id ? projects[openDecision.project_id] : null}
          isDecider={openDecision.requested_for === me || (!openDecision.requested_for && openDecision.created_by !== me)}
          onClose={() => setOpenId(null)}
          onPatch={patch => patchLocal(openDecision.id, patch)}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 * Drawer
 * ─────────────────────────────────────────────────────────── */

function Drawer({
  decision, project, isDecider, onClose, onPatch,
}: {
  decision: Decision
  project: ProjectLite | null
  isDecider: boolean
  onClose: () => void
  onPatch: (p: Partial<Decision>) => void
}) {
  const [selected, setSelected] = useState<string>(decision.selected_option || '')
  const [note, setNote] = useState<string>(decision.decision_note || '')
  const [suggesting, setSuggesting] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function runTagro() {
    if (suggesting) return
    setSuggesting(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/suggest`, { method: 'POST', credentials: 'include' })
      if (!res.ok) { setError('Tagro konnte gerade nicht antworten.'); return }
      const data = await res.json()
      onPatch({
        recommended_option: data.recommended_option || null,
        tagro_reasoning: data.reasoning || '',
        tagro_run_at: new Date().toISOString(),
        urgency: data.urgency_hint || decision.urgency,
      } as Partial<Decision>)
    } finally {
      setSuggesting(false)
    }
  }

  async function applyTagro() {
    if (decision.recommended_option && decision.recommended_option !== 'freeform') {
      setSelected(decision.recommended_option)
    }
  }

  async function submitDecision() {
    if (deciding) return
    if (!selected && !note.trim()) { setError('Wähle eine Option oder schreibe eine Antwort.'); return }
    setDeciding(true); setError('')
    try {
      const res = await fetch(`/api/decisions/${decision.id}/decide`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_option: selected || null, decision_note: note.trim() || null }),
      })
      if (!res.ok) { setError('Konnte nicht speichern.'); return }
      const data = await res.json()
      onPatch(data.decision)
      onClose()
    } finally {
      setDeciding(false)
    }
  }

  const options = decision.options_json || []
  const tagroRec = decision.recommended_option
  const isAnswered = decision.status === 'decided'

  return (
    <div className="dec-overlay" role="dialog" aria-modal="true">
      <div className="dec-backdrop" onClick={onClose} />
      <aside className="dec-panel">
        <header className="dec-drawer-head">
          <div className="dec-drawer-meta">
            <span className="dec-kicker">Entscheidung</span>
            <span className="dec-saved">
              {project && <><span className="dec-row-dot" style={{ background: project.color || 'var(--text-muted)' }} /> {project.title} · </>}
              {fmtAgo(decision.updated_at)}
            </span>
          </div>
          <div className="dec-drawer-actions">
            <button className="dec-icon-btn" onClick={onClose} title="Schließen" type="button">
              <X size={13} />
            </button>
          </div>
        </header>

        <div className="dec-drawer-body">
          <h2 className="dec-d-title">{decision.title}</h2>
          {decision.description && <p className="dec-d-desc">{decision.description}</p>}

          <div className="dec-d-meta">
            <span className={`dec-pill tone-${URGENCY_TONE[decision.urgency] || 'muted'}`}>
              Dringlichkeit: {URGENCY_LABEL[decision.urgency] || 'Normal'}
            </span>
            {decision.due_date && (
              <span className="dec-pill tone-muted"><Clock size={10} /> {fmtDueIn(decision.due_date)}</span>
            )}
            {isAnswered && <span className="dec-pill tone-good"><CheckCircle size={10} weight="fill" /> Entschieden</span>}
          </div>

          {/* Tagro suggestion panel */}
          <section className="dec-tagro">
            <header className="dec-tagro-head">
              <div>
                <span className="dec-tagro-kicker"><Sparkle size={11} weight="fill" /> Tagro-Empfehlung</span>
                {decision.tagro_run_at
                  ? <span className="dec-tagro-time">Zuletzt {fmtAgo(decision.tagro_run_at)}</span>
                  : <span className="dec-tagro-time">Noch nicht analysiert</span>}
              </div>
              <button className="dec-tagro-run" type="button" onClick={runTagro} disabled={suggesting}>
                <ArrowsClockwise size={11} className={suggesting ? 'dec-spin' : ''} />
                {suggesting ? 'Tagro liest…' : decision.tagro_run_at ? 'Neu analysieren' : 'Tagro analysieren'}
              </button>
            </header>

            {!decision.tagro_run_at && !suggesting && (
              <p className="dec-tagro-empty">Lass Tagro die Optionen einmal durchgehen — bekommt einen ruhigen Vorschlag mit Begründung.</p>
            )}

            {decision.tagro_reasoning && (
              <div className="dec-tagro-rec">
                {tagroRec && tagroRec !== 'freeform' && (
                  <div className="dec-tagro-pick">
                    <strong>Empfohlene Option:</strong> {options.find(o => o.id === tagroRec)?.label || tagroRec}
                  </div>
                )}
                <p className="dec-tagro-text">{decision.tagro_reasoning}</p>
                {tagroRec && tagroRec !== 'freeform' && !isAnswered && isDecider && (
                  <button type="button" className="dec-tagro-apply" onClick={applyTagro}>
                    Tagros Vorschlag übernehmen
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Answer form */}
          {isDecider && !isAnswered && (
            <section className="dec-answer">
              <p className="dec-answer-label">Deine Antwort</p>

              {options.length > 0 && (
                <div className="dec-options">
                  {options.map(o => (
                    <label key={o.id} className={`dec-option${selected === o.id ? ' on' : ''}${tagroRec === o.id ? ' tagro' : ''}`}>
                      <input
                        type="radio"
                        name="dec-option"
                        value={o.id}
                        checked={selected === o.id}
                        onChange={() => setSelected(o.id)}
                      />
                      <span className="dec-option-body">
                        <strong>{o.label}</strong>
                        {o.hint && <small>{o.hint}</small>}
                      </span>
                      {tagroRec === o.id && <span className="dec-option-tagro"><Sparkle size={10} weight="fill" /> Tagro</span>}
                    </label>
                  ))}
                </div>
              )}

              <textarea
                className="dec-note"
                placeholder={options.length ? 'Optional: zusätzliche Begründung…' : 'Schreib hier deine Antwort…'}
                value={note}
                onChange={e => setNote(e.target.value)}
              />

              {error && <p className="dec-error"><Warning size={11} /> {error}</p>}

              <div className="dec-answer-actions">
                <button type="button" className="dec-primary" onClick={submitDecision} disabled={deciding}>
                  <CheckCircle size={12} weight="bold" />
                  {deciding ? 'Speichere…' : 'Entscheidung absenden'}
                </button>
              </div>
            </section>
          )}

          {isAnswered && (
            <section className="dec-final">
              <p className="dec-answer-label">Getroffene Entscheidung</p>
              {decision.selected_option && decision.selected_option !== 'freeform' && (
                <div className="dec-final-pick">
                  <CheckCircle size={12} weight="fill" />
                  {options.find(o => o.id === decision.selected_option)?.label || decision.selected_option}
                </div>
              )}
              {decision.decision_note && <p className="dec-final-note">{decision.decision_note}</p>}
              <small className="dec-final-meta">{decision.decided_at && `Entschieden ${fmtAgo(decision.decided_at)}`}</small>
            </section>
          )}

          {!isDecider && !isAnswered && (
            <p className="dec-empty" style={{ marginTop: 18 }}>
              Warte auf Antwort des Entscheiders. Du kannst hier nichts beantworten —
              du hast die Entscheidung angefordert.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}

const CSS = `
  /* ───────────────────────────────────────────────────────
   * .dec-os — same flat Festag chrome as /tasks + /teams
   * ─────────────────────────────────────────────────────── */
  .dec-os {
    --dec-soft:#4E5567;
    width:100%; height:100%; min-height:0; color:var(--text);
    padding:20px 0 0; display:flex; flex-direction:column; overflow:hidden;
    letter-spacing:.017em;
    font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
    font-weight:500;
  }
  .dec-os, .dec-os * { font-weight:500; letter-spacing:.017em; }
  [data-theme="dark"] .dec-os, [data-theme="classic-dark"] .dec-os, [data-theme="read"] .dec-os {
    --dec-soft: var(--text-secondary);
  }

  .dec-static-top { flex:0 0 auto; position:relative; z-index:8; }
  .dec-top {
    display:flex; align-items:center; justify-content:space-between;
    gap:12px; min-height:34px; padding:0 18px 12px;
    border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .dec-top-left { display:flex; align-items:center; gap:10px; min-width:0; }
  .dec-title { margin:0; font-size:14.5px; font-weight:500; color:var(--text); }
  .dec-count-pill {
    height:20px; padding:0 8px; border-radius:999px;
    background:color-mix(in srgb, var(--surface-2) 50%, transparent);
    color:var(--dec-soft); font-size:10.5px;
    display:inline-flex; align-items:center;
  }
  .dec-ghost {
    display:inline-flex; align-items:center; gap:5px;
    height:28px; padding:0 11px; border-radius:8px;
    background:transparent; border:0; color:var(--dec-soft);
    font:inherit; font-size:12px; font-weight:500;
    cursor:pointer; transition:background .12s, color .12s;
  }
  .dec-ghost:hover { background:var(--surface-2); color:var(--text); }
  .dec-ghost:disabled { opacity:.5; cursor:not-allowed; }
  .dec-spin { animation:decSpin 1s linear infinite; }
  @keyframes decSpin { from { transform:rotate(0); } to { transform:rotate(360deg); } }

  .dec-tabs {
    display:flex; gap:5px; padding:12px 18px 10px;
    overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none;
  }
  .dec-tabs::-webkit-scrollbar { display:none; }
  .dec-tab {
    display:inline-flex; align-items:center; gap:5px;
    height:27px; padding:0 11px;
    border:1px solid var(--border); border-radius:999px;
    background:transparent; color:var(--dec-soft);
    font:inherit; font-size:11.5px; font-weight:500;
    cursor:pointer; white-space:nowrap; flex-shrink:0;
    transition:background .12s, color .12s;
  }
  .dec-tab:hover { color:var(--text); }
  .dec-tab.on { background:var(--surface-2); color:var(--text); }
  .dec-tab-count {
    display:inline-flex; align-items:center; justify-content:center;
    min-width:15px; height:15px; padding:0 4px; border-radius:999px;
    background:color-mix(in srgb, var(--text) 12%, transparent);
    color:var(--text); font-size:9.5px;
  }

  .dec-scroll-body {
    flex:1 1 auto; min-height:0;
    overflow-y:auto; overflow-x:hidden;
    padding:0 18px 80px; overscroll-behavior:contain;
  }

  .dec-table-head {
    display:grid; gap:14px;
    grid-template-columns:minmax(220px, 1.8fr) minmax(140px, 1fr) 100px 110px 100px 100px;
    padding:14px 8px 9px;
    font-size:10px; letter-spacing:.14em; text-transform:uppercase;
    color:var(--dec-soft);
    border-bottom:1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }

  .dec-row {
    display:grid; gap:14px; align-items:center;
    grid-template-columns:minmax(220px, 1.8fr) minmax(140px, 1fr) 100px 110px 100px 100px;
    padding:11px 8px;
    border:0; border-bottom:1px solid color-mix(in srgb, var(--border) 26%, transparent);
    background:transparent; color:var(--text); font:inherit; font-size:12.5px;
    text-align:left; cursor:pointer; width:100%; transition:background .1s;
  }
  .dec-row:hover { background:color-mix(in srgb, var(--surface-2) 45%, transparent); }
  .dec-row.on { background:color-mix(in srgb, var(--surface-2) 80%, transparent); }
  .dec-row-main { display:flex; flex-direction:column; gap:1px; min-width:0; }
  .dec-row-main strong { font-size:13px; font-weight:500; color:var(--text); }
  .dec-row-main small {
    font-size:11px; color:var(--dec-soft); font-weight:500;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    display:block;
  }
  .dec-row-proj { display:inline-flex; align-items:center; gap:5px; font-size:12px; }
  .dec-row-dot { width:7px; height:7px; border-radius:50%; display:inline-block; }
  .dec-row-mute { color:var(--dec-soft); font-size:11.5px; display:inline-flex; align-items:center; gap:4px; }

  .dec-pill {
    display:inline-flex; align-items:center; gap:4px;
    height:18px; padding:0 8px; border-radius:999px;
    font-size:10px; letter-spacing:.04em; text-transform:uppercase;
    background:color-mix(in srgb, var(--surface-2) 70%, transparent);
    color:var(--text); white-space:nowrap;
  }
  .dec-pill.tone-red    { background:color-mix(in srgb, #ef4444 14%, transparent); color:#ef4444; }
  .dec-pill.tone-amber  { background:color-mix(in srgb, #f59e0b 14%, transparent); color:#f59e0b; }
  .dec-pill.tone-good   { background:color-mix(in srgb, #22c55e 14%, transparent); color:#22c55e; }
  .dec-pill.tone-muted  { background:color-mix(in srgb, var(--surface-2) 70%, transparent); color:var(--dec-soft); }

  .dec-empty {
    padding:38px 6px; color:var(--dec-soft);
    font-size:12.5px; text-align:center;
    display:flex; flex-direction:column; align-items:center; gap:8px;
  }
  .dec-empty svg { color:var(--dec-soft); }
  .dec-empty p { margin:0; }
  .dec-empty small { font-size:11.5px; opacity:.75; max-width:420px; line-height:1.5; }

  /* ── Drawer ─────────────────────────────────────────────── */
  .dec-overlay { position:fixed; inset:0; z-index:1200; display:flex; justify-content:flex-end; }
  .dec-backdrop { flex:1; background:rgba(8,10,14,.42); backdrop-filter:blur(4px); cursor:pointer; }
  .dec-panel {
    width:min(620px, 100vw); height:100%;
    background:var(--bg); color:var(--text);
    border-left:1px solid var(--border);
    display:flex; flex-direction:column;
    box-shadow:-24px 0 64px -20px rgba(0,0,0,.45);
    animation:decIn .22s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes decIn { from { transform:translateX(20px); opacity:0; } to { transform:none; opacity:1; } }

  .dec-drawer-head {
    display:flex; justify-content:space-between; align-items:flex-start;
    padding:18px 22px 10px;
    border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .dec-drawer-meta { display:flex; flex-direction:column; gap:2px; min-width:0; }
  .dec-kicker { font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--dec-soft); }
  .dec-saved { font-size:11px; color:var(--dec-soft); display:inline-flex; align-items:center; gap:4px; }
  .dec-drawer-actions { display:flex; gap:2px; }
  .dec-icon-btn {
    width:28px; height:28px; border:0; background:transparent;
    color:var(--dec-soft); border-radius:7px; cursor:pointer;
    display:inline-flex; align-items:center; justify-content:center;
    transition:background .12s, color .12s;
  }
  .dec-icon-btn:hover { background:var(--surface-2); color:var(--text); }

  .dec-drawer-body {
    flex:1; min-height:0; overflow-y:auto;
    padding:18px 22px 50px;
    display:flex; flex-direction:column; gap:16px;
  }
  .dec-d-title { margin:0; font-size:20px; font-weight:500; color:var(--text); letter-spacing:-.012em; }
  .dec-d-desc { margin:0; font-size:13px; line-height:1.55; color:var(--text); font-weight:500; }
  .dec-d-meta { display:flex; flex-wrap:wrap; gap:6px; }

  .dec-tagro {
    border:1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
    border-radius:14px; padding:14px 16px;
    background:color-mix(in srgb, var(--accent) 4%, transparent);
    display:flex; flex-direction:column; gap:10px;
  }
  .dec-tagro-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
  .dec-tagro-kicker {
    display:inline-flex; align-items:center; gap:5px;
    font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--text);
  }
  .dec-tagro-time { display:block; margin-top:2px; font-size:10.5px; color:var(--dec-soft); }
  .dec-tagro-run {
    display:inline-flex; align-items:center; gap:5px;
    height:26px; padding:0 11px; border-radius:8px;
    background:var(--card); color:var(--text); border:1px solid var(--border);
    font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;
    transition:background .12s; white-space:nowrap;
  }
  .dec-tagro-run:hover:not(:disabled) { background:var(--surface-2); }
  .dec-tagro-run:disabled { opacity:.5; cursor:not-allowed; }
  .dec-tagro-empty { margin:0; font-size:12.5px; color:var(--dec-soft); line-height:1.55; }

  .dec-tagro-rec { display:flex; flex-direction:column; gap:7px; }
  .dec-tagro-pick { font-size:12.5px; color:var(--text); }
  .dec-tagro-pick strong { font-weight:500; color:var(--text); }
  .dec-tagro-text { margin:0; font-size:13px; line-height:1.55; color:var(--text); }
  .dec-tagro-apply {
    align-self:flex-start;
    height:28px; padding:0 12px; border:0; border-radius:8px;
    background:var(--card); color:var(--text); border:1px solid var(--border);
    font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;
  }
  .dec-tagro-apply:hover { background:var(--surface-2); }

  .dec-answer { display:flex; flex-direction:column; gap:9px; }
  .dec-answer-label {
    margin:0; font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--dec-soft);
  }
  .dec-options { display:flex; flex-direction:column; gap:6px; }
  .dec-option {
    display:flex; align-items:flex-start; gap:9px;
    padding:11px 12px; border:1px solid var(--border); border-radius:10px;
    cursor:pointer; transition:border-color .12s, background .12s;
    position:relative;
  }
  .dec-option:hover { border-color:color-mix(in srgb, var(--text) 25%, var(--border)); }
  .dec-option.on { border-color:var(--text); background:color-mix(in srgb, var(--surface-2) 35%, transparent); }
  .dec-option.tagro { border-color:color-mix(in srgb, var(--accent) 45%, var(--border)); }
  .dec-option input { margin-top:3px; flex-shrink:0; }
  .dec-option-body { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; }
  .dec-option-body strong { font-size:13px; color:var(--text); font-weight:500; }
  .dec-option-body small { font-size:11.5px; color:var(--dec-soft); }
  .dec-option-tagro {
    display:inline-flex; align-items:center; gap:3px;
    font-size:10px; letter-spacing:.08em; text-transform:uppercase;
    color:var(--accent); align-self:center;
  }

  .dec-note {
    width:100%; min-height:90px; resize:vertical;
    background:var(--card); border:1px solid var(--border); border-radius:10px;
    padding:10px 12px;
    color:var(--text); font:inherit; font-size:12.5px; font-weight:500; line-height:1.55;
    letter-spacing:.017em; outline:0;
  }
  .dec-note:focus { border-color:color-mix(in srgb, var(--text) 30%, var(--border)); }
  .dec-note::placeholder { color:var(--dec-soft); }

  .dec-answer-actions { display:flex; gap:8px; align-items:center; }
  .dec-primary {
    display:inline-flex; align-items:center; gap:5px;
    height:32px; padding:0 14px; border-radius:999px;
    background:var(--btn-prim); color:var(--btn-prim-text); border:0;
    font:inherit; font-size:12px; font-weight:500; cursor:pointer;
    transition:opacity .12s, transform .12s;
  }
  .dec-primary:hover:not(:disabled) { opacity:.92; }
  .dec-primary:active:not(:disabled) { transform:scale(.97); }
  .dec-primary:disabled { opacity:.4; cursor:not-allowed; }
  .dec-error { margin:0; font-size:12px; color:#ef4444; display:inline-flex; align-items:center; gap:4px; }

  .dec-final {
    border-top:1px solid color-mix(in srgb, var(--border) 50%, transparent);
    padding-top:14px; display:flex; flex-direction:column; gap:6px;
  }
  .dec-final-pick { display:inline-flex; align-items:center; gap:6px; font-size:13.5px; color:var(--text); }
  .dec-final-pick svg { color:#22c55e; }
  .dec-final-note { margin:0; font-size:12.5px; color:var(--text); line-height:1.55; }
  .dec-final-meta { font-size:11px; color:var(--dec-soft); }

  @media (max-width: 900px) {
    .dec-table-head { display:none; }
    .dec-row { grid-template-columns:1fr; gap:5px; padding:12px 8px; }
    .dec-panel { width:100vw; }
  }
`
