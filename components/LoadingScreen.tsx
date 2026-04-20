'use client'
import { useEffect, useState } from 'react'

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [msg, setMsg] = useState('System startet…')
  const MSGS = ['System startet…', 'AI wird geladen…', 'Projekte werden synchronisiert…', 'Bereit.']

  useEffect(() => {
    const start = Date.now()
    const duration = 2800
    const iv = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, Math.round((elapsed / duration) * 100))
      setProgress(pct)
      const mi = Math.floor(pct / 100 * (MSGS.length - 1))
      setMsg(MSGS[Math.min(mi, MSGS.length - 1)])
      if (pct >= 100) { clearInterval(iv); setTimeout(onDone, 200) }
    }, 24)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ position:'fixed',inset:0,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,flexDirection:'column',gap:0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      {/* LARGER LOGO on loading screen */}
      <img src="/brand/logo.svg" alt="festag" style={{ height:34,marginBottom:48,display:'block' }} />
      <div style={{ width:240,height:2,background:'#F1F5F9',borderRadius:2,overflow:'hidden',marginBottom:16 }}>
        <div style={{ height:'100%',width:`${progress}%`,background:'#0F172A',borderRadius:2,transition:'width .06s linear' }} />
      </div>
      <p style={{ fontSize:12,color:'#94A3B8',margin:0,height:18,letterSpacing:'.02em' }}>{msg}</p>
    </div>
  )
}
