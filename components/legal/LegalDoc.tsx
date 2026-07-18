'use client'

import { ArrowUUpLeft } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import LegalMobileDock from '@/components/legal/LegalMobileDock'
import { navigateLegalBack } from '@/lib/legal-return'
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

/** Article body with desktop left TOC (+ Zurück above) + mobile Tagro dock. */
export default function LegalDoc({
  toc,
  children,
}: {
  toc?: LegalTocItem[]
  children: ReactNode
}) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(toc?.[0]?.id ?? null)
  const [pageTitle, setPageTitle] = useState('Rechtstext')
  const hasToc = Boolean(toc?.length)

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

  function goBack() {
    navigateLegalBack(router.push, router.back)
  }

  return (
    <div className={`legal-doc has-aside${hasToc ? ' has-toc' : ''}`}>
      <aside className="legal-toc-wrap" aria-label="Seiteninhalt">
        <button
          type="button"
          className="legal-icon-btn legal-toc-back no-min-tap"
          aria-label="Zurück"
          onClick={goBack}
        >
          <ArrowUUpLeft size={15} weight="regular" aria-hidden />
        </button>
        {hasToc ? (
          <TocLinks
            items={toc!}
            linkClass="legal-toc-link"
            activeId={activeId}
          />
        ) : null}
      </aside>

      <article className="legal-article">{children}</article>

      {hasToc ? (
        <LegalMobileDock toc={toc!} activeId={activeId} pageTitle={pageTitle} />
      ) : null}
    </div>
  )
}
