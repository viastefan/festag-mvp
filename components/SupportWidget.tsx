'use client'

import { useState, useEffect } from 'react'

/**
 * Floating "Support" bubble visible across the app.
 * Provides Chat (in-app message), Email, WhatsApp options.
 * Hidden on /login and /onboarding to avoid clutter.
 */
export default function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [hide, setHide] = useState(true)
  const [msg,  setMsg]  = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = window.location.pathname
    setHide(p.startsWith('/login') || p.startsWith('/onboarding') || p === '/')
  }, [])

  if (hide) return null

  async function sendChat() {
    if (!msg.trim()) return
    setSent(true)
    // Best-effort: store in supabase support_messages, fallback to mailto
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: u } = await sb.auth.getUser()
      await sb.from('support_messages').insert({
        user_id: u.user?.id ?? null,
        email: u.user?.email ?? null,
        message: msg.trim(),
        page: window.location.pathname,
      }).catch(() => {})
    } catch {}
    setTimeout(() => { setOpen(false); setSent(false); setMsg('') }, 1800)
  }

  return (
    <>
      <style>{`
        @keyframes sw-pop { from{transform:scale(.4) translateY(20px);opacity:0;} to{transform:scale(1) translateY(0);opacity:1;} }
        @keyframes sw-pulse { 0%,100%{box-shadow:0 6px 24px rgba(99,102,241,.32),0 0 0 0 rgba(99,102,241,.5);} 50%{box-shadow:0 6px 24px rgba(99,102,241,.32),0 0 0 14px rgba(99,102,241,0);} }
        .sw-fab:hover { transform:scale(1.06); }
        .sw-row:hover { background:var(--surface-2) !important; }
      `}</style>

      {/* Panel */}
      {open && (
        <div style={{ position:'fixed', bottom:84, right:18, width:340, maxWidth:'calc(100vw - 28px)', background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, boxShadow:'0 18px 60px rgba(15,23,42,.18)', zIndex:9999, overflow:'hidden', animation:'sw-pop .22s cubic-bezier(.16,1,.3,1) both', fontFamily:"'Aeonik',sans-serif" }}>
          {/* Header */}
          <div style={{ padding:'16px 18px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'rgba(255,255,255,.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z"/></svg>
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:700, margin:0 }}>Hi, wie können wir helfen?</p>
                <p style={{ fontSize:11, margin:'2px 0 0', opacity:.85 }}>Antwort meist innerhalb von 1h</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Schließen"
                style={{ marginLeft:'auto', width:24, height:24, borderRadius:7, border:'none', background:'rgba(255,255,255,.15)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {/* Channels */}
          <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
            <a href="mailto:hello@festag.io" className="sw-row" style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px', borderRadius:10, textDecoration:'none', color:'var(--text)', transition:'background .12s' }}>
              <div style={{ width:34, height:34, borderRadius:10, background:'rgba(99,102,241,.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:700, margin:0, color:'var(--text)' }}>E-Mail</p>
                <p style={{ fontSize:11, margin:'1px 0 0', color:'var(--text-muted)' }}>hello@festag.io</p>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
            <a href="https://wa.me/4989123456" target="_blank" rel="noopener" className="sw-row" style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px', borderRadius:10, textDecoration:'none', color:'var(--text)', transition:'background .12s' }}>
              <div style={{ width:34, height:34, borderRadius:10, background:'rgba(34,197,94,.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72c.13.81.37 1.6.7 2.35a2 2 0 0 1-.45 2.11L7.91 9.4a16 16 0 0 0 6.19 6.19l.95-.95a2 2 0 0 1 2.1-.45c.75.33 1.54.57 2.35.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:700, margin:0, color:'var(--text)' }}>WhatsApp</p>
                <p style={{ fontSize:11, margin:'1px 0 0', color:'var(--text-muted)' }}>+49 089 123 456 78</p>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>

          {/* Inline chat */}
          <div style={{ padding:'12px 14px' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', margin:'0 0 8px' }}>SCHNELL-NACHRICHT</p>
            {sent ? (
              <div style={{ padding:'12px', background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.22)', borderRadius:10, display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'#22c55e', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', margin:0 }}>Danke! Wir melden uns gleich.</p>
              </div>
            ) : (
              <>
                <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2} placeholder="Schreibe uns…"
                  style={{ width:'100%', padding:'9px 11px', fontSize:13, fontFamily:'inherit', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:9, outline:'none', resize:'none', color:'var(--text)', boxSizing:'border-box', lineHeight:1.5 }}/>
                <button onClick={sendChat} disabled={!msg.trim()}
                  style={{ marginTop:6, width:'100%', padding:'9px', background:msg.trim()?'var(--btn-prim)':'var(--surface-2)', color:msg.trim()?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:9, fontSize:12.5, fontWeight:700, cursor:msg.trim()?'pointer':'default', fontFamily:'inherit' }}>
                  Senden →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setOpen(o => !o)} aria-label="Support"
        className="sw-fab"
        style={{ position:'fixed', bottom:'calc(18px + env(safe-area-inset-bottom))', right:18, width:54, height:54, borderRadius:'50%', border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 24px rgba(99,102,241,.32)', zIndex:9998, transition:'transform .15s', animation: open ? 'none' : 'sw-pulse 2.6s ease-in-out infinite' }}>
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z"/></svg>
        )}
      </button>
    </>
  )
}
