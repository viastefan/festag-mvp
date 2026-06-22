'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import { openTagro } from '@/components/TagroOverlay'
import { WORKSPACE_PAGE_CSS } from '@/components/workspace/workspace-page-styles'

const SUPPORT_LINKS = [
  { href: '/documents', label: 'Dokumente' },
  { href: '/teams', label: 'Team' },
  { href: '/deliverables', label: 'Lieferungen' },
  { href: '/activity', label: 'Aktivität' },
  { href: '/connectors', label: 'Anbindungen' },
  { href: '/objectives', label: 'Ziele' },
]

const DEMO_GOALS = [
  {
    id: 'g1',
    title: 'Launch Platform Q3',
    progress: 72,
    projects: 3,
    atRisk: 1,
  },
  {
    id: 'g2',
    title: 'Payment Integration live',
    progress: 45,
    projects: 2,
    atRisk: 0,
  },
]

export default function WorkspacePage() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="dec-os wsp-page">
      <style>{WORKSPACE_PAGE_CSS}</style>
      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="wsp">
        <header className="wsp-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div>
              <h1 className="wsp-title">Workspace</h1>
              <p className="wsp-lead">
                Ziele, Team und unterstützende Elemente — nicht primäre Navigation, sondern Kontext für deine Produktion.
              </p>
            </div>
            <div className="wsp-mobile-pill">
              <CodexMobileActionPill
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                onMenu={() => setNavOpen(true)}
              />
            </div>
          </div>
        </header>

        <div className="wsp-sections">
          <section aria-labelledby="wsp-goals">
            <h2 id="wsp-goals" className="wsp-section-title">Ziele</h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
              Ziele entstehen aus Projekten — keine separate Produktfläche.
            </p>
            <div className="wsp-goals">
              {DEMO_GOALS.map(g => (
                <article key={g.id} className="wsp-goal">
                  <h3 className="wsp-goal-title">{g.title}</h3>
                  <p className="wsp-goal-meta">{g.progress}% Fortschritt</p>
                  <div className="wsp-goal-progress" aria-hidden>
                    <span style={{ width: `${g.progress}%` }} />
                  </div>
                  <div className="wsp-goal-stats">
                    <span><strong>{g.projects}</strong> Projekte</span>
                    {g.atRisk > 0 && <span><strong>{g.atRisk}</strong> At Risk</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="wsp-support">
            <h2 id="wsp-support" className="wsp-section-title">Unterstützende Bereiche</h2>
            <div className="wsp-links">
              {SUPPORT_LINKS.map(l => (
                <Link key={l.href} href={l.href} className="wsp-link">
                  <span>{l.label}</span>
                  <ArrowRight size={16} weight="regular" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <MobilePageDock
        primary={{
          id: 'docs',
          label: 'Dokumente',
          onClick: () => { window.location.href = '/documents' },
          ariaLabel: 'Dokumente öffnen',
        }}
        secondary={{
          id: 'tagro',
          label: 'Tagro',
          onClick: () => openTagro({ contextType: 'briefing', id: 'workspace', title: 'Workspace' }),
          ariaLabel: 'Tagro öffnen',
        }}
        onDragUp={() => openTagro({ contextType: 'briefing', id: 'workspace', title: 'Workspace' })}
      />
    </div>
  )
}
