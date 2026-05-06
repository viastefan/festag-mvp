'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const EVENT_ACTOR_COLORS: Record<string,string> = {
  ai:'var(--blue)', dev:'var(--green-dark)', client:'var(--text)', system:'var(--amber)',
}

export default function ActivityPage() {
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'ai'|'dev'|'system'>('all')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href='/login'; return }
      load()
      // Mark all as read
      await supabase.rpc('mark_activity_read')
    })
  }, [])

  async function load() {
    const { data } = await supabase
      .from('activity_feed')
      .select('*, projects(title)')
      .order('created_at', { ascending: false })
      .limit(100)
    setFeed(data ?? [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? feed : feed.filter(f => f.actor_role === filter)

  // Group by date
  const grouped: Record<string, any[]> = {}
  filtered.forEach(item => {
    const d = new Date(item.created_at)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
    let label = d.toLocaleDateString('de', { weekday:'long', day:'2-digit', month:'long' })
    if (d.toDateString() === today.toDateString()) label = 'Heute'
    else if (d.toDateString() === yesterday.toDateString()) label = 'Gestern'
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(item)
  })

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Aktivität</h1>
        <p>Alle Ereignisse in deinen Projekten</p>
      </div>

      {/* Filter pills */}
      <div className="animate-fade-up-1" style={{ display:'flex',gap:6,marginBottom:20,flexWrap:'wrap' }}>
        {([
          { k:'all',    l:`Alle (${feed.length})` },
          { k:'ai',     l:'Tagro AI' },
          { k:'dev',    l:'Developer' },
          { k:'system', l:'System' },
        ] as const).map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding:'7px 14px',borderRadius:12,border:'1px solid var(--border)',
            background: filter===f.k?'var(--accent)':'var(--surface)',
            color: filter===f.k?'var(--accent-text)':'var(--text-secondary)',
            fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s',
          }}>{f.l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex',justifyContent:'center',padding:40 }}>
          <div style={{ width:24,height:24,border:'2px solid var(--border)',borderTopColor:'var(--text)',borderRadius:'50%',animation:'spin .8s linear infinite' }} />
        </div>
      ) : filtered.length===0 ? (
        <div className="animate-fade-up-2" style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',padding:'48px 24px',textAlign:'center' }}>
          <h2 style={{ marginBottom:8 }}>Noch keine Aktivitäten</h2>
          <p style={{ fontSize:14,color:'var(--text-secondary)' }}>Sobald Tasks erstellt, AI-Berichte generiert oder Developer aktiv werden, erscheint es hier.</p>
        </div>
      ) : (
        <div className="animate-fade-up-2">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} style={{ marginBottom:24 }}>
              <p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'.08em',marginBottom:12 }}>{date.toUpperCase()}</p>
              <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',overflow:'hidden',boxShadow:'var(--shadow-xs)' }}>
                {items.map((item, i) => (
                  <div key={item.id} style={{ padding:'14px 20px',borderBottom:i<items.length-1?'1px solid var(--border)':'none',display:'flex',gap:14,alignItems:'flex-start',transition:'background .12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--bg)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:EVENT_ACTOR_COLORS[item.actor_role]||'var(--text-muted)',flexShrink:0,marginTop:6 }} />
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10 }}>
                        <p style={{ fontSize:13.5,fontWeight:600,color:'var(--text)',margin:0,lineHeight:1.4 }}>{item.title}</p>
                        <span style={{ fontSize:11,color:'var(--text-muted)',flexShrink:0,fontFamily:'monospace' }}>
                          {new Date(item.created_at).toLocaleTimeString('de',{ hour:'2-digit',minute:'2-digit' })}
                        </span>
                      </div>
                      <div style={{ display:'flex',gap:8,alignItems:'center',marginTop:5,flexWrap:'wrap' }}>
                        {item.actor_role && (
                          <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:6,background:'var(--surface-2)',color:EVENT_ACTOR_COLORS[item.actor_role]||'var(--text-muted)',letterSpacing:'.04em' }}>
                            {item.actor_role.toUpperCase()}
                          </span>
                        )}
                        {item.projects?.title && (
                          <span style={{ fontSize:11,color:'var(--text-muted)' }}>· {item.projects.title}</span>
                        )}
                        {!item.read_at && (
                          <span style={{ width:6,height:6,borderRadius:'50%',background:'var(--blue)',display:'inline-block' }} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
