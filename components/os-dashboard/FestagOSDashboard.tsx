'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OS_DASHBOARD_CSS } from './os-dashboard-styles'
import LivingProjectGraph from './LivingProjectGraph'
import DecisionFlow from './DecisionFlow'
import RiskFlow from './RiskFlow'
import TransferScreen from './TransferScreen'

/* ── Types ── */
export type NodeId =
  | 'dokumente'
  | 'zeitplan'
  | 'entscheidungen'
  | 'risiken'
  | 'integrationen'
  | 'tests'
  | 'deployment'
  | 'naechste-schritte'

export interface ProjectNode {
  id: NodeId
  label: string
  sublabel: string
  x: number
  y: number
  status: 'ok' | 'attention' | 'warning' | 'pending'
  badge?: { text: string; tone: 'amber' | 'red' | 'green' | 'info' }
}

export interface Decision {
  id: string
  title: string
  subtitle: string
  options: { label: string; recommended?: boolean }[]
  tagroReasons: string[]
}

export interface Risk {
  id: string
  title: string
  description: string
  impact: 'Niedrig' | 'Mittel' | 'Hoch'
  probability: 'Niedrig' | 'Mittel' | 'Hoch'
  tagroReasons: string[]
  measures: { label: string; description: string }[]
}

type FlowState =
  | { type: 'idle' }
  | { type: 'decision'; index: number }
  | { type: 'risk'; index: number }
  | { type: 'tagro-decision'; index: number }
  | { type: 'tagro-risk'; index: number }
  | { type: 'transfer'; variant: 'decision' | 'risk' }
  | { type: 'success'; variant: 'decision' | 'risk' }
  | { type: 'continue'; variant: 'decision' | 'risk' }

/* ── Demo Data ── */
const NODES: ProjectNode[] = [
  { id: 'dokumente', label: 'Dokumente', sublabel: 'Aktualisiert', x: 170, y: 80, status: 'ok', badge: { text: 'Info', tone: 'info' } },
  { id: 'zeitplan', label: 'Zeitplan', sublabel: 'Im Plan', x: 370, y: 65, status: 'ok' },
  { id: 'entscheidungen', label: 'Entscheidungen', sublabel: '1 Offen', x: 60, y: 220, status: 'attention', badge: { text: '1 Offen', tone: 'amber' } },
  { id: 'risiken', label: 'Risiken', sublabel: '2 Erkannt', x: 230, y: 240, status: 'warning', badge: { text: '2 Erkannt', tone: 'red' } },
  { id: 'integrationen', label: 'Integrationen', sublabel: 'Geplant', x: 420, y: 200, status: 'pending' },
  { id: 'tests', label: 'Tests', sublabel: 'In Arbeit', x: 410, y: 320, status: 'ok' },
  { id: 'deployment', label: 'Deployment', sublabel: 'Wartet', x: 230, y: 370, status: 'pending' },
  { id: 'naechste-schritte', label: 'Nächste Schritte', sublabel: '3 aktiv', x: 70, y: 350, status: 'ok' },
]

const EDGES: [NodeId, NodeId][] = [
  ['dokumente', 'zeitplan'],
  ['dokumente', 'entscheidungen'],
  ['entscheidungen', 'risiken'],
  ['risiken', 'integrationen'],
  ['risiken', 'deployment'],
  ['integrationen', 'tests'],
  ['tests', 'deployment'],
  ['deployment', 'naechste-schritte'],
  ['naechste-schritte', 'entscheidungen'],
]

