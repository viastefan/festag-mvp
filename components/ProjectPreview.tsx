'use client'

interface Props {
  title: string
  color?: string | null
  progress?: number
  width?: number | string
  height?: number | string
  variant?: 'card' | 'compact'
}

export default function ProjectPreview({
  title,
  color,
  progress = 0,
  width = '100%',
  height = 200,
  variant = 'card',
}: Props) {
  const c = color || '#64748b'
  const initial = (title || '·').charAt(0).toUpperCase()

  return (
    <div style={{
      position: 'relative',
      width, height,
      borderRadius: variant === 'compact' ? 8 : 12,
      overflow: 'hidden',
      background: `radial-gradient(circle at 28% 35%, ${c}38 0%, ${c}10 38%, var(--card) 75%)`,
      border: '1px solid var(--border)',
    }}>
      {/* Soft grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${c}0c 1px, transparent 1px), linear-gradient(90deg, ${c}0c 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        opacity: .55,
        maskImage: 'radial-gradient(circle at 30% 35%, black 10%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(circle at 30% 35%, black 10%, transparent 75%)',
      }}/>

      {/* Concentric arcs */}
      <svg viewBox="0 0 200 200" style={{ position:'absolute', right:-60, bottom:-60, width: 280, height: 280, opacity:.32 }}>
        {[80, 60, 40, 20].map((r, i) => (
          <circle key={r} cx="100" cy="100" r={r}
            fill="none" stroke={c} strokeWidth={i === 0 ? 1.5 : 1}
            opacity={i === 0 ? .6 : .35}
            strokeDasharray={i % 2 ? '2 4' : undefined}
          />
        ))}
      </svg>

      {/* Initial */}
      <div style={{
        position:'absolute', top: 16, left: 18,
        fontSize: variant === 'compact' ? 22 : 38,
        fontWeight: 800, letterSpacing:'-.04em',
        color: c,
        opacity: .92,
        lineHeight: 1,
      }}>
        {initial}
      </div>

      {/* Progress bar at bottom */}
      {progress > 0 && (
        <div style={{
          position:'absolute', bottom: 0, left: 0, right: 0,
          height: 3, background: `${c}1a`,
        }}>
          <div style={{
            height:'100%', width: `${Math.min(100, progress)}%`,
            background: c, transition:'width .8s cubic-bezier(.16,1,.3,1)'
          }}/>
        </div>
      )}

      {/* Tiny label bottom-left */}
      {variant === 'card' && (
        <div style={{
          position:'absolute', bottom: 12, left: 14,
          fontSize: 10, fontWeight: 600,
          letterSpacing:'.08em', textTransform:'uppercase',
          color: c, opacity:.75,
        }}>
          {progress}% · {title.length > 22 ? title.slice(0, 22) + '…' : title}
        </div>
      )}
    </div>
  )
}
