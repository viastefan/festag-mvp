'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planning', active: 'In Arbeit',
  testing: 'Testing', done: 'Abgeschlossen',
}

export default function AppHeader({
  copilotOpen,
  onToggleCopilot,
}: {
  copilotOpen: boolean
  onToggleCopilot: () => void
}) {
  const [q,       setQ]       = useState('')
  const [results, setResults] = useState<any[]>([])
  const [open,    setOpen]    = useState(false)
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const router  = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('app-search')?.focus()
      }
      if (e.key === 'Escape') { setOpen(false); setQ('') }
    }
    const outside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', handler)
    document.addEventListener('mousedown', outside)
    return () => {
      document.removeEventListener('keydown', handler)
      document.removeEventListener('mousedown', outside)
    }
  }, [])

  async function search(val: string) {
    setQ(val)
    if (val.trim().length < 1) { setResults([]); setOpen(false); return }
    const sb = createClient()
    const { data } = await sb.from('projects').select('id,title,status').ilike('title', `%${val}%`).limit(6)
    setResults(data ?? [])
    setOpen(true)
  }

  function pick(id: string) {
    setOpen(false); setQ('')
    router.push(`/project/${id}`)
  }

  return (
    <>
      <style>{`
        @media(max-width:768px){
          .ah-search { display:none !important; }
          .ah-cp-label { display:none !important; }
        }
      `}</style>

      <header style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 50,
        height: 56, flexShrink: 0,
      }}>
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div ref={wrapRef} className="ah-search" style={{ position: 'relative', width: 260 }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input id="app-search" value={q} onChange={e => search(e.target.value)}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              placeholder="Projekte suchen…" autoComplete="off"
              style={{ width:'100%', height:36, padding:'0 38px 0 30px', background: focused ? 'var(--surface)' : 'var(--card)', border:`1px solid ${focused ? 'var(--border-strong)' : 'var(--border)'}`, borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'inherit', fontWeight:500, outline:'none', transition:'all .15s' }}
            />
            <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', padding:'2px 5px', borderRadius:5, fontSize:10, fontWeight:600, color:'var(--text-muted)', background:'var(--surface-2)', border:'1px solid var(--border)', pointerEvents:'none' }}>⌘K</span>
          </div>

          {open && results.length > 0 && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'var(--shadow-lg)', overflow:'hidden', zIndex:200 }}>
              {results.map((r, i) => (
                <button key={r.id} onClick={() => pick(r.id)}
                  style={{ width:'100%', padding:'10px 14px', display:'flex', alignItems:'center', gap:10, background:'transparent', border:'none', borderBottom: i < results.length-1 ? '1px solid var(--border)' : 'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'background .1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--card)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width:28, height:28, borderRadius:8, background:'var(--surface-2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--text)', flexShrink:0 }}>
                    {r.title.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>{PHASE_LABEL[r.status] ?? r.status}</p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              ))}
            </div>
          )}
          {open && q.length > 0 && results.length === 0 && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'var(--shadow-lg)', padding:'14px 16px', zIndex:200 }}>
              <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>Kein Projekt für „{q}"</p>
            </div>
          )}
        </div>

        {/* Copilot toggle */}
        <button
          onClick={onToggleCopilot}
          className="tap-scale"
          style={{ height:36, padding:'0 13px', background: copilotOpen ? 'var(--accent)' : 'var(--card)', color: copilotOpen ? 'var(--accent-text)' : 'var(--text-secondary)', border:`1px solid ${copilotOpen ? 'transparent' : 'var(--border)'}`, borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7, transition:'all .15s' }}>
          <span style={{ fontSize:14, lineHeight:1 }}>✦</span>
          <span className="ah-cp-label">Copilot</span>
        </button>



        {/* Theme */}
        <div style={{ height:36, display:'flex', alignItems:'center' }}>
          <ThemeToggle position="relative" />
        </div>
      </header>
    </>
  )
}
