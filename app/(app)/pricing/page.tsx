'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PaymentModal, { BankData, PAYMENT_POLL_DURATION_MS } from '@/components/PaymentModal'

/**
 * Pricing — Apple-clean rebuild. Reference design lives at festag.io.
 * No purple/violet, no emojis, no playful gradients.
 * Token-driven so dark/read modes feel native.
 */

type Plan = {
  id: string
  name: string
  price: number | null
  unit: string
  category: string
  tagline: string
  features: string[]
  cta: string
  highlight?: boolean
  badge?: string
  guarantee?: string
}

const PLANS: Plan[] = [
  {
    id: 'starter', name: 'Starter', price: 1500, unit: 'ab',
    category: 'DER PERFEKTE EINSTIEG',
    tagline: 'Für Solo-Gründer & MVPs.',
    features: [
      '1 Entwickler',
      'High-End Website',
      'Individuelles Figma UI',
      'Projekt-Basis',
      'Tagro AI Projekt-Aufnahme',
      'E-Mail Support',
    ],
    cta: 'Paket buchen',
    guarantee: '+ 30 Tage Garantie',
  },
  {
    id: 'pro', name: 'Pro', price: 2800, unit: 'ab',
    category: 'WACHSENDE SYSTEME',
    tagline: 'Für skalierende Startups.',
    features: [
      '1 Entwickler (dediziert)',
      'Website, App, SaaS Lösung',
      'Individuelles Figma UI',
      'Festag AI Features +',
      "Dev'ler Direktkontakt",
      '2 Client Seats',
      'Priorisierter Support',
      'mtl. Wartung (zubuchbar)',
    ],
    cta: 'Paket buchen',
    highlight: true,
    badge: 'EMPFOHLEN',
    guarantee: '+ 3 Monate Garantie',
  },
  {
    id: 'growth', name: 'Growth', price: 4000, unit: 'ab',
    category: 'KMU & STARTUP',
    tagline: 'Für etablierte Companies.',
    features: [
      '1–2 Entwickler',
      'Full Eco-System',
      'KI Systemintegrationen',
      'Individuelles Figma UI',
      'Festag AI Vollumfänglich +',
      "Dev'ler Direktkontakt",
      'bis zu 4 Client Seats',
      '24/7 Priorisierter Support',
      'mtl. Full-Service (zubuchbar)',
    ],
    cta: 'Paket buchen',
    guarantee: '+ 3 Monate Garantie',
  },
  {
    id: 'scale', name: 'Scale', price: null, unit: 'Individuell',
    category: 'ENTERPRISE LÖSUNGEN',
    tagline: 'Enterprise & Konzerne.',
    features: [
      'Unbegrenzte Entwickler',
      'External Eco-System',
      'KI Systemintegrationen',
      'Individuelles Figma UI',
      'Festag AI Vollumfänglich +',
      "Dev'ler Direktkontakt",
      'bis zu 8 Client Seats',
      '24/7 Priorisierter Support',
      'mtl. Full-Service (zubuchbar)',
    ],
    cta: 'Support kontaktieren',
  },
]

const MANAGED = {
  name: 'Managed Service',
  price: 199, unit: '€/Monat ab',
  tagline: 'Laufender Betrieb deiner App.',
  features: ['Hosting + Monitoring', 'Wartung + Updates', 'Bug Fixes inklusive', 'Performance Reports'],
}

