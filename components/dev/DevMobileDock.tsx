'use client'

/**
 * DevMobileDock — mobile bottom bar for the developer portal.
 *
 * Two floating action buttons:
 *
 *   ┌────────────────────────────────────────────────────┐
 *   │                        [Context FAB]  [⌾ Tagro]   │
 *   └────────────────────────────────────────────────────┘
 *
 * Right: persistent Tagro orb — same appearance as the client portal.
 * Left of it: a contextual action button that adapts to the current section.
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  ChatCircle, FolderOpen, CheckSquare, GithubLogo, ListBullets,
  Plus, FileText, Scales, UsersThree, House, CalendarBlank,
} from '@phosphor-icons/react'

import DevMobileNavSheet from '@/components/dev/DevMobileNavSheet'
import { openTagro } from '@/components/TagroOverlay'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { OPEN_DEV_NAV_EVENT } from '@/lib/festag-global-dock'
import { getDevRouteTagroContext } from '@/lib/dev-mobile-nav'

type ContextAction = {
  icon: React.ElementType
  label: string
  action: 'nav' | 'event'
  target?: string
}

function getContextAction(pathname: string): ContextAction {
  if (pathname.startsWith('/dev/projects'))
    return { icon: Plus, label: 'Neues Projekt', action: 'event', target: 'dev:new-project' }
  if (pathname.startsWith('/dev/tasks'))
    return { icon: Plus, label: 'Neue Aufgabe', action: 'event', target: 'dev:new-task' }
  if (pathname.startsWith('/dev/github'))
    return { icon: GithubLogo, label: 'GitHub', action: 'nav', target: '/dev/github' }
  if (pathname.startsWith('/dev/documents'))
    return { icon: FileText, label: 'Dokumente', action: 'nav', target: '/dev/documents' }
  if (pathname.startsWith('/dev/decisions'))
    return { icon: Scales, label: 'Entscheidungen', action: 'nav', target: '/dev/decisions' }
  if (pathname.startsWith('/dev/team'))
    return { icon: UsersThree, label: 'Team', action: 'nav', target: '/dev/team' }
  if (pathname.startsWith('/dev/settings'))
    return { icon: ListBullets, label: 'Navigation', action: 'event', target: 'open-nav' }
  if (pathname.startsWith('/dev/plan'))
    return { icon: CalendarBlank, label: 'Plan', action: 'nav', target: '/dev/plan' }
  return { icon: ListBullets, label: 'Navigation', action: 'event', target: 'open-nav' }
}

const DEV_MOBILE_DOCK_CSS = `
  .dmd-root {
    display: none;
    align-items: flex-end;
    justify-content: flex-end;
    gap: 12px;
    position: fixed;
    right: 16px;
    bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    z-index: 190;
    pointer-events: auto;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .dmd-root.dmd-root--on { display: flex; }

  :global(body.chat-composer-focused) .dmd-root {
    transform: translateY(140%);
    transition: transform .2s ease;
  }

  .dmd-fab {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border: 0;
    border-radius: 50%;
    background: var(--dmd-bg, #1a1a1a);
    color: var(--dmd-fg, #ffffff);
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.22), 0 1px 4px rgba(0, 0, 0, 0.12);
    -webkit-tap-highlight-color: transparent;
    transition: transform .14s ease, box-shadow .14s ease;
  }
  .dmd-fab:active {
    transform: scale(0.94);
  }
  .dmd-fab > svg {
    width: 22px;
    height: 22px;
  }

  .dmd-tagro {
    width: 56px;
    height: 56px;
    background: var(--dmd-tagro-bg, #000000);
    color: var(--dmd-tagro-fg, #ffffff);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12);
  }
  .dmd-tagro > svg {
    width: 24px;
    height: 24px;
  }

  .dmd-context {
    background: var(--dmd-ctx-bg, #2a2a2a);
    color: var(--dmd-ctx-fg, #ffffff);
  }

  [data-theme='dark'] .dmd-fab,
  [data-theme='classic-dark'] .dmd-fab {
    --dmd-bg: #ffffff;
    --dmd-fg: #000000;
    --dmd-tagro-bg: #ffffff;
    --dmd-tagro-fg: #000000;
    --dmd-ctx-bg: rgba(255, 255, 255, 0.9);
    --dmd-ctx-fg: #000000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 1px 4px rgba(0, 0, 0, 0.2);
  }

  body.festag-dev-dock .dv-canvas-inner {
    padding-bottom: calc(110px + env(safe-area-inset-bottom, 0px)) !important;
  }
`

export default function DevMobileDock() {
  const pathname = usePathname() || ''
  const mobile = useFestagMobile()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    function onOpenNav() { setNavOpen(true) }
    window.addEventListener(OPEN_DEV_NAV_EVENT, onOpenNav)
    return () => window.removeEventListener(OPEN_DEV_NAV_EVENT, onOpenNav)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('festag-dev-dock', mobile)
    return () => { document.body.classList.remove('festag-dev-dock') }
  }, [mobile])

  if (!mobile) return null

  const tagroContext = getDevRouteTagroContext(pathname)
  const ctx = getContextAction(pathname)
  const CtxIcon = ctx.icon

  function handleOpenTagro() {
    openTagro({
      contextType: 'dev_item',
      id: `dev:${pathname}`,
      title: `Tagro — ${tagroContext.title}`,
      prefill: tagroContext.prefill,
    })
  }

  function handleContext() {
    if (ctx.action === 'event') {
      if (ctx.target === 'open-nav') {
        setNavOpen(true)
      } else if (ctx.target) {
        window.dispatchEvent(new CustomEvent(ctx.target))
      }
    }
  }

  return (
    <>
      <style>{DEV_MOBILE_DOCK_CSS}</style>
      <div className="dmd-root dmd-root--on" role="toolbar" aria-label="Dev Actions">
        <button
          type="button"
          className="dmd-fab dmd-context"
          aria-label={ctx.label}
          onClick={handleContext}
        >
          <CtxIcon weight="regular" />
        </button>
        <button
          type="button"
          className="dmd-fab dmd-tagro"
          aria-label={`Tagro öffnen, Kontext ${tagroContext.title}`}
          onClick={handleOpenTagro}
        >
          <ChatCircle weight="fill" />
        </button>
      </div>

      <DevMobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  )
}
