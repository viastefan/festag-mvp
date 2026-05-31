'use client'

/**
 * /dev/review — Tagro Review Center.
 *
 * Spec (festag_dev_panel.md):
 *   Listet alle finished_by_dev Tasks der Person mit Tagro-Verdict, Evidence-
 *   Coverage, Missing-Proofs, Client-Impact und Next Action. Filterbar nach
 *   Verification-Status. Klick auf einen Eintrag öffnet /dev/tasks?id=… mit
 *   dem vollständigen Drawer (Re-Verify, Owner-Approve, Proof-Composer).
 *
 * Sichtbarkeit: zeigt die eigenen Tasks (assigned_to = me) sowie — für
 * admin/project_owner — alle finished_by_dev Tasks aller Projekte. So
 * landet der Review-Backlog beim Owner an einer Stelle.
 *
 * Daten: latest tagro_verifications je Task (LIMIT 1 per task_id via
 * client-side reduce, weil Supabase keine simple DISTINCT-ON-Query über
 * postgrest erlaubt).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight, ArrowsClockwise, CheckCircle, Funnel, GitCommit, Image as ImageIcon,
  Link as LinkIcon, Paperclip, Robot, WarningCircle, XCircle,
} from '@phosphor-icons/react'
import {
  DEV_FLOW_LABEL, devFlowFromLegacy, PROOF_LABELS, type ProofType,
} from '@/lib/tasks/work-types'

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

type ReviewRow = {
  // tagro_verifications
  verification_id: string
  status: string
  confidence: number | null
  summary: string | null
  client_summary: string | null
  issues: string[]
  evidence: any
  recommended_next_action: string | null
  verification_created_at: string
  // tasks
  task_id: string
  task_title: string
  work_type: string | null
  task_priority: string | null
  task_dev_status: string | null
  task_legacy_status: string | null
  finished_by_dev_at: string | null
  project_id: string | null
  project_title: string | null
  assigned_to: string | null
}

type FilterKey = 'all' | 'verified' | 'needs_review' | 'proof_missing' | 'quality_issue' | 'blocked' | 'cannot_verify'

const FILTER_LABEL: Record<FilterKey, string> = {
  all:            'Alles',
  verified:       'Verified',
  needs_review:   'Needs Review',
  proof_missing:  'Proof Missing',
  quality_issue:  'Quality Issue',
  blocked:        'Blocked',
  cannot_verify:  'Manual Review',
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function verificationTone(s: string) {
  switch (s) {
    case 'verified':       return { color: 'var(--green-dark)', label: 'Verified' }
    case 'needs_review':   return { color: 'var(--amber)', label: 'Needs Review' }
    case 'proof_missing':  return { color: 'var(--red)', label: 'Proof Missing' }
    case 'quality_issue':  return { color: 'var(--red)', label: 'Quality Issue' }
    case 'blocked':        return { color: 'var(--red)', label: 'Blocked' }
    case 'cannot_verify':  return { color: 'var(--text-muted)', label: 'Manual Review' }
    default:               return { color: 'var(--text-muted)', label: s }
  }
}

function dateLabel(v?: string | null) {
  if (!v) return '—'
  try { return new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(v)) }
  catch { return '—' }
}

function priorityLabel(p?: string | null) {
  if (p === 'critical') return 'Kritisch'
  if (p === 'high')     return 'Hoch'
  if (p === 'low')      return 'Niedrig'
  return 'Mittel'
}

function proofIcon(t: ProofType) {
  if (t === 'commit' || t === 'pull_request') return <GitCommit size={11} />
  if (t === 'screenshot' || t === 'screenshot_before' || t === 'screenshot_after' || t === 'mobile_screenshot') return <ImageIcon size={11} />
  if (t === 'preview_url' || t === 'website_url' || t === 'deployment' || t === 'figma' || t === 'loom') return <LinkIcon size={11} />
  return <Paperclip size={11} />
}

// ────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────

export default function DevReviewPage() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [isOwnerRole, setIsOwnerRole] = useState(false)
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [scope, setScope] = useState<'mine' | 'all'>('mine')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const session = { user }
    const uid = session.user.id
    setUserId(uid)

    const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle()
    const owner = ['admin', 'project_owner'].includes((prof as any)?.role)
    setIsOwnerRole(owner)
    const effectiveScope: 'mine' | 'all' = owner ? scope : 'mine'

    // Pull last 200 verifications joined to tasks (and project title).
    const { data } = await (supabase as any)
      .from('tagro_verifications')
      .select(`
        id, status, confidence, summary, client_summary, issues_json, evidence_json,
        recommended_next_action, created_at, task_id,
        tasks!inner(
          id, title, work_type, priority, dev_status, status, finished_by_dev_at,
          assigned_to, project_id,
          projects(id, title)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    let raw = ((data as any[]) ?? []).map((row): ReviewRow => ({
      verification_id: row.id,
      status: row.status,
      confidence: typeof row.confidence === 'number' ? row.confidence : null,
      summary: row.summary,
      client_summary: row.client_summary,
      issues: Array.isArray(row.issues_json) ? row.issues_json : [],
      evidence: row.evidence_json ?? {},
      recommended_next_action: row.recommended_next_action,
      verification_created_at: row.created_at,
      task_id: row.tasks.id,
      task_title: row.tasks.title,
      work_type: row.tasks.work_type,
      task_priority: row.tasks.priority,
      task_dev_status: row.tasks.dev_status,
      task_legacy_status: row.tasks.status,
      finished_by_dev_at: row.tasks.finished_by_dev_at,
      project_id: row.tasks.project_id,
      project_title: row.tasks.projects?.title ?? null,
      assigned_to: row.tasks.assigned_to,
    }))

    if (effectiveScope === 'mine') raw = raw.filter(r => r.assigned_to === uid)

    // Keep only the latest verification per task (the list is already
    // sorted by created_at desc).
    const seen = new Set<string>()
    const latest: ReviewRow[] = []
    for (const r of raw) {
      if (seen.has(r.task_id)) continue
      seen.add(r.task_id)
      latest.push(r)
    }
    setRows(latest)
    setLoading(false)
  }, [supabase, scope])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: rows.length,
      verified: 0, needs_review: 0, proof_missing: 0,
      quality_issue: 0, blocked: 0, cannot_verify: 0,
    }
    for (const r of rows) {
      const k = r.status as FilterKey
      if (k in c) c[k]++
    }
    return c
  }, [rows])

  const filtered = useMemo(
    () => filter === 'all' ? rows : rows.filter(r => r.status === filter),
    [rows, filter],
  )

  async function reVerify(taskId: string) {
    try {
      const res = await fetch('/api/tagro/verify-task', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      if (res.ok) load()
    } catch { /* noop */ }
  }

  async function approve(taskId: string) {
    if (!isOwnerRole) return
    try {
      const res = await fetch('/api/dev/tasks/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, decision: 'approve' }),
      })
      if (res.ok) load()
    } catch { /* noop */ }
  }

  return (
    <div className="dev-page">
      <header className="r-head">
        <div>
          <p className="dev-eyebrow">DEV · Review</p>
          <h1>Tagro Review Center</h1>
          <p className="meta">
            Geprüfte Tasks, fehlende Belege und Empfehlungen — bevor etwas an den Client geht.
          </p>
        </div>
        <button className="r-refresh" onClick={() => load()} title="Aktualisieren" aria-label="Aktualisieren">
          <ArrowsClockwise size={13} />
        </button>
      </header>

      <div className="r-toolbar">
        <div className="r-filters">
          {(Object.keys(FILTER_LABEL) as FilterKey[]).map(k => (
            <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {FILTER_LABEL[k]} <span className="count">{counts[k]}</span>
            </button>
          ))}
        </div>
        {isOwnerRole && (
          <div className="r-scope">
            <button className={scope === 'mine' ? 'on' : ''} onClick={() => setScope('mine')}>Meine</button>
            <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>Alle Projekte</button>
          </div>
        )}
      </div>

      {/* Trust hint */}
      <p className="r-trust">
        <Robot size={12} /> Tagro prüft Plausibilität, Aktivität und grobe Übereinstimmung — niemals echte Qualität.
        Bei Unsicherheit wird ehrlich „needs review" gesetzt.
      </p>

      {/* Body */}
      {loading ? (
        <p className="r-empty">Wird geladen…</p>
      ) : filtered.length === 0 ? (
        <p className="r-empty">
          Keine offenen Reviews in dieser Sicht.
          {filter !== 'all' ? ' Wechsle den Filter, um andere Tasks zu sehen.' : ''}
        </p>
      ) : (
        <ul className="r-list">
          {filtered.map(r => <ReviewCard
            key={r.verification_id}
            row={r}
            isOwnerRole={isOwnerRole}
            onReVerify={reVerify}
            onApprove={approve}
          />)}
        </ul>
      )}

      <style jsx>{`
        .r-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .r-head h1 { margin: 0; font-size: 22px; font-weight: 500; letter-spacing: -.012em; line-height: 1.15; }
        .r-head .meta { margin: 6px 0 0; color: var(--text-muted); font-size: 13px; max-width: 540px; }
        .r-refresh {
          width: 28px; height: 28px; border: 1px solid var(--border); border-radius: 8px;
          background: transparent; color: var(--text-muted); cursor: pointer;
        }

        .r-toolbar {
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          margin-bottom: 10px; flex-wrap: wrap;
        }
        .r-filters { display: flex; gap: 6px; flex-wrap: wrap; }
        .r-filters button {
          display: inline-flex; align-items: center; gap: 6px;
          height: 26px; padding: 0 11px; border-radius: 999px;
          border: 1px solid var(--border); background: transparent; color: var(--text-muted);
          font: inherit; font-size: 11.5px; font-weight: 500; cursor: pointer;
        }
        .r-filters button.on { color: var(--text); background: var(--surface-2); }
        .r-filters .count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 16px; padding: 0 5px; border-radius: 999px;
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
          color: var(--text-muted); font-size: 10px;
        }
        .r-scope { display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .r-scope button {
          height: 26px; padding: 0 10px; background: transparent; color: var(--text-muted);
          border: 0; border-right: 1px solid var(--border); font: inherit; font-size: 11.5px; font-weight: 500;
          cursor: pointer;
        }
        .r-scope button:last-child { border-right: 0; }
        .r-scope button.on { color: var(--text); background: var(--surface-2); }

        .r-trust {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 12px; margin: 0 0 14px;
          border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
          background: color-mix(in srgb, var(--accent) 5%, transparent);
          border-radius: 9px;
          color: var(--text-secondary);
          font-size: 11.5px; line-height: 1.5;
        }
        .r-trust svg { color: var(--accent); flex: 0 0 auto; }

        .r-empty { padding: 28px; text-align: center; color: var(--text-muted); font-size: 13px; }
        .r-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }

        @media (max-width: 720px) {
          .r-toolbar { flex-direction: column; align-items: stretch; }
          .r-scope { align-self: flex-start; }
          .r-filters { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 2px; }
          .r-filters::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Card
// ────────────────────────────────────────────────────────────────────────

function ReviewCard({
  row, isOwnerRole, onReVerify, onApprove,
}: {
  row: ReviewRow
  isOwnerRole: boolean
  onReVerify: (taskId: string) => void
  onApprove: (taskId: string) => void
}) {
  const tone = verificationTone(row.status)
  const flow = devFlowFromLegacy(row.task_legacy_status, row.task_dev_status)
  const evidence = row.evidence ?? {}
  const requiredCovered: ProofType[] = Array.isArray(evidence.requiredCovered) ? evidence.requiredCovered : []
  const requiredMissing: ProofType[] = Array.isArray(evidence.requiredMissing) ? evidence.requiredMissing : []
  const optionalSeen: ProofType[]    = Array.isArray(evidence.optionalSeen)    ? evidence.optionalSeen    : []
  const commitCount = Number(evidence.commitCount ?? 0)
  const prCount = Number(evidence.prCount ?? 0)
  const checklistDone = Number(evidence.checklistDone ?? 0)
  const checklistTotal = Number(evidence.checklistTotal ?? 0)

  const canApprove = isOwnerRole && flow === 'verified_by_tagro'

  return (
    <li className="rc">
      <Link href={`/dev/tasks?id=${row.task_id}`} className="rc-main">
        <div className="rc-head">
          <span className="rc-badge" style={{ color: tone.color, borderColor: tone.color }}>
            <Robot size={11} /> {tone.label}
            {typeof row.confidence === 'number' && ` · ${Math.round(row.confidence * 100)}%`}
          </span>
          <span className="rc-project">{row.project_title || 'kein Projekt'}</span>
          <span className="rc-prio">{priorityLabel(row.task_priority)}</span>
          <span className="rc-date">{dateLabel(row.finished_by_dev_at || row.verification_created_at)}</span>
        </div>
        <h3 className="rc-title">{row.task_title}</h3>
        {row.summary && <p className="rc-summary">{row.summary}</p>}

        {/* Evidence chips */}
        <div className="rc-chips">
          {requiredCovered.map(p => (
            <span key={`c-${p}`} className="chip good" title="Pflicht-Nachweis abgedeckt">
              <CheckCircle size={10} weight="fill" /> {proofIcon(p)} {PROOF_LABELS[p] ?? p}
            </span>
          ))}
          {requiredMissing.map(p => (
            <span key={`m-${p}`} className="chip bad" title="Pflicht-Nachweis fehlt">
              <XCircle size={10} weight="fill" /> {proofIcon(p)} {PROOF_LABELS[p] ?? p}
            </span>
          ))}
          {optionalSeen.map(p => (
            <span key={`o-${p}`} className="chip muted" title="optional">
              {proofIcon(p)} {PROOF_LABELS[p] ?? p}
            </span>
          ))}
          {(commitCount > 0 || prCount > 0) && (
            <span className="chip good">
              <GitCommit size={10} /> {commitCount} commits · {prCount} PRs
            </span>
          )}
          {checklistTotal > 0 && (
            <span className={`chip ${checklistDone === checklistTotal ? 'good' : 'muted'}`}>
              Checklist {checklistDone}/{checklistTotal}
            </span>
          )}
        </div>

        {/* Issues */}
        {row.issues.length > 0 && (
          <ul className="rc-issues">
            {row.issues.slice(0, 3).map((i, idx) => (
              <li key={idx}><WarningCircle size={11} /> {i}</li>
            ))}
            {row.issues.length > 3 && <li className="more">+{row.issues.length - 3} mehr</li>}
          </ul>
        )}

        {/* Next action */}
        {row.recommended_next_action && (
          <p className="rc-next">
            <Funnel size={11} /> {row.recommended_next_action}
          </p>
        )}
      </Link>

      <div className="rc-actions">
        <button className="rc-btn" onClick={() => onReVerify(row.task_id)} title="Erneut prüfen">
          <Robot size={12} /> Re-verify
        </button>
        {canApprove && (
          <button className="rc-btn primary" onClick={() => onApprove(row.task_id)} title="Für Client freigeben">
            <CheckCircle size={12} /> Approve & sync
          </button>
        )}
        <Link href={`/dev/tasks?id=${row.task_id}`} className="rc-open" title="Task öffnen">
          <ArrowRight size={13} />
        </Link>
      </div>

      <style jsx>{`
        .rc {
          display: grid; grid-template-columns: 1fr auto; gap: 10px;
          padding: 12px 14px; border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          transition: background .12s ease, transform .12s ease;
        }
        .rc:hover { background: color-mix(in srgb, var(--surface-2) 55%, var(--surface)); transform: translateY(-1px); }
        .rc-main {
          display: flex; flex-direction: column; gap: 6px;
          text-decoration: none; color: inherit;
          min-width: 0;
        }
        .rc-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 10.5px; color: var(--text-muted); }
        .rc-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 999px;
          border: 1px solid var(--text-muted);
          background: color-mix(in srgb, currentColor 6%, transparent);
          font-size: 10.5px; font-weight: 500;
        }
        .rc-project { color: var(--text-secondary); }
        .rc-prio, .rc-date { color: var(--text-muted); }
        .rc-title { margin: 2px 0 0; font-size: 14px; font-weight: 500; line-height: 1.3; letter-spacing: -.012em; color: var(--text); }
        .rc-summary { margin: 2px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--text-secondary); }

        .rc-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
        .chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 7px; border-radius: 5px;
          font-size: 10.5px; font-weight: 500;
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
          color: var(--text-secondary);
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
        }
        .chip.good { color: var(--green-dark); border-color: color-mix(in srgb, var(--green-dark) 35%, var(--border)); }
        .chip.bad { color: var(--red); border-color: color-mix(in srgb, var(--red) 40%, var(--border)); }
        .chip.muted { color: var(--text-muted); }
        .chip svg { flex: 0 0 auto; }

        .rc-issues {
          list-style: none; padding: 0; margin: 6px 0 0;
          display: flex; flex-direction: column; gap: 3px;
        }
        .rc-issues li {
          display: inline-flex; align-items: flex-start; gap: 5px;
          font-size: 11.5px; color: var(--text-secondary); line-height: 1.45;
        }
        .rc-issues svg { color: var(--amber); margin-top: 2px; flex: 0 0 auto; }
        .rc-issues li.more { color: var(--text-muted); font-style: italic; }

        .rc-next {
          margin: 4px 0 0;
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11.5px; color: var(--accent);
          line-height: 1.4;
        }
        .rc-next svg { flex: 0 0 auto; }

        .rc-actions {
          display: flex; flex-direction: column; gap: 5px; align-items: stretch;
          min-width: 130px;
        }
        .rc-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          height: 26px; padding: 0 10px; border-radius: 7px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text); font: inherit; font-size: 11.5px; font-weight: 500;
          cursor: pointer;
        }
        .rc-btn:hover { background: var(--surface-2); }
        .rc-btn.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
        .rc-btn.primary:hover { filter: brightness(1.05); }
        .rc-open {
          height: 26px; display: inline-flex; align-items: center; justify-content: center;
          color: var(--text-muted); text-decoration: none; border: 1px solid var(--border); border-radius: 7px;
        }
        .rc-open:hover { color: var(--text); background: var(--surface-2); }

        @media (max-width: 720px) {
          .rc { grid-template-columns: 1fr; }
          .rc-actions { flex-direction: row; min-width: 0; flex-wrap: wrap; }
          .rc-btn { flex: 1 1 140px; }
          .rc-open { flex: 0 0 36px; }
        }
      `}</style>
    </li>
  )
}
