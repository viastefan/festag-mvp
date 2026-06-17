'use client'

/**
 * /dev — Developer portal layout.
 *
 * Trägt nur noch die Outer-Shell `DevAppShell` rein. Sämtliche Auth-,
 * Sidebar- und Theme-Logik liegt drüben — diese Datei bleibt absichtlich
 * eine dünne Hülle, damit künftige Layout-Anpassungen zentral landen.
 *
 * Volle Höhe (kein Scroll im Workspace-Container) brauchen die
 * datendichten Routen wie /dev/jobs (Kanban-ähnlich) und /dev/tasks
 * (Drawer mit eigener Scroll-Zone). Für alles andere reicht das default
 * scrollende Layout.
 */

import { usePathname } from 'next/navigation'
import DevAppShell from '@/components/DevAppShell'

export default function DevLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullHeight = pathname === '/dev/jobs' || pathname === '/dev/messages'
  return (
    <DevAppShell isFullHeight={isFullHeight}>
      {children}
    </DevAppShell>
  )
}
