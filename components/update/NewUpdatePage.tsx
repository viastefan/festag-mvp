'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowUp,
  CalendarBlank,
  CaretDown,
  ChartLineUp,
  Cpu,
  FileText,
  Lightning,
  Plus,
  Sparkle,
  SquaresFour,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import SuggestionIcon from '@/components/brand/SuggestionIcon'
import { detectBrandFromText, type BrandId } from '@/lib/brand/detect-brand'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import MobilePageHeader from '@/components/MobilePageHeader'
import { openTagro } from '@/components/TagroOverlay'
import { NEW_UPDATE_CSS } from '@/components/update/new-update-styles'
import {
  classifyUpdateIntent,
  UPDATE_INTENT_LABELS,
  type UpdateIntent,
} from '@/lib/update-intent'

const ANIMATED_HINTS = [
  'Welche Blocker gibt es heute?',
  'Was steht heute an Entscheidungen an?',
  'Was hat sich seit gestern verändert?',
  'Welche Projekte brauchen Aufmerksamkeit?',
]

type Suggestion = {
  id: string
  text: string
  query: string
  Icon: Icon
  brand?: BrandId
  rich: ReactNode
}

const SUGGESTIONS: Suggestion[] = [
  {
    id: 'status',
    text: 'Wie ist der aktuelle Status?',
    query: 'Wie ist der aktuelle Status?',
    Icon: ChartLineUp,
    rich: <>Wie ist der <strong>aktuelle Status</strong>?</>,
  },
  {
    id: 'google',
    text: 'Füge Login mit Google hinzu.',
    query: 'Füge Login mit Google hinzu.',
    Icon: Plus,
    brand: 'google',
    rich: <>Füge <strong>Login mit Google</strong> hinzu.</>,
  },
  {
    id: 'report',
    text: 'Erstelle einen Statusbericht.',
    query: 'Erstelle einen Statusbericht.',
    Icon: FileText,
    rich: <>Erstelle einen <strong>Statusbericht</strong>.</>,
  },
  {
    id: 'deadline',
    text: 'Wann wird das Projekt fertig?',
    query: 'Wann wird das Projekt fertig?',
    Icon: CalendarBlank,
    rich: <>Wann wird das <strong>Projekt fertig</strong>?</>,
  },
  {
    id: 'landing',
    text: 'Wir benötigen eine neue Landingpage.',
    query: 'Wir benötigen eine neue Landingpage.',
    Icon: SquaresFour,
    rich: <>Wir benötigen eine <strong>neue Landingpage</strong>.</>,
  },
]

const RECENT_MOCK = [
  { id: '1', label: 'Status Premium Relaunch', age: '2 Std.' },
  { id: '2', label: 'Blocker Payment-Integration', age: '1 T' },
  { id: '3', label: 'Entscheidung Logo-Farben', age: '3 T' },
]

function tagroContextForIntent(intent: UpdateIntent) {
  switch (intent) {
    case 'status_report':
      return { contextType: 'status_report' as const, title: 'Statusbericht' }
    case 'decision':
      return { contextType: 'decision' as const, title: 'Entscheidung' }
    case 'task':
    case 'ticket':
      return { contextType: 'task' as const, title: 'Neues Update' }
    default:
      return { contextType: 'empty' as const, title: 'Neues Update' }
  }
}

