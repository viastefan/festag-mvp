'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DevMatchAnimation from '@/components/DevMatchAnimation'
import { effectiveRole, isDevOrAdmin } from '@/lib/role'

/**
 * Invite hub — three connection modes:
 *   1. Open Pool   — Festag matches you with one of our devs (default)
 *   2. Invite Dev  — you have a known dev/agency partner; invite them by email
 *   3. Closed Mode — outsourced/internal: dev only sees this client's projects
 *
 * Two flows from this single page:
 *   - Client invites their existing dev/agency → email + PIN
 *   - Dev invites their existing client → email + temporary password
 */

type Flow = 'client_invites_dev' | 'dev_invites_client' | 'pool_match'

export default function InvitePage() {
  const [userRole, setUserRole] = useState<string>('')
  const [flow, setFlow] = useState<Flow>('pool_match')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [closedSystem, setClosedSystem] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [showMatch, setShowMatch] = useState(false)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: p } = await sb.from('profiles').select('role').eq('id', data.session.user.id).single()
      const r = (p as any)?.role ?? 'client'
      setUserRole(r)
      setFlow(isDevOrAdmin(r) ? 'dev_invites_client' : 'pool_match')
    })
  }, [])

  const eff = effectiveRole(userRole)

  async function send() {
    if (!email.includes('@')) { setError('Bitte gültige E-Mail.'); return }
    setSending(true); setError('')
    try {
      const { data: { user } } = await sb.auth.getUser()
      const role = flow === 'client_invites_dev' ? 'dev' : 'client'
      const res = await fetch('/api/invites/send', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
          invitedName: name.trim() || null,
          accessMode: closedSystem ? 'closed' : 'open',
          fromUserId: user?.id,
          fromUserEmail: user?.email,
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      // Mirror to support_messages so the founder sees it in master-control
      await sb.from('support_messages').insert({
        user_id: user?.id, email: user?.email, page: '/invite',
        message: `Neue ${role}-Einladung von ${user?.email} an ${email} (Mode: ${closedSystem?'closed':'open'}).${d.mailSent?' Mail versendet.':''}`,
      }).catch(() => {})
      setSent(true)
    } catch (e: any) { setError(e?.message ?? 'Fehler') }
    setSending(false)
  }

  if (showMatch) return (
    <div className="page-content animate-fade-up" style={{ maxWidth:760 }}>
      <DevMatchAnimation
        mode="pool"
        candidates={[
          { id:'1', name:'Lukas',  initial:'L' },
          { id:'2', name:'Anna',   initial:'A' },
          { id:'3', name:'Marcus', initial:'M' },
          { id:'4', name:'Sophie', initial:'S' },
          { id:'5', name:'David',  initial:'D' },
          { id:'6', name:'Emma',   initial:'E' },
        ]}
        matched={{ id:'2', name:'Anna', initial:'A' }}
        status="matched"
      />
      <div style={{ textAlign:'center', marginTop:24 }}>
        <button onClick={() => setShowMatch(false)} style={{ padding:'10px 20px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, fontSize:13, fontWeight:600, color:'var(--text)', cursor:'pointer', fontFamily:'inherit' }}>
          ← Zurück
        </button>
      </div>
    </div>
  )

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth:780 }}>
      <div className="page-header">
        <h1>Team-Einladung</h1>
        <p>Bring deine Mitstreiter an Bord — oder lass Tagro einen passenden Dev finden.</p>
      </div>

      {/* Flow selector — only for admins */}
      {isDevOrAdmin(userRole) && (
        <div style={{ display:'flex', gap:6, marginBottom:18, padding:4, background:'var(--surface-2)', borderRadius:11, width:'fit-content' }}>
          <button onClick={() => setFlow('dev_invites_client')} style={{ padding:'7px 14px', borderRadius:8, border:'none', background:flow==='dev_invites_client'?'var(--surface)':'transparent', color:flow==='dev_invites_client'?'var(--text)':'var(--text-muted)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Client einladen</button>
          <button onClick={() => setFlow('client_invites_dev')} style={{ padding:'7px 14px', borderRadius:8, border:'none', background:flow==='client_invites_dev'?'var(--surface)':'transparent', color:flow==='client_invites_dev'?'var(--text)':'var(--text-muted)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Dev einladen (intern)</button>
          <button onClick={() => setFlow('pool_match')} style={{ padding:'7px 14px', borderRadius:8, border:'none', background:flow==='pool_match'?'var(--surface)':'transparent', color:flow==='pool_match'?'var(--text)':'var(--text-muted)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Match aus Pool</button>
        </div>
      )}

      {/* THREE MODE CARDS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:14, marginBottom:22 }}>
        {[
          { id:'pool',     icon:'🎯', title:'Festag Pool', desc:'Tagro AI matched dich mit dem perfekten Dev aus unserem Team. Schnellster Weg zum Start.', flow:'pool_match' },
          { id:'invited',  icon:'🔗', title:'Eigener Dev', desc:'Du arbeitest schon mit einem Dev oder einer Agentur. Lade ihn ein — er bekommt geschlossenen Zugang.', flow:'client_invites_dev' },
          { id:'company',  icon:'🏢', title:'Firmen-Setup', desc:'Du bist Agentur und willst deine Kunden hier verwalten. Lade Clients ein, behalte volle Kontrolle.', flow:'dev_invites_client' },
        ].map(m => {
          const on = flow === m.flow
          return (
            <button key={m.id} onClick={() => setFlow(m.flow as Flow)}
              style={{ textAlign:'left', padding:'18px 18px', background:on?'linear-gradient(135deg,rgba(99,102,241,.05),var(--card))':'var(--card)', border:`1.5px solid ${on?'#6366f1':'var(--border)'}`, borderRadius:14, cursor:'pointer', fontFamily:'inherit', boxShadow: on?'0 8px 24px rgba(99,102,241,.15)':'none', transition:'all .15s' }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{m.icon}</div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>{m.title}</p>
              <p style={{ fontSize:12, color:'var(--text-secondary)', margin:0, lineHeight:1.5 }}>{m.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Flow content */}
      {flow === 'pool_match' && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:24, textAlign:'center' }}>
          <h2 style={{ fontSize:20, margin:'0 0 8px', letterSpacing:'-.3px' }}>Lass Tagro einen Dev finden</h2>
          <p style={{ fontSize:14, color:'var(--text-secondary)', margin:'0 0 22px', lineHeight:1.6 }}>
            Tagro AI analysiert dein Projekt und schlägt aus unserem Pool den passenden Developer vor. Du siehst die Match-Animation in Echtzeit.
          </p>
          <button onClick={() => setShowMatch(true)} style={{ padding:'13px 28px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:11, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 8px 24px rgba(99,102,241,.3)' }}>
            🎯 Match starten — Demo
          </button>
        </div>
      )}

      {(flow === 'client_invites_dev' || flow === 'dev_invites_client') && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:24 }}>
          <h2 style={{ fontSize:18, margin:'0 0 14px', letterSpacing:'-.3px' }}>
            {flow === 'client_invites_dev' ? 'Dev / Agentur einladen' : 'Client einladen'}
          </h2>
          {sent ? (
            <div style={{ padding:22, background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.2)', borderRadius:12, textAlign:'center' }}>
              <div style={{ width:46, height:46, borderRadius:'50%', background:'#22c55e', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>Einladung versendet</p>
              <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:0, lineHeight:1.55 }}>
                Wir prüfen die Anfrage und senden den Zugang an <strong>{email}</strong>. Bestätigung läuft an unser Team.
              </p>
              <button onClick={() => { setSent(false); setEmail(''); setName('') }} style={{ marginTop:14, padding:'8px 16px', background:'transparent', border:'1px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
                Weitere einladen
              </button>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', display:'block', marginBottom:6 }}>NAME (OPTIONAL)</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Max Mustermann"
                    style={{ width:'100%', padding:'11px 14px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', display:'block', marginBottom:6 }}>E-MAIL *</label>
                  <input value={email} type="email" onChange={e => setEmail(e.target.value)} placeholder={flow==='client_invites_dev'?'dev@deine-agentur.com':'kunde@firma.com'}
                    style={{ width:'100%', padding:'11px 14px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
                </div>
                <label style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, cursor:'pointer' }}>
                  <input type="checkbox" checked={closedSystem} onChange={e => setClosedSystem(e.target.checked)} style={{ marginTop:3 }}/>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 3px' }}>Geschlossenes System</p>
                    <p style={{ fontSize:11.5, color:'var(--text-secondary)', margin:0, lineHeight:1.5 }}>
                      {flow === 'client_invites_dev'
                        ? 'Der Dev sieht NUR deine Projekte — keine öffentlichen Festag-Aufträge. Empfohlen für Outbound-Devs / Agenturen.'
                        : 'Der Client kann nur mit dir arbeiten — kein anderer Festag-Dev kann sein Projekt übernehmen. Empfohlen für deine Stamm-Kunden.'}
                    </p>
                  </div>
                </label>
                {error && <p style={{ fontSize:13, color:'#ef4444', margin:0, padding:'8px 12px', background:'rgba(239,68,68,.06)', borderRadius:8 }}>{error}</p>}
                <button onClick={send} disabled={!email || sending}
                  style={{ padding:'12px 20px', background: email && !sending ? 'var(--btn-prim)' : 'var(--surface-2)', color: email && !sending ? 'var(--btn-prim-text)' : 'var(--text-muted)', border:'none', borderRadius:11, fontSize:14, fontWeight:700, cursor: email && !sending ? 'pointer' : 'default', fontFamily:'inherit' }}>
                  {sending ? 'Wird versendet…' : 'Einladung absenden →'}
                </button>
              </div>

              {/* How it works */}
              <div style={{ marginTop:22, padding:'14px 16px', background:'var(--surface-2)', borderRadius:11, border:'1px solid var(--border)' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', margin:'0 0 8px' }}>SO LÄUFT DAS</p>
                <ol style={{ margin:0, padding:'0 0 0 18px', display:'flex', flexDirection:'column', gap:5 }}>
                  <li style={{ fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.55 }}>Wir prüfen die Einladung intern (Sicherheits-Check).</li>
                  <li style={{ fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.55 }}>Eingeladene erhalten eine Mail mit Zugang + initialem PIN.</li>
                  <li style={{ fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.55 }}>Beim ersten Login muss der PIN geändert werden — Profil eingerichtet.</li>
                  <li style={{ fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.55 }}>Tagro AI lernt das neue Profil und passt Vorschläge an.</li>
                </ol>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
