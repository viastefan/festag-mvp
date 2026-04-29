'use client'
import { useState } from 'react'
import Link from 'next/link'

/* ─── Types ──────────────────────────────────────────────── */
type EstimateResult = {
  summary:   string
  min:       number
  max:       number
  timeline:  string
  breakdown: { category: string; hours: number; price_min: number; price_max: number; note: string }[]
  risks:     string[]
  included:  string[]
  excluded:  string[]
}

/* ─── Options ────────────────────────────────────────────── */
const PROJECT_TYPES = [
  { id:'web',       label:'Web App',        icon:'🌐' },
  { id:'mobile',    label:'Mobile App',     icon:'📱' },
  { id:'saas',      label:'SaaS Plattform', icon:'☁️' },
  { id:'ecom',      label:'E-Commerce',     icon:'🛍️' },
  { id:'ai',        label:'AI Integration', icon:'✦' },
  { id:'landing',   label:'Landing Page',   icon:'🎯' },
  { id:'api',       label:'API / Backend',  icon:'⚙️' },
  { id:'custom',    label:'Individuell',    icon:'🔧' },
]

const FEATURE_OPTIONS = [
  { id:'auth',      label:'Nutzer-Login & Auth' },
  { id:'payment',   label:'Zahlungssystem (Stripe)' },
  { id:'dashboard', label:'Admin-Dashboard' },
  { id:'realtime',  label:'Realtime / Chat' },
  { id:'ai',        label:'AI-Integration (Claude/GPT)' },
  { id:'email',     label:'E-Mail-System' },
  { id:'api',       label:'REST API' },
  { id:'cms',       label:'CMS / Contentpflege' },
  { id:'map',       label:'Karten & Standort' },
  { id:'analytics', label:'Analytics & Reporting' },
  { id:'push',      label:'Push-Benachrichtigungen' },
  { id:'multi',     label:'Mehrsprachigkeit' },
]

const COMPLEXITY = [
  { id:'simple',  label:'Einfach',  sub:'1–3 Screens, klarer Scope' },
  { id:'medium',  label:'Mittel',   sub:'4–10 Screens, mehrere Features' },
  { id:'complex', label:'Komplex',  sub:'10+ Screens, Enterprise-Level' },
]

/* ─── System Prompt ──────────────────────────────────────── */
function buildPrompt(type: string, desc: string, features: string[], complexity: string) {
  const typeLabel = PROJECT_TYPES.find(p => p.id === type)?.label ?? type
  const featureList = features.map(f => FEATURE_OPTIONS.find(o => o.id === f)?.label ?? f).join(', ')
  const complexLabel = COMPLEXITY.find(c => c.id === complexity)?.label ?? complexity

  return `Du bist ein Senior Software-Architekt bei Festag, einer deutschen Software-Produktionsfirma.
Schätze die Kosten für das folgende Projekt realistisch ein. Festag arbeitet mit einem Team aus Senior-Entwicklern.
Stundensatz: €85–€120 (Senior Dev). Alle Preise in Euro (€).

Projektdetails:
- Typ: ${typeLabel}
- Komplexität: ${complexLabel}
- Features: ${featureList || 'Keine spezifischen Features angegeben'}
- Beschreibung: ${desc || 'Keine zusätzliche Beschreibung'}

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt (kein Markdown, keine Erklärungen davor/danach):
{
  "summary": "2-3 Sätze Zusammenfassung der Schätzung",
  "min": 12000,
  "max": 22000,
  "timeline": "6–10 Wochen",
  "breakdown": [
    { "category": "Konzept & Design", "hours": 20, "price_min": 1700, "price_max": 2400, "note": "UX-Konzept, Wireframes, UI-Design" },
    { "category": "Frontend", "hours": 60, "price_min": 5100, "price_max": 7200, "note": "React/Next.js, responsive, Animationen" },
    { "category": "Backend & API", "hours": 40, "price_min": 3400, "price_max": 4800, "note": "Supabase, Auth, REST API" },
    { "category": "Testing & Launch", "hours": 15, "price_min": 1275, "price_max": 1800, "note": "QA, Deployment, Go-Live" }
  ],
  "risks": ["Scope creep bei unklaren Anforderungen", "Drittanbieter-Integrationen können Zeitplan verschieben"],
  "included": ["Projektmanagement", "Code-Review", "Dokumentation", "1x Revisions-Runde"],
  "excluded": ["Server-Kosten nach Launch", "Content-Erstellung", "Laufende Wartung"]
}`
}

/* ─── Helpers ────────────────────────────────────────────── */
function fmt(n: number) {
  return '€' + n.toLocaleString('de', { minimumFractionDigits: 0 })
}

