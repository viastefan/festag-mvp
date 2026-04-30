'use client'

import { useState } from 'react'
import Link from 'next/link'

type Plan = {
  id: string
  name: string
  price: number | null
  unit: string
  category: string  // "DER PERFEKTE EINSTIEG" etc.
  tagline: string
  features: string[]
  cta: string
  highlight?: boolean
  badge?: string
  color: string
  guarantee?: string  // e.g. "+ 30 Tage Garantie"
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
    color: '#6366f1',
    guarantee: '+ 30 Tage Garantie',
  },
  {
    id: 'pro', name: 'Pro', price: 2800, unit: 'ab',
    category: 'WACHSENDE SYSTEME',
    tagline: 'Für skalierende Startups.',
    features: [
      '1 Entwickler (dediziert)',
      'Website, App, SaaS Lsg.',
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
    color: '#8b5cf6',
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
    color: '#0ea5e9',
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
    color: '#f59e0b',
  },
]

const MANAGED = {
  name: 'Managed Service',
  price: 199, unit: '€/Monat ab',
  tagline: 'Laufender Betrieb deiner App.',
  features: ['Hosting + Monitoring', 'Wartung + Updates', 'Bug Fixes inklusive', 'Performance Reports'],
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'project'|'managed'>('project')
  const [oneShot, setOneShot] = useState(true)  // einmalig zahlen toggle
  const [loadingPlan, setLoadingPlan] = useState<string|null>(null)
  const [error, setError] = useState<string|null>(null)

  async function buy(plan: Plan) {
    if (!plan.price) { window.location.href = 'mailto:hello@festag.io?subject=' + encodeURIComponent(`Anfrage: ${plan.name} Plan`); return }
    setLoadingPlan(plan.id); setError(null)
    try {
      const res = await fetch('/api/payments/mollie', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: plan.price,
          description: `Festag ${plan.name} Plan`,
          metadata: { plan: plan.id },
        }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError(data.error ?? 'Payment-Fehler. Bitte WhatsApp/E-Mail nutzen.')
        setLoadingPlan(null)
      }
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen oder Support kontaktieren.')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth:1180, padding:'24px 20px 80px' }}>
      <style>{`
        @keyframes pp-shine { 0%{background-position:0% 50%;} 100%{background-position:100% 50%;} }
        .pp-card { transition:transform .18s, box-shadow .18s, border-color .18s; }
        .pp-card:hover { transform:translateY(-3px); box-shadow:0 14px 40px rgba(15,23,42,.08); }
        .pp-toggle { display:inline-flex; padding:4px; background:var(--surface-2); border-radius:11px; gap:2px; }
        .pp-toggle button { padding:8px 18px; font-size:13px; font-weight:700; border:none; background:transparent; color:var(--text-muted); border-radius:8px; cursor:pointer; font-family:inherit; transition:all .15s; }
        .pp-toggle button.on { background:var(--surface); color:var(--text); box-shadow:0 1px 4px rgba(0,0,0,.06); }
        .pp-cta { width:100%; padding:13px; border-radius:12px; border:none; cursor:pointer; font-family:inherit; font-size:14px; font-weight:700; transition:transform .12s, opacity .15s; display:flex; align-items:center; justify-content:center; gap:7px; }
        .pp-cta:hover { transform:translateY(-1px); }
        .pp-cta:active { transform:translateY(0); }
        @keyframes pp-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ textAlign:'center', maxWidth:680, margin:'0 auto 36px' }}>
        <span style={{ display:'inline-block', padding:'4px 12px', borderRadius:20, background:'rgba(99,102,241,.1)', color:'#6366f1', fontSize:11, fontWeight:700, letterSpacing:'.07em', marginBottom:14 }}>PREISE</span>
        <h1 style={{ fontSize:38, fontWeight:700, color:'var(--text)', letterSpacing:'-.6px', margin:'0 0 12px', lineHeight:1.1 }}>Wähle deinen Plan.</h1>
        <p style={{ fontSize:15.5, color:'var(--text-secondary)', margin:0, lineHeight:1.6 }}>
          Transparente Preise. Keine versteckten Kosten. Alle Pläne enthalten Festag AI &amp; Code-Garantie.
        </p>

        <div className="pp-toggle" style={{ marginTop:20 }}>
          <button className={billing==='project'?'on':''} onClick={() => setBilling('project')}>Projekt-Pakete</button>
          <button className={billing==='managed'?'on':''} onClick={() => setBilling('managed')}>Managed Service</button>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth:520, margin:'0 auto 22px', padding:'11px 14px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, fontSize:13, color:'#dc2626', textAlign:'center' }}>{error}</div>
      )}

      {/* Plans grid */}
      {billing === 'project' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(248px, 1fr))', gap:16 }}>
          {PLANS.map(plan => (
            <div key={plan.id} className="pp-card" style={{
              background: plan.highlight ? `linear-gradient(180deg, ${plan.color}10, var(--card))` : 'var(--card)',
              border: `1px solid ${plan.highlight?plan.color:'var(--border)'}`,
              borderRadius:18,
              padding:'22px 22px 22px',
              position:'relative',
              boxShadow: plan.highlight ? `0 12px 36px ${plan.color}22` : '0 2px 12px rgba(15,23,42,.04)',
              display:'flex', flexDirection:'column',
            }}>
              {plan.badge && (
                <span style={{ position:'absolute', top:14, right:14, padding:'3px 10px', borderRadius:14, background:plan.color, color:'#fff', fontSize:9.5, fontWeight:800, letterSpacing:'.08em' }}>{plan.badge}</span>
              )}
              <p style={{ fontSize:10.5, fontWeight:800, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 10px' }}>{plan.category}</p>
              <h3 style={{ fontSize:24, fontWeight:800, color:'var(--text)', margin:'0 0 4px', letterSpacing:'-.5px' }}>{plan.name}</h3>
              <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:'0 0 14px' }}>{plan.tagline}</p>

              {/* Price + einmalig toggle */}
              <div style={{ marginBottom:16 }}>
                {plan.price !== null ? (
                  <>
                    <p style={{ fontSize:24, fontWeight:800, color:'var(--text)', margin:0, lineHeight:1.1, letterSpacing:'-.6px' }}>
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)' }}>{plan.unit} </span>
                      €{plan.price.toLocaleString('de')}
                    </p>
                    {oneShot && plan.id !== 'scale' && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                        <div style={{ width:30, height:18, background:plan.color, borderRadius:9, position:'relative', flexShrink:0 }}>
                          <div style={{ position:'absolute', top:2, right:2, width:14, height:14, borderRadius:'50%', background:'#fff' }}/>
                        </div>
                        <span style={{ fontSize:12, color:'var(--text-secondary)', fontWeight:600 }}>einmalig zahlen</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:0, lineHeight:1.3 }}>{plan.unit}<br/><span style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)' }}>Zeitraum nach Absprache</span></p>
                )}
              </div>

              <ul style={{ listStyle:'none', padding:0, margin:'0 0 16px', display:'flex', flexDirection:'column', gap:9, flex:1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:13, color:'var(--text-secondary)', lineHeight:1.45 }}>
                    <span style={{ width:17, height:17, borderRadius:'50%', background:`${plan.color}18`, color:plan.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.guarantee && (
                <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 12px', marginBottom:12, background:`${plan.color}10`, borderRadius:10, border:`1px solid ${plan.color}26` }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <div>
                    <p style={{ fontSize:12, fontWeight:800, color:plan.color, margin:0, lineHeight:1.2 }}>{plan.guarantee}</p>
                    <p style={{ fontSize:10, color:'var(--text-muted)', margin:'1px 0 0' }}>Volle Absicherung</p>
                  </div>
                </div>
              )}

              <button onClick={() => buy(plan)} disabled={loadingPlan===plan.id} className="pp-cta" style={{
                background: plan.highlight ? plan.color : 'var(--btn-prim)',
                color: plan.highlight ? '#fff' : 'var(--btn-prim-text)',
                opacity: loadingPlan === plan.id ? .7 : 1,
              }}>
                {loadingPlan === plan.id ? (
                  <span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'pp-spin .7s linear infinite' }}/>
                ) : <>{plan.cta}</>}
              </button>
              <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'10px 0 0', textAlign:'center' }}>
                **Preise hängen stark vom gewünschten Endprodukt ab.
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ maxWidth:480, margin:'0 auto', background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:30, textAlign:'center' }}>
          <h3 style={{ fontSize:22, fontWeight:700, margin:'0 0 6px' }}>{MANAGED.name}</h3>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 16px' }}>{MANAGED.tagline}</p>
          <p style={{ fontSize:32, fontWeight:800, color:'var(--text)', margin:'0 0 6px', letterSpacing:'-.6px' }}>€{MANAGED.price}<span style={{ fontSize:14, color:'var(--text-muted)', fontWeight:600 }}> / Monat ab</span></p>
          <ul style={{ listStyle:'none', padding:0, margin:'18px 0 22px', display:'flex', flexDirection:'column', gap:7, textAlign:'left' }}>
            {MANAGED.features.map(f => (
              <li key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13.5, color:'var(--text-secondary)' }}>
                <span style={{ width:18, height:18, borderRadius:'50%', background:'rgba(99,102,241,.12)', color:'#6366f1', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <a href="mailto:hello@festag.io?subject=Managed%20Service%20Anfrage" className="pp-cta" style={{ background:'#6366f1', color:'#fff', textDecoration:'none' }}>
            Managed Service anfragen →
          </a>
        </div>
      )}

      {/* Trust strip */}
      <div style={{ marginTop:48, padding:'24px 20px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, display:'flex', flexWrap:'wrap', gap:18, justifyContent:'space-around', alignItems:'center' }}>
        {[
          { icon:'🇩🇪', t:'Server in Deutschland' },
          { icon:'🔐', t:'DSGVO-konform' },
          { icon:'⚡', t:'Direkt buchbar' },
          { icon:'💳', t:'Mollie · Kreditkarte · SEPA · PayPal' },
        ].map(b => (
          <div key={b.t} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:18 }}>{b.icon}</span>
            <span style={{ fontSize:12.5, color:'var(--text-secondary)', fontWeight:600 }}>{b.t}</span>
          </div>
        ))}
      </div>

      {/* FAQ link */}
      <p style={{ textAlign:'center', marginTop:32, fontSize:13, color:'var(--text-muted)' }}>
        Fragen? <Link href="/messages" style={{ color:'#6366f1', fontWeight:700 }}>Schreibe Tagro</Link> oder <a href="mailto:hello@festag.io" style={{ color:'#6366f1', fontWeight:700 }}>direkt an uns</a>.
      </p>
    </div>
  )
}
