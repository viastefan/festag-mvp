'use client'

/**
 * TagroGhostSuggest — discreet live preview while typing in a real field.
 *
 * - Never writes into the field until the CTA is clicked.
 * - Idle: first ~4 characters of the better formulation.
 * - Hover: up to 6 words, then faded "…".
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import TagroLogo from '@/components/TagroLogo'

type Props = {
  /** Show when the anchored field is focused and has enough text. */
  active: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  fieldValue: string
  onApply: (suggestion: string) => void
  fieldLabel?: string
  ctaLabel?: string
  /** Optional page/document context for the improve API. */
  documentKind?: string
}

const MIN_CHARS = 4
const DEBOUNCE_MS = 480
const IDLE_CHARS = 4
const HOVER_WORDS = 6

function localPolish(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  const capped = t.charAt(0).toUpperCase() + t.slice(1)
  if (/[.!?]$/.test(capped)) return capped
  // Soft project-brief tone without inventing facts.
  if (capped.length < 28) return `${capped} — klar und umsetzbar.`
  return `${capped}.`
}

function idlePreview(text: string): string {
  const t = text.trim()
  if (!t) return ''
  return t.slice(0, IDLE_CHARS)
}

function hoverPreview(text: string): { head: string; ellipsis: boolean } {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { head: '', ellipsis: false }
  if (words.length <= HOVER_WORDS) return { head: words.join(' '), ellipsis: false }
  return { head: words.slice(0, HOVER_WORDS).join(' '), ellipsis: true }
}

