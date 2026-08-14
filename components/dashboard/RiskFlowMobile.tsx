'use client'

/**
 * RiskFlowMobile — der Risiko-Flow, den man vom Dashboard aus öffnet.
 *
 * Schritt 1  Risiko bewerten          (Screen 2)
 *            └ Bottom Sheet „Warum diese Empfehlung?"  (Screen 3)
 * Schritt 2  Maßnahme wählen          (Screen 4A — selbst wählen)
 * Schritt 3  Risiko gespeichert       (Screen 4B — übernommen)
 * Schritt 4  Weiter geht's!           (Screen 5 — Fortschrittslinie komplett)
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, CaretLeft, Check, DotsThree } from '@phosphor-icons/react'
import TagroSpark from '@/components/dashboard/TagroSpark'
import { RISK_MOBILE_CSS } from '@/components/dashboard/risk-mobile-styles'

export type RiskLevel = 'low' | 'mid' | 'high'
export type RiskMeasure = 'accept' | 'mitigate' | 'delegate'

export type MobileRisk = {
  id: string
  projectId?: string | null
  title: string
  description: string
  /** Was Tagro empfiehlt — erscheint als Chip über der Überschrift. */
  recommendation: string
  /** Begründung im Bottom Sheet. */
  reasons: string[]
  suggestedImpact: RiskLevel
  suggestedProbability: RiskLevel
  suggestedMeasure: RiskMeasure
}

export type RiskResult = {
  impact: RiskLevel
  probability: RiskLevel
  measure: RiskMeasure
  /** 'tagro' = Empfehlung übernommen, 'manual' = selbst gewählt. */
  source: 'manual' | 'tagro'
}

type Step = 'assess' | 'measure' | 'saved' | 'outro'

const STEP_INDEX: Record<Step, number> = { assess: 0, measure: 1, saved: 2, outro: 4 }
const TOTAL_POINTS = 4

const LEVELS: { id: RiskLevel; label: string }[] = [
  { id: 'low', label: 'Niedrig' },
  { id: 'mid', label: 'Mittel' },
  { id: 'high', label: 'Hoch' },
]

const MEASURES: { id: RiskMeasure; label: string; sub: string }[] = [
  { id: 'accept', label: 'Akzeptieren', sub: 'Wir akzeptieren dieses Risiko.' },
  { id: 'mitigate', label: 'Absichern', sub: 'Wir treffen Maßnahmen zur Absicherung.' },
  { id: 'delegate', label: 'Delegieren', sub: 'Wir übertragen das Risiko.' },
]

type Props = {
  risk: MobileRisk
  /** Wartet noch ein Risiko in der Schlange? Steuert die Ansage auf Screen 5. */
  hasNext?: boolean
  /** Abbruch — „Später" oder zurück. */
  onClose: () => void
  /** Bewertung steht fest, noch bevor die Bestätigung läuft. */
  onResolved?: (result: RiskResult) => void
  /** Screen 5 ist durch: nächstes Risiko oder zurück aufs Dashboard. */
  onFinish?: () => void
}

