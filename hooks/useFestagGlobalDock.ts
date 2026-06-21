'use client'

import { useEffect, useState } from 'react'
import {
  DEV_DOCK_BODY_CLASS,
  PORTAL_DOCK_BODY_CLASS,
} from '@/lib/festag-global-dock'

/** True when a shell-level mobile dock is active on body. */
export function useFestagGlobalDock(): {
  portalDock: boolean
  devDock: boolean
  any: boolean
} {
  const [portalDock, setPortalDock] = useState(false)
  const [devDock, setDevDock] = useState(false)

  useEffect(() => {
    function sync() {
      setPortalDock(document.body.classList.contains(PORTAL_DOCK_BODY_CLASS))
      setDevDock(document.body.classList.contains(DEV_DOCK_BODY_CLASS))
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  return { portalDock, devDock, any: portalDock || devDock }
}
