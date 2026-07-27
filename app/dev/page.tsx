'use client'

/**
 * /dev — Heute.
 *
 * The first surface a developer sees each morning. It answers one question:
 * what deserves my attention right now. Everything is a list of real rows —
 * no KPI tiles, no dashboards. The single status sentence under the greeting
 * replaces the old four-box metric grid.
 *
 * Sources: /api/dev/me, /api/dev/tasks, github_commits, github_pull_requests,
 * task_proofs (deployments) and dev_daily_prompts.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowSquareOut, GitCommit, GitPullRequest, Microphone, Plus, Rocket, Sparkle,
} from '@phosphor-icons/react'

import { createClient } from '@/lib/supabase/client'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import DevNewProjectModal from '@/components/DevNewProjectModal'
import { openTagro } from '@/components/TagroOverlay'

type Task = {
  id: string
  title: string
  status?: string | null
  dev_status?: string | null
  priority?: string | null
  project_id?: string | null
  updated_at?: string | null
  last_dev_action_at?: string | null
  task_type?: string | null
  created_at?: string | null
  projects?: { title?: string | null; color?: string | null } | null
}
type Project = { id: string; title: string; status?: string | null; color?: string | null }
type Commit = {
  id: string; commit_sha: string; message: string | null; committed_at: string | null
  commit_url: string | null; task_id: string | null; project_id: string | null
}
type PullRequest = {
  id: string; pr_number: number; title: string | null; state: string | null; merged: boolean | null
  pr_url: string | null; head_branch: string | null; updated_at_github: string | null; task_id: string | null
}
type Deployment = {
  id: string; url: string | null; description: string | null; source: string | null
  created_at: string; project_id: string | null; proof_type: string
}
type DailyPrompt = { id: string; project_id: string | null; prompt_date: string; state: string; payload: any }

function devStatusOf(t: Task) {
  const v = String(t.dev_status || t.status || 'todo').toLowerCase()
  if (['done', 'completed'].includes(v)) return 'done'
  if (['review', 'ready_review', 'ready_for_review', 'in_review'].includes(v)) return 'review'
  if (['blocked', 'waiting'].includes(v)) return 'blocked'
  if (['in_progress', 'doing', 'active'].includes(v)) return 'in_progress'
  if (v === 'accepted') return 'accepted'
  return 'todo'
}
function statusLabel(s: string) {
  if (s === 'review') return 'Review'
  if (s === 'blocked') return 'Blockiert'
  if (s === 'in_progress') return 'In Arbeit'
  if (s === 'accepted') return 'Angenommen'
  if (s === 'done') return 'Erledigt'
  return 'Geplant'
}
function statusTone(s: string): string {
  if (s === 'blocked') return 'is-error'
  if (s === 'review') return 'is-warning'
  if (s === 'in_progress') return 'is-blue'
  return ''
}
function priorityRank(p?: string | null) {
  return p === 'critical' ? 4 : p === 'high' ? 3 : p === 'low' ? 1 : 2
}
function timeAgo(value?: string | null) {
  if (!value) return ''
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.round((Date.now() - then) / 60000)
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.round(hours / 24)
  if (days < 7) return `vor ${days} Tagen`
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value))
  } catch { return '' }
}
function greeting() {
  const h = new Date().getHours()
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Heute'
  return 'Guten Abend'
}

/** One calm sentence instead of a metric grid. */
function statusSentence(open: number, review: number, blocked: number) {
  if (open === 0 && review === 0 && blocked === 0) {
    return 'Nichts Offenes. Guter Zeitpunkt, um die nächste Aufgabe zu planen.'
  }
  const parts: string[] = []
  if (open > 0) parts.push(open === 1 ? '1 Aufgabe offen' : `${open} Aufgaben offen`)
  if (review > 0) parts.push(review === 1 ? '1 wartet auf Review' : `${review} warten auf Review`)
  if (blocked > 0) parts.push(blocked === 1 ? '1 Blocker' : `${blocked} Blocker`)
  if (parts.length === 1) return `${parts[0]}.`
  return `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}.`
}

