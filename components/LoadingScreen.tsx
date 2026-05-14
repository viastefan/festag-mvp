'use client'

import { useEffect } from 'react'

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
        .festag-loader-spinner {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 2px solid rgba(25,26,28,.18);
          border-top-color: rgba(25,26,28,.82);
          animation: festagLoaderSpin .78s linear infinite;
        }
        @keyframes festagLoaderSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="festag-loader-spinner" aria-label="Lädt" />
    </div>
  )
}
