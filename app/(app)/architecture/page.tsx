'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { ARCHITECTURE_PAGE_CSS } from '@/components/architecture/architecture-page-styles'
import {
  ARCHITECTURE_CURRENT_VERSION,
  ARCHITECTURE_DEBT,
  ARCHITECTURE_DOMAINS,
  ARCHITECTURE_HISTORY,
  ARCHITECTURE_MEMORY,
  ARCHITECTURE_REQUESTS,
  ARCHITECTURE_ROADMAP,
  ARCHITECTURE_SECTIONS,
  PRODUCTION_INTELLIGENCE_METRICS,
  computeArchitectureStatus,
  type ArchitectureSectionId,
} from '@/lib/architecture'

const HORIZON_LABEL = { now: 'Jetzt', next: 'Als Nächstes', later: 'Später' } as const
const REQUEST_LABEL = {
  idea: 'Idee',
  prioritized: 'Priorisiert',
  building: 'In Arbeit',
  shipped: 'Geliefert',
} as const
const HEALTH_LABEL = {
  healthy: 'Healthy',
  attention: 'Attention',
  gap: 'Gap',
} as const

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function ArchitecturePage() {
  const [navOpen, setNavOpen] = useState(false)
  const [active, setActive] = useState<ArchitectureSectionId>('status')
  const sectionRefs = useRef<Partial<Record<ArchitectureSectionId, HTMLElement | null>>>({})

  const status = useMemo(() => computeArchitectureStatus(), [])

  useEffect(() => {
    const nodes = ARCHITECTURE_SECTIONS
      .map(s => sectionRefs.current[s.id])
      .filter((n): n is HTMLElement => !!n)
    if (!nodes.length) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const id = visible[0]?.target.getAttribute('data-section') as ArchitectureSectionId | null
        if (id) setActive(id)
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.15, 0.4] },
    )
    nodes.forEach(n => observer.observe(n))
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: ArchitectureSectionId) => {
    setActive(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const setSectionRef = (id: ArchitectureSectionId) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el
  }

  return (
    <div className="dec-os arch-page">
      <style>{DECISION_CSS}</style>
      <style>{ARCHITECTURE_PAGE_CSS}</style>
      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="arch">
        <header className="arch-head">
          <h1 className="arch-title">Architecture</h1>
          <div className="arch-head-actions">
            <button
              type="button"
              className="arch-status-chip"
              onClick={() => scrollTo('status')}
              aria-controls="arch-os-status"
            >
              <span className="arch-status-score">{status.score}%</span>
              <span className="arch-status-label">{status.label}</span>
            </button>
            <div className="arch-mobile-pill">
              <CodexMobileActionPill
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                onMenu={() => setNavOpen(true)}
              />
            </div>
          </div>
        </header>

        <div className="arch-layout">
          <nav className="arch-nav" aria-label="Architecture Abschnitte">
            {ARCHITECTURE_SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                className="arch-nav-btn"
                data-active={active === s.id}
                onClick={() => scrollTo(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="arch-main">
            <section
              id="arch-status"
              data-section="status"
              ref={setSectionRef('status')}
              aria-labelledby="arch-status-title"
            >
              <h2 id="arch-status-title" className="arch-section-title">Architecture Status</h2>
              <p className="arch-section-summary">
                Festag Operating System · Version {ARCHITECTURE_CURRENT_VERSION}. Domänen, die vor jedem Feature geprüft werden.
              </p>

              <div id="arch-os-status" className="arch-os-panel" style={{ marginBottom: 16 }}>
                <h3 className="arch-os-title">Festag Operating System</h3>
                <ul className="arch-os-list">
                  {ARCHITECTURE_DOMAINS.map(d => (
                    <li key={d.id}>
                      <span className="arch-os-check" data-ok={d.health === 'healthy'} aria-hidden>
                        {d.health === 'healthy' ? <Check size={11} weight="bold" /> : null}
                      </span>
                      {d.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="arch-domains">
                {ARCHITECTURE_DOMAINS.map(d => (
                  <article key={d.id} className="arch-domain">
                    <div className="arch-domain-top">
                      <span className="arch-domain-label">{d.label}</span>
                      <span className="arch-domain-health" data-health={d.health}>
                        {HEALTH_LABEL[d.health]}
                      </span>
                    </div>
                    <p className="arch-domain-note">{d.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <section
              id="arch-vision"
              data-section="vision"
              ref={setSectionRef('vision')}
              aria-labelledby="arch-vision-title"
            >
              <h2 id="arch-vision-title" className="arch-section-title">Vision</h2>
              <p className="arch-section-summary">
                Festag ist das Betriebssystem für Projekte — Operational Intelligence, kein Chatbot und kein klassisches PM-Tool.
                Jede Interaktion soll das System smarter machen.
              </p>
              <ul className="arch-anchors">
                {(ARCHITECTURE_SECTIONS.find(s => s.id === 'vision')?.anchors ?? []).map(a => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section
              id="arch-constitution"
              data-section="constitution"
              ref={setSectionRef('constitution')}
              aria-labelledby="arch-constitution-title"
            >
              <h2 id="arch-constitution-title" className="arch-section-title">Product Constitution</h2>
              <p className="arch-section-summary">
                Die Master Laws der Plattform. Neue Features müssen dagegen bestehen — sonst Redesign vor Code.
              </p>
              <ul className="arch-anchors">
                {(ARCHITECTURE_SECTIONS.find(s => s.id === 'constitution')?.anchors ?? []).map(a => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section
              id="arch-design"
              data-section="design"
              ref={setSectionRef('design')}
              aria-labelledby="arch-design-title"
            >
              <h2 id="arch-design-title" className="arch-section-title">Design System</h2>
              <p className="arch-section-summary">
                Eine Sprache: Tokens, Spacing, Radius, Motion, Shadows. Keine One-Off-Chromen.
              </p>
              <ul className="arch-anchors">
                {(ARCHITECTURE_SECTIONS.find(s => s.id === 'design')?.anchors ?? []).map(a => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section
              id="arch-database"
              data-section="database"
              ref={setSectionRef('database')}
              aria-labelledby="arch-database-title"
            >
              <h2 id="arch-database-title" className="arch-section-title">Database</h2>
              <p className="arch-section-summary">
                Wissen hängt am Projekt und Workspace. Living Schema Map folgt — Baseline bleibt hosted Supabase.
              </p>
              <ul className="arch-anchors">
                {(ARCHITECTURE_SECTIONS.find(s => s.id === 'database')?.anchors ?? []).map(a => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section
              id="arch-apis"
              data-section="apis"
              ref={setSectionRef('apis')}
              aria-labelledby="arch-apis-title"
            >
              <h2 id="arch-apis-title" className="arch-section-title">APIs</h2>
              <p className="arch-section-summary">
                OpenAI, Claude, GitHub, Stripe, Google, Apple — Verbindungen als Workspace-Building, nicht als API-Admin.
              </p>
              <ul className="arch-anchors">
                {(ARCHITECTURE_SECTIONS.find(s => s.id === 'apis')?.anchors ?? []).map(a => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section
              id="arch-ai"
              data-section="ai"
              ref={setSectionRef('ai')}
              aria-labelledby="arch-ai-title"
            >
              <h2 id="arch-ai-title" className="arch-section-title">AI Rules</h2>
              <p className="arch-section-summary">
                Tagro mediieriert. Client sieht Outcomes. Developer sieht ausführbare Arbeit. Architect AI hütert die Plattform.
              </p>
              <ul className="arch-anchors">
                {(ARCHITECTURE_SECTIONS.find(s => s.id === 'ai')?.anchors ?? []).map(a => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section
              id="arch-workspace"
              data-section="workspace"
              ref={setSectionRef('workspace')}
              aria-labelledby="arch-workspace-title"
            >
              <h2 id="arch-workspace-title" className="arch-section-title">Workspace Rules</h2>
              <p className="arch-section-summary">
                Agency, Startup, Enterprise, Solo — Workspace Type liegt auf dem Workspace, nie auf dem Account.
              </p>
              <ul className="arch-anchors">
                {(ARCHITECTURE_SECTIONS.find(s => s.id === 'workspace')?.anchors ?? []).map(a => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section
              id="arch-business"
              data-section="business"
              ref={setSectionRef('business')}
              aria-labelledby="arch-business-title"
            >
              <h2 id="arch-business-title" className="arch-section-title">Business Rules</h2>
              <p className="arch-section-summary">
                Pricing, Limits, Plans, Seats, AI- und Developer-Budget — bald als eine Business-SSOT.
              </p>
              <ul className="arch-anchors">
                {(ARCHITECTURE_SECTIONS.find(s => s.id === 'business')?.anchors ?? []).map(a => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>

            <section
              id="arch-roadmap"
              data-section="roadmap"
              ref={setSectionRef('roadmap')}
              aria-labelledby="arch-roadmap-title"
            >
              <h2 id="arch-roadmap-title" className="arch-section-title">Roadmap</h2>
              <p className="arch-section-summary">
                Was das Betriebssystem als Nächstes stärker macht.
              </p>
              <div className="arch-cards">
                {ARCHITECTURE_ROADMAP.map(item => (
                  <article key={item.id} className="arch-card">
                    <h3 className="arch-card-title">{item.title}</h3>
                    <p className="arch-card-meta">{HORIZON_LABEL[item.horizon]}</p>
                    <p className="arch-card-body">{item.summary}</p>
                  </article>
                ))}
              </div>
            </section>

            <section
              id="arch-requests"
              data-section="requests"
              ref={setSectionRef('requests')}
              aria-labelledby="arch-requests-title"
            >
              <h2 id="arch-requests-title" className="arch-section-title">Feature Requests</h2>
              <p className="arch-section-summary">
                Ideen, die noch nicht gebaut sind — priorisiert, mit Status.
              </p>
              <div className="arch-cards">
                {ARCHITECTURE_REQUESTS.map(item => (
                  <article key={item.id} className="arch-card">
                    <h3 className="arch-card-title">{item.title}</h3>
                    <p className="arch-card-meta">
                      {REQUEST_LABEL[item.status]}, P{item.priority}
                    </p>
                    <p className="arch-card-body">{item.summary}</p>
                  </article>
                ))}
              </div>
            </section>

            <section
              id="arch-debt"
              data-section="debt"
              ref={setSectionRef('debt')}
              aria-labelledby="arch-debt-title"
            >
              <h2 id="arch-debt-title" className="arch-section-title">Technical Debt</h2>
              <p className="arch-section-summary">
                Ruhige Signale — kein Blame, sondern Klarheit für den nächsten Schnitt.
              </p>
              <div className="arch-cards">
                {ARCHITECTURE_DEBT.map(item => (
                  <article key={item.id} className="arch-card">
                    <h3 className="arch-card-title">{item.title}</h3>
                    <p className="arch-card-meta">{item.area}</p>
                    <p className="arch-card-body">{item.summary}</p>
                  </article>
                ))}
              </div>
            </section>

            <section
              id="arch-production"
              data-section="production"
              ref={setSectionRef('production')}
              aria-labelledby="arch-production-title"
            >
              <h2 id="arch-production-title" className="arch-section-title">Production Intelligence</h2>
              <p className="arch-section-summary">
                Tagro Superintelligence pillar for digital production — architecture reserved.
                Observes and connects production systems; Tagro recommends; humans decide. No live metering yet.
              </p>
              <div className="arch-prod">
                {PRODUCTION_INTELLIGENCE_METRICS.map(m => (
                  <article key={m.id} className="arch-prod-metric">
                    <p className="arch-prod-label">{m.label}</p>
                    <p className="arch-prod-value">{m.value}</p>
                    <p className="arch-prod-hint">{m.hint}</p>
                  </article>
                ))}
              </div>
            </section>

            <section
              id="arch-memory"
              data-section="memory"
              ref={setSectionRef('memory')}
              aria-labelledby="arch-memory-title"
            >
              <h2 id="arch-memory-title" className="arch-section-title">Architecture Memory</h2>
              <p className="arch-section-summary">
                Die wichtigsten Entscheidungen — mit Begründung. Das macht zukünftige Änderungen einfacher.
              </p>
              <div className="arch-memory">
                {ARCHITECTURE_MEMORY.map(entry => (
                  <article key={entry.id} className="arch-memory-item">
                    <h3 className="arch-memory-q">{entry.question}</h3>
                    <p className="arch-memory-a">{entry.answer}</p>
                    <div className="arch-memory-meta">
                      <span>
                        Entscheidung: <strong>{entry.decision}</strong>
                      </span>
                      <span>{formatDate(entry.date)}</span>
                      <span>Version {entry.version}</span>
                      <span>{entry.status}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section
              id="arch-history"
              data-section="history"
              ref={setSectionRef('history')}
              aria-labelledby="arch-history-title"
            >
              <h2 id="arch-history-title" className="arch-section-title">Architecture History</h2>
              <p className="arch-section-summary">
                Versionslog der OS-Entscheidungen — warum etwas gebaut wurde, nicht nur was.
              </p>
              <div className="arch-history">
                {ARCHITECTURE_HISTORY.map(h => (
                  <article key={h.version} className="arch-history-item">
                    <p className="arch-history-ver">Version {h.version}</p>
                    <h3 className="arch-history-title">{h.title}</h3>
                    <p className="arch-history-summary">{h.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <MobilePageDock
        primary={{
          id: 'memory',
          label: 'Memory',
          onClick: () => scrollTo('memory'),
          ariaLabel: 'Architecture Memory',
        }}
        secondary={{
          id: 'status',
          label: 'Status',
          onClick: () => scrollTo('status'),
          ariaLabel: 'Architecture Status',
        }}
        onDragUp={() => scrollTo('memory')}
      />
    </div>
  )
}