export default function DevTodayPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [name, setName] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [commits, setCommits] = useState<Commit[]>([])
  const [pulls, setPulls] = useState<PullRequest[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [dailyPrompts, setDailyPrompts] = useState<DailyPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)

  const [promptDraft, setPromptDraft] = useState('')
  const [promptBusy, setPromptBusy] = useState(false)
  const [interim, setInterim] = useState('')

  const voice = useSpeechRecognition({
    lang: 'de-DE',
    onResult: (text, isFinal) => {
      if (isFinal) {
        setPromptDraft(prev => (prev ? `${prev} ${text}` : text).replace(/\s+/g, ' ').trimStart())
        setInterim('')
      } else {
        setInterim(text)
      }
    },
    onError: () => setInterim(''),
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const meRes = await fetch('/api/dev/me', { credentials: 'include' })
        if (!meRes.ok) return
        const me = await meRes.json().catch(() => null)
        const uid = me?.user?.id
        if (!uid || cancelled) return
        setName(me?.user?.full_name || me?.user?.email || 'Developer')

        const tasksRes = await fetch('/api/dev/tasks', { credentials: 'include' })
        const tasksData = tasksRes.ok ? await tasksRes.json().catch(() => null) : null
        if (cancelled) return
        setProjects((tasksData?.projects as Project[] | null) ?? [])
        setTasks((tasksData?.tasks as Task[] | null) ?? [])

        const { data: { user: oauthUser } } = await supabase.auth.getUser()
        if (!oauthUser || cancelled) return

        const [commitsRes, pullsRes, deployRes, promptsRes] = await Promise.all([
          (supabase as any).from('github_commits')
            .select('id,commit_sha,message,committed_at,commit_url,task_id,project_id')
            .order('committed_at', { ascending: false }).limit(6),
          (supabase as any).from('github_pull_requests')
            .select('id,pr_number,title,state,merged,pr_url,head_branch,updated_at_github,task_id')
            .order('updated_at_github', { ascending: false }).limit(12),
          (supabase as any).from('task_proofs')
            .select('id,url,description,source,created_at,project_id,proof_type')
            .in('proof_type', ['deployment', 'preview_url'])
            .order('created_at', { ascending: false }).limit(5),
          (supabase as any).from('dev_daily_prompts')
            .select('id,project_id,prompt_date,state,payload')
            .eq('developer_id', uid).eq('state', 'open')
            .order('created_at', { ascending: false }).limit(4),
        ])
        if (cancelled) return
        setCommits(((commitsRes?.data as Commit[] | null) ?? []))
        setPulls(((pullsRes?.data as PullRequest[] | null) ?? []).filter(p => !p.merged && p.state !== 'closed').slice(0, 5))
        setDeployments(((deployRes?.data as Deployment[] | null) ?? []))
        setDailyPrompts(((promptsRes?.data as DailyPrompt[] | null) ?? []))
      } catch (error) {
        console.error('Dev Heute konnte nicht geladen werden', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [supabase])

  const metrics = useMemo(() => ({
    open: tasks.filter(t => devStatusOf(t) !== 'done').length,
    review: tasks.filter(t => devStatusOf(t) === 'review').length,
    blocked: tasks.filter(t => devStatusOf(t) === 'blocked').length,
  }), [tasks])

  const focus = useMemo(() => tasks
    .filter(t => !['done', 'review'].includes(devStatusOf(t)))
    .filter(t => t.task_type !== 'client_request' || devStatusOf(t) !== 'todo')
    .sort((a, b) => {
      const rank = priorityRank(b.priority) - priorityRank(a.priority)
      if (rank !== 0) return rank
      return String(b.last_dev_action_at || b.updated_at).localeCompare(String(a.last_dev_action_at || a.updated_at))
    })
    .slice(0, 6), [tasks])

  const reviewTasks = useMemo(
    () => tasks.filter(t => devStatusOf(t) === 'review').slice(0, 5),
    [tasks],
  )

  const clientRequests = useMemo(() => tasks
    .filter(t => t.task_type === 'client_request'
      && ['todo', 'new', 'assigned'].includes(String(t.dev_status || t.status || '').toLowerCase()))
    .sort((a, b) => String(b.created_at || b.updated_at).localeCompare(String(a.created_at || a.updated_at)))
    .slice(0, 4), [tasks])

  const projectTitle = useCallback(
    (id?: string | null) => projects.find(p => p.id === id)?.title ?? null,
    [projects],
  )

  async function sendDailyUpdate(skip: boolean) {
    if (!skip && !promptDraft.trim()) return
    voice.stop(); setInterim('')
    setPromptBusy(true)
    try {
      await Promise.all(dailyPrompts.map(p => fetch('/api/dev/daily-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skip ? { promptId: p.id, skip: true } : { promptId: p.id, text: promptDraft.trim() }),
      })))
      setDailyPrompts([]); setPromptDraft('')
    } finally {
      setPromptBusy(false)
    }
  }

  return (
    <div className="dev-page">
      <header className="dv-head">
        <div style={{ minWidth: 0 }}>
          {/* One h1, no lead line — the live counts live on the rail. */}
          <h1 className="dv-title">{greeting()}, {name ? name.split(' ')[0] : 'Developer'}.</h1>
        </div>
        <div className="dv-head-actions">
          <Link href="/dev/briefing" className="dv-btn">Tagesbriefing</Link>
          <button type="button" className="dv-btn is-primary" onClick={() => setNewOpen(true)}>
            <Plus size={13} /> Neues Projekt
          </button>
        </div>
      </header>

      {dailyPrompts.length > 0 && (
        <section className="dv-section" style={{ padding: '0 var(--dv-4)' }} aria-label="Tagesabschluss">
          <div className="dv-prompt">
            <p className="dv-prompt-q">
              Was hast du heute an {dailyPrompts.length === 1
                ? (projectTitle(dailyPrompts[0].project_id) ?? 'deinem Projekt')
                : `${dailyPrompts.length} Projekten`} gemacht?
              Ein Satz reicht, Tagro übersetzt ihn ruhig für deinen Client.
            </p>
            <div className="dv-prompt-field">
              <textarea
                value={promptDraft}
                onChange={e => setPromptDraft(e.target.value)}
                placeholder="z. B. Hero-Section auf Mobile gefixt, Deploy steht. Morgen Login-Flow."
                rows={2}
              />
              {voice.supported && (
                <button
                  type="button"
                  className="dv-icon-btn"
                  onClick={() => (voice.listening ? (voice.stop(), setInterim('')) : voice.start())}
                  aria-pressed={voice.listening}
                  aria-label={voice.listening ? 'Aufnahme stoppen' : 'Per Stimme diktieren'}
                  style={voice.listening ? { color: 'var(--dv-blue)' } : undefined}
                >
                  <Microphone size={15} weight={voice.listening ? 'fill' : 'regular'} />
                </button>
              )}
            </div>
            {voice.listening && (
              <p className="dv-prompt-hint">
                Tagro hört zu{interim ? ` — „${interim}“` : '. Sprich einfach.'}
              </p>
            )}
            <div className="dv-prompt-actions">
              <button type="button" className="dv-btn" disabled={promptBusy} onClick={() => sendDailyUpdate(true)}>
                Heute nicht
              </button>
              <button
                type="button"
                className="dv-btn is-primary"
                disabled={promptBusy || !promptDraft.trim()}
                onClick={() => sendDailyUpdate(false)}
              >
                {promptBusy ? 'Sende…' : 'An Tagro schicken'}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="dv-split">
        <div>
          <Section
            title="Fokus heute"
            meta={loading ? undefined : statusSentence(metrics.open, metrics.review, metrics.blocked)}
            href="/dev/tasks"
            linkLabel="Alle Aufgaben"
          >
            {loading ? <RowSkeleton rows={4} /> : focus.length === 0 ? (
              <Empty
                text="Kein offener Fokus. Entweder ist alles abgearbeitet, oder du bist noch keinem Projekt zugeordnet."
                actions={[
                  { label: 'Projekt-Pool ansehen', href: '/dev/projects' },
                  { label: 'Tagro fragen', onClick: () => openTagro({
                    contextType: 'dev_item', id: 'dev-today',
                    title: 'Tagro — Heute',
                    prefill: 'Ich habe gerade keine offenen Aufgaben. Was wäre jetzt der sinnvollste nächste Schritt?',
                  }) },
                ]}
              />
            ) : focus.map(task => {
              const status = devStatusOf(task)
              return (
                <Link key={task.id} href={`/dev/tasks?id=${task.id}`} className="dv-list-row">
                  <span className="dv-row-lead">
                    <span className="dv-dot" style={{ '--dv-dot-color': task.projects?.color ?? 'var(--dv-text-3)' } as React.CSSProperties} />
                  </span>
                  <span className="dv-row-body">
                    <span className="dv-row-title">{task.title}</span>
                    <span className="dv-row-meta">{task.projects?.title ?? 'Ohne Projekt'}</span>
                  </span>
                  <span className="dv-row-trail">
                    <span className={`dv-chip ${statusTone(status)}`}>{statusLabel(status)}</span>
                  </span>
                </Link>
              )
            })}
          </Section>

          <Section title="Wartet auf Review" href="/dev/review" linkLabel="Review Center">
            {loading ? <RowSkeleton rows={2} /> : reviewTasks.length === 0 ? (
              <Empty text="Nichts wartet auf Prüfung. Fertige Aufgaben landen hier automatisch, sobald du sie abschließt." />
            ) : reviewTasks.map(task => (
              <Link key={task.id} href={`/dev/tasks?id=${task.id}`} className="dv-list-row">
                <span className="dv-row-lead"><span className="dv-dot" style={{ '--dv-dot-color': 'var(--dv-warning)' } as React.CSSProperties} /></span>
                <span className="dv-row-body">
                  <span className="dv-row-title">{task.title}</span>
                  <span className="dv-row-meta">{task.projects?.title ?? 'Ohne Projekt'}</span>
                </span>
                <span className="dv-row-trail">
                  <span className="dv-row-time">{timeAgo(task.last_dev_action_at || task.updated_at)}</span>
                </span>
              </Link>
            ))}
          </Section>

          <Section title="Offene Pull Requests" href="/dev/github" linkLabel="GitHub">
            {loading ? <RowSkeleton rows={2} /> : pulls.length === 0 ? (
              <Empty
                text="Keine offenen Pull Requests. Sobald ein Repository verbunden ist, erscheinen PRs hier automatisch."
                actions={[{ label: 'Repository verbinden', href: '/dev/github' }]}
              />
            ) : pulls.map(pr => (
              <a key={pr.id} href={pr.pr_url ?? '#'} target="_blank" rel="noreferrer" className="dv-list-row">
                <span className="dv-row-lead"><GitPullRequest size={14} /></span>
                <span className="dv-row-body">
                  <span className="dv-row-title">{pr.title || `Pull Request #${pr.pr_number}`}</span>
                  <span className="dv-row-meta">
                    #{pr.pr_number}{pr.head_branch ? `, ${pr.head_branch}` : ''}
                    {pr.task_id ? ', mit Aufgabe verknüpft' : ''}
                  </span>
                </span>
                <span className="dv-row-trail">
                  <span className="dv-row-time">{timeAgo(pr.updated_at_github)}</span>
                  <ArrowSquareOut size={12} />
                </span>
              </a>
            ))}
          </Section>

          <Section title="Letzte Commits" href="/dev/activity" linkLabel="Aktivität">
            {loading ? <RowSkeleton rows={3} /> : commits.length === 0 ? (
              <Empty
                text="Noch keine Commits sichtbar. Verbinde ein Repository, dann synchronisiert Festag Commits und PRs automatisch."
                actions={[{ label: 'GitHub einrichten', href: '/dev/github' }]}
              />
            ) : commits.map(commit => (
              <a key={commit.id} href={commit.commit_url ?? '#'} target="_blank" rel="noreferrer" className="dv-list-row">
                <span className="dv-row-lead"><GitCommit size={14} /></span>
                <span className="dv-row-body">
                  <span className="dv-row-title">
                    {String(commit.message || commit.commit_sha).split('\n')[0].slice(0, 90)}
                  </span>
                  <span className="dv-row-meta">
                    {commit.commit_sha.slice(0, 7)}{commit.task_id ? ', mit Aufgabe verknüpft' : ''}
                  </span>
                </span>
                <span className="dv-row-trail">
                  <span className="dv-row-time">{timeAgo(commit.committed_at)}</span>
                </span>
              </a>
            ))}
          </Section>
        </div>

        <div>
          {clientRequests.length > 0 && (
            <Section title="Neu vom Client">
              {clientRequests.map(task => (
                <Link key={task.id} href={`/dev/tasks?id=${task.id}`} className="dv-list-row">
                  <span className="dv-row-lead"><span className="dv-dot" style={{ '--dv-dot-color': 'var(--dv-blue)' } as React.CSSProperties} /></span>
                  <span className="dv-row-body">
                    <span className="dv-row-title">{task.title}</span>
                    <span className="dv-row-meta">{task.projects?.title ?? 'Ohne Projekt'}</span>
                  </span>
                  <span className="dv-row-trail">
                    <span className="dv-row-time">{timeAgo(task.created_at || task.updated_at)}</span>
                  </span>
                </Link>
              ))}
            </Section>
          )}

          <Section title="Deployments">
            {loading ? <RowSkeleton rows={2} /> : deployments.length === 0 ? (
              <Empty text="Noch keine Deployments erfasst. Sie erscheinen hier, sobald ein Deployment als Nachweis an einer Aufgabe hängt." />
            ) : deployments.map(d => (
              <a key={d.id} href={d.url ?? '#'} target="_blank" rel="noreferrer" className="dv-list-row">
                <span className="dv-row-lead"><Rocket size={14} /></span>
                <span className="dv-row-body">
                  <span className="dv-row-title">
                    {d.description || (d.url ? d.url.replace(/^https?:\/\//, '') : 'Deployment')}
                  </span>
                  <span className="dv-row-meta">
                    {d.proof_type === 'preview_url' ? 'Preview' : 'Deployment'}
                    {d.source && d.source !== 'manual' ? `, ${d.source}` : ''}
                  </span>
                </span>
                <span className="dv-row-trail">
                  <span className="dv-row-time">{timeAgo(d.created_at)}</span>
                </span>
              </a>
            ))}
          </Section>

          <Section title="Projekte" href="/dev/projects" linkLabel="Alle">
            {loading ? <RowSkeleton rows={2} /> : projects.length === 0 ? (
              <Empty
                text="Noch keine Projekte. Leg eins an und lade deinen Kunden direkt dazu ein."
                actions={[{ label: 'Projekt anlegen', onClick: () => setNewOpen(true) }]}
              />
            ) : projects.slice(0, 6).map(project => (
              <Link key={project.id} href={`/dev/projects/${project.id}`} className="dv-list-row">
                <span className="dv-row-lead">
                  <span className="dv-dot" style={{ '--dv-dot-color': project.color ?? 'var(--dv-text-3)' } as React.CSSProperties} />
                </span>
                <span className="dv-row-body">
                  <span className="dv-row-title">{project.title}</span>
                  <span className="dv-row-meta">{project.status ?? 'aktiv'}</span>
                </span>
              </Link>
            ))}
          </Section>
        </div>
      </div>

      <DevNewProjectModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={p => { setNewOpen(false); router.push(`/dev/projects/${p.id}`) }}
      />

      <style jsx>{`
        .dv-prompt {
          padding: 16px;
          border: 1px solid var(--dv-line);
          border-radius: var(--dv-r);
        }
        .dv-prompt-q {
          margin: 0 0 12px;
          font-size: 14px;
          line-height: 1.55;
          letter-spacing: 0.01em;
          color: var(--dv-text);
          max-width: 62ch;
        }
        .dv-prompt-field {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .dv-prompt-field :global(textarea) {
          flex: 1;
          min-height: 44px;
          max-height: 200px;
          padding: 10px 12px;
          border: 1px solid var(--dv-line);
          border-radius: var(--dv-r-sm);
          background: var(--dv-surface);
          color: var(--dv-text);
          font-family: inherit;
          font-size: 13.5px;
          line-height: 1.5;
          letter-spacing: 0.01em;
          resize: none;
          field-sizing: content;
          box-sizing: border-box;
        }
        .dv-prompt-field :global(textarea):focus {
          outline: none;
          border-color: var(--border-strong);
        }
        .dv-prompt-hint {
          margin: 8px 2px 0;
          font-size: 12px;
          color: var(--dv-text-3);
        }
        .dv-prompt-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 12px;
        }
      `}</style>
    </div>
  )
}

function Section({
  title, meta, href, linkLabel, children,
}: {
  title: string
  /** Section-level context — this is where page state belongs, not under the h1. */
  meta?: string
  href?: string
  linkLabel?: string
  children: React.ReactNode
}) {
  return (
    <section className="dv-section">
      <div className="dv-section-head">
        <h2 className="dv-section-title">{title}</h2>
        <span className="dv-section-trail">
          {meta && <span className="dv-section-meta">{meta}</span>}
          {href && linkLabel && <Link href={href} className="dv-section-link">{linkLabel}</Link>}
        </span>
      </div>
      <div className="dv-list">{children}</div>
    </section>
  )
}

/** Empty states always offer the next useful move rather than a dead end. */
function Empty({
  text, actions = [],
}: {
  text: string
  actions?: Array<{ label: string; href?: string; onClick?: () => void }>
}) {
  return (
    <div className="dv-empty">
      <p>{text}</p>
      {actions.length > 0 && (
        <div className="dv-empty-actions">
          {actions.map(action => action.href ? (
            <Link key={action.label} href={action.href} className="dv-btn">{action.label}</Link>
          ) : (
            <button key={action.label} type="button" className="dv-btn" onClick={action.onClick}>
              <Sparkle size={13} /> {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RowSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dv-list-row" style={{ pointerEvents: 'none' }}>
          <span className="dv-row-lead"><span className="dv-skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} /></span>
          <span className="dv-row-body">
            <span className="dv-skeleton" style={{ display: 'block', width: `${58 + ((i * 13) % 30)}%` }} />
            <span className="dv-skeleton" style={{ display: 'block', width: '28%', height: 10, marginTop: 7 }} />
          </span>
        </div>
      ))}
    </>
  )
}
