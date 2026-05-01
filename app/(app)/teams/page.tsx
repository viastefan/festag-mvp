'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { projectColor } from '@/components/Sidebar'

/**
 * Festag Teams — expanded hub.
 *
 * 1. 4 Team Models (Strategic Core / Execution Squad / Agency Ecosystem / Corporate)
 * 2. Your Team — members with live presence dots
 * 3. Live Now — realtime activity via Supabase presence
 * 4. Activity feed
 * 5. Quick invite
 */

type Member = { id: string; first_name?: string; full_name?: string; avatar_url?: string|null; role?: string; email?: string }
type Event  = { id: string; created_at: string; type: string; message: string; project_id?: string }

/* ── SVG icons ── */
function Ico({ path, size=18, sw=1.75 }: { path: React.ReactNode; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{path}</svg>
  )
}

const ICONS = {
  rocket:  <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l5.5-5.5"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></>,
  team:    <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  agency:  <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></>,
  enterprise: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h.01M12 8h.01M17 8h.01M7 12h.01M12 12h.01M17 12h.01"/></>,
  check:   <polyline points="20 6 9 17 4 12"/>,
  plus:    <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  dot:     <circle cx="12" cy="12" r="3"/>,
  mail:    <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  chev:    <polyline points="9 18 15 12 9 6"/>,
}

const MODELS = [
  {
    id: 'core',
    icon: ICONS.rocket,
    label: 'DIREKTSTART',
    title: 'Strategic Core',
    subtitle: 'Der Kern deines Projekts',
    desc: 'Du als Founder, ein dedizierter Devler und Tagro AI als Projektmanager. Das schnellste Setup vom Konzept zur fertigen App — ohne Overhead.',
    who: 'Solo-Gründer & Früh-Phase Startups',
    features: [
      'Direkter Dev-Zugang ohne Mittelmann',
      'Tagro AI plant Sprints & prüft Code',
      'Tägliche Sync-Reports in der App',
      'Shared Dashboard — du siehst alles',
      'PIN-gesicherter Closed Access',
    ],
    cta: 'Strategic Core starten',
    ctaHref: '/invite',
    highlight: false,
  },
  {
    id: 'squad',
    icon: ICONS.team,
    label: 'WACHSTUM',
    title: 'Execution Squad',
    subtitle: 'Erweitertes Tech-Team',
    desc: 'Du skalierst, dein Dev-Team auch. 1–2 Entwickler plus Tech-Lead. Parallele Features, Code-Reviews, Testing-Pipeline — alles gemanagt durch Tagro AI.',
    who: 'Wachsende Startups & Scale-ups',
    features: [
      '1–2 Devler gleichzeitig (parallel)',
      'Tech-Lead koordiniert intern',
      'Code Reviews & QA integriert',
      'Sprint-Board in Echtzeit',
      'Bis zu 4 Client-Seats inklusive',
      'Priorisierter Support 24/7',
    ],
    cta: 'Execution Squad anfragen',
    ctaHref: '/invite',
    highlight: true,
    badge: 'BELIEBT',
  },
  {
    id: 'agency',
    icon: ICONS.agency,
    label: 'AGENTUR',
    title: 'Agency Ecosystem',
    subtitle: 'Für Agenturen & Freelancer',
    desc: 'Du bist Agentur oder Freelancer und willst Kunden in Festag verwalten. Jeder Client hat sein eigenes Closed-System. Du behältst volle Kontrolle.',
    who: 'Agenturen, Freelancer & Dienstleister',
    features: [
      'Mehrere Client-Workspaces',
      'Closed Access pro Kunde',
      'White-Label Dashboard möglich',
      'Agentur-Billing integriert',
      'Dev → Client Invite Flow',
      'Eigene Agentur-Branding-Optionen',
    ],
    cta: 'Als Agentur einrichten',
    ctaHref: '/invite',
    highlight: false,
  },
  {
    id: 'corporate',
    icon: ICONS.enterprise,
    label: 'ENTERPRISE',
    title: 'Corporate Integration',
    subtitle: 'Für KMU & Unternehmen',
    desc: 'Größere IT-Abteilungen, externe Dev-Teams und interne Stakeholder — alles in einem System. DSGVO-konform, Server in Deutschland, SLA-gesichert.',
    who: 'KMU, Konzerne & IT-Abteilungen',
    features: [
      'Unbegrenzte Devler & Seats',
      'SSO / Active Directory Integration',
      'DSGVO-konform, Server in DE',
      'Dedizierter Account Manager',
      'SLA mit garantierter Uptime',
      'Custom Onboarding & Training',
    ],
    cta: 'Enterprise anfragen',
    ctaHref: 'mailto:hello@festag.io?subject=Corporate%20Integration%20Anfrage',
    highlight: false,
  },
]

