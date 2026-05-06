'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Handshake, House, UsersThree } from '@phosphor-icons/react'

type Tab = {
  label: string
  href?: string                           // wenn nicht gesetzt → onClick (modal)
  trigger?: 'teams'                       // event-basierter Trigger
  icon: React.ReactNode
}

// Reihenfolge: Relations · Festwerk (Mitte) · Teams
const TABS: Tab[] = [
  { label: 'Relations', href: '/relations',   icon: <Handshake  size={13} weight="bold" /> },
  { label: 'Festwerk',  href: '/dashboard',   icon: <House      size={13} weight="bold" /> },
  { label: 'Teams',     trigger: 'teams',     icon: <UsersThree size={13} weight="bold" /> },
]

function getActiveTab(pathname: string): number {
  if (pathname.startsWith('/relations')) return 0
  return 1 // Festwerk default. Teams hat keinen aktiven State (Modal).
}

function openTeams() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('open-teams-modal'))
  }
}

export default function ViewSwitch() {
  const pathname  = usePathname()
  const activeIdx = getActiveTab(pathname)

  // Stabile Höhe + alle Tabs flex:1 → Container reflowt nie.
  // Active Tab zeigt Text, inactive nur Icon (zentriert in seiner Spalte).
  return (
    <nav style={{
      display: 'flex', gap: 2,
      background: 'rgba(0,0,0,0.055)',
      borderRadius: 10, padding: 3,
      width: '100%', height: 32, flexShrink: 0,
      position: 'relative',
    }}>
      {TABS.map((tab, i) => {
        const isActive = i === activeIdx

        const inner = (
          <span
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 5, width: '100%', height: '100%',
              borderRadius: 7,
              fontSize: 11, fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              whiteSpace: 'nowrap', overflow: 'hidden', minWidth: 0,
              transition: 'color .15s',
              letterSpacing: isActive ? '-.01em' : 0,
            }}
          >
            {isActive && (
              <motion.span
                layoutId="vs-pill"
                style={{
                  position: 'absolute', inset: 0,
                  background: 'var(--sidebar-bg)',
                  borderRadius: 7,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                  zIndex: 0,
                }}
                transition={{ type:'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span style={{ position:'relative', display:'flex', alignItems:'center', zIndex: 1 }}>
              {tab.icon}
            </span>
            {isActive && (
              <span style={{ position:'relative', zIndex: 1 }}>{tab.label}</span>
            )}
          </span>
        )

        // Equal-width Spalten — kein Layout-Shift möglich
        const wrap: React.CSSProperties = {
          flex: 1, height: '100%', display: 'block',
          textDecoration: 'none', cursor: 'pointer',
          background: 'transparent', border: 'none', padding: 0,
          fontFamily: 'inherit',
        }

        if (tab.trigger === 'teams') {
          return (
            <button key={tab.label} type="button" onClick={openTeams} style={wrap}>
              {inner}
            </button>
          )
        }
        return (
          <Link key={tab.label} href={tab.href!} style={wrap}>
            {inner}
          </Link>
        )
      })}
    </nav>
  )
}
