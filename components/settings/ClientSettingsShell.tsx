'use client'

/**
 * ClientSettingsShell — dedicated Settings workspace for /settings.
 * Same architecture as Dev settings: portal chrome parks away, sparse rail takes over.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, CaretDown, List, MagnifyingGlass,
} from '@phosphor-icons/react'

import {
  CLIENT_SETTINGS_RAIL,
  CLIENT_SETTINGS_RAIL_ITEMS,
  SECTION_TITLE,
  pushRecentClientSetting,
  readRecentClientSettings,
  resolveSettingsSection,
  searchClientSettingsRail,
  settingsHref,
  settingsSlugFromPath,
  type SettingsSectionId,
} from '@/components/settings/settings-config'
import { SettingsWorkspaceProvider, useSettingsWorkspace } from '@/components/settings/settings-workspace-context'
import { DEV_SETTINGS_CSS } from '@/components/dev/settings/dev-settings-styles'

const COLLAPSED_KEY = 'festag_client_settings_collapsed_v1'

function readCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveCollapsed(next: Record<string, boolean>) {
  try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next)) } catch { /* noop */ }
}

function ClientSettingsShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const router = useRouter()
  const workspace = useSettingsWorkspace()
  const slug = settingsSlugFromPath(pathname)
  const { section } = resolveSettingsSection(slug)
  const title = SECTION_TITLE[section]

  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<SettingsSectionId[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [focusIndex, setFocusIndex] = useState(-1)
  const [navOpen, setNavOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCollapsed(readCollapsed())
    setRecent(readRecentClientSettings())
  }, [])

  useEffect(() => {
    pushRecentClientSetting(section)
    setRecent(readRecentClientSettings())
    setNavOpen(false)
    setFocusIndex(-1)
    setQuery('')
    // Soft section hop: keep page mounted, just reset the scroll column.
    const main = document.querySelector('.cs-root .ds-main') as HTMLElement | null
    if (main) main.scrollTop = 0
  }, [section])

  useEffect(() => {
    if (!navOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [navOpen])

  const searchHits = useMemo(() => searchClientSettingsRail(query), [query])
  const showingSearch = query.trim().length > 0

  const flatNav = useMemo(() => {
    if (showingSearch) return searchHits
    return CLIENT_SETTINGS_RAIL.flatMap(group => {
      const isCollapsed = group.id in collapsed
        ? !!collapsed[group.id]
        : !!group.defaultCollapsed
      if (isCollapsed && !group.items.some(i => resolveSettingsSection(i.slug).section === section)) {
        return []
      }
      return group.items
    })
  }, [showingSearch, searchHits, collapsed, section])

  const toggleGroup = useCallback((id: string) => {
    setCollapsed(prev => {
      const group = CLIENT_SETTINGS_RAIL.find(g => g.id === id)
      const currently = id in prev ? !!prev[id] : !!group?.defaultCollapsed
      const next = { ...prev, [id]: !currently }
      saveCollapsed(next)
      return next
    })
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing = !!target && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT'
        || target.isContentEditable
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
          return e.key === 'ArrowDown'
            ? Math.min(flatNav.length - 1, start + 1)
            : Math.max(0, start - 1)
        })
      }
      if (e.key === 'Enter' && focusIndex >= 0 && flatNav[focusIndex]) {
        e.preventDefault()
        router.push(settingsHref(flatNav[focusIndex].slug))
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

  function itemActive(itemSlug: string, current: SettingsSectionId) {
    return resolveSettingsSection(itemSlug).section === current
  }

  const recentItems = recent
    .filter(id => id !== section)
    .map(id => CLIENT_SETTINGS_RAIL_ITEMS.find(i => resolveSettingsSection(i.slug).section === id))
    .filter(Boolean)
    .slice(0, 4)

  const savedLabel = workspace?.savedLabel || ''

  return (
    <div className={`ds-root cs-root${navOpen ? ' is-nav-open' : ''}`}>
      <style>{`${DEV_SETTINGS_CSS}${CLIENT_SETTINGS_EXTRA_CSS}`}</style>
      <button type="button" className="ds-backdrop" aria-label="Navigation schließen" onClick={() => setNavOpen(false)} />

      <aside className="ds-rail" aria-label="Einstellungen">
        <div className="ds-rail-head">
          <Link href="/dashboard" className="ds-back" title="Zurück zum Client Portal" prefetch>
            <ArrowLeft size={15} weight="bold" />
            <span>Portal</span>
          </Link>
        </div>

        <label className="ds-search">
          <MagnifyingGlass size={14} />
          <input
            ref={searchRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setFocusIndex(0) }}
            placeholder="Suchen…"
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
                  const active = itemActive(item.slug, section)
                  const focused = idx === focusIndex
                  return (
                    <Link
                      key={item.slug || 'profile'}
                      href={settingsHref(item.slug)}
                      prefetch
                      className={`ds-nav${active ? ' is-active' : ''}${focused ? ' is-focused' : ''}`}
                      onClick={() => { setQuery(''); setNavOpen(false) }}
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
                      const active = itemActive(item.slug, section)
                      return (
                        <Link
                          key={`recent-${item.slug || 'profile'}`}
                          href={settingsHref(item.slug)}
                          prefetch
                          className={`ds-nav${active ? ' is-active' : ''}`}
                          onClick={() => setNavOpen(false)}
                        >
                          <Icon size={15} weight={active ? 'fill' : 'regular'} />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {CLIENT_SETTINGS_RAIL.map(group => {
                const isCollapsed = groupCollapsed(group.id, group.defaultCollapsed)
                  && !group.items.some(i => itemActive(i.slug, section))
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
                        const active = itemActive(item.slug, section)
                        const flatIdx = flatNav.findIndex(i => i.slug === item.slug)
                        const focused = flatIdx === focusIndex
                        return (
                          <Link
                            key={item.slug || 'profile'}
                            href={settingsHref(item.slug)}
                            prefetch
                            className={`ds-nav${active ? ' is-active' : ''}${focused ? ' is-focused' : ''}`}
                            onClick={() => setNavOpen(false)}
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
          <div className="ds-mobile-bar-top">
            <Link href="/dashboard" className="ds-back" title="Zurück zum Client Portal" prefetch>
              <ArrowLeft size={16} weight="bold" />
              <span>Portal</span>
            </Link>
            <button
              type="button"
              className="ds-mobile-menu"
              onClick={() => setNavOpen(true)}
              aria-label="Einstellungen öffnen"
            >
              <List size={16} weight="bold" />
              <span>Menü</span>
            </button>
          </div>
          <div className="ds-mobile-bar-title-row">
            <h1 className="ds-mobile-title">{title}</h1>
            {savedLabel ? (
              <span className={`ds-save${savedLabel.startsWith('Speichert') ? '' : ' is-saved'}`}>
                {savedLabel}
              </span>
            ) : null}
          </div>
        </div>
        {/* No key={section} — remounting the monolith page flashed the skeleton on every hop. */}
        <div className="ds-main-inner">
          <nav className="ds-crumbs" aria-label="Pfad">
            <Link href="/settings" prefetch>Einstellungen</Link>
            <span className="ds-crumbs-sep" aria-hidden>/</span>
            <span className="ds-crumbs-current">{title}</span>
          </nav>
          <header className="ds-page-head ds-page-head--desktop">
            <h1>{title}</h1>
            {savedLabel ? (
              <span className={`ds-save${savedLabel.startsWith('Speichert') ? '' : ' is-saved'}`}>
                {savedLabel}
              </span>
            ) : null}
          </header>
          {children}
        </div>
      </main>
    </div>
  )
}

export default function ClientSettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <SettingsWorkspaceProvider>
      <ClientSettingsShellInner>{children}</ClientSettingsShellInner>
    </SettingsWorkspaceProvider>
  )
}

const CLIENT_SETTINGS_EXTRA_CSS = `
  .cs-root.ds-root {
    --ds-canvas: #F7F7F8;
    --ds-surface: #FFFFFF;
  }
  html[data-theme="read"] .cs-root.ds-root {
    --ds-canvas: #FAF9F5;
    --ds-surface: #FFFFFF;
  }
  html[data-theme="dark"] .cs-root.ds-root,
  html[data-theme="classic-dark"] .cs-root.ds-root {
    --ds-canvas: var(--festag-black-canvas, #070708);
    --ds-surface: var(--festag-black-content, #0E0E10);
  }

  .cs-root .set-codex-frame { display: contents; }
  .cs-root .set-codex-head,
  .cs-root .set-m-section-btn,
  .cs-root .set-m-head-actions,
  .cs-root .set-m-sheet-backdrop,
  .cs-root .set-m-section-sheet,
  .cs-root .set-page-title,
  .cs-root .set-breadcrumb,
  .cs-root .set-saved {
    display: none !important;
  }

  .cs-root .set-main {
    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    max-width: 720px;
    overflow: visible;
    padding: 0 !important;
  }
  .cs-root .set-main > .set-error,
  .cs-root .set-main > .set-invalid-banner {
    margin-left: 0;
    margin-right: 0;
  }

  /* Flatten plate-era cards into Dev-like quiet rows. */
  .cs-root .set-section-title {
    margin: 28px 0 10px;
    padding: 0 !important;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--ds-text-2, #5c5c62);
    border-top: 0 !important;
    background: transparent !important;
  }
  .cs-root .set-section-title:first-child,
  .cs-root .set-profile-layout > div > .set-section-title:first-child {
    margin-top: 0;
  }
  .cs-root .set-card {
    background: var(--ds-surface, #fff);
    border: 1px solid var(--ds-line-soft, rgba(0,0,0,0.06));
    border-radius: 12px;
    box-shadow: none;
    overflow: hidden;
    padding: 0 !important;
  }
  .cs-root .set-side-stack {
    border-top: 0 !important;
    padding: 0 !important;
    margin-top: 16px !important;
    gap: 10px;
  }
  .cs-root .set-mini-card + .set-mini-card {
    border-top: 1px solid var(--ds-line-soft, rgba(0,0,0,0.06));
    margin-top: 0;
    padding-top: 16px;
  }
  .cs-root .set-row {
    padding: 14px 16px;
    gap: 16px;
  }
  .cs-root .set-label {
    font-size: 13.5px;
    font-weight: 500;
  }
  .cs-root .set-label-sub {
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--ds-text-3, #8e8e93);
  }
  .cs-root .set-card + .set-card {
    margin-top: 10px;
  }
  .cs-root .set-loading {
    display: none !important;
  }
  .cs-root .set-input,
  .cs-root .set-select,
  .cs-root input.set-input,
  .cs-root select.set-select,
  .cs-root textarea.set-input {
    transition: border-color 120ms ease, background-color 120ms ease;
  }

  html[data-theme="dark"] .cs-root .set-card,
  html[data-theme="classic-dark"] .cs-root .set-card {
    background: var(--ds-surface);
    border-color: var(--ds-line-soft);
  }

  @media (max-width: 768px) {
    .cs-root .ds-crumbs,
    .cs-root .ds-page-head--desktop {
      display: none !important;
    }
    .cs-root .set-main { max-width: none; }
    .cs-root .set-section-title {
      margin: 20px 0 8px;
      font-size: 12.5px;
    }
    .cs-root .set-card {
      border-radius: 12px;
    }
    .cs-root .set-row {
      padding: 14px 14px;
    }
    .cs-root .set-toggle {
      min-height: 44px !important;
      width: 52px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .cs-root .set-input,
    .cs-root .set-select,
    .cs-root input.set-input,
    .cs-root select.set-select,
    .cs-root textarea.set-input {
      font-size: 16px !important; /* iOS: no zoom */
    }
    .cs-root .set-segment {
      width: 100%;
    }
    .cs-root .set-segment button {
      flex: 1;
      min-height: 40px !important;
    }
    .cs-root .set-btn {
      min-height: 44px;
      height: 44px;
    }
  }
`
