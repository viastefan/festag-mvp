'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, MagnifyingGlass, Sparkle } from '@phosphor-icons/react'
import { toggleAccountPanel } from '@/lib/account-panel-open'
import { getInitials, type UserProfile } from '@/lib/hooks/useUser'
import { openTagro } from '@/components/TagroOverlay'
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

export default function AppShellTopBar({ user }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { items: notifications, unread, markRead } = useNotifications({ limit: 10 })

  const initials = getInitials(user)
  const filled = q.trim().length > 0

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false)
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
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
        setSearchOpen(true)
      } catch {
        setHits([])
      } finally {
        setBusy(false)
      }
    }, 200)
    return () => window.clearTimeout(t)
  }, [q])

  function askTagro(question: string) {
    const text = question.trim()
    if (!text) return
    openTagro({
      contextType: 'empty',
      id: `search:${pathname}`,
      title: 'Suche',
      prefill: text,
    })
    setQ('')
    setHits([])
    setSearchOpen(false)
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setSearchOpen(false)
      inputRef.current?.blur()
      return
    }
    if (e.key !== 'Enter') return
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    const first = hits.find((h) => h.kind !== 'tagro') || hits[0]
    if (!first || first.kind === 'tagro') {
      askTagro(term)
      return
    }
    if (first.href) {
      router.push(first.href)
      setQ('')
      setHits([])
      setSearchOpen(false)
    }
  }

  return (
    <header className="fas-topbar">
      <div className="fas-topbar-left" />

      <div className="fas-topbar-right">
        <div className="fas-search-wrap" ref={searchRef}>
          <label className={`fas-search-field${filled ? ' is-filled' : ''}`}>
            <MagnifyingGlass size={16} weight="regular" aria-hidden className="fas-search-ico" />
            <input
              ref={inputRef}
              type="search"
              className="fas-search-input"
              placeholder="Suchen oder Tagro fragen…"
              value={q}
              autoComplete="off"
              onChange={(e) => {
                setQ(e.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => { if (q.trim().length >= 2) setSearchOpen(true) }}
              onKeyDown={onSearchKey}
            />
            {busy ? <span className="fas-search-busy" aria-hidden /> : null}
          </label>
          {searchOpen && q.trim().length >= 2 ? (
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
                    setQ('')
                    setHits([])
                    setSearchOpen(false)
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
            onClick={() => setNotifOpen((v) => !v)}
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

        <button
          type="button"
          className="fas-icon-btn fas-topbar-account"
          aria-label="Account"
          onClick={() => toggleAccountPanel()}
        >
          <span className="fas-profile-avatar" style={{ width: 26, height: 26, fontSize: 10 }} aria-hidden="true">
            {initials}
          </span>
        </button>
      </div>
    </header>
  )
}
