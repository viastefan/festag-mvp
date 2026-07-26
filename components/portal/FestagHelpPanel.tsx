'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  X, MagnifyingGlass, CaretRight, PaperPlaneTilt, ArrowSquareOut,
  House, Question, ChatTeardropDots, BookOpenText, Sparkle, FileText,
} from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { openTagro } from '@/components/TagroOverlay'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { docsCategories } from '@/lib/festag-docs'
import {
  docsHref,
  searchFestagHelp,
  tagroPromptForHelp,
} from '@/lib/help/festag-help-index'
import { openSupportEmail } from '@/lib/help/settings-actions'

type Tab = 'home' | 'help' | 'messages'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef: React.RefObject<HTMLElement | null>
  trigger: ReactNode
  userName?: string
  railCollapsed?: boolean
}

function firstName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return 'du'
  return trimmed.split(/\s+/)[0] || trimmed
}

export default function FestagHelpPanel({
  open,
  onOpenChange,
  anchorRef,
  trigger,
  userName = '',
  railCollapsed = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const isMobile = useFestagMobile()
  const [pos, setPos] = useState({ left: 0, bottom: 0 })
  const [tab, setTab] = useState<Tab>('home')
  const [query, setQuery] = useState('')
  const greeting = firstName(userName)

  const hits = useMemo(() => searchFestagHelp(query), [query])
  const hasQuery = query.trim().length > 0

  useEffect(() => {
    function place() {
      const r = anchorRef.current?.getBoundingClientRect()
      if (!r) return
      const popW = 380
      const left = railCollapsed
        ? Math.min(r.right + 10, window.innerWidth - popW - 12)
        : Math.max(12, Math.min(r.left, window.innerWidth - popW - 12))
      setPos({
        left,
        bottom: window.innerHeight - r.top + 8,
      })
    }
    if (!open || isMobile) return
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchorRef, railCollapsed, isMobile])

  useEffect(() => {
    if (!open) {
      setTab('home')
      setQuery('')
      return
    }
    if (!isMobile && tab === 'home') {
      const t = window.setTimeout(() => searchRef.current?.focus(), 120)
      return () => window.clearTimeout(t)
    }
  }, [open, isMobile, tab])

  useEffect(() => {
    if (!open || !isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (wrapRef.current?.contains(t)) return
      if (popRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return
      onOpenChange(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('click', onDown, true)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('click', onDown, true)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, onOpenChange, anchorRef])

  const close = () => onOpenChange(false)

  function askTagro(text: string, docSlug?: string, topic?: string) {
    close()
    openTagro({
      contextType: 'empty',
      id: 'help',
      title: 'Festag Hilfe',
      subtitle: topic,
      prefill: text,
      helpDocSlug: docSlug,
      submit: text,
    })
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    const best = hits[0]
    askTagro(tagroPromptForHelp(q, best ? { slug: best.slug, title: best.title } : null), best?.slug, q)
  }

  function onTopicExplain(slug: string, title: string) {
    askTagro(tagroPromptForHelp(`Erkläre mir: ${title}`, { slug, title }), slug, title)
  }

  function openDocs(slug?: string) {
    close()
    router.push(slug ? docsHref(slug) : '/docs')
  }

  const topicList = (
    <div className="fhp-topics" role="list">
      {hits.length === 0 && hasQuery ? (
        <p className="fhp-empty">Kein Doc-Treffer — frag Tagro trotzdem, sie hilft dir weiter.</p>
      ) : null}
      {hits.map(hit => (
        <div key={hit.slug} className="fhp-topic-row" role="listitem">
          <button
            type="button"
            className="fhp-topic"
            onClick={() => onTopicExplain(hit.slug, hit.title)}
          >
            <span className="fhp-topic-copy">
              <span className="fhp-topic-title">{hit.title}</span>
              <span className="fhp-topic-desc">{hit.description}</span>
              <span className="fhp-topic-meta">{hit.category}{hit.readingTime ? `, ${hit.readingTime}` : ''}</span>
            </span>
            <CaretRight size={14} weight="regular" aria-hidden />
          </button>
          <button
            type="button"
            className="fhp-doc-btn"
            title="Doc öffnen"
            aria-label={`Doc öffnen: ${hit.title}`}
            onClick={() => openDocs(hit.slug)}
          >
            <FileText size={14} weight="regular" />
          </button>
        </div>
      ))}
    </div>
  )

  const homeBody = (
    <>
      <header className="fhp-hero">
        <button type="button" className="fhp-close" aria-label="Schließen" onClick={close}>
          <X size={16} weight="regular" />
        </button>
        <p className="fhp-greeting">Hallo {greeting}</p>
        <p className="fhp-headline">Wie können wir helfen?</p>
        <form className="fhp-search" onSubmit={onSearchSubmit}>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Frag Tagro oder suche in den Docs"
            aria-label="Hilfe suchen"
            autoComplete="off"
          />
          <button type="submit" className="fhp-search-btn" aria-label="Suchen">
            <MagnifyingGlass size={16} weight="regular" />
          </button>
        </form>
      </header>

      <div className="fhp-body">
        {!hasQuery ? <p className="fhp-section-label">Beliebte Themen</p> : (
          <p className="fhp-section-label">{hits.length} Treffer in Festag Docs</p>
        )}
        {topicList}

        <button
          type="button"
          className="fhp-action fhp-action-accent"
          onClick={() => askTagro('Ich brauche Hilfe bei Festag. Was kannst du für mich tun?')}
        >
          <span className="fhp-action-copy">
            <Sparkle size={16} weight="regular" aria-hidden />
            <span>Mit Tagro sprechen</span>
          </span>
          <CaretRight size={14} weight="regular" aria-hidden />
        </button>

        <button type="button" className="fhp-action" onClick={() => { close(); openSupportEmail() }}>
          <span className="fhp-action-copy">
            <span>Nachricht senden</span>
          </span>
          <PaperPlaneTilt size={16} weight="regular" aria-hidden />
        </button>

        <Link href="/updates" className="fhp-action" onClick={close}>
          <span className="fhp-action-copy">
            <span>Festag Status</span>
          </span>
          <ArrowSquareOut size={16} weight="regular" aria-hidden />
        </Link>
      </div>
    </>
  )

  const helpBody = (
    <>
      <header className="fhp-hero fhp-hero-compact">
        <button type="button" className="fhp-close" aria-label="Schließen" onClick={close}>
          <X size={16} weight="regular" />
        </button>
        <p className="fhp-headline">Docs & Anleitungen</p>
        <p className="fhp-sub">Guides aus Festag Docs — Tagro erklärt, du liest nach.</p>
      </header>
      <div className="fhp-body">
        <button type="button" className="fhp-action fhp-action-accent" onClick={() => openDocs()}>
          <span className="fhp-action-copy">
            <BookOpenText size={16} weight="regular" aria-hidden />
            <span>Alle Docs öffnen</span>
          </span>
          <ArrowSquareOut size={16} weight="regular" aria-hidden />
        </button>
        <p className="fhp-section-label">Nach Bereich</p>
        <div className="fhp-topics" role="list">
          {docsCategories.map(cat => (
            <button
              key={cat.title}
              type="button"
              className="fhp-topic"
              role="listitem"
              onClick={() => askTagro(`Erkläre mir den Bereich „${cat.title}" in Festag und verlinke passende Docs.`)}
            >
              <span className="fhp-topic-copy">
                <span className="fhp-topic-title">{cat.title}</span>
                <span className="fhp-topic-desc">{cat.description}</span>
              </span>
              <CaretRight size={14} weight="regular" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </>
  )

  const messagesBody = (
    <>
      <header className="fhp-hero fhp-hero-compact">
        <button type="button" className="fhp-close" aria-label="Schließen" onClick={close}>
          <X size={16} weight="regular" />
        </button>
        <p className="fhp-headline">Kontakt</p>
        <p className="fhp-sub">Schreib uns — oder lass Tagro dir erst alles erklären.</p>
      </header>
      <div className="fhp-body">
        <button type="button" className="fhp-action fhp-action-accent" onClick={() => { close(); openSupportEmail() }}>
          <span className="fhp-action-copy">
            <PaperPlaneTilt size={16} weight="regular" aria-hidden />
            <span>E-Mail an hi@festag.io</span>
          </span>
          <ArrowSquareOut size={16} weight="regular" aria-hidden />
        </button>
        <button
          type="button"
          className="fhp-action"
          onClick={() => askTagro('Ich habe eine Frage an das Festag-Team. Hilf mir, mein Anliegen kurz zu formulieren.')}
        >
          <span className="fhp-action-copy">
            <Sparkle size={16} weight="regular" aria-hidden />
            <span>Anliegen mit Tagro vorbereiten</span>
          </span>
          <CaretRight size={14} weight="regular" aria-hidden />
        </button>
        <p className="fhp-note">
          Für Setup, Onboarding oder wenn etwas im Produkt hakt — wir antworten in der Regel am selben Werktag.
        </p>
      </div>
    </>
  )

  const tabBody = tab === 'home' ? homeBody : tab === 'help' ? helpBody : messagesBody

  const tabBar = (
    <nav className="fhp-tabs" aria-label="Festag Help">
      <button type="button" className={`fhp-tab${tab === 'home' ? ' on' : ''}`} onClick={() => setTab('home')}>
        <House size={18} weight={tab === 'home' ? 'fill' : 'regular'} aria-hidden />
        <span>Start</span>
      </button>
      <button type="button" className={`fhp-tab${tab === 'help' ? ' on' : ''}`} onClick={() => setTab('help')}>
        <Question size={18} weight={tab === 'help' ? 'fill' : 'regular'} aria-hidden />
        <span>Docs</span>
      </button>
      <button type="button" className={`fhp-tab${tab === 'messages' ? ' on' : ''}`} onClick={() => setTab('messages')}>
        <ChatTeardropDots size={18} weight={tab === 'messages' ? 'fill' : 'regular'} aria-hidden />
        <span>Kontakt</span>
      </button>
    </nav>
  )

  const panelContent = (
    <>
      {tabBody}
      {tabBar}
    </>
  )

  const panel = open && typeof document !== 'undefined' ? createPortal(
    isMobile ? (
      <div className="festag-popup-mobile-host">
        <button type="button" className="festag-popup-backdrop" aria-label="Schließen" onClick={close} />
        <div ref={popRef} className="fhp-pop festag-popup-mobile-sheet" role="dialog" aria-label="Festag Help">
          <FestagPopupDragHandle onDismiss={close} />
          {panelContent}
        </div>
      </div>
    ) : (
      <div
        ref={popRef}
        className="fhp-pop festag-anchor-popover"
        style={{ left: pos.left, bottom: pos.bottom }}
        role="dialog"
        aria-label="Festag Help"
      >
        {panelContent}
      </div>
    ),
    document.body,
  ) : null

  return (
    <div ref={wrapRef} className="fhp-wrap">
      {trigger}
      {panel}
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
  .fhp-wrap {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
  }
  .fhp-pop {
    position: fixed;
    z-index: 120000;
    width: min(380px, calc(100vw - 24px));
    max-height: min(640px, calc(100dvh - 96px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 20px;
    padding: 0;
    background: #ffffff;
    border: 1px solid rgba(15, 23, 42, 0.1);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 24px 48px rgba(15, 23, 42, 0.18),
      0 8px 16px rgba(15, 23, 42, 0.08);
    animation: fhpIn .16s cubic-bezier(.16, 1, .3, 1) both;
    color: #1d1d1f;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .fhp-pop.festag-popup-mobile-sheet {
    width: 100%;
    max-width: 100%;
    max-height: min(88dvh, 720px);
    border-radius: 20px 20px 0 0;
    animation: none;
    z-index: auto;
  }
  html[data-theme="dark"] .fhp-pop,
  html[data-theme="classic-dark"] .fhp-pop {
    background: #ffffff;
    border-color: rgba(15, 23, 42, 0.12);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.06),
      0 28px 56px rgba(0, 0, 0, 0.55),
      0 8px 20px rgba(0, 0, 0, 0.35);
    color: #1d1d1f;
  }
  @keyframes fhpIn {
    from { opacity: 0; transform: translateY(6px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
  .fhp-hero {
    position: relative;
    padding: 22px 20px 18px;
    background: linear-gradient(to bottom, #0c0c0e, #161618);
    color: #fff;
    flex-shrink: 0;
  }
  .fhp-hero-compact { padding-bottom: 16px; }
  .fhp-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
    cursor: pointer;
  }
  .fhp-close:hover { background: rgba(255, 255, 255, 0.16); }
  .fhp-greeting {
    margin: 0 0 2px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.72);
  }
  .fhp-headline {
    margin: 0 0 14px;
    padding-right: 28px;
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.03em;
    line-height: 1.15;
    color: #fff;
  }
  .fhp-hero-compact .fhp-headline { margin-bottom: 6px; font-size: 20px; }
  .fhp-sub {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.68);
  }
  .fhp-search { position: relative; display: block; }
  .fhp-search input {
    width: 100%;
    box-sizing: border-box;
    height: 42px;
    padding: 0 44px 0 14px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    font: inherit;
    font-size: 14px;
    outline: none;
  }
  .fhp-search input::placeholder { color: rgba(255, 255, 255, 0.5); }
  .fhp-search input:focus {
    background: rgba(255, 255, 255, 0.16);
    border-color: rgba(255, 255, 255, 0.22);
  }
  .fhp-search-btn {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
  }
  .fhp-search-btn:hover { background: rgba(255, 255, 255, 0.18); }
  .fhp-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 12px;
    background: #f5f5f7;
    color: #1d1d1f;
    scrollbar-width: none;
  }
  .fhp-body::-webkit-scrollbar { display: none; }
  .fhp-section-label {
    margin: 0 4px 8px;
    font-size: 12px;
    font-weight: 500;
    color: #6e6e73;
    letter-spacing: 0.01em;
  }
  .fhp-empty {
    margin: 0;
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.45;
    color: #6e6e73;
  }
  .fhp-topics {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
    padding: 4px;
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 14px;
    background: #ffffff;
  }
  .fhp-topic-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 36px;
    gap: 4px;
    align-items: stretch;
  }
  .fhp-topic,
  .fhp-action,
  .fhp-doc-btn {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .fhp-topic {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    gap: 8px;
    align-items: center;
    min-height: 52px;
    padding: 8px 10px;
    border: 0 !important;
    border-radius: 10px !important;
    background: transparent !important;
    color: #1d1d1f !important;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background .12s ease;
  }
  .fhp-topic:hover { background: rgba(15, 23, 42, 0.05) !important; }
  .fhp-topic-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .fhp-topic-title {
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: #1d1d1f !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fhp-topic-desc {
    font-size: 12px;
    color: #6e6e73 !important;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .fhp-topic-meta {
    font-size: 11px;
    color: #86868b !important;
  }
  .fhp-topic svg { color: #86868b !important; flex-shrink: 0; }
  .fhp-doc-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(15, 23, 42, 0.1) !important;
    border-radius: 10px !important;
    background: #f5f5f7 !important;
    color: #6e6e73 !important;
    cursor: pointer;
    transition: background .12s ease, color .12s ease;
  }
  .fhp-doc-btn:hover {
    background: rgba(15, 23, 42, 0.06) !important;
    color: #1d1d1f !important;
  }
  .fhp-action {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 46px;
    margin-bottom: 6px;
    padding: 0 12px;
    border: 1px solid rgba(15, 23, 42, 0.1) !important;
    border-radius: 14px !important;
    background: #ffffff !important;
    color: #1d1d1f !important;
    font: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: background .12s ease, border-color .12s ease;
  }
  .fhp-action:hover { background: rgba(15, 23, 42, 0.04) !important; }
  .fhp-action-accent {
    background: #ffffff !important;
    border-color: rgba(15, 23, 42, 0.14) !important;
  }
  .fhp-action-copy {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: #1d1d1f !important;
  }
  .fhp-action svg { color: #6e6e73 !important; flex-shrink: 0; }
  .fhp-note {
    margin: 8px 4px 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: #6e6e73;
  }
  .fhp-tabs {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    padding: 8px 10px 10px;
    border-top: 1px solid rgba(15, 23, 42, 0.1);
    background: #ffffff;
  }
  .fhp-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-height: 52px;
    border: 0 !important;
    border-radius: 12px !important;
    background: transparent !important;
    color: #6e6e73 !important;
    font: inherit;
    font-size: 11px;
    cursor: pointer;
    transition: background .12s ease, color .12s ease;
  }
  .fhp-tab:hover {
    background: rgba(15, 23, 42, 0.05) !important;
    color: #1d1d1f !important;
  }
  .fhp-tab.on {
    color: #1d1d1f !important;
    background: rgba(15, 23, 42, 0.06) !important;
    font-weight: 500;
  }
  .fhp-tab svg { color: inherit !important; }
`
