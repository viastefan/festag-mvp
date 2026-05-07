'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  X, Envelope, Check, Star, Code, Buildings, Briefcase,
  Eye, EyeSlash, CaretRight, UsersThree, Clock, Lightning,
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
    mailto: 'mailto:stefandirnberger@viawen.com?subject=Corporate%20Integration',
  },
]

type SeatRow = {
  id:           string
  user_id:      string | null
  role:         string
  status:       'reserved' | 'active' | 'suspended' | 'revoked'
  activated_at: string | null
  invite_id:    string | null
  email?:       string | null
  invited_name?: string | null
}

export default function TeamsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState<'collaborator'|'dev'>('collaborator')
  const [sent,    setSent]    = useState(false)
  const [sending, setSending] = useState(false)
  const [seats,   setSeats]   = useState<SeatRow[]>([])
  const [seatsLoading, setSeatsLoading] = useState(false)
  const [activatingId, setActivatingId] = useState<string|null>(null)

  // Lade Seats des Tenants (Owner = aktueller User) wenn das Modal geöffnet wird
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setSeatsLoading(true)
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user || cancelled) { setSeatsLoading(false); return }

        const { data } = await (sb as any)
          .from('seats')
          .select('id, user_id, role, status, activated_at, invite_id, team_invites(email, invited_name)')
          .eq('tenant_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (cancelled) return
        const flattened = ((data as any[]) ?? []).map((s: any) => ({
          id: s.id, user_id: s.user_id, role: s.role,
          status: s.status, activated_at: s.activated_at,
          invite_id: s.invite_id,
          email: s.team_invites?.email ?? null,
          invited_name: s.team_invites?.invited_name ?? null,
        }))
        setSeats(flattened)
      } catch { /* ignore — tabelle könnte noch nicht migriert sein */ }
      setSeatsLoading(false)
    })()
    return () => { cancelled = true }
  }, [open, sent])

  async function activateSeat(seatId: string) {
    setActivatingId(seatId)
    try {
      const res = await fetch('/api/seats/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId }),
      })
      if (res.ok) {
        setSeats(prev => prev.map(s => s.id === seatId ? { ...s, status: 'active', activated_at: new Date().toISOString() } : s))
      }
    } catch (e) { console.error(e) }
    setActivatingId(null)
  }

  async function send() {
    if (!email.includes('@')) return
    setSending(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      // Triggert /api/invites/send → erzeugt accept_token, speichert team_invites,
      // verschickt Acceptance-Mail (ohne PIN). PIN kommt erst nach Annahme.
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

  const reservedSeats = seats.filter(s => s.status === 'reserved')
  const activeSeats   = seats.filter(s => s.status === 'active')

  // Aktiv ausgewähltes Team-Modell — visuelle Hervorhebung + Rolle wird übernommen.
  const [selectedModel, setSelectedModel] = useState<string>('dev')

  function pickModel(modelId: string) {
    setSelectedModel(modelId)
    // Modell → Rolle mapping
    if (modelId === 'dev')           setRole('dev')
    else if (modelId === 'corporate') setRole('dev')
    else                              setRole('collaborator')
    // Fokus auf Email-Eingabe
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('input[type=email]')?.focus()
    }, 50)
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
                  Der Eingeladene erhält eine Mail mit Acceptance-Link. Erst nach Annahme wird automatisch der Zugangs-PIN versendet.
                </p>
              </div>

              {/* Seats Section — Reserviert + Aktiv */}
              {(reservedSeats.length > 0 || activeSeats.length > 0 || seatsLoading) && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 2px 8px' }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase', margin:0 }}>
                      Seats
                    </p>
                    {reservedSeats.length > 0 && (
                      <span style={{ fontSize:10.5, color:'var(--text-muted)', fontWeight:600 }}>
                        {reservedSeats.length} wartet auf Aktivierung
                      </span>
                    )}
                  </div>

                  {/* Reservierte Seats */}
                  {reservedSeats.map(s => (
                    <div key={s.id} style={{
                      padding:'10px 12px', marginBottom: 6,
                      background:'var(--surface)', border:'1px solid var(--border)',
                      borderRadius: 11,
                      display:'flex', alignItems:'center', gap: 10,
                    }}>
                      <div style={{
                        width:28, height:28, borderRadius:8,
                        background:'var(--surface-2)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        flexShrink: 0,
                      }}>
                        <Clock size={13} weight="regular" color="var(--text-muted)"/>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', margin: 0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {s.invited_name || s.email || 'Unbenannt'}
                        </p>
                        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '1px 0 0', lineHeight: 1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {s.email && s.invited_name ? s.email + ' · ' : ''}{s.role === 'dev' ? 'Developer' : s.role === 'admin' ? 'Admin' : 'Mitglied'} · reserviert
                        </p>
                      </div>
                      <button
                        onClick={() => activateSeat(s.id)}
                        disabled={activatingId === s.id}
                        style={{
                          padding:'6px 11px', borderRadius: 8,
                          border: 'none',
                          background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
                          fontSize: 11, fontWeight: 700,
                          cursor: activatingId === s.id ? 'default' : 'pointer',
                          fontFamily:'inherit', display:'flex', alignItems:'center', gap: 5,
                          flexShrink: 0,
                          opacity: activatingId === s.id ? .65 : 1,
                          transition: 'opacity .15s',
                        }}
                      >
                        {activatingId === s.id
                          ? <span style={{ width:11, height:11, border:'2px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                          : <Lightning size={11} weight="fill"/>}
                        Aktivieren
                      </button>
                    </div>
                  ))}

                  {/* Aktive Seats */}
                  {activeSeats.map(s => (
                    <div key={s.id} style={{
                      padding:'10px 12px', marginBottom: 6,
                      background:'var(--surface)', border:'1px solid var(--border)',
                      borderRadius: 11,
                      display:'flex', alignItems:'center', gap: 10,
                    }}>
                      <div style={{
                        width:28, height:28, borderRadius:8,
                        background: 'var(--green-bg, rgba(34,197,94,0.12))',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        flexShrink: 0,
                      }}>
                        <Check size={12} weight="bold" color="var(--green)"/>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', margin: 0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {s.invited_name || s.email || 'Aktiv'}
                        </p>
                        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '1px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {s.role === 'dev' ? 'Developer' : s.role === 'admin' ? 'Admin' : 'Mitglied'} · aktiv
                        </p>
                      </div>
                    </div>
                  ))}

                  {seatsLoading && reservedSeats.length === 0 && activeSeats.length === 0 && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, padding: '4px 2px' }}>Lade Seats …</p>
                  )}
                </div>
              )}

              {/* Models */}
              <div style={{ marginBottom:8 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase', margin:'0 0 10px' }}>Team-Modelle</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {MODELS.map(m => {
                    const isSelected = selectedModel === m.id
                    return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => !m.mailto && pickModel(m.id)}
                      style={{
                        position:'relative',
                        padding:'14px 14px 12px',
                        background: isSelected ? 'var(--card)' : 'var(--surface)',
                        border: `1.5px solid ${isSelected ? 'var(--text)' : 'var(--border)'}`,
                        borderRadius: 8,
                        display:'flex', flexDirection:'column',
                        textAlign:'left',
                        fontFamily:'inherit', cursor: m.mailto ? 'default' : 'pointer',
                        transition:'border-color .15s, background .15s',
                      }}
                      onMouseEnter={e => { if (!isSelected && !m.mailto) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                    >
                      {isSelected && (
                        <span style={{
                          position:'absolute', top:10, right:10,
                          width:18, height:18, borderRadius:'50%',
                          background:'var(--text)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <Check size={10} weight="bold" color="var(--bg)"/>
                        </span>
                      )}
                      {m.badge && !isSelected && (
                        <span style={{ position:'absolute', top:10, right:10, padding:'2px 7px', borderRadius:999, background:'var(--surface-2)', color:'var(--text-muted)', fontSize:8.5, fontWeight:700, letterSpacing:'.1em' }}>{m.badge}</span>
                      )}
                      <div style={{
                        width:30, height:30, borderRadius:9,
                        background: isSelected ? 'var(--text)' : 'var(--surface-2)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        marginBottom:10,
                      }}>
                        <m.Icon size={14} weight="regular" color={isSelected ? 'var(--bg)' : 'var(--text-secondary)'} />
                      </div>
                      <p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 2px' }}>{m.eyebrow}</p>
                      <h3 style={{ fontSize:14, fontWeight:700, margin:'0 0 1px', letterSpacing:'-.2px', color:'var(--text)' }}>{m.title}</h3>
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
                        <a href={m.mailto}
                          onClick={e => e.stopPropagation()}
                          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 10px', background:'var(--surface-2)', color:'var(--text)', borderRadius:8, fontSize:11.5, fontWeight:700, textDecoration:'none', border:'1px solid var(--border)' }}>
                          Anfragen <CaretRight size={9} weight="bold" />
                        </a>
                      ) : (
                        <span
                          style={{
                            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                            padding:'7px 10px',
                            background: isSelected ? 'var(--btn-prim)' : 'var(--surface-2)',
                            color: isSelected ? 'var(--btn-prim-text)' : 'var(--text)',
                            borderRadius: 8,
                            fontSize: 11.5, fontWeight: 700,
                            border: `1px solid ${isSelected ? 'transparent' : 'var(--border)'}`,
                            transition:'all .15s',
                          }}
                        >
                          {isSelected ? 'Ausgewählt' : 'Wählen'}
                          {!isSelected && <CaretRight size={9} weight="bold" />}
                        </span>
                      )}
                    </button>
                  )})}
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