function Counter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  if (!started) {
    setStarted(true)
    const steps = 40
    const inc = target / steps
    let i = 0
    const iv = setInterval(() => {
      i++
      setVal(Math.min(Math.round(inc * i), target))
      if (i >= steps) clearInterval(iv)
    }, duration / steps)
  }
  return <>{fmt(val)}</>
}

/* ─── Main Component ─────────────────────────────────────── */
export default function EstimatorPage() {
  const [type,       setType]       = useState('')
  const [desc,       setDesc]       = useState('')
  const [features,   setFeatures]   = useState<string[]>([])
  const [complexity, setComplexity] = useState('medium')
  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState<EstimateResult | null>(null)
  const [error,      setError]      = useState('')
  const [key,        setKey]        = useState(0)

  function toggleFeature(id: string) {
    setFeatures(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id])
  }

  async function estimate() {
    if (!type) { setError('Bitte Projekttyp auswählen.'); return }
    setError(''); setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'Du bist ein erfahrener Software-Architekt. Antworte immer nur mit reinem JSON, ohne Markdown-Blöcke oder zusätzlichen Text.',
          max_tokens: 1200,
          messages: [{ role: 'user', content: buildPrompt(type, desc, features, complexity) }],
        }),
      })
      const d = await res.json()
      const raw = d.content?.[0]?.text ?? ''
      // Extract JSON from response (strip any markdown if present)
      const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed: EstimateResult = JSON.parse(jsonStr)
      setResult(parsed)
      setKey(k => k + 1)
    } catch (e) {
      setError('Fehler beim Generieren. Bitte erneut versuchen.')
    }
    setLoading(false)
  }

  function reset() { setResult(null); setType(''); setDesc(''); setFeatures([]); setComplexity('medium') }

  const totalHours = result?.breakdown.reduce((s, b) => s + b.hours, 0) ?? 0

  return (
    <div className="page-content" style={{ maxWidth: 1100 }}>
      <style>{`
        .est-type { transition: all .15s; cursor: pointer; }
        .est-type:hover { border-color: var(--border-strong) !important; }
        .est-feat { transition: all .12s; cursor: pointer; user-select: none; }
        .est-feat:hover { border-color: var(--border-strong) !important; }
        @keyframes countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .result-in { animation: fadeUp .4s cubic-bezier(.16,1,.3,1) both; }
        @media(max-width:768px) { .est-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Header */}
      <div className="page-header animate-fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18, color: 'var(--accent-text)' }}>✦</span>
          </div>
          <div>
            <h1 style={{ margin: 0 }}>AI Preisschätzer</h1>
            <p style={{ margin: 0, fontSize: 13 }}>Projektkostenschätzung in Sekunden — powered by Claude AI</p>
          </div>
        </div>
      </div>

      <div className="est-grid animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: result ? '420px 1fr' : '1fr', gap: 16 }}>

        {/* ── LEFT: Form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Project type */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>1. Projekttyp *</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {PROJECT_TYPES.map(pt => (
                <button key={pt.id} onClick={() => setType(pt.id)} className="est-type"
                  style={{ padding: '10px 8px', borderRadius: 12, border: `1.5px solid ${type === pt.id ? 'var(--text)' : 'var(--border)'}`, background: type === pt.id ? 'var(--surface-2)' : 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 20 }}>{pt.icon}</span>
                  <span style={{ fontSize: 10.5, fontWeight: type === pt.id ? 700 : 500, color: type === pt.id ? 'var(--text)' : 'var(--text-secondary)' }}>{pt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Complexity */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>2. Komplexität</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {COMPLEXITY.map(c => (
                <button key={c.id} onClick={() => setComplexity(c.id)} className="est-type"
                  style={{ padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${complexity === c.id ? 'var(--text)' : 'var(--border)'}`, background: complexity === c.id ? 'var(--surface-2)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 13, fontWeight: complexity === c.id ? 700 : 500, color: 'var(--text)' }}>{c.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>3. Features <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, opacity: .6 }}>(optional)</span></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {FEATURE_OPTIONS.map(f => {
                const on = features.includes(f.id)
                return (
                  <button key={f.id} onClick={() => toggleFeature(f.id)} className="est-feat"
                    style={{ padding: '7px 13px', borderRadius: 20, border: `1.5px solid ${on ? 'var(--text)' : 'var(--border)'}`, background: on ? 'var(--surface-2)' : 'transparent', fontSize: 12, fontWeight: on ? 700 : 500, color: on ? 'var(--text)' : 'var(--text-secondary)', fontFamily: 'inherit' }}>
                    {on && <span style={{ marginRight: 4, fontSize: 10 }}>✓</span>}
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>4. Beschreibung <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, opacity: .6 }}>(optional)</span></p>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="Beschreibe kurz was gebaut werden soll, besondere Anforderungen oder Integration zu bestehenden Systemen…"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--bg)', outline: 'none', resize: 'vertical', lineHeight: 1.55 }}
            />
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: 'var(--red-bg)', border: '1px solid rgba(200,80,80,.2)', borderRadius: 12, fontSize: 13, color: 'var(--red)' }}>{error}</div>
          )}

          <button onClick={result ? reset : estimate} disabled={loading} className="tap-scale"
            style={{ height: 52, background: result ? 'var(--surface-2)' : 'var(--btn-prim)', color: result ? 'var(--text)' : 'var(--btn-prim-text)', border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all .15s' }}>
            {loading ? (
              <>
                <span style={{ width: 18, height: 18, border: '2.5px solid rgba(128,128,128,.35)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                Tagro schätzt…
              </>
            ) : result ? (
              '← Neue Schätzung'
            ) : (
              <>
                <span style={{ fontSize: 16 }}>✦</span>
                Jetzt schätzen lassen
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT: Results ── */}
        {result && (
          <div key={key} className="result-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Hero price card */}
            <div style={{ background: 'var(--btn-prim)', borderRadius: 20, padding: '28px 28px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }}/>
              <div style={{ position: 'absolute', bottom: -30, right: 40, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }}/>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--btn-prim-text)', opacity: .5, letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>Geschätzte Projektkosten</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 42, fontWeight: 700, color: 'var(--btn-prim-text)', margin: 0, letterSpacing: '-1.5px', lineHeight: 1 }}>
                  <Counter key={key} target={result.min} />
                </h1>
                <span style={{ fontSize: 20, color: 'var(--btn-prim-text)', opacity: .5 }}>–</span>
                <h1 style={{ fontSize: 42, fontWeight: 700, color: 'var(--btn-prim-text)', margin: 0, letterSpacing: '-1.5px', lineHeight: 1 }}>
                  <Counter key={key + 100} target={result.max} duration={1400} />
                </h1>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--btn-prim-text)', opacity: .45, letterSpacing: '.1em', margin: '0 0 2px' }}>LAUFZEIT</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--btn-prim-text)', margin: 0 }}>{result.timeline}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--btn-prim-text)', opacity: .45, letterSpacing: '.1em', margin: '0 0 2px' }}>AUFWAND</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--btn-prim-text)', margin: 0 }}>{totalHours} Stunden</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Zusammenfassung</p>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{result.summary}</p>
            </div>

            {/* Breakdown */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>Kostenkalkulation</p>
              </div>
              {result.breakdown.map((b, i) => {
                const barPct = Math.round((b.hours / totalHours) * 100)
                return (
                  <div key={i} style={{ padding: '14px 18px', borderBottom: i < result.breakdown.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{b.category}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{b.note}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{fmt(b.price_min)} – {fmt(b.price_max)}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{b.hours}h</p>
                      </div>
                    </div>
                    <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: 'var(--green)', borderRadius: 3, transition: 'width 1s cubic-bezier(.16,1,.3,1)' }}/>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Included / Excluded */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--green-border)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--green-dark)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>✓ Inklusive</p>
                {result.included.map((item, i) => (
                  <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 5px', display: 'flex', gap: 7, lineHeight: 1.4 }}>
                    <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>{item}
                  </p>
                ))}
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>— Nicht inklusive</p>
                {result.excluded.map((item, i) => (
                  <p key={i} style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 5px', display: 'flex', gap: 7, lineHeight: 1.4 }}>
                    <span style={{ flexShrink: 0 }}>—</span>{item}
                  </p>
                ))}
              </div>
            </div>

            {/* Risks */}
            {result.risks.length > 0 && (
              <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber-dark)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>⚠ Risiken & Hinweise</p>
                {result.risks.map((r, i) => (
                  <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 5px', lineHeight: 1.5 }}>· {r}</p>
                ))}
              </div>
            )}

            {/* CTA */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Bereit dein Projekt zu starten?</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Tagro begleitet dich durch den gesamten Entwicklungsprozess.</p>
              </div>
              <Link href="/onboarding" style={{ textDecoration: 'none', flexShrink: 0 }}>
                <button className="tap-scale" style={{ height: 42, padding: '0 20px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Projekt starten →
                </button>
              </Link>
            </div>

            {/* Disclaimer */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', opacity: .6, lineHeight: 1.6 }}>
              Diese Schätzung basiert auf Erfahrungswerten und ist unverbindlich. Finale Angebote werden nach Detailanalyse erstellt. Stundensatz: €85–€120 (Senior Developer).
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
