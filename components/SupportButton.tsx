'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Support-Button (Chat-Icon) — sitzt in der Sidebar oben neben dem Logo.
 * Klick oeffnet ein Popover als Portal in document.body — sonst wird es vom
 * overflow:hidden der abgerundeten Sidebar abgeschnitten.
 */
export default function SupportButton() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [msg,  setMsg]  = useState('')
  const [sent, setSent] = useState(false)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Position berechnen wenn geöffnet
  useEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 8, left: r.left })
  }, [open])

  // Outside-Click + Escape
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    function onScroll() {
      if (!btnRef.current) return
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, left: r.left })
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  async function sendChat() {
    if (!msg.trim()) return
    setSent(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      await fetch('/api/support/send', {
        method:'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: msg.trim(), page: window.location.pathname }),
      })
    } catch { /* ignore */ }
    setTimeout(() => { setOpen(false); setSent(false); setMsg('') }, 1800)
  }

  const popover = open && pos && mounted ? createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Support"
      style={{
        position:'fixed', top:pos.top, left:pos.left,
        width:300, maxWidth:'calc(100vw - 24px)',
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:14, boxShadow:'0 18px 48px rgba(0,0,0,0.18)',
        zIndex:99999, overflow:'hidden',
        animation:'sb-pop .18s cubic-bezier(.16,1,.3,1) both',
        fontFamily:"'Inter',sans-serif",
      }}
    >
      <style>{`
        @keyframes sb-pop { from{transform:translateY(-4px);opacity:0;} to{transform:translateY(0);opacity:1;} }
        .sb-row { transition:background .12s; }
        .sb-row:hover { background:var(--surface-2); }
      `}</style>

      {/* Header */}
      <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid var(--border)' }}>
        <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>Wie können wir helfen?</p>
        <p style={{ fontSize:11, color:'var(--text-muted)', margin:'2px 0 0' }}>Antwort meist innerhalb von 1h</p>
      </div>

      {/* Channels */}
      <div style={{ padding:'8px 8px 4px' }}>
        <a href="mailto:hello@festag.io" className="sb-row" style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:9, textDecoration:'none', color:'var(--text)' }}>
          <span style={{ width:30, height:30, borderRadius:8, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'var(--text)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
          </span>
          <span style={{ flex:1, minWidth:0 }}>
            <span style={{ fontSize:12.5, fontWeight:700, display:'block' }}>E-Mail</span>
            <span style={{ fontSize:11, color:'var(--text-muted)', display:'block' }}>hello@festag.io</span>
          </span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
        <a href="https://wa.me/4989123456" target="_blank" rel="noopener" className="sb-row" style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:9, textDecoration:'none', color:'var(--text)' }}>
          <span style={{ width:30, height:30, borderRadius:8, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'var(--text)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72c.13.81.37 1.6.7 2.35a2 2 0 0 1-.45 2.11L7.91 9.4a16 16 0 0 0 6.19 6.19l.95-.95a2 2 0 0 1 2.1-.45c.75.33 1.54.57 2.35.7A2 2 0 0 1 22 16.92z"/></svg>
          </span>
          <span style={{ flex:1, minWidth:0 }}>
            <span style={{ fontSize:12.5, fontWeight:700, display:'block' }}>WhatsApp</span>
            <span style={{ fontSize:11, color:'var(--text-muted)', display:'block' }}>+49 089 123 456 78</span>
          </span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>

      {/* Inline Schnell-Nachricht */}
      <div style={{ padding:'10px 14px 14px', borderTop:'1px solid var(--border)' }}>
        <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', margin:'0 0 7px' }}>SCHNELL-NACHRICHT</p>
        {sent ? (
          <div style={{ padding:'10px', background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:9, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:20, height:20, borderRadius:'50%', background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <p style={{ fontSize:12, fontWeight:600, color:'var(--green-dark)', margin:0 }}>Danke! Wir melden uns gleich.</p>
          </div>
        ) : (
          <>
            <textarea
              value={msg} onChange={e => setMsg(e.target.value)} rows={2}
              placeholder="Schreib uns…"
              style={{
                width:'100%', padding:'8px 10px', fontSize:12.5, fontFamily:'inherit',
                background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8,
                outline:'none', resize:'none', color:'var(--text)', boxSizing:'border-box', lineHeight:1.5,
              }}
            />
            <button
              onClick={sendChat} disabled={!msg.trim()}
              style={{
                marginTop:6, width:'100%', padding:'8px',
                background: msg.trim() ? 'var(--btn-prim)' : 'var(--surface-2)',
                color: msg.trim() ? 'var(--btn-prim-text)' : 'var(--text-muted)',
                border:'none', borderRadius:8, fontSize:12, fontWeight:700,
                cursor: msg.trim() ? 'pointer' : 'default', fontFamily:'inherit',
              }}
            >
              Senden →
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-label="Support öffnen"
        title="Support"
        style={{
          width:30, height:30, border:'1px solid var(--border)',
          background: open ? 'var(--surface-2)' : 'transparent',
          borderRadius:9, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'var(--text-secondary)', flexShrink:0,
          transition:'background .12s',
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z"/>
        </svg>
      </button>
      {popover}
    </>
  )
}
