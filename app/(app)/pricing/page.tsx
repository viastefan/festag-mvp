'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    cta: 'Paket anfragen',
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
    cta: 'Paket anfragen',
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
    cta: 'Paket anfragen',
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

export default function PricingPage() {
  const [billing, setBilling] = useState<'project'|'managed'>('project')
  const [oneShot, setOneShot] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState<string|null>(null)
  const [error, setError] = useState<string|null>(null)

  async function buy(plan: Plan) {
    if (!plan.price) {
      window.location.href = 'mailto:hello@festag.io?subject=' + encodeURIComponent(`Anfrage: ${plan.name} Plan`)
      return
    }
    setLoadingPlan(plan.id); setError(null)
    try {
      const res = await fetch('/api/payments/mollie', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          amount: plan.price,
          description: `Festag ${plan.name} Plan`,
          metadata: { plan: plan.id },
        }),
      })
      const data = await res.json()
      if (data.checkoutUrl) window.location.href = data.checkoutUrl
      else { setError(data.error ?? 'Buchung nicht möglich. Bitte Support kontaktieren.'); setLoadingPlan(null) }
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen.')
      setLoadingPlan(null)
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
          {PLANS.map(plan => (
            <div key={plan.id} className="pp-card" style={{
              background: 'var(--surface)',
              border: `1px solid ${plan.highlight ? 'var(--text)' : 'var(--border)'}`,
              borderRadius:20,
              padding:'24px 22px 22px',
              position:'relative',
              display:'flex',
              flexDirection:'column',
            }}>
              {plan.badge && (
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
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 13px', marginBottom:12, background:'var(--surface-2)', borderRadius:14, border:'1px solid var(--border)' }}>
                  <span style={{ width:30, height:30, borderRadius:'50%', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text)', flexShrink:0 }}>
                    <ShieldIco size={14}/>
                  </span>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:0, lineHeight:1.2 }}>{plan.guarantee}</p>
                    <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'1px 0 0' }}>Volle Absicherung</p>
                  </div>
                </div>
              )}

              <button onClick={() => buy(plan)} disabled={loadingPlan===plan.id} className="pp-cta">
                {loadingPlan === plan.id ? <span className="pp-spin"/> : plan.cta}
              </button>
              <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'10px 0 0', textAlign:'center', lineHeight:1.4 }}>
                **Preise hängen stark vom gewünschten Endprodukt ab.
              </p>
            </div>
          ))}
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
          Server in Deutschland · DSGVO-konform · Mollie · SEPA · Kreditkarte · PayPal
        </span>
        <Link href="/messages" style={{ fontSize:13, color:'var(--text)', fontWeight:600, textDecoration:'none' }}>
          Fragen? Schreib Tagro →
        </Link>
      </div>
    </div>
  )
}
