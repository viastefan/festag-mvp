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
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlass, Sparkle, House, UsersThree,
  ChatCircle, Briefcase, GearSix, FolderSimple, FileText,
  Plus, Brain, Code, Note, Kanban, X, Scales, Flag, Broadcast, CheckSquare, SealCheck,
  LinkSimple, WarningOctagon, EnvelopeSimple, Eye, Package,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { portalGotoDestMapForHrefs } from '@/lib/portal-nav-shortcuts'
import { usePortalNavItems } from '@/hooks/usePortalNavItems'

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
  { id:'nav-executive', group:'Navigation', label:'Führung',                   href:'/executive',          Icon: Briefcase, keywords:['ceo','portfolio','überblick','executive'] },
  { id:'nav-issues', group:'Navigation', label:'Vorfälle',                    href:'/issues',             Icon: WarningOctagon, keywords:['github','linear','jira','blocker','bug'] },
  { id:'nav-activity', group:'Navigation', label:'Aktivität',                  href:'/activity',           Icon: Broadcast, keywords:['signals','slack','feed'] },
  { id:'nav-decisions', group:'Navigation', label:'Entscheidungen',            href:'/decisions',          Icon: Scales },
  { id:'nav-captures', group:'Navigation', label:'Freigaben',                 href:'/captures',           Icon: SealCheck, keywords:['approve','review','capture'] },
  { id:'nav-deliverables', group:'Navigation', label:'Lieferungen',           href:'/deliverables',       Icon: Package, keywords:['deliverable','asset','upload','freigabe'] },
  { id:'nav-objectives', group:'Navigation', label:'Ziele',                    href:'/objectives',         Icon: Flag, keywords:['okr','objectives','ziele'] },
  { id:'nav-connectors', group:'Navigation', label:'Anbindungen',              href:'/connectors',         Icon: LinkSimple, keywords:['connectors','integration'] },
  { id:'nav-client-messages', group:'Navigation', label:'Client-Kommunikation', href:'/relations/messages', Icon: ChatCircle },
  { id:'nav-team-messages', group:'Navigation', label:'Team-Kommunikation',     href:'/messages',           Icon: EnvelopeSimple },
  { id:'nav-teams',    group:'Navigation', label:'Team',                       href:'/teams',              Icon: UsersThree, keywords:['member','invite','seat','teams'] },
  { id:'nav-reports',  group:'Navigation', label:'Projektbriefings',             href:'/reports',            Icon: FileText },
  { id:'nav-voice-reports', group:'Navigation', label:'Sprachberichte',          href:'/voice-reports',      Icon: FileText },
  { id:'nav-docs',     group:'Navigation', label:'Dokumente',                  href:'/documents',          Icon: FileText },
  { id:'nav-notes',    group:'Navigation', label:'Notizen',                    href:'/relations/notes',    Icon: Note },
  { id:'nav-quotes',   group:'Navigation', label:'Angebote',                   href:'/relations/quotes',   Icon: Briefcase },
  { id:'nav-billing',  group:'Navigation', label:'Abrechnung & Plan',          href:'/billing',            Icon: Briefcase },
  { id:'nav-settings', group:'Navigation', label:'Einstellungen',              href:'/settings',           Icon: GearSix },
  { id:'nav-settings-intelligence', group:'Navigation', label:'Tagro & Klarheit', href:'/settings/intelligence', Icon: Sparkle, keywords:['settings','delivery','tagro','klarheit'] },
  { id:'nav-settings-portal', group:'Navigation', label:'Client Portal', href:'/settings/portal', Icon: Eye, keywords:['settings','kunde','portal','preview'] },
  { id:'nav-settings-privacy', group:'Navigation', label:'Datenschutz', href:'/settings/privacy', Icon: GearSix, keywords:['settings','export','gdpr','privacy'] },

  // Aktionen
  { id:'act-new-proj', group:'Aktionen',   label:'Neues Projekt anlegen', href:'/projects?new=1',        Icon: Plus,    keywords:['create','start'] },
  { id:'act-new-task', group:'Aktionen',   label:'Neue Aufgabe anlegen',  href:'/tasks?new=1',           Icon: Kanban, keywords:['create','aufgabe','task'] },
  { id:'act-new-issue', group:'Aktionen',  label:'Neuen Vorfall anlegen', href:'/issues?new=1',          Icon: WarningOctagon, keywords:['create','bug','blocker','issue'] },
  { id:'act-new-objective', group:'Aktionen', label:'Neues Ziel anlegen', href:'/objectives?new=1', Icon: Flag, keywords:['create','okr','ziel','objective'] },
  { id:'act-captures', group:'Aktionen',   label:'Freigaben prüfen',      href:'/captures',              Icon: SealCheck, keywords:['approve','review','capture'] },
  { id:'act-deliverables', group:'Aktionen', label:'Lieferungen prüfen', href:'/deliverables',          Icon: Package, keywords:['deliverable','approve','review'] },
  { id:'act-invite',   group:'Aktionen',   label:'Mitglied einladen',     href:'/teams', Icon: Plus, keywords:['invite','seat','team'] },

  // Tagro hint (immer sichtbar wenn Query leer ist)
  { id:'tagro-hint',   group:'Tagro',      label:'Mit "tagro: …" Tagro fragen', hint:'z. B. tagro: Status zusammenfassen', Icon: Brain, keywords:['ai','assistent'] },
]

