'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Handshake, House } from '@phosphor-icons/react'

const TABS = [
  { label: 'Festwerk',  href: '/dashboard',  icon: <House     size={13} weight="bold" /> },
  { label: 'Relations', href: '/relations',   icon: <Handshake size={13} weight="bold" /> },
]

function getActiveTab(pathname: string): number {
  if (pathname.startsWith('/relations')) return 1
  return 0
}

export default function ViewSwitch() {
  const pathname  = usePathname()
  const activeIdx = getActiveTab(pathname)

  return (
    <nav style={{
      display: 'flex', gap: 2,
      background: 'rgba(0,0,0,0.055)',
      borderRadius: 10, padding: 3,
      width: '100%', height: 34, flexShrink: 0,
    }}>
      {TABS.map((tab, i) => {
        const isActive = i === activeIdx
        return (
          <Link key={tab.label} href={tab.href} style={{
            position: 'relative', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 5, flex: 1, borderRadius: 7,
            fontSize: 11.5, fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--text)' : 'var(--text-muted)',
            textDecoration: 'none', zIndex: 1, whiteSpace: 'nowrap',
          }}>
            {isActive && (
              <motion.div layoutId="vs-pill"
                style={{ position:'absolute', inset:0, background:'var(--sidebar-bg)', borderRadius:7, boxShadow:'0 1px 4px rgba(0,0,0,0.10)', zIndex:-1 }}
                transition={{ type:'spring', stiffness:380, damping:28 }}
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
