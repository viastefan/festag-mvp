'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, CaretRight } from '@phosphor-icons/react'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import FestagState from '@/components/festag/FestagState'
import { NEWS_CSS } from '@/components/news/news-styles'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'
import { getTimeBasedGreeting } from '@/lib/hooks/useUser'
import { DEMO_NEWS_PAYLOAD, isNewsPreview } from '@/lib/demo/news-preview'
import {
  CATEGORY_LABEL,
  TONE_COLOR,
  storyStatus,
  type NewsCategory,
  type NewsPayload,
  type NewsStory,
} from '@/lib/news/types'

const LAST_READ_KEY = 'festag-news-last-read'

/** Ab so vielen Meldungen spart Filtern mehr Zeit, als es Platz kostet. */
const FILTER_THRESHOLD = 12

const FILTERS: { id: 'all' | NewsCategory; label: string }[] = [
  { id: 'all', label: 'Alles' },
  { id: 'decision', label: 'Entscheidungen' },
  { id: 'risk', label: 'Risiken' },
  { id: 'delivery', label: 'Lieferungen' },
  { id: 'report', label: 'Berichte' },
]

type Group = {
  key: string
  label: string
  stories: NewsStory[]
}

/**
 * Startseite — was seit deinem letzten Besuch wichtig war.
 *
 * Die Seite beantwortet zwei Fragen in dieser Reihenfolge: was wartet auf
 * mich, und was ist passiert. Deshalb steht oben eine Anrede statt einer
 * Überschrift, und darunter Gruppen von Zeilen — offene Punkte zuerst, dann
 * die Tage. Eine Zeile trägt ihren Zustand ganz links: was sie braucht, nicht
 * aus welcher Tabelle sie stammt. Keine Kacheln, keine Kennzahlen ohne
 * Handlung; jede Zeile führt an die Stelle, an der man sie schließt.
 */
