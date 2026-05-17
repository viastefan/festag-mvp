'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, Question, X, EnvelopeSimple, Eye, ChatCircle, Trash, Check } from '@phosphor-icons/react'
import { autoAvatarColor, avatarInitials, avatarTextColor } from '@/lib/avatar'

type Observer = {
  id: string
  owner_user_id: string
  user_id: string | null
  email: string
  full_name: string | null
  access_level: 'read' | 'comment'
  project_ids: string[] | null
  status: 'pending' | 'joined' | 'revoked'
  invited_at: string
  joined_at: string | null
  last_seen_at: string | null
}

type Profile = {
  id: string
  first_name: string | null
  full_name: string | null
  avatar_url: string | null
  avatar_color: string | null
  email?: string
}

type Project = { id: string; title: string; color: string | null }

function ProjectTags({ ids, all, maxVisible = 2 }: { ids: string[] | null; all: Project[]; maxVisible?: number }) {
  // ids === null → alle Projekte
  const visible = ids === null ? all : all.filter(p => ids.includes(p.id))
  if (visible.length === 0) return <span style={{ color:'var(--text-muted)', fontSize:11.5 }}>keine</span>
  const shown = visible.slice(0, maxVisible)
  const rest = visible.length - shown.length
  return (
    <span className="obs-proj-tags">
      {shown.map(p => (
        <span key={p.id} className="obs-proj-tag" title={p.title}>
          <span className="dot" style={{ background: p.color || '#64748b' }} />
          {p.title}
        </span>
      ))}
      {rest > 0 && <span className="obs-proj-more" title={visible.slice(maxVisible).map(p => p.title).join(', ')}>+{rest}</span>}
    </span>
  )
}

