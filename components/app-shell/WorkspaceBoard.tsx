'use client'

/**
 * Festag Workspace Board — routes mobile story vs desktop OS layout.
 */

import FestagOverviewCanvas from '@/components/app-shell/overview/FestagOverviewCanvas'
import MobileOverviewStory from '@/components/app-shell/overview/MobileOverviewStory'
import { useMobileViewport } from '@/lib/hooks/useMobileViewport'
import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
  onDecided?: () => void
}

export default function WorkspaceBoard(props: Props) {
  const isMobile = useMobileViewport()
  if (isMobile) return <MobileOverviewStory {...props} />
  return <FestagOverviewCanvas {...props} />
}
