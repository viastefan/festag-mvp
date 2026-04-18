'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'chat'|'analysis'|'quote'|'payment'|'activated'
type Msg = { role: 'ai'|'user'; text: string }

const TAGRO_SYSTEM = `Du bist Tagro, das AI-Kernsystem von Festag.

REGELN:
- Strukturierte Antworten
- Keine Emojis, keine Floskeln
- Klingt wie ein System, nicht wie ein Chatbot
- Maximal 4 Sätze
- Deutsch

Wenn der User sein Projekt ausreichend beschrieben hat, antworte mit genau diesem JSON (reines JSON, kein Markdown):
{"ready":true,"title":"Titel","description":"Kurz","features":["F1","F2","F3"],"tasks":["T1","T2","T3","T4","T5"],"timeline":"4-6 Wochen","complexity":"medium","price_dev":2800,"price_design":800,"price_ai":600,"price_mgmt":400}

Sonst: Stelle gezielte Nachfragen (max 3 Sätze), um Klarheit zu schaffen.`

const PLACEHOLDERS = [
  'Baue mir eine SaaS-Plattform für mein Business',
  'Ich brauche ein AI-Automation-System',
  'Erstelle eine Booking-Plattform mit Zahlungen',
  'Entwickle eine Mobile App',
]

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('chat')
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: 'System bereit. Beschreibe dein Projekt — ich strukturiere es für dich.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [plan, setPlan] = useState<'once'|'monthly'>('once')
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
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
    const iv = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs])

  async function sendMsg() {
    if (!input.trim() || loading) return
    const msg = input
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: msg }])
    setLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 700,
          system: TAGRO_SYSTEM,
          messages: [
            ...msgs.slice(-4).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: msg }
          ]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text ?? ''
      try {
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        if (parsed.ready) {
          setAnalysis(parsed)
          setMsgs(m => [...m, { role: 'ai', text: `Analyse abgeschlossen. Projekt: "${parsed.title}". ${parsed.tasks.length} Tasks identifiziert. Laufzeit: ${parsed.timeline}.` }])
          setTimeout(() => setStep('analysis'), 1400)
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

  async function activateProject() {
    if (!analysis || !userId) return
    const { data: proj } = await supabase.from('projects').insert({
      title: analysis.title, description: analysis.description,
      user_id: userId, status: 'planning',
      timeline: analysis.timeline, complexity: analysis.complexity,
    }).select().single()

    if (proj) {
      await Promise.all(analysis.tasks.map((t: string) =>
        supabase.from('tasks').insert({ project_id: proj.id, title: t, status: 'todo' })
      ))
      const total = analysis.price_dev + analysis.price_design + analysis.price_ai + analysis.price_mgmt
      await supabase.from('project_quotes').insert({
        project_id: proj.id, user_id: userId, total_price: total,
        breakdown: { dev: analysis.price_dev, design: analysis.price_design, ai: analysis.price_ai, mgmt: analysis.price_mgmt },
        timeline: analysis.timeline, status: 'accepted',
      })
    }
    setStep('activated')
    setTimeout(() => { window.location.href = proj ? `/project/${proj.id}` : '/dashboard' }, 2400)
  }

  const total = analysis ? analysis.price_dev + analysis.price_design + analysis.price_ai + analysis.price_mgmt : 0

  // CHAT
  if (step === 'chat') return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src="/brand/logo.svg" alt="festag" style={{ height: 18 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>SCHRITT 1 · PROJEKT</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', maxWidth: 720, margin: '0 auto', width: '100%' }}>
        {msgs.length === 1 && !loading ? (
          // First screen — large writing canvas
          <div style={{ width: '100%', textAlign: 'center', animation: 'fadeUp 0.5s ease both' }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.6px', marginBottom: 10, lineHeight: 1.2 }}>
              Was möchtest du bauen?
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 32 }}>
              Beschreibe dein Projekt — Tagro AI strukturiert es in Sekunden.
            </p>
            <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
                placeholder={PLACEHOLDERS[placeholderIdx]} rows={3}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 22, fontWeight: 500, lineHeight: 1.4, resize: 'none', fontFamily: 'inherit', color: 'var(--text)', textAlign: 'center', padding: 16 }} />
              <div style={{ height: 1, background: 'var(--border)', width: '60%', margin: '0 auto' }} />
              <button onClick={sendMsg} disabled={!input.trim()} className="tap-scale" style={{
                marginTop: 28, padding: '12px 28px', background: 'var(--text)', color: '#fff', border: 'none',
                borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, cursor: input.trim() ? 'pointer' : 'default',
                opacity: input.trim() ? 1 : 0.3, transition: 'opacity 0.2s',
              }}>
                Analyse starten →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
            <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 0' }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, animation: i === msgs.length-1 ? 'slideUp 0.25s ease' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.role === 'ai' ? 'var(--text)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: m.role === 'ai' ? '#fff' : 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                    {m.role === 'ai' ? 'T' : (userEmail.charAt(0) || 'U').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{m.role === 'ai' ? 'Tagro' : 'Du'}</p>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
                      <p style={{ fontSize: 14, color: 'var(--text)', margin: 0, lineHeight: 1.55 }}>{m.text}</p>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 600, flexShrink: 0 }}>T</div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', display: 'flex', gap: 5 }}>
                    {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1s ${j*0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 12 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="Antwort…" style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 15, outline: 'none', background: 'var(--surface)', minHeight: 44 }} />
              <button onClick={sendMsg} disabled={!input.trim() || loading} className="tap-scale" style={{ width: 44, height: 44, borderRadius: 'var(--r)', border: 'none', background: input.trim() ? 'var(--text)' : 'var(--surface-2)', color: input.trim() ? '#fff' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ANALYSIS
  if (step === 'analysis' && analysis) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', padding: '40px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', animation: 'fadeUp 0.4s ease both' }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--green-dark)', letterSpacing: '0.08em', marginBottom: 8 }}>ANALYSE ABGESCHLOSSEN</p>
          <h1 style={{ marginBottom: 6 }}>{analysis.title}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{analysis.description}</p>
        </div>

        <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10 }}>FEATURES</p>
            {analysis.features.map((f: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}><path d="M5 13l4 4L19 7"/></svg>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10 }}>TASKS · {analysis.tasks.length}</p>
            {analysis.tasks.slice(0,5).map((t: string, i: number) => (
              <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>—  {t}</p>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Laufzeit', value: analysis.timeline },
            { label: 'Komplexität', value: analysis.complexity },
            { label: 'Tasks', value: analysis.tasks.length },
          ].map(m => (
            <div key={m.label} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, letterSpacing: '0.04em' }}>{m.label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{m.value}</p>
            </div>
          ))}
        </div>

        <button onClick={() => setStep('quote')} className="tap-scale" style={{ width: '100%', padding: 14, background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
          Preisübersicht anzeigen →
        </button>
      </div>
    </div>
  )

  // QUOTE
  if (step === 'quote' && analysis) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', padding: '40px 24px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', animation: 'fadeUp 0.4s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>GESAMTPREIS</p>
          <h1 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-1px', marginBottom: 4 }}>€{total.toLocaleString('de')}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Keine versteckten Kosten</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 18, marginBottom: 14 }}>
          {[
            { label: 'Entwicklung', value: analysis.price_dev },
            { label: 'Design', value: analysis.price_design },
            { label: 'AI System', value: analysis.price_ai },
            { label: 'Projektmanagement', value: analysis.price_mgmt },
          ].map((item, i) => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>€{item.value.toLocaleString('de')}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Gesamt</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>€{total.toLocaleString('de')}</span>
          </div>
        </div>

        <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { key: 'once', label: 'Einmalzahlung', desc: `€${total.toLocaleString('de')} einmalig`, badge: '–10%' },
            { key: 'monthly', label: 'Monatlich', desc: `€${Math.ceil(total/4).toLocaleString('de')}/Monat`, badge: '4 Raten' },
          ].map(opt => (
            <button key={opt.key} onClick={() => setPlan(opt.key as 'once'|'monthly')} className="tap-scale" style={{
              padding: 16, borderRadius: 'var(--r)', cursor: 'pointer',
              border: `1.5px solid ${plan === opt.key ? 'var(--text)' : 'var(--border)'}`,
              background: 'var(--surface)', textAlign: 'left', fontFamily: 'inherit',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{opt.label}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '1px 6px', borderRadius: 5 }}>{opt.badge}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</p>
            </button>
          ))}
        </div>

        <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--green-dark)', letterSpacing: '0.06em', marginBottom: 6 }}>FESTAG GARANTIE</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Strukturierte Umsetzung · AI + Project Owner Kontrolle · Transparente Fortschritte · Kontrollierte Lieferung
          </p>
        </div>

        <button onClick={() => setStep('payment')} className="tap-scale" style={{ width: '100%', padding: 14, background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 15, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
          Projekt starten →
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>Projekt kann sofort gestartet werden</p>
      </div>
    </div>
  )

  // PAYMENT
  if (step === 'payment') return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', padding: '40px 24px' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', animation: 'fadeUp 0.4s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>ZAHLUNGSDETAILS</p>
          <h1 style={{ marginBottom: 6 }}>Sicher bezahlen</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>SSL-verschlüsselt · Stripe-Standard</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 20, marginBottom: 14 }}>
          <input placeholder="Karteninhaber" style={payInp} />
          <input placeholder="1234 5678 9012 3456" style={{ ...payInp, marginTop: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <input placeholder="MM/YY" style={payInp} />
            <input placeholder="CVV" style={payInp} />
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{analysis?.title}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>€{total.toLocaleString('de')}</span>
        </div>
        <button onClick={activateProject} className="tap-scale" style={{ width: '100%', padding: 14, background: 'var(--green-dark)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 48 }}>
          Jetzt bezahlen · €{total.toLocaleString('de')}
        </button>
      </div>
    </div>
  )

  // ACTIVATED
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', animation: 'fadeUp 0.5s ease both' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'pulse 1.2s ease' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 style={{ marginBottom: 8 }}>Projekt aktiviert</h1>
        <p style={{ fontSize: 14, color: 'var(--green-dark)', marginBottom: 4 }}>System startet Planung. Developer werden zugewiesen.</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>Weiterleitung…</p>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '12px auto 0' }} />
      </div>
    </div>
  )
}

const payInp: React.CSSProperties = { width: '100%', padding: '11px 14px', background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, outline: 'none', color: 'var(--text)', boxSizing: 'border-box' as const, minHeight: 42 }
