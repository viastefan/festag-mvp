'use client'

/**
 * /dev/github — GitHub-Integration für den Developer.
 *
 * Drei Sektionen:
 *   1. Verbindungsstatus  (OAuth-Login oder PAT-Fallback)
 *   2. Verknüpfte Repositories — pro Repo: Sync-Button, last_synced_at, Status
 *   3. Aktivität — die letzten Commits + PRs der eigenen Repos,
 *      jeweils mit "verknüpfen"-Aktion zu offenen eigenen Tasks.
 *
 * Tagro fasst die Aktivität später in Statusberichte um — diese Seite ist
 * der ehrliche, technische Blick für den Developer.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TagroEntryButton from '@/components/TagroEntryButton'
import {
  ArrowsClockwise, CheckCircle, GithubLogo, GitCommit, GitPullRequest, Plus, WarningCircle, XCircle,
} from '@phosphor-icons/react'

type Profile = {
  id: string
  provider: string | null
  github_username: string | null
  github_avatar_url: string | null
  github_connected_at: string | null
}
type Repo = {
  id: string
  project_id: string | null
  owner: string
  repo_name: string
  repo_full_name: string
  repo_url: string
  default_branch: string | null
  active: boolean
  created_at: string
  last_synced_at: string | null
  last_sync_status: string | null
  last_sync_error: string | null
}
type Commit = {
  id: string; repo_id: string; project_id: string | null; commit_sha: string
  message: string | null; author_name: string | null; commit_url: string | null
  committed_at: string | null; task_id: string | null
}
type Pull = {
  id: string; repo_id: string; project_id: string | null; pr_number: number; title: string | null
  state: string | null; merged: boolean | null; pr_url: string | null
  head_branch: string | null; base_branch: string | null
  updated_at_github: string | null; merged_at: string | null; task_id: string | null
}
type ProjectLite = { id: string; title: string }
type TaskLite = { id: string; title: string; project_id: string | null }

function dateLabel(v?: string | null) {
  if (!v) return '—'
  try { return new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(v)) }
  catch { return '—' }
}

export default function DevGithubPage() {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [tasks, setTasks] = useState<TaskLite[]>([])
  const [commits, setCommits] = useState<Commit[]>([])
  const [pulls, setPulls] = useState<Pull[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addFullName, setAddFullName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addProject, setAddProject] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')

  // Inline picker state: which row is currently choosing a task
  const [pickerFor, setPickerFor] = useState<{ kind: 'commit'|'pr'; id: string } | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const session = { user }
      const [{ data: prof }, { data: r }, { data: pa }] = await Promise.all([
        supabase.from('profiles')
          .select('id,provider,github_username,github_avatar_url,github_connected_at')
          .eq('id', session.user.id).maybeSingle(),
        supabase.from('github_repositories')
          .select('id,project_id,owner,repo_name,repo_full_name,repo_url,default_branch,active,created_at,last_synced_at,last_sync_status,last_sync_error')
          .eq('developer_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('project_assignments')
          .select('project_id,projects(id,title)')
          .eq('user_id', session.user.id).eq('active', true),
      ])
      if (cancelled) return
      setProfile(prof as Profile | null)
      setRepos(((r as Repo[] | null) ?? []))
      const ps = ((pa as any[] | null) ?? [])
        .map(row => row.projects).filter(Boolean) as ProjectLite[]
      setProjects(ps)

      // tasks (for picker)
      const { data: t } = await supabase.from('tasks')
        .select('id,title,project_id')
        .eq('assigned_to', session.user.id).neq('status', 'done').limit(150)
      setTasks(((t as TaskLite[] | null) ?? []))

      // activity feed via API to share normalization
      try {
        const res = await fetch('/api/github/activity?limit=30')
        const d = await res.json().catch(() => ({}))
        setCommits(d?.commits ?? [])
        setPulls(d?.pulls ?? [])
      } catch { /* noop */ }

      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase])

  const isConnected = profile?.provider === 'github' || !!profile?.github_username

  async function connectGitHub() {
    const { error } = await (supabase.auth as any).linkIdentity({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dev/github`,
        scopes: 'read:user user:email read:org repo',
      },
    })
    if (error) setSyncMsg('GitHub-Verbindung fehlgeschlagen: ' + error.message)
  }

  async function syncOne(repoId: string | null) {
    setSyncMsg(null)
    if (repoId) setSyncingRepoId(repoId)
    else setSyncingAll(true)
    try {
      const res = await fetch('/api/github/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repoId ? { repoId } : {}),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setSyncMsg(d?.error || 'Sync nicht möglich.'); return }
      setSyncMsg(`Sync ${repoId ? 'einzeln' : 'alle'} · ${d.commits ?? 0} commits · ${d.prs ?? 0} PRs · ${d.linked ?? 0} verknüpft`)
      // refresh data
      const [{ data: rNew }, actRes] = await Promise.all([
        supabase.from('github_repositories').select('id,project_id,owner,repo_name,repo_full_name,repo_url,default_branch,active,created_at,last_synced_at,last_sync_status,last_sync_error').eq('developer_id', (await supabase.auth.getUser()).data.user!.id).order('created_at', { ascending: false }),
        fetch('/api/github/activity?limit=30'),
      ])
      setRepos((rNew as Repo[] | null) ?? [])
      const act = await actRes.json().catch(() => ({}))
      setCommits(act?.commits ?? [])
      setPulls(act?.pulls ?? [])
    } finally {
      setSyncingRepoId(null); setSyncingAll(false)
    }
  }

  async function addRepo() {
    setAddError('')
    const full = addFullName.trim()
    if (!/^[\w.-]+\/[\w.-]+$/.test(full)) { setAddError('Format: owner/repo'); return }
    setAddBusy(true)
    try {
      const res = await fetch('/api/github/repos/link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName: full,
          repoUrl: addUrl.trim() || `https://github.com/${full}`,
          projectId: addProject || null,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setAddError(d?.error || 'Konnte Repo nicht verknüpfen.'); return }
      if (d?.repo) setRepos(prev => [d.repo, ...prev])
      setAddOpen(false); setAddFullName(''); setAddUrl(''); setAddProject('')
    } catch { setAddError('Netzwerkfehler.') }
    finally { setAddBusy(false) }
  }

  async function linkCommit(commitId: string, taskId: string | null) {
    const res = await fetch('/api/github/commits/link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commitId, taskId }),
    })
    if (!res.ok) return
    setCommits(prev => prev.map(c => c.id === commitId ? { ...c, task_id: taskId } : c))
    setPickerFor(null); setPickerSearch('')
  }
  async function linkPr(prId: string, taskId: string | null) {
    const res = await fetch('/api/github/prs/link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prId, taskId }),
    })
    if (!res.ok) return
    setPulls(prev => prev.map(p => p.id === prId ? { ...p, task_id: taskId } : p))
    setPickerFor(null); setPickerSearch('')
  }

  const pickerCandidates = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase()
    return tasks
      .filter(t => !term || t.title.toLowerCase().includes(term))
      .slice(0, 8)
  }, [tasks, pickerSearch])

  return (
    <div className="dev-page">
      <header className="dev-page-header">
        <div>
          <h1>GitHub-Aktivität</h1>
          <p className="meta">
            Tagro liest Commits und PRs read-only und übersetzt sie für Clients in verständliche Statusberichte. Du verknüpfst hier manuell, was automatisch nicht zugeordnet wurde.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="dev-secondary-btn" type="button" onClick={() => syncOne(null)} disabled={syncingAll || !isConnected || repos.length === 0}>
            <ArrowsClockwise size={13} style={{ marginRight: 6 }} /> {syncingAll ? 'Sync läuft…' : 'Alle synchronisieren'}
          </button>
          <button className="dev-primary-btn" type="button" onClick={() => setAddOpen(v => !v)} disabled={!isConnected}>
            <Plus size={13} style={{ marginRight: 6 }} /> Repo verknüpfen
          </button>
          <TagroEntryButton
            context={{
              contextType: 'dev_item',
              id: 'github',
              title: 'GitHub-Aktivität',
              subtitle: `${repos.length} Repo${repos.length === 1 ? '' : 's'}`,
            }}
          />
        </div>
      </header>

      {/* Connection card */}
      <div className="dev-surface conn-card">
        <GithubLogo size={22} />
        {loading ? (
          <span className="muted">Lade Status…</span>
        ) : isConnected ? (
          <>
            <div className="conn-text">
              <p className="ct-1">{profile?.github_username ? `@${profile.github_username}` : 'GitHub verbunden'}</p>
              <p className="ct-2">verbunden seit {profile?.github_connected_at ? new Date(profile.github_connected_at).toLocaleDateString('de-DE') : '—'}</p>
            </div>
            <span className="dev-chip accent">
              <CheckCircle size={11} weight="fill" /> verbunden
            </span>
          </>
        ) : (
          <>
            <div className="conn-text">
              <p className="ct-1">GitHub ist noch nicht verbunden.</p>
              <p className="ct-2">Verbinde dein GitHub-Konto, damit Tagro deine Commits & PRs lesen und übersetzen kann.</p>
            </div>
            <button className="dev-primary-btn" type="button" onClick={connectGitHub}>
              GitHub verbinden
            </button>
          </>
        )}
      </div>

      {syncMsg && <p className="sync-msg">{syncMsg}</p>}

      {/* Repo composer */}
      {addOpen && (
        <div className="dev-surface" style={{ padding: 14, marginTop: 14 }}>
          <p className="dev-section-title">Repo hinzufügen</p>
          <div className="grid-2">
            <input value={addFullName} onChange={e => setAddFullName(e.target.value)} placeholder="owner/repo" />
            <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="https://github.com/owner/repo (optional)" />
          </div>
          <div className="repo-project-row">
            <label>Projekt</label>
            <select value={addProject} onChange={e => setAddProject(e.target.value)}>
              <option value="">— kein Projekt —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          {addError && <p className="add-error"><WarningCircle size={12} /> {addError}</p>}
          <div className="row-actions">
            <button className="dev-secondary-btn" type="button" onClick={() => setAddOpen(false)}>Abbrechen</button>
            <button className="dev-primary-btn" type="button" onClick={addRepo} disabled={addBusy}>
              {addBusy ? 'Wird gespeichert…' : 'Verknüpfen'}
            </button>
          </div>
        </div>
      )}

      {/* Repo list */}
      <section className="section">
        <p className="dev-section-title">Verknüpfte Repositories</p>
        <div className="dev-surface" style={{ overflow: 'hidden' }}>
          {repos.length === 0 ? (
            <p className="block-empty">Noch keine Repos verknüpft.</p>
          ) : repos.map((r, i) => {
            const projName = projects.find(p => p.id === r.project_id)?.title
            return (
              <div key={r.id} className="repo-row" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <GithubLogo size={14} />
                <div className="repo-info">
                  <p className="repo-name">{r.repo_full_name}</p>
                  <p className="repo-meta">
                    default: {r.default_branch || 'main'}
                    {projName ? ` · ${projName}` : ' · nicht zugeordnet'}
                    {' · '}{r.last_synced_at ? `zuletzt synct ${dateLabel(r.last_synced_at)}` : 'nie synct'}
                    {r.last_sync_status === 'error' && r.last_sync_error ? ` · Fehler: ${r.last_sync_error}` : ''}
                  </p>
                </div>
                <button
                  className="dev-secondary-btn small"
                  onClick={() => syncOne(r.id)}
                  disabled={syncingRepoId === r.id}
                >
                  <ArrowsClockwise size={11} /> {syncingRepoId === r.id ? 'Sync…' : 'Sync'}
                </button>
                <a href={r.repo_url} target="_blank" rel="noreferrer" className="dev-chip">öffnen</a>
              </div>
            )
          })}
        </div>
      </section>

      {/* Activity grid */}
      <section className="section">
        <div className="section-head">
          <p className="dev-section-title" style={{ margin: 0 }}>Aktivität</p>
          <span className="muted-small">{commits.length} Commits · {pulls.length} PRs</span>
        </div>

        <div className="activity-grid">
          {/* Commits */}
          <div className="dev-surface activity-col">
            <div className="col-head"><GitCommit size={13} /> Commits</div>
            {commits.length === 0 ? (
              <p className="block-empty">Noch keine Commits synct.</p>
            ) : commits.map((c, i) => {
              const linkedTask = c.task_id ? tasks.find(t => t.id === c.task_id) : null
              return (
                <div key={c.id} className="act-row" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div className="act-text">
                    <a className="act-title" href={c.commit_url || '#'} target="_blank" rel="noreferrer">
                      {(c.message || c.commit_sha).split('\n')[0].slice(0, 90)}
                    </a>
                    <small>{c.commit_sha.slice(0, 8)} · {c.author_name || 'unbekannt'} · {dateLabel(c.committed_at)}</small>
                  </div>
                  <div className="act-link">
                    {linkedTask ? (
                      <>
                        <span className="dev-chip subtle" title={linkedTask.title}>
                          {linkedTask.title.length > 22 ? linkedTask.title.slice(0, 22) + '…' : linkedTask.title}
                        </span>
                        <button className="x-btn" title="Verknüpfung lösen" onClick={() => linkCommit(c.id, null)}>
                          <XCircle size={13} />
                        </button>
                      </>
                    ) : (
                      <button className="dev-chip link-chip" onClick={() => { setPickerFor({ kind: 'commit', id: c.id }); setPickerSearch('') }}>
                        verknüpfen
                      </button>
                    )}
                  </div>
                  {pickerFor && pickerFor.kind === 'commit' && pickerFor.id === c.id && (
                    <div className="picker">
                      <input autoFocus placeholder="Task suchen…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
                      <ul>
                        {pickerCandidates.length === 0
                          ? <li className="empty-pick">Keine Tasks.</li>
                          : pickerCandidates.map(t => (
                              <li key={t.id}>
                                <button onClick={() => linkCommit(c.id, t.id)}>{t.title}</button>
                              </li>
                            ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* PRs */}
          <div className="dev-surface activity-col">
            <div className="col-head"><GitPullRequest size={13} /> Pull Requests</div>
            {pulls.length === 0 ? (
              <p className="block-empty">Noch keine PRs synct.</p>
            ) : pulls.map((p, i) => {
              const linkedTask = p.task_id ? tasks.find(t => t.id === p.task_id) : null
              return (
                <div key={p.id} className="act-row" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div className="act-text">
                    <a className="act-title" href={p.pr_url || '#'} target="_blank" rel="noreferrer">
                      #{p.pr_number} {p.title || ''}
                    </a>
                    <small>
                      {p.state === 'open' ? 'open' : p.merged ? 'merged' : 'closed'} · {p.head_branch} → {p.base_branch} · {dateLabel(p.updated_at_github)}
                    </small>
                  </div>
                  <div className="act-link">
                    {linkedTask ? (
                      <>
                        <span className="dev-chip subtle" title={linkedTask.title}>
                          {linkedTask.title.length > 22 ? linkedTask.title.slice(0, 22) + '…' : linkedTask.title}
                        </span>
                        <button className="x-btn" title="Verknüpfung lösen" onClick={() => linkPr(p.id, null)}>
                          <XCircle size={13} />
                        </button>
                      </>
                    ) : (
                      <button className="dev-chip link-chip" onClick={() => { setPickerFor({ kind: 'pr', id: p.id }); setPickerSearch('') }}>
                        verknüpfen
                      </button>
                    )}
                  </div>
                  {pickerFor && pickerFor.kind === 'pr' && pickerFor.id === p.id && (
                    <div className="picker">
                      <input autoFocus placeholder="Task suchen…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
                      <ul>
                        {pickerCandidates.length === 0
                          ? <li className="empty-pick">Keine Tasks.</li>
                          : pickerCandidates.map(t => (
                              <li key={t.id}>
                                <button onClick={() => linkPr(p.id, t.id)}>{t.title}</button>
                              </li>
                            ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <p className="foot-text">
        Tagro liest read-only — Festag pusht oder kommentiert nicht in deinem Repository. Webhooks aktivieren wir auf Wunsch (siehe <Link href="/dev">Overview</Link>).
      </p>

      <style jsx>{`
        .conn-card { padding:14px; margin-top:14px; display:flex; align-items:center; gap:14px; }
        .conn-text { flex:1; min-width:0; }
        .ct-1 { margin:0; font-size:13.5px; color:var(--text); font-weight:500; }
        .ct-2 { margin:3px 0 0; font-size:11.5px; color:var(--text-muted); }
        .dev-chip.accent { color:var(--accent); border-color:color-mix(in srgb, var(--accent) 40%, transparent); }
        .dev-chip.subtle { color:var(--text-secondary); }
        .muted { color:var(--text-muted); font-size:12.5px; }
        .muted-small { color:var(--text-muted); font-size:11.5px; }
        .sync-msg { margin:10px 0 0; font-size:12px; color:var(--text-secondary); }

        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
        .grid-2 input {
          background:transparent; border:1px solid var(--border); border-radius:7px;
          padding:7px 10px; font:inherit; font-size:13px; color:var(--text);
        }
        .repo-project-row { display:flex; gap:10px; align-items:center; margin-bottom:10px; }
        .repo-project-row label { font-size:11.5px; color:var(--text-muted); }
        .repo-project-row select {
          flex:1; background:transparent; border:1px solid var(--border); border-radius:7px;
          padding:6px 10px; font:inherit; font-size:13px; color:var(--text);
        }
        .add-error { margin:0 0 8px; font-size:11.5px; color:var(--text-secondary); display:flex; align-items:center; gap:6px; }
        .row-actions { display:flex; justify-content:flex-end; gap:8px; }

        .section { margin-top:22px; }
        .section-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; }

        .repo-row {
          display:grid; grid-template-columns: 18px 1fr auto auto; gap:12px; align-items:center;
          padding:10px 14px; min-height:46px;
        }
        .repo-info { min-width:0; }
        .repo-name { margin:0; font-size:13px; font-weight:500; color:var(--text); }
        .repo-meta { margin:2px 0 0; font-size:11.5px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:520px; }
        .dev-secondary-btn.small { height:26px; padding:0 10px; font-size:11.5px; display:inline-flex; align-items:center; gap:4px; }

        .activity-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .activity-col { overflow:hidden; }
        .col-head {
          display:flex; align-items:center; gap:7px;
          padding:9px 12px;
          font-size:11.5px; font-weight:600; color:var(--text-muted);
          border-bottom:1px solid var(--border);
          background:color-mix(in srgb, var(--surface-2) 50%, transparent);
        }
        .act-row {
          display:grid; grid-template-columns: 1fr auto; gap:10px; align-items:center;
          padding:10px 14px; min-height:54px;
        }
        .act-text { min-width:0; }
        .act-title {
          display:block; color:var(--text); text-decoration:none; font-size:12.5px;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .act-title:hover { text-decoration:underline; }
        .act-text small { display:block; margin-top:2px; color:var(--text-muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .act-link { display:flex; align-items:center; gap:5px; }
        .x-btn { border:0; background:transparent; color:var(--text-muted); cursor:pointer; padding:2px; border-radius:6px; }
        .x-btn:hover { background:var(--surface-2); color:var(--text); }
        .link-chip { cursor:pointer; }
        .block-empty { padding:14px; margin:0; color:var(--text-muted); font-size:12px; }

        .picker {
          grid-column: 1 / -1;
          margin-top:6px; padding:4px;
          background: var(--surface);
          border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
          border-radius: 10px;
          box-shadow: 0 8px 24px -8px rgba(15,23,42,.12);
        }
        .picker input {
          width:100%; background:transparent; border:1px solid color-mix(in srgb, var(--border) 80%, transparent);
          border-radius: 999px;
          padding:8px 12px;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 13px; font-weight: 400; color:var(--text);
        }
        .picker ul { list-style:none; margin:4px 0 0; padding:0; max-height:160px; overflow:auto; }
        .picker li { margin:1px 0; }
        .picker li button {
          width:100%; text-align:left; border:0; background:transparent; color:var(--text);
          padding:0 10px; min-height:36px; border-radius:6px; cursor:pointer;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 14px; font-weight: 400;
        }
        .picker li button:hover { background: color-mix(in srgb, var(--surface-2) 80%, transparent); }
        .empty-pick { padding:6px 8px; font-size:12px; color:var(--text-muted); }

        .foot-text { margin-top:22px; font-size:11.5px; color:var(--text-muted); line-height:1.5; }
        .foot-text a { color:inherit; text-decoration:underline; text-underline-offset:2px; }

        @media (max-width: 980px) {
          .activity-grid { grid-template-columns: 1fr; }
          .repo-meta { white-space: normal; max-width: none; }
        }
      `}</style>
    </div>
  )
}
