'use client'

/**
 * DevSettingsShell — dedicated Settings workspace for /dev/settings.
 *
 * Replaces the normal Execution rail with a calm System-Settings-style
 * sidebar: search, collapsible groups, recent pages, keyboard nav.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, CaretDown, List, MagnifyingGlass,
} from '@phosphor-icons/react'

import {
  DEV_SETTINGS_META,
  DEV_SETTINGS_NAV,
  pushRecentSetting,
  readCollapsedSettingGroups,
  readRecentSettings,
  resolveDevSettingsSection,
  saveCollapsedSettingGroups,
  searchDevSettings,
  settingsHref,
  type DevSettingsSectionId,
} from '@/lib/dev-settings-config'
import { DEV_SETTINGS_CSS } from '@/components/dev/settings/dev-settings-styles'

export default function DevSettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const router = useRouter()
  const section = resolveDevSettingsSection(pathname.split('/')[3])
  const meta = DEV_SETTINGS_META[section]

  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<DevSettingsSectionId[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [focusIndex, setFocusIndex] = useState(-1)
  const [navOpen, setNavOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRecent(readRecentSettings())
    setCollapsed(readCollapsedSettingGroups())
  }, [])

  useEffect(() => {
    pushRecentSetting(section)
    setRecent(readRecentSettings())
    setNavOpen(false)
    setFocusIndex(-1)
  }, [section])

  const searchHits = useMemo(() => searchDevSettings(query), [query])
  const showingSearch = query.trim().length > 0

  const flatNav = useMemo(() => {
    if (showingSearch) return searchHits
    return DEV_SETTINGS_NAV.flatMap(group => {
      const isCollapsed = group.id in collapsed
        ? !!collapsed[group.id]
        : !!group.defaultCollapsed
      if (isCollapsed && !group.items.some(i => i.id === section)) return []
      return group.items
    })
  }, [showingSearch, searchHits, collapsed, section])

  const toggleGroup = useCallback((id: string) => {
    setCollapsed(prev => {
      const group = DEV_SETTINGS_NAV.find(g => g.id === id)
      const currently = id in prev ? !!prev[id] : !!group?.defaultCollapsed
      const next = { ...prev, [id]: !currently }
      saveCollapsedSettingGroups(next)
      return next
    })
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      )

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (e.key === 'Escape') {
        if (query) { setQuery(''); return }
        if (navOpen) { setNavOpen(false); return }
      }
      if (typing && target !== searchRef.current) return
      if (flatNav.length === 0) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusIndex(prev => {
          const start = prev < 0 ? (e.key === 'ArrowDown' ? -1 : 0) : prev
          const next = e.key === 'ArrowDown'
            ? Math.min(flatNav.length - 1, start + 1)
            : Math.max(0, start - 1)
          return next
        })
      }
      if (e.key === 'Enter' && focusIndex >= 0 && flatNav[focusIndex]) {
        e.preventDefault()
        router.push(settingsHref(flatNav[focusIndex].id))
        setQuery('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flatNav, focusIndex, query, navOpen, router])

  function groupCollapsed(groupId: string, defaultCollapsed?: boolean) {
    if (groupId in collapsed) return !!collapsed[groupId]
    return !!defaultCollapsed
  }

  const recentItems = recent
    .map(id => DEV_SETTINGS_NAV.flatMap(g => g.items).find(i => i.id === id))
    .filter(Boolean)

  return (
    <div className={`ds-root${navOpen ? ' is-nav-open' : ''}`}>
      <style>{DEV_SETTINGS_CSS}</style>
      <button type="button" className="ds-backdrop" aria-label="Navigation schließen" onClick={() => setNavOpen(false)} />

      <aside className="ds-rail" aria-label="Einstellungen">
        <div className="ds-rail-head">
          <Link href="/dev" className="ds-back" title="Zurück zum Execution Panel">
            <ArrowLeft size={15} weight="bold" />
            <span>Execution</span>
          </Link>
        </div>

        <label className="ds-search">
          <MagnifyingGlass size={14} />
          <input
            ref={searchRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setFocusIndex(0) }}
            placeholder="Einstellungen suchen…"
            aria-label="Einstellungen suchen"
          />
          <span className="ds-search-kbd">/</span>
        </label>

        <div className="ds-rail-scroll">
          {showingSearch ? (
            searchHits.length === 0 ? (
              <p className="ds-empty-search">Keine Treffer für „{query.trim()}“.</p>
            ) : (
              <div className="ds-group-rows">
                {searchHits.map((item, idx) => {
                  const Icon = item.icon
                  const active = item.id === section
                  const focused = idx === focusIndex
                  return (
                    <Link
                      key={item.id}
                      href={settingsHref(item.id)}
                      className={`ds-nav${active ? ' is-active' : ''}${focused ? ' is-focused' : ''}`}
                      onClick={() => setQuery('')}
                    >
                      <Icon size={15} weight={active ? 'fill' : 'regular'} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )
          ) : (
            <>
              {recentItems.length > 0 && (
                <div>
                  <p className="ds-recent-label">Zuletzt</p>
                  <div className="ds-group-rows">
                    {recentItems.map(item => {
                      if (!item) return null
                      const Icon = item.icon
                      const active = item.id === section
                      return (
                        <Link
                          key={`recent-${item.id}`}
                          href={settingsHref(item.id)}
                          className={`ds-nav${active ? ' is-active' : ''}`}
                        >
                          <Icon size={15} weight={active ? 'fill' : 'regular'} />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {DEV_SETTINGS_NAV.map(group => {
                const isCollapsed = groupCollapsed(group.id, group.defaultCollapsed)
                  && !group.items.some(i => i.id === section)
                return (
                  <div key={group.id}>
                    <button
                      type="button"
                      className="ds-group-toggle"
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={!isCollapsed}
                    >
                      <span className="ds-group-label">{group.label}</span>
                      <CaretDown
                        size={11}
                        weight="bold"
                        className={`ds-group-caret${isCollapsed ? ' is-collapsed' : ''}`}
                      />
                    </button>
                    <div className={`ds-group-rows${isCollapsed ? ' is-hidden' : ''}`}>
                      {group.items.map(item => {
                        const Icon = item.icon
                        const active = item.id === section
                        const flatIdx = flatNav.findIndex(i => i.id === item.id)
                        const focused = flatIdx === focusIndex
                        return (
                          <Link
                            key={item.id}
                            href={settingsHref(item.id)}
                            className={`ds-nav${active ? ' is-active' : ''}${focused ? ' is-focused' : ''}`}
                          >
                            <Icon size={15} weight={active ? 'fill' : 'regular'} />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </aside>

      <main className="ds-main">
        <div className="ds-mobile-bar">
          <button type="button" className="ds-back" onClick={() => setNavOpen(true)} aria-label="Einstellungen öffnen">
            <List size={16} weight="bold" />
            <span>Menü</span>
          </button>
          <p className="ds-rail-title">{meta.title}</p>
        </div>
        <div className="ds-main-inner" key={section}>
          <nav className="ds-crumbs" aria-label="Pfad">
            <Link href="/dev/settings/profile">Einstellungen</Link>
            <span className="ds-crumbs-sep" aria-hidden>/</span>
            <span className="ds-crumbs-current">{meta.title}</span>
          </nav>
          {children}
        </div>
      </main>
    </div>
  )
}
