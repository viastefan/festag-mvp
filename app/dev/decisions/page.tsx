'use client'

/**
 * /dev/decisions — Dev panel for decision engine oversight.
 *
 * Lists engine-backed decisions across accessible projects, seeds provisional
 * samples for client UI preview, and wires Tagro for framing new requests.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dev/decisions', { credentials: 'include' })
      const data = res.ok ? await res.json().catch(() => null) : null
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
        setToast(`${data.created?.length ?? 0} Beispiel-Entscheidungen angelegt`)
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
    <div className="dev-dec-page">
      <header className="dev-dec-head">
        <div>
          <p className="dev-dec-kicker"><Scales size={14} /> Entscheidungen</p>
          <h1>Decision Engine</h1>
          <p className="dev-dec-sub">
            {openCount === 0
              ? 'Keine offenen Entscheidungen in deinen Projekten.'
              : `${openCount} offen — Kunden sehen sie unter /decisions`}
          </p>
        </div>
        <div className="dev-dec-head-actions">
          <button type="button" className="dev-dec-btn ghost" onClick={() => load()} disabled={loading}>
            <ArrowsClockwise size={14} />
            Aktualisieren
          </button>
          <button
            type="button"
            className="dev-dec-btn ghost"
            onClick={() => seedSamples(false)}
            disabled={seeding || !projectList.length}
          >
            <Sparkle size={14} weight="fill" />
            {seeding ? 'Seede…' : 'Beispiele seeden'}
          </button>
          <button
            type="button"
            className="dev-dec-btn ghost"
            onClick={() => seedSamples(true)}
            disabled={seeding || !projectList.length}
            title="Vorhandene Samples ersetzen"
          >
            Neu seeden
          </button>
          <button type="button" className="dev-dec-btn" onClick={() => setComposeOpen(v => !v)}>
            <PaperPlaneTilt size={14} />
            Anfrage senden
          </button>
          <Link href="/decisions?demo=0" className="dev-dec-btn ghost" target="_blank" rel="noreferrer">
            <ArrowSquareOut size={14} />
            Client-Ansicht
          </Link>
          <TagroEntryButton
            context={{
              contextType: 'decision',
              id: 'list',
              projectId: composeProject || projectList[0]?.id,
              title: 'Entscheidungen · Dev',
              subtitle: `${openCount} offen`,
            }}
          />
        </div>
      </header>

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
              <li key={d.id} className="dev-dec-row">
                <div className="dev-dec-row-main">
                  <span className={`dev-dec-pill tone-${tone}`}>{statusLabel(d.status)}</span>
                  <strong>{d.client_title || d.title}</strong>
                  <span className="dev-dec-meta">
                    {proj?.title || '—'} · {URGENCY_LABEL[d.urgency] || d.urgency} · {fmtAgo(d.updated_at)}
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
        .dev-dec-page { max-width: 960px; margin: 0 auto; padding: 24px 20px 48px; }
        .dev-dec-kicker { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); margin: 0 0 4px; }
        .dev-dec-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
        .dev-dec-head h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
        .dev-dec-sub { margin: 6px 0 0; font-size: 13px; color: var(--text-muted); }
        .dev-dec-head-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .dev-dec-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border);
          background: var(--surface-2); color: var(--text); font-size: 12.5px; cursor: pointer;
          text-decoration: none;
        }
        .dev-dec-btn:hover { background: color-mix(in srgb, var(--surface-2) 80%, var(--text) 4%); }
        .dev-dec-btn.ghost { background: transparent; }
        .dev-dec-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dev-dec-filters { display: flex; gap: 6px; margin-bottom: 16px; }
        .dev-dec-filter {
          height: 28px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--border);
          background: transparent; font-size: 12px; color: var(--text-muted); cursor: pointer;
        }
        .dev-dec-filter.on { background: var(--surface-2); color: var(--text); border-color: color-mix(in srgb, var(--border) 60%, var(--text) 20%); }
        .dev-dec-compose {
          border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 16px;
          background: color-mix(in srgb, var(--surface) 92%, var(--text) 2%);
        }
        .dev-dec-compose-label { margin: 0 0 10px; font-size: 12px; font-weight: 500; color: var(--text-muted); }
        .dev-dec-compose-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
        .dev-dec-compose-row label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted); }
        .dev-dec-compose-row select { height: 32px; border-radius: 8px; border: 1px solid var(--border); padding: 0 8px; background: var(--surface); color: var(--text); }
        .dev-dec-input {
          width: 100%; margin-bottom: 8px; height: 36px; border-radius: 8px; border: 1px solid var(--border);
          padding: 0 10px; background: var(--surface); color: var(--text); font-size: 13px;
        }
        .dev-dec-compose-actions { display: flex; gap: 8px; margin-top: 4px; }
        .dev-dec-err { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 12px; color: #c44; }
        .dev-dec-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .dev-dec-row {
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          padding: 12px 14px; border: 1px solid var(--border); border-radius: 10px;
          background: var(--surface);
        }
        .dev-dec-row-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .dev-dec-row-main strong { font-size: 14px; font-weight: 500; }
        .dev-dec-meta { font-size: 12px; color: var(--text-muted); }
        .dev-dec-tagro { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); }
        .dev-dec-pill {
          display: inline-flex; width: fit-content; padding: 2px 8px; border-radius: 999px;
          font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .dev-dec-pill.tone-amber { background: color-mix(in srgb, #ff9500 12%, transparent); color: #b86a00; }
        .dev-dec-pill.tone-good { background: color-mix(in srgb, #34c759 12%, transparent); color: #1a7a36; }
        .dev-dec-pill.tone-red { background: color-mix(in srgb, #ff3b30 12%, transparent); color: #b3261e; }
        .dev-dec-row-actions { display: flex; gap: 10px; flex-shrink: 0; }
        .dev-dec-link {
          display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted);
          text-decoration: none; background: none; border: none; cursor: pointer; padding: 0;
        }
        .dev-dec-link:hover { color: var(--text); }
        .dev-dec-empty { padding: 32px 0; text-align: center; color: var(--text-muted); font-size: 13px; }
        .dev-dec-empty .dev-dec-btn { margin-top: 12px; }
        .dev-dec-toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 50;
          display: flex; align-items: center; gap: 12px; padding: 10px 14px;
          border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border);
          font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .dev-dec-toast button { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted); }
      `}</style>
    </div>
  )
}
