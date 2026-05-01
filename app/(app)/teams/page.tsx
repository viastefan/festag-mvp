'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { projectColor } from '@/components/Sidebar'

/**
 * Festag Teams — collab hub.
 *
 * Sections:
 *   1. Members — your collaborators (with presence dots)
 *   2. Live Now — real-time who's working on what (presence channel)
 *   3. Activity — events feed (project_status, time_started, milestone_paid…)
 *   4. Invite — quick add by email
 *
 * Uses Supabase Realtime presence channel for live status.
 */

type Member = { id: string; first_name?: string; full_name?: string; avatar_url?: string|null; role?: string; email?: string; }
type Event  = { id: string; created_at: string; type: string; message: string; user_id?: string; project_id?: string }

export default function TeamsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [events, setEvents]   = useState<Event[]>([])
  const [presence, setPresence] = useState<Record<string,{ name?: string; project?: string; lastSeen: number }>>({})
  const [me, setMe] = useState<Member|null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href='/login'; return }
      const uid = data.session.user.id

      const safe = async (p: Promise<any>) => { try { return await p } catch (e) { return { data: null, error: e } } }
      const [profRes, tmRes, feedRes] = await Promise.all([
        safe(sb.from('profiles').select('*').eq('id', uid).single()),
        safe(sb.from('team_members').select('id, member_id').eq('owner_id', uid)),
        safe(sb.from('activity_feed').select('*').order('created_at', {ascending:false}).limit(40)),
      ])
      const myProf: any = profRes.data
      setMe(myProf as Member)

      // Resolve member profiles in 2nd query (no FK alias)
      const memberIds = ((tmRes.data as any[]) ?? []).map(t => t.member_id).filter(Boolean)
      let memberProfiles: any[] = []
      if (memberIds.length > 0) {
        const { data: mp } = await safe(sb.from('profiles').select('id,first_name,full_name,avatar_url,role,email').in('id', memberIds))
        memberProfiles = (mp as any[]) ?? []
      }
      const list: Member[] = memberProfiles
      if (myProf && !list.find(m => m.id === myProf.id)) list.unshift(myProf as Member)
      setMembers(list)
      setEvents((feedRes.data as any[]) ?? [])
      setLoading(false)

      // Realtime presence — broadcast self + listen for others
      const ch = sb.channel('festag-team-presence', { config: { presence: { key: uid } } })
      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState() as Record<string, any[]>
        const next: Record<string, any> = {}
        for (const [key, arr] of Object.entries(state)) {
          const last = arr[arr.length - 1]
          if (last) next[key] = { name: last.name, project: last.project, lastSeen: Date.now() }
        }
        setPresence(next)
      })
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({
            name: myProf?.first_name ?? myProf?.full_name ?? data.session?.user.email,
            project: typeof window !== 'undefined' ? window.location.pathname : '',
          })
        }
      })
      // Cleanup
      return () => { sb.removeChannel(ch) }
    })
  }, [])

  async function invite() {
    if (!inviteEmail.includes('@')) return
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('team_invites').insert({
      email: inviteEmail.trim().toLowerCase(),
      role: 'collaborator',
      invited_by: user?.id,
      status: 'pending',
      access_mode: 'team',
    }).catch(() => {})
    setInviteSent(true)
    setInviteEmail('')
    setTimeout(() => setInviteSent(false), 2400)
  }

  if (loading) return <div style={{ padding:60, display:'flex', justifyContent:'center' }}><div style={{ width:24, height:24, border:'2px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/></div>

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth:1180 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes tm-online { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5);} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0);} }
        .tm-card { transition: transform .15s, border-color .15s; }
        .tm-card:hover { transform: translateY(-1px); border-color: var(--border-strong); }
        .ev-item { animation: ev-in .35s cubic-bezier(.16,1,.3,1) both; }
        @keyframes ev-in { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:none;} }
      `}</style>

      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <span style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14 }}>👥</span>
          <h1 style={{ margin:0 }}>Teams</h1>
        </div>
        <p>Live-Status, Events und Collaborator-Verwaltung — alles auf einer Seite.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }} className="grid-cols-2-mobile-1">

        {/* LEFT: Members + Live + Invite */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Members grid */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ margin:0, fontSize:15 }}>Mitglieder ({members.length})</h3>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{Object.keys(presence).length} online</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:10 }}>
              {members.map(m => {
                const online = !!presence[m.id]
                const initial = (m.first_name ?? m.full_name ?? '?').charAt(0).toUpperCase()
                const isMe = m.id === me?.id
                return (
                  <div key={m.id} className="tm-card" style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12 }}>
                    <div style={{ position:'relative' }}>
                      <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'var(--text)', overflow:'hidden', border:'2px solid var(--border)' }}>
                        {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initial}
                      </div>
                      <div style={{
                        position:'absolute', bottom:0, right:-2,
                        width:13, height:13, borderRadius:'50%',
                        background: online ? '#22c55e' : 'var(--text-muted)',
                        border:'2px solid var(--surface)',
                        animation: online ? 'tm-online 1.6s infinite' : 'none',
                      }}/>
                    </div>
                    <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:'8px 0 1px', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>
                      {m.first_name ?? m.full_name?.split(' ')[0] ?? 'Mitglied'}{isMe ? ' (du)' : ''}
                    </p>
                    {m.role && (
                      <span style={{ fontSize:9, fontWeight:800, padding:'1px 6px', borderRadius:4, background: m.role==='dev'?'rgba(34,197,94,.12)':m.role==='admin'?'rgba(245,158,11,.12)':'var(--surface-2)', color: m.role==='dev'?'#16a34a':m.role==='admin'?'#d97706':'var(--text-secondary)', letterSpacing:'.05em', textTransform:'uppercase' }}>
                        {m.role}
                      </span>
                    )}
                  </div>
                )
              })}
              {/* Add card */}
              <div className="tm-card" onClick={() => document.getElementById('tm-invite-input')?.focus()}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'14px 10px', border:'1px dashed var(--border)', borderRadius:12, cursor:'pointer', minHeight:108 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:0, textAlign:'center', fontWeight:600 }}>Einladen</p>
              </div>
            </div>
          </div>

          {/* Live now */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', animation:'tm-online 1.6s infinite' }}/>
              <h3 style={{ margin:0, fontSize:15 }}>Gerade aktiv</h3>
            </div>
            {Object.keys(presence).length === 0 ? (
              <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>Niemand online — du bist gerade allein.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {Object.entries(presence).map(([key, p]) => (
                  <div key={key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'rgba(34,197,94,.05)', border:'1px solid rgba(34,197,94,.18)', borderRadius:9 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' }}>
                      {(p.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:0 }}>{p.name ?? 'Mitglied'}</p>
                      <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'1px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>auf <code style={{ fontFamily:'ui-monospace,monospace', fontSize:10 }}>{p.project || '—'}</code></p>
                    </div>
                    <span style={{ fontSize:9.5, fontWeight:800, color:'#16a34a', letterSpacing:'.05em' }}>LIVE</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invite */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px' }}>
            <h3 style={{ margin:'0 0 8px', fontSize:15 }}>Mitglied einladen</h3>
            <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'0 0 12px', lineHeight:1.5 }}>
              Lade Collaborators ein. Sie bekommen E-Mail + PIN und sehen nur deine Teamprojekte.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <input id="tm-invite-input" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" placeholder="kollege@firma.com"
                style={{ flex:1, padding:'10px 13px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
              <button onClick={invite} disabled={!inviteEmail.includes('@')} style={{ padding:'10px 16px', background:inviteEmail.includes('@')?'var(--btn-prim)':'var(--surface-2)', color:inviteEmail.includes('@')?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:10, fontSize:12.5, fontWeight:700, cursor:inviteEmail.includes('@')?'pointer':'default', fontFamily:'inherit' }}>
                {inviteSent ? '✓' : 'Senden'}
              </button>
            </div>
            <p style={{ fontSize:11, color:'var(--text-muted)', margin:'10px 0 0' }}>
              Mehr Optionen (Closed-System, Agentur-Modus): <Link href="/invite" style={{ color:'#6366f1', fontWeight:700 }}>Invite Hub →</Link>
            </p>
          </div>
        </div>

        {/* RIGHT: Activity */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px' }}>
          <h3 style={{ margin:'0 0 12px', fontSize:15 }}>Activity</h3>
          {events.length === 0 ? (
            <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>Noch keine Events.</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:560, overflowY:'auto' }}>
              {events.map((e, i) => {
                const c = e.project_id ? projectColor(e.project_id) : '#6366f1'
                return (
                  <div key={e.id} className="ev-item" style={{ display:'flex', gap:9, animationDelay:`${Math.min(i,8)*0.04}s` }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:c, flexShrink:0, marginTop:6 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12.5, color:'var(--text)', margin:0, lineHeight:1.5 }}>{e.message}</p>
                      <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'2px 0 0', textTransform:'uppercase', letterSpacing:'.05em' }}>
                        {new Date(e.created_at).toLocaleString('de',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · {e.type.replace(/_/g,' ')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
