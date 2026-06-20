'use client'

/**
 * MobileClientDock — bottom action dock for the client panel on mobile.
 *
 *   LEFT  : Statusbericht — project picker → /reports
 *   RIGHT : Mit Tagro — project picker → Tagro overlay
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChatCircle, WaveSine } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { openTagro } from '@/components/TagroOverlay'
import MobileProjectPickerSheet, { type ProjectPickerMode } from '@/components/mobile/MobileProjectPickerSheet'

type ProjectLite = { id: string; title: string; color?: string | null; status?: string | null }

export default function MobileClientDock() {
  const router = useRouter()
  const [mode, setMode] = useState<ProjectPickerMode | null>(null)
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    document.body.classList.add('festag-client-dock')
    return () => { document.body.classList.remove('festag-client-dock') }
  }, [])

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

  useEffect(() => {
    if (!mode) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mode])

  function handlePickStatus(projectId: string | null) {
    setMode(null)
    const q = projectId ? `?project=${projectId}` : ''
    router.push(`/reports${q}`)
  }

  function handlePickTagro(projectId: string | null, title: string) {
    setMode(null)
    if (projectId) {
      openTagro({ contextType: 'project', id: projectId, title })
    } else {
      openTagro({ contextType: 'empty', id: 'all', title: 'Alle Projekte', subtitle: 'Gesamtbericht' })
    }
  }

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

      <MobileProjectPickerSheet
        mode={mode}
        projects={projects}
        loading={!loaded}
        onClose={() => setMode(null)}
        onPickStatus={handlePickStatus}
        onPickTagro={handlePickTagro}
      />

      <style jsx>{`
        .mcd { display: none; }

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

        .mcd-btn {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          height: 58px;
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
        .mcd-btn:active { transform: scale(.985); }
        .mcd-ico { width: 20px; height: 20px; flex-shrink: 0; }

        .mcd-ghost {
          flex: 1 1 auto;
          justify-content: flex-start;
          padding: 0 24px;
          background: var(--surface-2, #F2F2F7);
          color: var(--text, #000);
          box-shadow: inset 0 0 0 1px var(--border, rgba(0,0,0,0.06));
        }
        .mcd-ghost .mcd-ico { color: var(--text-muted, #8E8E93); }
        .mcd-ghost:active { background: var(--card, #E5E5EA); }
        :global([data-theme="dark"]) .mcd-ghost,
        :global([data-theme="classic-dark"]) .mcd-ghost {
          background: var(--surface, #1C1C1E); color: var(--text, #FFF);
          box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,0.08));
        }
        :global([data-theme="dark"]) .mcd-ghost .mcd-ico,
        :global([data-theme="classic-dark"]) .mcd-ghost .mcd-ico { color: var(--text-muted, #8E8E93); }
        :global([data-theme="dark"]) .mcd-ghost:active,
        :global([data-theme="classic-dark"]) .mcd-ghost:active { background: var(--card, #2C2C2E); }

        .mcd-primary {
          flex: 0 0 auto;
          justify-content: center;
          padding: 0 24px;
          background: var(--btn-prim, #000);
          color: var(--btn-prim-text, #FFF);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        }
        .mcd-primary .mcd-ico { color: var(--btn-prim-text, #FFF); }
        .mcd-primary:active { opacity: 0.88; }
        :global([data-theme="dark"]) .mcd-primary,
        :global([data-theme="classic-dark"]) .mcd-primary {
          background: #FFFFFF; color: #000000;
          box-shadow: 0 8px 28px rgba(0,0,0,0.42);
        }
        :global([data-theme="dark"]) .mcd-primary .mcd-ico,
        :global([data-theme="classic-dark"]) .mcd-primary .mcd-ico { color: #000000; }
      `}</style>
    </>
  )
}