export default function RiskFlowMobile({ risk, hasNext, onClose, onResolved, onFinish }: Props) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<Step>('assess')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [impact, setImpact] = useState<RiskLevel>(risk.suggestedImpact)
  const [probability, setProbability] = useState<RiskLevel>(risk.suggestedProbability)
  const [measure, setMeasure] = useState<RiskMeasure>(risk.suggestedMeasure)

  useEffect(() => { setMounted(true) }, [])

  // 4B läuft nach kurzer Bestätigung automatisch in Screen 5.
  useEffect(() => {
    if (step !== 'saved') return
    const t = setTimeout(() => setStep('outro'), 2200)
    return () => clearTimeout(t)
  }, [step])

  // Screen 5 übergibt ans nächste Risiko — oder per Tap sofort.
  useEffect(() => {
    if (step !== 'outro') return
    const t = setTimeout(() => finish(), 4200)
    return () => clearTimeout(t)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  function finish() {
    if (onFinish) onFinish()
    else onClose()
  }

  function save(result: RiskResult) {
    setImpact(result.impact)
    setProbability(result.probability)
    setMeasure(result.measure)
    onResolved?.(result)
    setStep('saved')
  }

  function goBack() {
    if (step === 'measure') { setStep('assess'); return }
    onClose()
  }

  const pointIndex = STEP_INDEX[step]

  const ui = (
    <div className={`rfm${sheetOpen ? ' rfm--muted' : ''}`} role="dialog" aria-label="Risiken">
      <style>{RISK_MOBILE_CSS}</style>

      <header className="rk-head">
        <button type="button" className="rk-head-btn" onClick={goBack} aria-label="Zurück">
          <CaretLeft size={18} weight="regular" />
          <span>Risiken</span>
        </button>
        <button type="button" className="rk-head-icon" onClick={onClose} aria-label="Weitere Optionen">
          <DotsThree size={22} weight="bold" />
        </button>
      </header>

      <div className="rfm-body">
        <Progress index={pointIndex} showSwoosh={step === 'assess'} />

        {step === 'assess' && (
          <>
            <div className="rfm-hint-wrap">
              <button type="button" className="rfm-hint" onClick={() => setSheetOpen(true)}>
                <span className="rfm-hint-spark"><TagroSpark size={15} /></span>
                <span className="rfm-hint-copy">
                  <span className="rfm-hint-label">Tagro empfiehlt</span>
                  <span className="rfm-hint-value">{risk.recommendation}</span>
                </span>
              </button>
            </div>

            <p className="rfm-step">1 von 3</p>
            <h1 className="rfm-title">Risiko bewerten</h1>
            <p className="rfm-sub">Bewerte die Auswirkungen und Wahrscheinlichkeit dieses Risikos.</p>

            <section className="rfm-card">
              <h2 className="rfm-card-title">{risk.title}</h2>
              <p className="rfm-card-desc">{risk.description}</p>

              <div className="rfm-field">
                <p className="rfm-field-label">Auswirkung</p>
                <LevelGroup value={impact} onChange={setImpact} name="Auswirkung" />
              </div>

              <div className="rfm-field">
                <p className="rfm-field-label">Wahrscheinlichkeit</p>
                <LevelGroup value={probability} onChange={setProbability} name="Wahrscheinlichkeit" />
              </div>
            </section>
          </>
        )}

        {step === 'measure' && (
          <>
            <p className="rfm-step">2 von 3</p>
            <h1 className="rfm-title">Maßnahme wählen</h1>
            <p className="rfm-sub">Wähle aus, wie wir mit diesem Risiko umgehen sollen.</p>

            <div className="rfm-options" role="radiogroup" aria-label="Maßnahme">
              {MEASURES.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={measure === opt.id}
                  className={`rfm-option${measure === opt.id ? ' on' : ''}`}
                  onClick={() => setMeasure(opt.id)}
                >
                  <span className="rfm-radio" aria-hidden />
                  <span className="rfm-option-copy">
                    <span className="rfm-option-title">{opt.label}</span>
                    <span className="rfm-option-sub">{opt.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'saved' && (
          <div className="rfm-center">
            <div className="rfm-orb-wrap">
              <Sparkles />
              <div className="rfm-orb"><Check size={30} weight="regular" /></div>
            </div>
            <h1 className="rfm-center-title">Risiko gespeichert</h1>
            <p className="rfm-center-sub">
              Wir behalten das Risiko im Auge und informieren dich bei Veränderungen.
            </p>
          </div>
        )}

        {step === 'outro' && (
          <button type="button" className="rfm-outro" onClick={finish}>
            <div className="rfm-orb rfm-orb--spark"><TagroSpark size={26} /></div>
            <h1 className="rfm-center-title">Weiter geht&rsquo;s!</h1>
            <p className="rfm-center-sub">
              {hasNext
                ? 'Das nächste Risiko wartet auf deine Bewertung.'
                : 'Tagro überwacht deine Risiken und schlägt Maßnahmen vor.'}
            </p>
          </button>
        )}
      </div>

      {step === 'assess' && (
        <footer className="rfm-foot">
          <button type="button" className="rfm-btn rfm-btn--ghost" onClick={onClose}>
            Später
          </button>
          <button type="button" className="rfm-btn rfm-btn--dark" onClick={() => setSheetOpen(true)}>
            <TagroSpark size={15} />
            Mit Tagro analysieren
          </button>
        </footer>
      )}

      {step === 'measure' && (
        <footer className="rfm-foot">
          <button
            type="button"
            className="rfm-btn rfm-btn--dark"
            onClick={() => save({ impact, probability, measure, source: 'manual' })}
          >
            Weiter
            <ArrowRight size={17} weight="regular" />
          </button>
        </footer>
      )}

      {sheetOpen && (
        <TagroReasonSheet
          reasons={risk.reasons}
          onDismiss={() => {
            // Sheet schließen ohne Übernahme → Maßnahme selbst wählen (Screen 4A).
            setSheetOpen(false)
            setStep('measure')
          }}
          onAccept={() => {
            setSheetOpen(false)
            save({
              impact: risk.suggestedImpact,
              probability: risk.suggestedProbability,
              measure: risk.suggestedMeasure,
              source: 'tagro',
            })
          }}
        />
      )}
    </div>
  )

  if (!mounted) return null
  return createPortal(ui, document.body)
}

/* ────────────────────────── Teile ────────────────────────── */

function Progress({ index, showSwoosh }: { index: number; showSwoosh?: boolean }) {
  return (
    <div className="rfm-progress" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={Math.min(index + 1, 3)}>
      {showSwoosh && (
        <svg className="rfm-swoosh" viewBox="0 0 60 46" aria-hidden>
          <path d="M0 45C10 45 20 40 30 28C36 20 42 12 52 8" />
        </svg>
      )}
      {Array.from({ length: TOTAL_POINTS }).map((_, i) => {
        const state = i < index ? 'done' : i === index ? 'now' : 'todo'
        return (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && <span className={`rfm-seg${i <= index ? ' rfm-seg--on' : ''}`} />}
            <span className={`rfm-pt${state === 'done' ? ' rfm-pt--done' : state === 'now' ? ' rfm-pt--now' : ''}`}>
              {state === 'done' && <Check size={9} weight="bold" />}
            </span>
          </span>
        )
      })}
    </div>
  )
}

function LevelGroup({
  value,
  onChange,
  name,
}: {
  value: RiskLevel
  onChange: (v: RiskLevel) => void
  name: string
}) {
  return (
    <div className="rfm-seg-group" role="radiogroup" aria-label={name}>
      {LEVELS.map(l => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={value === l.id}
          className={`rfm-chip${value === l.id ? ' on' : ''}`}
          onClick={() => onChange(l.id)}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

function Sparkles() {
  const spots = [
    { top: 18, left: 24, size: 9, delay: '0s' },
    { top: 30, right: 20, size: 7, delay: '0.5s' },
    { bottom: 26, left: 30, size: 7, delay: '1s' },
    { bottom: 34, right: 26, size: 9, delay: '1.5s' },
    { top: 6, right: 58, size: 6, delay: '0.8s' },
  ]
  return (
    <>
      {spots.map((s, i) => {
        const { size, delay, ...pos } = s
        return (
          <span key={i} className="rfm-sparkle" style={{ ...pos, animationDelay: delay }} aria-hidden>
            <TagroSpark size={size} />
          </span>
        )
      })}
    </>
  )
}

function TagroReasonSheet({
  reasons,
  onDismiss,
  onAccept,
}: {
  reasons: string[]
  onDismiss: () => void
  onAccept: () => void
}) {
  return (
    <div className="rfs" role="dialog" aria-modal="true" aria-label="Warum diese Empfehlung?">
      <button type="button" className="rfs-scrim" aria-label="Schließen" onClick={onDismiss} />
      <div className="rfs-sheet">
        <div className="rfs-grip" aria-hidden />

        <div className="rfs-head">
          <span className="rfs-badge"><TagroSpark size={17} /></span>
          <div>
            <h2 className="rfs-name">Tagro</h2>
            <p className="rfs-why">Warum diese Empfehlung?</p>
          </div>
        </div>

        <ul className="rfs-list">
          {reasons.map(r => (
            <li key={r} className="rfs-item">
              <span className="rfs-check"><CheckRing /></span>
              {r}
            </li>
          ))}
        </ul>

        <button type="button" className="rfs-cta" onClick={onAccept}>
          Empfehlung übernehmen
        </button>
      </div>
    </div>
  )
}

function CheckRing({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 10.2l2.6 2.6L14 7.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