export default function NewUpdatePage() {
  const [navOpen, setNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hintIndex, setHintIndex] = useState(0)
  const [hintVisible, setHintVisible] = useState(true)

  const intent = useMemo(
    () => (query.trim().length > 2 ? classifyUpdateIntent(query) : null),
    [query],
  )

  useEffect(() => {
    if (query.trim()) return
    const fade = window.setTimeout(() => setHintVisible(false), 2800)
    const next = window.setTimeout(() => {
      setHintIndex(i => (i + 1) % ANIMATED_HINTS.length)
      setHintVisible(true)
    }, 3100)
    return () => {
      window.clearTimeout(fade)
      window.clearTimeout(next)
    }
  }, [hintIndex, query])

  const submit = useCallback((text: string) => {
    const q = text.trim()
    if (!q) return
    const resolvedIntent = classifyUpdateIntent(q)
    const ctx = tagroContextForIntent(resolvedIntent)
    openTagro({
      ...ctx,
      prefill: q,
      workspace: true,
    })
    setQuery('')
  }, [])

  const hasQuery = query.trim().length > 0

  return (
    <div className="nu-os">
      <style>{NEW_UPDATE_CSS}</style>
      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
      <MobilePageHeader title="Neues Update" />

      <div className="nu-scroll">
        <div className="nu-inner">
          <div className="nu-topbar">
            <CodexMobileActionPill
              onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              onMenu={() => setNavOpen(true)}
            />
          </div>

          <div className="nu-hero">
            <form
              className="nu-composer"
              onSubmit={e => {
                e.preventDefault()
                submit(query)
              }}
            >
              <span className="nu-composer-icon" aria-hidden>
                <Lightning size={18} weight="regular" />
              </span>
              <div className="nu-composer-field">
                {!hasQuery && (
                  <span
                    className={`nu-composer-ghost${hintVisible ? '' : ' is-faded'}`}
                    aria-hidden
                  >
                    {ANIMATED_HINTS[hintIndex]}
                  </span>
                )}
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  aria-label="Neues Update schreiben"
                />
              </div>
              <button
                type="submit"
                className={`nu-composer-submit${hasQuery ? ' is-ready' : ''}`}
                aria-label="Senden"
                disabled={!hasQuery}
              >
                <ArrowUp size={17} weight="bold" />
              </button>
            </form>

            <div className="nu-toolbar">
              <div className="nu-toolbar-left">
                <button type="button" className="nu-toolbar-btn" onClick={() => submit(query || SUGGESTIONS[0].query)}>
                  <Sparkle size={15} weight="regular" />
                  Erstellen
                </button>
                <button type="button" className="nu-toolbar-btn" onClick={() => submit('Welche Quellen sind für dieses Update relevant?')}>
                  <Plus size={15} weight="regular" />
                  Quellen
                </button>
              </div>
              {intent ? (
                <span className="nu-intent-chip">
                  Festag: <strong>{UPDATE_INTENT_LABELS[intent]}</strong>
                </span>
              ) : (
                <span className="nu-intent-chip">
                  <Cpu size={13} weight="regular" />
                  Standard
                </span>
              )}
            </div>

            <div className="nu-suggestions" role="list">
              {SUGGESTIONS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className="nu-suggestion"
                  role="listitem"
                  onClick={() => submit(item.query)}
                >
                  <span className={`nu-suggestion-icon${item.brand || detectBrandFromText(item.text) ? ' has-brand' : ''}`} aria-hidden>
                    <SuggestionIcon text={item.text} brand={item.brand} Icon={item.Icon} size={18} />
                  </span>
                  <span>{item.rich}</span>
                </button>
              ))}
            </div>
          </div>

          <section className="nu-recent" aria-label="Zuletzt">
            <div className="nu-recent-head">
              <h2 className="nu-recent-label">Zuletzt</h2>
              <button type="button" className="nu-recent-filter" aria-haspopup="listbox">
                Zuletzt
                <CaretDown size={11} weight="bold" aria-hidden />
              </button>
            </div>
            {RECENT_MOCK.map(item => (
              <button
                key={item.id}
                type="button"
                className="nu-recent-item"
                onClick={() => submit(item.label)}
              >
                <span>{item.label}</span>
                <span className="nu-recent-age">{item.age}</span>
              </button>
            ))}
          </section>
        </div>
      </div>

      <MobilePageDock
        primary={{
          id: 'compose',
          label: 'Update schreiben',
          onClick: () => {
            document.querySelector<HTMLInputElement>('.nu-composer input')?.focus()
          },
          ariaLabel: 'Update schreiben',
        }}
        secondary={{
          id: 'send',
          label: 'Senden',
          icon: <ArrowUp size={18} weight="bold" />,
          onClick: () => submit(query || SUGGESTIONS[0].query),
          ariaLabel: 'Senden',
        }}
        onDragUp={() => submit(query || SUGGESTIONS[0].query)}
      />
    </div>
  )
}
