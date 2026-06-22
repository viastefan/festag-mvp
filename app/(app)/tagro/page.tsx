'use client'

import { useState } from 'react'
import { ArrowUp, Brain } from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import { openTagro } from '@/components/TagroOverlay'
import { TAGRO_WORKSPACE_CSS } from '@/components/tagro/tagro-workspace-styles'

const SECTIONS = [
  {
    id: 'risks',
    label: 'Risiken',
    title: '3 aktive Risiken in 2 Projekten',
    body: 'Payment-Integration und Timeline beim Premium Relaunch brauchen Klärung.',
    meta: 'Zuletzt aktualisiert vor 1 Stunde',
  },
  {
    id: 'recommendations',
    label: 'Empfehlungen',
    title: 'Stripe für Payment Provider',
    body: 'Tagro empfiehlt Stripe wegen schnellerer Integration und besserer DX.',
    meta: 'Basierend auf Projektanforderungen',
  },
  {
    id: 'briefings',
    label: 'Wöchentliche Briefings',
    title: 'Executive Summary KW 25',
    body: '4 Projekte on track, 1 braucht Aufmerksamkeit, 2 Entscheidungen offen.',
    meta: '2 Min. Audio verfügbar',
  },
  {
    id: 'insights',
    label: 'Strategische Insights',
    title: 'Launch Q3 weiterhin erreichbar',
    body: 'Mit priorisierter Entscheidung zu Payment Provider bleibt der Meilenstein realistisch.',
    meta: 'Confidence: 78%',
  },
]

export default function TagroWorkspacePage() {
  const [navOpen, setNavOpen] = useState(false)
  const [query, setQuery] = useState('')

  function askTagro() {
    const q = query.trim()
    openTagro({
      contextType: 'briefing',
      id: 'tagro-workspace',
      title: 'Tagro Workspace',
      ...(q ? { prefill: q } : {}),
    })
  }

  return (
    <div className="dec-os tgw-page">
      <style>{TAGRO_WORKSPACE_CSS}</style>
      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="tgw">
        <header className="tgw-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <p className="tgw-kicker">Intelligence Layer</p>
              <h1 className="tgw-title">Tagro</h1>
              <p className="tgw-lead">
                Dein Operating Advisor für Transparenz, Entscheidungen und Delivery — kein Chatbot, sondern strategischer Arbeitsraum.
              </p>
            </div>
            <div className="tgw-mobile-pill">
              <CodexMobileActionPill
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                onMenu={() => setNavOpen(true)}
              />
            </div>
          </div>
        </header>

        <form
          className="tgw-ask"
          onSubmit={e => { e.preventDefault(); askTagro() }}
        >
          <Brain size={20} weight="regular" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Was möchtest du wissen?"
            aria-label="Tagro fragen"
          />
          <button type="submit" className="tgw-ask-btn" aria-label="Senden">
            <ArrowUp size={18} weight="bold" />
          </button>
        </form>

        <div className="tgw-grid">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              type="button"
              className="tgw-card"
              onClick={() => openTagro({ contextType: 'briefing', id: s.id, title: s.label })}
            >
              <p className="tgw-card-label">{s.label}</p>
              <h2 className="tgw-card-title">{s.title}</h2>
              <p className="tgw-card-body">{s.body}</p>
              <span className="tgw-card-meta">{s.meta}</span>
            </button>
          ))}
        </div>
      </div>

      <MobilePageDock
        primary={{
          id: 'ask',
          label: 'Tagro fragen',
          onClick: askTagro,
          ariaLabel: 'Tagro fragen',
        }}
        secondary={{
          id: 'briefing',
          label: 'Briefing',
          onClick: () => openTagro({ contextType: 'briefing', id: 'weekly', title: 'Wöchentliches Briefing' }),
          ariaLabel: 'Briefing öffnen',
        }}
        onDragUp={askTagro}
      />
    </div>
  )
}
