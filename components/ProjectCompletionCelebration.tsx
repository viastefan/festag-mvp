'use client'

import { useEffect, useState } from 'react'

/**
 * Full-screen celebration overlay shown when a project transitions to 'done'.
 * - Confetti burst (CSS only, no library)
 * - Animated trophy + sparkle ring
 * - Project title + delivery date
 * - "Weiter zur Übergabe" CTA
 *
 * Lightweight: 60 confetti pieces, all CSS animations, GPU accelerated.
 */

interface Props {
  open: boolean
  projectTitle: string
  onClose: () => void
  onContinue?: () => void
  duration?: number  // ms before auto-fadeout, 0 = manual close
  deliveryDate?: string
}

const CONFETTI_COLORS = ['#0A0B0A','#34C759','#0EA5E9','#F59E0B','#94A3B8','#14B8A6','#64748B','#28A745']

export default function ProjectCompletionCelebration({ open, projectTitle, onClose, onContinue, duration=0, deliveryDate }: Props) {
  const [visible, setVisible] = useState(false)
  const [confetti] = useState(() =>
    Array.from({ length: 60 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      dur: 2 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rot: Math.random() * 360,
      drift: (Math.random() - 0.5) * 200,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
    }))
  )

  useEffect(() => {
    if (!open) { setVisible(false); return }
    setVisible(true)
    if (duration > 0) {
      const t = setTimeout(() => onClose(), duration)
      return () => clearTimeout(t)
    }
  }, [open, duration, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Projekt abgeschlossen"
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'radial-gradient(circle at 50% 30%, rgba(99,102,241,.18), rgba(15,23,42,.85) 70%)',
        backdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        opacity: visible ? 1 : 0,
        transition:'opacity .35s ease',
        fontFamily:"'Inter',-apple-system,sans-serif",
      }}>
      <style>{`
        @keyframes cf-fall {
          0% { transform: translate3d(0,-20vh,0) rotate(0deg); opacity:1; }
          100% { transform: translate3d(var(--drift),100vh,0) rotate(var(--rot)); opacity:0; }
        }
        @keyframes pcc-trophy-pop {
          0% { transform: scale(.4) rotate(-15deg); opacity:0; }
          60% { transform: scale(1.18) rotate(8deg); opacity:1; }
          100% { transform: scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes pcc-ring {
          0% { transform: scale(.3); opacity:1; }
          100% { transform: scale(2.4); opacity:0; }
        }
        @keyframes pcc-fade-up {
          from { opacity:0; transform: translateY(16px); }
          to { opacity:1; transform: none; }
        }
        @keyframes pcc-shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        @keyframes pcc-spark-orbit {
          from { transform: rotate(0deg) translateX(110px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(110px) rotate(-360deg); }
        }
        .pcc-piece {
          position:absolute; top:-20vh; width:9px; height:9px;
          animation: cf-fall var(--dur) cubic-bezier(.18,.4,.7,1) var(--delay) forwards;
        }
        .pcc-piece.circle { border-radius:50%; }
      `}</style>

      {/* Confetti rain */}
      {confetti.map((c, i) => (
        <span key={i}
          className={`pcc-piece ${c.shape}`}
          style={{
            left: `${c.left}%`,
            background: c.color,
            // @ts-expect-error CSS vars
            '--dur': `${c.dur}s`,
            '--delay': `${c.delay}s`,
            '--drift': `${c.drift}px`,
            '--rot': `${c.rot}deg`,
          }}/>
      ))}

      {/* Sparkle orbit ring */}
      <div style={{ position:'absolute', width:0, height:0, top:'50%', left:'50%', marginTop:-180 }}>
        {[0,1,2,3,4].map(i => (
          <span key={i} style={{
            position:'absolute',
            width:8, height:8,
            borderRadius:'50%',
            background:'#fff',
            boxShadow:'0 0 16px #fff, 0 0 32px rgba(167,139,250,.7)',
            animation: `pcc-spark-orbit 3.6s linear infinite ${i * 0.72}s`,
            transformOrigin:'-110px 0',
          }}/>
        ))}
      </div>

      <div style={{
        position:'relative', maxWidth:440, width:'92%',
        padding:'48px 32px 28px',
        background:'linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        border:'1px solid rgba(255,255,255,.12)',
        borderRadius:24,
        textAlign:'center',
        boxShadow:'0 30px 80px rgba(0,0,0,.4)',
        animation:'pcc-fade-up .6s .15s cubic-bezier(.16,1,.3,1) both',
      }}>
        {/* Pulsing ring behind trophy */}
        <div style={{ position:'absolute', top:48, left:'50%', width:118, height:118, marginLeft:-59, borderRadius:'50%', border:'2px solid rgba(52,199,89,.45)', animation:'pcc-ring 2.4s ease-out infinite' }}/>
        <div style={{ position:'absolute', top:48, left:'50%', width:118, height:118, marginLeft:-59, borderRadius:'50%', border:'2px solid rgba(52,199,89,.45)', animation:'pcc-ring 2.4s ease-out 1.2s infinite' }}/>

        {/* Trophy */}
        <div style={{
          width:118, height:118, margin:'0 auto 20px',
          borderRadius:'50%',
          background:'linear-gradient(135deg, #34C759, #28A745)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:54,
          boxShadow:'0 20px 60px rgba(52,199,89,.4), inset 0 -4px 12px rgba(0,0,0,.2)',
          animation:'pcc-trophy-pop .8s cubic-bezier(.16,1.3,.3,1) both',
          position:'relative',
        }}>
          🏆
        </div>

        <p style={{
          fontSize:11, fontWeight:800, letterSpacing:'.18em',
          color:'#34C759', margin:'0 0 6px',
          animation:'pcc-fade-up .5s .35s both',
        }}>PROJEKT GELIEFERT</p>

        <h1 style={{
          fontSize:30, fontWeight:800, letterSpacing:'-.6px',
          color:'#fff', margin:'0 0 12px', lineHeight:1.1,
          animation:'pcc-fade-up .5s .45s both',
        }}>
          Geschafft! 🎉
        </h1>

        <p style={{
          fontSize:15, color:'rgba(255,255,255,.78)', lineHeight:1.55,
          margin:'0 0 6px',
          animation:'pcc-fade-up .5s .55s both',
        }}>
          <strong style={{ color:'#fff' }}>{projectTitle}</strong> ist fertig.<br/>
          Tagro AI hat alles dokumentiert.
        </p>

        {deliveryDate && (
          <p style={{
            fontSize:12, color:'rgba(255,255,255,.55)',
            margin:'0 0 26px',
            animation:'pcc-fade-up .5s .65s both',
          }}>
            Lieferung: {new Date(deliveryDate).toLocaleDateString('de', { day:'2-digit', month:'long', year:'numeric' })}
          </p>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:9, animation:'pcc-fade-up .5s .75s both' }}>
          {onContinue && (
            <button onClick={onContinue} style={{
              width:'100%', padding:'14px',
              background:'linear-gradient(135deg, #34C759, #28A745)',
              backgroundSize:'200% 100%',
              animation:'pcc-shimmer 3s linear infinite',
              color:'#fff', border:'none', borderRadius:13,
              fontSize:14, fontWeight:800, cursor:'pointer',
              fontFamily:'inherit', letterSpacing:'.02em',
              boxShadow:'0 10px 30px rgba(99,102,241,.4)',
            }}>
              Übergabe-Bericht öffnen →
            </button>
          )}
          <button onClick={onClose} style={{
            width:'100%', padding:'11px',
            background:'transparent',
            color:'rgba(255,255,255,.65)', border:'1px solid rgba(255,255,255,.12)',
            borderRadius:13, fontSize:13, fontWeight:600, cursor:'pointer',
            fontFamily:'inherit',
          }}>
            Später
          </button>
        </div>
      </div>
    </div>
  )
}
