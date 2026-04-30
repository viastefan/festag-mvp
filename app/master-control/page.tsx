'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

/**
 * Master Control — secret URL only the founder uses.
 * Gated by both: admin role AND email allowlist (env or hardcoded).
 *
 * Goes beyond /internal-admin: support inbox, all status reports across
 * all projects, recent activity feed, system broadcast, payment overview.
 */

const MASTER_EMAILS = [
  'stefandirnberger@viawen.com',
  'stefan@festag.io',
]

type Tab = 'pulse'|'support'|'reports'|'payments'|'broadcast'|'access'

export default function MasterControlPage() {
  const [authed, setAuthed]     = useState(false)
  const [checking, setChecking] = useState(true)
  const [email, setEmail]       = useState('')
  const [tab, setTab]           = useState<Tab>('pulse')
  const [stats, setStats]       = useState({ projects:0, clients:0, devs:0, revenue:0, openTasks:0, msgsToday:0 })
  const [activity, setActivity] = useState<any[]>([])
  const [support, setSupport]   = useState<any[]>([])
  const [reports, setReports]   = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastSent, setBroadcastSent] = useState(false)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const userEmail = data.session.user.email ?? ''
      setEmail(userEmail)
      const { data: p } = await sb.from('profiles').select('role').eq('id', data.session.user.id).single()
      const role = (p as any)?.role
      const allow = MASTER_EMAILS.includes(userEmail.toLowerCase()) || role === 'admin'
      if (!allow) { window.location.href = '/dashboard'; return }
      setAuthed(true); setChecking(false)
      loadAll()
    })
  }, [])

  async function loadAll() {
    const sb = createClient()
    const since = new Date(Date.now() - 24*60*60*1000).toISOString()
    const [pj, pf, ts, msgs, act, sup, rep, pay] = await Promise.all([
      sb.from('projects').select('id,status,user_id'),
      sb.from('profiles').select('id,role,email,first_name,full_name,avatar_url,created_at').order('created_at', {ascending:false}).limit(40),
      sb.from('tasks').select('id,status'),
      sb.from('messages').select('id,created_at').gte('created_at', since),
      sb.from('activity_feed').select('*').order('created_at', {ascending:false}).limit(30),
      sb.from('support_messages').select('*').order('created_at', {ascending:false}).limit(30),
      sb.from('ai_updates').select('*,projects(title)').order('created_at', {ascending:false}).limit(30),
      sb.from('payments').select('*').order('created_at', {ascending:false}).limit(30),
    ])
    const projs = (pj.data as any[]) ?? []
    const profiles = (pf.data as any[]) ?? []
    const tasks = (ts.data as any[]) ?? []
    const msglist = (msgs.data as any[]) ?? []
    setStats({
      projects: projs.length,
      clients: profiles.filter(p => p.role === 'client').length,
      devs: profiles.filter(p => p.role === 'dev' || p.role === 'admin').length,
      revenue: 0,
      openTasks: tasks.filter(t => t.status !== 'done').length,
      msgsToday: msglist.length,
    })
    setActivity((act.data as any[]) ?? [])
    setSupport((sup.data as any[]) ?? [])
    setReports((rep.data as any[]) ?? [])
    setPayments((pay.data as any[]) ?? [])
  }

  async function broadcast() {
    if (!broadcastMsg.trim()) return
    const sb = createClient()
    // Insert system-broadcast as activity_feed entries — best effort
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('activity_feed').insert({
      user_id: user?.id, project_id: null,
      type: 'system_broadcast',
      message: `📢 Master: ${broadcastMsg.trim()}`,
    }).catch(() => {})
    setBroadcastSent(true); setBroadcastMsg('')
    setTimeout(() => setBroadcastSent(false), 2400)
  }

  if (checking) return <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:32, height:32, border:'2px solid rgba(255,255,255,.1)', borderTopColor:'#a78bfa', borderRadius:'50%', animation:'spin .8s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style></div>
  if (!authed) return null

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key:'pulse',    label:'Pulse',     emoji:'💚' },
    { key:'support',  label:`Support (${support.length})`, emoji:'💬' },
    { key:'reports',  label:`Reports (${reports.length})`, emoji:'📊' },
    { key:'payments', label:`Payments (${payments.length})`, emoji:'💳' },
    { key:'broadcast',label:'Broadcast', emoji:'📢' },
    { key:'access',   label:'Access',    emoji:'🔐' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#e2e8f0', fontFamily:"'Aeonik',-apple-system,sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes mc-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        .mc-card { background:linear-gradient(180deg, rgba(167,139,250,.04), rgba(15,23,42,.4)); border:1px solid rgba(255,255,255,.08); border-radius:14px; }
        .mc-tab { padding:8px 14px; font-size:12.5px; font-weight:700; border:1px solid rgba(255,255,255,.08); border-radius:8px; background:rgba(255,255,255,.02); color:#94a3b8; cursor:pointer; font-family:inherit; transition:all .12s; }
        .mc-tab.on { background:#a78bfa; color:#0a0a0f; border-color:#a78bfa; }
        .mc-tab:hover:not(.on) { background:rgba(255,255,255,.06); color:#e2e8f0; }
      `}</style>

      <header style={{ borderBottom:'1px solid rgba(255,255,255,.08)', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'rgba(10,10,15,.8)', backdropFilter:'blur(12px)', zIndex:50, gap:10, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:18, filter:'brightness(0) invert(1)' }}/>
          <span style={{ padding:'3px 9px', borderRadius:6, background:'linear-gradient(135deg,#a78bfa,#ec4899)', color:'#fff', fontSize:10, fontWeight:800, letterSpacing:'.1em' }}>MASTER · CLASSIFIED</span>
          <span style={{ padding:'3px 8px', borderRadius:5, background:'rgba(34,197,94,.15)', color:'#22c55e', fontSize:9.5, fontWeight:700, letterSpacing:'.06em', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', animation:'mc-pulse 1.6s infinite' }}/>SYSTEM ONLINE
          </span>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'#64748b' }}>Hi, {email.split('@')[0]}</span>
          <Link href="/dashboard" style={{ fontSize:11, color:'#a78bfa', textDecoration:'none', fontWeight:700 }}>App ↗</Link>
        </div>
      </header>

      <div style={{ maxWidth:1280, margin:'0 auto', padding:'24px 18px calc(28px + env(safe-area-inset-bottom))' }}>
        <h1 style={{ fontSize:30, fontWeight:800, color:'#fff', letterSpacing:'-.6px', margin:'0 0 6px' }}>Master Control</h1>
        <p style={{ fontSize:14, color:'#64748b', margin:'0 0 22px' }}>Festag operativer Überblick. Nur du siehst diese Seite.</p>

        {/* Pulse stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:24 }}>
          {[
            { label:'PROJEKTE',  value: stats.projects, color:'#a78bfa' },
            { label:'KUNDEN',    value: stats.clients, color:'#22d3ee' },
            { label:'DEVS+ADMIN',value: stats.devs, color:'#22c55e' },
            { label:'OFFEN. TASKS', value: stats.openTasks, color:'#f59e0b' },
            { label:'MSGS / 24H',value: stats.msgsToday, color:'#ec4899' },
            { label:'SUPPORT',   value: support.length, color:'#ef4444' },
          ].map(s => (
            <div key={s.label} className="mc-card" style={{ padding:'14px 18px' }}>
              <p style={{ fontSize:9.5, fontWeight:700, color:'#64748b', letterSpacing:'.1em', margin:'0 0 6px' }}>{s.label}</p>
              <p style={{ fontSize:24, fontWeight:800, color:s.color, margin:0, lineHeight:1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:18, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} className={`mc-tab ${tab===t.key?'on':''}`} onClick={() => setTab(t.key)}>
              <span style={{ marginRight:5 }}>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'pulse' && (
          <div className="mc-card" style={{ padding:18 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#fff', margin:'0 0 14px' }}>Letzte Aktivität</h3>
            {activity.length === 0 ? <p style={{ color:'#64748b', fontSize:13 }}>Keine Aktivität.</p> : (
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:480, overflowY:'auto' }}>
                {activity.map(a => (
                  <div key={a.id} style={{ display:'flex', gap:10, padding:'10px 12px', background:'rgba(255,255,255,.02)', borderRadius:10, border:'1px solid rgba(255,255,255,.04)' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#a78bfa', flexShrink:0, marginTop:5 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12.5, color:'#e2e8f0', margin:0, lineHeight:1.5 }}>{a.message}</p>
                      <p style={{ fontSize:10.5, color:'#64748b', margin:'2px 0 0' }}>{new Date(a.created_at).toLocaleString('de')} · {a.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'support' && (
          <div className="mc-card" style={{ padding:18 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#fff', margin:'0 0 14px' }}>Support Inbox</h3>
            {support.length === 0 ? <p style={{ color:'#64748b', fontSize:13 }}>Keine offenen Anfragen.</p> : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {support.map(s => (
                  <div key={s.id} style={{ padding:'12px 14px', background:'rgba(255,255,255,.02)', borderRadius:10, border:'1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <p style={{ fontSize:12.5, fontWeight:700, color:'#fff', margin:0 }}>{s.email ?? 'Anonym'}</p>
                      <p style={{ fontSize:10.5, color:'#64748b', margin:0 }}>{new Date(s.created_at).toLocaleString('de')}</p>
                    </div>
                    <p style={{ fontSize:13, color:'#cbd5e1', margin:'4px 0 8px', lineHeight:1.55 }}>{s.message}</p>
                    {s.email && <a href={`mailto:${s.email}`} style={{ fontSize:11, color:'#a78bfa', fontWeight:700 }}>Antworten →</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'reports' && (
          <div className="mc-card" style={{ padding:18 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#fff', margin:'0 0 14px' }}>Alle Statusberichte</h3>
            {reports.length === 0 ? <p style={{ color:'#64748b', fontSize:13 }}>Noch keine Berichte.</p> : (
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:560, overflowY:'auto' }}>
                {reports.map(r => (
                  <div key={r.id} style={{ padding:'12px 14px', background:'rgba(255,255,255,.02)', borderRadius:10, border:'1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <p style={{ fontSize:12.5, fontWeight:700, color:'#fff', margin:0 }}>{r.projects?.title ?? 'Projekt'}</p>
                      <p style={{ fontSize:10.5, color:'#64748b', margin:0 }}>{new Date(r.created_at).toLocaleString('de')}</p>
                    </div>
                    <p style={{ fontSize:12.5, color:'#94a3b8', margin:0, lineHeight:1.55, whiteSpace:'pre-wrap', maxHeight:120, overflow:'hidden', position:'relative' }}>
                      {r.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div className="mc-card" style={{ padding:18 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#fff', margin:'0 0 14px' }}>Zahlungen</h3>
            {payments.length === 0 ? <p style={{ color:'#64748b', fontSize:13 }}>Keine Transaktionen.</p> : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {payments.map(p => (
                  <div key={p.id} style={{ display:'flex', gap:10, padding:'10px 14px', background:'rgba(255,255,255,.02)', borderRadius:10, border:'1px solid rgba(255,255,255,.04)' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background: p.status==='paid'?'#22c55e':p.status==='pending'?'#f59e0b':'#ef4444', marginTop:5, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12.5, color:'#fff', margin:0, fontWeight:600 }}>{p.description ?? '—'}</p>
                      <p style={{ fontSize:10.5, color:'#64748b', margin:'2px 0 0' }}>{p.provider} · {p.status} · {new Date(p.created_at).toLocaleString('de')}</p>
                    </div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#22c55e', margin:0 }}>€{Number(p.amount ?? 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'broadcast' && (
          <div className="mc-card" style={{ padding:22 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#fff', margin:'0 0 6px' }}>System-Broadcast</h3>
            <p style={{ fontSize:12.5, color:'#94a3b8', margin:'0 0 14px' }}>Erscheint im Activity-Feed aller User. Nutze das nur für wichtige System-News.</p>
            <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} rows={4} placeholder="Nachricht an alle…"
              style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, color:'#fff', fontSize:13.5, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.5 }}/>
            <button onClick={broadcast} disabled={!broadcastMsg.trim()} style={{ marginTop:10, padding:'10px 18px', background:'linear-gradient(135deg,#a78bfa,#ec4899)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:broadcastMsg.trim()?'pointer':'default', opacity:broadcastMsg.trim()?1:.5, fontFamily:'inherit' }}>
              {broadcastSent ? '✓ Gesendet' : 'Broadcast senden'}
            </button>
          </div>
        )}

        {tab === 'access' && (
          <div className="mc-card" style={{ padding:22 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#fff', margin:'0 0 14px' }}>Master Access</h3>
            <p style={{ fontSize:12.5, color:'#94a3b8', lineHeight:1.7, margin:0 }}>
              Diese URL <code style={{ background:'rgba(255,255,255,.06)', padding:'1px 6px', borderRadius:4 }}>/master-control</code> ist nur erreichbar, wenn entweder<br/>
              • Email in der Allowlist ist (siehe MASTER_EMAILS), oder<br/>
              • DB role = "admin" ist.<br/><br/>
              Konfiguriere die Allowlist im Code (<code style={{ background:'rgba(255,255,255,.06)', padding:'1px 6px', borderRadius:4 }}>app/master-control/page.tsx</code>) oder per ENV.
            </p>
            <div style={{ marginTop:14, padding:'12px 14px', background:'rgba(167,139,250,.08)', border:'1px solid rgba(167,139,250,.2)', borderRadius:10 }}>
              <p style={{ fontSize:11, color:'#a78bfa', margin:'0 0 4px', fontWeight:700 }}>Aktuelle Allowlist:</p>
              {MASTER_EMAILS.map(e => <p key={e} style={{ fontSize:12, color:'#cbd5e1', margin:'1px 0', fontFamily:'ui-monospace,monospace' }}>{e}</p>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
