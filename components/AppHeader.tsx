'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

interface Props {}

export default function AppHeader({}: Props = {}) {
  const [searchValue, setSearchValue] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name || data.user?.user_metadata?.first_name || (data.user?.email?.split('@')[0] ?? '')
      setDisplayName(name)
    })

    // Cmd+K / Ctrl+K shortcut to focus search
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const input = document.getElementById('app-search') as HTMLInputElement | null
        input?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <header style={{
      display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10,
      padding:'12px 32px', borderBottom:'1px solid var(--border)',
      background:'var(--bg)', position:'sticky', top:0, zIndex:50,
      minHeight:58,
    }}>
      <style>{`@media(max-width:768px){.app-header-wrap{display:none!important;}}`}</style>
      <div className="app-header-wrap" style={{display:'flex',alignItems:'center',gap:10,width:'100%',justifyContent:'flex-end'}}>
      {/* Search */}
      <div style={{position:'relative',width:280,flexShrink:0}}>
        <svg style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          id="app-search"
          value={searchValue}
          onChange={e=>setSearchValue(e.target.value)}
          onFocus={()=>setSearchFocused(true)}
          onBlur={()=>setSearchFocused(false)}
          placeholder="Suchen..."
          style={{
            width:'100%', padding:'8px 52px 8px 32px',
            background:'var(--card)', border:`1px solid ${searchFocused?'var(--border-strong)':'var(--border)'}`,
            borderRadius:10, fontSize:13, color:'var(--text)',
            fontFamily:'inherit', fontWeight:500, outline:'none',
            transition:'border-color .15s',
          }}
        />
        <span style={{
          position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
          padding:'2px 6px', borderRadius:5, fontSize:10.5, fontWeight:600,
          color:'var(--text-muted)', background:'var(--surface-2)',
          border:'1px solid var(--border)', pointerEvents:'none',
        }}>⌘K</span>
      </div>

      {/* New project button */}
      <Link href="/new-project" style={{
        display:'flex',alignItems:'center',gap:6,padding:'7px 13px',
        background:'var(--btn-prim)',color:'var(--btn-prim-text)',borderRadius:10,
        fontSize:13,fontWeight:700,textDecoration:'none',flexShrink:0,transition:'opacity .15s',
        whiteSpace:'nowrap',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Neu
      </Link>

      {/* Theme toggle */}
      <ThemeToggle position="relative"/>
      </div>
    </header>
  )
}
