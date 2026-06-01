'use client'

/**
 * Donut milestone chart. Shows paid / pending / locked segments and the
 * overall financial progress in the center.
 *
 * Each milestone is one slice; color reflects status:
 *   - paid    → green
 *   - pending → amber (current — to be paid next)
 *   - locked  → gray (future)
 */
export type Milestone = {
  id: string
  title: string
  amount: number
  status: 'paid' | 'pending' | 'locked'
  due_date?: string | null
  description?: string | null
}

const COLORS = {
  paid: '#22c55e',
  pending: '#f59e0b',
  locked: 'rgba(148,163,184,.5)',
}

const STATUS_LABEL = {
  paid: 'Bezahlt',
  pending: 'Fällig',
  locked: 'Gesperrt',
}

export default function MilestoneChart({
  milestones, totalBudget, fixedPriceMode = false,
  onPay,
}: {
  milestones: Milestone[]
  totalBudget?: number
  fixedPriceMode?: boolean
  onPay?: (m: Milestone) => void
}) {
  const total = totalBudget ?? milestones.reduce((s, m) => s + m.amount, 0)
  const paid = milestones.filter(m => m.status === 'paid').reduce((s, m) => s + m.amount, 0)
  const pendingMs = milestones.find(m => m.status === 'pending')

  // Donut math
  const cx = 90, cy = 90, r = 70, sw = 18
  const C = 2 * Math.PI * r

  let offset = 0
  const segments = milestones.map(m => {
    const frac = total > 0 ? m.amount / total : 0
    const len = frac * C
    const seg = { id: m.id, status: m.status, dasharray: `${len} ${C - len}`, dashoffset: -offset, color: COLORS[m.status] }
    offset += len
    return seg
  })

  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0

  return (
    <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'center' }}>
      <style>{`
        @keyframes ms-ring { from{stroke-dashoffset:${C};} to{stroke-dashoffset:var(--off);} }
      `}</style>

      {/* Donut */}
      <div style={{ position:'relative', width:180, height:180, flexShrink:0 }}>
        <svg width={180} height={180} viewBox="0 0 180 180" style={{ transform:'rotate(-90deg)' }}>
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} opacity={0.5}/>
          {/* Segments */}
          {segments.map(s => (
            <circle key={s.id} cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth={sw} strokeLinecap="butt"
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              style={{ transition:'stroke-dashoffset .6s ease, stroke-dasharray .6s ease' }}/>
          ))}
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.06em', margin:0 }}>BEZAHLT</p>
          <p style={{ fontSize:30, fontWeight:800, color:'var(--text)', margin:'4px 0 0', lineHeight:1, letterSpacing:'-.6px' }}>{paidPct}%</p>
          <p style={{ fontSize:11, color:'var(--text-secondary)', margin:'4px 0 0' }}>€{paid.toLocaleString('de')} / €{total.toLocaleString('de')}</p>
        </div>
      </div>

      {/* Legend & details */}
      <div style={{ flex:1, minWidth:240 }}>
        {fixedPriceMode ? (
          <div style={{ padding:'10px 14px', background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.22)', borderRadius:11, marginBottom:14, display:'flex', alignItems:'center', gap:9 }}>
            <span style={{ fontSize:14 }}>💚</span>
            <p style={{ fontSize:12.5, color:'var(--text)', margin:0 }}><strong>Fixpreis-Projekt.</strong> Du hast vorab bezahlt — keine Meilensteine offen.</p>
          </div>
        ) : pendingMs ? (
          <div style={{ padding:'12px 14px', background:'linear-gradient(135deg,rgba(245,158,11,.10),rgba(245,158,11,.02))', border:'1px solid rgba(245,158,11,.3)', borderRadius:12, marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:10.5, fontWeight:800, color:'#d97706', letterSpacing:'.07em' }}>NÄCHSTER MEILENSTEIN</span>
              {pendingMs.due_date && (
                <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>fällig {new Date(pendingMs.due_date).toLocaleDateString('de',{day:'2-digit',month:'short'})}</span>
              )}
            </div>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'0 0 2px' }}>{pendingMs.title}</p>
            <p style={{ fontSize:20, fontWeight:800, color:'#d97706', margin:'0 0 9px', letterSpacing:'-.3px' }}>€{pendingMs.amount.toLocaleString('de')}</p>
            {onPay && (
              <button onClick={() => onPay(pendingMs)} style={{ width:'100%', padding:'9px', background:'#f59e0b', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Jetzt freischalten →
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding:'10px 14px', background:'rgba(106,115,140,.08)', border:'1px solid rgba(106,115,140,.2)', borderRadius:11, marginBottom:14 }}>
            <p style={{ fontSize:12.5, color:'var(--text)', margin:0 }}>🎉 Alle Meilensteine bezahlt — Veyra arbeitet auf Hochtouren.</p>
          </div>
        )}

        <div style={{ display:'flex', gap:14, fontSize:11, color:'var(--text-muted)' }}>
          {(['paid','pending','locked'] as const).map(s => {
            const count = milestones.filter(m => m.status === s).length
            return (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:9, height:9, borderRadius:'50%', background:COLORS[s] }}/>
                <span>{STATUS_LABEL[s]} <strong style={{ color:'var(--text)' }}>{count}</strong></span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const COLORS_EXPORT = COLORS
