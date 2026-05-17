'use client'

/**
 * Team — calm workspace overview.
 *
 * Ersetzt die alte Szenarien/Roles/Seats-Tab-Wand durch eine ruhige
 * Single-Page-Übersicht: Mitglieder, offene Einladungen, Sitz-Status.
 * Alles in kleinen Schriften, viel Weißraum, kein dekoratives Card-Theater.
 */

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ArrowRight, Check } from '@phosphor-icons/react'

type Member = {
  id: string
  first_name?: string | null
  full_name?: string | null
  avatar_url?: string | null
  role?: string | null
  email?: string | null
  created_at?: string | null
}

type InviteRow = {
  id: string
  email: string
  role: string | null
  invited_name?: string | null
  status: string | null
  created_at: string
}

type SeatStat = {
  used: number
  total: number | null
}

const ROLE_LABEL: Record<string, string> = {
  founder:       'Founder',
  collaborator:  'Mitarbeitende:r',
  developer:     'Entwickler:in',
  designer:      'Designer:in',
  marketing:     'Marketing',
  client:        'Kunde',
  client_admin:  'Kunden-Admin',
  reviewer:      'Reviewer',
  admin:         'Admin',
  dev:           'Entwickler:in',
}

function initials(m: Member) {
  const name = (m.full_name || m.first_name || m.email || '?').trim()
  return name.slice(0, 1).toUpperCase()
}
function displayName(m: Member) {
  return m.full_name || m.first_name || m.email || '—'
}
function timeAgo(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const day = 24 * 3600 * 1000
  if (diff < day) return 'heute'
  if (diff < 2 * day) return 'gestern'
  const days = Math.floor(diff / day)
  if (days < 30) return `vor ${days} Tagen`
  const months = Math.floor(days / 30)
  return `vor ${months} Monaten`
}

