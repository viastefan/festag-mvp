'use client'

/**
 * DevMobileDock — mobile context action for the developer portal.
 *
 * Tagro lives in the top bar (same as desktop rail). The dock only surfaces
 * one route-specific action: new task, new project, navigation, etc.
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  CalendarBlank, FileText, FolderOpen, GithubLogo, ListBullets,
  Plus, Scales, UsersThree,
} from '@phosphor-icons/react'

import DevMobileNavSheet from '@/components/dev/DevMobileNavSheet'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { OPEN_DEV_NAV_EVENT } from '@/lib/festag-global-dock'

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
    position: fixed;
    right: 16px;
    bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    z-index: 190;
    pointer-events: auto;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .dmd-root.dmd-root--on { display: block; }

  :global(body.chat-composer-focused) .dmd-root {
    transform: translateY(140%);
    transition: transform .2s ease;
  }

  .dmd-context {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 16px 0 14px;
    border: 1px solid var(--dv-line, rgba(255, 255, 255, 0.1));
    border-radius: 999px;
    background: var(--dv-surface, #111114);
    color: var(--dv-text, #f5f5f7);
    font-family: inherit;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.01em;
    cursor: pointer;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
    -webkit-tap-highlight-color: transparent;
    transition: background var(--dv-fast, 150ms) ease, transform var(--dv-fast, 150ms) ease;
  }
  .dmd-context:active {
    transform: scale(0.97);
  }
  .dmd-context svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  [data-theme='light'] .dmd-context,
  [data-theme='read'] .dmd-context {
    background: #ffffff;
    color: #1e1e20;
    border-color: rgba(30, 30, 32, 0.08);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
  }

  body.festag-dev-dock .dv-canvas-inner {
    padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)) !important;
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

  const ctx = getContextAction(pathname)
  const CtxIcon = ctx.icon

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
      <div className="dmd-root dmd-root--on" role="toolbar" aria-label="Seitenaktion">
        <button
          type="button"
          className="dmd-context"
          aria-label={ctx.label}
          onClick={handleContext}
        >
          <CtxIcon weight="regular" />
          <span>{ctx.label}</span>
        </button>
      </div>

      <DevMobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  )
}
