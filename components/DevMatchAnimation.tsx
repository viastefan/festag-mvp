'use client'

import { useState, useEffect } from 'react'
import { Buildings, Sparkle } from '@phosphor-icons/react'

/**
 * Three-mode dev assignment visualization:
 *   1. 'pool'    — multiple festag devs orbit, one is highlighted as match
 *   2. 'internal'— direct connection (closed-system: company's own dev)
 *   3. 'invited' — pending state while waiting for invitation accept
 *
 * Animation cycles through "scanning candidates" → "match found" → "assigned"
 */

type Dev = {
  id: string
  name: string
  avatar?: string
  initial?: string
  skills?: string[]
}

interface Props {
  mode: 'pool' | 'internal' | 'invited'
  candidates?: Dev[]   // pool of devs to show orbiting
  matched?: Dev | null // the chosen one (when known)
  status?: 'scanning' | 'matched' | 'assigned'
  client?: { name?: string; avatar?: string }
}

export default function DevMatchAnimation({ mode, candidates=[], matched=null, status='scanning', client }: Props) {
  const [phase, setPhase] = useState<'scanning'|'matched'|'assigned'>(status)

  useEffect(() => {
    if (status === 'matched' && phase === 'scanning') {
      const t = setTimeout(() => setPhase('matched'), 2200)
      return () => clearTimeout(t)
    }
    setPhase(status)
  }, [status])

  const angles = candidates.length > 0
    ? candidates.map((_, i) => (360 / candidates.length) * i)
    : []

  return (
    <div style={{ position:'relative', width:'100%', maxWidth:480, height:340, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{`
        @keyframes dm-orbit { from{transform:rotate(0deg) translateX(120px) rotate(0deg);} to{transform:rotate(360deg) translateX(120px) rotate(-360deg);} }
        @keyframes dm-pulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(99,102,241,.5);} 50%{transform:scale(1.04);box-shadow:0 0 0 16px rgba(99,102,241,0);} }
        @keyframes dm-line  { 0%{stroke-dashoffset:240;opacity:0;} 30%{opacity:1;} 100%{stroke-dashoffset:0;opacity:1;} }
        @keyframes dm-pop   { from{transform:scale(0);opacity:0;} 60%{transform:scale(1.15);opacity:1;} to{transform:scale(1);opacity:1;} }
        @keyframes dm-fade  { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:none;} }
        @keyframes dm-radar { 0%{transform:scale(.4);opacity:.85;} 100%{transform:scale(2.5);opacity:0;} }
        .dm-center { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:78px; height:78px; border-radius:50%; background:var(--btn-prim); display:flex; align-items:center; justify-content:center; color:var(--btn-prim-text); font-size:24px; font-weight:800; z-index:5; box-shadow:0 12px 40px var(--glow); border:3px solid var(--surface); }
        .dm-radar-ring { position:absolute; left:50%; top:50%; width:80px; height:80px; transform:translate(-50%,-50%); border-radius:50%; border:2px solid var(--border-strong); animation:dm-radar 2s ease-out infinite; }
        .dm-orbit-ring { position:absolute; left:50%; top:50%; width:240px; height:240px; transform:translate(-50%,-50%); border-radius:50%; border:1.5px dashed var(--border); }
        .dm-cand { position:absolute; left:50%; top:50%; width:56px; height:56px; margin-left:-28px; margin-top:-28px; border-radius:50%; background:var(--card); border:2px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:var(--text); transition:all .6s cubic-bezier(.16,1,.3,1); }
        .dm-cand.matched { background:var(--green); color:var(--surface); border-color:var(--surface); box-shadow:0 8px 28px var(--green-bg); animation:dm-pulse 1.6s ease-in-out infinite; z-index:6; }
        .dm-cand.dim { opacity:.25; transform-origin:center; }
        .dm-line { stroke:var(--green); stroke-width:2; stroke-dasharray:240; fill:none; animation:dm-line 1s ease-out forwards; }
        .dm-pop  { animation:dm-pop .55s cubic-bezier(.16,1,.3,1) both; }
      `}</style>

      {/* Center (client or system) */}
      <div className="dm-radar-ring"/>
      <div className="dm-center">
        {client?.avatar ? <img src={client.avatar} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }}/> :
         client?.name ? <span>{client.name.charAt(0).toUpperCase()}</span> :
         <Buildings size={30} weight="regular" />}
      </div>

      {/* Mode-specific rendering */}
      {mode === 'pool' && (
        <>
          <div className="dm-orbit-ring"/>
          {candidates.map((d, i) => {
            const angle = angles[i]
            const x = 120 * Math.cos((angle - 90) * Math.PI/180)
            const y = 120 * Math.sin((angle - 90) * Math.PI/180)
            const isMatch = matched?.id === d.id && phase !== 'scanning'
            const dim = matched && !isMatch && phase !== 'scanning'
            return (
              <div key={d.id} className={`dm-cand ${isMatch?'matched':''} ${dim?'dim':''}`}
                style={{ transform: `translate(${x}px, ${y}px)` }}>
                {d.avatar ? <img src={d.avatar} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }}/> : (d.initial ?? d.name.charAt(0).toUpperCase())}
                {isMatch && (
                  <div className="dm-pop" style={{ position:'absolute', top:-8, right:-8, width:22, height:22, background:'#22c55e', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {mode === 'internal' && matched && (
        <>
          {/* Direct connection — single dev with line */}
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
            <line className="dm-line" x1="50%" y1="50%" x2="80%" y2="50%"/>
          </svg>
          <div className="dm-cand matched" style={{ position:'absolute', left:'80%', top:'50%', transform:'translate(-50%,-50%) scale(1.15)' }}>
            {matched.avatar ? <img src={matched.avatar} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }}/> : (matched.initial ?? matched.name.charAt(0).toUpperCase())}
          </div>
          <p style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', fontSize:12.5, color:'var(--text-muted)', textAlign:'center', margin:0, fontWeight:600, animation:'dm-fade .5s .8s both' }}>
            <strong style={{ color:'var(--text)' }}>{matched.name}</strong> · Geschlossenes System
          </p>
        </>
      )}

      {mode === 'invited' && (
        <p style={{ position:'absolute', bottom:30, left:'50%', transform:'translateX(-50%)', fontSize:13, color:'var(--text-muted)', textAlign:'center', margin:0, fontWeight:600 }}>
          Einladung versendet — warte auf Bestätigung…
        </p>
      )}

      {phase === 'scanning' && mode === 'pool' && (
        <p style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', fontSize:13, color:'var(--text-muted)', textAlign:'center', margin:0, fontWeight:600 }}>
          Tagro analysiert {candidates.length} Festag-Developer…
        </p>
      )}
      {phase === 'matched' && matched && mode === 'pool' && (
        <p className="dm-pop" style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', fontSize:13.5, color:'var(--text)', textAlign:'center', margin:0, fontWeight:700 }}>
          <Sparkle size={14} weight="fill" style={{ color:'#22c55e', verticalAlign:'-2px', marginRight:5 }} />Dein Match: <span style={{ color:'#22c55e' }}>{matched.name}</span>
        </p>
      )}
    </div>
  )
}