const DECISIONS: Decision[] = [
  {
    id: 'd1',
    title: 'Homepage Design Stil',
    subtitle: 'Wähle den visuellen Stil, der am besten zu deinen Zielen passt.',
    options: [
      { label: 'Modern', recommended: true },
      { label: 'Elegant' },
      { label: 'Premium' },
    ],
    tagroReasons: [
      'Passt optimal zu deinem Branding',
      'Schneller umsetzbar',
      'Geringeres Projekt-Risiko',
    ],
  },
  {
    id: 'd2',
    title: 'Zahlungsanbieter festlegen',
    subtitle: 'Wähle den Zahlungsanbieter für dein Projekt.',
    options: [
      { label: 'Stripe', recommended: true },
      { label: 'PayPal' },
      { label: 'Klarna' },
    ],
    tagroReasons: [
      'Beste Developer Experience',
      'Niedrigere Transaktionsgebühren',
      'Schnellere Integration',
    ],
  },
  {
    id: 'd3',
    title: 'Content Strategie freigeben',
    subtitle: 'Bestätige die Content Strategie für den Launch.',
    options: [
      { label: 'SEO-First', recommended: true },
      { label: 'Social Media First' },
      { label: 'Hybrid' },
    ],
    tagroReasons: [
      'Höchster langfristiger ROI',
      'Passt zur Zielgruppe',
      'Bewährte Strategie in deiner Branche',
    ],
  },
]

const RISKS: Risk[] = [
  {
    id: 'r1',
    title: 'Drittanbieter-Ausfall',
    description: 'Ein Ausfall eines integrierten Drittanbieters könnte zu Verzögerungen führen.',
    impact: 'Mittel',
    probability: 'Mittel',
    tagroReasons: [
      'Mittlere Auswirkung auf Projektzeitplan',
      'Wahrscheinlichkeit: Mittel',
      'Betroffenes Modul: Integrationen',
      'Alternativen verfügbar',
      'Frühzeitige Maßnahmen empfohlen',
    ],
    measures: [
      { label: 'Akzeptieren', description: 'Wir akzeptieren dieses Risiko' },
      { label: 'Absichern', description: 'Wir treffen Maßnahmen zur Absicherung.' },
      { label: 'Delegieren', description: 'Wir übertragen das Risiko.' },
    ],
  },
  {
    id: 'r2',
    title: 'Performance-Engpass',
    description: 'Bei hohem Traffic könnte die Anwendung langsamer werden.',
    impact: 'Hoch',
    probability: 'Niedrig',
    tagroReasons: [
      'Hohe Auswirkung bei Eintreten',
      'Niedrige Eintrittswahrscheinlichkeit',
      'Load-Testing geplant',
      'CDN-Caching als Mitigation',
    ],
    measures: [
      { label: 'Akzeptieren', description: 'Wir akzeptieren dieses Risiko' },
      { label: 'Absichern', description: 'Wir treffen Maßnahmen zur Absicherung.' },
      { label: 'Delegieren', description: 'Wir übertragen das Risiko.' },
    ],
  },
]

const TEAM = [
  { role: 'Frontend Entwickler', count: 2, color: '#7B6EAE' },
  { role: 'Backend Entwickler', count: 3, color: '#7B6EAE' },
  { role: 'Designer', count: 1, color: '#D470A2' },
  { role: 'QA Engineer', count: 1, color: '#8DB255' },
]

