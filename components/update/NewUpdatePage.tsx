'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUp, CaretDown, Lightning } from '@phosphor-icons/react'
import EditSquareIcon from '@/components/icons/EditSquareIcon'
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

const SUGGESTIONS = [
  'Wie ist der aktuelle Status?',
  'Füge Login mit Google hinzu.',
  'Erstelle einen Statusbericht.',
  'Wann wird das Projekt fertig?',
  'Wir benötigen eine neue Landingpage.',
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
    const fade = window.setTimeout(() => setHintVisible(false), 3200)
    const next = window.setTimeout(() => {
      setHintIndex(i => (i + 1) % ANIMATED_HINTS.length)
      setHintVisible(true)
    }, 3600)
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

  return (
    <div className="dec-os nu-os">
      <style>{NEW_UPDATE_CSS}</style>
      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <MobilePageHeader title="Neues Update" />

      <div className="nu-scroll">
        <div className="nu-inner">
          <header className="nu-page-head">
            <div className="nu-page-head-copy">
              <h1 className="nu-page-title">Neues Update</h1>
              <p className="nu-page-lead">
                Schreib, was du brauchst — Festag erkennt, ob es eine Frage, Aufgabe, Entscheidung oder Statusbericht ist.
              </p>
            </div>
            <div className="nu-mobile-pill">
              <CodexMobileActionPill
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                onMenu={() => setNavOpen(true)}
              />
            </div>
          </header>

          <div className="nu-stage">
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
                {!query.trim() && (
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
                className="nu-composer-submit"
                aria-label="Senden"
                disabled={!query.trim()}
              >
                <ArrowUp size={18} weight="bold" />
              </button>
            </form>

            {intent && (
              <p className="nu-intent">
                Festag wird: <strong>{UPDATE_INTENT_LABELS[intent]}</strong>
              </p>
            )}

            <div className="nu-suggestions" role="list">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  className="nu-suggestion"
                  role="listitem"
                  onClick={() => {
                    setQuery(s)
                    submit(s)
                  }}
                >
                  <span className="nu-suggestion-dot" aria-hidden>
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </button>
              ))}
            </div>

            <section className="nu-recent" aria-label="Zuletzt">
              <div className="nu-recent-head">
                <h2 className="nu-recent-label">Zuletzt</h2>
                <button type="button" className="nu-recent-filter" aria-haspopup="listbox">
                  Zuletzt
                  <CaretDown size={10} weight="bold" aria-hidden />
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
      </div>

      <MobilePageDock
        primary={{
          id: 'compose',
          label: 'Update schreiben',
          onClick: () => {
            const el = document.querySelector<HTMLInputElement>('.nu-composer input')
            el?.focus()
          },
          ariaLabel: 'Update schreiben',
        }}
        secondary={{
          id: 'status',
          label: 'Status',
          icon: <EditSquareIcon size={18} weight="regular" />,
          onClick: () => submit(query || SUGGESTIONS[0]),
          ariaLabel: 'Senden',
        }}
        onDragUp={() => submit(query || SUGGESTIONS[0])}
      />
    </div>
  )
}
