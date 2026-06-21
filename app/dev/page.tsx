'use client'

/**
 * /dev — Developer Overview.
 *
 * Liefert in einem Blick:
 *   - KPIs (offen, review, blocker, commits 7d)
 *   - Aktive Work-Session (Timer-Karte, falls offen)
 *   - Heutiger Fokus (Top offene Tasks, klick → /dev/tasks?id=…)
 *   - Letzte GitHub-Aktivität (5 jüngste Commits, Task-Link wenn vorhanden)
 *   - Ready for Review (Tasks, die auf Prüfung warten)
 *   - Aktive Projekte (kleine Liste rechts)
 *
 * Datenquelle: Supabase Auth + project_assignments + tasks + github_commits + dev_work_sessions.
 * UI bewusst ruhig: kleiner Eyebrow, kleine Headline, 4 KPIs, knappe Sektionen.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import DevNewProjectModal from '@/components/DevNewProjectModal'
import DevClientConnectionPanel from '@/components/dev/DevClientConnectionPanel'
import TagroEntryButton from '@/components/TagroEntryButton'
import { openTagro } from '@/components/TagroOverlay'
import {
  ArrowRight, Eye, GitBranch, GitCommit, CheckSquare, Lightning, Microphone,
  Pause, Play, Plus, Sparkle, WarningCircle,
} from '@phosphor-icons/react'

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
  id: string; commit_sha: string; message: string | null; committed_at: string | null;
  commit_url: string | null; task_id: string | null; project_id: string | null
}
type Session = { id: string; task_id: string | null; started_at: string; ended_at: string | null }

function devStatusOf(t: Task) {
  const v = String(t.dev_status || t.status || 'todo').toLowerCase()
  if (['done','completed'].includes(v)) return 'done'
  if (['review','ready_review','ready_for_review','in_review'].includes(v)) return 'review'
  if (['blocked','waiting'].includes(v)) return 'blocked'
  if (['in_progress','doing','active'].includes(v)) return 'in_progress'
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
function priorityLabel(p?: string | null) {
  if (p === 'critical') return 'Kritisch'
  if (p === 'high') return 'Hoch'
  if (p === 'low') return 'Niedrig'
  return 'Mittel'
}
function dateLabel(v?: string | null) {
  if (!v) return '—'
  try { return new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(v)) }
  catch { return '—' }
}
function shortSha(sha: string) { return sha.slice(0, 7) }

function formatDuration(s: number) {
  const sec = Math.max(0, Math.floor(s))
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const r = sec % 60
  if (h) return `${h}h ${String(m).padStart(2,'0')}m`
  if (m) return `${m}m ${String(r).padStart(2,'0')}s`
  return `${r}s`
}

export default function DevOverviewPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [newOpen, setNewOpen] = useState(false)
  const [name, setName] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [commits, setCommits] = useState<Commit[]>([])
  const [openSession, setOpenSession] = useState<Session | null>(null)
  const [openSessionTaskTitle, setOpenSessionTaskTitle] = useState<string | null>(null)
  const [recentCommits, setRecentCommits] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  // Daily prompt from Tagro (16:00 cron)
  type DailyPrompt = { id: string; project_id: string | null; prompt_date: string; state: string; payload: any }
  const [dailyPrompts, setDailyPrompts] = useState<DailyPrompt[]>([])
  const [promptDraft, setPromptDraft] = useState('')
  const [promptBusy, setPromptBusy] = useState(false)
  const [promptDone, setPromptDone] = useState(false)
  const [interim, setInterim] = useState('')
  const [githubSummarizing, setGithubSummarizing] = useState(false)

  // Voice input for the daily update — on-device, Web Speech API.
  // Final chunks are appended to the draft; interim text is a live preview.
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
  function toggleVoice() {
    if (voice.listening) { voice.stop(); setInterim('') }
    else voice.start()
  }

  async function openGithubDigest() {
    setGithubSummarizing(true)
    try {
      const qs = new URLSearchParams({ limit: '30' })
      const pid = commits.find(c => c.project_id)?.project_id || projects[0]?.id
      if (pid) qs.set('projectId', pid)
      const res = await fetch(`/api/github/tagro-summary?${qs}`, { cache: 'no-store', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      openTagro({
        contextType: data.projectId ? 'project' : 'dev_item',
        id: data.projectId || 'github',
        projectId: data.projectId ?? undefined,
        title: data.projectTitle ? `GitHub · ${data.projectTitle}` : 'GitHub · Tagro Digest',
        subtitle: `${data.stats?.commits ?? 0} Commits · ${data.stats?.prs ?? 0} PRs · ${data.stats?.unlinked ?? 0} offen`,
        prefill: data.digest || 'Fasse die GitHub-Aktivität zusammen und schlage ein client-sicheres Update vor.',
      })
    } finally {
      setGithubSummarizing(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const meRes = await fetch('/api/dev/me', { credentials: 'include' })
        if (!meRes.ok) return
        const me = await meRes.json().catch(() => null)
        const uid = me?.user?.id
        if (!uid || cancelled) return

        const display = me?.user?.full_name || me?.user?.email || 'Developer'
        setName(display)

        const tasksRes = await fetch('/api/dev/tasks', { credentials: 'include' })
        const tasksData = tasksRes.ok ? await tasksRes.json().catch(() => null) : null
        const tRows = (tasksData?.tasks as Task[] | null) ?? []
        if (cancelled) return
        setProjects((tasksData?.projects as Project[] | null) ?? [])
        setTasks(tRows)

        const { data: { user: oauthUser } } = await supabase.auth.getUser()

        if (oauthUser) {
          const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
          try {
            const [{ count }, { data: list }] = await Promise.all([
              (supabase as any).from('github_commits').select('*', { count: 'exact', head: true }).gte('committed_at', since),
              (supabase as any).from('github_commits')
                .select('id,commit_sha,message,committed_at,commit_url,task_id,project_id')
                .order('committed_at', { ascending: false }).limit(8),
            ])
            if (!cancelled) {
              setRecentCommits(count ?? 0)
              setCommits(((list as Commit[] | null) ?? []))
            }
          } catch { /* tolerate */ }

          try {
            const { data: prompts } = await (supabase as any)
              .from('dev_daily_prompts')
              .select('id, project_id, prompt_date, state, payload')
              .eq('developer_id', uid)
              .eq('state', 'open')
              .order('created_at', { ascending: false }).limit(4)
            if (!cancelled) setDailyPrompts(((prompts as any[]) ?? []) as DailyPrompt[])
          } catch { /* noop */ }
        }

        try {
          const res = await fetch('/api/dev/work-sessions?open=1&limit=1')
          const d = await res.json().catch(() => ({}))
          const s: Session | null = d?.sessions?.[0] ?? null
          if (!cancelled) {
            setOpenSession(s)
            if (s?.task_id) {
              const found = tRows.find(t => t.id === s.task_id)
              setOpenSessionTaskTitle(found?.title ?? null)
            } else {
              setOpenSessionTaskTitle(null)
            }
          }
        } catch { /* noop */ }
      } catch (error) {
        console.error('Dev overview failed to load', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [supabase])

  // tick for live timer
  useEffect(() => {
    if (!openSession) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [openSession])
  void tick

  const metrics = useMemo(() => {
    const open    = tasks.filter(t => !['done'].includes(devStatusOf(t))).length
    const active  = tasks.filter(t => devStatusOf(t) === 'in_progress').length
    const review  = tasks.filter(t => devStatusOf(t) === 'review').length
    const blocked = tasks.filter(t => devStatusOf(t) === 'blocked').length
    return { open, active, review, blocked }
  }, [tasks])

  const focus = useMemo(() =>
    tasks
      .filter(t => !['done','cancelled'].includes(devStatusOf(t)))
      .filter(t => devStatusOf(t) !== 'review')
      .sort((a, b) => {
        const pa = a.priority === 'critical' ? 4 : a.priority === 'high' ? 3 : a.priority === 'low' ? 1 : 2
        const pb = b.priority === 'critical' ? 4 : b.priority === 'high' ? 3 : b.priority === 'low' ? 1 : 2
        if (pa !== pb) return pb - pa
        return String(b.last_dev_action_at || b.updated_at).localeCompare(String(a.last_dev_action_at || a.updated_at))
      })
      .slice(0, 5),
  [tasks])

  const reviewTasks = tasks.filter(t => devStatusOf(t) === 'review').slice(0, 4)
  // Tasks that the client opened themselves and are still untouched —
  // these jump to the top because they need owner triage.
  const clientRequests = useMemo(() =>
    tasks
      .filter(t => t.task_type === 'client_request' && ['todo', 'new', 'assigned'].includes(String(t.dev_status || t.status || '').toLowerCase()))
      .sort((a, b) => String(b.created_at || b.updated_at).localeCompare(String(a.created_at || a.updated_at)))
      .slice(0, 4),
  [tasks])

  const liveSeconds = openSession ? Math.floor((Date.now() - new Date(openSession.started_at).getTime()) / 1000) : 0

  return (
    <div className="dev-page">
      <header className="dev-page-header">
        <div>
          <h1>Heute, {name ? name.split(' ')[0] : 'Developer'}.</h1>
          <p className="meta">
            {loading
              ? 'Lade Arbeitsbereich…'
              : `${metrics.open} offen · ${metrics.review} Review · ${metrics.blocked} Blocker · ${recentCommits} Commits (7 Tage)`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/dev/visibility" className="dev-secondary-btn link-btn">
            <Eye size={13} /> Kunden-Sicht
          </Link>
          <Link href="/dev/briefing" className="dev-secondary-btn link-btn">
            <Sparkle size={13} /> Tagesbriefing
          </Link>
          <Link href="/dev/github" className="dev-secondary-btn link-btn">
            <GitBranch size={13} /> GitHub
          </Link>
          <Link href="/dev/updates" className="dev-secondary-btn link-btn">
            <Lightning size={13} /> Update senden
          </Link>
          <button className="dev-primary-btn link-btn" onClick={() => setNewOpen(true)}>
            <Plus size={13} /> Neues Projekt
          </button>
          {/* Dev Overview → Tagro entry. Subtitle pulled from the same
              live metrics shown above so the chat opens with full context. */}
          <TagroEntryButton
            context={{
              contextType: 'empty',
              id: 'dev-overview',
              title: 'Dev · Heute',
              subtitle: `${metrics.open} offen · ${metrics.review} Review · ${metrics.blocked} Blocker`,
            }}
          />
        </div>
      </header>

      <nav className="dev-mobile-quick" aria-label="Schnellzugriff">
        <Link href="/dev/briefing"><Sparkle size={13} /> Briefing</Link>
        <Link href="/dev/captures"><Microphone size={13} /> Captures</Link>
        <Link href="/dev/review"><CheckSquare size={13} /> Review</Link>
        <Link href="/dev/visibility"><Eye size={13} /> Kunden-Sicht</Link>
        <Link href="/dev/tasks">Aufgaben</Link>
      </nav>

      {/* Tagro daily prompt — appears around 16:00 once per day per project */}
      {dailyPrompts.length > 0 && !promptDone && (
        <div className="dev-surface" style={{ padding: 16, marginBottom: 18 }}>
          <p className="dev-section-title" style={{ marginBottom: 6, color: 'var(--accent)' }}>Tagro fragt</p>
          <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>
            Was hast du heute an {dailyPrompts.length === 1
              ? (projects.find(p => p.id === dailyPrompts[0].project_id)?.title ?? 'deinem Projekt')
              : `${dailyPrompts.length} Projekten`} gemacht?
            Ein Satz reicht — ich übersetze ihn ruhig für deinen Client.
          </p>
          <div style={{ position: 'relative' }}>
            <textarea
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              placeholder="z. B. Hero-Section auf Mobile gefixt, Deploy steht. Morgen Login-Flow."
              rows={3}
              style={{
                width: '100%', resize: 'vertical',
                padding: '10px 44px 10px 12px', borderRadius: 8,
                border: voice.listening ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)',
                fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.5,
                letterSpacing: '.012em', boxSizing: 'border-box',
              }}
            />
            {voice.supported && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={voice.listening ? 'Aufnahme stoppen' : 'Per Stimme diktieren'}
                aria-pressed={voice.listening}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 30, height: 30, borderRadius: 8,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid ' + (voice.listening ? 'var(--accent)' : 'var(--border)'),
                  background: voice.listening ? 'var(--accent)' : 'var(--surface)',
                  color: voice.listening ? 'var(--accent-text)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Microphone size={15} weight={voice.listening ? 'fill' : 'regular'} />
              </button>
            )}
          </div>
          {voice.listening && (
            <p style={{ margin: '6px 2px 0', fontSize: 11.5, color: 'var(--accent)', letterSpacing: '.012em' }}>
              Tagro hört zu… {interim ? <span style={{ color: 'var(--text-muted)' }}>„{interim}"</span> : 'sprich einfach.'}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="dev-secondary-btn"
              disabled={promptBusy}
              onClick={() => {
                const p = dailyPrompts[0]
                const projTitle = p?.project_id
                  ? projects.find(pr => pr.id === p.project_id)?.title
                  : undefined
                openTagro({
                  contextType: p?.project_id ? 'project' : 'dev_item',
                  id: p?.project_id ?? 'daily-prompt',
                  projectId: p?.project_id ?? undefined,
                  title: projTitle ? `Tagesabschluss · ${projTitle}` : 'Tagesabschluss',
                  prefill: promptDraft.trim()
                    || 'Formuliere ein kurzes client-sicheres Update: Was wurde erledigt, was blockiert, was kommt als Nächstes?',
                })
              }}
            >
              <Sparkle size={13} weight="fill" /> Mit Tagro formulieren
            </button>
            <button
              className="dev-secondary-btn"
              type="button"
              disabled={promptBusy}
              onClick={async () => {
                voice.stop(); setInterim('')
                setPromptBusy(true)
                try {
                  await Promise.all(dailyPrompts.map(p => fetch('/api/dev/daily-update', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ promptId: p.id, skip: true }),
                  })))
                  setDailyPrompts([]); setPromptDone(true)
                } finally { setPromptBusy(false) }
              }}
            >
              Heute nicht
            </button>
            <button
              className="dev-secondary-btn"
              type="button"
              disabled={promptBusy || !promptDraft.trim()}
              style={{
                background: 'var(--accent)', color: 'var(--accent-text)', borderColor: 'var(--accent)',
                opacity: promptBusy || !promptDraft.trim() ? 0.55 : 1,
              }}
              onClick={async () => {
                if (!promptDraft.trim()) return
                voice.stop(); setInterim('')
                setPromptBusy(true)
                try {
                  // Send the same text against each open prompt (one per project).
                  await Promise.all(dailyPrompts.map(p => fetch('/api/dev/daily-update', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ promptId: p.id, text: promptDraft.trim() }),
                  })))
                  setDailyPrompts([]); setPromptDraft(''); setPromptDone(true)
                } finally { setPromptBusy(false) }
              }}
            >
              {promptBusy ? 'Sende…' : 'An Tagro schicken'}
            </button>
          </div>
        </div>
      )}

      <DevClientConnectionPanel compact />

      {/* Active session card */}
      {openSession && (
        <div className="dev-surface session-card">
          <span className="pulse"><Play size={11} weight="fill" /></span>
          <div className="session-text">
            <p className="st-1">
              Timer läuft · {formatDuration(liveSeconds)}
              {openSessionTaskTitle ? <> · <strong>{openSessionTaskTitle}</strong></> : null}
            </p>
            <p className="st-2">Diese Session wird automatisch geschlossen, sobald du eine neue startest.</p>
          </div>
          <Link href={openSession.task_id ? `/dev/tasks?id=${openSession.task_id}` : '/dev/tasks'} className="dev-secondary-btn link-btn">
            <Pause size={12} /> Verwalten
          </Link>
        </div>
      )}

      {/* KPI strip */}
      <div className="dev-kpi-grid">
        <div className="dev-surface dev-kpi"><strong>{metrics.open}</strong><span>Offene Tasks</span></div>
        <div className="dev-surface dev-kpi"><strong>{metrics.review}</strong><span>Ready for Review</span></div>
        <div className="dev-surface dev-kpi"><strong>{metrics.blocked}</strong><span>Blocker</span></div>
        <div className="dev-surface dev-kpi"><strong>{recentCommits}</strong><span>Commits · 7 Tage</span></div>
      </div>

      {/* Client requests — top-of-feed when present */}
      {clientRequests.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <p className="dev-section-title">
            Neue Anfragen vom Client · {clientRequests.length}
          </p>
          <div className="dev-surface" style={{ overflow: 'hidden' }}>
            {clientRequests.map((t, i) => (
              <Link key={t.id} href={`/dev/tasks?id=${t.id}`} className="row"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <span className="dot" style={{ '--project-color': 'var(--amber)' } as any} />
                <div className="row-text">
                  <p className="t-1">{t.title}</p>
                  <p className="t-2">
                    {t.projects?.title ?? 'kein Projekt'} · vom Client gestellt
                  </p>
                </div>
                <span className="dev-chip">{priorityLabel(t.priority)}</span>
                <span className="muted">{dateLabel(t.created_at || t.updated_at)}</span>
                <ArrowRight size={12} className="muted-icon" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="cols">
        <section>
          <p className="dev-section-title">Heutiger Fokus</p>
          <div className="dev-surface" style={{ overflow:'hidden' }}>
            {focus.length === 0 ? (
              <p className="empty">
                Kein offener Fokus.
                {projects.length === 0 ? ' Du bist aktuell keinem Projekt zugeordnet.' : ' Alles abgearbeitet.'}
              </p>
            ) : focus.map((t, i) => {
              const s = devStatusOf(t)
              return (
                <Link key={t.id} href={`/dev/tasks?id=${t.id}`} className="row"
                  style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <span className="dot" style={{ '--project-color': t.projects?.color ?? 'var(--accent)' } as any} />
                  <div className="row-text">
                    <p className="t-1">{t.title}</p>
                    <p className="t-2">{t.projects?.title ?? 'kein Projekt'}</p>
                  </div>
                  <span className="dev-chip">{statusLabel(s)}</span>
                  <span className="muted">{priorityLabel(t.priority)}</span>
                  <ArrowRight size={12} className="muted-icon" />
                </Link>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 8 }}>
            <p className="dev-section-title" style={{ margin: 0 }}>Letzte Commits</p>
            {commits.length > 0 && (
              <button
                type="button"
                className="dev-secondary-btn"
                onClick={() => void openGithubDigest()}
                disabled={githubSummarizing}
              >
                <Sparkle size={12} weight="fill" />
                {githubSummarizing ? 'Tagro lädt…' : 'Stand zusammenfassen'}
              </button>
            )}
          </div>
          <div className="dev-surface" style={{ overflow:'hidden' }}>
            {commits.length === 0 ? (
              <p className="empty">Noch keine Commits sichtbar — synct ein Repo unter <Link href="/dev/github">GitHub</Link>.</p>
            ) : commits.slice(0, 5).map((c, i) => (
              <a key={c.id} href={c.commit_url || '#'} target="_blank" rel="noreferrer" className="row"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <GitCommit size={13} className="muted-icon" />
                <div className="row-text">
                  <p className="t-1">{String(c.message || c.commit_sha || '').split('\n')[0].slice(0, 86)}</p>
                  <p className="t-2">{shortSha(c.commit_sha)} · {dateLabel(c.committed_at)}{c.task_id ? ' · verknüpft' : ''}</p>
                </div>
                <span className={`dev-chip ${c.task_id ? 'accent' : ''}`}>{c.task_id ? 'Task' : 'frei'}</span>
              </a>
            ))}
          </div>
        </section>

        <aside>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <p className="dev-section-title" style={{ margin: 0 }}>Ready for Review</p>
            <Link href="/dev/review" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>Tagro Review Center →</Link>
          </div>
          <div className="dev-surface" style={{ overflow:'hidden', marginBottom: 18 }}>
            {reviewTasks.length === 0 ? (
              <p className="empty">Nichts wartet auf Prüfung.</p>
            ) : reviewTasks.map((t, i) => (
              <Link key={t.id} href={`/dev/tasks?id=${t.id}`} className="row"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <CheckSquare size={13} className="muted-icon" />
                <div className="row-text">
                  <p className="t-1">{t.title}</p>
                  <p className="t-2">{t.projects?.title ?? 'kein Projekt'}</p>
                </div>
                <ArrowRight size={12} className="muted-icon" />
              </Link>
            ))}
          </div>

          <p className="dev-section-title">Aktive Projekte</p>
          <div className="dev-surface" style={{ overflow:'hidden' }}>
            {projects.length === 0 ? (
              <p className="empty">Noch keine Projekte. Leg über „Neues Projekt" eins an und lade deinen Kunden ein.</p>
            ) : projects.slice(0, 5).map((p, i) => (
              <Link key={p.id} href={`/dev/projects/${p.id}`} className="row"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <span className="dot" style={{ '--project-color': p.color ?? 'var(--accent)' } as any} />
                <div className="row-text">
                  <p className="t-1">{p.title}</p>
                  <p className="t-2">{p.status ?? 'aktiv'}</p>
                </div>
                <ArrowRight size={12} className="muted-icon" />
              </Link>
            ))}
          </div>

          {metrics.blocked > 0 && (
            <div className="dev-surface alert-card">
              <WarningCircle size={16} />
              <div>
                <p className="alert-1">{metrics.blocked} Blocker offen</p>
                <p className="alert-2">Tagro wartet auf deine Notiz, bevor sie an den Client gespiegelt werden.</p>
              </div>
              <Link href="/dev/tasks" className="dev-secondary-btn link-btn">Öffnen</Link>
            </div>
          )}
        </aside>
      </div>

      <DevNewProjectModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(p) => { setNewOpen(false); router.push(`/dev/projects/${p.id}`) }}
      />

      <style jsx>{`
        .link-btn { display:inline-flex; align-items:center; gap:6px; text-decoration:none; }
        .session-card {
          margin-bottom:16px; padding:12px 14px;
          display:flex; gap:12px; align-items:center;
        }
        .pulse {
          width:24px; height:24px; border-radius:8px;
          display:grid; place-items:center;
          background: color-mix(in srgb, var(--accent) 18%, transparent);
          color: var(--accent);
        }
        .session-text { flex:1; min-width:0; }
        .st-1 { margin:0; font-size:13px; color:var(--text); font-weight:500; }
        .st-1 strong { font-weight:500; }
        .st-2 { margin:2px 0 0; font-size:11.5px; color:var(--text-muted); }

        .cols {
          display:grid; grid-template-columns: minmax(0,1.5fr) minmax(0,1fr); gap:22px;
        }
        .row {
          display:grid; grid-template-columns:14px minmax(0,1fr) auto auto 14px;
          align-items:center; gap:12px;
          padding:9px 14px;
          text-decoration:none; color:inherit;
          transition:background .12s ease;
        }
        .row.gh { grid-template-columns:14px minmax(0,1fr) auto; }
        .row:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); }
        .row .dot {
          width:9px; height:9px; border-radius:50%;
          border:2px solid var(--project-color, var(--accent));
          background:transparent;
          box-sizing:border-box;
        }
        .row-text { min-width:0; }
        .t-1 { margin:0; font-size:12.8px; font-weight:500; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .t-2 { margin:2px 0 0; font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .muted { font-size:11.5px; color:var(--text-muted); }
        .muted-icon { color: var(--text-muted); }
        .empty { padding:18px; margin:0; font-size:12.5px; color:var(--text-muted); }
        .dev-chip.accent { color:var(--accent); border-color:color-mix(in srgb, var(--accent) 35%, transparent); }

        .alert-card {
          margin-top:16px; padding:12px 14px;
          display:flex; gap:12px; align-items:center;
          border-color: color-mix(in srgb, var(--red) 38%, var(--border));
        }
        .alert-card svg { color:var(--red); flex:0 0 auto; }
        .alert-card > div { flex:1; min-width:0; }
        .alert-1 { margin:0; font-size:13px; color:var(--text); font-weight:500; }
        .alert-2 { margin:2px 0 0; font-size:11.5px; color:var(--text-muted); }

        @media (max-width: 980px) {
          .cols { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
