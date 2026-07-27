'use client'

/**
 * DevMobileDock — Execution Panel mobile actions.
 *
 * Matches client portal pattern: drag grip + two actions.
 * Primary = route context / Navigation. Secondary = Tagro.
 */

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarBlank, FileText, FolderOpen, GithubLogo, ListBullets,
  Plus, Scales, Sparkle, UsersThree,
} from '@phosphor-icons/react'

import DevMobileNavSheet from '@/components/dev/DevMobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import { openTagro } from '@/components/TagroOverlay'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { getDevRouteTagroContext } from '@/lib/dev-mobile-nav'
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
    return { icon: UsersThree, label: 'Mitglieder', action: 'nav', target: '/dev/team' }
  if (pathname.startsWith('/dev/plan'))
    return { icon: CalendarBlank, label: 'Tagesplan', action: 'nav', target: '/dev/plan' }
  if (pathname === '/dev')
    return { icon: Plus, label: 'Neues Projekt', action: 'event', target: 'dev:new-project' }
  return { icon: ListBullets, label: 'Menü', action: 'event', target: 'open-nav' }
}

export default function DevMobileDock() {
  const pathname = usePathname() || ''
  const router = useRouter()
  const mobile = useFestagMobile()
  const [navOpen, setNavOpen] = useState(false)
  const tagroContext = useMemo(() => getDevRouteTagroContext(pathname), [pathname])

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

  function handlePrimary() {
    if (ctx.action === 'event') {
      if (ctx.target === 'open-nav') {
        setNavOpen(true)
      } else if (ctx.target) {
        window.dispatchEvent(new CustomEvent(ctx.target))
      }
      return
    }
    if (ctx.target) router.push(ctx.target)
  }

  function handleTagro() {
    openTagro({
      contextType: 'dev_item',
      id: `dev:${pathname}`,
      title: `Tagro — ${tagroContext.title}`,
      prefill: tagroContext.prefill,
    })
  }

  return (
    <>
      <MobilePageDock
        onDragUp={() => setNavOpen(true)}
        primary={{
          id: 'dev-primary',
          label: ctx.label,
          icon: <CtxIcon size={18} weight="regular" />,
          onClick: handlePrimary,
          ariaLabel: ctx.label,
        }}
        secondary={{
          id: 'dev-tagro',
          icon: <Sparkle size={18} weight="regular" />,
          onClick: handleTagro,
          ariaLabel: `Tagro öffnen, Kontext ${tagroContext.title}`,
        }}
      />
      <DevMobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  )
}