export default function NewsPage() {
  const [payload, setPayload] = useState<NewsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | NewsCategory>('all')
  const [navOpen, setNavOpen] = useState(false)
  /* Read position is per device, so it belongs in the browser — not in a
     table that would claim the user "read" it on a machine they never used. */
  const [lastRead, setLastRead] = useState<number | null>(null)
  const markedRef = useRef(false)
  /* Someone without a workspace has no news and no way forward — News owns
     that funnel now that the Dashboard route is gone. */
  const { state: workspace } = useWorkspaceOverview()
  const needsWorkspace = workspace.status === 'empty'

  const load = useCallback(async (silent = false) => {
    /* Lokale Vorschau: dieselbe Flagge wie Overview, damit die Seite ohne
       Anmeldung angesehen werden kann — sie zeigt jeden Zustand einmal. */
    if (isNewsPreview()) {
      setPayload(DEMO_NEWS_PAYLOAD)
      setLoading(false)
      return
    }
    if (!silent) setError(null)
    setRefreshing(true)
    try {
      const response = await fetch('/api/news')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.error === 'unauthenticated'
          ? 'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.'
          : 'Die Neuigkeiten konnten nicht geladen werden.')
        return
      }
      setPayload(data as NewsPayload)
    } catch {
      setError('Keine Verbindung. Die Neuigkeiten konnten nicht geladen werden.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_READ_KEY)
      if (stored) setLastRead(Number(stored) || null)
    } catch { /* private mode — everything simply reads as new */ }
    void load()
  }, [load])

  /* Stamp the visit only after the stories are on screen, so a slow load
     never marks something read that nobody saw. */
  useEffect(() => {
    if (!payload || markedRef.current) return
    markedRef.current = true
    const stamp = window.setTimeout(() => {
      try { localStorage.setItem(LAST_READ_KEY, String(Date.now())) } catch { /* noop */ }
    }, 1200)
    return () => window.clearTimeout(stamp)
  }, [payload])

  const stories = useMemo(() => {
    const all = payload?.stories ?? []
    return filter === 'all' ? all : all.filter((story) => story.category === filter)
  }, [payload, filter])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const story of payload?.stories ?? []) {
      map.set(story.category, (map.get(story.category) ?? 0) + 1)
    }
    return map
  }, [payload])

  /**
   * Offene Punkte stehen zusammen ganz oben — sie sind die einzige Gruppe,
   * die nach Handlung sortiert ist statt nach Zeit. Alles andere folgt dem
   * Lesetakt der Tage.
   */
  const groups = useMemo<Group[]>(() => {
    const open = stories.filter((story) => story.open)
    const rest = stories.filter((story) => !story.open)

    const out: Group[] = []
    if (open.length) out.push({ key: 'open', label: 'Benötigt dich', stories: open })

    const days = new Map<string, Group>()
    for (const story of rest) {
      const key = dayKey(story.at)
      const entry = days.get(key) ?? { key, label: dayLabel(story.at), stories: [] }
      entry.stories.push(story)
      days.set(key, entry)
    }
    return out.concat(Array.from(days.values()).sort((a, b) => b.key.localeCompare(a.key)))
  }, [stories])

  const freshCount = useMemo(() => {
    if (!lastRead) return 0
    return (payload?.stories ?? []).filter((story) => new Date(story.at).getTime() > lastRead).length
  }, [payload, lastRead])

  /* Die Uhrzeit ist die des Lesers, der Name kommt vom Server — sonst grüßt
     die Seite kurz mit „Gast“, bevor das Profil da ist. */
  const greeting = useMemo(() => getTimeBasedGreeting().short, [])
  const readerName = payload?.reader?.name?.trim() || ''

  return (
    <div className="dec-os">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: NEWS_CSS }} />
      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title={readerName ? `${greeting}, ${readerName}` : greeting}
            onMenu={() => setNavOpen(true)}
            actions={(
              <button
                type="button"
                className="nws-tool"
                aria-label="Aktualisieren"
                onClick={() => void load(true)}
              >
                <ArrowsClockwise size={15} weight="regular" className={refreshing ? 'nws-spin' : ''} />
              </button>
            )}
          />
        </div>

        <div className="dec-scroll-body nws">
          {loading ? (
            <FestagState
              kind="loading"
              title="Tagro trägt zusammen, was zuletzt wichtig war…"
              rows={4}
            />
          ) : error ? (
            <FestagState
              kind="error"
              title="Die Neuigkeiten sind gerade nicht erreichbar"
              body={error}
              primary={{ label: 'Erneut versuchen', onClick: () => void load() }}
            />
          ) : (
            <>
              <header className="nws-head">
                <p className="nws-digest">{payload?.digest.line}</p>
                {/* Das heutige Datum stand hier und beeinflusste keine einzige
                    Handlung — die Tagesgruppen darunter sagen ohnehin, wann
                    etwas war. Was bleibt, ist die eine Angabe, die etwas
                    aendert: ob seit dem letzten Besuch etwas dazukam. */}
                {freshCount > 0 && (
                  <p className="nws-sub">
                    {freshCount === 1
                      ? 'Eine Meldung seit deinem letzten Besuch'
                      : `${freshCount} Meldungen seit deinem letzten Besuch`}
                  </p>
                )}
              </header>

              {/* Filter erscheinen erst, wenn Filtern ueberhaupt Arbeit spart.
                  Bei sieben Meldungen liest man die Seite schneller, als man
                  die Leiste bedient — dann sind fuenf Knoepfe kein Werkzeug,
                  sondern Beiwerk, das die eigentliche Nachricht nach unten
                  drueckt. Ab der Schwelle kippt das, und sie kommen von
                  selbst. Niemand muss das einstellen. */}
              {(payload?.stories.length ?? 0) > FILTER_THRESHOLD && (
                <div className="nws-filters" role="tablist" aria-label="Nach Art filtern">
                  {FILTERS.map((item) => {
                    const count = item.id === 'all' ? payload?.stories.length ?? 0 : counts.get(item.id) ?? 0
                    if (item.id !== 'all' && count === 0) return null
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={filter === item.id}
                        className={`nws-filter${filter === item.id ? ' on' : ''}`}
                        onClick={() => setFilter(item.id)}
                      >
                        {item.label}
                        <em>{count}</em>
                      </button>
                    )
                  })}
                </div>
              )}

              {needsWorkspace ? (
                <NoWorkspace />
              ) : !payload?.stories.length ? (
                <EmptyNews />
              ) : !stories.length ? (
                <FestagState
                  kind="empty"
                  title="Dazu gibt es gerade nichts"
                  body="In dieser Kategorie ist in den letzten Wochen nichts passiert. Das ist selten schlecht — es heißt, hier läuft nichts aus dem Ruder."
                  primary={{ label: 'Alles anzeigen', onClick: () => setFilter('all') }}
                />
              ) : (
                groups.map((group) => (
                  <section key={group.key} className="nws-group">
                    <div className="nws-group-head">
                      <h2 className="nws-group-title">{group.label}</h2>
                      <span className="nws-group-count">{group.stories.length}</span>
                    </div>
                    <div className="nws-rows">
                      {group.stories.map((story) => (
                        <Row
                          key={story.id}
                          story={story}
                          fresh={Boolean(lastRead && new Date(story.at).getTime() > lastRead)}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </>
          )}
        </div>
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'report',
            id: 'newsroom',
            title: 'News',
            /* Ein Etikett, kein Satz — die Tageszeile gehört auf die Seite,
               nicht in Tagros Kontextkopf. */
            subtitle: payload?.digest.openCount
              ? `${payload.digest.openCount} offen`
              : 'Nichts offen',
          }}
        />
      </div>
    </div>
  )
}

/**
 * Eine Zeile: Zustand · Satz · Kontext · Zeit.
 *
 * Der Zustand steht vorne, weil er entscheidet, ob man weiterliest. Der
 * Vorschautext bricht nie um — was nicht in eine Zeile passt, gehört auf die
 * Seite dahinter, nicht in die Übersicht.
 */
function Row({ story, fresh }: { story: NewsStory; fresh: boolean }) {
  const status = storyStatus(story)
  const href = story.action?.href ?? story.href
  const className = [
    'nws-row',
    story.weight === 'quiet' ? 'is-quiet' : '',
    fresh ? 'is-fresh' : '',
  ].filter(Boolean).join(' ')
  const style = { ['--nws-tone' as string]: TONE_COLOR[status.tone] }

  const body = (
    <>
      <span className="nws-row-dot" aria-hidden />
      <span className="nws-row-status">{status.label}</span>
      <span className="nws-row-title">{story.headline}</span>
      <span className="nws-row-preview">{story.body ?? CATEGORY_LABEL[story.category]}</span>
      <span className="nws-row-context">
        {story.projectTitle && <span className="nws-row-project">{story.projectTitle}</span>}
        <time className="nws-row-time" dateTime={story.at}>{timeLabel(story.at)}</time>
      </span>
      <CaretRight size={13} weight="bold" className="nws-row-caret" />
    </>
  )

  if (!href) {
    return <div className={`${className} is-static`} style={style}>{body}</div>
  }
  return (
    <Link href={href} className={className} style={style}>{body}</Link>
  )
}

function NoWorkspace() {
  return (
    <FestagState
      kind="empty"
      title="Dein Workspace fehlt noch"
      body="News erzählt, was in deinen Projekten passiert. Dafür braucht es zuerst einen Workspace — die Umgebung, in der deine Projekte, dein Team und Tagro zusammenarbeiten."
      primary={{ label: 'Workspace erstellen', onClick: () => openWorkspaceCreateWizard() }}
    />
  )
}

function EmptyNews() {
  return (
    <FestagState
      kind="empty"
      title="Noch keine Neuigkeiten"
      body="Hier steht, was in deinen Projekten passiert: Entscheidungen, die deine Freigabe brauchen, fertige Arbeit, erkannte Risiken und die Berichte, die Tagro daraus schreibt. Sobald ein Projekt läuft, füllt sich diese Seite von selbst."
      primary={{ label: 'Projekt anlegen', href: '/new-project' }}
      secondary={{ label: 'Mit Tagro starten', href: '/ai' }}
    />
  )
}

/* ── dates ──────────────────────────────────────────────────────────────── */

function dayKey(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '0000-00-00'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dayLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Früher'
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diff = Math.round((startOfToday - day) / 86_400_000)
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Gestern'
  if (diff < 7) return new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(date)
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long' }).format(date)
}

function timeLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.round(hours / 24)
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(date)
}


