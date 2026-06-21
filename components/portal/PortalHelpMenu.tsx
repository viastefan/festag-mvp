'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  MagnifyingGlass, FileText, ChatTeardropDots, Keyboard, CheckCircle,
  DownloadSimple, GearSix, Sparkle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { createClient } from '@/lib/supabase/client'

type HelpAction = 'search' | 'support' | 'shortcuts' | 'replay-tour'

type HelpEntry = {
  kind: 'link' | 'action'
  title: string
  icon: Icon
  href?: string
  action?: HelpAction
  shortcut?: string
}

const HELP_ITEMS: HelpEntry[] = [
  { kind: 'action', action: 'search', icon: MagnifyingGlass, title: 'Hilfe suchen…', shortcut: '⌘ K' },
  { kind: 'link', href: '/docs', icon: FileText, title: 'Docs' },
  { kind: 'action', action: 'support', icon: ChatTeardropDots, title: 'Kontakt' },
  { kind: 'action', action: 'shortcuts', icon: Keyboard, title: 'Tastenkürzel', shortcut: '⌘ /' },
  { kind: 'link', href: '/updates', icon: CheckCircle, title: 'Festag Status' },
  { kind: 'link', href: '/download', icon: DownloadSimple, title: 'Apps laden' },
  { kind: 'link', href: '/settings', icon: GearSix, title: 'Einstellungen', shortcut: 'G dann S' },
  { kind: 'action', action: 'replay-tour', icon: Sparkle, title: 'Einführung starten' },
]

const HELP_NEWS_ITEMS = [
  { title: 'Projektbriefings', href: '/whats-new' },
  { title: 'Code Intelligence', href: '/whats-new' },
  { title: 'Vollständiger Changelog', href: '/whats-new' },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef: React.RefObject<HTMLElement | null>
  trigger: ReactNode
  railCollapsed?: boolean
}

