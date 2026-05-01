'use client'

/**
 * FeedbackWidget — appears once after the 5th app login.
 * Tracks login count in localStorage. Submits rating + text to `feedback` table.
 * Dismissed forever once submitted or explicitly closed.
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const KEY_COUNT  = 'festag_login_count'
const KEY_DONE   = 'festag_feedback_done'
const THRESHOLD  = 5

export default function FeedbackWidget() {
  const [show,    setShow]    = useState(false)
  const [rating,  setRating]  = useState(0)
  const [hover,   setHover]   = useState(0)
  const [text,    setText]    = useState('')
  const [sending, setSending] = useState(false)
  const [done,    setDone]    = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Never show again if already submitted or dismissed
    if (localStorage.getItem(KEY_DONE)) return
    // Increment login count (once per session via sessionStorage guard)
    const sessionKey = 'festag_session_counted'
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, '1')
      const current = parseInt(localStorage.getItem(KEY_COUNT) ?? '0', 10)
      const next = current + 1
      localStorage.setItem(KEY_COUNT, String(next))
      if (next >= THRESHOLD) {
        // Delay slightly so app loads first
        setTimeout(() => setShow(true), 2800)
      }
    }
  }, [])

  async function submit() {
    if (!rating) return
    setSending(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      await (sb.from('feedback') as any).insert({
        user_id: user?.id ?? null,
        email:   user?.email ?? null,
        rating,
        message: text.trim() || null,
        page:    typeof window !== 'undefined' ? window.location.pathname : '/',
        created_at: new Date().toISOString(),
      }).catch(() => {})
      localStorage.setItem(KEY_DONE, '1')
      setDone(true)
      setTimeout(() => setShow(false), 2200)
    } catch { /* silent */ }
    setSending(false)
  }

  function dismiss() {
    localStorage.setItem(KEY_DONE, '1')
    setShow(false)
  }

  if (!show) return null

  const STARS = [1, 2, 3, 4, 5]
  const star = (filled: boolean, size = 22) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(3px)', zIndex: 900, animation: 'fbIn .2s ease both' }}
      />

      {/* Card */}
      <div style={{
        position: 'fixed', bottom: 'calc(24px + var(--safe-bottom))', right: 24,
        width: 320, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 22, padding: '24px 22px 20px', zIndex: 901,
        boxShadow: 'var(--shadow-lg)',
        animation: 'fbUp .3s cubic-bezier(.16,1,.3,1) both',
      }}>
        <style>{`
          @keyframes fbIn  { from{opacity:0;} to{opacity:1;} }
          @keyframes fbUp  { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
          .fb-star { cursor:pointer; transition:color .1s,transform .1s; color:var(--border-strong); }
          .fb-star:hover, .fb-star.sel { color:#f59e0b; transform:scale(1.15); }
        `}</style>

        {/* Close */}
        <button onClick={dismiss} style={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--green-bg)', border: '1px solid var(--green-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--green)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Danke für dein Feedback!</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0 }}>Deine Meinung hilft uns Festag zu verbessern.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Deine Meinung</p>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-.3px' }}>Wie gefällt dir Festag?</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Du nutzt die App jetzt eine Weile — wir würden uns über ehrliches Feedback freuen.
            </p>

            {/* Stars */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center' }}>
              {STARS.map(s => (
                <button
                  key={s}
                  className={`fb-star${rating >= s ? ' sel' : ''}`}
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  style={{ background: 'none', border: 'none', padding: 2, color: (hover || rating) >= s ? '#f59e0b' : 'var(--border-strong)' }}
                >
                  {star((hover || rating) >= s)}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', margin: '-10px 0 14px', fontWeight: 600 }}>
                {['','Nicht gut','Verbesserungsbedarf','OK','Gut','Sehr gut!'][rating]}
              </p>
            )}

            {/* Optional text */}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Was können wir verbessern? (optional)"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 11, fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', fontWeight: 500, resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
            />

            <button
              onClick={submit}
              disabled={!rating || sending}
              style={{ width: '100%', marginTop: 10, padding: '12px 16px', background: rating && !sending ? 'var(--btn-prim)' : 'var(--surface-2)', color: rating && !sending ? 'var(--btn-prim-text)' : 'var(--text-muted)', border: 'none', borderRadius: 13, fontSize: 14, fontWeight: 700, cursor: rating && !sending ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all .12s' }}>
              {sending ? 'Wird gesendet…' : 'Feedback senden'}
            </button>

            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0 0' }}>
              Anonym möglich · Keine Pflichtantwort
            </p>
          </>
        )}
      </div>
    </>
  )
}
