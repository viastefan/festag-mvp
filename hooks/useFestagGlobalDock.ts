'use client'

import { useEffect, useState } from 'react'
import { DEV_DOCK_BODY_CLASS } from '@/lib/festag-global-dock'

/** True when the Execution Panel shell dock is active on body. */
export function useFestagGlobalDock(): {
  portalDock: boolean
  devDock: boolean
  any: boolean
} {
  const [devDock, setDevDock] = useState(false)

  useEffect(() => {
    function sync() {
      setDevDock(document.body.classList.contains(DEV_DOCK_BODY_CLASS))
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  return { portalDock: false, devDock, any: devDock }
}
