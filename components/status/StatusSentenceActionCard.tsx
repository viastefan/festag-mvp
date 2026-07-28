'use client'

/**
 * Inline Tagro Action Card under a status/briefing sentence.
 * Decision Engine + Scenario 1 feature proposals (Übernehmen / Mehr erfahren / Später).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type StatusSentenceAction = {
  id: string
  title: string
  /** Soft one-line context under the title. */
  hint?: string | null
  primaryLabel?: string
  secondaryLabel?: string
  laterLabel?: string
  /** When true, primary/secondary call /decide; later only dismisses locally + routes. */
  responseType?: 'binary' | 'single_choice' | 'multi_choice' | 'free_text' | null
  recommendedOptionId?: string | null
  /** Mock / local-only cards skip the API. */
  localOnly?: boolean
  /**
   * `feature` — Scenario 1: primary confirms scope, secondary = Mehr erfahren,
   * no Ablehnen/Bearbeiten clutter.
   */
  variant?: 'decision' | 'feature'
}

type Props = {
  action: StatusSentenceAction
  onDismiss: (id: string) => void
  onDecided?: (id: string) => void
}

export default function StatusSentenceActionCard({ action, onDismiss, onDecided }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const isFeature = action.variant === 'feature'

  const primary = action.primaryLabel || (isFeature ? action.title : 'Übernehmen')
  const secondary = action.secondaryLabel || (isFeature ? 'Mehr erfahren' : 'Ablehnen')
  const later = action.laterLabel || 'Später'

  async function decide(kind: 'yes' | 'no') {
    if (busy) return
    setBusy(true)
    try {
      if (!action.localOnly) {
        const body =
          action.responseType === 'binary'
            ? { response_value: { binary_value: kind } }
            : kind === 'yes'
              ? {
                  response_value: action.recommendedOptionId
                    ? { selected_option_id: action.recommendedOptionId }
                    : undefined,
                  selected_option: action.recommendedOptionId || primary,
                }
              : {
                  response_value: { binary_value: 'no' },
                  selected_option: 'Ablehnen',
                }
        const res = await fetch(`/api/decisions/${action.id}/decide`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          router.push(`/decisions/${action.id}`)
          return
        }
      }
      onDecided?.(action.id)
      onDismiss(action.id)
    } finally {
      setBusy(false)
    }
  }

  function handleLater() {
    onDismiss(action.id)
    if (action.localOnly) return
    router.push(`/decisions?focus=${encodeURIComponent(action.id)}`)
  }

  function handleLearnMore() {
    if (action.localOnly) {
      onDismiss(action.id)
      return
    }
    router.push(`/decisions/${action.id}`)
  }

  function handleSecondary() {
    if (isFeature) {
      handleLearnMore()
      return
    }
    void decide('no')
  }

  return (
    <div
      className="ssac"
      role="group"
      aria-label={isFeature ? `Feature: ${action.title}` : `Entscheidung: ${action.title}`}
    >
      <style>{SSAC_CSS}</style>
      <p className="ssac-title">{action.title}</p>
      {action.hint ? <p className="ssac-hint">{action.hint}</p> : null}
      <div className="ssac-actions">
        <button
          type="button"
          className="ssac-btn ssac-btn--primary"
          disabled={busy}
          onClick={() => void decide('yes')}
        >
          {busy ? '…' : primary}
        </button>
        <button
          type="button"
          className="ssac-btn"
          disabled={busy}
          onClick={handleSecondary}
        >
          {secondary}
        </button>
        <button
          type="button"
          className="ssac-btn ssac-btn--ghost"
          disabled={busy}
          onClick={handleLater}
        >
          {later}
        </button>
        {!isFeature ? (
          <button
            type="button"
            className="ssac-btn ssac-btn--ghost"
            disabled={busy}
            onClick={handleLearnMore}
          >
            Bearbeiten
          </button>
        ) : null}
      </div>
    </div>
  )
}

const SSAC_CSS = `
  .ssac {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    max-width: 100%;
    margin: 14px auto 6px;
    padding: 12px 14px 11px;
    border-radius: 12px;
    background: var(--festag-black-popup, #1A1A1E);
    border: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
    text-align: center;
    animation: ssacIn 0.28s cubic-bezier(.22, 1, .36, 1) both;
  }
  html[data-theme="light"] .ssac,
  html[data-theme="read"] .ssac {
    background: #FFFFFF;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
  }
  .ssac-title {
    margin: 0;
    font-size: 13.5px;
    font-weight: 400;
    letter-spacing: -0.01em;
    line-height: 1.35;
    color: var(--festag-night-ink, #E6E6EA);
  }
  html[data-theme="light"] .ssac-title,
  html[data-theme="read"] .ssac-title {
    color: #1e1e20;
  }
  .ssac-hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: rgba(230, 230, 234, 0.52);
    max-width: 36ch;
  }
  html[data-theme="light"] .ssac-hint,
  html[data-theme="read"] .ssac-hint {
    color: #8891a0;
  }
  .ssac-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-top: 2px;
  }
  .ssac-btn {
    height: 30px;
    padding: 0 11px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(186, 194, 210, 0.08);
    color: rgba(230, 230, 234, 0.88);
    font: inherit;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: -0.01em;
    cursor: pointer;
    white-space: nowrap;
    transition: background .14s ease, border-color .14s ease, color .14s ease;
  }
  .ssac-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }
  .ssac-btn:disabled { opacity: 0.55; cursor: default; }
  .ssac-btn--primary {
    background: var(--festag-btn-dark-bg, #F0F2F5);
    border-color: transparent;
    color: var(--festag-btn-dark-fg, #1A1A1E);
  }
  .ssac-btn--primary:hover:not(:disabled) {
    background: var(--festag-btn-dark-bg-hover, #DCE1E8);
  }
  .ssac-btn--ghost {
    background: transparent;
    border-color: transparent;
    color: rgba(230, 230, 234, 0.55);
  }
  .ssac-btn--ghost:hover:not(:disabled) {
    color: rgba(230, 230, 234, 0.88);
    background: rgba(255, 255, 255, 0.04);
  }
  html[data-theme="light"] .ssac-btn,
  html[data-theme="read"] .ssac-btn {
    background: #FBF8F2;
    border: 1px solid rgba(40, 34, 28, 0.10);
    color: #1e1e20;
  }
  html[data-theme="light"] .ssac-btn--primary,
  html[data-theme="read"] .ssac-btn--primary {
    background: #5B647D;
    border-color: transparent;
    color: #F5F6F8;
  }
  html[data-theme="light"] .ssac-btn--ghost,
  html[data-theme="read"] .ssac-btn--ghost {
    background: transparent;
    border-color: transparent;
    color: #8891a0;
  }
  @keyframes ssacIn {
    from { opacity: 0; transform: translateY(6px) scale(0.98); }
    to   { opacity: 1; transform: none; }
  }
`