function timeAgoShort(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  const h = Math.round(min / 60)
  if (h < 24) return `vor ${h}h`
  const d = Math.round(h / 24)
  if (d < 30) return `vor ${d} Tg.`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

export default function ObserversPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile | null>(null)
  const [observers, setObservers] = useState<Observer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteAccess, setInviteAccess] = useState<'read' | 'comment'>('read')
  const [inviteProjects, setInviteProjects] = useState<string[]>([])
  const [inviteAll, setInviteAll] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const [{ data: profile }, { data: obs }, { data: projs }] = await Promise.all([
        supabase.from('profiles').select('id,first_name,full_name,avatar_url,avatar_color').eq('id', user.id).single(),
        supabase.from('workspace_observers').select('*').eq('owner_user_id', user.id).order('invited_at', { ascending: false }),
        supabase.from('projects').select('id,title,color').order('created_at', { ascending: false }),
      ])
      setMe({ ...(profile as any), email: user.email ?? '' })
      setObservers((obs as Observer[]) ?? [])
      setProjects((projs as Project[]) ?? [])
      setLoading(false)
    })()
  }, [])

  async function handleInvite() {
    setInviteError('')
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setInviteError('Bitte gültige E-Mail-Adresse eingeben.'); return }
    if (!me) return
    setInviting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setInviting(false); return }
    const payload = {
      owner_user_id: user.id,
      email,
      full_name: inviteName.trim() || null,
      access_level: inviteAccess,
      project_ids: inviteAll ? null : inviteProjects,
      status: 'pending' as const,
    }
    const { data, error } = await supabase.from('workspace_observers').insert(payload).select().single()
    if (error) {
      setInviteError(error.message.includes('unique') ? 'Diese Person hast du bereits eingeladen.' : 'Fehler beim Einladen.')
      setInviting(false)
      return
    }
    setObservers(prev => [data as Observer, ...prev])
    setInviteOpen(false)
    setInviteEmail(''); setInviteName(''); setInviteAccess('read'); setInviteProjects([]); setInviteAll(true)
    setInviting(false)
  }

  async function revokeObserver(id: string) {
    if (!confirm('Diese Person wirklich entfernen?')) return
    await supabase.from('workspace_observers').delete().eq('id', id)
    setObservers(prev => prev.filter(o => o.id !== id))
  }

  const meName = me?.first_name || me?.full_name?.split(' ')[0] || me?.email?.split('@')[0] || 'Du'
  const meFullName = me?.full_name || meName
  const meBg = me?.avatar_color || autoAvatarColor(me?.id || me?.email || '')
  const meFg = avatarTextColor(meBg)
  const meInit = avatarInitials(me?.first_name ?? null, me?.full_name ?? null, me?.email)

  const totalCount = observers.length + 1 // +1 for owner

  return (
    <div className="page-content" style={{ maxWidth: undefined }}>
      <style>{`
        .obs-head {
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          margin-bottom:18px;
        }
        .obs-title-wrap { display:flex; align-items:center; gap:8px; }
        .obs-title { margin:0; font-size:18px; font-weight:600; color:var(--text); letter-spacing:-.01em; }
        .obs-help-btn {
          width:22px; height:22px; border-radius:999px;
          border:1px solid var(--border);
          background:transparent; color:var(--text-muted);
          display:inline-flex; align-items:center; justify-content:center;
          cursor:pointer; transition:background .1s, color .1s;
        }
        .obs-help-btn:hover { background:var(--surface-2); color:var(--text); }
        .obs-actions { display:flex; align-items:center; gap:8px; }
        .obs-btn {
          height:30px; padding:0 12px; border-radius:8px;
          display:inline-flex; align-items:center; gap:6px;
          font:inherit; font-size:12.5px; font-weight:600;
          cursor:pointer; transition:background .1s, border-color .1s, color .1s;
          border:1px solid var(--border); background:transparent; color:var(--text);
        }
        .obs-btn:hover { background:var(--surface-2); border-color:var(--border-strong); }
        .obs-btn.primary { background:var(--btn-prim); color:var(--btn-prim-text); border-color:transparent; }
        .obs-btn.primary:hover { background:color-mix(in srgb, var(--btn-prim) 88%, #000); }

        .obs-meta {
          margin:0 0 12px; color:var(--text-muted);
          font-size:12px; font-weight:500;
        }

        .obs-table { width:100%; }
        .obs-head-row, .obs-row {
          display:grid;
          grid-template-columns: minmax(220px, 1.5fr) 120px minmax(120px,.85fr) 92px 88px 32px;
          align-items:center;
          gap:12px;
          padding:0 10px;
        }
        .obs-head-row {
          min-height:34px;
          color:var(--text-muted);
          font-size:11px; font-weight:500;
          letter-spacing:.04em;
          border-bottom:1px solid var(--border);
        }
        .obs-row {
          min-height:52px;
          border-radius:8px;
          color:var(--text-secondary); font-size:12.5px;
          border-bottom:1px solid var(--border);
        }
        .obs-row:last-child { border-bottom:0; }
        .obs-row:hover { background:color-mix(in srgb, var(--surface-2) 50%, transparent); }
        .obs-name-cell { display:flex; align-items:center; gap:10px; min-width:0; }
        .obs-avatar {
          width:28px; height:28px; border-radius:999px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-size:10.5px; font-weight:700; letter-spacing:.02em;
        }
        .obs-name { color:var(--text); font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .obs-email { color:var(--text-muted); font-size:11.5px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .obs-pill {
          display:inline-flex; align-items:center; gap:5px;
          height:22px; padding:0 8px; border-radius:6px;
          font-size:11px; font-weight:600; letter-spacing:.01em;
        }
        .obs-pill.owner    { background:color-mix(in srgb, var(--accent) 14%, transparent); color:var(--accent); }
        .obs-pill.joined   { background:color-mix(in srgb, var(--green, #34c759) 14%, transparent); color:var(--green-dark, #28a745); }
        .obs-pill.pending  { background:color-mix(in srgb, var(--amber, #b98700) 16%, transparent); color:var(--amber-dark, #8a6500); }
        .obs-pill.revoked  { background:color-mix(in srgb, var(--text-muted) 14%, transparent); color:var(--text-muted); }
        .obs-row-action {
          width:24px; height:24px; border-radius:6px;
          display:inline-flex; align-items:center; justify-content:center;
          background:transparent; border:0; color:var(--text-muted);
          cursor:pointer; opacity:0; transition:opacity .1s, background .1s, color .1s;
        }
        .obs-row:hover .obs-row-action { opacity:1; }
        .obs-row-action:hover { background:var(--surface-2); color:var(--text); }

        .obs-proj-tags { display:inline-flex; align-items:center; gap:5px; flex-wrap:wrap; max-width:100%; min-width:0; }
        .obs-proj-tag {
          display:inline-flex; align-items:center; gap:5px;
          height:20px; padding:0 7px; border-radius:5px;
          background:color-mix(in srgb, var(--surface-2) 70%, transparent);
          border:1px solid var(--border);
          font-size:11px; font-weight:500;
          color:var(--text-secondary);
          max-width:140px;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .obs-proj-tag .dot { width:6px; height:6px; border-radius:999px; flex-shrink:0; }
        .obs-proj-more {
          display:inline-flex; align-items:center;
          height:20px; padding:0 6px; border-radius:5px;
          background:transparent; border:1px dashed var(--border);
          font-size:11px; font-weight:500;
          color:var(--text-muted);
        }
        .obs-empty {
          padding:32px 16px;
          text-align:center;
          color:var(--text-muted);
          border:1px dashed var(--border);
          border-radius:12px;
          background:color-mix(in srgb, var(--surface) 50%, transparent);
        }

        /* Modal */
        .obs-modal-bg {
          position:fixed; inset:0; background:rgba(10,13,20,.42);
          backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px);
          z-index:300; display:flex; align-items:center; justify-content:center;
          animation:obsFade .15s ease both;
        }
        @keyframes obsFade { from { opacity:0; } to { opacity:1; } }
        .obs-modal {
          width:min(480px, 92vw); max-height:90vh; overflow:auto;
          background:var(--surface); border:1px solid var(--border);
          border-radius:14px; padding:22px;
          box-shadow:0 20px 60px rgba(0,0,0,.2);
          animation:obsPop .18s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes obsPop { from { opacity:0; transform:translateY(8px) scale(.98); } to { opacity:1; transform:none; } }
        .obs-modal h2 { margin:0 0 4px; font-size:17px; font-weight:600; color:var(--text); letter-spacing:-.01em; }
        .obs-modal .obs-modal-sub { margin:0 0 18px; font-size:12.5px; color:var(--text-secondary); line-height:1.5; }
        .obs-modal-row { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
        .obs-modal-row label { font-size:11px; font-weight:600; color:var(--text-muted); letter-spacing:.06em; text-transform:uppercase; }
        .obs-modal-row input[type="text"],
        .obs-modal-row input[type="email"] {
          height:38px; padding:0 12px; border-radius:8px;
          border:1px solid var(--border); background:var(--inp); color:var(--text);
          font:inherit; font-size:13.5px; outline:none;
          transition:border-color .12s, box-shadow .12s;
        }
        .obs-modal-row input:focus { border-color:var(--inp-focus-border); box-shadow:0 0 0 3px var(--focus-ring); }
        .obs-segment { display:flex; gap:6px; }
        .obs-segment button {
          flex:1; height:36px; border-radius:8px; padding:0 12px;
          background:transparent; border:1px solid var(--border); color:var(--text-secondary);
          font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;
          display:inline-flex; align-items:center; justify-content:center; gap:6px;
          transition:background .1s, border-color .1s, color .1s;
        }
        .obs-segment button:hover { background:var(--surface-2); }
        .obs-segment button.on { background:color-mix(in srgb, var(--accent) 12%, transparent); border-color:var(--accent); color:var(--text); }
        .obs-checkbox-row { display:flex; align-items:center; gap:8px; padding:6px 0; font-size:13px; }
        .obs-checkbox-row input { width:14px; height:14px; cursor:pointer; }
        .obs-proj-list { display:flex; flex-direction:column; gap:2px; max-height:160px; overflow:auto; padding:6px; border:1px solid var(--border); border-radius:8px; background:color-mix(in srgb, var(--surface) 50%, transparent); }
        .obs-modal-err { color:var(--red, #c0362e); font-size:12px; margin:6px 0 0; }
        .obs-modal-footer { display:flex; justify-content:flex-end; gap:8px; margin-top:18px; }
        .obs-modal-close {
          position:absolute; top:14px; right:14px;
          width:28px; height:28px; border-radius:8px;
          border:0; background:transparent; color:var(--text-muted);
          display:inline-flex; align-items:center; justify-content:center;
          cursor:pointer; transition:background .1s, color .1s;
        }
        .obs-modal-close:hover { background:var(--surface-2); color:var(--text); }

        /* Help popover */
        .obs-help-modal { width:min(560px, 92vw); }
        .obs-help-graphic {
          width:100%; height:140px; border-radius:10px; margin-bottom:16px;
          background:linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, var(--surface)), color-mix(in srgb, var(--accent) 6%, var(--surface)));
          display:flex; align-items:center; justify-content:center; gap:14px;
          border:1px solid var(--border);
        }
        .obs-help-graphic-node {
          width:46px; height:46px; border-radius:999px;
          display:flex; align-items:center; justify-content:center;
          font-size:13px; font-weight:700; color:#fff;
          box-shadow:0 4px 14px rgba(0,0,0,.1);
        }
        .obs-help-list { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:10px; }
        .obs-help-list li { display:flex; gap:10px; font-size:13px; color:var(--text-secondary); line-height:1.55; }
        .obs-help-list li strong { color:var(--text); font-weight:600; }
        .obs-help-bullet {
          width:18px; height:18px; flex-shrink:0; margin-top:2px;
          border-radius:5px; background:color-mix(in srgb, var(--accent) 14%, transparent);
          display:inline-flex; align-items:center; justify-content:center;
          color:var(--accent); font-size:11px; font-weight:700;
        }
        .obs-help-link {
          margin-top:14px; display:inline-flex; align-items:center; gap:6px;
          font-size:13px; font-weight:600; color:var(--accent); text-decoration:none;
        }
        .obs-help-link:hover { text-decoration:underline; }

        @media(max-width:760px) {
          .obs-head-row, .obs-row {
            grid-template-columns: minmax(0, 1fr) 100px 28px;
          }
          .obs-col-projects, .obs-col-invited, .obs-col-seen { display:none; }
        }
      `}</style>

      <div className="obs-head">
        <div className="obs-title-wrap">
          <h1 className="obs-title">Mitbeobachter</h1>
          <button className="obs-help-btn" onClick={() => setHelpOpen(true)} aria-label="Was sind Mitbeobachter?" title="Was sind Mitbeobachter?">
            <Question size={13} weight="bold" />
          </button>
        </div>
        <div className="obs-actions">
          <button className="obs-btn primary" onClick={() => setInviteOpen(true)}>
            <Plus size={13} weight="bold" /> Mitbeobachter einladen
          </button>
        </div>
      </div>

      <p className="obs-meta">{loading ? 'Wird geladen…' : `${totalCount} ${totalCount === 1 ? 'Person' : 'Personen'} mit Zugriff`}</p>

      <div className="obs-table" role="table" aria-label="Mitbeobachter-Liste">
        <div className="obs-head-row" role="row">
          <span>Name</span>
          <span>Zugriff</span>
          <span className="obs-col-projects">Projekte</span>
          <span className="obs-col-invited">Eingeladen</span>
          <span className="obs-col-seen">Letzte Sicht</span>
          <span />
        </div>

        {/* Owner row — always first */}
        {me && (
          <div className="obs-row" role="row">
            <span className="obs-name-cell">
              {me.avatar_url ? (
                <img src={me.avatar_url} alt="" className="obs-avatar" style={{ objectFit:'cover' }} />
              ) : (
                <span className="obs-avatar" style={{ background: meBg, color: meFg }}>{meInit}</span>
              )}
              <span style={{ minWidth:0, overflow:'hidden' }}>
                <div className="obs-name">{meFullName} <span style={{ color:'var(--text-muted)', fontWeight:500, marginLeft:6 }}>(du)</span></div>
                <div className="obs-email">{me.email}</div>
              </span>
            </span>
            <span><span className="obs-pill owner">Inhaber</span></span>
            <span className="obs-col-projects">
              <ProjectTags ids={null} all={projects} maxVisible={2} />
            </span>
            <span className="obs-col-invited">—</span>
            <span className="obs-col-seen">gerade aktiv</span>
            <span />
          </div>
        )}

        {/* Observer rows */}
        {observers.map(o => {
          const bg = autoAvatarColor(o.user_id || o.email)
          const fg = avatarTextColor(bg)
          const init = avatarInitials(null, o.full_name, o.email)
          return (
            <div key={o.id} className="obs-row" role="row">
              <span className="obs-name-cell">
                <span className="obs-avatar" style={{ background: bg, color: fg }}>{init}</span>
                <span style={{ minWidth:0, overflow:'hidden' }}>
                  <div className="obs-name">{o.full_name || o.email}</div>
                  <div className="obs-email">{o.email}</div>
                </span>
              </span>
              <span>
                <span className={`obs-pill ${o.status}`}>
                  {o.status === 'joined' && <Check size={11} weight="bold" />}
                  {o.status === 'joined' ? (o.access_level === 'comment' ? 'Kommentar' : 'Lesen') : o.status === 'pending' ? 'Ausstehend' : 'Entfernt'}
                </span>
              </span>
              <span className="obs-col-projects">
                <ProjectTags ids={o.project_ids} all={projects} maxVisible={2} />
              </span>
              <span className="obs-col-invited">{dateShort(o.invited_at)}</span>
              <span className="obs-col-seen">{timeAgoShort(o.last_seen_at)}</span>
              <span>
                <button className="obs-row-action" onClick={() => revokeObserver(o.id)} title="Zugriff entfernen" aria-label="Zugriff entfernen">
                  <Trash size={13} weight="regular" />
                </button>
              </span>
            </div>
          )
        })}

        {!loading && observers.length === 0 && (
          <div className="obs-empty">
            <p style={{ margin:'0 0 6px', fontSize:13.5, fontWeight:600, color:'var(--text)' }}>Noch niemand beobachtet mit.</p>
            <p style={{ margin:'0 0 14px', fontSize:12.5 }}>Lade Co-Founder, Marketing oder Partner ein, deine Projekte still mitzuverfolgen.</p>
            <button className="obs-btn primary" onClick={() => setInviteOpen(true)}>
              <Plus size={13} weight="bold" /> Erste Person einladen
            </button>
          </div>
        )}
      </div>

      {/* ── Invite Modal ── */}
      {inviteOpen && (
        <div className="obs-modal-bg" onClick={() => !inviting && setInviteOpen(false)}>
          <div className="obs-modal" style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
            <button className="obs-modal-close" onClick={() => setInviteOpen(false)} aria-label="Schließen"><X size={15} /></button>
            <h2>Mitbeobachter einladen</h2>
            <p className="obs-modal-sub">Read-only Zugriff auf ausgewählte Projekte. Tagro hält die Person automatisch auf dem Stand — du musst nichts senden.</p>

            <div className="obs-modal-row">
              <label htmlFor="obs-email">E-Mail</label>
              <input id="obs-email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="anna@firma.de" autoFocus />
            </div>
            <div className="obs-modal-row">
              <label htmlFor="obs-name">Name (optional)</label>
              <input id="obs-name" type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Anna Berger" />
            </div>

            <div className="obs-modal-row">
              <label>Zugriffslevel</label>
              <div className="obs-segment">
                <button type="button" className={inviteAccess === 'read' ? 'on' : ''} onClick={() => setInviteAccess('read')}>
                  <Eye size={13} weight="regular" /> Lesen
                </button>
                <button type="button" className={inviteAccess === 'comment' ? 'on' : ''} onClick={() => setInviteAccess('comment')}>
                  <ChatCircle size={13} weight="regular" /> Kommentar
                </button>
              </div>
            </div>

            <div className="obs-modal-row">
              <label>Sichtbare Projekte</label>
              <div className="obs-checkbox-row">
                <input id="obs-all" type="checkbox" checked={inviteAll} onChange={e => setInviteAll(e.target.checked)} />
                <label htmlFor="obs-all" style={{ fontSize:13, fontWeight:500, color:'var(--text)', letterSpacing:0, textTransform:'none' }}>Alle aktuellen & neuen Projekte</label>
              </div>
              {!inviteAll && projects.length > 0 && (
                <div className="obs-proj-list">
                  {projects.map(p => {
                    const checked = inviteProjects.includes(p.id)
                    return (
                      <div key={p.id} className="obs-checkbox-row">
                        <input
                          id={`p-${p.id}`}
                          type="checkbox"
                          checked={checked}
                          onChange={() => setInviteProjects(prev => checked ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                        />
                        <label htmlFor={`p-${p.id}`} style={{ fontSize:13, fontWeight:500, color:'var(--text)', letterSpacing:0, textTransform:'none', display:'inline-flex', alignItems:'center', gap:7 }}>
                          <span style={{ width:8, height:8, borderRadius:999, background:p.color || '#64748b', display:'inline-block' }} />
                          {p.title}
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {inviteError && <p className="obs-modal-err">{inviteError}</p>}

            <div className="obs-modal-footer">
              <button className="obs-btn" onClick={() => setInviteOpen(false)} disabled={inviting}>Abbrechen</button>
              <button className="obs-btn primary" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                <EnvelopeSimple size={13} weight="regular" />
                {inviting ? 'Einladung wird gesendet…' : 'Einladung senden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Help Modal ── */}
      {helpOpen && (
        <div className="obs-modal-bg" onClick={() => setHelpOpen(false)}>
          <div className="obs-modal obs-help-modal" style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
            <button className="obs-modal-close" onClick={() => setHelpOpen(false)} aria-label="Schließen"><X size={15} /></button>
            <div className="obs-help-graphic" aria-hidden="true">
              <div className="obs-help-graphic-node" style={{ background:'#5B647D' }}>DU</div>
              <svg width="32" height="20" viewBox="0 0 32 20" aria-hidden="true">
                <path d="M2 10 L30 10" stroke="var(--text-muted)" strokeWidth="1.4" strokeDasharray="3 3" />
                <path d="M24 4 L30 10 L24 16" stroke="var(--text-muted)" strokeWidth="1.4" fill="none" />
              </svg>
              <div className="obs-help-graphic-node" style={{ background:'#7B8294' }}><Eye size={20} weight="bold" /></div>
              <svg width="32" height="20" viewBox="0 0 32 20" aria-hidden="true">
                <path d="M2 10 L30 10" stroke="var(--text-muted)" strokeWidth="1.4" strokeDasharray="3 3" />
                <path d="M24 4 L30 10 L24 16" stroke="var(--text-muted)" strokeWidth="1.4" fill="none" />
              </svg>
              <div className="obs-help-graphic-node" style={{ background:'#A0A8B8' }}>👁</div>
            </div>

            <h2>Was sind Mitbeobachter?</h2>
            <p className="obs-modal-sub">Stille Stakeholder, die deine Projekte mitverfolgen — ohne mitzubauen. Co-Founder, Marketing, Eltern, Investoren, Partner. Lese- oder Kommentar-Zugriff, projekt-genau gewählt.</p>

            <ul className="obs-help-list">
              <li><span className="obs-help-bullet">1</span><span><strong>Read-only Zugriff</strong> — Mitbeobachter sehen Status, Briefings und Tasks, können aber nichts ändern. Sie tauchen nirgendwo als „Member" auf.</span></li>
              <li><span className="obs-help-bullet">2</span><span><strong>Projekt-scoped</strong> — du wählst pro Person aus, welche Projekte sichtbar sind. Andere Projekte bleiben unsichtbar.</span></li>
              <li><span className="obs-help-bullet">3</span><span><strong>Tagro hält sie informiert</strong> — keine manuellen Status-Mails. Mitbeobachter bekommen automatisch das Briefing zum Projektstand.</span></li>
              <li><span className="obs-help-bullet">4</span><span><strong>Jederzeit entziehbar</strong> — du kannst den Zugriff mit einem Klick widerrufen. Daten bleiben bei dir.</span></li>
            </ul>

            <Link href="/blog/mitbeobachter" className="obs-help-link" target="_blank">
              Mehr erfahren im Festag-Blog →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
