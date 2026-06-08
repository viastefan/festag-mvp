'use client'

/**
 * MobileClientDock — bottom action dock for the client panel on mobile.
 *
 * Built 1:1 against the current mobile-SaaS leaders (ChatGPT mobile):
 *
 *   ┌─────────────────────────────────┐  ┌─────────────────────┐
 *   │  ◯  Statusbericht               │  │  ✎  Mit Tagro        │
 *   └─────────────────────────────────┘  └─────────────────────┘
 *
 *   - LEFT  : large flex-1 pill, light surface, hairline border,
 *             quiet leading icon + label. Opens a project-picker sheet,
 *             routes to the briefing for that project (or Gesamtbericht).
 *   - RIGHT : solid filled pill, slate fill, white label, white icon.
 *             Opens the same project picker and forwards to the global
 *             Tagro overlay with the chosen project as context.
 *
 * No third menu button in the bar — the full app nav lives behind the
 * existing top-bar / Mehr surface. The dock stays *focused on the two
 * core client actions: get a status report or edit with Tagro.*
 *
 * Mounted once in ClientAppShell, mobile only (≤768px). Hides the legacy
 * 5-tab bottom nav via body.festag-client-dock so there's exactly one
 * bottom element.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChatCircle, WaveSine, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { openTagro } from '@/components/TagroOverlay'

type ProjectLite = { id: string; title: string; color?: string | null; status?: string | null }

type Mode = null | 'status' | 'tagro'

export default function MobileClientDock() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [loaded, setLoaded] = useState(false)

  // Tell the global stylesheet to hide the legacy 5-tab nav while the
  // dock is mounted. Same flag also clears the desktop footer on phones
  // (see globals override below).
  useEffect(() => {
    document.body.classList.add('festag-client-dock')
    return () => { document.body.classList.remove('festag-client-dock') }
  }, [])

  // Lazy-load projects only when the picker is first opened.
  useEffect(() => {
    if (!mode || loaded) return
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

  // Lock scroll while the sheet is open.
  useEffect(() => {
    if (!mode) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mode])

  function pickStatus(projectId: string | null) {
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

  const sheetTitle = mode === 'status' ? 'Statusbericht abrufen' : 'Mit Tagro bearbeiten'

  return (
    <>
      <div className="mcd" role="toolbar" aria-label="Aktionen">
        <button
          type="button"
          className="mcd-btn mcd-ghost"
          onClick={() => setMode('status')}
        >
          <WaveSine className="mcd-ico" weight="regular" />
          <span>Statusbericht</span>
        </button>
        <button
          type="button"
          className="mcd-btn mcd-primary"
          onClick={() => setMode('tagro')}
        >
          <ChatCircle className="mcd-ico" weight="fill" />
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

            <p className="mcd-picker-hint">
              {mode === 'status'
                ? 'Für welches Projekt soll Tagro den Statusbericht erstellen?'
                : 'Womit soll Tagro arbeiten?'}
            </p>

            <button
              type="button"
              className="mcd-pick mcd-pick-all"
              onClick={() => mode === 'status' ? pickStatus(null) : pickTagro(null, 'Alle Projekte')}
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
                  onClick={() => mode === 'status' ? pickStatus(p.id) : pickTagro(p.id, p.title)}
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
        </div>
      )}

      <style jsx>{`
        .mcd { display: none; }

        /* Legacy nav + per-page bars are off whenever the dock is mounted. */
        :global(body.festag-client-dock) :global(.bottom-nav),
        :global(body.festag-client-dock) :global(.mob-bar),
        :global(body.festag-client-dock) :global(.tmb) { display: none !important; }

        @media (max-width: 768px) {
          .mcd {
            display: flex;
            align-items: center;
            gap: 10px;
            position: fixed;
            left: 14px; right: 14px;
            bottom: calc(14px + env(safe-area-inset-bottom, 0px));
            z-index: 190;
            pointer-events: auto;
          }
          :global(body.chat-composer-focused) .mcd {
            transform: translateY(140%); transition: transform .2s ease;
          }
          :global(body.festag-client-dock) :global(.app-workspace),
          :global(body.festag-client-dock) :global(.app-workspace-scroll) {
            padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important;
          }
          :global(body.festag-client-dock) :global(.app-footer-controls) {
            display: none !important;
          }
        }

        /* ─── Buttons ─── */
        .mcd-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          height: 56px;
          padding: 0 22px;
          border: 0;
          border-radius: 999px;
          font: inherit;
          font-size: 16px;
          font-weight: 500;
          letter-spacing: -.005em;
          white-space: nowrap;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform .14s ease, background .14s ease, box-shadow .14s ease;
        }
        .mcd-btn:active { transform: scale(.975); }
        .mcd-ico { width: 19px; height: 19px; flex-shrink: 0; }

        /* LEFT: large ghost pill, takes all the remaining width. */
        .mcd-ghost {
          flex: 1 1 auto;
          background: #FFFFFF;
          color: #111111;
          box-shadow:
            inset 0 0 0 1px rgba(0,0,0,0.06),
            0 8px 24px -10px rgba(15,23,42,0.18);
        }
        .mcd-ghost:active { background: #F7F7F5; }
        :global([data-theme="dark"]) .mcd-ghost,
        :global([data-theme="classic-dark"]) .mcd-ghost {
          background: #1A1A1A; color: #F4F4F4;
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.07),
            0 12px 28px -16px rgba(0,0,0,.7);
        }
        :global([data-theme="dark"]) .mcd-ghost:active,
        :global([data-theme="classic-dark"]) .mcd-ghost:active { background: #232323; }

        /* RIGHT: solid filled action, sized to fit its label. */
        .mcd-primary {
          flex: 0 0 auto;
          background: #5B647D;
          color: #FFFFFF;
          box-shadow: 0 14px 30px -10px rgba(91,100,125,0.55);
        }
        .mcd-primary:active { background: #4d566c; }

        /* ─── Picker sheet ─── */
        .mcd-sheet-wrap {
          position: fixed; inset: 0; z-index: 16050;
          display: flex; align-items: flex-end;
        }
        .mcd-backdrop {
          position: absolute; inset: 0;
          background: rgba(8,10,14,0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .mcd-sheet {
          position: relative;
          width: 100%;
          background: #FFFFFF;
          color: #111111;
          border-radius: 24px 24px 0 0;
          padding: 8px 16px calc(20px + env(safe-area-inset-bottom, 0px));
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 -20px 60px -20px rgba(0,0,0,.4);
          animation: mcdUp .26s cubic-bezier(.16,1,.3,1) both;
        }
        :global([data-theme="dark"]) .mcd-sheet,
        :global([data-theme="classic-dark"]) .mcd-sheet {
          background: #0D0D0D; color: #F4F4F4;
        }
        @keyframes mcdUp {
          from { transform: translateY(24px); opacity: .5; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .mcd-sheet-grip {
          width: 36px; height: 4px;
          border-radius: 999px;
          background: rgba(0,0,0,0.14);
          margin: 4px auto 12px;
        }
        :global([data-theme="dark"]) .mcd-sheet-grip,
        :global([data-theme="classic-dark"]) .mcd-sheet-grip {
          background: rgba(255,255,255,0.18);
        }
        .mcd-sheet-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .mcd-sheet-head h2 {
          margin: 0;
          font-size: 19px; font-weight: 600; letter-spacing: -.012em;
        }
        .mcd-sheet-x {
          width: 30px; height: 30px;
          border: 0; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.05); color: #555;
          cursor: pointer;
        }
        :global([data-theme="dark"]) .mcd-sheet-x,
        :global([data-theme="classic-dark"]) .mcd-sheet-x {
          background: rgba(255,255,255,0.06); color: #A3A3A3;
        }
        .mcd-picker-hint {
          margin: 2px 4px 16px;
          font-size: 14px; line-height: 1.5;
          color: #555;
        }
        :global([data-theme="dark"]) .mcd-picker-hint,
        :global([data-theme="classic-dark"]) .mcd-picker-hint {
          color: #A3A3A3;
        }
        .mcd-pick {
          width: 100%;
          display: flex; align-items: center; gap: 14px;
          padding: 14px 14px;
          border: 0; border-radius: 16px;
          background: transparent;
          color: inherit;
          text-align: left;
          font: inherit;
          cursor: pointer;
          transition: background .12s ease;
        }
        .mcd-pick:active { background: rgba(0,0,0,0.04); }
        :global([data-theme="dark"]) .mcd-pick:active,
        :global([data-theme="classic-dark"]) .mcd-pick:active { background: rgba(255,255,255,0.05); }
        .mcd-pick-all {
          background: rgba(91,100,125,0.08);
          margin-bottom: 8px;
        }
        :global([data-theme="dark"]) .mcd-pick-all,
        :global([data-theme="classic-dark"]) .mcd-pick-all {
          background: rgba(91,100,125,0.18);
        }
        .mcd-pick-dot {
          width: 10px; height: 10px; border-radius: 999px;
          flex-shrink: 0;
        }
        .mcd-pick-dot-all { background: #5B647D; }
        .mcd-pick-main { display: flex; flex-direction: column; min-width: 0; }
        .mcd-pick-main strong {
          font-size: 15px; font-weight: 500; letter-spacing: -.005em;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mcd-pick-main small {
          font-size: 12.5px; color: #777; margin-top: 2px;
          text-transform: capitalize;
        }
        :global([data-theme="dark"]) .mcd-pick-main small,
        :global([data-theme="classic-dark"]) .mcd-pick-main small {
          color: #888;
        }
        .mcd-pick-list { display: flex; flex-direction: column; }
        .mcd-pick-empty {
          margin: 0; padding: 24px 0; text-align: center;
          font-size: 13.5px; color: #888;
        }
      `}</style>
    </>
  )
}
