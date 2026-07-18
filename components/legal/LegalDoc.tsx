'use client'

import { useEffect, useState, type ReactNode } from 'react'
import LegalMobileDock from '@/components/legal/LegalMobileDock'
import type { LegalTocItem } from '@/lib/legal-toc'

function TocLinks({
  items,
  className,
  linkClass,
  activeId,
}: {
  items: LegalTocItem[]
  className?: string
  linkClass: string
  activeId: string | null
}) {
  return (
    <nav className={className} aria-label="Inhaltsverzeichnis">
      {items.map(item => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`${linkClass}${activeId === item.id ? ' active' : ''}`}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}

function readPageTitle(): string {
  if (typeof document === 'undefined') return 'Rechtstext'
  const h1 = document.querySelector('.legal-title')
  return (h1?.textContent || 'Rechtstext').trim()
}

/** Article body with desktop left TOC + mobile Tagro dock (no pill strip). */
export default function LegalDoc({
  toc,
  children,
}: {
  toc?: LegalTocItem[]
  children: ReactNode
}) {
  const [activeId, setActiveId] = useState<string | null>(toc?.[0]?.id ?? null)
  const [pageTitle, setPageTitle] = useState('Rechtstext')

  useEffect(() => {
    setPageTitle(readPageTitle())
  }, [toc])

  useEffect(() => {
    if (!toc?.length) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 1] },
    )

    toc.forEach(item => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [toc])

  if (!toc?.length) {
    return <article className="legal-article">{children}</article>
  }

  return (
    <div className="legal-doc has-toc">
      <aside className="legal-toc-wrap" aria-label="Seiteninhalt">
        <TocLinks
          items={toc}
          linkClass="legal-toc-link"
          activeId={activeId}
        />
      </aside>

      <article className="legal-article">{children}</article>

      <LegalMobileDock toc={toc} activeId={activeId} pageTitle={pageTitle} />
    </div>
  )
}
