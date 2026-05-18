'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, Question, X, EnvelopeSimple, Eye, ChatCircle, Trash, Check, UsersThree } from '@phosphor-icons/react'
import { autoAvatarColor, avatarInitials, avatarTextColor } from '@/lib/avatar'
import { subscribeProfileSync } from '@/lib/profile-sync'

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
  const [inviteRole, setInviteRole] = useState<string>('')
  const [inviteRoleCustom, setInviteRoleCustom] = useState('')
  const [inviteProjects, setInviteProjects] = useState<string[]>([])
  const [inviteAll, setInviteAll] = useState(true)
  const [invitePerms, setInvitePerms] = useState({
    read: true,
    comment: false,
    create_tasks: false,
    tagro_propose: false,
    review_status_reports: false,
    comment_dev_tasks: false,
  })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const ROLE_PRESETS = ['Co-Founder', 'Marketing', 'Investor', 'Beirat', 'Partner', 'Berater']

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

  // Live sync: Avatar/Name aus Settings ohne Reload aufnehmen
  useEffect(() => subscribeProfileSync(payload => {
    setMe(prev => prev ? {
      ...prev,
      full_name: payload.fullName !== undefined ? payload.fullName : prev.full_name,
      first_name: payload.firstName !== undefined ? payload.firstName : prev.first_name,
      avatar_url: payload.avatarUrl !== undefined ? payload.avatarUrl : prev.avatar_url,
      avatar_color: payload.avatarColor !== undefined ? payload.avatarColor : prev.avatar_color,
    } : prev)
  }), [])

  async function handleInvite() {
    setInviteError('')
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setInviteError('Bitte gültige E-Mail-Adresse eingeben.'); return }
    const finalRole = inviteRole === 'custom' ? inviteRoleCustom.trim() : inviteRole
    if (!finalRole) { setInviteError('Bitte eine Rolle wählen.'); return }
    if (!me) return
    setInviting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setInviting(false); return }
    const payload = {
      owner_user_id: user.id,
      email,
      full_name: inviteName.trim() || null,
      role: finalRole,
      access_level: invitePerms.comment ? 'comment' : 'read',
      permissions: {
        read: true,
        comment: invitePerms.comment,
        create_tasks: invitePerms.create_tasks,
        tagro_propose: invitePerms.tagro_propose,
        review_status_reports: invitePerms.review_status_reports,
        comment_dev_tasks: invitePerms.comment_dev_tasks,
      },
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
    const token = (data as any).invite_token as string | undefined
    if (token && typeof window !== 'undefined') {
      setInviteLink(`${window.location.origin}/i/${token}`)
    }
    setInviteEmail(''); setInviteName(''); setInviteAccess('read'); setInviteRole(''); setInviteRoleCustom(''); setInviteProjects([]); setInviteAll(true)
    setInvitePerms({ read:true, comment:false, create_tasks:false, tagro_propose:false, review_status_reports:false, comment_dev_tasks:false })
    setInviting(false)
  }

  function closeInvite() {
    setInviteOpen(false)
    setInviteLink(null)
    setLinkCopied(false)
    setInviteError('')
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {}
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
    <div className="obs-os">
      <style>{`
        .obs-os {
          width:100%; height:100%; min-height:0;
          color:var(--text);
          padding:20px 0 0;
          display:flex; flex-direction:column;
          overflow:hidden;
          animation: obsEnter .22s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes obsEnter { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .obs-scroll {
          flex:1 1 auto; min-height:0;
          overflow-y:auto; overflow-x:hidden;
          padding:0 18px 76px;
          scrollbar-gutter:stable;
          overscroll-behavior:contain;
        }
        .obs-top {
          display:flex; align-items:center; justify-content:space-between;
          min-height:34px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
          padding:0 18px 12px;
          margin-bottom:0;
        }
        .obs-title-wrap { display:flex; align-items:center; gap:8px; }
        .obs-title { margin:0; font-size:14.5px; font-weight:500; letter-spacing:.015em; color:var(--text); }
        .obs-help-btn {
          width:20px; height:20px; border-radius:999px;
          border:1px solid color-mix(in srgb, var(--border) 80%, transparent);
          background:transparent; color:var(--text-muted);
          display:inline-flex; align-items:center; justify-content:center;
          cursor:pointer; transition:background .12s ease, color .12s ease, border-color .12s ease;
        }
        .obs-help-btn:hover { background:var(--surface-2); color:var(--text); border-color:var(--border-strong); }
        .obs-create {
          height:30px; padding:0 9px 0 12px;
          border:1px solid transparent; border-radius:8px;
          background:transparent; color:var(--text-secondary);
          display:flex; align-items:center; gap:8px;
          font:inherit; font-size:12px; font-weight:500; letter-spacing:.015em;
          cursor:pointer;
          transition: background .12s ease, color .12s ease;
        }
        .obs-create:hover { background:var(--surface-2); color:var(--text); }
        .obs-create:disabled { opacity:.46; color:var(--text-muted); }
        .obs-meta-row {
          display:flex; align-items:center; gap:10px;
          padding:14px 22px 14px;
        }
        .obs-count { color:var(--text-secondary); font-size:11.5px; font-weight:500; letter-spacing:.015em; }
        .obs-text-btn {
          height:27px; padding:0 10px;
          border:1px solid var(--border); border-radius:999px;
          background:transparent; color:var(--text-secondary);
          font:inherit; font-size:11.5px; font-weight:500; letter-spacing:.015em;
          cursor:pointer;
          display:inline-flex; align-items:center; gap:6px;
          transition:background .12s ease, color .12s ease, border-color .12s ease;
        }
        .obs-text-btn:hover { background:var(--surface-2); color:var(--text); }

        /* ── Inline-Composer — ruhig, schlank, keine inneren Trennlinien ── */
        .obs-composer {
          border:1px solid var(--border);
          border-radius:8px;
          background:var(--surface);
          margin:0 0 16px;
          overflow:hidden;
          animation:obsComposerIn .18s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes obsComposerIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
        .obs-composer-top {
          display:flex; align-items:flex-start; justify-content:space-between;
          gap:12px; padding:14px 16px 4px;
        }
        .obs-composer-title { font-size:13px; font-weight:500; color:var(--text); letter-spacing:.015em; }
        .obs-composer-sub { font-size:11.5px; font-weight:500; color:var(--text-muted); letter-spacing:.015em; margin-top:2px; }
        .obs-composer-x {
          width:24px; height:24px; border:0; background:transparent; color:var(--text-muted);
          border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:background .12s, color .12s; margin-top:-2px;
        }
        .obs-composer-x:hover { background:var(--surface-2); color:var(--text); }
        .obs-composer-body { padding:10px 16px 8px; display:flex; flex-direction:column; gap:14px; }
        .obs-fld { display:flex; flex-direction:column; gap:6px; }
        .obs-fld-label { font-size:10.5px; font-weight:500; letter-spacing:.14em; text-transform:uppercase; color:var(--text-muted); }
        .obs-fld input[type="text"], .obs-fld input[type="email"] {
          height:32px; padding:0 10px; border-radius:7px;
          border:1px solid var(--border); background:transparent; color:var(--text);
          font:inherit; font-size:12.5px; font-weight:500; letter-spacing:.015em; outline:none;
          transition:border-color .12s, box-shadow .12s, background .12s;
        }
        .obs-fld input:focus { border-color:var(--border-strong); background:var(--surface); box-shadow:none; }
        .obs-perm-grid {
          display:flex; flex-wrap:wrap; gap:6px;
        }
        .obs-perm-row {
          display:inline-flex; align-items:center; gap:8px;
          padding:7px 11px 7px 9px;
          border:1px solid var(--border); border-radius:7px;
          background:transparent; cursor:pointer;
          transition:border-color .12s, background .12s, color .12s;
          color:var(--text-secondary);
        }
        .obs-perm-row:hover { background:color-mix(in srgb, var(--surface-2) 50%, transparent); color:var(--text); }
        .obs-perm-row.on { border-color:var(--border-strong); background:color-mix(in srgb, var(--surface-2) 70%, transparent); color:var(--text); }
        .obs-perm-checkbox {
          width:13px; height:13px; border-radius:3px; border:1px solid var(--border-strong);
          flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:transparent; transition:background .12s, border-color .12s;
        }
        .obs-perm-row.on .obs-perm-checkbox { background:var(--text); border-color:var(--text); }
        .obs-perm-row.on .obs-perm-checkbox svg { color:var(--bg); }
        .obs-perm-title { font-size:12px; font-weight:500; letter-spacing:.015em; }
        .obs-perm-hint {
          font-size:11px; font-weight:500; color:var(--text-muted); letter-spacing:.015em;
          margin:4px 0 0 1px;
        }
        .obs-composer-footer {
          display:flex; align-items:center; justify-content:space-between;
          gap:12px; padding:10px 16px 12px;
        }
        .obs-composer-hint { font-size:11.5px; font-weight:500; color:var(--text-muted); letter-spacing:.015em; }
        .obs-link-row { display:flex; align-items:center; gap:8px; padding:9px 11px; border:1px solid var(--border); border-radius:7px; background:color-mix(in srgb, var(--surface-2) 60%, transparent); }

        .obs-table { width:100%; }
        .obs-head-row, .obs-row {
          display:grid;
          grid-template-columns: minmax(200px, 1.4fr) 96px minmax(180px, 1.8fr) 80px 88px 28px;
          align-items:center;
          gap:14px;
          /* Row spans 12px breiter als der Inhalt — Hover-Bereich wirkt
             großzügig, Texte bleiben aber an alter Position */
          margin:0 -12px;
          padding:0 16px;
        }
        .obs-head-row {
          min-height:32px;
          color:var(--text-muted);
          font-size:11.5px; font-weight:500;
          letter-spacing:.015em;
          border-bottom:0;
        }
        .obs-row {
          min-height:52px;
          color:var(--text-secondary); font-size:12.5px;
          border-bottom:0;
          transition: background .12s ease;
          border-radius:8px;
        }
        .obs-row:hover { background:color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .obs-name-cell { display:flex; align-items:center; gap:10px; min-width:0; }
        .obs-avatar {
          width:26px; height:26px; border-radius:999px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-size:10px; font-weight:500; letter-spacing:.015em;
        }
        .obs-name { color:var(--text); font-size:13px; font-weight:500; letter-spacing:.015em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .obs-email { color:var(--text-muted); font-size:11.5px; font-weight:500; letter-spacing:.015em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .obs-pill {
          display:inline-flex; align-items:center; gap:5px;
          height:22px; padding:0 9px; border-radius:5px;
          font-size:11px; font-weight:500; letter-spacing:.015em;
        }
        .obs-pill.owner    { background:color-mix(in srgb, var(--surface-2) 70%, transparent); color:var(--text-secondary); }
        .obs-pill.joined   { background:color-mix(in srgb, var(--green, #34c759) 12%, transparent); color:var(--green-dark, #28a745); }
        .obs-pill.pending  { background:color-mix(in srgb, var(--amber, #b98700) 14%, transparent); color:var(--amber-dark, #8a6500); }
        .obs-pill.revoked  { background:color-mix(in srgb, var(--text-muted) 12%, transparent); color:var(--text-muted); }
        .obs-row-action {
          width:24px; height:24px; border-radius:6px;
          display:inline-flex; align-items:center; justify-content:center;
          background:transparent; border:0; color:var(--text-muted);
          cursor:pointer; opacity:0; transition:opacity .1s, background .1s, color .1s;
        }
        .obs-row:hover .obs-row-action { opacity:1; }
        .obs-row-action:hover { background:var(--surface-2); color:var(--text); }

        .obs-proj-tags { display:flex; align-items:center; gap:4px 10px; flex-wrap:wrap; max-width:100%; min-width:0; padding:6px 0; }
        .obs-proj-tag {
          display:inline-flex; align-items:center; gap:6px;
          font-size:12px; font-weight:500;
          color:var(--text-secondary);
          letter-spacing:.015em;
          max-width:100%;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .obs-proj-tag .dot { width:7px; height:7px; border-radius:999px; flex-shrink:0; }
        .obs-proj-more {
          font-size:11.5px; font-weight:500;
          color:var(--text-muted);
          letter-spacing:.015em;
        }
        .obs-empty {
          padding:40px 16px;
          text-align:center;
          color:var(--text-muted);
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
          width:min(440px, 92vw); max-height:90vh; overflow:auto;
          background:var(--surface); border:1px solid var(--border);
          border-radius:14px; padding:28px 26px 22px;
          box-shadow:0 20px 60px rgba(0,0,0,.14);
          animation:obsPop .18s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes obsPop { from { opacity:0; transform:translateY(8px) scale(.98); } to { opacity:1; transform:none; } }
        .obs-modal h2 { margin:0 0 6px; font-size:15px; font-weight:500; color:var(--text); letter-spacing:.015em; }
        .obs-modal .obs-modal-sub { margin:0 0 20px; font-size:12.5px; color:var(--text-secondary); line-height:1.6; font-weight:500; letter-spacing:.015em; }
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
        .obs-role-grid { display:flex; flex-wrap:wrap; gap:6px; }
        .obs-role-pill {
          height:30px; padding:0 12px;
          background:transparent; border:1px solid var(--border); border-radius:999px;
          color:var(--text-secondary);
          font:inherit; font-size:12px; font-weight:500; letter-spacing:.015em;
          cursor:pointer;
          transition:background .12s ease, color .12s ease, border-color .12s ease;
        }
        .obs-role-pill:hover { background:var(--surface-2); color:var(--text); }
        .obs-role-pill.on { background:var(--surface-2); color:var(--text); border-color:var(--border-strong); }
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
        .obs-help-modal { width:min(460px, 92vw); }
        .obs-help-graphic {
          width:100%; padding:6px 0 26px; margin-bottom:4px;
          display:flex; align-items:center; justify-content:center; gap:10px;
        }
        .obs-help-graphic-node {
          width:38px; height:38px; border-radius:999px;
          display:flex; align-items:center; justify-content:center;
          color:#fff; font-size:11px; font-weight:500; letter-spacing:.04em;
        }
        /* second declaration intentionally left for backwards-compatibility; node sized above */
        .obs-help-list { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:14px; }
        .obs-help-list li { display:flex; gap:12px; font-size:12.5px; color:var(--text-secondary); line-height:1.65; font-weight:500; letter-spacing:.015em; }
        .obs-help-list li strong { color:var(--text); font-weight:500; }
        .obs-help-list li em { font-family:'Editors Note', serif; font-style:italic; font-weight:500; color:var(--text); }
        .obs-help-bullet {
          width:18px; height:18px; flex-shrink:0; margin-top:1px;
          border-radius:999px;
          background:transparent;
          border:1px solid var(--border);
          display:inline-flex; align-items:center; justify-content:center;
          color:var(--text-muted); font-size:10.5px; font-weight:500; letter-spacing:0;
        }
        .obs-help-link {
          margin-top:18px; display:inline-flex; align-items:center; gap:6px;
          font-size:12.5px; font-weight:500; letter-spacing:.015em;
          color:var(--text-secondary); text-decoration:none;
        }
        .obs-help-link:hover { color:var(--text); }

        @media(max-width:760px) {
          .obs-head-row, .obs-row {
            grid-template-columns: minmax(0, 1fr) 100px 28px;
          }
          .obs-col-projects, .obs-col-invited, .obs-col-seen { display:none; }
        }
      `}</style>

      <div className="obs-top">
        <div className="obs-title-wrap">
          <h1 className="obs-title">Mitwirkende</h1>
          <button className="obs-help-btn" onClick={() => setHelpOpen(true)} aria-label="Was sind Mitwirkende?" title="Was sind Mitwirkende?">
            <Question size={11} weight="bold" />
          </button>
        </div>
        <button className="obs-create" type="button" onClick={() => setInviteOpen(true)} aria-label="Mitwirkende einladen">
          <span>Mitwirkende einladen</span>
          <span style={{ fontSize: 19, lineHeight: 1 }}>+</span>
        </button>
      </div>

      <div className="obs-meta-row">
        <span className="obs-count">{loading ? 'Wird geladen…' : `${totalCount} ${totalCount === 1 ? 'Person' : 'Personen'} mit Zugriff`}</span>
      </div>

      <div className="obs-scroll">

      {inviteOpen && (
        <section className="obs-composer" aria-label="Mitwirkende einladen">
          <header className="obs-composer-top">
            <div style={{ display:'flex', flexDirection:'column', minWidth:0 }}>
              <span className="obs-composer-title">{inviteLink ? 'Einladung erstellt' : 'Mitwirkende einladen'}</span>
              <span className="obs-composer-sub">{inviteLink ? 'Funktioniert nur für die eingeladene E-Mail.' : 'Standard: Lesen. Permissions später jederzeit änderbar.'}</span>
            </div>
            <button className="obs-composer-x" type="button" onClick={closeInvite} aria-label="Schließen"><X size={13} weight="regular"/></button>
          </header>

          {inviteLink ? (
            <>
              <div className="obs-composer-body">
                <div className="obs-link-row">
                  <code style={{ flex:1, fontSize:12.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'ui-monospace, "SF Mono", Menlo, monospace', letterSpacing:0 }}>{inviteLink}</code>
                  <button onClick={copyInviteLink} className="obs-text-btn" type="button">
                    {linkCopied ? <><Check size={12} weight="regular"/> Kopiert</> : 'Kopieren'}
                  </button>
                </div>
                <p className="obs-composer-hint" style={{ margin:0 }}>Tagro hält die Person danach automatisch auf dem Stand. Keine Mail nötig.</p>
              </div>
              <div className="obs-composer-footer">
                <span className="obs-composer-hint">Fertig — Einladung ist aktiv, sobald die Person den Link öffnet.</span>
                <button className="obs-text-btn" onClick={closeInvite} type="button"><span>Fertig</span></button>
              </div>
            </>
          ) : (
            <>
              <div className="obs-composer-body">
                <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.4fr) minmax(0, 1fr)', gap:12 }}>
                  <div className="obs-fld">
                    <span className="obs-fld-label">E-Mail</span>
                    <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="anna@firma.de" autoFocus />
                  </div>
                  <div className="obs-fld">
                    <span className="obs-fld-label">Name (optional)</span>
                    <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Anna Berger" />
                  </div>
                </div>

                <div className="obs-fld">
                  <span className="obs-fld-label">Rolle</span>
                  <div className="obs-role-grid">
                    {ROLE_PRESETS.map(r => (
                      <button key={r} type="button" className={`obs-role-pill ${inviteRole === r ? 'on' : ''}`} onClick={() => { setInviteRole(r); setInviteRoleCustom('') }}>
                        {r}
                      </button>
                    ))}
                    <button type="button" className={`obs-role-pill ${inviteRole === 'custom' ? 'on' : ''}`} onClick={() => setInviteRole('custom')}>Andere…</button>
                  </div>
                  {inviteRole === 'custom' && (
                    <input type="text" placeholder="z.B. Steuerberaterin" value={inviteRoleCustom} onChange={e => setInviteRoleCustom(e.target.value)} style={{ marginTop:6 }} />
                  )}
                </div>

                <div className="obs-fld">
                  <span className="obs-fld-label">Was darf diese Person?</span>
                  <div className="obs-perm-grid">
                    {[
                      { key:'comment',                title:'Kommentieren',         hint:'Rückfragen & Notizen.' },
                      { key:'create_tasks',           title:'Tasks erstellen',       hint:'Manuell neue Aufgaben anlegen.' },
                      { key:'tagro_propose',          title:'Mit Tagro vorschlagen', hint:'Ideen via Tagro einreichen.' },
                      { key:'review_status_reports', title:'Statusberichte prüfen', hint:'Briefings freigeben.' },
                      { key:'comment_dev_tasks',      title:'Dev-Tasks prüfen',     hint:'Auf Developer-Updates antworten.' },
                    ].map(p => {
                      const on = (invitePerms as any)[p.key] === true
                      return (
                        <button key={p.key} type="button" title={p.hint}
                          className={`obs-perm-row ${on ? 'on' : ''}`}
                          onClick={() => setInvitePerms(prev => ({ ...prev, [p.key]: !on }))}
                        >
                          <span className="obs-perm-checkbox">{on && <Check size={9} weight="bold" />}</span>
                          <span className="obs-perm-title">{p.title}</span>
                        </button>
                      )
                    })}
                  </div>
                  <span className="obs-perm-hint">Standard ist nur Read-only. Permissions können später angepasst werden.</span>
                </div>

                <div className="obs-fld">
                  <span className="obs-fld-label">Sichtbare Projekte</span>
                  <div className="obs-perm-grid">
                    <button type="button" className={`obs-perm-row ${inviteAll ? 'on' : ''}`} onClick={() => setInviteAll(true)}>
                      <span className="obs-perm-checkbox">{inviteAll && <Check size={9} weight="bold" />}</span>
                      <span className="obs-perm-title">Alle Projekte</span>
                    </button>
                    <button type="button" className={`obs-perm-row ${!inviteAll ? 'on' : ''}`} onClick={() => setInviteAll(false)}>
                      <span className="obs-perm-checkbox">{!inviteAll && <Check size={9} weight="bold" />}</span>
                      <span className="obs-perm-title">Nur Auswahl</span>
                    </button>
                  </div>
                  {!inviteAll && projects.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                      {projects.map(p => {
                        const checked = inviteProjects.includes(p.id)
                        return (
                          <button key={p.id} type="button"
                            className={`obs-role-pill ${checked ? 'on' : ''}`}
                            onClick={() => setInviteProjects(prev => checked ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                          >
                            <span style={{ width:7, height:7, borderRadius:999, background:p.color || '#64748b', display:'inline-block', marginRight:6 }} />
                            {p.title}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {inviteError && <p style={{ margin:0, fontSize:12, color:'var(--red, #c0362e)', letterSpacing:'.015em', fontWeight:500 }}>{inviteError}</p>}
              </div>

              <div className="obs-composer-footer">
                <span className="obs-composer-hint">Du kannst Permissions später jederzeit anpassen.</span>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="obs-text-btn" onClick={closeInvite} disabled={inviting} type="button">Abbrechen</button>
                  <button className="obs-text-btn" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} type="button">
                    <EnvelopeSimple size={12} weight="regular" />
                    <span>{inviting ? 'Wird erstellt…' : 'Einladung erstellen'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <div className="obs-table" role="table" aria-label="Mitwirkende-Liste">
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
              <ProjectTags ids={null} all={projects} maxVisible={4} />
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
                <ProjectTags ids={o.project_ids} all={projects} maxVisible={4} />
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
            <p style={{ margin:'0 0 6px', fontSize:13, fontWeight:500, color:'var(--text)' }}>Noch niemand beobachtet mit.</p>
            <p style={{ margin:'0 0 14px', fontSize:12, color:'var(--text-muted)' }}>Lade Co-Founder, Marketing oder Partner ein, deine Projekte still mitzuverfolgen.</p>
            <button className="obs-text-btn" onClick={() => setInviteOpen(true)} type="button">
              <span>Erste Person einladen</span>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Invite-Composer wird jetzt INLINE über der Tabelle gerendert (siehe Schreib-Position weiter oben) — kein Modal mehr. */}

      {/* ── Help Modal — portal to body ── */}
      {helpOpen && typeof document !== 'undefined' && createPortal(
        <div className="obs-modal-bg" onClick={() => setHelpOpen(false)}>
          <div className="obs-modal obs-help-modal" style={{ position:'relative' }} onClick={e => e.stopPropagation()}>
            <button className="obs-modal-close" onClick={() => setHelpOpen(false)} aria-label="Schließen"><X size={15} /></button>
            <div className="obs-help-graphic" aria-hidden="true">
              <div className="obs-help-graphic-node" style={{ background:'#5B647D' }}>DU</div>
              <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
                <path d="M2 7 L20 7" stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="2 3" />
                <path d="M16 3 L20 7 L16 11" stroke="var(--text-muted)" strokeWidth="1" fill="none" />
              </svg>
              <div className="obs-help-graphic-node" style={{ background:'#7B8294' }}><Eye size={16} weight="regular" /></div>
              <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
                <path d="M2 7 L20 7" stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="2 3" />
                <path d="M16 3 L20 7 L16 11" stroke="var(--text-muted)" strokeWidth="1" fill="none" />
              </svg>
              <div className="obs-help-graphic-node" style={{ background:'#A0A8B8' }}><UsersThree size={16} weight="regular" /></div>
            </div>

            <h2>Was sind <em style={{ fontFamily:"'Editors Note', serif", fontWeight:500 }}>Mitwirkende</em>?</h2>
            <p className="obs-modal-sub">Stille Stakeholder, die deine Projekte mitverfolgen — ohne operativ mitzubauen. Co-Founder, Marketing, Investoren, Partner. Lese- oder Kommentar-Zugriff, projekt-genau gewählt.</p>

            <ul className="obs-help-list">
              <li><span className="obs-help-bullet">1</span><span><strong>Read-only Zugriff.</strong> Mitwirkende sehen Status, Briefings und Tasks, können aber nichts ändern.</span></li>
              <li><span className="obs-help-bullet">2</span><span><strong>Projekt-scoped.</strong> Du wählst pro Person, welche Projekte sichtbar sind. Andere bleiben unsichtbar.</span></li>
              <li><span className="obs-help-bullet">3</span><span><strong>Tagro hält sie informiert.</strong> Keine manuellen Status-Mails — Briefings landen automatisch.</span></li>
              <li><span className="obs-help-bullet">4</span><span><strong>Jederzeit entziehbar.</strong> Zugriff per Klick widerrufen. Daten bleiben bei dir.</span></li>
            </ul>

            <Link href="/blog/mitbeobachter" className="obs-help-link" target="_blank">
              Mehr erfahren im Festag-Blog →
            </Link>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
