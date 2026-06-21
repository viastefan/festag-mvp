'use client'

import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import { useFestagGlobalDock } from '@/hooks/useFestagGlobalDock'

type Props = {
  open: boolean
  onClose: () => void
}

/** Renders MobileNavSheet only when the portal shell dock is not handling navigation. */
export default function PortalMobileNavSheet({ open, onClose }: Props) {
  const { portalDock } = useFestagGlobalDock()
  if (portalDock) return null
  return <MobileNavSheet open={open} onClose={onClose} />
}
