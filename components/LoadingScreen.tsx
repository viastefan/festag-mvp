'use client'
import { useEffect, useState } from 'react'

const MSGS = ['System startet…','AI wird geladen…','Projekte synchronisiert…','Bereit.']

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0)
  const [mi,  setMi]  = useState(0)

  useEffect(() => {
    const start = Date.now(), dur = 2600
    const iv = setInterval(() => {
      const p = Math.min(100, Math.round((Date.now()-start)/dur*100))
      setPct(p); setMi(Math.min(Math.floor(p/100*MSGS.length), MSGS.length-1))
      if (p>=100) { clearInterval(iv); setTimeout(onDone, 180) }
    }, 20)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ position:'fixed',inset:0,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999 }}>
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',marginBottom:'4vh' }}>
        {/* Logo: 32px, marginBottom 24px — much tighter to bar */}
        <img src="/brand/logo.svg" alt="festag" style={{ height:32,display:'block',marginBottom:24 }} />
        {/* Bar */}
        <div style={{ width:200,height:2,background:'#EEF2F7',borderRadius:2,overflow:'hidden',marginBottom:12 }}>
          <div style={{ height:'100%',width:`${pct}%`,background:'#0F172A',borderRadius:2,transition:'width .025s linear' }} />
        </div>
        {/* Message */}
        <p style={{ fontSize:12,color:'#94A3B8',margin:0,letterSpacing:'.02em',fontFamily:'inherit' }}>{MSGS[mi]}</p>
      </div>
    </div>
  )
}
