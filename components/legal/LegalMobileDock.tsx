'use client'

/**
 * LegalMobileDock — mobile-only floating chrome for legal pages with TOC.
 * Left: Inhaltsverzeichnis sheet. Right: TagroPromptComposer → handoff to /tagro.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { List } from '@phosphor-icons/react'
import TagroPromptComposer from '@/components/TagroPromptComposer'
import type { LegalTocItem } from '@/lib/legal-toc'
import { stashTagroHandoff } from '@/lib/tagro/handoff'

type Props = {
  toc: LegalTocItem[]
  activeId: string | null
  pageTitle: string
}

export default function LegalMobileDock({ toc, activeId, pageTitle }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setSheetOpen(false)
  }, [pathname])

  useEffect(() => {
    if (sheetOpen) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setSheetVisible(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setSheetVisible(false)
  }, [sheetOpen])

  useEffect(() => {
    if (!sheetOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  function goToSection(id: string) {
    setSheetOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    window.location.hash = id
  }

  function handoffTagro(text: string) {
    const q = text.trim()
    stashTagroHandoff({
      contextType: 'empty',
      id: `legal:${pathname || 'doc'}`,
      title: pageTitle || 'Rechtstext',
      subtitle: 'Kontext aus Festag Rechtstext',
      prefill: q || undefined,
      submit: q || undefined,
      workspace: true,
    })
    router.push('/tagro')
  }

  if (!mounted) return null

  return createPortal(
    <div className="legal-mdock" role="toolbar" aria-label="Inhalt und Tagro">
      <button
        type="button"
        className="legal-mdock-toc"
        aria-label="Inhaltsverzeichnis"
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen(v => !v)}
      >
        <List size={20} weight="regular" aria-hidden />
      </button>

      <div className="legal-mdock-tagro">
        <TagroPromptComposer
          className="tagro-composer--legal"
          placeholder={`Frag Tagro zu ${pageTitle || 'diesem Text'}…`}
          showPlus={false}
          showModeSelect={false}
          onSubmit={handoffTagro}
        />
      </div>

      {sheetOpen ? (
        <div
          className={`legal-toc-sheet${sheetVisible ? ' is-visible' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Inhaltsverzeichnis"
        >
          <button
            type="button"
            className="legal-toc-sheet-backdrop"
            aria-label="Schließen"
            onClick={() => setSheetOpen(false)}
          />
          <div className="legal-toc-sheet-panel">
            <div className="legal-toc-sheet-grip" aria-hidden />
            <p className="legal-toc-sheet-title">Inhalt</p>
            <nav className="legal-toc-sheet-nav" aria-label="Abschnitte">
              {toc.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`legal-toc-sheet-link${activeId === item.id ? ' active' : ''}`}
                  onClick={() => goToSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
