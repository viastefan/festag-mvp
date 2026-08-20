'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowsClockwise, Newspaper, Sparkle } from '@phosphor-icons/react'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import { NEWS_CSS } from '@/components/news/news-styles'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'
import { CATEGORY_COLOR, CATEGORY_LABEL, type NewsCategory, type NewsPayload, type NewsStory } from '@/lib/news/types'

const LAST_READ_KEY = 'festag-news-last-read'

const FILTERS: { id: 'all' | NewsCategory; label: string }[] = [
  { id: 'all', label: 'Alles' },
  { id: 'decision', label: 'Entscheidungen' },
  { id: 'risk', label: 'Risiken' },
  { id: 'delivery', label: 'Lieferungen' },
  { id: 'report', label: 'Berichte' },
]

/**
 * News — was seit deinem letzten Besuch wichtig war.
 *
 * Kein Dashboard: keine Kacheln, keine Kennzahlen ohne Handlung. Eine Spalte
 * Text, nach Tagen sortiert, offene Punkte zuerst — und an jeder Stelle, an
 * der du etwas tun kannst, steht die Handlung direkt daneben.
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

  /** Stories keep their rank order; days are the reading rhythm. */
  const days = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; stories: NewsStory[] }>()
    for (const story of stories) {
      const key = dayKey(story.at)
      const entry = groups.get(key) ?? { key, label: dayLabel(story.at), stories: [] }
      entry.stories.push(story)
      groups.set(key, entry)
    }
    return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key))
  }, [stories])

  const freshCount = useMemo(() => {
    if (!lastRead) return 0
    return (payload?.stories ?? []).filter((story) => new Date(story.at).getTime() > lastRead).length
  }, [payload, lastRead])

  let markerPlaced = false

  return (
    <div className="dec-os">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: NEWS_CSS }} />
      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="News"
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
            <div aria-busy="true" aria-label="Neuigkeiten werden geladen">
              <div className="nws-head">
                <div className="nws-skeleton" style={{ height: 60, border: 0 }} />
              </div>
              {[0, 1, 2, 3].map((index) => <div key={index} className="nws-skeleton" />)}
            </div>
          ) : error ? (
            <div className="nws-state">
              <strong>Die Neuigkeiten sind gerade nicht erreichbar</strong>
              <p>{error}</p>
              <div className="nws-state-actions">
                <button type="button" className="nws-action" onClick={() => void load()}>Erneut versuchen</button>
              </div>
            </div>
          ) : (
            <>
              <header className="nws-head">
                <p className="nws-kicker">
                  <Newspaper size={12} weight="regular" />
                  <span>Newsroom</span>
                  <span className="nws-kicker-sep" aria-hidden />
                  <time dateTime={payload?.generatedAt}>{todayLabel()}</time>
                  {freshCount > 0 && (
                    <>
                      <span className="nws-kicker-sep" aria-hidden />
                      <span>{freshCount} neu</span>
                    </>
                  )}
                </p>
                <h2 className="nws-digest">{payload?.digest.line}</h2>
              </header>

              {(payload?.stories.length ?? 0) > 0 && (
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
                <div className="nws-state">
                  <strong>Dazu gibt es gerade nichts</strong>
                  <p>In dieser Kategorie ist in den letzten Wochen nichts passiert.</p>
                  <div className="nws-state-actions">
                    <button type="button" className="nws-action" onClick={() => setFilter('all')}>Alles anzeigen</button>
                  </div>
                </div>
              ) : (
                days.map((day) => (
                  <section key={day.key}>
                    <h3 className="nws-day">{day.label}</h3>
                    {day.stories.map((story) => {
                      const isFresh = Boolean(lastRead && new Date(story.at).getTime() > lastRead)
                      const showMarker = !markerPlaced && Boolean(lastRead) && !isFresh && freshCount > 0
                      if (showMarker) markerPlaced = true
                      return (
                        <div key={story.id}>
                          {showMarker && <p className="nws-marker">Bis hierher gelesen</p>}
                          <Story story={story} />
                        </div>
                      )
                    })}
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
            subtitle: payload?.digest.line ?? 'Was zuletzt wichtig war',
          }}
        />
      </div>
    </div>
  )
}

function Story({ story }: { story: NewsStory }) {
  const color = CATEGORY_COLOR[story.category]
  const body = (
    <>
      <div className="nws-story-meta">
        <span className="nws-cat" style={{ ['--nws-cat' as string]: color }}>
          <span className="nws-cat-dot" aria-hidden />
          {CATEGORY_LABEL[story.category]}
        </span>
        {story.projectTitle && <span className="nws-story-project">{story.projectTitle}</span>}
        <span className="nws-story-time">{timeLabel(story.at)}</span>
      </div>
      <p className="nws-headline">{story.headline}</p>
      {story.body && <p className="nws-body">{story.body}</p>}
      {story.action && (
        <span className="nws-action">
          {story.action.label}
          <ArrowRight size={12} weight="bold" />
        </span>
      )}
    </>
  )

  const className = [
    'nws-story',
    story.weight === 'lead' ? 'is-lead' : '',
    story.weight === 'quiet' ? 'is-quiet' : '',
    story.open ? 'is-open' : '',
  ].filter(Boolean).join(' ')

  const style = { ['--nws-cat' as string]: color }

  if (!story.href) {
    return <div className={className} style={style}>{body}</div>
  }
  return (
    <Link href={story.action?.href ?? story.href} className={className} style={style}>
      {body}
    </Link>
  )
}

function NoWorkspace() {
  return (
    <div className="nws-state">
      <strong>Dein Workspace fehlt noch</strong>
      <p>
        News erzählt, was in deinen Projekten passiert. Dafür braucht es zuerst einen Workspace —
        die Umgebung, in der deine Projekte, dein Team und Tagro zusammenarbeiten.
      </p>
      <div className="nws-state-actions">
        <button type="button" className="nws-action" onClick={() => openWorkspaceCreateWizard()}>
          Workspace erstellen
          <ArrowRight size={12} weight="bold" />
        </button>
      </div>
    </div>
  )
}

function EmptyNews() {
  return (
    <div className="nws-state">
      <strong>Noch keine Neuigkeiten</strong>
      <p>
        Hier steht, was in deinen Projekten passiert: Entscheidungen, die deine Freigabe brauchen,
        fertige Arbeit, erkannte Risiken und die Berichte, die Tagro daraus schreibt.
        Sobald ein Projekt läuft, füllt sich diese Seite von selbst.
      </p>
      <div className="nws-state-actions">
        <Link href="/new-project" className="nws-action">Projekt anlegen</Link>
        <Link href="/ai" className="nws-action">
          <Sparkle size={12} weight="fill" />
          Mit Tagro starten
        </Link>
      </div>
    </div>
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
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function todayLabel(): string {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())
}
