'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  X, MagnifyingGlass, CaretRight, PaperPlaneTilt, ArrowSquareOut,
  House, Question, ChatTeardropDots, BookOpenText, Sparkle,
} from '@phosphor-icons/react'
import FestagPopupDragHandle from '@/components/ui/FestagPopupDragHandle'
import { openTagro } from '@/components/TagroOverlay'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import { docsCategories } from '@/lib/festag-docs'
import {
  searchHelpTopics,
  tagroPromptForTopic,
} from '@/lib/help/festag-help-topics'
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

  const topics = useMemo(() => searchHelpTopics(query), [query])

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
    if (!isMobile) {
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

  function askTagro(text: string, topic?: string) {
    close()
    openTagro({
      contextType: 'empty',
      id: 'help',
      title: 'Festag Hilfe',
      subtitle: topic,
      prefill: text,
    })
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    askTagro(q, q)
  }

  function onTopicClick(title: string) {
    askTagro(tagroPromptForTopic(title), title)
  }

  function openDocs(slug?: string) {
    close()
    router.push(slug ? `/docs/${slug}` : '/docs')
  }

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
            placeholder="Frag Tagro oder suche Hilfe"
            aria-label="Hilfe suchen"
            autoComplete="off"
          />
          <MagnifyingGlass size={16} weight="regular" aria-hidden />
        </form>
      </header>

      <div className="fhp-body">
        <div className="fhp-topics" role="list">
          {topics.map(topic => (
            <button
              key={topic.slug}
              type="button"
              className="fhp-topic"
              role="listitem"
              onClick={() => onTopicClick(topic.title)}
            >
              <span className="fhp-topic-copy">
                <span className="fhp-topic-title">{topic.title}</span>
                {!query.trim() ? null : (
                  <span className="fhp-topic-desc">{topic.description}</span>
                )}
              </span>
              <CaretRight size={14} weight="regular" aria-hidden />
            </button>
          ))}
        </div>

        <button
          type="button"
          className="fhp-action"
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
        <p className="fhp-sub">Guides zum Nachlesen — oder frag Tagro direkt dazu.</p>
      </header>
      <div className="fhp-body">
        <button type="button" className="fhp-action fhp-action-primary" onClick={() => openDocs()}>
          <span className="fhp-action-copy">
            <BookOpenText size={16} weight="regular" aria-hidden />
            <span>Alle Docs öffnen</span>
          </span>
          <ArrowSquareOut size={16} weight="regular" aria-hidden />
        </button>
        <div className="fhp-topics" role="list">
          {docsCategories.slice(0, 8).map(cat => (
            <button
              key={cat.title}
              type="button"
              className="fhp-topic"
              role="listitem"
              onClick={() => askTagro(`Erkläre mir den Bereich „${cat.title}" in Festag.`)}
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
        <button type="button" className="fhp-action fhp-action-primary" onClick={() => { close(); openSupportEmail() }}>
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
      <button
        type="button"
        className={`fhp-tab${tab === 'home' ? ' on' : ''}`}
        onClick={() => setTab('home')}
      >
        <House size={18} weight={tab === 'home' ? 'fill' : 'regular'} aria-hidden />
        <span>Start</span>
      </button>
      <button
        type="button"
        className={`fhp-tab${tab === 'help' ? ' on' : ''}`}
        onClick={() => setTab('help')}
      >
        <Question size={18} weight={tab === 'help' ? 'fill' : 'regular'} aria-hidden />
        <span>Docs</span>
      </button>
      <button
        type="button"
        className={`fhp-tab${tab === 'messages' ? ' on' : ''}`}
        onClick={() => setTab('messages')}
      >
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
        <div
          ref={popRef}
          className="fhp-pop festag-popup-mobile-sheet"
          role="dialog"
          aria-label="Festag Help"
        >
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
    background: var(--fp-bg, #fff);
    border: 1px solid var(--fp-border, rgba(15, 23, 42, 0.08));
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 24px 48px rgba(15, 23, 42, 0.14),
      0 8px 16px rgba(15, 23, 42, 0.06);
    animation: fhpIn .16s cubic-bezier(.16, 1, .3, 1) both;
  }
  .fhp-pop.festag-popup-mobile-sheet {
    width: 100%;
    max-width: 100%;
    max-height: min(88dvh, 720px);
    border-radius: 20px 20px 0 0;
    animation: none;
    z-index: auto;
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
  .fhp-hero-compact {
    padding-bottom: 16px;
  }
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
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.82);
    cursor: pointer;
    transition: background .12s ease;
  }
  .fhp-close:hover { background: rgba(255, 255, 255, 0.14); }
  .fhp-greeting {
    margin: 0 0 2px;
    font-size: 14px;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.72);
    letter-spacing: -0.01em;
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
  .fhp-hero-compact .fhp-headline {
    margin-bottom: 6px;
    font-size: 20px;
  }
  .fhp-sub {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.68);
    letter-spacing: -0.01em;
  }
  .fhp-search {
    position: relative;
    display: block;
  }
  .fhp-search input {
    width: 100%;
    box-sizing: border-box;
    height: 42px;
    padding: 0 40px 0 14px;
    border: 0;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font: inherit;
    font-size: 14px;
    letter-spacing: -0.01em;
    outline: none;
    transition: background .12s ease, box-shadow .12s ease;
  }
  .fhp-search input::placeholder { color: rgba(255, 255, 255, 0.48); }
  .fhp-search input:focus {
    background: rgba(255, 255, 255, 0.14);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12);
  }
  .fhp-search svg {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.55);
    pointer-events: none;
  }
  .fhp-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 10px;
    scrollbar-width: none;
  }
  .fhp-body::-webkit-scrollbar { display: none; }
  .fhp-topics {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
    padding: 4px;
    border: 1px solid var(--fp-divider, rgba(15, 23, 42, 0.08));
    border-radius: 14px;
    background: var(--fp-surface, rgba(15, 23, 42, 0.02));
  }
  .fhp-topic,
  .fhp-action {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
  }
  .fhp-topic {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    gap: 8px;
    align-items: center;
    min-height: 44px;
    padding: 8px 10px;
    border: 0;
    border-radius: 10px !important;
    background: transparent;
    color: var(--fp-text, #1d1d1f);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background .12s ease, transform .08s ease;
  }
  .fhp-topic:hover { background: var(--fp-hover, rgba(15, 23, 42, 0.04)); }
  .fhp-topic:active { transform: scale(0.985); }
  .fhp-topic-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .fhp-topic-title {
    font-size: 13.5px;
    font-weight: 400;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fhp-topic-desc {
    font-size: 12px;
    color: var(--fp-muted, #86868b);
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .fhp-topic svg,
  .fhp-action svg {
    flex-shrink: 0;
    color: var(--fp-muted, #86868b);
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
    border: 1px solid var(--fp-divider, rgba(15, 23, 42, 0.08));
    border-radius: 14px !important;
    background: var(--fp-bg, #fff);
    color: var(--fp-text, #1d1d1f);
    font: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: background .12s ease, border-color .12s ease, transform .08s ease;
  }
  .fhp-action:hover {
    background: var(--fp-hover, rgba(15, 23, 42, 0.03));
    border-color: color-mix(in srgb, var(--fp-divider, rgba(15, 23, 42, 0.08)) 70%, var(--fp-text, #1d1d1f));
  }
  .fhp-action:active { transform: scale(0.985); }
  .fhp-action-primary {
    background: color-mix(in srgb, var(--fp-text, #1d1d1f) 4%, transparent);
  }
  .fhp-action-copy {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    letter-spacing: -0.01em;
  }
  .fhp-note {
    margin: 8px 4px 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--fp-muted, #86868b);
    letter-spacing: -0.01em;
  }
  .fhp-tabs {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    padding: 8px 10px 10px;
    border-top: 1px solid var(--fp-divider, rgba(15, 23, 42, 0.08));
    background: var(--fp-bg, #fff);
  }
  .fhp-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-height: 52px;
    border: 0;
    border-radius: 12px !important;
    background: transparent;
    color: var(--fp-muted, #86868b);
    font: inherit;
    font-size: 11px;
    letter-spacing: -0.01em;
    cursor: pointer;
    transition: background .12s ease, color .12s ease;
  }
  .fhp-tab:hover {
    background: var(--fp-hover, rgba(15, 23, 42, 0.04));
    color: var(--fp-text, #1d1d1f);
  }
  .fhp-tab.on {
    color: var(--fp-text, #1d1d1f);
    background: var(--fp-hover, rgba(15, 23, 42, 0.05));
  }
  html[data-theme="dark"] .fhp-pop,
  html[data-theme="classic-dark"] .fhp-pop {
    background: var(--festag-black-popup, #121214);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 24px 48px rgba(0, 0, 0, 0.45);
  }
  html[data-theme="dark"] .fhp-topics,
  html[data-theme="classic-dark"] .fhp-topics {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
  }
  html[data-theme="dark"] .fhp-action,
  html[data-theme="classic-dark"] .fhp-action {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
  }
  html[data-theme="dark"] .fhp-tabs,
  html[data-theme="classic-dark"] .fhp-tabs {
    background: var(--festag-black-popup, #121214);
    border-top-color: rgba(255, 255, 255, 0.08);
  }
`
