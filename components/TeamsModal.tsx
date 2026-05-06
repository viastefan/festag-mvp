'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  X, Envelope, Check, Star, Code, Buildings, Briefcase,
  Eye, EyeSlash, CaretRight, UsersThree,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

const MODELS = [
  {
    id: 'client',  Icon: Star, eyebrow: 'COLLABORATION',
    title: 'Client Team', subtitle: 'Founder & Co-Founder',
    desc: 'Maximale Kontrolle für die Führungsebene.',
    access: ['AI-Kontext & Roadmap', 'Budget & Strategie', 'Progress-Reports'],
    denied: [],
  },
  {
    id: 'dev', Icon: Code, eyebrow: 'EXECUTION',
    title: 'Developer Team', subtitle: 'Lead Dev & Dev-Partner',
    desc: 'Fokus auf Code-Produktion. Tasks, Deployments und Doku geteilt.',
    access: ['Tasks & Sprint-Board', 'Deployments', 'Tech-Doku'],
    denied: ['Founder-Strategie'],
    badge: 'BELIEBT',
  },
  {
    id: 'agency', Icon: Buildings, eyebrow: 'MULTI-CLIENT',
    title: 'Agency Ecosystem', subtitle: 'Agentur & Clients (isoliert)',
    desc: 'Jeder Client = ein isolierter Team-Context.',
    access: ['Team-Switcher', 'Eigener Kontext pro Client'],
    denied: ['Andere Client-Workspaces'],
  },
  {
    id: 'corporate', Icon: Briefcase, eyebrow: 'ENTERPRISE',
    title: 'Corporate Integration', subtitle: 'Unternehmen & Inhouse-Dev',
    desc: 'Festangestellter Dev mit dediziertem Zugang.',
    access: ['Zugewiesene Projekte', 'Technische Tasks'],
    denied: ['Strategie-Dashboard'],
    badge: 'ENTERPRISE',
    mailto: 'mailto:hello@festag.io?subject=Corporate%20Integration',
  },
]

