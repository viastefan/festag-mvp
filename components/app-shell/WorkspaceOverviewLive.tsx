'use client'

/**
 * Decision Canvas — Overview identity (v4).
 *
 * Law: The center shows exactly what is being talked about. Never more.
 * Never more than one main ink line at a time.
 * Flow: Thought → Connection → Explanation → Action → Done.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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

/** calm = empty thought · focus = center question · recommend = line + card */
type Phase = 'calm' | 'focus' | 'line' | 'recommend' | 'done'

type Option = { id: string; label: string }

type FocusTopic = {
  kind: 'decision' | 'project'
  id: string
  question: string
  options: Option[]
  recommendId: string
  recommendLabel: string
  reasons: string[]
  whyCompare: { title: string; points: string[] }
  href?: string
}

function buildTopic(data: OverviewPayload): FocusTopic | null {
  if (data.summary.activeProjects === 0) {
    return {
      kind: 'project',
      id: 'first-project',
      question: 'Bereit für dein erstes Projekt?',
      options: [
        { id: 'start', label: 'Jetzt starten' },
        { id: 'later', label: 'Später' },
      ],
      recommendId: 'start',
      recommendLabel: 'Jetzt starten',
      reasons: [
        'Tagro strukturiert Name, Aufgaben und nächste Schritte.',
        'Du bleibst in einem Workspace — keine zweite App.',
        'Einladung und Freigaben kommen danach von selbst.',
      ],
      whyCompare: {
        title: 'Warum jetzt',
        points: [
          'Ohne Projekt bleibt der Workspace leer.',
          'Tagro braucht einen ersten Kontext, um zu lernen.',
          'Dauert nur einen Moment.',
        ],
      },
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
      question: 'Welches Design soll verwendet werden?',
      options: [
        { id: 'minimal', label: 'Modern Minimal' },
        { id: 'corporate', label: 'Elegant Corporate' },
      ],
      recommendId: 'minimal',
      recommendLabel: 'Modern Minimal',
      reasons: [
        'Konsistenter Markenauftritt',
        'Schnellere Umsetzung',
        'Höhere Conversion',
      ],
      whyCompare: {
        title: 'Vergleich',
        points: [
          'Modern Minimal: +35 % schnellere Entwicklung',
          '2 Komponenten weniger',
          'Passt zur Marke',
        ],
      },
      href: `/decisions/${d.id}`,
    }
  }

  if (isHome) {
    return {
      kind: 'decision',
      id: d.id,
      question: 'Neue Homepage veröffentlichen?',
      options: [
        { id: 'approve', label: 'Freigeben' },
        { id: 'changes', label: 'Änderungen anfordern' },
      ],
      recommendId: 'approve',
      recommendLabel: 'Freigeben',
      reasons: [
        'Qualität und Performance sind geprüft',
        'Keine kritischen Issues',
        'Bereit für Deployment',
      ],
      whyCompare: {
        title: 'Status',
        points: [
          'Qualitätsprüfung abgeschlossen',
          'Performance validiert',
          'SEO & Inhalte geprüft',
        ],
      },
      href: `/decisions/${d.id}`,
    }
  }

  return {
    kind: 'decision',
    id: d.id,
    question: d.title.endsWith('?') ? d.title : `${d.title}?`,
    options: [
      { id: 'approve', label: 'Übernehmen' },
      { id: 'changes', label: 'Selbst entscheiden' },
    ],
    recommendId: 'approve',
    recommendLabel: 'Übernehmen',
    reasons: [
      'Passt zum aktuellen Projektstand',
      'Keine Blocker erkannt',
      'Nächster Schritt ist klar',
    ],
    whyCompare: {
      title: 'Kontext',
      points: [
        d.projectTitle ? `Projekt: ${d.projectTitle}` : 'Workspace-Entscheidung',
        'Tagro hat den Verlauf geprüft',
        'Du bestätigst — Festag führt aus',
      ],
    },
    href: `/decisions/${d.id}`,
  }
}

