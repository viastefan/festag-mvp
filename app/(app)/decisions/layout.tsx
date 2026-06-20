'use client'

import { usePathname } from 'next/navigation'
import DecisionsShell from '@/components/decisions/DecisionsShell'
import DecisionsRouteEffects from '@/components/decisions/DecisionsRouteEffects'

export default function DecisionsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''

  return (
    <DecisionsShell>
      <DecisionsRouteEffects />
      {/* Bust Next.js router-cache client state when switching list ↔ detail. */}
      <div
        key={pathname}
        className="dec-route-page"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </div>
    </DecisionsShell>
  )
}
