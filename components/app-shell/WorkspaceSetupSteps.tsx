'use client'

/**
 * Post-workspace steps inside the create chrome: first project → invite team.
 */

import { useEffect, useRef, useState } from 'react'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import { syncAutoGrowTextarea } from '@/lib/ui/auto-grow-textarea'
import {
  WORKSPACE_SETUP_COPY as S,
  PROJECT_INVITE_ROLES,
  PROJECT_INVITE_ROLE_LABELS,
  type ProjectInviteRole,
} from '@/lib/platform/workspace-setup'

type PersonHit = {
  id: string
  username: string | null
  name: string
  email: string | null
}

type Props = {
  mode: 'project' | 'invite'
  workspaceId: string
  projectId: string | null
  projectTitle: string | null
  onProjectCreated: (project: { id: string; title: string }) => void
  onDone: () => void
}

export default function WorkspaceSetupSteps({
  mode,
  workspaceId,
  projectId,
  onProjectCreated,
  onDone,
}: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  const [inviteMode, setInviteMode] = useState<'username' | 'email'>('username')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectInviteRole>('developer')
  const [people, setPeople] = useState<PersonHit[]>([])
  const [inviteFlash, setInviteFlash] = useState('')
  const [sentCount, setSentCount] = useState(0)

  useEffect(() => {
    if (mode === 'project') {
      window.setTimeout(() => titleRef.current?.focus(), 80)
    }
  }, [mode])

  useEffect(() => {
    syncAutoGrowTextarea(descRef.current)
  }, [description])

  useEffect(() => {
    if (inviteMode !== 'username') return
    const q = username.replace(/^@+/, '').trim()
    if (q.length < 2) {
      setPeople([])
      return
    }
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/people/search?q=${encodeURIComponent(q)}`, {
          credentials: 'include',
        })
        const data = await res.json().catch(() => null)
        setPeople(Array.isArray(data?.people) ? data.people : [])
      } catch {
        setPeople([])
      }
    }, 220)
    return () => window.clearTimeout(t)
  }, [username, inviteMode])

  async function createProject() {
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Bitte gib deinem Projekt einen Namen.')
      titleRef.current?.focus()
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/workspaces/first-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workspaceId,
          title: trimmed,
          description: description.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.message || 'Projekt konnte nicht erstellt werden.')
        setBusy(false)
        return
      }
      onProjectCreated({ id: String(data.project.id), title: String(data.project.title) })
    } catch {
      setError('Netzwerkproblem. Bitte erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  async function sendInvite(opts?: { username?: string; email?: string }) {
    if (!projectId) return
    setError('')
    setInviteFlash('')
    const u = (opts?.username ?? username).replace(/^@+/, '').trim()
    const e = (opts?.email ?? email).trim()
    if (inviteMode === 'username' && !u) {
      setError('Bitte einen @Nutzernamen eingeben.')
      return
    }
    if (inviteMode === 'email' && !e.includes('@')) {
      setError('Bitte eine gültige E-Mail eingeben.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/invites/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          role,
          ...(inviteMode === 'username' ? { username: u } : { email: e }),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.message || 'Einladung fehlgeschlagen.')
        setBusy(false)
        return
      }
      setSentCount((n) => n + 1)
      setInviteFlash(S.inviteSent)
      setUsername('')
      setEmail('')
      setPeople([])
    } catch {
      setError('Netzwerkproblem. Bitte erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'project') {
    return (
      <div className="wc-form wc-setup">
        <div className="wc-field-wrap">
          <div className="wc-field-shell has-value is-focused">
            <input
              ref={titleRef}
              className="wc-field-input"
              type="text"
              value={title}
              onChange={(e) => {
                setError('')
                setTitle(e.target.value)
              }}
              placeholder={S.projectNamePlaceholder}
              maxLength={160}
              aria-label={S.projectNameLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim() && !busy) {
                  e.preventDefault()
                  void createProject()
                }
              }}
            />
          </div>
        </div>

        <div className="wc-field-wrap wc-field-wrap--desc">
          <textarea
            ref={descRef}
            className="wc-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={S.projectDescPlaceholder}
            aria-label={S.projectDescLabel}
            rows={2}
          />
        </div>

        {error ? <p className="wc-error">{error}</p> : null}

        <div className="wc-continue-slot">
          <ContinueHint
            ready={Boolean(title.trim()) && !busy}
            label={S.projectCreate}
            onContinue={() => void createProject()}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="wc-form wc-setup">
      <div className="wc-invite-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={inviteMode === 'username'}
          className={`wc-invite-tab${inviteMode === 'username' ? ' is-on' : ''}`}
          onClick={() => {
            setInviteMode('username')
            setError('')
          }}
        >
          Festag-Nutzer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={inviteMode === 'email'}
          className={`wc-invite-tab${inviteMode === 'email' ? ' is-on' : ''}`}
          onClick={() => {
            setInviteMode('email')
            setError('')
          }}
        >
          E-Mail
        </button>
      </div>

      {inviteMode === 'username' ? (
        <div className="wc-field-wrap">
          <div className="wc-field-shell has-value">
            <input
              className="wc-field-input"
              type="text"
              value={username}
              onChange={(e) => {
                setError('')
                setInviteFlash('')
                setUsername(e.target.value)
              }}
              placeholder={S.inviteUsernamePlaceholder}
              aria-label={S.inviteUsernameLabel}
              autoComplete="off"
            />
          </div>
          {people.length > 0 ? (
            <ul className="wc-people">
              {people.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="wc-people-row"
                    onClick={() => {
                      setUsername(p.username ? `@${p.username}` : p.name)
                      setPeople([])
                      void sendInvite({
                        username: p.username || undefined,
                        email: p.username ? undefined : p.email || undefined,
                      })
                    }}
                  >
                    <span className="wc-people-name">{p.name}</span>
                    {p.username ? (
                      <span className="wc-people-handle">@{p.username}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="wc-field-wrap">
          <div className="wc-field-shell has-value">
            <input
              className="wc-field-input"
              type="email"
              value={email}
              onChange={(e) => {
                setError('')
                setInviteFlash('')
                setEmail(e.target.value)
              }}
              placeholder={S.inviteEmailPlaceholder}
              aria-label={S.inviteEmailLabel}
              autoComplete="off"
            />
          </div>
        </div>
      )}

      <div className="wc-role-grid" role="radiogroup" aria-label={S.inviteRoleLabel}>
        {PROJECT_INVITE_ROLES.map((r) => {
          const on = role === r
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={on}
              className={`wc-role-chip${on ? ' is-on' : ''}`}
              onClick={() => setRole(r)}
            >
              {PROJECT_INVITE_ROLE_LABELS[r]}
            </button>
          )
        })}
      </div>

      {error ? <p className="wc-error">{error}</p> : null}
      {inviteFlash ? <p className="wc-flash">{inviteFlash}</p> : null}

      <div className="wc-continue-slot">
        <ContinueHint
          ready={
            !busy &&
            (inviteMode === 'username'
              ? Boolean(username.replace(/^@+/, '').trim())
              : email.includes('@'))
          }
          label={S.inviteSend}
          onContinue={() => void sendInvite()}
        />
      </div>

      <div className="wc-continue-slot wc-continue-slot--secondary">
        <ContinueHint
          ready
          label={sentCount > 0 ? S.inviteContinue : S.inviteSkip}
          onContinue={onDone}
        />
      </div>
    </div>
  )
}
