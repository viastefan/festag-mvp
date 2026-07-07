'use client'

import { useEffect, useState, type ReactNode } from 'react'
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

export default function LegalDoc({
  toc,
  children,
}: {
  toc?: LegalTocItem[]
  children: ReactNode
}) {
  const [activeId, setActiveId] = useState<string | null>(toc?.[0]?.id ?? null)

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
      <div className="legal-toc-mobile">
        <p className="legal-toc-label">Inhalt</p>
        <TocLinks
          items={toc}
          className="legal-toc-mobile-scroll"
          linkClass="legal-toc-chip"
          activeId={activeId}
        />
      </div>

      <article className="legal-article">{children}</article>

      <aside className="legal-toc-wrap" aria-label="Seiteninhalt">
        <p className="legal-toc-label">Inhalt</p>
        <TocLinks
          items={toc}
          linkClass="legal-toc-link"
          activeId={activeId}
        />
      </aside>
    </div>
  )
}
