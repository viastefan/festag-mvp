'use client'

/**
 * Workspace switcher: Relations / Festwerk / Teams.
 *
 * Animation-Logik:
 *   - Beim Wechsel Relations ↔ Festwerk wird die Sidebar-Komponente komplett
 *     getauscht (Sidebar ↔ RelationsSidebar). `layoutId` von Framer kann sich
 *     dann nicht mehr persistieren → Pill würde "springen".
 *   - Lösung: deterministisches Tween + Persistenz via Layout-Stil
 *     (left/width statt layoutId-Magie). Kein Wobble mehr.
 *   - Hover-Scale aufs Icon entkoppelt vom Pill-Move (separate motion-spans).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Handshake, House, UsersThree } from '@phosphor-icons/react'
import { useState } from 'react'

type Tab = {
  label:    string
  href?:    string
  trigger?: 'teams'
  icon:     React.ReactNode
}

const TABS: Tab[] = [
  { label: 'Relations', href: '/relations',  icon: <Handshake  size={13} weight="bold" /> },
  { label: 'Festwerk',  href: '/dashboard',  icon: <House      size={13} weight="bold" /> },
  { label: 'Teams',     trigger: 'teams',    icon: <UsersThree size={13} weight="bold" /> },
]

function getActiveTab(pathname: string): number {
  if (pathname.startsWith('/relations')) return 0
  return 1 // Festwerk default. Teams = modal, kein aktiver Pfad.
}

function openTeams() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('open-teams-modal'))
  }
}

export default function ViewSwitch() {
  const pathname  = usePathname()
  const activeIdx = getActiveTab(pathname)
  const [hov, setHov] = useState<number | null>(null)

  // Pill-Position deterministisch über CSS-Variablen — keine layoutId nötig,
  // funktioniert auch wenn die ganze Sidebar-Komponente getauscht wird.
  const pillLeft  = `calc(${(activeIdx / TABS.length) * 100}% + 3px)`
  const pillWidth = `calc(${100 / TABS.length}% - 6px)`

  return (
    <nav style={{
      display: 'flex',
      background: 'rgba(0,0,0,0.055)',
      borderRadius: 10, padding: '3px',
      width: '100%', height: 34, flexShrink: 0,
      position: 'relative',
    }}>
      {/* Active pill — animiert smooth zwischen Tabs */}
      <motion.span
        aria-hidden
        initial={false}
        animate={{ left: pillLeft, width: pillWidth }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: 3, bottom: 3,
          background: 'var(--sidebar-bg)',
          borderRadius: 7,
          boxShadow: '0 1px 5px rgba(0,0,0,0.10)',
          zIndex: 0,
        }}
      />

      {TABS.map((tab, i) => {
        const isActive = i === activeIdx
        const isHov    = hov === i && !isActive

        const inner = (
          <span
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 5, width: '100%', height: '100%',
              borderRadius: 7,
              fontSize: 11, fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--text)' : isHov ? 'var(--text-secondary)' : 'var(--text-muted)',
              whiteSpace: 'nowrap', overflow: 'hidden', minWidth: 0,
              transition: 'color .15s',
              letterSpacing: isActive ? '-.01em' : 0,
              zIndex: 1,
            }}
          >
            {/* Icon — sanftes Tween statt Spring (kein Wobble bei Layout-Wechsel) */}
            <motion.span
              style={{ display: 'flex', alignItems: 'center' }}
              animate={{ scale: isHov ? 1.12 : 1 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab.icon}
            </motion.span>
            {/* Label — nur aktiv, fade-in via Tween */}
            {isActive && (
              <motion.span
                initial={{ opacity: 0, x: -3 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                {tab.label}
              </motion.span>
            )}
          </span>
        )

        const wrap: React.CSSProperties = {
          flex: 1, height: '100%', display: 'block',
          textDecoration: 'none', cursor: 'pointer',
          background: 'transparent', border: 'none', padding: 0,
          fontFamily: 'inherit',
          position: 'relative',
        }

        if (tab.trigger === 'teams') {
          return (
            <button key={tab.label} type="button" onClick={openTeams}
              style={wrap}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
              aria-label="Teams öffnen"
            >
              {inner}
            </button>
          )
        }
        return (
          <Link key={tab.label} href={tab.href!} style={wrap}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
            prefetch
          >
            {inner}
          </Link>
        )
      })}
    </nav>
  )
}
