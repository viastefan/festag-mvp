'use client'

/**
 * PortalMobileDock — persistent delivery navigation on mobile portal routes.
 *
 * Segmented tabs: Status · Posteingang · Entscheidungen
 * Primary action: Tagro (project picker → overlay)
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChatCircle, DotsThree, Bell, Pulse, Scales } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { openTagro } from '@/components/TagroOverlay'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobileProjectPickerSheet, { type ProjectPickerMode } from '@/components/mobile/MobileProjectPickerSheet'
import { FESTAG_MOBILE_DOCK_CSS } from '@/components/mobile/festag-mobile-dock-styles'
import { OPEN_PORTAL_NAV_EVENT } from '@/lib/festag-global-dock'

type ProjectLite = { id: string; title: string; color?: string | null; status?: string | null }

const PORTAL_DOCK_TABS = [
  { href: '/dashboard', label: 'Status', Icon: Pulse, match: (p: string) => p === '/dashboard' || p === '/' },
  { href: '/benachrichtigungen', label: 'Post', Icon: Bell, match: (p: string) => p.startsWith('/benachrichtigungen') || p.startsWith('/messages') || p.startsWith('/inbox') },
  { href: '/decisions', label: 'Entsch.', Icon: Scales, match: (p: string) => p.startsWith('/decisions') },
] as const

const PORTAL_MOBILE_MQ = '(max-width: 900px)'

export default function PortalMobileDock() {
  const pathname = usePathname() || ''
  const [mobile, setMobile] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [tagroMode, setTagroMode] = useState<ProjectPickerMode | null>(null)
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(PORTAL_MOBILE_MQ)
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('festag-portal-dock', mobile)
    return () => { document.body.classList.remove('festag-portal-dock') }
  }, [mobile])

  useEffect(() => {
    function onOpenNav() { setNavOpen(true) }
    window.addEventListener(OPEN_PORTAL_NAV_EVENT, onOpenNav)
    return () => window.removeEventListener(OPEN_PORTAL_NAV_EVENT, onOpenNav)
  }, [])

  useEffect(() => {
    if (!tagroMode || projectsLoaded) return
    let cancelled = false
    ;(async () => {
      try {
        const sb = createClient() as any
        const { data } = await sb
          .from('projects')
          .select('id,title,color,status')
          .order('updated_at', { ascending: false })
          .limit(40)
        if (!cancelled) {
          setProjects((data as ProjectLite[]) || [])
          setProjectsLoaded(true)
        }
      } catch {
        if (!cancelled) setProjectsLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [tagroMode, projectsLoaded])

  useEffect(() => {
    if (!navOpen && !tagroMode) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [navOpen, tagroMode])

  if (!mobile) return null

  function isActive(match: (p: string) => boolean) {
    return match(pathname)
  }

  function handlePickTagro(projectId: string | null, title: string) {
    setTagroMode(null)
    if (projectId) {
      openTagro({ contextType: 'project', id: projectId, title })
    } else {
      openTagro({ contextType: 'empty', id: 'all', title: 'Alle Projekte', subtitle: 'Gesamtbericht' })
    }
  }

  return (
    <>
      <style>{FESTAG_MOBILE_DOCK_CSS}</style>
      <div className="fmd-root fmd-root--on" role="toolbar" aria-label="Portal Navigation">
        <div className="fmd-segment">
          {PORTAL_DOCK_TABS.map(tab => {
            const active = isActive(tab.match)
            const Icon = tab.Icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`fmd-tab${active ? ' on' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} weight={active ? 'fill' : 'regular'} />
                <span className="fmd-tab-label">{tab.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            className="fmd-tab"
            aria-label="Navigation öffnen"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <DotsThree size={22} weight="bold" />
            <span className="fmd-tab-label">Mehr</span>
          </button>
        </div>
        <button
          type="button"
          className="fmd-primary"
          aria-label="Mit Tagro sprechen"
          onClick={() => setTagroMode('tagro')}
        >
          <ChatCircle className="fmd-primary-icon" weight="fill" />
          <span>Tagro</span>
        </button>
      </div>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <MobileProjectPickerSheet
        mode={tagroMode}
        projects={projects}
        loading={!projectsLoaded}
        onClose={() => setTagroMode(null)}
        onPickStatus={() => setTagroMode(null)}
        onPickTagro={handlePickTagro}
      />
    </>
  )
}
