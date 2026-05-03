'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Handshake, House, UsersThree, List, X } from '@phosphor-icons/react'

type ViewTab = {
  label: string
  href: string
  match: string[]
  icon: React.ReactNode
}

const TABS: ViewTab[] = [
  {
    label: 'Relations',
    href: '/relations',
    match: ['/relations'],
    icon: <Handshake size={16} weight="bold" />,
  },
  {
    label: 'Festwerk',
    href: '/dashboard',
    match: ['/dashboard', '/project', '/messages', '/teams', '/activity', '/ai', '/documents', '/reports', '/estimator', '/pricing', '/connectors', '/addons', '/billing', '/settings', '/new-project', '/invite'],
    icon: <House size={16} weight="bold" />,
  },
  {
    label: 'Teams',
    href: '/teams',
    match: ['/teams'],
    icon: <UsersThree size={16} weight="bold" />,
  },
]

function getActiveTab(pathname: string): number {
  // Relations match first (most specific)
  if (pathname.startsWith('/relations')) return 0
  // Teams only when exactly /teams (not inside Festwerk context)
  // For now, Teams shares with Festwerk since /teams is inside (app)
  // Default to Festwerk for all (app) routes
  return 1
}

export default function ViewSwitch() {
  const pathname = usePathname()
  const activeIdx = getActiveTab(pathname)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop: horizontal tabs */}
      <nav className="view-switch-desktop" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 3,
        position: 'relative',
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
                gap: 6,
                padding: '6px 14px',
                borderRadius: 9,
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                textDecoration: 'none',
                transition: 'color .15s',
                zIndex: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="viewswitch-bg"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--nav-on)',
                    borderRadius: 9,
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {tab.icon}
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {/* Mobile: dropdown trigger */}
      <div className="view-switch-mobile">
        <button
          onClick={() => setMobileOpen(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {mobileOpen ? <X size={16} weight="bold" /> : <List size={16} weight="bold" />}
          {TABS[activeIdx].label}
        </button>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: .15 }}
                onClick={() => setMobileOpen(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 299,
                  background: 'rgba(0,0,0,.3)',
                }}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: .96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: .96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 6,
                  zIndex: 300,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  boxShadow: 'var(--shadow-lg)',
                  padding: 6,
                  minWidth: 180,
                }}
              >
                {TABS.map((tab, i) => {
                  const isActive = i === activeIdx
                  return (
                    <Link
                      key={tab.label}
                      href={tab.href}
                      onClick={() => setMobileOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--text)' : 'var(--text-secondary)',
                        background: isActive ? 'var(--nav-on)' : 'transparent',
                        textDecoration: 'none',
                        transition: 'background .12s',
                      }}
                    >
                      {tab.icon}
                      {tab.label}
                    </Link>
                  )
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .view-switch-desktop { display: flex; }
        .view-switch-mobile { display: none; position: relative; }
        @media (max-width: 768px) {
          .view-switch-desktop { display: none !important; }
          .view-switch-mobile { display: block !important; }
        }
      `}</style>
    </>
  )
}
