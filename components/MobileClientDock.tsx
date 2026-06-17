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
          background: #FFFFFF;
          color: #1A1A1A;
          box-shadow:
            inset 0 0 0 1px rgba(0,0,0,0.05),
            0 6px 20px -10px rgba(15,23,42,0.16);
        }
        .mcd-ghost .mcd-ico { color: #5A5A5A; }
        .mcd-ghost:active { background: #F4F4F4; }
        :global([data-theme="dark"]) .mcd-ghost,
        :global([data-theme="classic-dark"]) .mcd-ghost {
          background: #1C1C1E; color: #F4F4F4;
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.08),
            0 12px 28px -16px rgba(0,0,0,.7);
        }
        :global([data-theme="dark"]) .mcd-ghost .mcd-ico,
        :global([data-theme="classic-dark"]) .mcd-ghost .mcd-ico { color: #9A9A9A; }
        :global([data-theme="dark"]) .mcd-ghost:active,
        :global([data-theme="classic-dark"]) .mcd-ghost:active { background: #262628; }

        .mcd-primary {
          flex: 0 0 auto;
          justify-content: center;
          padding: 0 24px;
          background: #5B647D;
          color: #FFFFFF;
          box-shadow: 0 12px 26px -10px rgba(91,100,125,0.5);
        }
        .mcd-primary .mcd-ico { color: #FFFFFF; }
        .mcd-primary:active { background: #4d566c; }
      `}</style>
    </>
  )
}
