'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

/**
 * Festag Teams — structured workspace layer.
 *
 * Architecture: Team = root container
 *   Team → Projects → Users (via Membership)
 *
 * 4 Scenarios:
 *   1. Client Team     (Collaboration)
 *   2. Developer Team  (Execution)
 *   3. Agency Ecosystem (Multi-Client)
 *   4. Corporate Integration (Inhouse)
 */

type Member = {
  id: string
  first_name?: string
  full_name?: string
  avatar_url?: string | null
  role?: string
  email?: string
}

/* ── Minimal SVG icon ── */
function Ico({ path, size = 18, sw = 1.75, color = 'currentColor' }: {
  path: React.ReactNode; size?: number; sw?: number; color?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  )
}

const ICONS = {
  founder:    <><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></>,
  dev:        <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
  agency:     <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></>,
  corporate:  <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8h.01M12 8h.01M17 8h.01M7 12h.01M12 12h.01M17 12h.01"/></>,
  check:      <polyline points="20 6 9 17 4 12"/>,
  plus:       <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  lock:       <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  shield:     <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
  switch:     <><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
  mail:       <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  chevron:    <polyline points="9 18 15 12 9 6"/>,
  user:       <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  eye:        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff:     <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>,
  layers:     <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
}

const SCENARIOS = [
  {
    id: 'client',
    icon: ICONS.founder,
    eyebrow: 'COLLABORATION',
    title: 'Client Team',
    subtitle: 'Founder & Co-Founder',
    desc: 'Maximale Kontrolle für die Führungsebene. Beide Partner haben 100 % Einsicht in AI-Kontext, Roadmap und tägliche Progress-Reports.',
    roles: ['Owner', 'Co-Owner', 'Lead Dev'],
    visibility: [
      { label: 'AI-Kontext & Roadmap', granted: true },
      { label: 'Budget & Strategie-Dashboard', granted: true },
      { label: 'Tägliche Progress-Reports', granted: true },
      { label: 'Alle Projekt-Chats', granted: true },
    ],
    badge: null,
    cta: 'Client Team erstellen',
    ctaHref: '/invite',
    accent: 'var(--text)',
  },
  {
    id: 'dev',
    icon: ICONS.dev,
    eyebrow: 'EXECUTION',
    title: 'Developer Team',
    subtitle: 'Lead Dev & Dev-Partner',
    desc: 'Fokus auf Code-Produktion ohne Reibungsverluste. Tasks, Deployments und Doku geteilt — private Founder-Strategie-Chats bleiben unsichtbar.',
    roles: ['Lead Developer', 'Developer'],
    visibility: [
      { label: 'Tasks & Sprint-Board', granted: true },
      { label: 'Technische Dokumentation', granted: true },
      { label: 'Deployment-Status', granted: true },
      { label: 'Founder-Strategie-Chats', granted: false },
    ],
    badge: 'BELIEBT',
    cta: 'Developer Team einrichten',
    ctaHref: '/invite',
    accent: 'var(--green)',
  },
  {
    id: 'agency',
    icon: ICONS.agency,
    eyebrow: 'MULTI-CLIENT',
    title: 'Agency Ecosystem',
    subtitle: 'Agentur & Clients (isoliert)',
    desc: 'Die Agentur verwaltet 50 Teams für 50 Kunden. Jeder Client = ein isolierter Team-Context. Kunde A sieht niemals die Projekte von Kunde B.',
    roles: ['Agency Admin', 'Agency Manager', 'Client Owner'],
    visibility: [
      { label: 'Team-Switcher für Agentur-Admin', granted: true },
      { label: 'Eigener AI-Kontext pro Client', granted: true },
      { label: 'Strikte Container-Trennung', granted: true },
      { label: 'Andere Client-Workspaces', granted: false },
    ],
    badge: null,
    cta: 'Als Agentur starten',
    ctaHref: '/invite',
    accent: 'var(--amber)',
  },
  {
    id: 'corporate',
    icon: ICONS.corporate,
    eyebrow: 'INHOUSE / OUTBOUND',
    title: 'Corporate Integration',
    subtitle: 'Unternehmen & Inhouse-Dev',
    desc: 'Festangestellter Dev erhält dedizierten Zugang — sieht nur zugewiesene Produkte. Read-Only für Strategie, Full-Access für Code.',
    roles: ['Client (Unternehmen)', 'Employee Dev'],
    visibility: [
      { label: 'Zugewiesene Projekte & Code', granted: true },
      { label: 'Technische Tasks', granted: true },
      { label: 'Öffentliche Marktplätze', granted: false },
      { label: 'Strategie-Dashboard', granted: false },
    ],
    badge: 'ENTERPRISE',
    cta: 'Corporate anfragen',
    ctaHref: 'mailto:hello@festag.io?subject=Corporate%20Integration',
    accent: 'var(--text-muted)',
  },
]

