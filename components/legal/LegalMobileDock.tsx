'use client'

/**
 * LegalMobileDock — mobile-only floating chrome for legal pages with TOC.
 * Left: Inhaltsverzeichnis sheet. Right: TagroPromptComposer → handoff to /tagro.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { DotsThree } from '@phosphor-icons/react'
import TagroPromptComposer from '@/components/TagroPromptComposer'
import type { LegalTocItem } from '@/lib/legal-toc'
import { legalTagroContextLabel, legalTagroMention } from '@/lib/legal-tagro-context'
import { stashTagroHandoff } from '@/lib/tagro/handoff'

const SHEET_EXIT_MS = 280

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
  const [sheetMounted, setSheetMounted] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)

  const contextLabel = legalTagroContextLabel(pathname, pageTitle)
  const contextMention = legalTagroMention(pathname, pageTitle)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setSheetOpen(false)
  }, [pathname])

  useEffect(() => {
    if (sheetOpen) {
      setSheetMounted(true)
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setSheetVisible(true))
      })
      return () => cancelAnimationFrame(id)
    }
    setSheetVisible(false)
    const t = window.setTimeout(() => setSheetMounted(false), SHEET_EXIT_MS)
    return () => window.clearTimeout(t)
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
    if (!q) return
    const withContext = q.includes(contextMention) || q.startsWith('@')
      ? q
      : `${contextMention} ${q}`
    stashTagroHandoff({
      contextType: 'empty',
      id: `legal:${pathname || 'doc'}`,
      title: contextLabel,
      subtitle: 'Festag Rechtstext',
      prefill: withContext,
      submit: withContext,
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
        <DotsThree size={22} weight="bold" aria-hidden />
      </button>

      <div className="legal-mdock-tagro">
        <TagroPromptComposer
          className="tagro-composer--legal"
          placeholder="Frage stellen…"
          contextChip={contextMention}
          showPlus={false}
          showModeSelect={false}
          onSubmit={handoffTagro}
        />
      </div>

      {sheetMounted ? (
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
