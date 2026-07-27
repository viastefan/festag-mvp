'use client'

/**
 * DevTagroOrb — the desktop Tagro entry point in the developer portal.
 *
 * Small, quiet, bottom right. The point of the orb is that Tagro never opens
 * empty: it inherits the route you are standing on, so the first thing it
 * reasons about is your current context rather than a blank prompt.
 *
 * The per-route context map now lives in `lib/dev-mobile-nav.ts` so the
 * desktop orb and the mobile bottom-bar Tagro pill share one source of truth.
 * The orb hides on mobile (see `.dv-tagro-fab` in `app/dev/dev-portal.css`)
 * because `DevMobileDock` renders the persistent Tagro pill there.
 */

import { usePathname } from 'next/navigation'
import { Sparkle } from '@phosphor-icons/react'

import { openTagro } from '@/components/TagroOverlay'
import { getDevRouteTagroContext } from '@/lib/dev-mobile-nav'

export default function DevTagroOrb({ hasSignal = false }: { hasSignal?: boolean }) {
  const pathname = usePathname() || ''
  const context = getDevRouteTagroContext(pathname)

  return (
    <button
      type="button"
      className="dv-tagro-fab"
      data-has-signal={hasSignal ? 'true' : 'false'}
      title={`Tagro — ${context.title}`}
      aria-label={`Tagro öffnen, Kontext ${context.title}`}
      onClick={() => openTagro({
        contextType: 'dev_item',
        id: `dev:${pathname}`,
        title: `Tagro — ${context.title}`,
        prefill: context.prefill,
      })}
    >
      <Sparkle size={18} weight="regular" />
    </button>
  )
}
