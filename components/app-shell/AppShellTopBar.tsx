'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, MagnifyingGlass, Sparkle, X } from '@phosphor-icons/react'
import AuthEnterGlyph, { AUTH_ENTER_GLYPH_CSS } from '@/components/auth/AuthEnterGlyph'
import type { UserProfile } from '@/lib/hooks/useUser'
import { openTagro } from '@/components/TagroOverlay'
import { resolveRouteContext } from '@/lib/tagro/route-context'
import { useNotifications } from '@/hooks/useNotifications'

type Props = {
  user: UserProfile | null
}

type SearchHit = {
  id: string
  kind: 'project' | 'task' | 'decision' | 'tagro'
  title: string
  hint?: string
  href?: string
}

export default function AppShellTopBar({}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [expanded, setExpanded] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { items: notifications, unread, markRead } = useNotifications({ limit: 10 })

  const filled = q.trim().length > 0
  const canSubmit = filled
  const expandedRef = useRef(false)
  expandedRef.current = expanded

  function closeSearch(clear = false) {
    if (clear) {
      setQ('')
      setHits([])
    }
    setResultsOpen(false)
    setExpanded(false)
    inputRef.current?.blur()
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (expandedRef.current && searchRef.current && !searchRef.current.contains(t)) {
        closeSearch(true)
      }
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!expanded) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 160)
    return () => window.clearTimeout(t)
  }, [expanded])

  useEffect(() => {
    const term = q.trim()
    if (!expanded || term.length < 2) {
      setHits([])
      return
    }
    const t = window.setTimeout(async () => {
      setBusy(true)
      try {
        const res = await fetch(`/api/tagro/search?q=${encodeURIComponent(term)}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          setHits([])
          return
        }
        const data = (await res.json()) as { hits?: SearchHit[] }
        setHits(Array.isArray(data.hits) ? data.hits : [])
        setResultsOpen(true)
      } catch {
        setHits([])
      } finally {
        setBusy(false)
      }
    }, 200)
    return () => window.clearTimeout(t)
  }, [q, expanded])

  /**
   * Der eine globale Notausgang. Er startet nicht bei null: die aktuelle Route
   * sagt, worum es geht, damit niemand seinen eigenen Standort beschreiben muss.
   */
  function askTagro(question: string) {
    const text = question.trim()
    if (!text) return
    const ctx = resolveRouteContext(pathname)
    openTagro({
      contextType: ctx.contextType,
      id: ctx.id ?? `route:${pathname}`,
      title: ctx.label,
      projectId: ctx.projectId,
      prefill: text,
    })
    closeSearch(true)
  }

  function submitSearch() {
    const term = q.trim()
    if (!term) return
    const first = hits.find((h) => h.kind !== 'tagro') || hits[0]
    if (!first || first.kind === 'tagro') {
      askTagro(term)
      return
    }
    if (first.href) {
      router.push(first.href)
      closeSearch(true)
    }
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch(true)
      return
    }
    if (e.key !== 'Enter') return
    e.preventDefault()
    submitSearch()
  }

  return (
    <header className="fas-topbar">
      {/* Raw-text element: see the note in FestagAppShell — a text child would
          be HTML-escaped on the server only, breaking hydration. */}
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: AUTH_ENTER_GLYPH_CSS }} />
      <div className="fas-topbar-left" />

      <div className="fas-topbar-right">
        <div
          className={`fas-search-wrap${expanded ? ' is-expanded' : ''}`}
          ref={searchRef}
        >
          {!expanded ? (
            <button
              type="button"
              className="fas-icon-btn"
              aria-label="Suche öffnen"
              onClick={() => {
                setNotifOpen(false)
                setExpanded(true)
              }}
            >
              <MagnifyingGlass size={15} weight="regular" />
            </button>
          ) : (
            <div className={`fas-search-field${filled ? ' is-filled' : ''}`}>
              <MagnifyingGlass size={14} weight="regular" aria-hidden className="fas-search-ico" />
              <input
                ref={inputRef}
                type="search"
                className="fas-search-input"
                placeholder="Womit sollen wir helfen?"
                value={q}
                autoComplete="off"
                onChange={(e) => {
                  setQ(e.target.value)
                  if (e.target.value.trim().length >= 2) setResultsOpen(true)
                }}
                onFocus={() => { if (q.trim().length >= 2) setResultsOpen(true) }}
                onKeyDown={onSearchKey}
              />
              {busy ? <span className="fas-search-busy" aria-hidden /> : null}
              {canSubmit ? (
                <button
                  type="button"
                  className="fas-search-enter"
                  aria-label="Absenden"
                  onClick={submitSearch}
                >
                  <AuthEnterGlyph ready />
                </button>
              ) : null}
              <button
                type="button"
                className="fas-search-close"
                aria-label="Suche schließen"
                title="Schließen"
                onClick={() => closeSearch(true)}
              >
                <X size={12} weight="bold" />
              </button>
            </div>
          )}

          {expanded && resultsOpen && q.trim().length >= 2 ? (
            <div className="fas-popover fas-search-popover" role="listbox" aria-label="Suchergebnisse">
              <button
                type="button"
                className="fas-search-hit is-tagro"
                onClick={() => askTagro(q)}
              >
                <Sparkle size={14} weight="fill" />
                <span>
                  <strong>Tagro</strong>
                  <em>{q.trim()}</em>
                </span>
              </button>
              {hits.filter((h) => h.kind !== 'tagro').map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="fas-search-hit"
                  onClick={() => {
                    if (h.href) router.push(h.href)
                    closeSearch(true)
                  }}
                >
                  <span>
                    <strong>{h.title}</strong>
                    {h.hint ? <em>{h.hint}</em> : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="fas-topbar-notif" ref={notifRef}>
          <button
            type="button"
            className={`fas-icon-btn${notifOpen ? ' is-on' : ''}`}
            aria-label="Benachrichtigungen"
            aria-expanded={notifOpen}
            onClick={() => {
              setNotifOpen((v) => !v)
              if (!q.trim()) setExpanded(false)
              setResultsOpen(false)
            }}
          >
            <Bell size={17} weight="regular" />
            {unread > 0 ? <span className="fas-notif-dot" aria-hidden /> : null}
          </button>
          {notifOpen ? (
            <div className="fas-popover fas-notif-popover" role="dialog" aria-label="Benachrichtigungen">
              {notifications.length === 0 ? (
                <p className="fas-notif-empty">Noch keine Benachrichtigungen.</p>
              ) : (
                <ul className="fas-notif-list">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className="fas-notif-card"
                        onClick={() => {
                          void markRead(n.id)
                          if (n.link) window.location.href = n.link
                          setNotifOpen(false)
                        }}
                      >
                        <span className="fas-notif-card-title">{n.title}</span>
                        <span className="fas-notif-card-body">
                          {n.body || n.message || ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
