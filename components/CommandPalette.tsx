'use client'

/**
 * Cmd+K (Strg+K) — globales Command Palette.
 *
 * Architektur-Prinzip:
 *   - Eine zentrale Suche innerhalb des aktuellen echten Workspaces.
 *   - Tagro-Prefix `tagro:` triggert Tagro-Anfrage (kontextuell, kein floating Button).
 *   - Permissions werden serverseitig erzwungen — hier nur UI-Vorfilter.
 *
 * Command-Palette Regeln:
 *   - keine floating Bubble, keine permanente Sichtbarkeit
 *   - taucht nur per Shortcut auf
 *   - escape oder Klick außerhalb schließt
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlass, Sparkle, House, UsersThree,
  ChatCircle, Briefcase, GearSix, FolderSimple, FileText,
  Plus, Brain, Code, Note, ListChecks, X,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type Cmd = {
  id:        string
  label:     string
  hint?:     string
  href?:     string
  action?:   () => void
  Icon:      React.ComponentType<any>
  group:     'Navigation' | 'Tagro' | 'Aktionen' | 'Workspace' | 'Projekte' | 'Tasks' | 'Notizen'
  keywords?: string[]
}

const STATIC_COMMANDS: Cmd[] = [
  { id:'nav-projects', group:'Navigation', label:'Alle Projekte',              href:'/dashboard',          Icon: FolderSimple },
  { id:'nav-client-messages', group:'Navigation', label:'Client-Kommunikation', href:'/relations/messages', Icon: ChatCircle },
  { id:'nav-team-messages', group:'Navigation', label:'Team-Kommunikation',     href:'/messages',           Icon: UsersThree },
  { id:'nav-teams',    group:'Navigation', label:'Teams',                      href:'/teams',              Icon: UsersThree, keywords:['member','invite','seat'] },
  { id:'nav-reports',  group:'Navigation', label:'Projektbriefings',             href:'/reports',            Icon: FileText },
  { id:'nav-voice-reports', group:'Navigation', label:'Voice Reports',           href:'/voice-reports',      Icon: FileText },
  { id:'nav-docs',     group:'Navigation', label:'Dokumente',                  href:'/documents',          Icon: FileText },
  { id:'nav-notes',    group:'Navigation', label:'Notizen',                    href:'/relations/notes',    Icon: Note },
  { id:'nav-quotes',   group:'Navigation', label:'Angebote',                   href:'/relations/quotes',   Icon: Briefcase },
  { id:'nav-billing',  group:'Navigation', label:'Abrechnung & Plan',          href:'/billing',            Icon: Briefcase },
  { id:'nav-settings', group:'Navigation', label:'Einstellungen',              href:'/settings',           Icon: GearSix },

  // Aktionen
  { id:'act-new-proj', group:'Aktionen',   label:'Neues Projekt anlegen', href:'/projects?new=1',        Icon: Plus,    keywords:['create','start'] },
  { id:'act-invite',   group:'Aktionen',   label:'Mitglied einladen',     href:'/teams', Icon: Plus, keywords:['invite','seat','team'] },

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
  const [dynamic, setDynamic] = useState<Cmd[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Globale Shortcuts. Tippe in Inputs/Textareas → keine Trigger.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      if (!el) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || (el as any).isContentEditable
    }
    const onKey = (e: KeyboardEvent) => {
      const isMeta = (e.metaKey || e.ctrlKey)

      // ⌘K — Command Palette (immer)
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen(o => !o); setQ(''); setIdx(0); return
      }
      // Esc schließt Palette
      if (e.key === 'Escape' && open) { setOpen(false); return }

      // Wenn Palette offen oder User tippt → restliche Shortcuts überspringen
      if (open || isTyping(e.target)) return

      // ⌘N → neues Projekt
      if (isMeta && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault(); router.push('/projects?new=1'); return
      }
      // ⌘, → Einstellungen
      if (isMeta && e.key === ',') {
        e.preventDefault(); router.push('/settings'); return
      }
      // ⌘. → Copilot toggle
      if (isMeta && e.key === '.') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('toggle-copilot'))
        return
      }
      // ⌘/ → Hilfe / Shortcuts-Übersicht
      if (isMeta && e.key === '/') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('show-shortcuts'))
        return
      }
      // g → Schnell-Navigation (g d, g p, g r, g t, g a)
      if (e.key === 'g' && !isMeta && !e.shiftKey && !e.altKey) {
        const handler = (e2: KeyboardEvent) => {
          window.removeEventListener('keydown', handler, true)
          if (isTyping(e2.target)) return
          const dest: Record<string,string> = {
            d: '/dashboard',
            p: '/dashboard',     // Projekte
            r: '/relations',
            t: '/dev/tasks',
            a: '/ai',
            m: '/messages',
            s: '/settings',
            b: '/billing',
          }
          const path = dest[e2.key.toLowerCase()]
          if (path) { e2.preventDefault(); router.push(path) }
        }
        window.addEventListener('keydown', handler, { capture: true, once: true })
        return
      }
    }
    window.addEventListener('keydown', onKey)
    const onOpen = () => { setOpen(true); setQ(''); setIdx(0) }
    window.addEventListener('open-command-palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-command-palette', onOpen)
    }
  }, [open, router])

  // Auto-Focus
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Live-Search über DB (Projekte, Tasks, Notizen) — debounced
  useEffect(() => {
    if (!open) { setDynamic([]); return }
    const term = q.trim()
    const lowerTerm = term.toLowerCase()
    if (!term || lowerTerm.startsWith('tagro:') || lowerTerm.startsWith('tagro:')) { setDynamic([]); return }
    const t = setTimeout(async () => {
      const sb = createClient()
      const like = `%${term.replace(/[%_]/g, '\\$&')}%`
      try {
        const [projects, tasks, notes] = await Promise.all([
          sb.from('projects').select('id,title,status').ilike('title', like).limit(5),
          (sb as any).from('tasks').select('id,title,project_id,status').ilike('title', like).limit(5),
          (sb as any).from('relations_notes').select('id,title,content').or(`title.ilike.${like},content.ilike.${like}`).limit(5),
        ])
        const out: Cmd[] = []
        ;(projects.data ?? []).forEach((p: any) => out.push({
          id: `proj-${p.id}`, group: 'Projekte', label: p.title,
          hint: p.status, href: `/project/${p.id}`, Icon: FolderSimple,
        }))
        ;(tasks.data ?? []).forEach((t: any) => out.push({
          id: `task-${t.id}`, group: 'Tasks', label: t.title,
          hint: t.status, href: `/project/${t.project_id}#task-${t.id}`, Icon: ListChecks,
        }))
        ;(notes.data ?? []).forEach((n: any) => out.push({
          id: `note-${n.id}`, group: 'Notizen',
          label: n.title || (n.content ?? '').slice(0, 60),
          href: `/relations/notes#${n.id}`, Icon: Note,
        }))
        setDynamic(out)
      } catch { setDynamic([]) }
    }, 180)
    return () => clearTimeout(t)
  }, [q, open])

  const trimmedQuery = q.trim()
  const lowerQuery = trimmedQuery.toLowerCase()
  const tagroPrefix = lowerQuery.startsWith('tagro:') ? 'tagro:' : lowerQuery.startsWith('tagro:') ? 'tagro:' : null
  const isTagro = !!tagroPrefix
  const tagroQuery = tagroPrefix ? trimmedQuery.slice(tagroPrefix.length).trim() : ''

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
    const staticHits = STATIC_COMMANDS.filter(c =>
      fuzzy(c.label, q) || (c.keywords ?? []).some(k => fuzzy(k, q))
    )
    // Bei leerer Query: nur Static. Sonst: Static-Hits + Live-DB-Treffer.
    results = q.trim().length === 0
      ? staticHits
      : [...dynamic, ...staticHits]
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
  const groupOrder = ['Tagro', 'Projekte', 'Tasks', 'Notizen', 'Workspace', 'Navigation', 'Aktionen']

  return (
    <AnimatePresence>
      {open && (
        <>
          <style>{`
            .cp-backdrop { position:fixed; inset:0; z-index:9500; background:rgba(8,11,16,0.42); backdrop-filter:blur(6px) saturate(140%); -webkit-backdrop-filter:blur(6px) saturate(140%); }
            /* Floating right-anchored container with breathing room
               on all four sides — Festag pattern (see /notes search,
               /tasks tool pill). 16px gap, 16px corner-radius. */
            .cp-panel {
              position:fixed;
              top:16px; right:16px; bottom:16px;
              width:min(480px, calc(100vw - 32px));
              z-index:9501;
              background:var(--surface);
              border:1px solid var(--border);
              border-radius:16px;
              box-shadow:
                0 1px 2px rgba(15,23,42,.08),
                0 24px 60px rgba(15,23,42,.22);
              display:flex; flex-direction:column;
              overflow:hidden;
            }
            [data-theme="dark"] .cp-panel,
            [data-theme="classic-dark"] .cp-panel {
              box-shadow:
                0 1px 2px rgba(0,0,0,.36),
                0 28px 70px rgba(0,0,0,.46);
            }
            @media (max-width: 720px) {
              .cp-panel { top:12px; right:12px; bottom:12px; width:calc(100vw - 24px); border-radius:14px; }
            }
            .cp-head {
              display:flex; align-items:center; justify-content:space-between;
              padding:18px 22px 14px;
            }
            .cp-head h2 { margin:0; font-size:17px; font-weight:700; letter-spacing:-.012em; color:var(--text); }
            .cp-close {
              width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center;
              border:0; border-radius:8px; background:transparent; color:var(--text-muted);
              cursor:pointer; transition:background .12s, color .12s;
            }
            .cp-close:hover { background:var(--hover); color:var(--text); }
            .cp-search-wrap { padding:0 22px 14px; }
            .cp-search {
              display:flex; align-items:center; gap:10px;
              height:40px; padding:0 14px;
              border:1px solid var(--border); border-radius:10px;
              background:var(--inp);
              transition:border-color .12s, box-shadow .12s;
            }
            .cp-search:focus-within {
              border-color:var(--inp-focus-border);
              box-shadow:0 0 0 3px var(--glow);
              background:var(--inp-focus);
            }
            .cp-search input {
              flex:1; min-width:0; border:0; outline:0; background:transparent;
              font:inherit; font-size:14px; font-weight:500; color:var(--text);
            }
            .cp-search input::placeholder { color:var(--text-muted); }
            .cp-results { flex:1; overflow-y:auto; padding:4px 0 12px; }
            .cp-section { padding:14px 0 6px; }
            .cp-section-head {
              padding:0 22px 10px;
              margin:0;
              font-size:13px; font-weight:600; color:var(--text);
              letter-spacing:-.005em;
            }
            .cp-row {
              width:100%;
              display:flex; align-items:flex-start; gap:14px;
              padding:11px 22px;
              background:transparent;
              border:0; cursor:pointer;
              font-family:inherit; text-align:left;
              color:var(--text);
              transition:background .08s;
            }
            .cp-row:hover, .cp-row.active { background:var(--hover); }
            .cp-row-icon {
              width:28px; height:28px; flex-shrink:0;
              display:inline-flex; align-items:center; justify-content:center;
              color:var(--text-secondary);
              padding-top:1px;
            }
            .cp-row-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
            .cp-row-title { font-size:13.5px; font-weight:600; color:var(--text); line-height:1.35; }
            .cp-row-hint { font-size:12px; color:var(--text-muted); line-height:1.45; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .cp-row-enter {
              flex-shrink:0; align-self:center;
              font-size:11px; color:var(--text-muted); font-weight:600; letter-spacing:.06em;
              font-family:ui-monospace,"SF Mono",Menlo,monospace;
              opacity:0;
            }
            .cp-row.active .cp-row-enter { opacity:1; }
            .cp-empty {
              padding:24px 22px;
              color:var(--text-muted); font-size:13px;
            }
            .cp-foot {
              display:flex; align-items:center; justify-content:space-between;
              padding:12px 22px;
              border-top:1px solid var(--border);
              background:var(--bg);
              font-size:11px; color:var(--text-muted); font-weight:500;
            }
            .cp-foot kbd {
              padding:2px 6px; border-radius:5px;
              border:1px solid var(--border); background:var(--surface);
              font-size:10.5px; font-family:ui-monospace,"SF Mono",Menlo,monospace;
              margin:0 3px; color:var(--text-secondary);
            }
            @media (max-width:640px) {
              .cp-panel { width:100vw; border-left:0; }
            }
          `}</style>
          <motion.div
            className="cp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            className="cp-panel"
            role="dialog"
            aria-label="Suche"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          >
            <header className="cp-head">
              <h2>{isTagro ? 'Tagro fragen' : 'Suche'}</h2>
              <button className="cp-close" type="button" onClick={() => setOpen(false)} aria-label="Schließen">
                <X size={16} weight="bold" />
              </button>
            </header>

            <div className="cp-search-wrap">
              <div className="cp-search">
                {isTagro
                  ? <Sparkle size={15} weight="fill" color="var(--accent)" />
                  : <MagnifyingGlass size={15} weight="regular" color="var(--text-muted)" />}
                <input
                  ref={inputRef}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={isTagro ? 'Was soll Tagro tun?' : 'Projekte, Tasks, Notizen, Einstellungen...'}
                />
                <kbd style={kbdStyle}>ESC</kbd>
              </div>
            </div>

            <div className="cp-results">
              {results.length === 0 || (results.length === 1 && results[0].id === 'no-result') ? (
                <p className="cp-empty">{q ? 'Keine Treffer.' : 'Tippe um zu suchen.'}</p>
              ) : groupOrder.map(g => {
                const items = grouped[g]
                if (!items || !items.length) return null
                return (
                  <section className="cp-section" key={g}>
                    <p className="cp-section-head">{g}</p>
                    {items.map(c => {
                      const flatIdx = results.indexOf(c)
                      const active = flatIdx === idx
                      return (
                        <button
                          key={c.id}
                          className={`cp-row${active ? ' active' : ''}`}
                          onMouseEnter={() => setIdx(flatIdx)}
                          onClick={() => pick(c)}
                          type="button"
                        >
                          <span className="cp-row-icon">
                            <c.Icon size={16} weight="regular" />
                          </span>
                          <span className="cp-row-body">
                            <span className="cp-row-title">{c.label}</span>
                            {c.hint && <span className="cp-row-hint">{c.hint}</span>}
                          </span>
                          {c.id !== 'no-result' && <span className="cp-row-enter">↵</span>}
                        </button>
                      )
                    })}
                  </section>
                )
              })}
            </div>

            <footer className="cp-foot">
              <span>
                <kbd>↑↓</kbd> navigieren <kbd>↵</kbd> öffnen
              </span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                <Sparkle size={11} weight="fill" /> Tagro mit <kbd>tagro:</kbd>
              </span>
            </footer>
          </motion.aside>
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
