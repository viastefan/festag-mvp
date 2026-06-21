'use client'

/**
 * /captures — the client-side review queue for the Capture Loop.
 *
 * Lists captures across the user's workspace projects, grouped by status.
 * Each card shows Tagro's structured change scripts. From here the client
 * can:
 *   - Approve & send to the dev (PATCH action=approve)
 *   - Re-record (open the recorder again with the same project)
 *   - Reject / discard (the recorder handles edits + retries)
 *
 * After approval, the capture moves to the Dev Panel inbox (slice 3).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowsClockwise, CheckCircle, Clock, FunnelSimple, Globe, Microphone,
  PaperPlaneTilt, PencilSimple, WarningCircle,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { openCapture } from '@/components/CaptureRecorder'
import MobilePageHeader from '@/components/MobilePageHeader'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import { FESTAG_SCROLL_FADE_CSS } from '@/components/mobile/mobile-codex-list-styles'
import { openTagro } from '@/components/TagroOverlay'
import EmptyState from '@/components/EmptyState'

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
  created_at: string
  approved_at: string | null
  sent_to_dev_at: string | null
  applied_at: string | null
  rejection_reason: string | null
}
type ProjectLite = { id: string; title: string; color?: string | null }

const STATUS_LABEL: Record<string, string> = {
  draft: 'Entwurf',
  processing: 'Tagro strukturiert',
  ready_review: 'Bereit zur Prüfung',
  approved: 'An Dev gesendet',
  in_dev: 'In Umsetzung',
  needs_decision: 'Rückfrage offen',
  applied: 'Umgesetzt',
  rejected: 'Abgelehnt',
}
const STATUS_TONE: Record<string, 'amber'|'blue'|'green'|'red'|'muted'> = {
  draft: 'muted',
  processing: 'blue',
  ready_review: 'amber',
  approved: 'blue',
  in_dev: 'blue',
  needs_decision: 'amber',
  applied: 'green',
  rejected: 'red',
}

const STATIC_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'Alle' },
  { id: 'ready_review', label: 'Prüfen' },
  { id: 'approved', label: 'Gesendet' },
  { id: 'applied', label: 'Erledigt' },
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

export default function CapturesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [captures, setCaptures] = useState<Capture[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  function recordNew() {
    const firstId = captures[0]?.project_id || Object.keys(projects)[0]
    if (firstId) openCapture({ projectId: firstId, projectTitle: projects[firstId]?.title })
  }

  const tagroCaptures = () => openTagro({
    contextType: 'empty',
    id: 'captures',
    title: 'Feedback · Übersicht',
    subtitle: `${counts.all} Captures · ${counts.ready_review} zu prüfen`,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/captures').catch(() => null)
    if (!r || !r.ok) { setLoading(false); return }
    const j = await r.json().catch(() => null)
    const rows: Capture[] = j?.captures || []
    setCaptures(rows)

    // Resolve project titles for any project_ids the user owns.
    const ids = Array.from(new Set(rows.map(c => c.project_id)))
    if (ids.length > 0) {
      const { data } = await (supabase as any)
        .from('projects')
        .select('id,title,color')
        .in('id', ids)
      const map: Record<string, ProjectLite> = {}
      ;(data || []).forEach((p: ProjectLite) => { map[p.id] = p })
      setProjects(map)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  // Realtime so dev-side updates appear instantly.
  useEffect(() => {
    const ch = (supabase as any)
      .channel('captures-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_captures' }, () => { void load() })
      .subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [supabase, load])

  const counts = useMemo(() => ({
    all: captures.length,
    ready_review: captures.filter(c => c.status === 'ready_review').length,
    approved: captures.filter(c => ['approved','in_dev','needs_decision'].includes(c.status)).length,
    applied: captures.filter(c => c.status === 'applied').length,
  }), [captures])

  const filtered = useMemo(() => {
    if (filter === 'all') return captures
    if (filter === 'approved') return captures.filter(c => ['approved','in_dev','needs_decision'].includes(c.status))
    return captures.filter(c => c.status === filter)
  }, [captures, filter])

  async function approve(id: string) {
    setBusyId(id)
    try {
      await fetch(`/api/captures/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      await load()
    } finally { setBusyId(null) }
  }

  async function reject(id: string) {
    const reason = window.prompt('Grund (optional):') ?? ''
    setBusyId(id)
    try {
      await fetch(`/api/captures/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      })
      await load()
    } finally { setBusyId(null) }
  }

  return (
    <MobileCodexListChrome
      className="caps"
      title="Feedback"
      titleMobile="Feedback"
      legacyHeader={(
        <MobilePageHeader
          title="Feedback"
          primaryIcon={Microphone}
          primaryLabel="Neu aufnehmen"
          onPrimary={recordNew}
          menuItems={[{ id: 'refresh', label: 'Aktualisieren', onClick: () => void load() }]}
        />
      )}
      mobileActions={(
        <>
          <button type="button" className="mcl-add-btn" aria-label="Neu aufnehmen" onClick={recordNew}>
            <Microphone size={18} weight="bold" />
          </button>
          <div className="mcl-actions-group">
            <button
              type="button"
              className={`mcl-ctl${filterOpen ? ' on' : ''}${filter !== 'all' ? ' has-active' : ''}`}
              aria-label="Filter"
              onClick={() => setFilterOpen(v => !v)}
            >
              <FunnelSimple size={17} weight="regular" />
            </button>
            <button type="button" className="mcl-ctl" aria-label="Aktualisieren" onClick={() => void load()}>
              <ArrowsClockwise size={17} weight="regular" />
            </button>
          </div>
          {filterOpen && (
            <button type="button" className="mcl-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterOpen(false)} />
          )}
        </>
      )}
      dock={{
        onDragUp: recordNew,
        primary: {
          id: 'record',
          label: 'Feedback aufnehmen...',
          icon: <Microphone size={14} weight="regular" />,
          onClick: recordNew,
          ariaLabel: 'Feedback aufnehmen',
        },
        secondary: {
          id: 'tagro',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroCaptures,
          ariaLabel: 'Mit Tagro bearbeiten',
        },
      }}
      extraCss={`
        @media (max-width: 768px) {
          .caps { padding: 0 !important; }
          .caps-top { display: none !important; }
          .caps-tab {
            height: 32px !important;
            padding: 0 14px !important;
            border: var(--mcl-white-border) !important;
            background: #fff !important;
            box-shadow: var(--mcl-white-elev) !important;
            color: #6e717e !important;
          }
          .caps-tab.on {
            background: var(--portal-btn-primary, #5b647d) !important;
            color: #fff !important;
            border-color: transparent !important;
          }
          .caps-card {
            border-radius: 12px !important;
            box-shadow: 0 2px 4px rgba(144,149,159,.07) !important;
          }
        }
      `}
    >

      <header className="caps-top">
        <div>
          <h1>Feedback</h1>
          <p className="caps-meta">
            {loading
              ? 'Lade …'
              : `${counts.all} Captures · ${counts.ready_review} zu prüfen · ${counts.approved} unterwegs`}
          </p>
        </div>
        <button className="caps-record" type="button" onClick={recordNew}>
          <Microphone size={14} /> Neu aufnehmen
        </button>
      </header>

      <nav className="caps-tabs" role="tablist" aria-label="Status">
        {STATIC_FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`caps-tab${filter === f.id ? ' on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id !== 'all' && (counts as any)[f.id] > 0 && (
              <span className="caps-tab-count">{(counts as any)[f.id]}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="caps-list">
        {loading && filtered.length === 0 ? (
          <p className="caps-empty">Lade Captures …</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Microphone}
            title="Noch kein Feedback"
            description={'Starte das Live-Feedback in einem Projekt — Tagro übernimmt den Rest.'}
            actions={[]}
          />
        ) : (
          filtered.map(c => {
            const p = projects[c.project_id]
            const tone = STATUS_TONE[c.status] || 'muted'
            const isReady = c.status === 'ready_review'
            return (
              <article key={c.id} className="caps-card">
                <header className="caps-card-head">
                  <span className="caps-card-proj">
                    {p ? (
                      <Link href={`/project/${p.id}`}>
                        <span className="caps-card-dot" style={{ background: p.color || 'var(--text-muted)' }} />
                        {p.title}
                      </Link>
                    ) : <span className="caps-card-mute">— Projekt —</span>}
                  </span>
                  <span className={`caps-pill tone-${tone}`}>{STATUS_LABEL[c.status] || c.status}</span>
                </header>

                {c.page_url && (
                  <p className="caps-card-page">
                    <Globe size={11} />
                    <a href={c.page_url} target="_blank" rel="noreferrer">{c.page_title || c.page_url}</a>
                  </p>
                )}

                {c.tagro_summary && <p className="caps-card-sum">{c.tagro_summary}</p>}

                {(c.structured_changes || []).length > 0 ? (
                  <ol className="caps-card-changes">
                    {(c.structured_changes || []).map((ch, i) => (
                      <li key={i}>
                        <strong>{ch.title || `Änderung ${i+1}`}</strong>
                        {ch.affected && <small> · {ch.affected}</small>}
                        {ch.description && <p>{ch.description}</p>}
                        {ch.suggested && <p className="caps-card-sug"><em>Vorschlag:</em> {ch.suggested}</p>}
                      </li>
                    ))}
                  </ol>
                ) : c.transcript ? (
                  <p className="caps-card-raw">{c.transcript}</p>
                ) : null}

                {(c.warnings || []).length > 0 && (
                  <div className="caps-card-warns">
                    {(c.warnings || []).map((w, i) => (
                      <p key={i}><WarningCircle size={11} /> {w}</p>
                    ))}
                  </div>
                )}

                <footer className="caps-card-foot">
                  <span className="caps-card-time"><Clock size={11} /> {fmtAgo(c.created_at)}</span>
                  <span className="caps-card-actions">
                    {isReady && (
                      <>
                        <button
                          type="button"
                          className="caps-act caps-act-ghost"
                          onClick={() => reject(c.id)}
                          disabled={busyId === c.id}
                        >
                          Verwerfen
                        </button>
                        <button
                          type="button"
                          className="caps-act caps-act-primary"
                          onClick={() => approve(c.id)}
                          disabled={busyId === c.id}
                        >
                          {busyId === c.id ? <ArrowsClockwise size={12} className="caps-spin" /> : <PaperPlaneTilt size={12} />}
                          An Dev senden
                        </button>
                      </>
                    )}
                    {c.status === 'approved' && (
                      <span className="caps-meta-tag"><CheckCircle size={12} weight="fill" /> gesendet</span>
                    )}
                  </span>
                </footer>
              </article>
            )
          })
        )}
      </div>

      <style>{CSS}</style>
    </MobileCodexListChrome>
  )
}

const CSS = `
${FESTAG_SCROLL_FADE_CSS}
  .caps {
    width: 100%;
    padding: 18px clamp(16px, 2.4vw, 32px) 90px;
    color: var(--text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .caps-top {
    position: relative;
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 14px; margin: 0 0 14px;
  }
  .caps-top h1 { margin: 0 0 4px; font-size: 22px; font-weight: 500; letter-spacing: -.005em; }
  .caps-meta { margin: 0; color: var(--text-muted); font-size: 12.5px; }
  .caps-record {
    display: inline-flex; align-items: center; gap: 7px;
    height: 32px; padding: 0 14px;
    background: #5B647D; color: #fff; border: 0; border-radius: 999px;
    font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
    box-shadow: 0 12px 24px -14px rgba(91,100,125,0.6);
  }
  .caps-record:hover { background: #4d566c; }
  .caps-tabs { display: flex; gap: 6px; margin: 4px 0 14px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .caps-tabs::-webkit-scrollbar { display: none; }
  .caps-tab {
    display: inline-flex; align-items: center; gap: 6px;
    height: 28px; padding: 0 12px;
    background: transparent; color: var(--text-muted);
    border: 1px solid var(--border); border-radius: 999px;
    font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
    transition: background .12s, color .12s, border-color .12s;
  }
  .caps-tab:hover { color: var(--text); }
  .caps-tab.on { background: var(--text); color: var(--bg); border-color: var(--text); }
  .caps-tab-count {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 16px; padding: 0 5px;
    background: color-mix(in srgb, var(--text) 14%, transparent);
    border-radius: 999px;
    font-size: 10.5px; font-weight: 600;
  }
  .caps-tab.on .caps-tab-count { background: rgba(255,255,255,0.18); color: var(--bg); }

  .caps-list { display: flex; flex-direction: column; gap: 10px; }
  .caps-empty { color: var(--text-muted); font-size: 13px; }

  .caps-card {
    padding: 16px 16px 14px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .caps-card-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .caps-card-proj { display: inline-flex; align-items: center; gap: 7px; min-width: 0; }
  .caps-card-proj a { display: inline-flex; align-items: center; gap: 7px; color: var(--text); text-decoration: none; font-size: 13.5px; font-weight: 500; }
  .caps-card-proj a:hover { text-decoration: underline; }
  .caps-card-mute { color: var(--text-muted); font-size: 13.5px; }
  .caps-card-dot { width: 8px; height: 8px; border-radius: 999px; }

  .caps-pill {
    display: inline-flex; align-items: center;
    height: 22px; padding: 0 9px;
    border-radius: 999px;
    font-size: 11px; font-weight: 500; letter-spacing: .012em;
    background: color-mix(in srgb, var(--text) 10%, transparent);
    color: var(--text);
  }
  .caps-pill.tone-amber { background: color-mix(in srgb, #d4882b 18%, transparent); color: #d4882b; }
  .caps-pill.tone-blue  { background: color-mix(in srgb, #5B647D 22%, transparent); color: #5B647D; }
  .caps-pill.tone-green { background: color-mix(in srgb, #3FB984 22%, transparent); color: #3FB984; }
  .caps-pill.tone-red   { background: color-mix(in srgb, #d9534f 18%, transparent); color: #d9534f; }
  .caps-pill.tone-muted { background: color-mix(in srgb, var(--text) 8%, transparent); color: var(--text-muted); }

  .caps-card-page { margin: 0; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .caps-card-page a { color: inherit; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60ch; }
  .caps-card-page a:hover { text-decoration: underline; color: var(--text); }

  .caps-card-sum { margin: 0; font-size: 14px; line-height: 1.55; color: var(--text); }
  .caps-card-raw { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); }

  .caps-card-changes { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; }
  .caps-card-changes li { font-size: 13.5px; color: var(--text); }
  .caps-card-changes strong { font-weight: 600; }
  .caps-card-changes small { color: var(--text-muted); }
  .caps-card-changes p { margin: 3px 0 0; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }
  .caps-card-sug em { font-style: normal; color: var(--text-muted); }

  .caps-card-warns { display: flex; flex-direction: column; gap: 4px; }
  .caps-card-warns p {
    margin: 0; padding: 6px 10px;
    background: color-mix(in srgb, #d4882b 12%, transparent);
    border-radius: 8px;
    font-size: 12px; color: var(--text);
    display: inline-flex; align-items: center; gap: 6px;
  }

  .caps-card-foot {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; padding-top: 8px;
    border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .caps-card-time { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-muted); }
  .caps-card-actions { display: inline-flex; align-items: center; gap: 6px; }

  .caps-act {
    display: inline-flex; align-items: center; gap: 6px;
    height: 30px; padding: 0 13px;
    border: 0; border-radius: 999px;
    font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
  }
  .caps-act:disabled { opacity: .55; cursor: not-allowed; }
  .caps-act-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
  .caps-act-ghost:hover:not(:disabled) { color: var(--text); background: var(--surface-2); }
  .caps-act-primary { background: #5B647D; color: #fff; box-shadow: 0 10px 22px -12px rgba(91,100,125,0.6); }
  .caps-act-primary:hover:not(:disabled) { background: #4d566c; }
  .caps-meta-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #3FB984; font-weight: 500; }
  .caps-spin { animation: capsSpin 1s linear infinite; }
  @keyframes capsSpin { to { transform: rotate(360deg); } }

  @media (max-width: 768px) {
    .caps-top { display: none; }
  }
`
