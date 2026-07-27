'use client'

/**
 * StatusPlayerHost — portal-wide mini-player / mobile fab + expand sheet.
 */

import StatusMiniPlayer from '@/components/status/StatusMiniPlayer'
import StatusMobilePlayButton from '@/components/status/StatusMobilePlayButton'
import StatusPlayerSheet from '@/components/status/StatusPlayerSheet'

export default function StatusPlayerHost() {
  return (
    <>
      <StatusMiniPlayer />
      <StatusMobilePlayButton />
      <StatusPlayerSheet />
    </>
  )
}
