'use client'
import { useEffect, useState } from 'react'

const MSGS = [
  'System startet…',
  'AI wird geladen…',
  'Projekte werden synchronisiert…',
  'Bereit.',
]

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [msgIdx,   setMsgIdx]   = useState(0)

  useEffect(() => {
    const start    = Date.now()
    const duration = 2600
    const iv = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, Math.round((elapsed / duration) * 100))
      setProgress(pct)
      setMsgIdx(Math.min(Math.floor(pct / 100 * MSGS.length), MSGS.length - 1))
      if (pct >= 100) { clearInterval(iv); setTimeout(onDone, 180) }
    }, 20)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      {/*
        Premium layout:
        - Logo + bar + message form a tight group
        - Group sits at visual center (slightly above mathematical center)
        - Golden ratio: ~38% from top feels right
      */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        /* Push slightly above center for visual balance */
        marginBottom: '6vh',
      }}>
        {/* Logo */}
        <img
          src="/brand/logo.svg"
          alt="festag"
          style={{ height: 32, display: 'block', marginBottom: 36 }}
        />

        {/* Progress bar — tight to logo */}
        <div style={{
          width: 220,
          height: 2,
          background: '#EEF2F7',
          borderRadius: 2,
          overflow: 'hidden',
          marginBottom: 14,
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#0F172A',
            borderRadius: 2,
            transition: 'width .025s linear',
          }} />
        </div>

        {/* Message */}
        <p style={{
          fontSize: 12,
          color: '#94A3B8',
          margin: 0,
          letterSpacing: '.02em',
          fontFamily: 'inherit',
          height: 16,
          transition: 'opacity .2s',
        }}>
          {MSGS[msgIdx]}
        </p>
      </div>
    </div>
  )
}