const DEV_COMMANDS: Cmd[] = [
  { id:'dev-nav-tasks', group:'Navigation', label:'Dev-Aufgaben', href:'/dev/tasks', Icon: Kanban },
  { id:'dev-nav-activity', group:'Navigation', label:'Dev-Aktivität', href:'/dev/activity', Icon: Broadcast, keywords:['feed','commits','signals'] },
  { id:'dev-nav-deliverables', group:'Navigation', label:'Dev-Lieferungen', href:'/dev/deliverables', Icon: Package, keywords:['upload','asset','deliverable'] },
  { id:'dev-nav-visibility', group:'Navigation', label:'Kunden-Sichtbarkeit', href:'/dev/visibility', Icon: Eye, keywords:['client','timeline','tagro'] },
  { id:'dev-nav-briefing', group:'Navigation', label:'Tagesbriefing', href:'/dev/briefing', Icon: Sparkle, keywords:['daily','stand','update'] },
  { id:'dev-nav-issues', group:'Navigation', label:'Dev-Vorfälle', href:'/dev/issues', Icon: WarningOctagon },
  { id:'dev-nav-captures', group:'Navigation', label:'Dev-Freigaben', href:'/dev/captures', Icon: SealCheck },
  { id:'dev-act-task', group:'Aktionen', label:'Neue Dev-Aufgabe', href:'/dev/tasks?new=1', Icon: Plus, keywords:['create','aufgabe'] },
  { id:'dev-act-review', group:'Aktionen', label:'Review-Warteschlange', href:'/dev/review', Icon: CheckSquare },
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

export default function CommandPalette({ theme = 'default' }: { theme?: 'default' | 'portal' }) {
  const router  = useRouter()
  const pathname = usePathname() || ''
  const { items: portalNavItems } = usePortalNavItems()
  const [open, setOpen] = useState(false)
  const [q,    setQ]    = useState('')
  const isMobile = useFestagMobile()
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
      // g → Schnell-Navigation (G dann X, 1.2s Fenster)
      if (e.key === 'g' && !isMeta && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        const dest: Record<string, string> = theme === 'portal'
          ? portalGotoDestMapForHrefs(portalNavItems.map(i => i.href))
          : {
            d: '/dashboard',
            p: '/dashboard',
            r: '/relations',
            t: '/dev/tasks',
            a: '/ai',
            m: '/messages',
            s: '/settings',
            b: '/billing',
          }
        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          window.removeEventListener('keydown', handler, true)
          clearTimeout(timer)
        }
        const handler = (e2: KeyboardEvent) => {
          if (e2.key === 'Escape') { finish(); return }
          if (isTyping(e2.target)) { finish(); return }
          const path = dest[e2.key.toLowerCase()]
          finish()
          if (path) { e2.preventDefault(); router.push(path) }
        }
        const timer = window.setTimeout(finish, 1200)
        window.addEventListener('keydown', handler, { capture: true })
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
  }, [open, router, theme, portalNavItems])

  // Auto-Focus
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
    setQ('')
    setIdx(0)
  }, [pathname])

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
          hint: t.status, href: `/project/${t.project_id}#task-${t.id}`, Icon: Kanban,
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
    const baseCommands = pathname.startsWith('/dev')
      ? [...STATIC_COMMANDS, ...DEV_COMMANDS]
      : STATIC_COMMANDS
    const staticHits = baseCommands.filter(c =>
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

  const isPortal = theme === 'portal'
  const panelClass = `festag-popup-surface cp-panel${isPortal ? ' cp-portal' : ''}${isMobile ? ' festag-popup-mobile-sheet' : ''}`

  return (
    <AnimatePresence>
      {open && (
        <>
          <style>{`
            .cp-panel {
              position: fixed;
              top: 16px; right: 16px; bottom: 16px;
              width: min(480px, calc(100vw - 32px));
              z-index: 9501;
              display: flex; flex-direction: column;
              overflow: hidden;
            }
            .cp-portal .cp-head h2 { font-weight: 400; font-size: 16px; letter-spacing: .02em; }
            .cp-portal .cp-section-head {
              font-weight: 500; font-size: 11px; color: var(--fp-muted);
              letter-spacing: .06em; text-transform: uppercase;
            }
            .cp-portal .cp-row-title { font-weight: 400; font-size: 14px; }
            @media (max-width: 768px) {
              .cp-panel {
                top: auto !important;
                right: 0 !important;
                left: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                max-height: min(88dvh, 640px);
                border-radius: 20px 20px 0 0 !important;
                border-bottom: none !important;
                padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
              }
            }
            @media (max-width: 720px) {
              .cp-panel:not(.festag-popup-mobile-sheet) { top: 12px; right: 12px; bottom: 12px; width: calc(100vw - 24px); }
            }
            .cp-head {
              display: flex; align-items: center; justify-content: space-between;
              padding: 18px 22px 14px;
            }
            .cp-head h2 {
              margin: 0; font-size: 17px; font-weight: 400; letter-spacing: -.012em;
              color: var(--fp-text);
            }
            .cp-close {
              width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
              border: 0; border-radius: 8px; background: transparent; color: var(--fp-muted);
              cursor: pointer; transition: background .12s, color .12s;
            }
            .cp-close:hover { background: var(--fp-hover); color: var(--fp-text); }
            .cp-search-wrap { padding: 0 22px 14px; }
            .cp-search {
              display: flex; align-items: center; gap: 10px;
              height: 40px; padding: 0 14px;
              border: 1px solid var(--fp-inp-border); border-radius: 8px;
              background: var(--fp-inp);
              transition: border-color .12s, box-shadow .12s, background .12s;
            }
            .cp-search:focus-within {
              border-color: var(--fp-inp-focus-border);
              box-shadow: 0 0 0 3px var(--fp-glow);
              background: var(--fp-inp-focus);
            }
            .cp-search input {
              flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
              font: inherit; font-size: 14px; font-weight: 400; color: var(--fp-text);
            }
            .cp-search input::placeholder { color: var(--fp-muted); }
            .cp-results { flex: 1; overflow-y: auto; padding: 4px 0 12px; }
            .cp-section { padding: 14px 0 6px; }
            .cp-section-head {
              padding: 0 22px 10px; margin: 0;
              font-size: 13px; font-weight: 500; color: var(--fp-muted);
              letter-spacing: .04em; text-transform: uppercase;
            }
            .cp-row {
              width: 100%; display: flex; align-items: flex-start; gap: 14px;
              padding: 11px 22px; background: transparent; border: 0; cursor: pointer;
              font-family: inherit; text-align: left; color: var(--fp-text);
              transition: background .08s;
              border-radius: 8px;
            }
            .cp-row:hover, .cp-row.active { background: var(--fp-hover); }
            .cp-row-icon {
              width: 28px; height: 28px; flex-shrink: 0;
              display: inline-flex; align-items: center; justify-content: center;
              color: var(--fp-muted); padding-top: 1px;
            }
            .cp-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
            .cp-row-title { font-size: 13.5px; font-weight: 400; color: var(--fp-text); line-height: 1.35; }
            .cp-row-hint {
              font-size: 12px; color: var(--fp-muted); line-height: 1.45;
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .cp-row-enter {
              flex-shrink: 0; align-self: center;
              font-size: 11px; color: var(--fp-muted); font-weight: 500; letter-spacing: .06em;
              font-family: ui-monospace, "SF Mono", Menlo, monospace; opacity: 0;
            }
            .cp-row.active .cp-row-enter { opacity: 1; }
            .cp-empty { padding: 24px 22px; color: var(--fp-muted); font-size: 13px; }
            .cp-foot {
              display: flex; align-items: center; justify-content: space-between;
              padding: 12px 22px; border-top: 1px solid var(--fp-divider);
              background: var(--fp-bg); font-size: 11px; color: var(--fp-muted); font-weight: 400;
            }
            .cp-foot kbd {
              padding: 2px 6px; border-radius: 5px;
              border: 1px solid var(--fp-border); background: var(--fp-pill);
              font-size: 10.5px; font-family: ui-monospace, "SF Mono", Menlo, monospace;
              margin: 0 3px; color: var(--fp-soft);
            }
          `}</style>
          <motion.div
            className="festag-popup-backdrop cp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            className={panelClass}
            role="dialog"
            aria-label="Suche"
            initial={isMobile ? { y: '100%', opacity: 0 } : { x: 40, opacity: 0 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { x: 40, opacity: 0 }}
            transition={isMobile ? { type: 'spring', stiffness: 420, damping: 36 } : { type: 'spring', stiffness: 360, damping: 32 }}
          >
            {isMobile && <FestagPopupDragHandle onDismiss={() => setOpen(false)} />}
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
                  : <MagnifyingGlass size={15} weight="regular" color="var(--fp-muted)" />}
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
  border: '1px solid var(--fp-border)', background: 'var(--fp-pill)',
  fontSize: 10, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  margin: '0 2px', color: 'var(--fp-soft)',
}
