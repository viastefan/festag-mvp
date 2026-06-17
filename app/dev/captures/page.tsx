'use client'

/**
 * /dev/captures — Dev Panel inbox for client-approved capture sessions.
 *
 * Each card carries everything the dev needs to act:
 *   - Project + page URL + Tagro summary
 *   - Ordered change-scripts (title · affected · description · suggested)
 *   - Original transcript (collapsible) for context
 *   - Footer actions: Accept (→ in_dev), Ask client (→ creates Decision +
 *     moves to needs_decision), Reject (with reason). Once in_dev, an
 *     'Mark applied' button closes the loop.
 *
 * Realtime: subscribes to client_captures so client approvals appear
 * instantly. Lists default-sort newest-first across all projects the dev
 * has access to (RLS gates it).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowsClockwise, CheckCircle, ChatTeardropDots, Clock, Globe, Microphone,
  PaperPlaneTilt, Question, ThumbsDown, ThumbsUp, WarningCircle,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import TagroEntryButton from '@/components/TagroEntryButton'

type Capture = {
  id: string
  project_id: string
  page_url: string | null
  page_title: string | null
  transcript: string
  tagro_summary: string | null
  structured_changes: Array<{ title?: string; description?: string; affected?: string; suggested?: string }> | null
  warnings: string[] | null
  status: string
  decision_id: string | null
  rejection_reason: string | null
  created_at: string
  sent_to_dev_at: string | null
  applied_at: string | null
}
type ProjectLite = { id: string; title: string; color?: string | null; staging_url?: string | null }

const STATUS_LABEL: Record<string, string> = {
  approved: 'Neu eingegangen',
  in_dev: 'In Umsetzung',
  needs_decision: 'Rückfrage offen',
  applied: 'Umgesetzt',
  rejected: 'Abgelehnt',
}
const STATUS_TONE: Record<string, 'blue'|'amber'|'green'|'red'|'muted'> = {
  approved: 'blue',
  in_dev: 'blue',
  needs_decision: 'amber',
  applied: 'green',
  rejected: 'red',
}

const FILTERS: Array<{ id: string; label: string }> = [
  { id: 'inbox',    label: 'Neu / In Arbeit' },
  { id: 'awaiting', label: 'Rückfragen' },
  { id: 'done',     label: 'Erledigt' },
  { id: 'all',      label: 'Alle' },
]

function fmtAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.round(d / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} Min.`
  const h = Math.round(m / 60)
  if (h < 24) return `vor ${h} Std.`
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(iso))
}

export default function DevCapturesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [captures, setCaptures] = useState<Capture[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('inbox')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedRaw, setExpandedRaw] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    // Dev sees every capture in their workspaces that's already been
    // approved (or moved further). Drafts/ready_review stay on the client side.
    const r = await fetch('/api/captures').catch(() => null)
    if (!r || !r.ok) { setLoading(false); return }
    const j = await r.json().catch(() => null)
    const rows: Capture[] = (j?.captures || []).filter((c: Capture) =>
      ['approved','in_dev','needs_decision','applied','rejected'].includes(c.status))
    setCaptures(rows)

    const ids = Array.from(new Set(rows.map(c => c.project_id)))
    if (ids.length > 0) {
      const { data } = await (supabase as any)
        .from('projects')
        .select('id,title,color,staging_url')
        .in('id', ids)
      const map: Record<string, ProjectLite> = {}
      ;(data || []).forEach((p: ProjectLite) => { map[p.id] = p })
      setProjects(map)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  // Realtime — react to client approvals + dev-side state changes.
  useEffect(() => {
    const ch = (supabase as any)
      .channel('dev-captures-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_captures' }, () => { void load() })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, load])

  const counts = useMemo(() => ({
    inbox:    captures.filter(c => ['approved','in_dev'].includes(c.status)).length,
    awaiting: captures.filter(c => c.status === 'needs_decision').length,
    done:     captures.filter(c => ['applied','rejected'].includes(c.status)).length,
    all:      captures.length,
  }), [captures])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'inbox':    return captures.filter(c => ['approved','in_dev'].includes(c.status))
      case 'awaiting': return captures.filter(c => c.status === 'needs_decision')
      case 'done':     return captures.filter(c => ['applied','rejected'].includes(c.status))
      default:         return captures
    }
  }, [captures, filter])

  async function patch(id: string, body: any) {
    setBusyId(id)
    try {
      const r = await fetch(`/api/captures/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok) { window.alert(j?.error || 'Aktion fehlgeschlagen.'); return }
      await load()
    } finally { setBusyId(null) }
  }

  function accept(c: Capture) { void patch(c.id, { action: 'accept' }) }
  function apply(c: Capture)  { void patch(c.id, { action: 'apply' }) }
  function reject(c: Capture) {
    const reason = window.prompt('Grund (an den Kunden):') ?? ''
    if (!reason.trim()) return
    void patch(c.id, { action: 'reject', reason })
  }
  function askDecision(c: Capture) {
    const question = window.prompt('Welche Frage soll dem Kunden gestellt werden?') ?? ''
    if (!question.trim()) return
    void patch(c.id, { action: 'ask_decision', question })
  }

  return (
    <div className="dev-page dvc">
      <header className="dev-page-header">
        <div>
          <h1>Client Captures</h1>
          <p className="meta">Freigegebenes Kunden-Feedback, von Tagro als Change-Scripts aufbereitet.</p>
        </div>
        <TagroEntryButton
          context={{
            contextType: 'dev_item',
            id: 'captures',
            title: 'Client Captures · Übersicht',
            subtitle: `${counts.inbox} neu/in Arbeit · ${counts.awaiting} mit Rückfrage`,
          }}
        />
      </header>

      <nav className="dvc-tabs" role="tablist">
        {FILTERS.map(f => {
          const n = (counts as any)[f.id] ?? 0
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`dvc-tab${filter === f.id ? ' on' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id !== 'all' && n > 0 && <span className="dvc-tab-count">{n}</span>}
            </button>
          )
        })}
      </nav>

      <div className="dvc-list">
        {loading && filtered.length === 0 ? (
          <p className="dvc-empty">Lade …</p>
        ) : filtered.length === 0 ? (
          <div className="dvc-empty-card">
            <Microphone size={26} />
            <h2>{filter === 'inbox' ? 'Keine neuen Captures' : 'Nichts in dieser Ansicht'}</h2>
            <p>
              {filter === 'inbox'
                ? 'Sobald ein Kunde eine Aufnahme freigibt, landet sie hier. Du bekommst auch eine Benachrichtigung.'
                : 'Wechsel zu einem anderen Tab, um andere Captures zu sehen.'}
            </p>
          </div>
        ) : (
          filtered.map(c => {
            const p = projects[c.project_id]
            const tone = STATUS_TONE[c.status] || 'muted'
            const isInbox = c.status === 'approved'
            const isInDev = c.status === 'in_dev'
            const isAwait = c.status === 'needs_decision'
            const rawOpen = !!expandedRaw[c.id]
            return (
              <article key={c.id} className="dvc-card">
                <header className="dvc-card-head">
                  <span className="dvc-card-proj">
                    {p ? (
                      <Link href={`/dev/projects/${p.id}`}>
                        <span className="dvc-card-dot" style={{ background: p.color || '#5B647D' }} />
                        {p.title}
                      </Link>
                    ) : <span className="dvc-card-mute">— Projekt —</span>}
                  </span>
                  <span className={`dvc-pill tone-${tone}`}>{STATUS_LABEL[c.status] || c.status}</span>
                </header>

                {c.page_url && (
                  <p className="dvc-card-page">
                    <Globe size={11} />
                    <a href={c.page_url} target="_blank" rel="noreferrer">{c.page_title || c.page_url}</a>
                  </p>
                )}

                {c.tagro_summary && <p className="dvc-card-sum">{c.tagro_summary}</p>}

                {(c.structured_changes || []).length > 0 ? (
                  <ol className="dvc-card-changes">
                    {(c.structured_changes || []).map((ch, i) => (
                      <li key={i}>
                        <strong>{ch.title || `Änderung ${i+1}`}</strong>
                        {ch.affected && <small> · {ch.affected}</small>}
                        {ch.description && <p>{ch.description}</p>}
                        {ch.suggested && <p className="dvc-card-sug"><em>Vorschlag:</em> {ch.suggested}</p>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="dvc-card-raw">{c.transcript}</p>
                )}

                {(c.warnings || []).length > 0 && (
                  <div className="dvc-card-warns">
                    {(c.warnings || []).map((w, i) => (
                      <p key={i}><WarningCircle size={11} /> {w}</p>
                    ))}
                  </div>
                )}

                {c.rejection_reason && (
                  <p className="dvc-card-reject">
                    <strong>Abgelehnt:</strong> {c.rejection_reason}
                  </p>
                )}

                {isAwait && c.decision_id && (
                  <p className="dvc-card-wait">
                    <Question size={12} /> Rückfrage als Entscheidung an den Kunden gestellt.{' '}
                    <Link href={`/decisions?open=${c.decision_id}`}>Entscheidung öffnen</Link>
                  </p>
                )}

                <button
                  type="button"
                  className="dvc-card-rawtog"
                  onClick={() => setExpandedRaw(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                >
                  {rawOpen ? 'Originaltext ausblenden' : 'Originaltext einblenden'}
                </button>
                {rawOpen && <pre className="dvc-card-rawbox">{c.transcript}</pre>}

                <footer className="dvc-card-foot">
                  <span className="dvc-card-time"><Clock size={11} /> {fmtAgo(c.sent_to_dev_at || c.created_at)}</span>
                  <span className="dvc-card-actions">
                    {isInbox && (
                      <>
                        <button type="button" className="dvc-act dvc-act-ghost" onClick={() => reject(c)} disabled={busyId === c.id}>
                          <ThumbsDown size={12} /> Ablehnen
                        </button>
                        <button type="button" className="dvc-act dvc-act-ghost" onClick={() => askDecision(c)} disabled={busyId === c.id}>
                          <ChatTeardropDots size={12} /> Rückfrage stellen
                        </button>
                        <button type="button" className="dvc-act dvc-act-primary" onClick={() => accept(c)} disabled={busyId === c.id}>
                          {busyId === c.id ? <ArrowsClockwise size={12} className="dvc-spin" /> : <ThumbsUp size={12} weight="fill" />}
                          Annehmen
                        </button>
                      </>
                    )}
                    {isInDev && (
                      <button type="button" className="dvc-act dvc-act-primary" onClick={() => apply(c)} disabled={busyId === c.id}>
                        {busyId === c.id ? <ArrowsClockwise size={12} className="dvc-spin" /> : <CheckCircle size={12} weight="fill" />}
                        Als umgesetzt markieren
                      </button>
                    )}
                    {c.status === 'applied' && (
                      <span className="dvc-card-tag dvc-card-tag--green">
                        <CheckCircle size={12} weight="fill" /> Umgesetzt
                      </span>
                    )}
                  </span>
                </footer>
              </article>
            )
          })
        )}
      </div>

      <style jsx>{`
        .dvc { padding-bottom: 64px; }
        .dvc-tabs { display: flex; gap: 6px; margin: 8px 0 14px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .dvc-tabs::-webkit-scrollbar { display: none; }
        .dvc-tab {
          display: inline-flex; align-items: center; gap: 6px;
          height: 30px; padding: 0 13px;
          background: transparent; color: var(--text-muted);
          border: 1px solid var(--border); border-radius: 999px;
          font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
        }
        .dvc-tab:hover { color: var(--text); }
        .dvc-tab.on { background: var(--text); color: var(--bg); border-color: var(--text); }
        .dvc-tab-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 16px; padding: 0 5px;
          background: color-mix(in srgb, var(--text) 14%, transparent);
          border-radius: 999px; font-size: 10.5px; font-weight: 600;
        }
        .dvc-tab.on .dvc-tab-count { background: rgba(255,255,255,.2); color: var(--bg); }

        .dvc-list { display: flex; flex-direction: column; gap: 12px; }
        .dvc-empty { color: var(--text-muted); font-size: 13px; }
        .dvc-empty-card {
          padding: 40px 22px; text-align: center;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 14px;
          color: var(--text-muted);
        }
        .dvc-empty-card h2 { margin: 8px 0 4px; font-size: 16px; font-weight: 600; color: var(--text); }
        .dvc-empty-card p { margin: 0; font-size: 13px; }

        .dvc-card {
          padding: 16px 16px 12px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 14px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .dvc-card-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .dvc-card-proj a { display: inline-flex; align-items: center; gap: 7px; color: var(--text); text-decoration: none; font-size: 13.5px; font-weight: 500; }
        .dvc-card-proj a:hover { text-decoration: underline; }
        .dvc-card-mute { color: var(--text-muted); font-size: 13.5px; }
        .dvc-card-dot { width: 8px; height: 8px; border-radius: 999px; }

        .dvc-pill {
          display: inline-flex; align-items: center;
          height: 22px; padding: 0 9px;
          border-radius: 999px;
          font-size: 11px; font-weight: 500; letter-spacing: .012em;
        }
        .dvc-pill.tone-blue  { background: color-mix(in srgb, #5B647D 22%, transparent); color: #5B647D; }
        .dvc-pill.tone-amber { background: color-mix(in srgb, #d4882b 18%, transparent); color: #d4882b; }
        .dvc-pill.tone-green { background: color-mix(in srgb, #3FB984 22%, transparent); color: #3FB984; }
        .dvc-pill.tone-red   { background: color-mix(in srgb, #d9534f 18%, transparent); color: #d9534f; }
        .dvc-pill.tone-muted { background: color-mix(in srgb, var(--text) 8%, transparent); color: var(--text-muted); }

        .dvc-card-page { margin: 0; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
        .dvc-card-page a { color: inherit; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60ch; }
        .dvc-card-page a:hover { text-decoration: underline; color: var(--text); }

        .dvc-card-sum { margin: 0; font-size: 14px; line-height: 1.55; color: var(--text); }
        .dvc-card-raw { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); white-space: pre-wrap; }

        .dvc-card-changes { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; }
        .dvc-card-changes li { font-size: 13.5px; color: var(--text); }
        .dvc-card-changes strong { font-weight: 600; }
        .dvc-card-changes small { color: var(--text-muted); }
        .dvc-card-changes p { margin: 3px 0 0; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }
        .dvc-card-sug em { font-style: normal; color: var(--text-muted); }

        .dvc-card-warns p {
          margin: 0; padding: 6px 10px;
          background: color-mix(in srgb, #d4882b 12%, transparent);
          border-radius: 8px;
          font-size: 12px; color: var(--text);
          display: inline-flex; align-items: center; gap: 6px;
        }
        .dvc-card-reject {
          margin: 0; padding: 8px 12px;
          background: color-mix(in srgb, #d9534f 12%, transparent);
          border-radius: 8px;
          font-size: 12.5px; color: var(--text);
        }
        .dvc-card-wait {
          margin: 0; padding: 8px 12px;
          background: color-mix(in srgb, #d4882b 10%, transparent);
          border-radius: 8px;
          font-size: 12.5px; color: var(--text);
          display: inline-flex; align-items: center; gap: 8px;
        }
        .dvc-card-wait a { color: #5B647D; }

        .dvc-card-rawtog {
          align-self: flex-start;
          background: transparent; color: var(--text-muted);
          border: 0; padding: 4px 0; cursor: pointer;
          font: inherit; font-size: 12px;
        }
        .dvc-card-rawtog:hover { color: var(--text); text-decoration: underline; }
        .dvc-card-rawbox {
          margin: 0; padding: 12px 14px;
          background: var(--surface-2); border-radius: 10px;
          font: inherit; font-size: 12.5px; line-height: 1.5; color: var(--text-secondary);
          white-space: pre-wrap;
        }

        .dvc-card-foot {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; padding-top: 8px;
          border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          flex-wrap: wrap;
        }
        .dvc-card-time { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-muted); }
        .dvc-card-actions { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .dvc-act {
          display: inline-flex; align-items: center; gap: 6px;
          height: 30px; padding: 0 13px;
          border: 0; border-radius: 999px;
          font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
        }
        .dvc-act:disabled { opacity: .55; cursor: not-allowed; }
        .dvc-act-ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
        .dvc-act-ghost:hover:not(:disabled) { color: var(--text); background: var(--surface-2); }
        .dvc-act-primary { background: #5B647D; color: #fff; box-shadow: 0 10px 22px -12px rgba(91,100,125,.6); }
        .dvc-act-primary:hover:not(:disabled) { background: #4d566c; }
        .dvc-card-tag {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 500;
        }
        .dvc-card-tag--green { color: #3FB984; }
        .dvc-spin { animation: dvcSpin 1s linear infinite; }
        @keyframes dvcSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
