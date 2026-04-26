'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

interface Props {
  title?: string
  subtitle?: React.ReactNode
}

export default function AppHeader({ title, subtitle }: Props) {
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
    <header className="app-header" style={{
      display:'flex', alignItems:'center', gap:14,
      padding:'14px 28px', borderBottom:'1px solid var(--border)',
      background:'var(--bg)', position:'sticky', top:0, zIndex:50,
      minHeight:62
    }}>
      <style>{`
        @media(max-width:768px){
          .app-header{padding:12px 16px!important;gap:10px!important;}
          .ah-title{display:none!important;}
          .ah-search{flex:1;}
        }
      `}</style>

      {/* Title (optional, hidden on mobile) */}
      {title && (
        <div className="ah-title" style={{flexShrink:0,minWidth:0}}>
          <h1 style={{fontSize:17,fontWeight:700,letterSpacing:'-.3px',color:'var(--text)',margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {title}
          </h1>
          {subtitle && <p style={{fontSize:12,color:'var(--text-secondary)',margin:0,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{subtitle}</p>}
        </div>
      )}

      {/* Search — flex grow */}
      <div className="ah-search" style={{position:'relative',flex:1,maxWidth:520,marginLeft:title?'auto':0}}>
        <svg style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
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
            width:'100%', padding:'9px 60px 9px 36px',
            background:'var(--card)', border:`1px solid ${searchFocused?'var(--border-strong)':'var(--border)'}`,
            borderRadius:11, fontSize:13.5, color:'var(--text)',
            fontFamily:'inherit', fontWeight:500, outline:'none',
            transition:'border-color .15s, background .15s',
          }}
        />
        {/* Cmd+K hint badge */}
        <span style={{
          position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
          padding:'2px 7px', borderRadius:6, fontSize:11, fontWeight:600,
          color:'var(--text-muted)', background:'var(--surface-2)',
          border:'1px solid var(--border)', pointerEvents:'none', letterSpacing:'.02em'
        }}>⌘K</span>
      </div>

      {/* New project button */}
      <Link href="/new-project" className="ah-btn-new" style={{
        display:'flex',alignItems:'center',gap:7,padding:'8px 14px',
        background:'var(--btn-prim)',color:'var(--btn-prim-text)',borderRadius:11,
        fontSize:13,fontWeight:700,textDecoration:'none',flexShrink:0,transition:'opacity .15s',
        whiteSpace:'nowrap'
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        <span className="ah-btn-new-label">Neu</span>
      </Link>

      {/* Theme toggle */}
      <ThemeToggle position="relative"/>
    </header>
  )
}