export default function TeamsPage() {
  const [members,  setMembers]  = useState<Member[]>([])
  const [events,   setEvents]   = useState<Event[]>([])
  const [presence, setPresence] = useState<Record<string,{ name?: string; project?: string }>>({})
  const [me,       setMe]       = useState<Member|null>(null)
  const [email,    setEmail]    = useState('')
  const [sent,     setSent]     = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [model,    setModel]    = useState<string|null>(null)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href='/login'; return }
      const uid = data.session.user.id

      const safe = async (p: any) => { try { return await p } catch { return { data: null } } }
      const [profRes, tmRes, feedRes] = await Promise.all([
        safe(sb.from('profiles').select('*').eq('id', uid).single()),
        safe(sb.from('team_members').select('id,member_id').eq('owner_id', uid)),
        safe(sb.from('activity_feed').select('*').order('created_at',{ascending:false}).limit(40)),
      ])
      const myProf: any = profRes.data
      setMe(myProf)

      const memberIds = ((tmRes.data as any[]) ?? []).map((t:any) => t.member_id).filter(Boolean)
      let memberProfs: any[] = []
      if (memberIds.length > 0) {
        const { data: mp } = await safe(sb.from('profiles').select('id,first_name,full_name,avatar_url,role,email').in('id', memberIds as string[]))
        memberProfs = (mp as any[]) ?? []
      }
      const list: Member[] = memberProfs
      if (myProf && !list.find(m => m.id === myProf.id)) list.unshift(myProf)
      setMembers(list)
      setEvents((feedRes.data as any[]) ?? [])
      setLoading(false)

      const ch = sb.channel('festag-team-presence', { config: { presence: { key: uid } } })
      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState() as Record<string, any[]>
        const next: Record<string, any> = {}
        for (const [k, arr] of Object.entries(state)) {
          const last = arr[arr.length-1]
          if (last) next[k] = { name: last.name, project: last.project }
        }
        setPresence(next)
      })
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await ch.track({
          name: myProf?.first_name ?? myProf?.full_name ?? data.session?.user.email,
          project: typeof window !== 'undefined' ? window.location.pathname : '',
        })
      })
      return () => { sb.removeChannel(ch) }
    })
  }, [])

  async function invite() {
    if (!email.includes('@')) return
    const { data: { user } } = await sb.auth.getUser()
    await (sb.from('team_invites') as any).insert({
      email: email.trim().toLowerCase(), role: 'collaborator',
      invited_by: user?.id, status: 'pending', access_mode: 'team',
    }).catch(() => {})
    setSent(true); setEmail('')
    setTimeout(() => setSent(false), 2800)
  }

  const onlineCount = Object.keys(presence).length

  if (loading) return (
    <div style={{ padding:60, display:'flex', justifyContent:'center', alignItems:'center' }}>
      <div style={{ width:22, height:22, border:'2px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth:1180 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes tm-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(37,196,122,.45);} 60%{box-shadow:0 0 0 6px rgba(37,196,122,0);} }
        @keyframes ev-in { from{opacity:0;transform:translateY(5px);} to{opacity:1;transform:none;} }
        .tm-mc { transition:border-color .15s,transform .15s; cursor:pointer; }
        .tm-mc:hover { border-color:var(--border-strong)!important; transform:translateY(-2px); }
        .tm-mc.sel { border-color:var(--text)!important; }
        .tm-member { transition:transform .12s; }
        .tm-member:hover { transform:translateY(-1px); }
        .ev-item { animation:ev-in .3s cubic-bezier(.16,1,.3,1) both; }
        .chk { width:17px;height:17px;border-radius:50%;background:var(--surface-2);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text);margin-top:1px; }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <h1>Teams</h1>
        <p>Wähle dein Team-Modell und verwalte Collaborators, Live-Status und Aktivität.</p>
      </div>

      {/* ── SECTION 1: 4 Team Models ── */}
      <section style={{ marginBottom:32 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', marginBottom:14 }}>TEAM-MODELL WÄHLEN</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:12 }}>
          {MODELS.map(m => {
            const sel = model === m.id
            return (
              <div key={m.id} className={`tm-mc${sel?' sel':''}`}
                onClick={() => setModel(v => v === m.id ? null : m.id)}
                style={{ background:'var(--surface)', border:`1.5px solid ${sel?'var(--text)':'var(--border)'}`, borderRadius:18, padding:'20px 20px 18px', position:'relative', display:'flex', flexDirection:'column', gap:0 }}>

                {m.badge && (
                  <span style={{ position:'absolute', top:14, right:14, padding:'2px 9px', borderRadius:999, background:'var(--text)', color:'var(--bg)', fontSize:9, fontWeight:700, letterSpacing:'.1em' }}>{m.badge}</span>
                )}

                {/* Icon */}
                <div style={{ width:38, height:38, borderRadius:11, background:sel?'var(--text)':'var(--surface-2)', color:sel?'var(--bg)':'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Ico path={m.icon} size={17} sw={1.8} />
                </div>

                {/* Label + title */}
                <p style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 4px' }}>{m.label}</p>
                <h3 style={{ fontSize:16, fontWeight:700, margin:'0 0 3px', letterSpacing:'-.3px', color:'var(--text)' }}>{m.title}</h3>
                <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'0 0 12px', fontWeight:500 }}>{m.subtitle}</p>
                <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:'0 0 14px', lineHeight:1.55, flex:1 }}>{m.desc}</p>

                {/* Features — only show when selected or on desktop expanded view */}
                <ul style={{ listStyle:'none', padding:0, margin:'0 0 16px', display:'flex', flexDirection:'column', gap:7 }}>
                  {m.features.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12, color:'var(--text-secondary)', lineHeight:1.45 }}>
                      <span className="chk"><Ico path={ICONS.check} size={8} sw={2.8} /></span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Who */}
                <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'0 0 12px', fontStyle:'italic' }}>Für: {m.who}</p>

                {/* CTA */}
                {m.ctaHref.startsWith('mailto') ? (
                  <a href={m.ctaHref}
                    style={{ display:'block', padding:'10px 14px', background:sel?'var(--btn-prim)':'var(--surface-2)', color:sel?'var(--btn-prim-text)':'var(--text)', borderRadius:11, fontSize:12.5, fontWeight:700, textAlign:'center', textDecoration:'none', border:`1px solid ${sel?'transparent':'var(--border)'}` }}>
                    {m.cta}
                  </a>
                ) : (
                  <Link href={m.ctaHref}
                    style={{ display:'block', padding:'10px 14px', background:sel?'var(--btn-prim)':'var(--surface-2)', color:sel?'var(--btn-prim-text)':'var(--text)', borderRadius:11, fontSize:12.5, fontWeight:700, textAlign:'center', textDecoration:'none', border:`1px solid ${sel?'transparent':'var(--border)'}` }}
                    onClick={e => e.stopPropagation()}>
                    {m.cta}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── SECTION 2: Your Team + Activity ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14 }} className="grid-cols-2-mobile-1">

        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Members */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 style={{ margin:0, fontSize:14.5 }}>Dein Team <span style={{ color:'var(--text-muted)', fontWeight:500, fontSize:13 }}>({members.length})</span></h3>
              {onlineCount > 0 && (
                <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--green)', fontWeight:700 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:'tm-pulse 1.8s infinite' }}/>
                  {onlineCount} online
                </span>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:10 }}>
              {members.map(m => {
                const online = !!presence[m.id]
                const initial = (m.first_name ?? m.full_name ?? '?').charAt(0).toUpperCase()
                const isMe = m.id === me?.id
                const roleColor = m.role === 'dev' ? 'var(--green)' : m.role === 'admin' ? 'var(--amber)' : 'var(--text-muted)'
                const roleBg   = m.role === 'dev' ? 'var(--green-bg)' : m.role === 'admin' ? 'var(--amber-bg)' : 'var(--surface-2)'
                return (
                  <div key={m.id} className="tm-member" style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 10px 12px', background:'var(--card)', border:'1px solid var(--border)', borderRadius:14 }}>
                    <div style={{ position:'relative' }}>
                      <div style={{ width:42, height:42, borderRadius:'50%', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'var(--text)', overflow:'hidden', border:'2px solid var(--border)', flexShrink:0 }}>
                        {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initial}
                      </div>
                      <div style={{ position:'absolute', bottom:0, right:-2, width:12, height:12, borderRadius:'50%', background:online?'var(--green)':'var(--border-strong)', border:'2.5px solid var(--card)', animation:online?'tm-pulse 1.8s infinite':'none' }}/>
                    </div>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', margin:'8px 0 4px', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>
                      {m.first_name ?? m.full_name?.split(' ')[0] ?? 'Mitglied'}{isMe ? ' ✓' : ''}
                    </p>
                    {m.role && (
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:roleBg, color:roleColor, letterSpacing:'.06em', textTransform:'uppercase' }}>{m.role}</span>
                    )}
                  </div>
                )
              })}
              {/* Add placeholder */}
              <div className="tm-member" onClick={() => document.getElementById('tm-invite-input')?.focus()}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'14px 10px', border:'1.5px dashed var(--border)', borderRadius:14, cursor:'pointer', minHeight:108, gap:6 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Ico path={ICONS.plus} size={14} sw={2.2} />
                </div>
                <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, fontWeight:600 }}>Einladen</p>
              </div>
            </div>
          </div>

          {/* Live Now */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', animation:'tm-pulse 1.8s infinite' }}/>
              <h3 style={{ margin:0, fontSize:14.5 }}>Gerade aktiv</h3>
            </div>
            {Object.keys(presence).length === 0 ? (
              <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>Niemand online — du bist gerade allein.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {Object.entries(presence).map(([key, p]) => (
                  <div key={key} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:10 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'var(--bg)' }}>
                      {(p.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:0 }}>{p.name ?? 'Mitglied'}</p>
                      <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'1px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.project || '—'}
                      </p>
                    </div>
                    <span style={{ fontSize:9.5, fontWeight:800, color:'var(--green)', letterSpacing:'.06em' }}>LIVE</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Invite */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
            <h3 style={{ margin:'0 0 6px', fontSize:14.5 }}>Mitglied einladen</h3>
            <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:'0 0 14px', lineHeight:1.5 }}>
              Schnell-Einladung. Für mehr Optionen (Closed-System, Agentur-Modus) →&nbsp;
              <Link href="/invite" style={{ color:'var(--text)', fontWeight:700, textDecoration:'underline', textDecorationColor:'var(--border-strong)' }}>Invite Hub</Link>
            </p>
            {sent ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:11 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Ico path={ICONS.check} size={12} sw={2.8} />
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>Einladung versendet</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>Wir prüfen und senden Zugang.</p>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', gap:8 }}>
                <input id="tm-invite-input" value={email} onChange={e => setEmail(e.target.value)}
                  type="email" placeholder="kollege@firma.com"
                  style={{ flex:1, padding:'10px 14px', background:'var(--card)', border:'1.5px solid var(--border)', borderRadius:11, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
                <button onClick={invite} disabled={!email.includes('@')}
                  style={{ padding:'10px 16px', background:email.includes('@')?'var(--btn-prim)':'var(--surface-2)', color:email.includes('@')?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:11, fontSize:13, fontWeight:700, cursor:email.includes('@')?'pointer':'default', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  Senden
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Activity */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px', display:'flex', flexDirection:'column' }}>
          <h3 style={{ margin:'0 0 14px', fontSize:14.5 }}>Aktivität</h3>
          {events.length === 0 ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:'24px 0', opacity:.6 }}>
              <Ico path={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} size={32} sw={1.4} />
              <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0, textAlign:'center' }}>Noch keine Events</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10, overflowY:'auto', flex:1 }}>
              {events.map((e, i) => {
                const c = e.project_id ? projectColor(e.project_id) : 'var(--text-muted)'
                return (
                  <div key={e.id} className="ev-item" style={{ display:'flex', gap:9, animationDelay:`${Math.min(i,8)*0.035}s` }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0, flexShrink:0, paddingTop:5 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:c }}/>
                      {i < events.length-1 && <span style={{ width:1, flex:1, background:'var(--border)', marginTop:4, minHeight:10 }}/>}
                    </div>
                    <div style={{ flex:1, minWidth:0, paddingBottom:10 }}>
                      <p style={{ fontSize:12.5, color:'var(--text)', margin:0, lineHeight:1.5 }}>{e.message}</p>
                      <p style={{ fontSize:10, color:'var(--text-muted)', margin:'2px 0 0', letterSpacing:'.04em', textTransform:'uppercase' }}>
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
