'use client'
import { useEffect, useState } from 'react'

const MESSAGES = [
  'Initializing system…',
  'Structuring intelligence…',
  'Preparing your workspace…',
]

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgIv = setInterval(() => setMsgIdx(i => Math.min(i + 1, MESSAGES.length - 1)), 1000)
    const progIv = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 60)
    const done = setTimeout(onDone, 3000)
    return () => { clearInterval(msgIv); clearInterval(progIv); clearTimeout(done) }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s' }}>
      <img src="/brand/logo.svg" alt="festag" style={{ height: 24, marginBottom: 40 }} />
      <div style={{ width: 200, height: 2, background: '#F2F4F7', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #007AFF, #5856D6)', transition: 'width 0.1s linear' }} />
      </div>
      <p style={{ fontSize: 12, color: '#9BA3B2', letterSpacing: '0.04em', animation: 'fadeIn 0.3s' }} key={msgIdx}>
        {MESSAGES[msgIdx]}
      </p>
    </div>
  )
}
