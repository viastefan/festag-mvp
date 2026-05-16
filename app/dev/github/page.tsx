'use client'

/**
 * /dev/github — GitHub-Integration für Developer.
 *
 * Erste, ehrliche Version:
 *  - zeigt den Verbindungsstatus (profile.provider + github_username)
 *  - listet bereits verknüpfte Repos (github_repositories)
 *  - "Sync now" + "Repo hinzufügen" sind Stubs, die ihre API-Routen
 *    aufrufen. Die Routen liefern derzeit nur acknowledgement; die
 *    eigentliche GitHub-API-Logik kommt in Folgeschritt (Webhooks +
 *    Cron Daily Sync).
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GithubLogo, ArrowsClockwise, Plus, CheckCircle, WarningCircle } from '@phosphor-icons/react'

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
}

type ProjectLite = { id: string; title: string }

export default function DevGithubPage() {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addFullName, setAddFullName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addProject, setAddProject] = useState<string>('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const [{ data: prof }, { data: r }, { data: pa }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,provider,github_username,github_avatar_url,github_connected_at')
          .eq('id', session.user.id).maybeSingle(),
        supabase
          .from('github_repositories')
          .select('id,project_id,owner,repo_name,repo_full_name,repo_url,default_branch,active,created_at')
          .eq('developer_id', session.user.id).order('created_at', { ascending: false }),
        supabase
          .from('project_assignments')
          .select('project_id,projects(id,title)')
          .eq('user_id', session.user.id).eq('active', true),
      ])
      if (cancelled) return
      setProfile(prof as Profile | null)
      setRepos(((r as Repo[] | null) ?? []))
      const ps = ((pa as any[] | null) ?? [])
        .map(row => row.projects)
        .filter(Boolean) as ProjectLite[]
      setProjects(ps)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase])

  async function connectGitHub() {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dev/github`,
        scopes: 'read:user user:email read:org',
      },
    } as any)
    if (error) alert('GitHub-Verbindung fehlgeschlagen: ' + error.message)
  }

  async function syncNow() {
    setSyncMsg(null); setSyncing(true)
    try {
      const res = await fetch('/api/github/sync', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      setSyncMsg(d?.ok ? `Sync erfolgreich · ${d.commits ?? 0} commits, ${d.prs ?? 0} PRs` : (d?.error || 'Sync nicht möglich.'))
    } catch {
      setSyncMsg('Netzwerkfehler beim Sync.')
    } finally {
      setSyncing(false)
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
    } catch {
      setAddError('Netzwerkfehler.')
    } finally {
      setAddBusy(false)
    }
  }

  const isConnected = profile?.provider === 'github' || !!profile?.github_username

  return (
    <div className="dev-page">
      <header className="dev-page-header">
        <div>
          <p className="dev-eyebrow">DEV · GitHub</p>
          <h1>GitHub-Verbindung</h1>
          <p className="meta">
            Tagro liest hier Commits, PRs und Branch-Aktivität und übersetzt sie für Clients in verständliche Statusberichte.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="dev-secondary-btn" type="button" onClick={syncNow} disabled={syncing || !isConnected}>
            <ArrowsClockwise size={13} style={{ marginRight: 6 }} /> {syncing ? 'Sync läuft…' : 'Sync now'}
          </button>
          <button className="dev-primary-btn" type="button" onClick={() => setAddOpen(v => !v)} disabled={!isConnected}>
            <Plus size={13} style={{ marginRight: 6 }} /> Repo verknüpfen
          </button>
        </div>
      </header>

      {/* Status card */}
      <div className="dev-surface" style={{ padding: 16, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <GithubLogo size={22} weight="regular" style={{ flexShrink: 0 }} />
        {loading ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Lade Status…</span>
        ) : isConnected ? (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
                {profile?.github_username ? `@${profile.github_username}` : 'GitHub verbunden'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
                seit {profile?.github_connected_at ? new Date(profile.github_connected_at).toLocaleDateString('de-DE') : '—'}
              </p>
            </div>
            <span className="dev-chip" style={{ color: 'var(--accent)', borderColor: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}>
              <CheckCircle size={11} weight="fill" /> verbunden
            </span>
          </>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
                GitHub ist noch nicht verbunden.
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Connect GitHub to let Tagro understand what changed in your code.
              </p>
            </div>
            <button className="dev-primary-btn" type="button" onClick={connectGitHub}>
              GitHub verbinden
            </button>
          </>
        )}
      </div>

      {syncMsg && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>{syncMsg}</p>
      )}

      {/* Add-repo composer */}
      {addOpen && (
        <div className="dev-surface" style={{ padding: 14, marginBottom: 18 }}>
          <p className="dev-section-title">Repo hinzufügen</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input
              value={addFullName}
              onChange={e => setAddFullName(e.target.value)}
              placeholder="owner/repo"
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', fontSize: 13, color: 'var(--text)' }}
            />
            <input
              value={addUrl}
              onChange={e => setAddUrl(e.target.value)}
              placeholder="https://github.com/owner/repo (optional)"
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', fontSize: 13, color: 'var(--text)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Projekt</label>
            <select
              value={addProject}
              onChange={e => setAddProject(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 13, color: 'var(--text)' }}
            >
              <option value="">— kein Projekt —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          {addError && <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><WarningCircle size={12} /> {addError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="dev-secondary-btn" type="button" onClick={() => setAddOpen(false)}>Abbrechen</button>
            <button className="dev-primary-btn" type="button" onClick={addRepo} disabled={addBusy}>
              {addBusy ? 'Wird gespeichert…' : 'Verknüpfen'}
            </button>
          </div>
        </div>
      )}

      {/* Repo list */}
      <p className="dev-section-title">Verknüpfte Repositories</p>
      <div className="dev-surface" style={{ overflow: 'hidden' }}>
        {repos.length === 0 ? (
          <p style={{ margin: 0, padding: 18, fontSize: 12.5, color: 'var(--text-muted)' }}>
            Noch keine Repos verknüpft.
          </p>
        ) : (
          repos.map((r, i) => (
            <div key={r.id} className="dev-row" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', borderRadius: 0 }}>
              <GithubLogo size={14} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.repo_full_name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
                  default: {r.default_branch || 'main'}
                  {r.project_id ? ' · verknüpft mit Projekt' : ' · nicht zugeordnet'}
                </p>
              </div>
              <a href={r.repo_url} target="_blank" rel="noreferrer" className="dev-chip">
                öffnen
              </a>
            </div>
          ))
        )}
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 20, lineHeight: 1.55 }}>
        Tagro liest aktuell read-only (Commits, PRs, Branches). Pushes oder
        Issues werden nicht von Festag aus erstellt. Du behältst volle
        Kontrolle über dein Repository.
      </p>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14 }}>
        <Link href="/dev" style={{ color: 'inherit' }}>← zurück zur Übersicht</Link>
      </p>
    </div>
  )
}
