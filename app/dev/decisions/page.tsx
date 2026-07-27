'use client'

/**
 * /dev/decisions — Dev panel for decision engine oversight.
 *
 * Lists engine-backed decisions across accessible projects, seeds provisional
 * samples for client UI preview, and wires Tagro for framing new requests.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowsClockwise, ArrowSquareOut, Lightning, PaperPlaneTilt, Scales, Sparkle, WarningCircle,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import TagroEntryButton from '@/components/TagroEntryButton'
import { openTagro } from '@/components/TagroOverlay'
import { isOpenDecisionStatus } from '@/components/decisions/decisions-shared'

type DecisionRow = {
  id: string
  project_id: string
  title: string
  client_title: string | null
  status: string
  urgency: string
  response_type: string | null
  decision_type: string | null
  requested_for: string | null
  created_by: string | null
  source_task_id: string | null
  created_at: string
  updated_at: string
  decided_at: string | null
  tagro_delegation_reason: string | null
}

type ProjectLite = { id: string; title: string; color?: string | null }

const URGENCY_LABEL: Record<string, string> = {
  low: 'Niedrig', normal: 'Normal', high: 'Hoch', critical: 'Kritisch',
}

function statusLabel(status: string) {
  if (isOpenDecisionStatus(status)) return 'Offen'
  if (status === 'decided') return 'Entschieden'
  if (status === 'applied') return 'Umgesetzt'
  if (status === 'awaiting_clarification') return 'Rückfrage'
  if (status === 'archived') return 'Archiviert'
  return status
}

function fmtAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  return new Date(iso).toLocaleDateString('de-DE')
}

export default function DevDecisionsPage() {
  const [openId, setOpenId] = useState<string | null>(null)
  const highlightRef = useRef<HTMLLIElement | null>(null)

  useEffect(() => {
    try {
      const id = new URL(window.location.href).searchParams.get('open')
      if (id) setOpenId(id)
    } catch {}
  }, [])
  const [decisions, setDecisions] = useState<DecisionRow[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all' | 'decided'>('open')

  const [composeOpen, setComposeOpen] = useState(false)
  const [composeProject, setComposeProject] = useState('')
  const [composeQuestion, setComposeQuestion] = useState('')
  const [composeOptions, setComposeOptions] = useState('')
  const [composeUrgency, setComposeUrgency] = useState<'low' | 'normal' | 'high' | 'critical'>('normal')
  const [composeBusy, setComposeBusy] = useState(false)
  const [composeError, setComposeError] = useState('')
  const [backendHint, setBackendHint] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setBackendHint(null)
    try {
      const res = await fetch('/api/dev/decisions', { credentials: 'include' })
      if (res.status === 401) {
        setBackendHint('Nicht angemeldet — bitte erneut unter /dev/login einloggen.')
        setDecisions([])
        setProjects({})
        return
      }
      if (res.status === 503) {
        setBackendHint('Backend nicht erreichbar — SUPABASE_SERVICE_ROLE_KEY prüfen.')
        return
      }
      const data = res.ok ? await res.json().catch(() => null) : null
      if (!res.ok) {
        setBackendHint(data?.error || 'Entscheidungen konnten nicht geladen werden.')
      }
      setDecisions(data?.decisions ?? [])
      const map: Record<string, ProjectLite> = {}
      for (const p of (data?.projects ?? []) as ProjectLite[]) map[p.id] = p
      setProjects(map)
      if (!composeProject && data?.projects?.[0]?.id) {
        setComposeProject(data.projects[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [composeProject])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!openId || loading) return
    const row = decisions.find(d => d.id === openId)
    if (row && !isOpenDecisionStatus(row.status) && filter === 'open') {
      setFilter('all')
    }
    requestAnimationFrame(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [openId, loading, decisions, filter])

  function openTagroCompose() {
    const projectId = composeProject || projectList[0]?.id
    openTagro({
      contextType: 'decision',
      id: 'compose',
      projectId: projectId || undefined,
      title: 'Entscheidung formulieren',
      subtitle: projectList.find(p => p.id === projectId)?.title,
      prefill: composeQuestion.trim()
        ? `Formuliere eine Kunden-Entscheidung: ${composeQuestion.trim()}`
        : 'Hilf mir, eine klare Kunden-Entscheidung zu formulieren — mit Optionen und Auswirkung.',
    })
  }

  const projectList = useMemo(
    () => Object.values(projects).sort((a, b) => a.title.localeCompare(b.title, 'de')),
    [projects],
  )

  const filtered = useMemo(() => {
    let xs = decisions
    if (filter === 'open') xs = xs.filter(d => isOpenDecisionStatus(d.status))
    if (filter === 'decided') xs = xs.filter(d => d.status === 'decided' || d.status === 'applied')
    return xs
  }, [decisions, filter])

  const openCount = decisions.filter(d => isOpenDecisionStatus(d.status)).length

  async function seedSamples(force = false) {
    setSeeding(true)
    try {
      const res = await fetch('/api/dev/decisions/seed', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: composeProject || projectList[0]?.id,
          force,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setToast(data.error || 'Seed fehlgeschlagen')
        return
      }
      if (data.skipped) {
        setToast('Beispieldaten existieren bereits — „Neu seeden“ erzwingt einen Neuaufbau.')
      } else {
        setToast(`${data.created?.length ?? 0} Beispiel-Entscheidungen angelegt — Client: /decisions?demo=0`)
      }
      await load()
    } finally {
      setSeeding(false)
    }
  }

  async function submitCompose() {
    if (!composeProject || !composeQuestion.trim()) return
    setComposeBusy(true); setComposeError('')
    try {
      const optionSeeds = composeOptions.split('|').map(s => s.trim()).filter(Boolean)
      const suggestedResponseType =
        optionSeeds.length === 0 ? 'free_text'
        : optionSeeds.length === 2 ? 'binary'
        : 'single_choice'
      const res = await fetch('/api/decisions/request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: composeProject,
          question: composeQuestion.trim(),
          suggested_options: optionSeeds,
          suggested_response_type: suggestedResponseType,
          urgency: composeUrgency,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setComposeError(data.error || 'Konnte nicht senden.')
        return
      }
      setComposeOpen(false)
      setComposeQuestion('')
      setComposeOptions('')
      setComposeUrgency('normal')
      setToast('Entscheidung an Tagro übergeben')
      await load()
    } finally {
      setComposeBusy(false)
    }
  }

  return (
    <div className="dev-page">
      <header className="dv-head">
        <h1 className="dv-title">Entscheidungen</h1>
        <div className="dv-head-actions">
          <button type="button" className="dv-btn" onClick={() => load()} disabled={loading}>
            <ArrowsClockwise size={13} />
          </button>
          <button
            type="button"
            className="dv-btn"
            onClick={() => seedSamples(false)}
            disabled={seeding || !projectList.length}
          >
            <Sparkle size={13} weight="fill" />
            {seeding ? 'Seede…' : 'Beispiele'}
          </button>
          <button type="button" className="dv-btn" onClick={() => setComposeOpen(v => !v)}>
            <PaperPlaneTilt size={13} />
            Anfrage senden
          </button>
          <button type="button" className="dv-btn" onClick={openTagroCompose}>
            <Sparkle size={13} weight="fill" />
            Tagro
          </button>
          <Link href="/decisions?demo=0" className="dv-btn" target="_blank" rel="noreferrer">
            <ArrowSquareOut size={13} />
            Client
          </Link>
          <TagroEntryButton
            context={{
              contextType: 'decision',
              id: 'list',
              projectId: composeProject || projectList[0]?.id,
              title: 'Entscheidungen, Dev',
              subtitle: `${openCount} offen`,
            }}
          />
        </div>
      </header>

      {backendHint && (
        <div className="dev-dec-hint" role="status">
          <WarningCircle size={14} weight="fill" />
          {backendHint}
        </div>
      )}

      <div className="dev-dec-filters">
        {(['open', 'decided', 'all'] as const).map(f => (
          <button
            key={f}
            type="button"
            className={`dev-dec-filter${filter === f ? ' on' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'open' ? 'Offen' : f === 'decided' ? 'Entschieden' : 'Alle'}
          </button>
        ))}
      </div>

      {composeOpen && (
        <section className="dev-dec-compose">
          <p className="dev-dec-compose-label">Neue Entscheidung (Engine)</p>
          <div className="dev-dec-compose-row">
            <label>
              Projekt
              <select value={composeProject} onChange={e => setComposeProject(e.target.value)}>
                {projectList.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
            <label>
              Dringlichkeit
              <select value={composeUrgency} onChange={e => setComposeUrgency(e.target.value as any)}>
                <option value="low">Niedrig</option>
                <option value="normal">Normal</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </label>
          </div>
          <input
            className="dev-dec-input"
            value={composeQuestion}
            onChange={e => setComposeQuestion(e.target.value)}
            placeholder="Frage an den Kunden, z. B. Welcher Hosting-Anbieter?"
          />
          <input
            className="dev-dec-input"
            value={composeOptions}
            onChange={e => setComposeOptions(e.target.value)}
            placeholder="Optionen (durch | getrennt) — leer = Freitext"
          />
          <div className="dev-dec-compose-actions">
            <button type="button" className="dev-dec-btn ghost" onClick={openTagroCompose}>
              <Sparkle size={14} weight="fill" />
              Tagro fragen
            </button>
            <button type="button" className="dev-dec-btn" disabled={composeBusy || !composeQuestion.trim()} onClick={submitCompose}>
              {composeBusy ? 'Sende…' : 'An Tagro übergeben'}
            </button>
            <button type="button" className="dev-dec-btn ghost" onClick={() => setComposeOpen(false)}>Abbrechen</button>
          </div>
          {composeError && <p className="dev-dec-err"><WarningCircle size={12} /> {composeError}</p>}
        </section>
      )}

      {loading && filtered.length === 0 ? (
        <p className="dev-dec-empty">Lade Entscheidungen…</p>
      ) : filtered.length === 0 ? (
        <div className="dev-dec-empty">
          <p>Keine Entscheidungen in dieser Ansicht.</p>
          <button type="button" className="dev-dec-btn" onClick={() => seedSamples(false)} disabled={seeding || !projectList.length}>
            Beispieldaten für Client-UI anlegen
          </button>
        </div>
      ) : (
        <ul className="dev-dec-list">
          {filtered.map(d => {
            const proj = projects[d.project_id]
            const isOpen = isOpenDecisionStatus(d.status)
            const tone = isOpen ? 'amber' : (d.status === 'rejected' ? 'red' : 'good')
            return (
              <li
                key={d.id}
                ref={openId === d.id ? highlightRef : undefined}
                className={`dev-dec-row${openId === d.id ? ' dev-dec-row--open' : ''}`}
              >
                <div className="dev-dec-row-main">
                  <span className={`dev-dec-pill tone-${tone}`}>{statusLabel(d.status)}</span>
                  <strong>{d.client_title || d.title}</strong>
                  <span className="dev-dec-meta">
                    {proj?.title || '—'}, {URGENCY_LABEL[d.urgency] || d.urgency}, {fmtAgo(d.updated_at)}
                  </span>
                  {d.tagro_delegation_reason && (
                    <span className="dev-dec-tagro"><Sparkle size={10} weight="fill" /> Tagro</span>
                  )}
                </div>
                <div className="dev-dec-row-actions">
                  <button
                    type="button"
                    className="dev-dec-link"
                    onClick={() => openTagro({
                      contextType: 'decision',
                      id: d.id,
                      projectId: d.project_id,
                      title: d.client_title || d.title,
                      subtitle: proj?.title,
                    })}
                  >
                    <Lightning size={12} /> Tagro
                  </button>
                  <a href={`/decisions/${d.id}`} className="dev-dec-link" target="_blank" rel="noreferrer">
                    Client-Detail
                  </a>
                  {d.source_task_id && (
                    <a href={`/dev/tasks?id=${d.source_task_id}`} className="dev-dec-link">
                      Task
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {toast && (
        <div className="dev-dec-toast" role="status">
          {toast}
          <button type="button" onClick={() => setToast(null)} aria-label="Schließen">×</button>
        </div>
      )}

      <style jsx>{`
        .dev-dec-filters { display: flex; gap: 6px; padding: 0 var(--dv-4, 32px); margin-bottom: var(--dv-2, 16px); }
        .dev-dec-filter {
          height: 26px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--dv-line);
          background: transparent; font-size: 12px; color: var(--dv-text-3); cursor: pointer;
          font-family: inherit; transition: all var(--dv-speed, .12s);
        }
        .dev-dec-filter:hover { background: var(--dv-surface); }
        .dev-dec-filter.on { background: var(--dv-surface); color: var(--dv-text); border-color: var(--dv-text-3); }
        .dev-dec-compose {
          border: 1px solid var(--dv-line); border-radius: var(--dv-r, 12px);
          padding: 14px; margin: 0 var(--dv-4, 32px) var(--dv-2, 16px);
          background: var(--dv-surface);
        }
        .dev-dec-compose-label { margin: 0 0 10px; font-size: 12px; font-weight: 500; color: var(--dv-text-3); }
        .dev-dec-compose-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
        .dev-dec-compose-row label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--dv-text-3); font-family: inherit; }
        .dev-dec-compose-row select {
          height: 32px; border-radius: var(--dv-r-sm, 8px); border: 1px solid var(--dv-line);
          padding: 0 8px; background: var(--dv-canvas); color: var(--dv-text); font-family: inherit;
        }
        .dev-dec-input {
          width: 100%; margin-bottom: 8px; height: 34px; border-radius: var(--dv-r-sm, 8px);
          border: 1px solid var(--dv-line); padding: 0 10px; background: var(--dv-canvas);
          color: var(--dv-text); font-size: 13px; font-family: inherit;
        }
        .dev-dec-input:focus { outline: none; border-color: var(--dv-text-3); }
        .dev-dec-compose-actions { display: flex; gap: 8px; margin-top: 4px; }
        .dev-dec-compose-actions button { font-family: inherit; }
        .dev-dec-err { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 12px; color: var(--dv-error); }
        .dev-dec-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .dev-dec-row {
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          padding: 10px var(--dv-4, 32px);
          border-bottom: 1px solid var(--dv-line);
          transition: background var(--dv-speed, .12s);
        }
        .dev-dec-row:hover { background: var(--dv-surface); }
        .dev-dec-row--open {
          background: var(--dv-surface);
          box-shadow: inset 3px 0 0 var(--dv-accent);
        }
        .dev-dec-hint {
          display: flex; align-items: center; gap: 8px; padding: 10px var(--dv-4, 32px); margin-bottom: var(--dv-2, 16px);
          font-size: 13px; color: var(--dv-text-3);
          background: var(--dv-surface); border-bottom: 1px solid var(--dv-line);
        }
        .dev-dec-row-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .dev-dec-row-main strong { font-size: 13px; font-weight: 500; color: var(--dv-text); }
        .dev-dec-meta { font-size: 12px; color: var(--dv-text-3); }
        .dev-dec-tagro { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--dv-text-3); }
        .dev-dec-pill {
          display: inline-flex; width: fit-content; padding: 2px 8px; border-radius: 999px;
          font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .dev-dec-pill.tone-amber { background: rgba(255,149,0,.1); color: #b86a00; }
        .dev-dec-pill.tone-good { background: rgba(52,199,89,.1); color: #1a7a36; }
        .dev-dec-pill.tone-red { background: rgba(255,59,48,.1); color: #b3261e; }
        .dev-dec-row-actions { display: flex; gap: 10px; flex-shrink: 0; }
        .dev-dec-link {
          display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--dv-text-3);
          text-decoration: none; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit;
        }
        .dev-dec-link:hover { color: var(--dv-text); }
        .dev-dec-empty { padding: 32px var(--dv-4, 32px); text-align: center; color: var(--dv-text-3); font-size: 13px; }
        .dev-dec-toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 50;
          display: flex; align-items: center; gap: 12px; padding: 10px 14px;
          border-radius: var(--dv-r, 12px); background: var(--dv-surface); border: 1px solid var(--dv-line);
          font-size: 13px; color: var(--dv-text);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .dev-dec-toast button { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--dv-text-3); }

        @media (max-width: 768px) {
          .dev-dec-row { flex-direction: column; align-items: flex-start; gap: 8px; }
          .dev-dec-row-actions { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  )
}