export default function WorkspaceOverviewLive({ greeting, firstName, data }: Props) {
  const topic = useMemo(() => buildTopic(data), [data])
  const [phase, setPhase] = useState<Phase>('calm')
  const [selected, setSelected] = useState<string | null>(null)
  const [whyOpen, setWhyOpen] = useState(false)
  const [listening, setListening] = useState(false)

  /* Reset when the underlying topic changes */
  useEffect(() => {
    setPhase('calm')
    setSelected(null)
    setWhyOpen(false)
  }, [topic?.id])

  const lead = `${greeting}, ${firstName}.`

  const calmBody = useMemo(() => {
    if (!topic) {
      if (data.summary.calmLine) return [data.summary.calmLine]
      return [`Alles in ${data.workspace.name} läuft ruhig.`]
    }
    if (topic.kind === 'project') {
      return [
        `In ${data.workspace.name} läuft noch alles ruhig.`,
        'Das erste Projekt wartet.',
      ]
    }
    return [
      'Alles läuft ruhig.',
      data.summary.pendingDecisions === 1
        ? 'Eine Entscheidung wartet.'
        : `${data.summary.pendingDecisions} Entscheidungen warten.`,
    ]
  }, [topic, data])

  function openFocus() {
    if (!topic || phase !== 'calm') return
    setPhase('focus')
    setSelected(topic.recommendId)
    /* Thought → connection → card */
    window.setTimeout(() => setPhase('line'), 280)
    window.setTimeout(() => setPhase('recommend'), 720)
  }

  function closeFocus() {
    setWhyOpen(false)
    setPhase('done')
    window.setTimeout(() => {
      setPhase('calm')
      setSelected(null)
    }, 420)
  }

  function takeRecommendation() {
    if (!topic) return
    setSelected(topic.recommendId)
    if (topic.kind === 'project') {
      openNewProject()
      closeFocus()
      return
    }
    if (topic.href) {
      window.location.assign(topic.href)
      return
    }
    closeFocus()
  }

  function decideYourself() {
    setWhyOpen(false)
    /* Human stays with the question — no second card push */
    setPhase('focus')
  }

  const showFocus = phase === 'focus' || phase === 'line' || phase === 'recommend'
  const showLine = phase === 'line' || phase === 'recommend'
  const showCard = phase === 'recommend'
  const isCalm = phase === 'calm' || phase === 'done'

  return (
    <div
      className={`fas-dc${listening ? ' is-listening' : ''}${showCard ? ' has-card' : ''}`}
      data-phase={phase}
    >
      <div className="fas-dc-invites">
        <OverviewPendingInvites />
      </div>

      {/* One main ink line — never more than one */}
      {showLine ? (
        <div className="fas-dc-thread" aria-hidden>
          <span className="fas-dc-thread-origin" />
          <span className="fas-dc-thread-line" />
          {whyOpen ? (
            <span className="fas-dc-thread-node">
              <span className="fas-dc-why-pop">
                <p className="fas-dc-why-title">{topic?.whyCompare.title}</p>
                <ul className="fas-dc-why-list">
                  {topic?.whyCompare.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </span>
            </span>
          ) : (
            <button
              type="button"
              className="fas-dc-thread-hotspot"
              aria-label="Warum"
              onClick={() => setWhyOpen(true)}
            />
          )}
          <span className="fas-dc-thread-end" />
        </div>
      ) : null}

      <div className="fas-dc-stage">
        <div className="fas-dc-center">
          {isCalm ? (
            <button
              type="button"
              className="fas-dc-calm"
              onClick={openFocus}
              disabled={!topic}
              aria-label={topic ? 'Entscheidung öffnen' : undefined}
            >
              <p className="fas-dc-title">{lead}</p>
              {calmBody.map((line) => (
                <p key={line} className="fas-dc-support">
                  {line}
                </p>
              ))}
              {topic ? (
                <span className="fas-dc-hint">Tippen, um fortzufahren</span>
              ) : null}
            </button>
          ) : null}

          {showFocus && topic ? (
            <div className="fas-dc-focus" key={topic.id}>
              <h1 className="fas-dc-title">{topic.question}</h1>
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
                      onChange={() => setSelected(opt.id)}
                    />
                    <span className="fas-dc-radio" aria-hidden />
                    <span className="fas-dc-option-label">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {showCard && topic ? (
          <aside className="fas-dc-card" aria-label="Tagro Empfehlung">
            <p className="fas-dc-card-kicker">Tagro empfiehlt</p>
            <p className="fas-dc-card-pick">{topic.recommendLabel}</p>

            <button
              type="button"
              className="fas-dc-card-why"
              onClick={() => setWhyOpen((v) => !v)}
              aria-expanded={whyOpen}
            >
              Warum?
            </button>

            <ul className="fas-dc-card-reasons">
              {topic.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>

            <div className="fas-dc-card-rule" aria-hidden />

            <div className="fas-dc-card-actions">
              <button
                type="button"
                className="fas-dc-card-btn is-primary"
                onClick={takeRecommendation}
              >
                Empfehlung übernehmen
              </button>
              {topic.kind === 'decision' && topic.href ? (
                <Link
                  href={topic.href}
                  className="fas-dc-card-btn"
                  onClick={() => setWhyOpen(false)}
                >
                  Selbst entscheiden
                </Link>
              ) : (
                <button
                  type="button"
                  className="fas-dc-card-btn"
                  onClick={() => {
                    if (topic.kind === 'project' && selected === 'later') {
                      closeFocus()
                      return
                    }
                    decideYourself()
                  }}
                >
                  Selbst entscheiden
                </button>
              )}
            </div>
          </aside>
        ) : null}
      </div>

      <div className="fas-dc-dock">
        <button
          type="button"
          className={`fas-dc-mic${listening ? ' is-on' : ''}`}
          aria-pressed={listening}
          aria-label={listening ? 'Zuhören beenden' : 'Tagro zuhören'}
          onClick={() => setListening((v) => !v)}
        >
          <Microphone size={18} weight="fill" />
        </button>
        <span className="fas-dc-dock-label">{listening ? 'Tagro hört zu' : 'Tagro'}</span>
      </div>
    </div>
  )
}
