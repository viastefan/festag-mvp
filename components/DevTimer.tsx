'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Floating dev timer — visible only when current user is dev/admin.
 * Tracks time spent on a project. Persists active session in localStorage
 * so refresh doesn't lose state. Stops + records to time_entries table.
 *
 * UI: small floating pill bottom-left of viewport. Click to expand.
 */

type Session = { projectId: string; projectTitle: string; startedAt: number }

interface Props {
  projectId?: string
  projectTitle?: string
  visible?: boolean  // hide on certain pages
}

export default function DevTimer({ projectId, projectTitle, visible = true }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [open,    setOpen]    = useState(false)
  const [show,    setShow]    = useState(false)  // role-gated
  const tickRef = useRef<number | null>(null)
  const sb = createClient()

  // Role gate
  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const { data: p } = await sb.from('profiles').select('role').eq('id', data.session.user.id).single()
      const role = (p as any)?.role
      setShow(role === 'dev' || role === 'admin')
    })
  }, [])

  // Restore active session
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem('festag_dev_timer')
    if (raw) {
      try { setSession(JSON.parse(raw)) } catch {}
    }
  }, [])

  // Tick every second while session active
  useEffect(() => {
    if (!session) {
      if (tickRef.current) clearInterval(tickRef.current)
      tickRef.current = null
      setElapsed(0)
      return
    }
    const update = () => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000))
    update()
    tickRef.current = window.setInterval(update, 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [session])

  function start() {
    if (!projectId || !projectTitle) return
    const s: Session = { projectId, projectTitle, startedAt: Date.now() }
    setSession(s)
    if (typeof window !== 'undefined') window.localStorage.setItem('festag_dev_timer', JSON.stringify(s))
  }

  async function stop() {
    if (!session) return
    const seconds = Math.floor((Date.now() - session.startedAt) / 1000)
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      await sb.from('time_entries').insert({
        user_id: user.id,
        project_id: session.projectId,
        seconds,
        started_at: new Date(session.startedAt).toISOString(),
        ended_at: new Date().toISOString(),
      }).catch(() => {})
    }
    setSession(null); setOpen(false)
    if (typeof window !== 'undefined') window.localStorage.removeItem('festag_dev_timer')
  }

  if (!show || !visible) return null

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  return (
    <>
      <style>{`
        @keyframes dt-pulse-rec { 0%,100%{opacity:1;} 50%{opacity:.45;} }
        @keyframes dt-fade-up { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:none;} }
        .dt-fab { animation: dt-fade-up .25s ease-out both; }
      `}</style>

      {/* Compact floating pill */}
      {!open && (
        <button onClick={() => setOpen(true)} className="dt-fab"
          style={{ position:'fixed', bottom:'calc(18px + env(safe-area-inset-bottom))', left:18, padding:'8px 13px', background: session ? '#dc2626' : 'var(--surface)', color: session ? '#fff' : 'var(--text)', border: session ? 'none' : '1px solid var(--border)', borderRadius:22, fontSize:12, fontWeight:700, fontFamily:'ui-monospace,monospace', cursor:'pointer', display:'flex', alignItems:'center', gap:7, zIndex:9997, boxShadow: session ? '0 6px 24px rgba(220,38,38,.4)' : '0 4px 16px rgba(15,23,42,.1)' }}>
          {session ? (
            <>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#fff', animation:'dt-pulse-rec 1.5s infinite' }}/>
              REC {fmt(elapsed)}
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Timer
            </>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="dt-fab" style={{ position:'fixed', bottom:'calc(18px + env(safe-area-inset-bottom))', left:18, width:280, background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:16, boxShadow:'0 18px 50px rgba(15,23,42,.2)', zIndex:9997, fontFamily:"'Inter',sans-serif" }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <p style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', letterSpacing:'.1em', margin:0 }}>DEV TIMER</p>
            <button onClick={() => setOpen(false)} style={{ width:22, height:22, border:'none', background:'transparent', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {session ? (
            <>
              <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'0 0 6px' }}>läuft für</p>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session.projectTitle}</p>
              <p style={{ fontSize:34, fontWeight:800, color:'#dc2626', margin:'0 0 14px', fontFamily:'ui-monospace,monospace', letterSpacing:'-.5px' }}>
                {fmt(elapsed)}
              </p>
              <button onClick={stop} style={{ width:'100%', padding:'11px', background:'#dc2626', color:'#fff', border:'none', borderRadius:11, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <span style={{ width:9, height:9, background:'#fff', borderRadius:1 }}/>
                Stop &amp; Speichern
              </button>
            </>
          ) : (
            <>
              {projectId ? (
                <>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'0 0 6px' }}>für</p>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 14px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{projectTitle}</p>
                  <button onClick={start} style={{ width:'100%', padding:'11px', background:'#22c55e', color:'#fff', border:'none', borderRadius:11, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                    <span style={{ width:0, height:0, borderLeft:'8px solid #fff', borderTop:'5px solid transparent', borderBottom:'5px solid transparent' }}/>
                    Timer starten
                  </button>
                </>
              ) : (
                <p style={{ fontSize:12, color:'var(--text-muted)', margin:0, lineHeight:1.55 }}>Öffne ein Projekt, um die Zeit zu erfassen.</p>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
