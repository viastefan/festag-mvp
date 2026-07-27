'use client'

/**
 * Execution Panel Tagro entry — right-side FAB with route-aware context.
 * Complements TagroFocusComposeBar (field focus) and transmit CTAs.
 * Hidden on mobile: DevMobileDock already exposes Tagro as secondary.
 */

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import TagroContentFab from '@/components/TagroContentFab'
import { getDevRouteTagroContext } from '@/lib/dev-mobile-nav'

export default function DevTagroFab() {
  const pathname = usePathname() || '/dev'
  const route = useMemo(() => getDevRouteTagroContext(pathname), [pathname])

  return (
    <>
      <TagroContentFab
        position="fixed"
        className="dv-tagro-fab"
        context={{
          contextType: 'dev_item',
          id: `dev:${pathname}`,
          title: `Tagro — ${route.title}`,
          prefill: route.prefill,
        }}
        ariaLabel={`Mit Tagro, ${route.title}`}
        title={route.prefill}
      />
      <style jsx global>{`
        /* Desktop only — mobile dock secondary is Tagro. */
        @media (max-width: 900px) {
          .dv-tagro-fab.festag-content-fab {
            display: none !important;
          }
        }
        html[data-theme-surface='dev'] .dv-tagro-fab.festag-content-fab {
          right: max(20px, calc(env(safe-area-inset-right, 0px) + 16px));
          bottom: max(20px, calc(env(safe-area-inset-bottom, 0px) + 16px));
        }
      `}</style>
    </>
  )
}
