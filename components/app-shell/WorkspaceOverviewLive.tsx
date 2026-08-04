'use client'

/**
 * Decision Canvas — Festag Overview (v4.1)
 *
 * Show me only what deserves my attention.
 * One focus · one organic ink path · one recommendation sheet.
 * Not a dashboard. Not a chatbot. Not PM software.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Microphone } from '@phosphor-icons/react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import { openNewProject } from '@/lib/new-project-open'

export type OverviewPayload = {
  workspace: { id: string; name: string; domain?: string }
  workspaces?: Array<{
    id: string
    name: string
    slug?: string | null
    isPersonal?: boolean
    role?: string | null
  }>
  summary: {
    activeProjects: number
    pendingDecisions: number
    teamMembers: number
    nextMilestone: string | null
    calmLine: string
  }
  briefing: {
    projectTitle: string
    lines: string[]
    reportId: string | null
    projectId: string | null
  } | null
  projects: Array<{
    id: string
    title: string
    phase: string | null
    progress: number
    health: 'healthy' | 'watch' | 'risk' | 'blocked'
    status: string | null
    nextMilestone: string | null
  }>
  tasks?: Array<{
    id: string
    title: string
    status: string | null
    projectId: string | null
    projectTitle: string
    updatedAt: string | null
  }>
  decisions: Array<{
    id: string
    title: string
    projectId: string | null
    projectTitle: string
    urgency: string | null
    dueDate: string | null
  }>
  activity: Array<{
    id: string
    title: string
    body: string | null
    createdAt: string
    projectTitle: string | null
  }>
  team: Array<{
    id: string
    name: string
    avatarUrl: string | null
    role: string | null
  }>
}

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
}

/** calm → path grows → focus revealed → sheet → retract */
type Phase = 'calm' | 'path' | 'focus' | 'sheet' | 'retract'

type Option = { id: string; label: string; hint?: string }

type ExplainStep = { n: number; label: string }

type FocusTopic = {
  kind: 'decision' | 'project'
  id: string
  eyebrow: string
  question: string
  options: Option[]
  recommendId: string
  recommendLabel: string
  reasons: string[]
  explainTitle: string
  explainSteps: ExplainStep[]
  href?: string
}

function buildTopic(data: OverviewPayload): FocusTopic | null {
  if (data.summary.activeProjects === 0) {
    return {
      kind: 'project',
      id: 'first-project',
      eyebrow: 'Nächster Schritt',
      question: 'Bereit für dein erstes Projekt?',
      options: [
        { id: 'start', label: 'Jetzt starten', hint: 'Tagro strukturiert den Rest.' },
        { id: 'later', label: 'Später', hint: 'Workspace bleibt ruhig.' },
      ],
      recommendId: 'start',
      recommendLabel: 'Jetzt starten',
      reasons: [
        'Tagro strukturiert Name und nächste Schritte.',
        'Ein Workspace — keine zweite App.',
        'Einladungen und Freigaben folgen von selbst.',
      ],
      explainTitle: 'So geht es weiter',
      explainSteps: [
        { n: 1, label: 'Projekt benennen' },
        { n: 2, label: 'Tagro strukturiert Aufgaben' },
        { n: 3, label: 'Team einladen' },
      ],
    }
  }

  const d = data.decisions[0]
  if (!d || data.summary.pendingDecisions <= 0) return null

  const isDesign = /design/i.test(d.title)
  const isHome = /homepage|startseite/i.test(d.title)

  if (isDesign) {
    return {
      kind: 'decision',
      id: d.id,
      eyebrow: 'Entscheidung',
      question: 'Welches Design soll die primäre Richtung werden?',
      options: [
        { id: 'minimal', label: 'Modern Minimal', hint: 'Klar, zeitlos, hohe Conversion.' },
        { id: 'corporate', label: 'Elegant Corporate', hint: 'Seriös, vertraut, etabliert.' },
      ],
      recommendId: 'minimal',
      recommendLabel: 'Modern Minimal',
      reasons: [
        'Besser an deine Marke angepasst',
        'Schnellere Umsetzung',
        'Höhere langfristige Konsistenz',
      ],
      explainTitle: 'Umsetzung',
      explainSteps: [
        { n: 1, label: 'Richtung festlegen' },
        { n: 2, label: 'Komponenten angleichen' },
        { n: 3, label: 'Freigabe an Client' },
      ],
      href: `/decisions/${d.id}`,
    }
  }

  if (isHome) {
    return {
      kind: 'decision',
      id: d.id,
      eyebrow: 'Entscheidung',
      question: 'Neue Homepage veröffentlichen?',
      options: [
        { id: 'approve', label: 'Freigeben', hint: 'Live gehen.' },
        { id: 'changes', label: 'Änderungen anfordern', hint: 'Feedback zurück an das Team.' },
      ],
      recommendId: 'approve',
      recommendLabel: 'Freigeben',
      reasons: [
        'Qualität und Performance sind geprüft',
        'Keine kritischen Issues',
        'Bereit für Deployment',
      ],
      explainTitle: 'Veröffentlichung',
      explainSteps: [
        { n: 1, label: 'Qualitätsprüfung' },
        { n: 2, label: 'Performance validieren' },
        { n: 3, label: 'Deployment starten' },
      ],
      href: `/decisions/${d.id}`,
    }
  }

  return {
    kind: 'decision',
    id: d.id,
    eyebrow: 'Entscheidung',
    question: d.title.endsWith('?') ? d.title : `${d.title}?`,
    options: [
      { id: 'approve', label: 'Übernehmen', hint: 'Tagro führt den nächsten Schritt aus.' },
      { id: 'changes', label: 'Anpassen', hint: 'Du behältst die Kontrolle.' },
    ],
    recommendId: 'approve',
    recommendLabel: 'Übernehmen',
    reasons: [
      'Passt zum aktuellen Projektstand',
      'Keine Blocker erkannt',
      'Nächster Schritt ist klar',
    ],
    explainTitle: d.projectTitle || 'Kontext',
    explainSteps: [
      { n: 1, label: 'Kontext prüfen' },
      { n: 2, label: 'Empfehlung bestätigen' },
      { n: 3, label: 'Ausführung' },
    ],
    href: `/decisions/${d.id}`,
  }
}

