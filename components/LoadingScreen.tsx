'use client'

import { useEffect } from 'react'
import FestagWorkingDots from '@/components/FestagWorkingDots'

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const doneTimer = window.setTimeout(onDone, 900)
    return () => {
      window.clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div className="festag-loader" aria-live="polite">
      <style>{`
        .festag-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100dvh;
          width: 100%;
          background: transparent;
        }
      `}</style>
      <FestagWorkingDots size="lg" label="Lädt" />
    </div>
  )
}
