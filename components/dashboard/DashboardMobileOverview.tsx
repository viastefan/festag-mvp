'use client'

/**
 * DashboardMobileOverview — Screen 1 des Risiko-Erlebnisses.
 * Projektkonstellation, Begrüßungskarte mit Risiko-Einstieg, Dock.
 * Der Tap auf „N Risiken erkannt" öffnet RiskFlowMobile.
 */

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CaretDown, CaretRight, DotsThree, FolderSimple, SquaresFour } from '@phosphor-icons/react'
import RiskFlowMobile, { type MobileRisk, type RiskResult } from '@/components/dashboard/RiskFlowMobile'
import TagroSpark from '@/components/dashboard/TagroSpark'
import { RISK_MOBILE_CSS } from '@/components/dashboard/risk-mobile-styles'

type NodeAnchor = 'start' | 'middle' | 'end'

type GraphNode = {
  id: string
  label: string
  sub: string
  x: number
  y: number
  anchor: NodeAnchor
  /** Versatz des Labels relativ zum Punkt. */
  dx: number
  dy: number
  hub?: boolean
  active?: boolean
}

/** Konstellation im viewBox VIEW_BOX — hochformatig wie im Entwurf. */
const VIEW_BOX = '-26 -10 352 340'

const NODES: GraphNode[] = [
  { id: 'risiken', label: 'Risiken', sub: '2 erkannt', x: 132, y: 124, anchor: 'middle', dx: 0, dy: 26, hub: true, active: true },
  { id: 'dokumente', label: 'Dokumente', sub: 'Aktualisiert', x: 68, y: 34, anchor: 'start', dx: 9, dy: 3 },
  { id: 'zeitplan', label: 'Zeitplan', sub: 'Im Plan', x: 216, y: 44, anchor: 'start', dx: 9, dy: 3 },
  { id: 'entscheidungen', label: 'Entscheidungen', sub: '1 offen', x: 58, y: 142, anchor: 'end', dx: -9, dy: 3 },
  { id: 'integrationen', label: 'Integrationen', sub: 'Geplant', x: 226, y: 158, anchor: 'start', dx: 9, dy: 3 },
  { id: 'schritte', label: 'Nächste Schritte', sub: '3 aktiv', x: 34, y: 268, anchor: 'start', dx: 9, dy: -6, active: true },
  { id: 'deployment', label: 'Deployment', sub: 'Wartet', x: 132, y: 288, anchor: 'middle', dx: 0, dy: 17 },
]

/** [von, nach, aktiv] — der grüne Pfad ist die Kette Nächste Schritte → Entscheidungen → Risiken → Zeitplan. */
const EDGES: [string, string, boolean][] = [
  ['schritte', 'entscheidungen', true],
  ['entscheidungen', 'risiken', true],
  ['risiken', 'zeitplan', true],
  ['risiken', 'dokumente', false],
  ['risiken', 'integrationen', false],
  ['risiken', 'deployment', false],
]

const byId = (id: string) => NODES.find(n => n.id === id)!

/** Sanft gebogene Kante zwischen zwei Knoten. */
function edgePath(a: GraphNode, b: GraphNode) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  // Senkrecht zur Verbindung auslenken, damit die Linien organisch wirken.
  const bow = Math.min(len * 0.16, 22)
  const cx = mx + (-dy / len) * bow
  const cy = my + (dx / len) * bow
  return `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`
}

/** Demo-Risiken für die Dev-Preview — im Dashboard kommen echte Tasks an. */
export const DEFAULT_MOBILE_RISKS: MobileRisk[] = [
  {
    id: 'third-party-outage',
    title: 'Drittanbieter-Ausfall',
    description: 'Ein Ausfall eines integrierten Drittanbieters könnte zu Verzögerungen führen.',
    recommendation: 'Prüfen',
    reasons: [
      'Mittlere Auswirkung auf Projektzeitplan',
      'Wahrscheinlichkeit: Mittel',
      'Betroffenes Modul: Integrationen',
      'Alternativen verfügbar',
      'Frühzeitige Maßnahmen empfohlen',
    ],
    suggestedImpact: 'mid',
    suggestedProbability: 'mid',
    suggestedMeasure: 'mitigate',
  },
  {
    id: 'migration-window',
    title: 'Enges Migrationsfenster',
    description: 'Die Datenmigration liegt auf dem kritischen Pfad und hat keinen Puffer.',
    recommendation: 'Absichern',
    reasons: [
      'Hohe Auswirkung auf Projektzeitplan',
      'Wahrscheinlichkeit: Mittel',
      'Betroffenes Modul: Deployment',
      'Kein Puffer im Zeitplan',
      'Frühzeitige Maßnahmen empfohlen',
    ],
    suggestedImpact: 'high',
    suggestedProbability: 'mid',
    suggestedMeasure: 'mitigate',
  },
]

type Props = {
  /** „Guten Morgen, Stefan." */
  greeting: string
  scopeLabel?: string
  /** Zeile unter der Begrüßung. */
  statusLine?: string
  /** Offene Risiken in der Reihenfolge, in der sie bewertet werden. */
  risks?: MobileRisk[]
  onOpenScope?: () => void
  onOpenMenu?: () => void
  onOpenProjects?: () => void
  onOpenAddons?: () => void
  onOpenTagro?: () => void
  onRiskResolved?: (riskId: string, result: RiskResult) => void
  /** „Mit Tagro analysieren" im Flow — liefert geschärfte Begründungszeilen. */
  onAnalyzeRisk?: (riskId: string) => Promise<string[] | null>
}