export default function TeamsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<Member | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [seats, setSeats] = useState<SeatStat>({ used: 0, total: null })
  const [loading, setLoading] = useState(true)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invRole, setInvRole] = useState('collaborator')
  const [invName, setInvName] = useState('')
  const [invSending, setInvSending] = useState(false)
  const [invSent, setInvSent] = useState<string | null>(null)
  const [invError, setInvError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const uid = session.user.id

      const [{ data: prof }, { data: tmRows }] = await Promise.all([
        supabase.from('profiles').select('id,first_name,full_name,avatar_url,role,email,created_at').eq('id', uid).single(),
        supabase.from('team_members').select('member_id').eq('owner_id', uid),
      ])
      if (cancelled) return
      const myProf = (prof as Member | null) ?? null
      setMe(myProf)

      const ids = ((tmRows as any[]) ?? []).map(r => r.member_id).filter(Boolean) as string[]
      let list: Member[] = []
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id,first_name,full_name,avatar_url,role,email,created_at')
          .in('id', ids)
        list = ((profs as Member[] | null) ?? [])
      }
      if (myProf && !list.find(m => m.id === myProf.id)) list.unshift(myProf)
      if (cancelled) return
      setMembers(list)

      // Pending invites (best-effort; table may not exist in some envs)
      try {
        const { data: inv } = await supabase
          .from('team_invites')
          .select('id,email,role,invited_name,status,created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
        if (!cancelled) setInvites(((inv as InviteRow[] | null) ?? []))
      } catch { /* ignore */ }

      // Seats (best-effort)
      try {
        const { data: s } = await supabase
          .from('seats')
          .select('id,status')
        if (!cancelled && Array.isArray(s)) {
          setSeats({
            used: s.filter((x: any) => x.status === 'active' || x.status === 'invited').length,
            total: s.length,
          })
        }
      } catch { /* ignore */ }

      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase])

  async function sendInvite() {
    setInvError('')
    const email = invEmail.trim().toLowerCase()
    if (!email.includes('@')) { setInvError('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
    setInvSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role: invRole,
          name: invName.trim() || undefined,
          fromUserId: user?.id ?? null,
          fromUserEmail: user?.email ?? null,
          accessMode: 'team',
        }),
      })
      const ok = res.ok
      if (!ok) { setInvError('Einladung konnte nicht gesendet werden.'); setInvSending(false); return }
      setInvSent(email)
      // Refresh invites
      try {
        const { data: inv } = await supabase
          .from('team_invites')
          .select('id,email,role,invited_name,status,created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
        setInvites(((inv as InviteRow[] | null) ?? []))
      } catch {}
      setInvEmail(''); setInvName('')
      setTimeout(() => { setInvSent(null); setInviteOpen(false) }, 1800)
    } catch {
      setInvError('Netzwerkfehler. Versuche es bitte erneut.')
    } finally {
      setInvSending(false)
    }
  }

  async function cancelInvite(id: string) {
    if (!confirm('Einladung zurückziehen?')) return
    await supabase.from('team_invites').update({ status: 'cancelled' }).eq('id', id)
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  if (loading) {
    return (
      <div className="team-page">
        <style>{CSS}</style>
        <div className="team-loading">Lade Team…</div>
      </div>
    )
  }

  return (
    <div className="team-page">
      <style>{CSS}</style>

      {/* Header */}
      <header className="team-head">
        <div>
          <p className="team-kicker">Workspace · Team</p>
          <h1 className="team-title">Team</h1>
          <p className="team-sub">
            {members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}
            {seats.total !== null ? ` · ${seats.used}/${seats.total} Sitze belegt` : ''}
            {invites.length > 0 ? ` · ${invites.length} offene Einladung${invites.length === 1 ? '' : 'en'}` : ''}
          </p>
        </div>
        <button className="team-btn team-btn-primary" type="button" onClick={() => setInviteOpen(true)}>
          <Plus size={12} /> Mitglied einladen
        </button>
      </header>

      {/* Members */}
      <section className="team-block">
        <div className="team-block-head">
          <h2>Mitglieder</h2>
          <span className="team-block-count">{members.length}</span>
        </div>
        {members.length === 0 ? (
          <p className="team-empty">Noch keine Mitglieder.</p>
        ) : (
          <ul className="team-list">
            {members.map(m => {
              const isMe = me?.id === m.id
              return (
                <li key={m.id} className="team-row">
                  <div className="team-avatar">
                    {m.avatar_url ? <img src={m.avatar_url} alt="" /> : <span>{initials(m)}</span>}
                  </div>
                  <div className="team-col-name">
                    <span className="team-name">
                      {displayName(m)}
                      {isMe && <span className="team-you">du</span>}
                    </span>
                    <span className="team-meta">{m.email || '—'}</span>
                  </div>
                  <div className="team-col-role">
                    <span className="team-chip">{ROLE_LABEL[m.role ?? ''] || m.role || 'Mitglied'}</span>
                  </div>
                  <div className="team-col-since">
                    seit {timeAgo(m.created_at)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="team-block">
          <div className="team-block-head">
            <h2>Offene Einladungen</h2>
            <span className="team-block-count">{invites.length}</span>
          </div>
          <ul className="team-list">
            {invites.map(inv => (
              <li key={inv.id} className="team-row">
                <div className="team-avatar team-avatar-ghost">
                  <span>{(inv.email || '?').slice(0, 1).toUpperCase()}</span>
                </div>
                <div className="team-col-name">
                  <span className="team-name">{inv.invited_name || inv.email}</span>
                  <span className="team-meta">{inv.email}</span>
                </div>
                <div className="team-col-role">
                  <span className="team-chip">{ROLE_LABEL[inv.role ?? ''] || inv.role || 'Mitarbeitende:r'}</span>
                </div>
                <div className="team-col-since">
                  gesendet {timeAgo(inv.created_at)}
                </div>
                <button className="team-row-action" type="button" onClick={() => cancelInvite(inv.id)} title="Einladung zurückziehen">
                  Zurückziehen
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer help line */}
      <p className="team-foot">
        Festag-Teams werden über E-Mail-Einladungen erweitert.
        Eingeladene öffnen den Link und sind direkt im Workspace.
      </p>

      {/* Invite modal */}
      {inviteOpen && (
        <div className="team-modal-backdrop" onMouseDown={() => setInviteOpen(false)}>
          <div className="team-modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className="team-modal-head">
              <div>
                <p className="team-kicker">Einladung</p>
                <h3>Mitglied einladen</h3>
              </div>
              <button className="team-modal-close" type="button" onClick={() => setInviteOpen(false)} aria-label="Schließen">
                <X size={14} />
              </button>
            </header>

            {invSent ? (
              <div className="team-modal-success">
                <Check size={14} />
                <span>Einladung an <strong>{invSent}</strong> gesendet.</span>
              </div>
            ) : (
              <>
                <label className="team-field">
                  <span>E-Mail-Adresse</span>
                  <input
                    type="email"
                    value={invEmail}
                    onChange={e => setInvEmail(e.target.value)}
                    placeholder="name@firma.com"
                    autoFocus
                  />
                </label>
                <label className="team-field">
                  <span>Anzeigename (optional)</span>
                  <input
                    type="text"
                    value={invName}
                    onChange={e => setInvName(e.target.value)}
                    placeholder="z. B. Anna Schmidt"
                  />
                </label>
                <label className="team-field">
                  <span>Rolle</span>
                  <select value={invRole} onChange={e => setInvRole(e.target.value)}>
                    <option value="collaborator">Mitarbeitende:r</option>
                    <option value="developer">Entwickler:in</option>
                    <option value="designer">Designer:in</option>
                    <option value="marketing">Marketing</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="client">Kunde</option>
                  </select>
                </label>

                {invError && <p className="team-modal-error">{invError}</p>}

                <div className="team-modal-actions">
                  <button className="team-btn" type="button" onClick={() => setInviteOpen(false)}>Abbrechen</button>
                  <button className="team-btn team-btn-primary" type="button" onClick={sendInvite} disabled={invSending}>
                    {invSending ? 'Sende…' : <>Einladung senden <ArrowRight size={11} /></>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const CSS = `
  .team-page {
    max-width: 1040px;
    margin: 0 auto;
    padding: 28px clamp(18px, 3vw, 40px) 80px;
    color: var(--text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .team-loading { padding: 64px 0; text-align: center; color: var(--text-muted); font-size: 13px; }

  /* Header */
  .team-head {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; margin-bottom: 28px;
  }
  .team-kicker { margin: 0; font-size: 11px; font-weight: 600; letter-spacing: .04em; color: var(--text-muted); text-transform: uppercase; }
  .team-title  { margin: 6px 0 4px; font-size: 22px; font-weight: 500; letter-spacing: -.01em; color: var(--text); }
  .team-sub    { margin: 0; font-size: 12.5px; color: var(--text-secondary); }

  .team-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 13px; border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface); color: var(--text);
    font-family: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
    transition: background .12s, border-color .12s;
  }
  .team-btn:hover { background: var(--surface-2); }
  .team-btn:disabled { opacity: .55; cursor: not-allowed; }
  .team-btn-primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
  .team-btn-primary:hover { background: color-mix(in srgb, var(--accent) 88%, #000); }

  /* Blocks */
  .team-block { margin-bottom: 28px; }
  .team-block-head {
    display: flex; align-items: baseline; gap: 8px;
    padding-bottom: 8px; margin-bottom: 4px;
    border-bottom: 1px solid var(--border);
  }
  .team-block-head h2 {
    margin: 0; font-size: 12px; font-weight: 600;
    color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase;
  }
  .team-block-count { font-size: 11px; color: var(--text-muted); opacity: .65; }

  .team-empty { margin: 12px 0; font-size: 12.5px; color: var(--text-muted); }

  /* List */
  .team-list { list-style: none; padding: 0; margin: 0; }
  .team-row {
    display: grid;
    grid-template-columns: 28px minmax(180px, 1.5fr) 180px 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 10px 4px;
    border-bottom: 1px solid var(--border);
    font-size: 12.5px;
  }
  .team-row:last-child { border-bottom: none; }
  .team-row:hover { background: color-mix(in srgb, var(--surface-2) 50%, transparent); }

  .team-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--surface-2);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600; color: var(--text-secondary);
    overflow: hidden;
  }
  .team-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .team-avatar-ghost { background: transparent; border: 1px dashed var(--border); color: var(--text-muted); }

  .team-col-name { display: flex; flex-direction: column; min-width: 0; }
  .team-name { color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .team-meta { color: var(--text-muted); font-size: 11.5px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .team-you {
    margin-left: 6px; font-size: 10px; font-weight: 600;
    color: var(--accent); padding: 1px 6px;
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    border-radius: 4px; letter-spacing: .04em; text-transform: uppercase;
  }

  .team-col-role { display: flex; }
  .team-chip {
    font-size: 11px; font-weight: 500;
    color: var(--text-secondary);
    background: var(--surface-2); border: 1px solid var(--border);
    padding: 2px 8px; border-radius: 5px;
  }
  .team-col-since { color: var(--text-muted); font-size: 11.5px; }
  .team-row-action {
    font-size: 11px; color: var(--text-muted); background: transparent;
    border: 1px solid var(--border); border-radius: 6px;
    padding: 3px 8px; cursor: pointer; font-family: inherit;
  }
  .team-row-action:hover { color: var(--text); }

  .team-foot {
    margin: 36px 0 0; font-size: 12px; color: var(--text-muted);
    max-width: 480px; line-height: 1.55;
  }

  /* Modal */
  .team-modal-backdrop {
    position: fixed; inset: 0; background: color-mix(in srgb, #000 38%, transparent);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 16px;
  }
  .team-modal {
    width: 100%; max-width: 380px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 18px;
    box-shadow: 0 18px 60px rgba(0,0,0,.22);
  }
  .team-modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
  .team-modal-head h3 { margin: 4px 0 0; font-size: 15px; font-weight: 600; color: var(--text); }
  .team-modal-close {
    width: 26px; height: 26px; border-radius: 7px;
    border: 1px solid var(--border); background: transparent;
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted); cursor: pointer;
  }
  .team-modal-close:hover { color: var(--text); }

  .team-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; font-size: 11.5px; color: var(--text-muted); }
  .team-field input, .team-field select {
    background: transparent; border: 1px solid var(--border); border-radius: 7px;
    padding: 7px 11px; font-size: 13px; color: var(--text); font-family: inherit; outline: none;
  }
  .team-field input:focus, .team-field select:focus { border-color: var(--accent); }

  .team-modal-error {
    margin: 4px 0 8px; padding: 8px 10px;
    border: 1px solid var(--border); border-radius: 7px;
    font-size: 12px; color: var(--text-secondary);
    display: flex; align-items: flex-start; gap: 8px;
  }
  .team-modal-error::before {
    content: ''; display: inline-block;
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent); margin-top: 5px; flex-shrink: 0;
  }
  .team-modal-success {
    display: flex; align-items: center; gap: 8px;
    padding: 14px; border: 1px solid var(--border); border-radius: 8px;
    color: var(--text-secondary); font-size: 12.5px;
  }
  .team-modal-success svg { color: var(--accent); flex-shrink: 0; }

  .team-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }

  @media (max-width: 700px) {
    .team-row {
      grid-template-columns: 28px 1fr auto;
      gap: 10px;
    }
    .team-col-role, .team-col-since { display: none; }
    .team-row-action { font-size: 10px; padding: 2px 6px; }
  }
`
