'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Handshake, House, UsersThree } from '@phosphor-icons/react'

type ViewTab = {
  label: string
  href: string
  icon: React.ReactNode
}

// Client-Portal hat 3 Bereiche.
// Developer-Portal ist ein komplett getrenntes Portal (/dev).
const TABS: ViewTab[] = [
  {
    label: 'Festwerk',
    href: '/dashboard',
    icon: <House size={13} weight="bold" />,
  },
  {
    label: 'Relations',
    href: '/relations',
    icon: <Handshake size={13} weight="bold" />,
  },
  {
    label: 'Teams',
    href: '/teams',
    icon: <UsersThree size={13} weight="bold" />,
  },
]

function getActiveTab(pathname: string): number {
  if (pathname.startsWith('/relations')) return 1
  if (pathname === '/teams' || pathname.startsWith('/teams/')) return 2
  return 0 // Festwerk (Dashboard, Projekte, Nachrichten, etc.)
}

export default function ViewSwitch() {
  const pathname  = usePathname()
  const activeIdx = getActiveTab(pathname)

  return (
    <nav style={{
      display: 'flex',
      gap: 2,
      background: 'var(--surface-2)',
      borderRadius: 10,
      padding: 3,
      width: '100%',
      height: 34,
      flexShrink: 0,
    }}>
      {TABS.map((tab, i) => {
        const isActive = i === activeIdx
        return (
          <Link
            key={tab.label}
            href={tab.href}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              flex: 1,
              borderRadius: 7,
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              textDecoration: 'none',
              zIndex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              letterSpacing: isActive ? '-.01em' : '0',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="viewswitch-pill"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--surface)',
                  borderRadius: 7,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                  zIndex: -1,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              />
            )}
            {tab.icon}
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