export default function TeamsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState<'collaborator'|'dev'>('collaborator')
  const [sent,    setSent]    = useState(false)
  const [sending, setSending] = useState(false)

  async function send() {
    if (!email.includes('@')) return
    setSending(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      // Triggert /api/invites/send → erzeugt PIN, speichert team_invites,
      // verschickt IONOS-Mail an Empfänger und CC an Founder.
      await fetch('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
          fromUserId: user?.id ?? null,
          fromUserEmail: user?.email ?? null,
          accessMode: 'team',
        }),
      })
      setSent(true); setEmail('')
      setTimeout(() => setSent(false), 2800)
    } catch (e) { console.error(e) }
    setSending(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .18 }}
            onClick={onClose}
            style={{
              position:'fixed', inset:0, zIndex:9000,
              background:'rgba(0,0,0,0.45)',
              backdropFilter:'blur(14px) saturate(160%)',
              WebkitBackdropFilter:'blur(14px) saturate(160%)',
            }}
          />
          {/* Centering wrapper — flex avoids transform conflict with Framer Motion */}
          <div style={{
            position:'fixed', inset:0, zIndex:9001,
            display:'flex', alignItems:'center', justifyContent:'center',
            pointerEvents:'none',
          }}>
          <motion.div
            initial={{ opacity: 0, scale: .96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .97, y: 8 }}
            transition={{ type:'spring', stiffness:380, damping:32 }}
            style={{
              pointerEvents:'auto',
              width:'min(720px, calc(100vw - 32px))',
              maxHeight:'min(720px, calc(100vh - 40px))',
              display:'flex', flexDirection:'column',
              background:'var(--sidebar-bg)',
              backdropFilter:'blur(40px) saturate(200%)',
              WebkitBackdropFilter:'blur(40px) saturate(200%)',
              border:'1px solid var(--border-strong)',
              borderRadius:24,
              boxShadow:'0 32px 80px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)',
              overflow:'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding:'20px 24px 16px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              borderBottom:'1px solid var(--border)',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{
                  width:36, height:36, borderRadius:11,
                  background:'var(--surface-2)', border:'1px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <UsersThree size={18} weight="regular" color="var(--text)" />
                </div>
                <div>
                  <h2 style={{ margin:0, fontSize:17, fontWeight:700, letterSpacing:'-.3px' }}>Teams</h2>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-muted)' }}>Mitglieder einladen & Modell wählen</p>
                </div>
              </div>
              <button onClick={onClose}
                style={{ width:32, height:32, borderRadius:9, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', transition:'background .12s, color .12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='var(--text)'; (e.currentTarget as HTMLElement).style.background='var(--card)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='var(--text-muted)'; (e.currentTarget as HTMLElement).style.background='transparent' }}>
                <X size={14} weight="bold" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding:'18px 24px 22px', overflowY:'auto', flex:1 }}>

              {/* Quick Invite */}
              <div style={{
                padding:'14px 16px',
                background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:14, marginBottom:18,
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase', margin:0 }}>Schnell-Einladung</p>
                  {sent && (
                    <motion.span
                      initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }}
                      style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'var(--green)' }}>
                      <Check size={11} weight="bold" /> Gesendet
                    </motion.span>
                  )}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <input
                    value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                    type="email" placeholder="name@firma.com"
                    style={{ flex:1, padding:'10px 13px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:13.5, color:'var(--text)', fontFamily:'inherit', outline:'none', transition:'border-color .15s' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  <select value={role} onChange={e => setRole(e.target.value as any)}
                    style={{ padding:'10px 12px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
                    <option value="collaborator">Client</option>
                    <option value="dev">Developer</option>
                  </select>
                  <button onClick={send} disabled={!email.includes('@') || sending}
                    style={{ padding:'10px 16px', borderRadius:10, border:'none',
                      background: email.includes('@') ? 'var(--btn-prim)' : 'var(--surface-2)',
                      color: email.includes('@') ? 'var(--btn-prim-text)' : 'var(--text-muted)',
                      fontSize:13, fontWeight:700, cursor: email.includes('@') ? 'pointer' : 'default',
                      fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap',
                      transition:'background .15s, color .15s',
                    }}>
                    {sending
                      ? <span style={{ width:13, height:13, border:'2px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                      : <Envelope size={13} weight="bold" />
                    }
                    Senden
                  </button>
                </div>
                <p style={{ fontSize:11, color:'var(--text-muted)', margin:'8px 0 0', lineHeight:1.5 }}>
                  Direkt einladen — der Eingeladene bekommt nach Prüfung den Zugang per E-Mail.
                </p>
              </div>

              {/* Models */}
              <div style={{ marginBottom:8 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase', margin:'0 0 10px' }}>Team-Modelle</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {MODELS.map(m => (
                    <div key={m.id}
                      style={{ position:'relative', padding:'14px 14px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, display:'flex', flexDirection:'column' }}>
                      {m.badge && (
                        <span style={{ position:'absolute', top:10, right:10, padding:'2px 7px', borderRadius:999, background:'var(--surface-2)', color:'var(--text-muted)', fontSize:8.5, fontWeight:700, letterSpacing:'.1em' }}>{m.badge}</span>
                      )}
                      <div style={{ width:30, height:30, borderRadius:9, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                        <m.Icon size={14} weight="regular" color="var(--text-secondary)" />
                      </div>
                      <p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 2px' }}>{m.eyebrow}</p>
                      <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 1px', letterSpacing:'-.2px' }}>{m.title}</h3>
                      <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'0 0 7px', fontWeight:500 }}>{m.subtitle}</p>
                      <p style={{ fontSize:11.5, color:'var(--text-secondary)', margin:'0 0 10px', lineHeight:1.5, flex:1 }}>{m.desc}</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:1, marginBottom:10 }}>
                        {m.access.map(a => (
                          <div key={a} style={{ display:'flex', alignItems:'center', gap:6, padding:'2px 0' }}>
                            <Eye size={9} weight="regular" color="var(--green)" />
                            <span style={{ fontSize:10.5, color:'var(--text-secondary)' }}>{a}</span>
                          </div>
                        ))}
                        {m.denied.map(d => (
                          <div key={d} style={{ display:'flex', alignItems:'center', gap:6, padding:'2px 0' }}>
                            <EyeSlash size={9} weight="regular" color="var(--text-muted)" />
                            <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>{d}</span>
                          </div>
                        ))}
                      </div>
                      {m.mailto ? (
                        <a href={m.mailto} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 10px', background:'var(--surface-2)', color:'var(--text)', borderRadius:8, fontSize:11.5, fontWeight:700, textDecoration:'none', border:'1px solid var(--border)' }}>
                          Anfragen <CaretRight size={9} weight="bold" />
                        </a>
                      ) : (
                        <button onClick={() => { setRole(m.id === 'dev' ? 'dev' : 'collaborator'); document.querySelector<HTMLInputElement>('input[type=email]')?.focus() }}
                          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, width:'100%', padding:'7px 10px', background:'var(--surface-2)', color:'var(--text)', borderRadius:8, fontSize:11.5, fontWeight:700, border:'1px solid var(--border)', cursor:'pointer', fontFamily:'inherit' }}>
                          Wählen <CaretRight size={9} weight="bold" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </AnimatePresence>
  )
}