function CheckIco({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function ShieldIco({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

type PlanPurchase = {
  planId: string; reference: string; status: 'active'|'pending'
  createdAt: number; completedAt?: number
}
type ActiveSession = { planId: string; bankData: BankData; startedAt: number }

export default function PricingPage() {
  const [billing, setBilling] = useState<'project'|'managed'>('project')
  const [oneShot, setOneShot] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState<string|null>(null)
  const [error, setError] = useState<string|null>(null)

  // Enjyn payment state
  const [userId, setUserId] = useState('')
  const [paying, setPaying] = useState<Plan | null>(null)
  const [purchases, setPurchases] = useState<Record<string, PlanPurchase>>({})
  const [resumeSession, setResumeSession] = useState<ActiveSession | null>(null)
  const [toast, setToast] = useState<{ kind:'success'|'pending'; text:string } | null>(null)
  const [guaranteeFor, setGuaranteeFor] = useState<Plan | null>(null)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(({ data }) => {
      if (data.session?.user.id) setUserId(data.session.user.id)
    })
  }, [])

  const purchasesKey = userId ? `plan_purchases_${userId}` : ''
  const sessionKey = userId ? `plan_active_session_${userId}` : ''
  const purchasesKeyRef = useRef(purchasesKey)
  purchasesKeyRef.current = purchasesKey

  const persist = useCallback((updater: (prev: Record<string, PlanPurchase>) => Record<string, PlanPurchase>) => {
    setPurchases(prev => {
      const next = updater(prev)
      if (purchasesKeyRef.current && typeof window !== 'undefined') {
        window.localStorage.setItem(purchasesKeyRef.current, JSON.stringify(next))
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!purchasesKey || typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(purchasesKey)
      if (raw) setPurchases(JSON.parse(raw))
    } catch {}
  }, [purchasesKey])

  // Resume offene Zahlungs-Session
  const resumeAttemptedRef = useRef(false)
  useEffect(() => {
    if (!sessionKey || typeof window === 'undefined') return
    if (resumeAttemptedRef.current) return
    try {
      const raw = window.localStorage.getItem(sessionKey)
      if (!raw) { resumeAttemptedRef.current = true; return }
      const data: ActiveSession = JSON.parse(raw)
      const purchasesRaw = purchasesKey ? window.localStorage.getItem(purchasesKey) : null
      const cur = purchasesRaw ? JSON.parse(purchasesRaw) : {}
      if (cur[data.planId]?.status === 'active' || Date.now() - data.startedAt > PAYMENT_POLL_DURATION_MS + 60_000) {
        window.localStorage.removeItem(sessionKey); resumeAttemptedRef.current = true; return
      }
      const plan = PLANS.find(p => p.id === data.planId)
      if (!plan) { window.localStorage.removeItem(sessionKey); resumeAttemptedRef.current = true; return }
      resumeAttemptedRef.current = true
      setResumeSession(data); setPaying(plan)
    } catch {
      window.localStorage.removeItem(sessionKey); resumeAttemptedRef.current = true
    }
  }, [sessionKey, purchasesKey])

  function clearActiveSessionStorage() {
    if (typeof window !== 'undefined' && sessionKey) window.localStorage.removeItem(sessionKey)
  }
  function fullResetActiveSession() { clearActiveSessionStorage(); setResumeSession(null) }
  function persistActiveSession(planId: string, bankData: BankData, startedAt: number) {
    if (typeof window !== 'undefined' && sessionKey) {
      window.localStorage.setItem(sessionKey, JSON.stringify({ planId, bankData, startedAt }))
    }
  }

  function buy(plan: Plan) {
    if (!plan.price) {
      window.location.href = 'mailto:hello@festag.io?subject=' + encodeURIComponent(`Anfrage: ${plan.name} Plan`)
      return
    }
    if (purchases[plan.id]?.status === 'active') return
    setError(null); setPaying(plan)
  }

  // BACKUP: Mollie-Flow bleibt im Code fuer den Fall, dass spaeter
  // wieder Mollie genutzt wird. Aktiv ist Enjyn (PaymentModal).
  // Um zu wechseln: in der Karte onClick={() => buyViaMollie(plan)}.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function buyViaMollie(plan: Plan) {
    if (!plan.price) {
      window.location.href = 'mailto:hello@festag.io?subject=' + encodeURIComponent(`Anfrage: ${plan.name} Plan`); return
    }
    setLoadingPlan(plan.id); setError(null)
    try {
      const res = await fetch('/api/payments/mollie', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ amount: plan.price, description: `Festag ${plan.name} Plan`, metadata: { plan: plan.id } }),
      })
      const data = await res.json()
      if (data.checkoutUrl) window.location.href = data.checkoutUrl
      else { setError(data.error ?? 'Buchung nicht möglich. Bitte Support kontaktieren.'); setLoadingPlan(null) }
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen.'); setLoadingPlan(null)
    }
  }

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth:1240, padding:'24px 22px 80px' }}>
      <style>{`
        .pp-card { transition: border-color .2s ease, transform .2s ease; will-change: transform; }
        .pp-card:hover { transform: translateY(-2px); }
        .pp-toggle-wrap { display:inline-flex; padding:4px; background:var(--surface-2); border-radius:999px; gap:2px; }
        .pp-toggle-btn { padding:8px 18px; font-size:13px; font-weight:600; border:none; background:transparent; color:var(--text-muted); border-radius:999px; cursor:pointer; font-family:inherit; transition:color .15s, background .15s; -webkit-tap-highlight-color:transparent; }
        .pp-toggle-btn.on { background:var(--surface); color:var(--text); box-shadow:0 1px 3px rgba(0,0,0,.05); }
        .pp-cta {
          width:100%; padding:13px 18px; border-radius:14px;
          border:none; cursor:pointer; font-family:inherit;
          font-size:14px; font-weight:600; letter-spacing:-.1px;
          transition:opacity .12s, transform .1s; display:flex;
          align-items:center; justify-content:center; gap:6px;
          background:var(--btn-prim); color:var(--btn-prim-text);
          -webkit-tap-highlight-color:transparent;
        }
        .pp-cta:hover { opacity:.92; }
        .pp-cta:active { transform:scale(.985); }
        .pp-spin { width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:pp-rot .7s linear infinite; }
        @keyframes pp-rot { to { transform: rotate(360deg); } }
        .pp-radio { width:32px;height:18px;background:var(--text);border-radius:999px;position:relative;flex-shrink:0; }
        .pp-radio::after { content:''; position:absolute; top:2px; right:2px; width:14px; height:14px; border-radius:50%; background:var(--bg); }
      `}</style>

      {/* Header */}
      <div style={{ textAlign:'center', maxWidth:680, margin:'0 auto 30px' }}>
        <span style={{ display:'inline-block', padding:'4px 12px', borderRadius:999, background:'var(--surface-2)', color:'var(--text-secondary)', fontSize:11, fontWeight:600, letterSpacing:'.1em', marginBottom:14 }}>PREISE</span>
        <h1 style={{ fontSize:'clamp(28px, 5vw, 42px)', fontWeight:700, color:'var(--text)', letterSpacing:'-.7px', margin:'0 0 12px', lineHeight:1.08 }}>Wähle deinen Plan.</h1>
        <p style={{ fontSize:15.5, color:'var(--text-secondary)', margin:0, lineHeight:1.55 }}>
          Transparente Preise. Keine versteckten Kosten. Alle Pläne enthalten Festag AI &amp; Code-Garantie.
        </p>
        <div className="pp-toggle-wrap" style={{ marginTop:20 }}>
          <button className={`pp-toggle-btn ${billing==='project'?'on':''}`} onClick={() => setBilling('project')}>Projekt-Pakete</button>
          <button className={`pp-toggle-btn ${billing==='managed'?'on':''}`} onClick={() => setBilling('managed')}>Managed Service</button>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth:520, margin:'0 auto 22px', padding:'11px 14px', background:'var(--red-bg)', border:'1px solid rgba(220,70,70,.2)', borderRadius:'var(--r)', fontSize:13, color:'var(--red)', textAlign:'center' }}>{error}</div>
      )}

      {/* Plans grid */}
      {billing === 'project' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(248px, 1fr))', gap:14 }}>
          {PLANS.map(plan => {
            const rec = purchases[plan.id]
            const isActive = rec?.status === 'active'
            const isPending = rec?.status === 'pending'
            return (
            <div key={plan.id} className="pp-card" style={{
              background: 'var(--surface)',
              border: `1px solid ${isActive ? 'var(--green)' : isPending ? 'var(--amber)' : (plan.highlight ? 'var(--text)' : 'var(--border)')}`,
              borderRadius:20,
              padding:'24px 22px 22px',
              position:'relative',
              display:'flex',
              flexDirection:'column',
            }}>
              {(isActive || isPending) ? (
                <span style={{ position:'absolute', top:14, right:14, padding:'3px 9px', borderRadius:7, fontSize:9.5, fontWeight:700, letterSpacing:'.06em', display:'flex', alignItems:'center', gap:4,
                  background: isActive ? 'var(--green-bg)' : 'var(--amber-bg)',
                  color: isActive ? 'var(--green-dark)' : 'var(--amber-dark)',
                  border: `1px solid ${isActive ? 'var(--green-border)' : 'rgba(200,148,48,.25)'}`,
                }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background: isActive ? 'var(--green)' : 'var(--amber)', animation: isPending ? 'pulse 2s infinite' : 'none' }}/>
                  {isActive ? 'AKTIV' : 'AUSSTEHEND'}
                </span>
              ) : plan.badge && (
                <span style={{ position:'absolute', top:14, right:14, padding:'3px 10px', borderRadius:999, background:'var(--text)', color:'var(--bg)', fontSize:9.5, fontWeight:700, letterSpacing:'.1em' }}>{plan.badge}</span>
              )}
              <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.12em', margin:'0 0 12px' }}>{plan.category}</p>
              <h3 style={{ fontSize:26, fontWeight:700, color:'var(--text)', margin:'0 0 4px', letterSpacing:'-.6px' }}>{plan.name}</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 16px' }}>{plan.tagline}</p>

              <div style={{ marginBottom:16 }}>
                {plan.price !== null ? (
                  <>
                    <p style={{ fontSize:24, fontWeight:700, color:'var(--text)', margin:0, lineHeight:1.1, letterSpacing:'-.7px' }}>
                      <span style={{ fontSize:14, fontWeight:500, color:'var(--text-muted)' }}>{plan.unit} </span>
                      €{plan.price.toLocaleString('de')}
                    </p>
                    {plan.id !== 'scale' && (
                      <button onClick={() => setOneShot(v => !v)}
                        style={{ display:'flex', alignItems:'center', gap:9, marginTop:10, padding:0, background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                        <span className="pp-radio" style={{ background: oneShot ? 'var(--text)' : 'var(--border-strong)' }}/>
                        <span style={{ fontSize:12.5, color:'var(--text-secondary)', fontWeight:500 }}>einmalig zahlen</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p style={{ fontSize:22, fontWeight:700, color:'var(--text)', margin:0, lineHeight:1.2, letterSpacing:'-.5px' }}>Individuell</p>
                    <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:'4px 0 0' }}>Zeitraum nach Absprache</p>
                  </>
                )}
              </div>

              <ul style={{ listStyle:'none', padding:0, margin:'0 0 16px', display:'flex', flexDirection:'column', gap:10, flex:1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:13.5, color:'var(--text-secondary)', lineHeight:1.45 }}>
                    <span style={{ width:18, height:18, borderRadius:'50%', background:'var(--surface-2)', color:'var(--text)', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                      <CheckIco size={9}/>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.guarantee && (
                <button
                  onClick={() => setGuaranteeFor(plan)}
                  className="tap-scale"
                  title="Mehr Infos zur Garantie"
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 13px', marginBottom:12,
                    background:'var(--surface-2)', borderRadius:14, border:'1px solid var(--border)',
                    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  }}
                >
                  <span style={{ width:30, height:30, borderRadius:'50%', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text)', flexShrink:0 }}>
                    <ShieldIco size={14}/>
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:0, lineHeight:1.2 }}>{plan.guarantee}</p>
                    <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'1px 0 0' }}>Klicken für Details</p>
                  </div>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0 }}><path d="M9 6l6 6-6 6"/></svg>
                </button>
              )}

              <button
                onClick={() => buy(plan)}
                disabled={loadingPlan===plan.id || isActive}
                className="pp-cta"
                style={isActive
                  ? { background:'var(--green-bg)', color:'var(--green-dark)', cursor:'default' }
                  : isPending
                    ? { background:'var(--surface-2)', color:'var(--text-secondary)', cursor:'pointer' }
                    : undefined
                }
              >
                {loadingPlan === plan.id
                  ? <span className="pp-spin"/>
                  : isActive
                    ? <><CheckIco size={13}/>Plan aktiv</>
                    : isPending
                      ? 'Wartet auf Zahlung'
                      : plan.cta}
              </button>
              <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'10px 0 0', textAlign:'center', lineHeight:1.4 }}>
                **Preise hängen stark vom gewünschten Endprodukt ab.
              </p>
            </div>
          )})}
        </div>
      ) : (
        <div style={{ maxWidth:480, margin:'0 auto', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:30, textAlign:'center' }}>
          <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.12em', margin:'0 0 8px' }}>LAUFENDE BETREUUNG</p>
          <h3 style={{ fontSize:26, fontWeight:700, margin:'0 0 6px', letterSpacing:'-.5px' }}>{MANAGED.name}</h3>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 16px' }}>{MANAGED.tagline}</p>
          <p style={{ fontSize:30, fontWeight:700, color:'var(--text)', margin:'0 0 6px', letterSpacing:'-.7px' }}>
            €{MANAGED.price}<span style={{ fontSize:14, color:'var(--text-muted)', fontWeight:500 }}> / Monat ab</span>
          </p>
          <ul style={{ listStyle:'none', padding:0, margin:'18px 0 22px', display:'flex', flexDirection:'column', gap:10, textAlign:'left' }}>
            {MANAGED.features.map(f => (
              <li key={f} style={{ display:'flex', alignItems:'center', gap:9, fontSize:13.5, color:'var(--text-secondary)' }}>
                <span style={{ width:18, height:18, borderRadius:'50%', background:'var(--surface-2)', color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <CheckIco size={9}/>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <a href="mailto:hello@festag.io?subject=Managed%20Service%20Anfrage" className="pp-cta" style={{ textDecoration:'none' }}>
            Managed Service anfragen
          </a>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop:36, padding:'18px 22px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', display:'flex', gap:14, justifyContent:'space-between', alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:12.5, color:'var(--text-secondary)', fontWeight:500 }}>
          Server in Deutschland · DSGVO-konform · Zahlung über Enjyn · SEPA
        </span>
        <Link href="/messages" style={{ fontSize:13, color:'var(--text)', fontWeight:600, textDecoration:'none' }}>
          Fragen? Schreib Tagro →
        </Link>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          background: toast.kind === 'success' ? 'var(--green-bg)' : 'var(--amber-bg)',
          color: toast.kind === 'success' ? 'var(--green-dark)' : 'var(--amber-dark)',
          border: `1px solid ${toast.kind === 'success' ? 'var(--green-border)' : 'rgba(200,148,48,.25)'}`,
          padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:500,
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)', maxWidth:'calc(100% - 32px)', zIndex:400,
        }}>
          {toast.text}
        </div>
      )}

      {/* Garantie-Details-Modal */}
      {guaranteeFor && <GuaranteeModal plan={guaranteeFor} onClose={() => setGuaranteeFor(null)} />}

      {/* PaymentModal — Enjyn (primaerer Bezahlweg) */}
      {paying && paying.price !== null && (
        <PaymentModal
          amount={paying.price}
          note={`Plan: ${paying.name}`}
          itemTitle={`${paying.name} Plan`}
          resumeFrom={resumeSession ? { bankData: resumeSession.bankData, startedAt: resumeSession.startedAt } : undefined}
          onSessionReady={(bankData, startedAt) => persistActiveSession(paying.id, bankData, startedAt)}
          onClose={() => { setPaying(null); fullResetActiveSession() }}
          onSuccess={(reference) => {
            persist(prev => ({
              ...prev,
              [paying.id]: {
                planId: paying.id, reference, status:'active',
                createdAt: prev[paying.id]?.createdAt ?? Date.now(), completedAt: Date.now(),
              },
            }))
            clearActiveSessionStorage()
            setToast({ kind:'success', text: `${paying.name} Plan ist jetzt aktiv.` })
            setTimeout(() => setToast(null), 4000)
          }}
          onTimeout={(reference) => {
            persist(prev => ({ ...prev, [paying.id]: { planId:paying.id, reference, status:'pending', createdAt: Date.now() } }))
            clearActiveSessionStorage()
            setToast({ kind:'pending', text:`Zahlung noch nicht erkannt. ${paying.name} Plan wird automatisch in den nächsten 24h aktiviert.` })
            setTimeout(() => setToast(null), 7000)
          }}
        />
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Garantie-Details-Modal (Apple-clean, ohne Emojis)
// ───────────────────────────────────────────────────────────────────────

function GuaranteeModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const months = plan.guarantee?.includes('3 Monate') ? 3 : 1
  const isLong = months >= 3

  const iconProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' as const, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const ICON = {
    bug: <svg {...iconProps} stroke="var(--text)"><rect x="8" y="6" width="8" height="14" rx="4"/><path d="M8 12H4M16 12h4M9 6V4M15 6V4M8 16H5M16 16h3M8 9H5M16 9h3"/></svg>,
    perf: <svg {...iconProps} stroke="var(--text)"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>,
    sec: <svg {...iconProps} stroke="var(--text)"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
    target: <svg {...iconProps} stroke="var(--text)"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="var(--text)"/></svg>,
    pkg: <svg {...iconProps} stroke="var(--text)"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>,
    chat: <svg {...iconProps} stroke="var(--text)"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  }

  const COVERED: { icon: JSX.Element; title: string; desc: string }[] = [
    { icon: ICON.bug,    title: 'Bug-Fixes',           desc: 'Fehler im gelieferten Code werden kostenlos behoben' },
    { icon: ICON.perf,   title: 'Performance-Probleme', desc: 'Spürbar langsame Stellen werden optimiert' },
    { icon: ICON.sec,    title: 'Security-Patches',     desc: 'Kritische Sicherheits-Updates innerhalb von 48h' },
    { icon: ICON.target, title: 'Funktions-Garantie',   desc: 'Features funktionieren wie im Pflichtenheft beschrieben' },
    ...(isLong ? [
      { icon: ICON.pkg,  title: 'Dependency-Updates',   desc: 'Wichtige Library-Updates und Compatibility-Fixes' },
      { icon: ICON.chat, title: 'Priorisierter Support', desc: 'Reaktion innerhalb von 4h an Werktagen' },
    ] : []),
  ]

  const NOT_COVERED = [
    'Neue Features oder Erweiterungen außerhalb des Original-Scopes',
    'Design-Änderungen nach Abnahme',
    'Probleme durch externe Dienste (Stripe, Supabase, OpenAI etc.)',
    'Schäden durch eigene Code-Änderungen',
    'Hosting-Kosten oder Drittanbieter-Lizenzen',
  ]

  return (
    <div role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:500, padding:16, backdropFilter:'blur(4px)', animation:'fadeIn .2s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div style={{
        width:'100%', maxWidth:520, background:'var(--surface)',
        border:'1px solid var(--border)', borderRadius:18, overflow:'hidden',
        boxShadow:'0 24px 64px rgba(0,0,0,0.25)',
        animation:'slideIn .25s cubic-bezier(.16,1,.3,1) both',
        maxHeight:'90vh', display:'flex', flexDirection:'column',
      }}>
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
              <div style={{ width:42, height:42, borderRadius:11, background:'var(--surface-2)', color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <ShieldIco size={20}/>
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:0 }}>{plan.name.toUpperCase()} GARANTIE</p>
                <h2 style={{ fontSize:19, fontWeight:700, color:'var(--text)', margin:'4px 0 0' }}>{plan.guarantee}</h2>
              </div>
            </div>
            <button onClick={onClose} aria-label="Schliessen" style={{ width:30, height:30, border:'1px solid var(--border)', background:'var(--surface)', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        </div>

        <div style={{ padding:'20px 24px', overflowY:'auto' }}>
          <p style={{ fontSize:13.5, color:'var(--text-secondary)', margin:'0 0 18px', lineHeight:1.6 }}>
            Ab Abnahme deines Projekts greift unsere {months === 1 ? '30-Tage' : `${months}-Monate`}-Garantie.
            Wir kümmern uns um alles was schiefgeht — du musst nichts zusätzlich zahlen.
          </p>

          <p style={{ fontSize:10.5, fontWeight:700, color:'var(--green-dark)', letterSpacing:'.1em', margin:'0 0 10px' }}>ABGEDECKT</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
            {COVERED.map((c, i) => (
              <div key={i} style={{ display:'flex', gap:11, padding:'11px 12px', background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:10 }}>
                <span style={{ width:32, height:32, borderRadius:9, background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{c.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>{c.title}</p>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'2px 0 0', lineHeight:1.5 }}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 10px' }}>NICHT ABGEDECKT</p>
          <ul style={{ listStyle:'none', padding:0, margin:'0 0 4px', display:'flex', flexDirection:'column', gap:6 }}>
            {NOT_COVERED.map((n, i) => (
              <li key={i} style={{ display:'flex', gap:9, fontSize:12.5, color:'var(--text-muted)', lineHeight:1.5, paddingLeft:2 }}>
                <span style={{ flexShrink:0 }}>—</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ padding:'14px 24px 18px', borderTop:'1px solid var(--border)', background:'var(--bg)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>Im <strong style={{ color:'var(--text)' }}>{plan.name}</strong>-Plan inklusive</p>
          <button onClick={onClose} style={{ padding:'9px 18px', background:'var(--text)', color:'var(--bg)', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Verstanden
          </button>
        </div>
      </div>
    </div>
  )
}
