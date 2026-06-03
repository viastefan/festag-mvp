'use client'

/**
 * TagroMobileBar — the mobile floating action bar for object detail pages.
 *
 * Per the Tagro Context System spec: exactly TWO buttons, radius ~32px, safe-area
 * aware, sits ABOVE the bottom nav. Left = context-specific edit/status action
 * (configurable per page). Right = primary "Mit Tagro bearbeiten" (#5B647D)
 * which opens the Tagro chat with the current object attached as context. If
 * no left action makes sense, the right button takes full width.
 *
 * Only renders on mobile (≤ 768px). Hides when the chat composer has focus
 * (uses the existing `body.chat-composer-focused` signal pattern).
 */

import { useRouter } from 'next/navigation'
import { Pencil, Sparkle } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

export type TagroBarContext = {
  /** Object type: task / decision / status_report / document / project / etc. */
  type: string
  /** Object id (or composite key). */
  id: string
  /** Short human-readable title for the Tagro chat handoff. */
  title?: string
}

type Props = {
  /** Context attached to the right "Mit Tagro bearbeiten" button. */
  context: TagroBarContext
  /** Left button label — depends on the object type. */
  leftLabel?: string
  /** Left button icon (defaults to a pencil). */
  leftIcon?: ReactNode
  /** Left button handler. Omit to show only the right button full-width. */
  onLeft?: () => void
  /** Override the right button's destination. By default opens /ai with the
   *  current object attached as context. */
  onRight?: () => void
}

export default function TagroMobileBar({ context, leftLabel, leftIcon, onLeft, onRight }: Props) {
  const router = useRouter()

  function openTagro() {
    if (onRight) { onRight(); return }
    const q = new URLSearchParams({ contextType: context.type, contextId: context.id })
    if (context.title) q.set('contextTitle', context.title)
    router.push(`/ai?${q.toString()}`)
  }

  const single = !onLeft

  return (
    <div className="tmb" role="toolbar" aria-label="Aktionen">
      {!single && (
        <button type="button" className="tmb-btn tmb-secondary" onClick={onLeft}>
          {leftIcon ?? <Pencil size={15} weight="regular" />}
          <span>{leftLabel ?? 'Bearbeiten'}</span>
        </button>
      )}
      <button type="button" className={`tmb-btn tmb-primary${single ? ' is-single' : ''}`} onClick={openTagro}>
        <Sparkle size={15} weight="regular" />
        <span>Mit Tagro bearbeiten</span>
      </button>

      <style jsx>{`
        .tmb {
          /* Hidden on desktop — purely a mobile floating bar. */
          display: none;
        }
        @media (max-width: 768px) {
          .tmb {
            display: flex;
            gap: 10px;
            position: fixed;
            left: 16px;
            right: 16px;
            /* Sit comfortably above the bottom nav (~64px tall) + safe-area. */
            bottom: calc(72px + env(safe-area-inset-bottom, 0px));
            z-index: 195;
            pointer-events: auto;
            animation: tmbIn .26s cubic-bezier(.16,1,.3,1) both;
          }
        }
        @keyframes tmbIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* When the chat composer is focused, hide the bar so the soft
           keyboard + composer never sit on top of it. Mirrors the same
           signal the bottom nav already uses (.bottom-nav). */
        :global(body.chat-composer-focused) .tmb { display: none; }

        .tmb-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 48px;
          padding: 0 18px;
          border-radius: 32px;
          border: 0;
          font: inherit;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: .01em;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: opacity .14s ease, transform .14s ease, background .14s ease;
        }
        .tmb-btn:active { transform: scale(.97); }

        .tmb-secondary {
          flex: 1;
          background: rgba(255,255,255,0.06);
          color: var(--text, #F4F4F4);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
        }
        :global([data-theme="light"]) .tmb-secondary,
        :global([data-theme="read"]) .tmb-secondary {
          background: rgba(255,255,255,0.86);
          color: #111;
          box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 14px 30px -16px rgba(15,23,42,0.18);
        }

        .tmb-primary {
          flex: 1.1;
          background: #5B647D;
          color: #FFFFFF;
          box-shadow: 0 10px 26px -10px rgba(91,100,125,0.55);
        }
        .tmb-primary:active { background: #4B5369; }
        .tmb-primary.is-single { flex: 1; }
      `}</style>
    </div>
  )
}
