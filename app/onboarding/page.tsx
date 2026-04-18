'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'chat'|'analysis'|'quote'|'payment'|'activated'

type AiMsg = { role: 'ai'|'user'; text: string }

const TAGRO_SYSTEM = `Du bist Tagro, das AI-Kernsystem von Festag.

VERHALTEN-REGELN:
- Antworte IMMER strukturiert
- Kein Small Talk
- Jede Antwort hat: STATUS → ANALYSE → SYSTEM-AKTION → NÄCHSTE SCHRITTE
- Klingt wie ein intelligentes System, nicht wie ein Chatbot
- Maximal 4 präzise Sätze
- Sprache: Deutsch

BEISPIEL-FORMAT:
"Projekt erkannt. Analysiere Struktur…
Ziel: [was der User will]
System zerlegt Anforderungen in Module und Tasks.
Erste Struktur wird in Kürze bereitgestellt."

Wenn der User sein Projekt beschrieben hat, antworte mit genau diesem JSON (kein Markdown, reines JSON):
{"ready":true,"title":"Titel","description":"Kurz","features":["Feature 1","Feature 2","Feature 3"],"tasks":["Task 1","Task 2","Task 3","Task 4","Task 5"],"timeline":"4-6 Wochen","complexity":"medium","price_dev":2800,"price_design":800,"price_ai":600,"price_mgmt":400}`

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('chat')
  const [msgs, setMsgs] = useState<AiMsg[]>([
    { role: 'ai', text: 'System bereit. Beschreibe dein Projekt — ich strukturiere es für dich.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [plan, setPlan] = useState<'once'|'monthly'>('once')
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserId(data.session.user.id)
      setUserEmail(data.session.user.email ?? '')
    })
  }, [])

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  async function sendMsg() {
    if (!input.trim() || loading) return
    const msg = input
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: msg }])
    setLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 800,
          system: TAGRO_SYSTEM,
          messages: [...msgs.slice(-4).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: msg }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text ?? ''

      // Check if AI returned project analysis JSON
      try {
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        if (parsed.ready) {
          setAnalysis(parsed)
          setMsgs(m => [...m, { role: 'ai', text: `Analyse abgeschlossen. Projekt: "${parsed.title}" · ${parsed.tasks.length} Tasks identifiziert · Laufzeit: ${parsed.timeline}` }])
          setTimeout(() => setStep('analysis'), 1200)
          setLoading(false)
          return
        }
      } catch {}

      setMsgs(m => [...m, { role: 'ai', text }])
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'System-Fehler. Bitte erneut versuchen.' }])
    }
    setLoading(false)
  }

  async function acceptQuote() {
    if (!analysis || !userId) return
    setStep('payment')
  }

  async function activateProject() {
    if (!analysis || !userId) return
    // Create project
    const { data: proj } = await supabase.from('projects').insert({
      title: analysis.title, description: analysis.description,
      user_id: userId, status: 'planning',
      timeline: analysis.timeline, complexity: analysis.complexity,
    }).select().single()

    if (proj) {
      // Create tasks
      await Promise.all(analysis.tasks.map((t: string) =>
        supabase.from('tasks').insert({ project_id: proj.id, title: t, status: 'todo' })
      ))
      // Save quote
      const total = analysis.price_dev + analysis.price_design + analysis.price_ai + analysis.price_mgmt
      await supabase.from('project_quotes').insert({
        project_id: proj.id, user_id: userId, total_price: total,
        breakdown: { dev: analysis.price_dev, design: analysis.price_design, ai: analysis.price_ai, mgmt: analysis.price_mgmt },
        timeline: analysis.timeline, status: 'accepted',
      })
      // Mark onboarding complete
      await supabase.from('onboarding').upsert({ user_id: userId, step: 5, completed: true })
    }
    setStep('activated')
    setTimeout(() => { window.location.href = proj ? `/project/${proj.id}` : '/dashboard' }, 2500)
  }

  const total = analysis ? analysis.price_dev + analysis.price_design + analysis.price_ai + analysis.price_mgmt : 0

  // ─── CHAT STEP ───
  if (step === 'chat') return (
    <div style={{ minHeight: '100vh', background: '#0A0B0E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', margin: '0 auto 16px' }}>✦</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: 6 }}>Tagro AI System</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>FESTAG PRODUCTION ENGINE · BEREIT</p>
        </div>

        {/* Feed */}
        <div ref={feedRef} style={{ minHeight: 200, maxHeight: 340, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, animation: i === msgs.length-1 ? 'slideUp 0.25s ease' : 'none' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: m.role === 'ai' ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: m.role === 'ai' ? 12 : 11, color: '#fff', fontWeight: 700,
              }}>
                {m.role === 'ai' ? '✦' : (userEmail.charAt(0)||'U').toUpperCase()}
              </div>
              <div style={{
                flex: 1, background: m.role === 'ai' ? 'rgba(255,255,255,0.05)' : 'rgba(37,99,235,0.15)',
                border: `1px solid ${m.role === 'ai' ? 'rgba(255,255,255,0.08)' : 'rgba(37,99,235,0.3)'}`,
                borderRadius: 12, padding: '10px 14px',
              }}>
                <p style={{ fontSize: 14, color: m.role === 'ai' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.9)', lineHeight: 1.6, margin: 0 }}>{m.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>✦</div>
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 5 }}>
                {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563EB', display: 'inline-block', animation: `pulse 1s ${j*0.2}s infinite` }} />)}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
            placeholder="Beschreibe dein Projekt… (Enter zum Senden)"
            rows={2}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', fontSize: 14, outline: 'none', color: '#fff', resize: 'none', fontFamily: 'Aeonik, sans-serif', lineHeight: 1.5 }}
            onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button onClick={sendMsg} disabled={!input.trim() || loading} style={{
            width: 44, borderRadius: 12, border: 'none', flexShrink: 0,
            background: input.trim() && !loading ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : 'rgba(255,255,255,0.06)',
            color: '#fff', fontSize: 18, cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {loading ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : '↗'}
          </button>
        </div>

        {/* Quick prompts */}
        <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['SaaS Plattform bauen', 'E-Commerce App', 'AI-gestütztes Tool', 'Mobile App'].map(s => (
            <button key={s} onClick={() => setInput(s)} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', fontSize: 12, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Aeonik, sans-serif' }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ─── ANALYSIS STEP ───
  if (step === 'analysis' && analysis) return (
    <div style={{ minHeight: '100vh', background: '#0A0B0E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 580, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#10B981', letterSpacing: '0.1em', marginBottom: 8 }}>✦ ANALYSE ABGESCHLOSSEN</p>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: 6 }}>{analysis.title}</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{analysis.description}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {/* Features */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 10 }}>FEATURES</p>
            {analysis.features.map((f: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#2563EB', marginTop: 1 }}>◆</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{f}</span>
              </div>
            ))}
          </div>
          {/* Tasks */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 10 }}>TASKS · {analysis.tasks.length}</p>
            {analysis.tasks.slice(0,5).map((t: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 1 }}>○</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Laufzeit', value: analysis.timeline },
            { label: 'Komplexität', value: analysis.complexity },
            { label: 'Tasks', value: `${analysis.tasks.length} identifiziert` },
          ].map(m => (
            <div key={m.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>{m.label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{m.value}</p>
            </div>
          ))}
        </div>

        <button onClick={() => setStep('quote')} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #2563EB, #7C3AED)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Aeonik, sans-serif' }}>
          Preis anzeigen →
        </button>
      </div>
    </div>
  )

  // ─── QUOTE STEP ───
  if (step === 'quote' && analysis) return (
    <div style={{ minHeight: '100vh', background: '#0A0B0E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 540, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 8 }}>KOSTENÜBERSICHT</p>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#fff', letterSpacing: '-1px', marginBottom: 4 }}>
            €{total.toLocaleString('de')}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Gesamtpreis · keine versteckten Kosten</p>
        </div>

        {/* Breakdown */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px', marginBottom: 16 }}>
          {[
            { label: 'Entwicklung', value: analysis.price_dev },
            { label: 'Design', value: analysis.price_design },
            { label: 'AI System', value: analysis.price_ai },
            { label: 'Projektmanagement', value: analysis.price_mgmt },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>€{item.value.toLocaleString('de')}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Gesamt</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#2563EB' }}>€{total.toLocaleString('de')}</span>
          </div>
        </div>

        {/* Plan selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { key: 'once', label: 'Einmalzahlung', desc: `€${total.toLocaleString('de')} einmalig`, badge: '–10%' },
            { key: 'monthly', label: 'Monatlich', desc: `€${Math.ceil(total/4).toLocaleString('de')}/Monat`, badge: '4 Raten' },
          ].map(opt => (
            <button key={opt.key} onClick={() => setPlan(opt.key as 'once'|'monthly')} style={{
              padding: '14px', borderRadius: 12, cursor: 'pointer',
              border: `1.5px solid ${plan === opt.key ? '#2563EB' : 'rgba(255,255,255,0.08)'}`,
              background: plan === opt.key ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.03)',
              textAlign: 'left', fontFamily: 'Aeonik, sans-serif', transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: plan === opt.key ? '#60A5FA' : 'rgba(255,255,255,0.7)' }}>{opt.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.15)', padding: '1px 6px', borderRadius: 5 }}>{opt.badge}</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Festag Guarantee */}
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#10B981', letterSpacing: '0.08em', marginBottom: 8 }}>✓ FESTAG GARANTIE</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['100% strukturierte Umsetzung','AI + Project Owner Kontrolle','Transparente Fortschritte','Klare Lieferung'].map(g => (
              <span key={g} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', gap: 4 }}>
                <span style={{ color: '#10B981' }}>✓</span> {g}
              </span>
            ))}
          </div>
        </div>

        <button onClick={acceptQuote} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #2563EB, #7C3AED)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Aeonik, sans-serif' }}>
          Projekt starten →
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>
          Projekt kann sofort gestartet werden · Keine versteckten Kosten
        </p>
      </div>
    </div>
  )

  // ─── PAYMENT STEP ───
  if (step === 'payment') return (
    <div style={{ minHeight: '100vh', background: '#0A0B0E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeUp 0.4s ease', textAlign: 'center' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 8 }}>ZAHLUNGSDETAILS</p>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>Sicher bezahlen</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Verschlüsselt · SSL-gesichert · Stripe-Standard</p>
        </div>

        {/* Mock payment form */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px', marginBottom: 16, textAlign: 'left' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 16 }}>KREDITKARTE</p>
          <input placeholder="Karteninhaber" style={{ ...payInp, marginBottom: 10 }} />
          <input placeholder="1234 5678 9012 3456" style={{ ...payInp, marginBottom: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input placeholder="MM/YY" style={payInp} />
            <input placeholder="CVV" style={payInp} />
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{analysis?.title}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>€{total.toLocaleString('de')}</span>
        </div>

        <button onClick={activateProject} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #059669, #0D9488)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Aeonik, sans-serif' }}>
          Jetzt bezahlen · €{total.toLocaleString('de')} →
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>
          🔒 SSL-verschlüsselt · Powered by Stripe
        </p>
      </div>
    </div>
  )

  // ─── ACTIVATED STEP ───
  return (
    <div style={{ minHeight: '100vh', background: '#0A0B0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #059669, #0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px', animation: 'pulse 1s ease' }}>✓</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: 8 }}>Projekt aktiviert.</h2>
        <p style={{ fontSize: 14, color: '#10B981', marginBottom: 4 }}>System startet Planung. Developer werden zugewiesen.</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>Weiterleitung zum Projekt…</p>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '16px auto 0' }} />
      </div>
    </div>
  )
}

const payInp: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, fontSize: 14, outline: 'none', color: '#fff', boxSizing: 'border-box' as const, fontFamily: 'Aeonik, sans-serif' }
