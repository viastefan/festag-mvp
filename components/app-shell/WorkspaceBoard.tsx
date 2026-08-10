'use client'

/**
 * Festag Workspace Board.
 *
 * One real page, not two products: the old mobile "story" (voice narration,
 * animated ink path, full-bleed star field) has been retired — it read as a
 * tech demo, not a working screen, and buried the actual report under a
 * decorative canvas. FestagOverviewCanvas's own responsive breakpoints
 * (see festag-flow-styles.ts) stack report → inbox on narrow viewports.
 */

import FestagOverviewCanvas from '@/components/app-shell/overview/FestagOverviewCanvas'
import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
  onDecided?: () => void
}

export default function WorkspaceBoard(props: Props) {
  return <FestagOverviewCanvas {...props} />
}