export default function DashboardMobileOverview({
  greeting,
  scopeLabel = 'Gesamtbericht',
  statusLine,
  risks = DEFAULT_MOBILE_RISKS,
  onOpenScope,
  onOpenMenu,
  onOpenProjects,
  onOpenAddons,
  onOpenTagro,
  onRiskResolved,
  onAnalyzeRisk,
}: Props) {
  const [mounted, setMounted] = useState(false)
  // Beim Öffnen eingefroren: die Schlange soll nicht unter dem Flow wegschrumpfen,
  // während das Dashboard im Hintergrund neu lädt.
  const [queue, setQueue] = useState<MobileRisk[] | null>(null)
  const [index, setIndex] = useState(0)

  const riskCount = risks.length
  const active = queue?.[index] ?? null
  const hasNext = queue ? index < queue.length - 1 : false

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const sync = () => document.body.classList.toggle('festag-dashboard-mobile', mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => {
      mq.removeEventListener('change', sync)
      document.body.classList.remove('festag-dashboard-mobile')
    }
  }, [])

  const status = statusLine
    ?? (riskCount > 0
      ? 'Heute läuft alles planmäßig. Ein Risiko benötigt deine Aufmerksamkeit.'
      : 'Heute läuft alles planmäßig.')

  const nodes = useMemo(
    () => NODES.map(n => (n.id === 'risiken' ? { ...n, sub: `${riskCount} erkannt` } : n)),
    [riskCount],
  )

  function closeFlow() {
    setQueue(null)
    setIndex(0)
  }

  const ui = (
    <>
      <div className="dmo" role="main" aria-label="Dashboard Überblick">
        <style>{RISK_MOBILE_CSS}</style>

        <header className="rk-head">
          <button type="button" className="rk-head-btn" onClick={onOpenScope}>
            <span>{scopeLabel}</span>
            <CaretDown size={13} weight="bold" />
          </button>
          <button type="button" className="rk-head-icon" onClick={onOpenMenu} aria-label="Menü öffnen">
            <DotsThree size={22} weight="bold" />
          </button>
        </header>

        <div className="dmo-graph">
          <svg viewBox={VIEW_BOX} preserveAspectRatio="xMidYMid meet" aria-hidden>
            {EDGES.map(([from, to, on]) => (
              <path
                key={`${from}-${to}`}
                className={`dmo-edge${on ? ' dmo-edge--on' : ''}`}
                d={edgePath(byId(from), byId(to))}
              />
            ))}

            {nodes.map(n => (
              <g key={n.id}>
                {n.hub && <circle className="dmo-node-halo" cx={n.x} cy={n.y} r={16} />}
                <circle
                  className={n.hub ? 'dmo-node-hub' : n.active ? 'dmo-node dmo-node--on' : 'dmo-node'}
                  cx={n.x}
                  cy={n.y}
                  r={n.hub ? 8 : 3.4}
                />
                <text
                  className={`dmo-label${n.hub ? ' dmo-label--hub' : ''}`}
                  x={n.x + n.dx}
                  y={n.y + n.dy}
                  textAnchor={n.anchor}
                >
                  {n.label}
                </text>
                <text
                  className={`dmo-sub${n.active ? ' dmo-sub--on' : ''}`}
                  x={n.x + n.dx}
                  y={n.y + n.dy + (n.hub ? 11 : 9)}
                  textAnchor={n.anchor}
                >
                  {n.sub}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <section className="dmo-card">
          <h1 className="dmo-greet">{greeting}</h1>
          <p className="dmo-greet-sub">{status}</p>

          {riskCount > 0 && (
            <button
              type="button"
              className="dmo-risk-row"
              onClick={() => { setQueue(risks); setIndex(0) }}
              aria-label={`${riskCount} Risiken erkannt, jetzt bewerten`}
            >
              <span className="dmo-risk-icon"><CheckRing /></span>
              <span className="dmo-risk-copy">
                <span className="dmo-risk-title">
                  {riskCount === 1 ? '1 Risiko erkannt' : `${riskCount} Risiken erkannt`}
                </span>
                <span className="dmo-risk-sub">Warte auf deine Bewertung</span>
              </span>
              <span className="dmo-risk-chev"><CaretRight size={15} weight="bold" /></span>
            </button>
          )}
        </section>

        <nav className="dmo-dock" aria-label="Schnellzugriff">
          <button type="button" className="dmo-dock-item" onClick={onOpenProjects}>
            <FolderSimple size={20} weight="regular" />
            Projekte
          </button>
          <button type="button" className="dmo-fab" onClick={onOpenTagro} aria-label="Tagro öffnen">
            <TagroSpark size={21} />
          </button>
          <button type="button" className="dmo-dock-item" onClick={onOpenAddons}>
            <SquaresFour size={20} weight="regular" />
            Add-ons
          </button>
        </nav>
      </div>

      {active && (
        <RiskFlowMobile
          key={active.id}
          risk={active}
          hasNext={hasNext}
          onAnalyze={onAnalyzeRisk}
          onClose={closeFlow}
          onResolved={(result) => onRiskResolved?.(active.id, result)}
          onFinish={() => {
            if (hasNext) setIndex(i => i + 1)
            else closeFlow()
          }}
        />
      )}
    </>
  )

  if (!mounted) return null
  return createPortal(ui, document.body)
}

function CheckRing({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 10.2l2.6 2.6L14 7.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
