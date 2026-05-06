'use client'

/**
 * Cmd+K (Strg+K) — globales Command Palette.
 *
 * Architektur-Prinzip:
 *   - Eine zentrale Suche über alle Workspaces (Festwerk / Relations / Teams).
 *   - Tagro-Prefix `tagro:` triggert Tagro-Anfrage (kontextuell, kein floating Button).
 *   - Permissions werden serverseitig erzwungen — hier nur UI-Vorfilter.
 *
 * Linear-Style Regeln:
 *   - keine floating Bubble, keine permanente Sichtbarkeit
 *   - taucht nur per Shortcut auf
 *   - escape oder Klick außerhalb schließt
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlass, Sparkle, House, Handshake, UsersThree,
  ChatCircle, Briefcase, GearSix, FolderSimple, FileText,
  Plus, Brain, Code,
} from '@phosphor-icons/react'

type Cmd = {
  id:        string
  label:     string
  hint?:     string
  href?:     string
  action?:   () => void
  Icon:      React.ComponentType<any>
  group:     'Navigation' | 'Tagro' | 'Aktionen' | 'Workspace'
  keywords?: string[]
}

const STATIC_COMMANDS: Cmd[] = [
  // Workspaces
  { id:'ws-festwerk',  group:'Workspace',  label:'Festwerk öffnen',     href:'/dashboard',  Icon: House,     keywords:['core','dashboard','main'] },
  { id:'ws-relations', group:'Workspace',  label:'Relations öffnen',    href:'/relations',  Icon: Handshake, keywords:['client','kunde','chat'] },
  { id:'ws-teams',     group:'Workspace',  label:'Teams öffnen',        action: () => window.dispatchEvent(new Event('open-teams-modal')), Icon: UsersThree, keywords:['team','member','invite'] },

  // Festwerk navigation
  { id:'nav-projects', group:'Navigation', label:'Projekte',             href:'/dashboard',          Icon: FolderSimple },
  { id:'nav-messages', group:'Navigation', label:'Nachrichten',          href:'/messages',           Icon: ChatCircle },
  { id:'nav-reports',  group:'Navigation', label:'Statusberichte',       href:'/reports',            Icon: FileText },
  { id:'nav-docs',     group:'Navigation', label:'Dokumente',            href:'/documents',          Icon: FileText },
  { id:'nav-billing',  group:'Navigation', label:'Abrechnung',           href:'/billing',            Icon: Briefcase },
  { id:'nav-settings', group:'Navigation', label:'Einstellungen',        href:'/settings',           Icon: GearSix },
  { id:'nav-dev',      group:'Navigation', label:'Dev Dashboard',        href:'/dev',                Icon: Code },

  // Aktionen
  { id:'act-new-proj', group:'Aktionen',   label:'Neues Projekt anlegen', href:'/onboarding',        Icon: Plus,    keywords:['create','start'] },
  { id:'act-invite',   group:'Aktionen',   label:'Mitglied einladen',     action: () => window.dispatchEvent(new Event('open-teams-modal')), Icon: Plus, keywords:['invite','seat','team'] },

  // Tagro hint (immer sichtbar wenn Query leer ist)
  { id:'tagro-hint',   group:'Tagro',      label:'Mit "tagro: …" Tagro fragen', hint:'z. B. tagro: Status zusammenfassen', Icon: Brain, keywords:['ai','assistent'] },
]

function fuzzy(text: string, q: string): boolean {
  if (!q) return true
  const t = text.toLowerCase()
  const s = q.toLowerCase()
  let ti = 0
  for (const ch of s) {
    ti = t.indexOf(ch, ti)
    if (ti === -1) return false
    ti++
  }
  return true
}

export default function CommandPalette() {
  const router  = useRouter()
  const [open, setOpen] = useState(false)
  const [q,    setQ]    = useState('')
  const [idx,  setIdx]  = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = (e.metaKey || e.ctrlKey)
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQ('')
        setIdx(0)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Auto-Focus
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const isTagro = q.trim().toLowerCase().startsWith('tagro:')
  const tagroQuery = isTagro ? q.trim().slice(6).trim() : ''

  let results: Cmd[]
  if (isTagro) {
    results = [{
      id: 'tagro-run',
      group: 'Tagro',
      label: tagroQuery ? `Tagro fragen: "${tagroQuery}"` : 'Tagro fragen …',
      hint:  tagroQuery ? 'Enter zum Senden' : 'Frage eingeben',
      Icon:  Sparkle,
      action: () => {
        if (!tagroQuery) return
        // Route Tagro-Aufruf an die AI-Chat-Page mit Pre-Fill
        router.push(`/ai?q=${encodeURIComponent(tagroQuery)}`)
        setOpen(false)
        setQ('')
      },
    }]
  } else {
    results = STATIC_COMMANDS.filter(c =>
      fuzzy(c.label, q) || (c.keywords ?? []).some(k => fuzzy(k, q))
    )
    if (q && results.length === 0) {
      results = [{ id: 'no-result', group: 'Aktionen', label: 'Keine Treffer', Icon: MagnifyingGlass }]
    }
  }

  // Reset idx wenn results sich ändern
  useEffect(() => { setIdx(0) }, [q])

  function pick(c: Cmd) {
    if (c.id === 'no-result') return
    if (c.action) c.action()
    else if (c.href) router.push(c.href)
    setOpen(false)
    setQ('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter')   { e.preventDefault(); const c = results[idx]; if (c) pick(c) }
  }

  // Group results
  const grouped: Record<string, Cmd[]> = {}
  results.forEach(c => { (grouped[c.group] ??= []).push(c) })
  const groupOrder = ['Tagro', 'Workspace', 'Navigation', 'Aktionen']

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            style={{
              position:'fixed', inset:0, zIndex:9500,
              background:'rgba(0,0,0,0.45)',
              backdropFilter:'blur(8px) saturate(140%)',
              WebkitBackdropFilter:'blur(8px) saturate(140%)',
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ type:'spring', stiffness:380, damping:30 }}
            style={{
              position:'fixed',
              top:'14vh', left:'50%', transform:'translateX(-50%)',
              width:'min(580px, calc(100vw - 32px))',
              zIndex: 9501,
              background:'var(--surface)',
              border:'1px solid var(--border-strong)',
              borderRadius: 16,
              boxShadow:'0 28px 80px rgba(0,0,0,0.32)',
              overflow:'hidden',
            }}
          >
            <div style={{
              display:'flex', alignItems:'center', gap: 10,
              padding:'14px 18px',
              borderBottom: '1px solid var(--border)',
            }}>
              {isTagro
                ? <Sparkle size={16} weight="fill" color="var(--btn-prim)"/>
                : <MagnifyingGlass size={16} weight="regular" color="var(--text-muted)"/>}
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={isTagro ? 'Was soll Tagro tun?' : 'Suchen oder "tagro: …" für AI'}
                style={{
                  flex: 1,
                  border: 'none', outline: 'none',
                  background:'transparent',
                  fontSize: 15, color:'var(--text)',
                  fontFamily:'inherit', fontWeight: 500,
                }}
              />
              <span style={{
                fontSize: 10.5, color:'var(--text-muted)', fontWeight: 700,
                letterSpacing: '.08em', padding: '3px 7px',
                border: '1px solid var(--border)', borderRadius: 6,
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              }}>
                ESC
              </span>
            </div>

            <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: '6px 0' }}>
              {groupOrder.map(g => {
                const items = grouped[g]
                if (!items || !items.length) return null
                return (
                  <div key={g} style={{ padding: '6px 0' }}>
                    <p style={{
                      fontSize: 10, fontWeight: 700, color:'var(--text-muted)',
                      letterSpacing:'.1em', textTransform:'uppercase',
                      padding:'4px 18px', margin: 0, opacity: .7,
                    }}>{g}</p>
                    {items.map(c => {
                      const flatIdx = results.indexOf(c)
                      const active  = flatIdx === idx
                      return (
                        <button
                          key={c.id}
                          onMouseEnter={() => setIdx(flatIdx)}
                          onClick={() => pick(c)}
                          style={{
                            width:'100%',
                            display:'flex', alignItems:'center', gap: 11,
                            padding:'9px 18px',
                            background: active ? 'var(--card)' : 'transparent',
                            border:'none', cursor:'pointer',
                            fontFamily:'inherit', textAlign:'left',
                            color:'var(--text)',
                            transition:'background .08s',
                          }}
                        >
                          <span style={{
                            width: 26, height: 26, borderRadius: 7,
                            background: active ? 'var(--surface-2)' : 'transparent',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            flexShrink: 0,
                          }}>
                            <c.Icon size={13} weight="regular" color="var(--text-secondary)"/>
                          </span>
                          <span style={{ flex: 1, minWidth: 0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color:'var(--text)' }}>{c.label}</span>
                            {c.hint && (
                              <span style={{ fontSize: 11, color:'var(--text-muted)', marginLeft: 8 }}>
                                {c.hint}
                              </span>
                            )}
                          </span>
                          {active && c.id !== 'no-result' && (
                            <span style={{
                              fontSize: 10, color:'var(--text-muted)', fontWeight: 700,
                              letterSpacing: '.06em',
                              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                            }}>
                              ↵
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'9px 18px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg)',
              fontSize: 10.5, color:'var(--text-muted)', fontWeight: 600,
            }}>
              <span style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <kbd style={kbdStyle}>↑↓</kbd> navigieren
                <kbd style={kbdStyle}>↵</kbd> auswählen
              </span>
              <span style={{ display:'flex', alignItems:'center', gap: 5 }}>
                <Sparkle size={10} weight="fill" color="var(--text-muted)"/>
                Tagro mit <kbd style={kbdStyle}>tagro:</kbd>
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const kbdStyle: React.CSSProperties = {
  padding: '1px 5px', borderRadius: 4,
  border: '1px solid var(--border)', background: 'var(--surface)',
  fontSize: 10, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  margin: '0 2px',
}