export default function FestagOSDashboard() {
  const [flow, setFlow] = useState<FlowState>({ type: 'idle' })
  const [hoveredNode, setHoveredNode] = useState<NodeId | null>(null)
  const [decisionIndex, setDecisionIndex] = useState(0)
  const [riskIndex, setRiskIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [selectedMeasure, setSelectedMeasure] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const undoTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleNodeClick = useCallback((id: NodeId) => {
    if (id === 'entscheidungen') {
      setDecisionIndex(0)
      setSelectedOption(null)
      setFlow({ type: 'decision', index: 0 })
    } else if (id === 'risiken') {
      setRiskIndex(0)
      setSelectedMeasure(null)
      setFlow({ type: 'risk', index: 0 })
    }
  }, [])

  const handleTagroDecision = useCallback(() => {
    setFlow({ type: 'tagro-decision', index: decisionIndex })
  }, [decisionIndex])

  const handleTagroRisk = useCallback(() => {
    setFlow({ type: 'tagro-risk', index: riskIndex })
  }, [riskIndex])

  const handleAcceptDecision = useCallback(() => {
    setFlow({ type: 'transfer', variant: 'decision' })
    undoTimer.current = setTimeout(() => {
      setFlow({ type: 'success', variant: 'decision' })
      setTimeout(() => {
        if (decisionIndex < DECISIONS.length - 1) {
          setDecisionIndex(i => i + 1)
          setSelectedOption(null)
          setFlow({ type: 'continue', variant: 'decision' })
          setTimeout(() => {
            setFlow({ type: 'decision', index: decisionIndex + 1 })
          }, 1800)
        } else {
          setFlow({ type: 'idle' })
        }
      }, 1500)
    }, 3000)
  }, [decisionIndex])

  const handleAcceptRisk = useCallback(() => {
    setFlow({ type: 'transfer', variant: 'risk' })
    undoTimer.current = setTimeout(() => {
      setFlow({ type: 'success', variant: 'risk' })
      setTimeout(() => {
        if (riskIndex < RISKS.length - 1) {
          setRiskIndex(i => i + 1)
          setSelectedMeasure(null)
          setFlow({ type: 'continue', variant: 'risk' })
          setTimeout(() => {
            setFlow({ type: 'risk', index: riskIndex + 1 })
          }, 1800)
        } else {
          setFlow({ type: 'idle' })
        }
      }, 1500)
    }, 3000)
  }, [riskIndex])

  const handleUndo = useCallback(() => {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current)
      undoTimer.current = null
    }
    if (flow.type === 'transfer' && flow.variant === 'decision') {
      setFlow({ type: 'decision', index: decisionIndex })
    } else if (flow.type === 'transfer' && flow.variant === 'risk') {
      setFlow({ type: 'risk', index: riskIndex })
    }
  }, [flow, decisionIndex, riskIndex])

  const handleConfirmSelf = useCallback((variant: 'decision' | 'risk') => {
    setFlow({ type: 'transfer', variant })
    undoTimer.current = setTimeout(() => {
      setFlow({ type: 'success', variant })
      setTimeout(() => {
        const idx = variant === 'decision' ? decisionIndex : riskIndex
        const max = variant === 'decision' ? DECISIONS.length : RISKS.length
        if (idx < max - 1) {
          if (variant === 'decision') {
            setDecisionIndex(i => i + 1)
            setSelectedOption(null)
          } else {
            setRiskIndex(i => i + 1)
            setSelectedMeasure(null)
          }
          setFlow({ type: 'continue', variant })
          setTimeout(() => {
            setFlow({ type: variant, index: idx + 1 })
          }, 1800)
        } else {
          setFlow({ type: 'idle' })
        }
      }, 1500)
    }, 3000)
  }, [decisionIndex, riskIndex])

  const closeFlow = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setFlow({ type: 'idle' })
  }, [])

  const isFlowActive = flow.type !== 'idle'
  const currentDecision = DECISIONS[decisionIndex]
  const currentRisk = RISKS[riskIndex]

  return (
    <div className="fos-root">
      <style>{OS_DASHBOARD_CSS}</style>

      {/* ── Desktop Layout ── */}
      <div className="fos-desktop">
        {/* Left: Greeting */}
        <motion.div
          className="fos-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="fos-greeting">
            <h1>Guten Morgen, Stefan.</h1>
            <p>
              Heute läuft alles planmäßig.
              Eine Entscheidung wartet auf deine Freigabe.
              Die Risiken werden aktiv überwacht und unsere nächsten Schritte sind klar definiert.
            </p>
          </div>

          <div className="fos-actions">
            <button className="fos-action-card" onClick={() => handleNodeClick('entscheidungen')}>
              <span className="fos-action-dot amber" />
              <span className="fos-action-copy">
                <p className="fos-action-title">4 offene Entscheidungen</p>
                <p className="fos-action-sub">Wartet auf deine Freigabe</p>
              </span>
              <span className="fos-action-badge amber">2 Neue</span>
              <ChevronRight />
            </button>
            <button className="fos-action-card" onClick={() => handleNodeClick('risiken')}>
              <span className="fos-action-dot red" />
              <span className="fos-action-copy">
                <p className="fos-action-title">2 Risiken erkannt</p>
                <p className="fos-action-sub">Warte auf deine Bewertung</p>
              </span>
              <span className="fos-action-badge red">2 Neue</span>
              <ChevronRight />
            </button>
          </div>

          <div className="fos-cta-row">
            <button className="fos-btn-primary" onClick={() => handleNodeClick('entscheidungen')}>
              <ConstellationDots size={16} />
              Statusbericht öffnen
            </button>
            <button className="fos-btn-secondary">
              <AudioIcon />
              Anhören
            </button>
          </div>

          <button className="fos-filter">
            <ConstellationDots size={14} />
            Filter
            <ChevronDown />
          </button>
        </motion.div>

        {/* Center: Living Graph */}
        <motion.div
          className="fos-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <LivingProjectGraph
            nodes={NODES}
            edges={EDGES}
            hoveredNode={hoveredNode}
            onNodeHover={setHoveredNode}
            onNodeClick={handleNodeClick}
            activeNode={
              flow.type === 'decision' || flow.type === 'tagro-decision'
                ? 'entscheidungen'
                : flow.type === 'risk' || flow.type === 'tagro-risk'
                  ? 'risiken'
                  : null
            }
          />
        </motion.div>

        {/* Right: Context Panel */}
        <motion.div
          className="fos-right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="fos-panel-card">
            <div className="fos-panel-head">
              <h3 className="fos-panel-title">Entwickler</h3>
              <span className="fos-panel-count">7 Mitglieder</span>
            </div>
            <div className="fos-panel-rows">
              {TEAM.map(t => (
                <div key={t.role} className="fos-panel-row">
                  <span className="fos-panel-row-left">
                    <ConstellationDots size={14} color={t.color} />
                    <span className="fos-panel-row-label">{t.role}</span>
                  </span>
                  <span className="fos-panel-row-count">{t.count}</span>
                </div>
              ))}
            </div>
            <button className="fos-panel-link">
              Team verwalten <ChevronRight />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Mobile Layout ── */}
      <div className="fos-mobile">
        <div className="fos-m-graph-area">
          <LivingProjectGraph
            nodes={NODES}
            edges={EDGES}
            hoveredNode={hoveredNode}
            onNodeHover={setHoveredNode}
            onNodeClick={handleNodeClick}
            activeNode={null}
            compact
          />
        </div>
        <div className="fos-m-body">
          <div className="fos-greeting">
            <h1>Guten Morgen, Stefan.</h1>
            <p>Heute läuft alles planmäßig. Eine Entscheidung wartet auf deine Freigabe.</p>
          </div>
          <button className="fos-action-card" onClick={() => handleNodeClick('entscheidungen')}>
            <span className="fos-action-dot amber" />
            <span className="fos-action-copy">
              <p className="fos-action-title">4 offene Entscheidungen</p>
              <p className="fos-action-sub">Wartet auf deine Freigabe</p>
            </span>
            <ChevronRight />
          </button>
          <button className="fos-action-card" onClick={() => handleNodeClick('risiken')}>
            <span className="fos-action-dot red" />
            <span className="fos-action-copy">
              <p className="fos-action-title">2 Risiken erkannt</p>
              <p className="fos-action-sub">Warte auf deine Bewertung</p>
            </span>
            <ChevronRight />
          </button>
        </div>
        <div className="fos-m-dock">
          <button className="fos-m-dock-item active">
            <HomeIcon />
            Übersicht
          </button>
          <button className="fos-m-dock-item">
            <span className="fos-m-dock-orb">
              <AudioIcon color="#fff" />
            </span>
            Tagro
          </button>
          <button className="fos-m-dock-item">
            <ProjectsIcon />
            Projekte
          </button>
        </div>
      </div>

      {/* ── Chat Input (Desktop) ── */}
      {!isMobile && (
        <div className="fos-chat-input-wrap">
          <input className="fos-chat-input" placeholder="Erkläre mir alle offenen..." />
          <button className="fos-chat-send">
            <ArrowUp />
          </button>
        </div>
      )}

      {/* ── Decision Flow ── */}
      <AnimatePresence>
        {(flow.type === 'decision' || flow.type === 'tagro-decision') && currentDecision && (
          <DecisionFlow
            key="decision-flow"
            decision={currentDecision}
            index={decisionIndex}
            total={DECISIONS.length}
            selectedOption={selectedOption}
            onSelectOption={setSelectedOption}
            onTagro={handleTagroDecision}
            onConfirmSelf={() => handleConfirmSelf('decision')}
            onClose={closeFlow}
            showTagro={flow.type === 'tagro-decision'}
            onAcceptTagro={handleAcceptDecision}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* ── Risk Flow ── */}
      <AnimatePresence>
        {(flow.type === 'risk' || flow.type === 'tagro-risk') && currentRisk && (
          <RiskFlow
            key="risk-flow"
            risk={currentRisk}
            index={riskIndex}
            total={RISKS.length}
            selectedMeasure={selectedMeasure}
            onSelectMeasure={setSelectedMeasure}
            onTagro={handleTagroRisk}
            onConfirmSelf={() => handleConfirmSelf('risk')}
            onClose={closeFlow}
            showTagro={flow.type === 'tagro-risk'}
            onAcceptTagro={handleAcceptRisk}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* ── Transfer / Success / Continue ── */}
      <AnimatePresence>
        {flow.type === 'transfer' && (
          <TransferScreen
            key="transfer"
            variant={flow.variant}
            onUndo={handleUndo}
          />
        )}
        {flow.type === 'success' && (
          <motion.div
            key="success"
            className="fos-success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className={`fos-success-check ${flow.variant === 'risk' ? 'risk' : ''}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1, type: 'spring', stiffness: 200 }}
            >
              <CheckIcon size={28} />
            </motion.div>
            <motion.p
              className="fos-success-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {flow.variant === 'decision' ? 'Entscheidung übernommen' : 'Risiko gespeichert'}
            </motion.p>
            <motion.p
              className="fos-success-sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {flow.variant === 'decision'
                ? `${currentDecision?.options[0]?.label || 'Modern'} wurde als Stil festgelegt.`
                : 'Wir behalten das Risiko im Auge und informieren dich bei Veränderungen.'}
            </motion.p>
          </motion.div>
        )}
        {flow.type === 'continue' && (
          <motion.div
            key="continue"
            className="fos-continue-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className={`fos-continue-star ${flow.variant === 'risk' ? 'risk' : ''}`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
            >
              <StarIcon size={40} />
            </motion.div>
            <motion.p
              className="fos-continue-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Weiter geht&apos;s!
            </motion.p>
            <motion.p
              className="fos-continue-sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {flow.variant === 'decision'
                ? 'Tagro arbeitet bereits an den nächsten Punkten.'
                : 'Tagro überwacht deine Risiken und schlägt Maßnahmen vor.'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Icons ── */
export function ConstellationDots({ size = 16, color }: { size?: number; color?: string }) {
  const c = color || 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="4" r="2" fill={c} opacity={0.7} />
      <circle cx="11" cy="3" r="1.5" fill={c} opacity={0.5} />
      <circle cx="7" cy="9" r="2.5" fill={c} opacity={0.8} />
      <circle cx="13" cy="11" r="1" fill={c} opacity={0.4} />
      <circle cx="3" cy="13" r="1.5" fill={c} opacity={0.6} />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg className="fos-action-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 5.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AudioIcon({ color }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="5" y="3" width="2" height="12" rx="1" fill={color || 'currentColor'} opacity={0.6} />
      <rect x="8" y="1" width="2" height="16" rx="1" fill={color || 'currentColor'} />
      <rect x="11" y="5" width="2" height="8" rx="1" fill={color || 'currentColor'} opacity={0.6} />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 8l7-5 7 5v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function ProjectsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function ArrowUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 12V4M4 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.09 6.26L20.18 9l-5.09 3.74L17 19l-5-3.18L7 19l1.91-6.26L3.82 9l6.09-.74L12 2z" />
    </svg>
  )
}

export function TagroStarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" fill="currentColor" />
    </svg>
  )
}