export default function PortalHelpMenu({
  open,
  onOpenChange,
  anchorRef,
  trigger,
  railCollapsed = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const isMobile = useFestagMobile()
  const [pos, setPos] = useState({ left: 0, bottom: 0 })

  useEffect(() => {
    function place() {
      const r = anchorRef.current?.getBoundingClientRect()
      if (!r) return
      const popW = 260
      const left = railCollapsed
        ? Math.min(r.right + 10, window.innerWidth - popW - 12)
        : Math.max(12, Math.min(r.left, window.innerWidth - popW - 12))
      setPos({
        left,
        bottom: window.innerHeight - r.top + 8,
      })
    }
    if (!open || isMobile) return
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchorRef, railCollapsed, isMobile])

  useEffect(() => {
    if (!open || !isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (wrapRef.current?.contains(t)) return
      if (popRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return
      onOpenChange(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('click', onDown, true)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('click', onDown, true)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, onOpenChange, anchorRef])

  const close = () => onOpenChange(false)

  async function handleItem(item: HelpEntry) {
    close()
    if (item.kind === 'link' && item.href) {
      router.push(item.href)
      return
    }
    if (item.action === 'search') {
      window.dispatchEvent(new CustomEvent('open-command-palette'))
      return
    }
    if (item.action === 'shortcuts') {
      window.dispatchEvent(new CustomEvent('show-shortcuts'))
      return
    }
    if (item.action === 'replay-tour') {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (user) {
          await sb.from('profiles').update({
            tour_completed_at: null,
            tour_step: 0,
          }).eq('id', user.id)
        }
      } catch { /* ignore */ }
      try {
        window.localStorage.removeItem('festag_tour_completed')
        window.localStorage.setItem('festag_onboarding_status', 'not_started')
      } catch { /* ignore */ }
      window.location.href = '/dashboard?tour=1'
      return
    }
    if (item.action === 'support') {
      window.location.href = 'mailto:hi@festag.io?subject=Festag%20Support'
    }
  }

  const menuBody = (
    <>
      <div className="phm-list">
        {HELP_ITEMS.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.title}
              type="button"
              className="phm-item"
              role="menuitem"
              onClick={() => { void handleItem(item) }}
            >
              <span className="phm-icon">
                <Icon size={15} weight="regular" />
              </span>
              <span className="phm-title">{item.title}</span>
              {item.shortcut ? <span className="phm-shortcut">{item.shortcut}</span> : null}
            </button>
          )
        })}
      </div>
      <p className="phm-section">Was ist neu</p>
      <div className="phm-news" role="group" aria-label="Was ist neu">
        {HELP_NEWS_ITEMS.map(item => (
          <button
            key={item.title}
            type="button"
            className="phm-news-item"
            onClick={() => {
              close()
              router.push(item.href)
            }}
          >
            <span className="phm-dot" aria-hidden />
            <span>{item.title}</span>
          </button>
        ))}
      </div>
    </>
  )

  const menu = open && typeof document !== 'undefined' ? createPortal(
    isMobile ? (
      <div className="festag-popup-mobile-host">
        <button type="button" className="festag-popup-backdrop" aria-label="Schließen" onClick={close} />
        <div
          ref={popRef}
          className="phm-pop festag-popup-surface festag-popup-mobile-sheet"
          role="menu"
          aria-label="Hilfe und Einführung"
        >
          <FestagPopupDragHandle onDismiss={close} />
          {menuBody}
        </div>
      </div>
    ) : (
      <div
        ref={popRef}
        className="phm-pop festag-popup-surface festag-anchor-popover"
        style={{ left: pos.left, bottom: pos.bottom }}
        role="menu"
        aria-label="Hilfe und Einführung"
      >
        {menuBody}
      </div>
    ),
    document.body,
  ) : null

  return (
    <div ref={wrapRef} className="phm-wrap">
      {trigger}
      {menu}
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
  .phm-wrap {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
  }
  .phm-pop {
    position: fixed;
    z-index: 120000;
    width: min(260px, calc(100vw - 24px));
    max-height: min(520px, calc(100dvh - 96px));
    overflow: auto;
    padding: 6px;
    border-radius: 14px;
    animation: phmIn .14s cubic-bezier(.16, 1, .3, 1) both;
    scrollbar-width: none;
  }
  .phm-pop::-webkit-scrollbar { display: none; }
  .phm-pop.festag-popup-mobile-sheet {
    width: 100%;
    max-width: 100%;
    max-height: min(88dvh, 720px);
    border-radius: 20px 20px 0 0;
    animation: none;
    z-index: auto;
  }
  @keyframes phmIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: none; }
  }
  .phm-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .phm-item,
  .phm-news-item {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
  }
  .phm-item {
    width: 100%;
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) max-content;
    gap: 10px;
    align-items: center;
    min-height: 36px;
    padding: 0 8px;
    border: 0;
    border-radius: 6px !important;
    background: transparent;
    color: var(--fp-text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background .12s ease, color .12s ease, transform .08s ease;
  }
  .phm-item:hover {
    background: var(--fp-hover);
  }
  .phm-item:active {
    background: var(--fp-hover);
    transform: scale(0.985);
  }
  .phm-icon {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--fp-muted);
  }
  .phm-item:hover .phm-icon { color: var(--fp-text); }
  .phm-title {
    min-width: 0;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .phm-shortcut {
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0;
    color: var(--fp-muted);
    white-space: nowrap;
  }
  .phm-section {
    margin: 10px 8px 4px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: .02em;
    color: var(--fp-muted);
  }
  .phm-news {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .phm-news::before {
    content: "";
    position: absolute;
    left: 20px;
    top: 16px;
    bottom: 16px;
    border-left: 1px dashed var(--fp-divider);
    opacity: .55;
  }
  .phm-news-item {
    width: 100%;
    min-height: 36px;
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    border: 0;
    border-radius: 6px !important;
    background: transparent;
    color: var(--fp-text);
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition: background .12s ease, transform .08s ease;
  }
  .phm-news-item:hover { background: var(--fp-hover); }
  .phm-news-item:active {
    background: var(--fp-hover);
    transform: scale(0.985);
  }
  .phm-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--fp-muted);
    justify-self: center;
  }
  .phm-news-item span:last-child {
    font-size: 12.5px;
    font-weight: 400;
    letter-spacing: -0.01em;
  }
`
