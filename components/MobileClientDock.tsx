'use client'

/**
 * MobileClientDock — the client panel's mobile bottom bar.
 *
 * Replaces the old 5-tab bottom nav with a clean, focused two-action dock
 * (inspired by current mobile SaaS apps): the whole panel is about getting
 * a status report and editing with Tagro.
 *
 *   [  Statusbericht  ]  [ Mit Tagro bearbeiten ]
 *
 * Left  → ghost pill, opens a project picker → routes to the briefing.
 * Right → slate filled, opens a project picker → opens the Tagro overlay
 *         with that project (or the whole workspace) attached.
 *
 * A small leading ☰ button opens a nav sheet so the rest of the app stays
 * reachable without a permanent tab bar.
 *
 * Mobile only (≤768px). Mounted once in ClientAppShell so it's present on
 * every client screen — no per-page wiring, no missing bar.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChatCircleDots, FolderSimple, GearSix, House, List, Plus, Scales,
  FileText, Tray, WaveSine, X,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { openTagro } from '@/components/TagroOverlay'

type ProjectLite = { id: string; title: string; color?: string | null; status?: string | null }

type Mode = null | 'status' | 'tagro' | 'nav'

const NAV = [
  { href: '/dashboard', label: 'Statusabfrage', icon: House },
  { href: '/projects', label: 'Projekte', icon: FolderSimple },
  { href: '/inbox', label: 'Inbox', icon: Tray },
  { href: '/decisions', label: 'Entscheidungen', icon: Scales },
  { href: '/documents', label: 'Dokumente', icon: FileText },
  { href: '/reports', label: 'Statusberichte', icon: WaveSine },
  { href: '/ai', label: 'Tagro', icon: ChatCircleDots },
  { href: '/settings', label: 'Einstellungen', icon: GearSix },
]

export default function MobileClientDock() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [loaded, setLoaded] = useState(false)

  // Mark the body so the legacy 5-tab nav hides itself (CSS below).
  useEffect(() => {
    document.body.classList.add('festag-client-dock')
    return () => document.body.classList.remove('festag-client-dock') as unknown as void
  }, [])

  // Lazy-load projects the first time a picker opens.
  useEffect(() => {
    if (mode !== 'status' && mode !== 'tagro') return
    if (loaded) return
    let cancelled = false
    ;(async () => {
      try {
        const sb = createClient() as any
        const { data } = await sb
          .from('projects')
          .select('id,title,color,status')
          .order('updated_at', { ascending: false })
          .limit(40)
        if (!cancelled) { setProjects((data as ProjectLite[]) || []); setLoaded(true) }
      } catch {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [mode, loaded])

  // Lock body scroll while a sheet is open.
  useEffect(() => {
    if (!mode) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mode])

  function pickStatus(projectId: string | null, title: string) {
    setMode(null)
    const q = projectId ? `?project=${projectId}` : ''
    router.push(`/reports${q}`)
  }

  function pickTagro(projectId: string | null, title: string) {
    setMode(null)
    if (projectId) {
      openTagro({ contextType: 'project', id: projectId, title })
    } else {
      openTagro({ contextType: 'empty', id: 'all', title: 'Alle Projekte', subtitle: 'Gesamtbericht' })
    }
  }

  const sheetTitle = mode === 'status'
    ? 'Statusbericht abrufen'
    : mode === 'tagro'
      ? 'Mit Tagro bearbeiten'
      : 'Menü'

  return (
    <>
      <div className="mcd" role="toolbar" aria-label="Aktionen">
        <button
          type="button"
          className="mcd-menu"
          aria-label="Menü"
          onClick={() => setMode('nav')}
        >
          <List size={20} weight="regular" />
        </button>
        <button
          type="button"
          className="mcd-btn mcd-ghost"
          onClick={() => setMode('status')}
        >
          <WaveSine size={17} weight="regular" />
          <span>Statusbericht</span>
        </button>
        <button
          type="button"
          className="mcd-btn mcd-primary"
          onClick={() => setMode('tagro')}
        >
          <ChatCircleDots size={17} weight="fill" />
          <span>Mit Tagro</span>
        </button>
      </div>

      {mode && (
        <div className="mcd-sheet-wrap" role="dialog" aria-modal="true" aria-label={sheetTitle}>
          <div className="mcd-backdrop" onClick={() => setMode(null)} aria-hidden />
          <div className="mcd-sheet">
            <div className="mcd-sheet-grip" aria-hidden />
            <div className="mcd-sheet-head">
              <h2>{sheetTitle}</h2>
              <button type="button" className="mcd-sheet-x" onClick={() => setMode(null)} aria-label="Schließen"><X size={16} /></button>
            </div>

            {mode === 'nav' ? (
              <div className="mcd-nav">
                {NAV.map(item => {
                  const Icon = item.icon
                  return (
                    <Link key={item.href} href={item.href} className="mcd-nav-row" onClick={() => setMode(null)}>
                      <span className="mcd-nav-ico"><Icon size={18} weight="regular" /></span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="mcd-picker">
                <p className="mcd-picker-hint">
                  {mode === 'status'
                    ? 'Für welches Projekt soll Tagro den Statusbericht erstellen?'
                    : 'Womit soll Tagro arbeiten?'}
                </p>
                <button
                  type="button"
                  className="mcd-pick mcd-pick-all"
                  onClick={() => mode === 'status' ? pickStatus(null, 'Gesamtbericht') : pickTagro(null, 'Alle Projekte')}
                >
                  <span className="mcd-pick-dot mcd-pick-dot-all" />
                  <span className="mcd-pick-main">
                    <strong>Gesamtbericht</strong>
                    <small>Alle Projekte zusammengefasst</small>
                  </span>
                </button>
                <div className="mcd-pick-list">
                  {!loaded && <p className="mcd-pick-empty">Lade Projekte …</p>}
                  {loaded && projects.length === 0 && <p className="mcd-pick-empty">Noch keine Projekte.</p>}
                  {projects.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="mcd-pick"
                      onClick={() => mode === 'status' ? pickStatus(p.id, p.title) : pickTagro(p.id, p.title)}
                    >
                      <span className="mcd-pick-dot" style={{ background: p.color || 'var(--text-muted)' }} />
                      <span className="mcd-pick-main">
                        <strong>{p.title}</strong>
                        {p.status && <small>{p.status}</small>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .mcd { display: none; }
        /* The dock fully replaces the legacy 5-tab nav on the client panel. */
        :global(body.festag-client-dock) :global(.bottom-nav),
        :global(body.festag-client-dock) :global(.tmb),
        :global(body.festag-client-dock) :global(.mob-bar) { display: none !important; }
        @media (max-width: 768px) {
          .mcd {
            display: flex; align-items: center; gap: 8px;
            position: fixed; left: 12px; right: 12px;
            bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            z-index: 190;
          }
          :global(body.chat-composer-focused) .mcd { transform: translateY(140%); transition: transform .2s ease; }
        }
        .mcd-menu {
          flex: 0 0 auto;
          width: 50px; height: 50px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 0; border-radius: 999px; cursor: pointer;
          background: var(--surface, #fff);
          color: var(--text);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border) 80%, transparent),
                      0 12px 28px -16px rgba(0,0,0,.5);
          -webkit-tap-highlight-color: transparent;
        }
        .mcd-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 50px; padding: 0 16px;
          border: 0; border-radius: 999px; cursor: pointer;
          font: inherit; font-size: 14px; font-weight: 500; letter-spacing: .005em;
          white-space: nowrap;
          -webkit-tap-highlight-color: transparent;
          transition: transform .14s ease, background .14s ease;
        }
        .mcd-btn:active { transform: scale(.975); }
        .mcd-ghost {
          flex: 1 1 auto;
          background: var(--surface, #fff);
          color: var(--text);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border) 80%, transparent),
                      0 12px 28px -16px rgba(0,0,0,.5);
        }
        .mcd-primary {
          flex: 0 0 auto;
          background: #5B647D;
          color: #fff;
          box-shadow: 0 14px 30px -12px rgba(91,100,125,.7);
        }
        .mcd-primary:active { background: #4d566c; }

        /* Sheet */
        .mcd-sheet-wrap { position: fixed; inset: 0; z-index: 16050; display: flex; align-items: flex-end; }
        .mcd-backdrop { position: absolute; inset: 0; background: rgba(8,10,14,.5); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
        .mcd-sheet {
          position: relative; width: 100%;
          background: var(--surface, #fff); color: var(--text);
          border-radius: 22px 22px 0 0;
          padding: 8px 16px calc(20px + env(safe-area-inset-bottom, 0px));
          max-height: 78vh; overflow-y: auto;
          box-shadow: 0 -18px 50px -20px rgba(0,0,0,.4);
          animation: mcdUp .26s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes mcdUp { from { transform: translateY(18px); opacity: .6; } to { transform: translateY(0); opacity: 1; } }
        .mcd-sheet-grip { width: 36px; height: 4px; border-radius: 999px; background: color-mix(in srgb, var(--text) 18%, transparent); margin: 4px auto 10px; }
        .mcd-sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .mcd-sheet-head h2 { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -.01em; }
        .mcd-sheet-x {
          width: 30px; height: 30px; border: 0; border-radius: 999px; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text-secondary);
        }
        .mcd-picker-hint { margin: 0 0 12px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
        .mcd-pick {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 13px 12px; border: 0; border-radius: 14px; cursor: pointer;
          background: transparent; color: var(--text); text-align: left;
          font: inherit;
          transition: background .12s ease;
        }
        .mcd-pick:hover, .mcd-pick:active { background: color-mix(in srgb, var(--surface-2) 75%, transparent); }
        .mcd-pick-all { background: color-mix(in srgb, var(--surface-2) 55%, transparent); margin-bottom: 6px; }
        .mcd-pick-dot { width: 10px; height: 10px; border-radius: 999px; flex-shrink: 0; }
        .mcd-pick-dot-all { background: #5B647D; }
        .mcd-pick-main { display: flex; flex-direction: column; min-width: 0; }
        .mcd-pick-main strong { font-size: 14.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mcd-pick-main small { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
        .mcd-pick-list { display: flex; flex-direction: column; }
        .mcd-pick-empty { margin: 0; padding: 18px 0; text-align: center; font-size: 13px; color: var(--text-muted); }
        .mcd-nav { display: flex; flex-direction: column; }
        .mcd-nav-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 12px; border-radius: 14px;
          color: var(--text); text-decoration: none; font-size: 15px; font-weight: 500;
        }
        .mcd-nav-row:active { background: color-mix(in srgb, var(--surface-2) 75%, transparent); }
        .mcd-nav-ico { display: inline-flex; color: var(--text-secondary); }
      `}</style>
    </>
  )
}
