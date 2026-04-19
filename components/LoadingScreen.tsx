'use client'
import { useEffect, useState } from 'react'

const MESSAGES = ['Initializing system…', 'Structuring intelligence…', 'Preparing your workspace…']

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgIv = setInterval(() => setMsgIdx(i => Math.min(i + 1, MESSAGES.length - 1)), 1000)
    const progIv = setInterval(() => setProgress(p => Math.min(p + 2.2, 100)), 65)
    const done = setTimeout(onDone, 3000)
    return () => { clearInterval(msgIv); clearInterval(progIv); clearTimeout(done) }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <img src="/brand/logo.svg" alt="festag" style={{ height: 22, marginBottom: 40 }} />
      <div style={{ width: 200, height: 2, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--text)', borderRadius: 2, transition: 'width 0.1s linear' }} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.04em' }} key={msgIdx}>{MESSAGES[msgIdx]}</p>
    </div>
  )
}
