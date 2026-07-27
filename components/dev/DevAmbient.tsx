'use client'

/**
 * Execution Panel atmosphere — remounts per route for a fresh pattern shuffle
 * on top of the shared directional veils.
 */

import FestagAmbient from '@/components/ambient/FestagAmbient'

export default function DevAmbient({ routeKey }: { routeKey: string }) {
  return <FestagAmbient key={routeKey} surface="dev-panel" />
}