export default function TagroGhostSuggest({
  active,
  anchorRef,
  fieldValue,
  onApply,
  fieldLabel = 'Kurzbeschreibung',
  ctaLabel = 'Mit Tagro formulieren',
  documentKind = 'Projekt',
}: Props) {
  const [suggestion, setSuggestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const reqRef = useRef(0)
  const lastSourceRef = useRef('')

  const place = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = Math.min(320, Math.max(200, r.width * 0.72))
    const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12))
    const top = Math.min(r.bottom + 8, window.innerHeight - 72)
    setPos({ top, left, width })
  }, [anchorRef])

  useEffect(() => {
    if (!active) {
      setPos(null)
      setHovered(false)
      return
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [active, place, fieldValue])

  useEffect(() => {
    if (!active) return
    const source = fieldValue.trim()
    if (source.length < MIN_CHARS) {
      setSuggestion('')
      lastSourceRef.current = ''
      return
    }
    if (source === lastSourceRef.current) return

    const id = ++reqRef.current
    setBusy(true)
    const timer = window.setTimeout(async () => {
      let next = localPolish(source)
      try {
        const res = await fetch('/api/tagro/improve-text', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: source,
            action: 'clearer',
            fieldLabel,
            documentKind,
            pageTitle: `${documentKind}: ${fieldLabel}`,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && typeof data.improved === 'string' && data.improved.trim()) {
          next = data.improved.trim()
        }
      } catch {
        /* keep local polish */
      }
      if (reqRef.current !== id) return
      lastSourceRef.current = source
      setSuggestion(next)
      setBusy(false)
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [active, fieldValue, fieldLabel, documentKind])

  if (!active || !pos || !suggestion || typeof document === 'undefined') return null

  const idle = idlePreview(suggestion)
  const hover = hoverPreview(suggestion)
  const showHover = hovered

  return createPortal(
    <div
      className={`tgs${showHover ? ' is-hover' : ''}${busy ? ' is-busy' : ''}`}
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <style>{TGS_CSS}</style>
      <div className="tgs-row">
        <span className="tgs-mark" aria-hidden>
          <TagroLogo size={12} />
        </span>
        <p className="tgs-preview">
          {showHover ? (
            <>
              <span className="tgs-preview-text">{hover.head}</span>
              {hover.ellipsis ? <span className="tgs-ellipsis">…</span> : null}
            </>
          ) : (
            <span className="tgs-preview-text tgs-preview-text--idle">{idle}</span>
          )}
        </p>
      </div>
      <button
        type="button"
        className="tgs-cta"
        disabled={busy || !suggestion.trim()}
        onMouseDown={(e) => {
          // Keep field focus / avoid blur race before click.
          e.preventDefault()
        }}
        onClick={() => {
          const next = suggestion.trim()
          if (!next) return
          onApply(next)
          lastSourceRef.current = next
          setSuggestion('')
          setHovered(false)
        }}
      >
        {busy ? 'Tagro denkt…' : ctaLabel}
      </button>
    </div>,
    document.body,
  )
}

const TGS_CSS = `
  .tgs {
    position: fixed;
    z-index: 1300;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px 9px;
    border-radius: 10px;
    pointer-events: auto;
    background: var(--festag-black-popup, #1A1A1E);
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.2),
      0 12px 28px rgba(0, 0, 0, 0.38);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    -webkit-font-smoothing: antialiased;
    transition: box-shadow .18s ease, border-color .18s ease;
  }
  html[data-theme="light"] .tgs,
  html[data-theme="read"] .tgs {
    background: #F7F4EC;
    border: 1px solid rgba(40, 34, 28, 0.10);
    box-shadow:
      0 1px 2px rgba(40, 34, 28, 0.04),
      0 10px 24px rgba(40, 34, 28, 0.10);
  }
  .tgs.is-hover {
    border-color: rgba(91, 100, 125, 0.28);
  }
  .tgs-row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    min-width: 0;
  }
  .tgs-mark {
    flex-shrink: 0;
    margin-top: 1px;
    opacity: 0.72;
  }
  .tgs-preview {
    margin: 0;
    min-width: 0;
    flex: 1;
    color: rgba(228, 228, 234, 0.55);
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.35;
    transition: color .18s ease, font-size .18s ease;
  }
  html[data-theme="light"] .tgs-preview,
  html[data-theme="read"] .tgs-preview {
    color: rgba(40, 34, 28, 0.48);
  }
  .tgs.is-hover .tgs-preview {
    color: rgba(228, 228, 234, 0.88);
    font-size: 13.5px;
    line-height: 1.4;
  }
  html[data-theme="light"] .tgs.is-hover .tgs-preview,
  html[data-theme="read"] .tgs.is-hover .tgs-preview {
    color: #1e1e20;
  }
  .tgs-preview-text--idle {
    letter-spacing: 0.04em;
  }
  .tgs-ellipsis {
    margin-left: 2px;
    opacity: 0.32;
    transition: opacity .18s ease;
  }
  .tgs.is-hover .tgs-ellipsis {
    opacity: 0.28;
  }
  html[data-theme="light"] .tgs.is-hover .tgs-ellipsis,
  html[data-theme="read"] .tgs.is-hover .tgs-ellipsis {
    opacity: 0.30;
  }
  .tgs-cta {
    align-self: flex-start;
    height: 28px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(186, 194, 210, 0.08);
    color: rgba(228, 228, 234, 0.88);
    font: inherit;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: -0.01em;
    cursor: pointer;
    white-space: nowrap;
    transition: background .14s ease, border-color .14s ease, color .14s ease;
  }
  .tgs-cta:hover:not(:disabled) {
    background: rgba(91, 100, 125, 0.42);
    border-color: transparent;
    color: #F5F6F8;
  }
  .tgs-cta:disabled {
    opacity: 0.5;
    cursor: default;
  }
  html[data-theme="light"] .tgs-cta,
  html[data-theme="read"] .tgs-cta {
    background: #FBF8F2;
    border: 1px solid rgba(40, 34, 28, 0.10);
    color: #1e1e20;
  }
  html[data-theme="light"] .tgs-cta:hover:not(:disabled),
  html[data-theme="read"] .tgs-cta:hover:not(:disabled) {
    background: #5B647D;
    border-color: transparent;
    color: #F5F6F8;
  }
`