export default function TeamsPage() {
  const [members,     setMembers]     = useState<Member[]>([])
  const [me,          setMe]          = useState<Member | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<string | null>(null)
  const [inviteOpen,  setInviteOpen]  = useState(false)
  const [invEmail,    setInvEmail]    = useState('')
  const [invRole,     setInvRole]     = useState('collaborator')
  const [invSent,     setInvSent]     = useState(false)
  const [invSending,  setInvSending]  = useState(false)
  const [mounted,     setMounted]     = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(async ({ data }) => {
      try {
        if (!data.session) { window.location.href = '/login'; return }
        const uid = data.session.user.id

        const { data: prof } = await sb
          .from('profiles').select('*').eq('id', uid).single()
        const myProf = prof as any
        setMe(myProf ?? null)

        const { data: tmRows } = await sb
          .from('team_members').select('member_id').eq('owner_id', uid)
        const ids = ((tmRows as any[]) ?? []).map((r: any) => r.member_id).filter(Boolean) as string[]

        if (ids.length > 0) {
          const { data: profs } = await sb
            .from('profiles').select('id,first_name,full_name,avatar_url,role,email').in('id', ids)
          const list: Member[] = (profs as any[]) ?? []
          if (myProf && !list.find(m => m.id === myProf.id)) list.unshift(myProf as Member)
          setMembers(list)
        } else {
          setMembers(myProf ? [myProf as Member] : [])
        }
      } catch (err) {
        console.error('[teams]', err)
      } finally {
        setLoading(false)
      }
    }).catch(() => setLoading(false))
  }, [])

  async function sendInvite() {
    if (!invEmail.includes('@')) return
    setInvSending(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      await (sb.from('team_invites') as any).insert({
        email: invEmail.trim().toLowerCase(),
        role: invRole,
        invited_by: user?.id,
        status: 'pending',
        access_mode: 'team',
      })
      setInvSent(true)
      setInvEmail('')
      setTimeout(() => { setInvSent(false); setInviteOpen(false) }, 2500)
    } catch (e) {
      console.error(e)
    }
    setInvSending(false)
  }

  /* ── Invite Modal ── */
  const InviteModal = mounted ? createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) setInviteOpen(false) }}>
      {/* Backdrop */}
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}
        onClick={() => setInviteOpen(false)}/>

      {/* Panel */}
      <div style={{ position:'relative', width:'100%', maxWidth:460, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, boxShadow:'0 32px 80px rgba(0,0,0,0.28)', overflow:'hidden', animation:'inv-pop .22s cubic-bezier(.16,1,.3,1) both' }}>
        <style>{`@keyframes inv-pop { from{opacity:0;transform:scale(.96) translateY(8px);} to{opacity:1;transform:none;} }`}</style>

        {/* Header */}
        <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div>
            <h2 style={{ margin:'0 0 4px', fontSize:18, fontWeight:700 }}>Mitglied einladen</h2>
            <p style={{ margin:0, fontSize:13, color:'var(--text-muted)' }}>Zugang wird nach Prüfung freigeschaltet.</p>
          </div>
          <button onClick={() => setInviteOpen(false)} style={{ width:32, height:32, borderRadius:9, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'22px 24px 24px' }}>
          {invSent ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:'24px 0', textAlign:'center' }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--green-bg)', border:'1px solid var(--green-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>Einladung gesendet</p>
                <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>Wir prüfen und senden den Zugang direkt zu.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Email */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.06em', marginBottom:7, textTransform:'uppercase' }}>E-Mail-Adresse</label>
                <input
                  value={invEmail} onChange={e => setInvEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendInvite()}
                  type="email" placeholder="name@firma.com" autoFocus
                  style={{ width:'100%', padding:'11px 14px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:12, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Role */}
              <div style={{ marginBottom:22 }}>
                <label style={{ display:'block', fontSize:11.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.06em', marginBottom:7, textTransform:'uppercase' }}>Rolle</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { id:'collaborator', label:'Client / Collaborator', desc:'Strategische Sicht, Kommentare' },
                    { id:'dev',          label:'Developer',              desc:'Execution Layer, Tasks, Code' },
                  ].map(r => (
                    <button key={r.id} onClick={() => setInvRole(r.id)}
                      style={{ padding:'10px 12px', borderRadius:11, border:`1.5px solid ${invRole===r.id?'var(--text)':'var(--border)'}`, background:invRole===r.id?'var(--surface-2)':'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'border-color .12s, background .12s' }}>
                      <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:'0 0 2px' }}>{r.label}</p>
                      <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, lineHeight:1.4 }}>{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button onClick={sendInvite} disabled={!invEmail.includes('@') || invSending}
                style={{ width:'100%', padding:'13px', background: invEmail.includes('@') ? 'var(--btn-prim)' : 'var(--surface-2)', color: invEmail.includes('@') ? 'var(--btn-prim-text)' : 'var(--text-muted)', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor: invEmail.includes('@') ? 'pointer' : 'default', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background .15s, color .15s' }}>
                {invSending
                  ? <><span style={{ width:14, height:14, border:'2px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/>Wird gesendet…</>
                  : 'Einladung senden →'
                }
                <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null

  if (loading) return (
    <div style={{ padding: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth: 1100 }}>
      {inviteOpen && InviteModal}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sc-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .sc-card { transition: border-color .15s, transform .12s, box-shadow .15s; cursor:pointer; }
        .sc-card:hover { transform:translateY(-2px); box-shadow:var(--shadow); }
        .sc-card.active { border-color:var(--text) !important; }
        .tm-member { transition:transform .1s; }
        .tm-member:hover { transform:translateY(-1px); }
        .vis-row { display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid var(--border); }
        .vis-row:last-child { border-bottom:none; }
      `}</style>

      {/* ── Header ── */}
      <div className="page-header">
        <h1>Teams</h1>
        <p>Strukturierte Workspace-Schicht. Team = Root-Container. Projekte leben in Teams — nicht umgekehrt.</p>
      </div>

      {/* ── Architecture callout ── */}
      <div style={{ padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <Ico path={ICONS.layers} size={16} sw={1.8} />
        </div>
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', margin: '0 0 3px' }}>Kern-Architektur</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text)' }}>Team → Projekte → User</strong> (via Mitgliedschaft) — nicht User → Projekte.&nbsp;
            Agenturen verwalten <em>mehrere Teams</em>, nicht mehrere Projekte. Jeder Client = ein isolierter Team-Kontext.
            AI behält pro Team einen eigenständigen Kontext.
          </p>
        </div>
      </div>

      {/* ── 4 Scenarios ── */}
      <section style={{ marginBottom: 32 }}>
        <p className="eyebrow" style={{ marginBottom: 14 }}>TEAM-MODELL WÄHLEN</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
          {SCENARIOS.map((sc, idx) => {
            const active = selected === sc.id
            return (
              <div key={sc.id} className={`sc-card${active ? ' active' : ''}`}
                onClick={() => setSelected(v => v === sc.id ? null : sc.id)}
                style={{
                  background: 'var(--surface)',
                  border: `1.5px solid ${active ? 'var(--text)' : 'var(--border)'}`,
                  borderRadius: 18,
                  padding: '20px 20px 18px',
                  display: 'flex', flexDirection: 'column', gap: 0,
                  position: 'relative',
                  animation: `sc-in .3s ${idx * 0.06}s both`,
                }}>

                {/* Badge */}
                {sc.badge && (
                  <span style={{ position: 'absolute', top: 14, right: 14, padding: '2px 8px', borderRadius: 999, background: active ? 'var(--btn-prim)' : 'var(--surface-2)', color: active ? 'var(--btn-prim-text)' : 'var(--text-muted)', fontSize: 9, fontWeight: 700, letterSpacing: '.1em' }}>
                    {sc.badge}
                  </span>
                )}

                {/* Icon */}
                <div style={{ width: 38, height: 38, borderRadius: 11, background: active ? 'var(--btn-prim)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, flexShrink: 0 }}>
                  <Ico path={sc.icon} size={17} sw={1.8} color={active ? 'var(--btn-prim-text)' : 'var(--text-secondary)'} />
                </div>

                {/* Label + title */}
                <p style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', margin: '0 0 3px' }}>{sc.eyebrow}</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-.3px' }}>{sc.title}</h3>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 12px', fontWeight: 500 }}>{sc.subtitle}</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.55, flex: 1 }}>{sc.desc}</p>

                {/* Roles */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                  {sc.roles.map(r => (
                    <span key={r} style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {r}
                    </span>
                  ))}
                </div>

                {/* Visibility matrix */}
                <div style={{ marginBottom: 16 }}>
                  {sc.visibility.map(v => (
                    <div key={v.label} className="vis-row">
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: v.granted ? 'var(--green-bg)' : 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {v.granted
                          ? <Ico path={ICONS.check} size={8} sw={2.8} color="var(--green)" />
                          : <Ico path={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={7} sw={2.5} color="var(--red)" />
                        }
                      </div>
                      <span style={{ fontSize: 11.5, color: v.granted ? 'var(--text-secondary)' : 'var(--text-muted)', flex: 1, lineHeight: 1.3 }}>{v.label}</span>
                      {!v.granted && (
                        <Ico path={ICONS.eyeOff} size={11} sw={1.6} color="var(--text-muted)" />
                      )}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {sc.ctaHref.startsWith('mailto') ? (
                  <a href={sc.ctaHref} onClick={e => e.stopPropagation()}
                    style={{ display: 'block', padding: '10px 14px', background: active ? 'var(--btn-prim)' : 'var(--surface-2)', color: active ? 'var(--btn-prim-text)' : 'var(--text)', borderRadius: 11, fontSize: 12.5, fontWeight: 700, textAlign: 'center', textDecoration: 'none', border: `1px solid ${active ? 'transparent' : 'var(--border)'}`, transition: 'background .15s, color .15s' }}>
                    {sc.cta}
                  </a>
                ) : (
                  <Link href={sc.ctaHref} onClick={e => e.stopPropagation()}
                    style={{ display: 'block', padding: '10px 14px', background: active ? 'var(--btn-prim)' : 'var(--surface-2)', color: active ? 'var(--btn-prim-text)' : 'var(--text)', borderRadius: 11, fontSize: 12.5, fontWeight: 700, textAlign: 'center', textDecoration: 'none', border: `1px solid ${active ? 'transparent' : 'var(--border)'}`, transition: 'background .15s, color .15s' }}>
                    {sc.cta}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Bottom: Team + Invite ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12 }} className="grid-cols-2-mobile-1">

        {/* Members */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Dein Team <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 13 }}>({members.length})</span></h3>
            <button onClick={() => setInviteOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text)', fontWeight: 700, padding: '6px 12px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Ico path={ICONS.plus} size={11} sw={2.4} color="var(--btn-prim-text)" />
              Einladen
            </button>
          </div>

          {members.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', opacity: .5 }}>
              <div style={{ marginBottom: 8 }}>
                <Ico path={ICONS.user} size={28} sw={1.4} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Noch keine Mitglieder eingeladen.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {members.map(m => {
                const initial = (m.first_name ?? m.full_name ?? '?').charAt(0).toUpperCase()
                const isMe = m.id === me?.id
                const roleColor = m.role === 'dev' ? 'var(--green)' : m.role === 'admin' ? 'var(--amber)' : 'var(--text-muted)'
                const roleBg   = m.role === 'dev' ? 'var(--green-bg)' : m.role === 'admin' ? 'var(--amber-bg)' : 'var(--surface-2)'
                const roleLabel = m.role === 'dev' ? 'Developer' : m.role === 'admin' ? 'Admin' : 'Client'
                return (
                  <div key={m.id} className="tm-member" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 12px 14px', background: 'var(--card)', border: `1.5px solid ${isMe ? 'var(--border-strong)' : 'var(--border)'}`, borderRadius: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', border: '2px solid var(--border)', marginBottom: 8, flexShrink: 0 }}>
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initial}
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: '0 0 5px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                      {m.first_name ?? m.full_name?.split(' ')[0] ?? 'Mitglied'}{isMe ? ' ✓' : ''}
                    </p>
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: roleBg, color: roleColor, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                      {roleLabel}
                    </span>
                  </div>
                )
              })}

              {/* Add slot */}
              <div className="tm-member" onClick={() => document.getElementById('tm-invite-input')?.focus()}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 12px', border: '1.5px dashed var(--border)', borderRadius: 14, cursor: 'pointer', minHeight: 112, gap: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ico path={ICONS.plus} size={14} sw={2.2} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>Einladen</p>
              </div>
            </div>
          )}
        </div>

        {/* Invite + permissions info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Quick invite — opens modal */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
            <h3 style={{ margin: '0 0 5px' }}>Team erweitern</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Founder, Developer oder Agency-Client einladen. Zugang wird nach Prüfung aktiviert.
            </p>
            <button onClick={() => setInviteOpen(true)}
              style={{ width: '100%', padding: '11px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Ico path={ICONS.plus} size={13} sw={2.4} color="var(--btn-prim-text)" />
              Mitglied einladen
            </button>
          </div>

          {/* Permission principle */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ico path={ICONS.shield} size={13} sw={1.8} />
              </div>
              <h3 style={{ margin: 0, fontSize: 13.5 }}>Berechtigungs-Prinzip</h3>
            </div>
            {[
              { role: 'Owner', desc: 'Vollzugriff: Strategie, Budget, AI, Chats' },
              { role: 'Lead Developer', desc: 'Execution Layer + Code-Reviews, kein Budget' },
              { role: 'Developer', desc: 'Tasks & eigene Projekte — kein Strategie-Zugriff' },
              { role: 'Agency Admin', desc: 'Team-Switcher + alle eigenen Clients' },
              { role: 'Employee Dev', desc: 'Read-Only Strategie, Full-Access Code' },
            ].map(r => (
              <div key={r.role} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{r.role}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{r.desc}</p>
              </div>
            ))}
          </div>

          {/* Scale info */}
          <div style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Ico path={ICONS.switch} size={16} sw={1.8} color="var(--text-muted)" />
            <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 2 }}>Team Switcher</strong>
              Ein User kann beliebig vielen Teams angehören. Agenturen schalten mit einem Klick zwischen 10–100 Client-Contexts — ohne Account-Wechsel.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
