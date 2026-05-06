'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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

  return (
    <nav style={{
      display: 'flex',
      background: 'rgba(0,0,0,0.055)',
      borderRadius: 10, padding: '3px',
      width: '100%', height: 34, flexShrink: 0,
      position: 'relative',
    }}>
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
            }}
          >
            {/* Active pill */}
            {isActive && (
              <motion.span
                layoutId="vs-pill"
                style={{
                  position: 'absolute', inset: 0,
                  background: 'var(--sidebar-bg)',
                  borderRadius: 7,
                  boxShadow: '0 1px 5px rgba(0,0,0,0.10)',
                  zIndex: 0,
                }}
                transition={{ type:'spring', stiffness: 320, damping: 28 }}
              />
            )}
            {/* Icon — scales on hover */}
            <motion.span
              style={{ position:'relative', display:'flex', alignItems:'center', zIndex: 1 }}
              animate={{ scale: isHov ? 1.15 : 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            >
              {tab.icon}
            </motion.span>
            {/* Label — only when active */}
            {isActive && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: .18, ease: [.16,1,.3,1] }}
                style={{ position:'relative', zIndex: 1 }}
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
        }

        if (tab.trigger === 'teams') {
          return (
            <button key={tab.label} type="button" onClick={openTeams}
              style={wrap}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            >
              {inner}
            </button>
          )
        }
        return (
          <Link key={tab.label} href={tab.href!} style={wrap}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          >
            {inner}
          </Link>
        )
      })}
    </nav>
  )
}
