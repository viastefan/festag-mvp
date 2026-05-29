'use client'

/**
 * /dev/projects/[id] — Dev project context: the inbound half of the
 * dev→client loop. The dev reads the client's brief + conversation, replies,
 * jumps to the Execution Board, and — if no client is attached yet — generates
 * a link-first client invite right here.
 *
 * Devs can read any project/message via their role policy, so reads go through
 * the normal browser client. Auth is gated by DevAppShell — we never hard-bounce.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight, ArrowsClockwise, Check, Copy, ListChecks, PaperPlaneTilt, UserPlus,
} from '@phosphor-icons/react'

type Project = {
  id: string
  title: string | null
  description: string | null
  scope_summary: string | null
  status: string | null
  work_type: string | null
  color: string | null
  user_id: string
  created_at: string | null
}

type Message = { id: string; sender_id: string; message: string; is_ai: boolean | null; created_at: string }
type MemberRow = { user_id: string; role: string }
type ProfileLite = { id: string; full_name: string | null; email: string | null }

function statusLabel(status?: string | null) {
  const v = String(status || '').toLowerCase()
  if (v === 'intake') return 'Backlog'
  if (v === 'planning') return 'In Planung'
  if (v === 'active') return 'Aktiv'
  if (v === 'testing') return 'Testing'
  if (v === 'done') return 'Fertig'
  return v || 'Backlog'
}

function workTypeLabel(t?: string | null) {
  if (t === 'design') return 'Design'
  if (t === 'marketing') return 'Marketing'
  if (t === 'general') return 'Allgemein'
  return 'Software'
}

export default function DevProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id
  const supabase = useMemo(() => createClient(), [])

  const [me, setMe] = useState<string>('')
  const [project, setProject] = useState<Project | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const feedRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    if (!projectId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMe(user.id)

    const { data: proj } = await supabase
      .from('projects')
      .select('id,title,description,scope_summary,status,work_type,color,user_id,created_at')
      .eq('id', projectId)
      .maybeSingle()
    if (!proj) { setNotFound(true); setLoading(false); return }
    setProject(proj as Project)

    const [{ data: msgs }, { data: mem }] = await Promise.all([
      supabase.from('messages').select('id,sender_id,message,is_ai,created_at')
        .eq('project_id', projectId).order('created_at', { ascending: true }).limit(200),
      supabase.from('project_members').select('user_id,role').eq('project_id', projectId),
    ])
    setMessages((msgs as Message[]) ?? [])
    setMembers((mem as MemberRow[]) ?? [])

    // Resolve sender + member names in one go.
    const ids = new Set<string>()
    ;((msgs as Message[]) ?? []).forEach(m => ids.add(m.sender_id))
    ;((mem as MemberRow[]) ?? []).forEach(m => ids.add(m.user_id))
    if (ids.size) {
      const { data: profs } = await supabase.from('profiles')
        .select('id,full_name,email').in('id', Array.from(ids))
      const map: Record<string, ProfileLite> = {}
      ;((profs as ProfileLite[]) ?? []).forEach(p => { map[p.id] = p })
      setProfiles(map)
    }
    setLoading(false)
  }, [projectId, supabase])

  useEffect(() => { load() }, [load])

  // Keep the feed pinned to the latest message.
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [messages.length])

  const clientMember = members.find(m => m.role === 'client')
  const clientName = clientMember
    ? (profiles[clientMember.user_id]?.full_name || profiles[clientMember.user_id]?.email || 'Kunde')
    : null

  function senderKind(m: Message): 'tagro' | 'client' | 'dev' {
    if (m.is_ai) return 'tagro'
    if (clientMember && m.sender_id === clientMember.user_id) return 'client'
    return 'dev'
  }
  function senderName(m: Message): string {
    if (m.is_ai) return 'Tagro'
    const p = profiles[m.sender_id]
    return p?.full_name || p?.email || (m.sender_id === me ? 'Du' : 'Developer')
  }

  async function send() {
    if (!reply.trim() || !projectId || sending) return
    setSending(true)
    try {
      const { data, error } = await supabase.from('messages')
        .insert({ project_id: projectId, sender_id: me, message: reply.trim(), is_ai: false })
        .select('id,sender_id,message,is_ai,created_at').single()
      if (!error && data) {
        setMessages(prev => [...prev, data as Message])
        setReply('')
      }
    } finally {
      setSending(false)
    }
  }

  async function generateInvite() {
    if (!projectId || inviteLoading) return
    setInviteLoading(true)
    try {
      const res = await fetch('/api/invites/create', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'client', projectId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) setInviteLink(data.url)
    } finally {
      setInviteLoading(false)
    }
  }

  async function copyInvite() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch { /* manual select fallback */ }
  }

  if (notFound) {
    return (
      <div className="dev-page">
        <header className="dev-page-header compact">
          <div>
            <p className="dev-eyebrow">Projekt</p>
            <h1>Projekt nicht gefunden.</h1>
            <p className="meta">Es existiert nicht mehr oder du hast keinen Zugriff.</p>
          </div>
        </header>
        <Link href="/dev/projects" className="dev-secondary-btn" style={{ width: 'fit-content' }}>← Zu den Projekten</Link>
      </div>
    )
  }

  return (
    <div className="dev-page">
      <div className="pd-topbar">
        <Link href="/dev/projects" className="pd-back">← Projekte</Link>
      </div>

      <header className="pd-head">
        <span className="pd-bar" style={{ background: project?.color || '#5B647D' }} />
        <div className="pd-head-main">
          <p className="dev-eyebrow">Projekt-Kontext</p>
          <h1>{loading ? 'Lädt…' : (project?.title || 'Unbenanntes Projekt')}</h1>
          <div className="pd-meta">
            <span className="dev-chip">{statusLabel(project?.status)}</span>
            <span className="dev-chip subtle">{workTypeLabel(project?.work_type)}</span>
            {clientName
              ? <span className="pd-client">Kunde · {clientName}</span>
              : <span className="pd-client muted">Noch kein Kunde verbunden</span>}
          </div>
        </div>
        <div className="pd-head-actions">
          <button className="dev-secondary-btn" onClick={load} disabled={loading}>
            <ArrowsClockwise size={14} /> Aktualisieren
          </button>
          <Link href={`/dev/jobs?project=${projectId}`} className="dev-primary-btn">
            <ListChecks size={14} /> Execution Board
          </Link>
        </div>
      </header>

      <div className="pd-grid">
        {/* Conversation */}
        <section className="pd-conv dev-surface">
          <p className="dev-section-title">Brief & Verlauf</p>
          <div className="pd-feed" ref={feedRef}>
            {loading ? (
              <p className="pd-empty">Verlauf wird geladen…</p>
            ) : messages.length === 0 ? (
              <p className="pd-empty">
                Noch keine Nachrichten. Sobald dein Kunde beigetreten ist und seinen Brief postet, erscheint er hier.
              </p>
            ) : messages.map(m => {
              const kind = senderKind(m)
              return (
                <div key={m.id} className={`pd-msg ${kind}`}>
                  <div className="pd-msg-head">
                    <span className="pd-msg-author">{senderName(m)}</span>
                    {kind === 'tagro' && <span className="pd-tagro-tag">AI</span>}
                    <span className="pd-msg-time">
                      {new Date(m.created_at).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="pd-msg-body">{m.message}</p>
                </div>
              )
            })}
          </div>

          <div className="pd-composer">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Antworte deinem Kunden oder hak beim Brief nach…"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
            />
            <button className="dev-primary-btn" onClick={send} disabled={!reply.trim() || sending}>
              {sending ? 'Sende…' : <><PaperPlaneTilt size={14} /> Senden</>}
            </button>
          </div>
        </section>

        {/* Side rail */}
        <aside className="pd-side">
          {project?.description || project?.scope_summary ? (
            <div className="pd-card dev-surface">
              <p className="dev-section-title">Kurzbeschreibung</p>
              <p className="pd-desc">{project?.scope_summary || project?.description}</p>
            </div>
          ) : null}

          {!clientMember && (
            <div className="pd-card dev-surface">
              <p className="dev-section-title">Kunde einladen</p>
              <p className="pd-hint">Teile diesen Link — der Kunde erstellt sein Konto und sieht das Projekt sofort.</p>
              {inviteLink ? (
                <div className="pd-linkrow">
                  <input readOnly value={inviteLink} onFocus={e => e.currentTarget.select()} />
                  <button className="pd-copy" onClick={copyInvite}>
                    {copied ? <><Check size={13} /> Kopiert</> : <><Copy size={13} /> Kopieren</>}
                  </button>
                </div>
              ) : (
                <button className="dev-primary-btn pd-full" onClick={generateInvite} disabled={inviteLoading}>
                  {inviteLoading ? 'Erzeuge…' : <><UserPlus size={14} /> Einladungslink erzeugen</>}
                </button>
              )}
            </div>
          )}

          <div className="pd-card dev-surface">
            <p className="dev-section-title">Weiter</p>
            <Link href="/dev/updates" className="pd-link">Status-Update schreiben <ArrowRight size={13} /></Link>
            <Link href={`/dev/jobs?project=${projectId}`} className="pd-link">Tasks & Handoffs <ArrowRight size={13} /></Link>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .pd-topbar { margin-bottom: 12px; }
        .pd-back { font-size: 12.5px; color: var(--text-muted); text-decoration: none; font-weight: 600; }
        .pd-back:hover { color: var(--text); }
        .pd-head { display: flex; align-items: flex-start; gap: 14px; padding-bottom: 18px; margin-bottom: 18px; border-bottom: 1px solid var(--border); }
        .pd-bar { width: 5px; align-self: stretch; min-height: 46px; border-radius: 3px; flex-shrink: 0; }
        .pd-head-main { flex: 1; min-width: 0; }
        .pd-head-main h1 { margin: 4px 0 10px; font-size: 26px; font-weight: 500; letter-spacing: -.015em; line-height: 1.12; color: var(--text); }
        .pd-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .dev-chip.subtle { color: var(--text-muted); }
        .pd-client { font-size: 12.5px; font-weight: 600; color: var(--text-secondary); }
        .pd-client.muted { color: var(--text-muted); font-weight: 500; }
        .pd-head-actions { display: flex; gap: 8px; flex-shrink: 0; }

        .pd-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: start; }
        .pd-conv { display: flex; flex-direction: column; padding: 16px; min-height: 480px; }
        .pd-feed { flex: 1; overflow-y: auto; max-height: 56vh; display: flex; flex-direction: column; gap: 12px; padding: 6px 2px 10px; }
        .pd-empty { color: var(--text-muted); font-size: 13px; line-height: 1.55; padding: 18px 4px; }
        .pd-msg { border: 1px solid var(--border); border-radius: 13px; padding: 11px 13px; max-width: 88%; }
        .pd-msg.client { align-self: flex-start; background: var(--surface-2); border-color: var(--border-strong); }
        .pd-msg.dev { align-self: flex-end; background: color-mix(in srgb, var(--accent, #8e96ff) 12%, var(--card)); }
        .pd-msg.tagro { align-self: flex-start; background: transparent; border-style: dashed; }
        .pd-msg-head { display: flex; align-items: center; gap: 7px; margin-bottom: 4px; }
        .pd-msg-author { font-size: 12px; font-weight: 700; color: var(--text); }
        .pd-tagro-tag { font-size: 9.5px; font-weight: 800; letter-spacing: .08em; color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); border-radius: 5px; padding: 1px 5px; }
        .pd-msg-time { margin-left: auto; font-size: 11px; color: var(--text-muted); }
        .pd-msg-body { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text); white-space: pre-wrap; }

        .pd-composer { display: flex; gap: 9px; align-items: flex-end; border-top: 1px solid var(--border); padding-top: 12px; margin-top: 4px; }
        .pd-composer textarea { flex: 1; min-height: 46px; max-height: 160px; resize: vertical; background: var(--inp, var(--surface-2)); border: 1px solid var(--border); border-radius: 12px; padding: 11px 13px; color: var(--text); font: inherit; font-size: 13.5px; line-height: 1.5; outline: 0; }
        .pd-composer textarea:focus { border-color: var(--border-strong); }
        .pd-composer .dev-primary-btn { flex-shrink: 0; }

        .pd-side { display: flex; flex-direction: column; gap: 12px; }
        .pd-card { padding: 15px; }
        .pd-desc { margin: 0; font-size: 13px; line-height: 1.55; color: var(--text-secondary); }
        .pd-hint { margin: 0 0 11px; font-size: 12.5px; line-height: 1.5; color: var(--text-muted); }
        .pd-full { width: 100%; }
        .pd-linkrow { display: flex; gap: 7px; }
        .pd-linkrow input { flex: 1; min-width: 0; background: var(--inp, var(--surface-2)); border: 1px solid var(--border); border-radius: 10px; padding: 9px 10px; color: var(--text-secondary); font: inherit; font-size: 11.5px; outline: 0; }
        .pd-copy { flex-shrink: 0; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: 10px; padding: 0 11px; font: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
        .pd-copy:hover { border-color: var(--border-strong); }
        .pd-link { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; font-size: 13px; font-weight: 600; color: var(--text-secondary); text-decoration: none; border-bottom: 1px solid var(--border); }
        .pd-link:last-child { border-bottom: 0; }
        .pd-link:hover { color: var(--text); }

        @media (max-width: 900px) {
          .pd-grid { grid-template-columns: 1fr; }
          .pd-head { flex-wrap: wrap; }
          .pd-head-actions { width: 100%; }
        }
      `}</style>
    </div>
  )
}