/** Organic ink path — one curve, never a graph */
const INK_PATH =
  'M 40 48 C 120 40, 200 72, 280 110 S 420 168, 520 188'

export default function WorkspaceOverviewLive({ greeting, firstName, data }: Props) {
  const router = useRouter()
  const topic = useMemo(() => buildTopic(data), [data])
  const [phase, setPhase] = useState<Phase>('calm')
  const [selected, setSelected] = useState<string | null>(null)
  const [explainOpen, setExplainOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    setPhase('calm')
    setSelected(null)
    setExplainOpen(false)
    setSheetOpen(false)
  }, [topic?.id])

  const lead = `${greeting}, ${firstName}.`

  const calmLine = useMemo(() => {
    if (topic?.kind === 'project') {
      return `In ${data.workspace.name} läuft noch alles ruhig.`
    }
    if (data.summary.calmLine) return data.summary.calmLine
    return 'Alles läuft ruhig.'
  }, [topic, data])

  const waitingLabel = useMemo(() => {
    if (!topic) return null
    if (topic.kind === 'project') return 'Erstes Projekt wartet'
    if (data.summary.pendingDecisions === 1) return 'Eine Entscheidung wartet'
    return `${data.summary.pendingDecisions} Entscheidungen warten`
  }, [topic, data.summary.pendingDecisions])

  function activate() {
    if (!topic || phase !== 'calm') return
    setSelected(topic.recommendId)
    setPhase('path')
    window.setTimeout(() => setPhase('focus'), 900)
    window.setTimeout(() => {
      setPhase('sheet')
      setSheetOpen(true)
    }, 1300)
  }

  function retract(then?: () => void) {
    setExplainOpen(false)
    setSheetOpen(false)
    setPhase('retract')
    window.setTimeout(() => {
      setPhase('calm')
      setSelected(null)
      then?.()
    }, 550)
  }

  function acceptRecommendation() {
    if (!topic) return
    setSelected(topic.recommendId)
    if (topic.kind === 'project') {
      retract(() => openNewProject())
      return
    }
    if (topic.href) {
      retract(() => router.push(topic.href!))
      return
    }
    retract()
  }

  function reviewAlternatives() {
    setExplainOpen(false)
    /* Stay on focus — human picks; sheet stays available on desktop */
    setPhase('focus')
    setSheetOpen(true)
  }

  const showPath = phase === 'path' || phase === 'focus' || phase === 'sheet'
  const showFocus = phase === 'focus' || phase === 'sheet'
  const showSheet = (phase === 'sheet' || (phase === 'focus' && sheetOpen)) && Boolean(topic)
  const isRetracting = phase === 'retract'
  const isCalm = phase === 'calm' || isRetracting

  return (
    <div
      className={[
        'fas-dc',
        showSheet ? ' has-sheet' : '',
        showPath ? ' is-active' : '',
        isRetracting ? ' is-retracting' : '',
        listening ? ' is-listening' : '',
      ].join('')}
      data-phase={phase}
    >
      <div className="fas-dc-invites">
        <OverviewPendingInvites />
      </div>

      {/* Organic ink path — movement IS the progress */}
      <svg
        className={`fas-dc-ink${showPath ? ' is-on' : ''}${isRetracting ? ' is-out' : ''}`}
        viewBox="0 0 560 240"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <path className="fas-dc-ink-track" d={INK_PATH} />
        <path className="fas-dc-ink-flow" d={INK_PATH} />
        <circle className="fas-dc-ink-start" cx="40" cy="48" r="3.5" />
        <circle className="fas-dc-ink-focus" cx="520" cy="188" r="5" />
      </svg>

      {explainOpen && topic ? (
        <div className="fas-dc-explain" role="dialog" aria-label={topic.explainTitle}>
          <p className="fas-dc-explain-title">{topic.explainTitle}</p>
          <ol className="fas-dc-explain-steps">
            {topic.explainSteps.map((s, i) => (
              <li key={s.n}>
                <span className="fas-dc-explain-n">{s.n}</span>
                <span className="fas-dc-explain-label">{s.label}</span>
                {i < topic.explainSteps.length - 1 ? (
                  <span className="fas-dc-explain-arrow" aria-hidden>
                    ↓
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="fas-dc-explain-close"
            onClick={() => setExplainOpen(false)}
          >
            Schließen
          </button>
        </div>
      ) : null}

      <div className="fas-dc-stage">
        <div className="fas-dc-center">
          {isCalm ? (
            <div className="fas-dc-calm">
              <p className="fas-dc-greet">{lead}</p>
              <p className="fas-dc-status">{calmLine}</p>
              {waitingLabel ? (
                <button type="button" className="fas-dc-waiting" onClick={activate}>
                  <span className="fas-dc-waiting-dot" aria-hidden />
                  {waitingLabel}
                  <span className="fas-dc-waiting-chev" aria-hidden>
                    ›
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}

          {showFocus && topic ? (
            <div className="fas-dc-focus" key={topic.id}>
              <p className="fas-dc-eyebrow">{topic.eyebrow}</p>
              <h1 className="fas-dc-question">{topic.question}</h1>
              <div className="fas-dc-options" role="radiogroup" aria-label="Optionen">
                {topic.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`fas-dc-option${selected === opt.id ? ' is-on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="fas-dc-opt"
                      value={opt.id}
                      checked={selected === opt.id}
                      onChange={() => {
                        setSelected(opt.id)
                        setSheetOpen(true)
                        setPhase('sheet')
                      }}
                    />
                    <span className="fas-dc-radio" aria-hidden />
                    <span className="fas-dc-option-body">
                      <span className="fas-dc-option-label">{opt.label}</span>
                      {opt.hint ? (
                        <span className="fas-dc-option-hint">{opt.hint}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {showSheet && topic ? (
          <aside className="fas-dc-sheet" aria-label="Tagro Empfehlung">
            <div className="fas-dc-sheet-handle" aria-hidden />
            <p className="fas-dc-sheet-kicker">Tagro Empfehlung</p>
            <p className="fas-dc-sheet-pick">{topic.recommendLabel}</p>

            <p className="fas-dc-sheet-section">Begründung</p>
            <ul className="fas-dc-sheet-reasons">
              {topic.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>

            <div className="fas-dc-sheet-actions">
              <button
                type="button"
                className="fas-dc-sheet-btn is-accept"
                onClick={acceptRecommendation}
              >
                Empfehlung übernehmen
              </button>
              <button
                type="button"
                className="fas-dc-sheet-btn"
                onClick={reviewAlternatives}
              >
                Alternativen prüfen
              </button>
              <button
                type="button"
                className="fas-dc-sheet-btn"
                onClick={() => setExplainOpen((v) => !v)}
              >
                Entscheidung erklären
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      {/* Mobile backdrop for bottom sheet */}
      {showSheet ? (
        <button
          type="button"
          className="fas-dc-sheet-scrim"
          aria-label="Schließen"
          onClick={() => {
            setSheetOpen(false)
            setExplainOpen(false)
            if (phase === 'sheet') setPhase('focus')
          }}
        />
      ) : null}

      <div className="fas-dc-dock">
        <div className={`fas-dc-wave${listening ? ' is-on' : ''}`} aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <button
          type="button"
          className={`fas-dc-mic${listening ? ' is-on' : ''}`}
          aria-pressed={listening}
          aria-label={listening ? 'Zuhören beenden' : 'Tagro zuhören'}
          onClick={() => setListening((v) => !v)}
        >
          <Microphone size={16} weight="fill" />
        </button>
        <p className="fas-dc-dock-label">
          {listening
            ? 'Tagro hört zu'
            : showPath
              ? 'Tagro analysiert den Kontext…'
              : 'Tagro'}
        </p>
      </div>
    </div>
  )
}
