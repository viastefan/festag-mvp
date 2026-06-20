'use client'

/**
 * TagroMobileBar — the floating action bar on mobile object/detail pages.
 *
 * Design language: Linear / ChatGPT mobile-app quality. Two large pill
 * buttons sitting in a floating row above the safe-area edge — no surrounding
 * card, no border-box, no Box-in-Box. The bar itself is invisible chrome,
 * each button carries its own weight via a subtle frosted backdrop +
 * crisp shadow. The primary action (Mit Tagro bearbeiten) is the only solid
 * fill; the secondary (Statusbericht) is a high-contrast ghost so the eye
 * always reads "this is the safe action, that is the AI action".
 *
 * Spec:
 *   - Left: configurable label + icon (defaults: "Statusbericht" + ListBullets
 *           list-icon since Statusbericht reads as a structured list update).
 *   - Right: "Mit Tagro bearbeiten" with the Sparkle mark, slate #5B647D fill.
 *   - 50px tall, 32px radius, safe-area aware, hides on desktop and when the
 *     chat composer has focus (.chat-composer-focused signal).
 *   - Single-action variant available — right button takes the full row.
 */

import { ListBullets, Sparkle } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { openTagro, type TagroContextType } from '@/components/TagroOverlay'

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
  /** Left button icon (defaults to a list icon, matching 'Statusbericht'). */
  leftIcon?: ReactNode
  /** Left button handler. Omit to show only the right button full-width. */
  onLeft?: () => void
  /** Override the right button's destination. By default opens the global
   *  TagroOverlay with the current object attached as context. */
  onRight?: () => void
}

export default function TagroMobileBar({ context, leftLabel, leftIcon, onLeft, onRight }: Props) {
  function openTagroOverlay() {
    if (onRight) { onRight(); return }
    openTagro({ contextType: context.type as TagroContextType, id: context.id, title: context.title })
  }

  const single = !onLeft

  return (
    <div className="tmb" role="toolbar" aria-label="Aktionen">
      {!single && (
        <button type="button" className="tmb-btn tmb-secondary" onClick={onLeft}>
          <span className="tmb-ico" aria-hidden>
            {leftIcon ?? <ListBullets size={17} weight="regular" />}
          </span>
          <span className="tmb-label">{leftLabel ?? 'Statusbericht'}</span>
        </button>
      )}
      <button
        type="button"
        className={`tmb-btn tmb-primary${single ? ' is-single' : ''}`}
        onClick={openTagroOverlay}
      >
        <span className="tmb-ico" aria-hidden>
          <Sparkle size={17} weight="fill" />
        </span>
        <span className="tmb-label">Mit Tagro bearbeiten</span>
      </button>

      <style jsx>{`
        /* Desktop: bar is mobile-only. */
        .tmb { display: none; }

        @media (max-width: 768px) {
          .tmb {
            display: flex;
            gap: 10px;
            position: fixed;
            left: 12px;
            right: 12px;
            /* Sit comfortably above the safe-area. The 5-button bottom nav
               is hidden on object/context routes (Sidebar.tsx pathname
               check), so 18px of breathing room is enough. On list pages
               that still show the 5-nav, those pages don't mount this bar
               at all, so we don't need a per-route offset. */
            bottom: calc(18px + env(safe-area-inset-bottom, 0px));
            z-index: 195;
            pointer-events: auto;
            animation: tmbIn .26s cubic-bezier(.16,1,.3,1) both;
          }
        }
        @keyframes tmbIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Chat composer focus → hide bar so the soft keyboard never sits
           on top of it. Mirrors the bottom-nav signal. */
        :global(body.chat-composer-focused) .tmb { display: none; }

        .tmb-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
          height: 50px;
          padding: 0 18px;
          border-radius: 32px;
          border: 0;
          font: inherit;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: .005em;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform .14s ease, background .14s ease, box-shadow .14s ease, color .14s ease;
        }
        .tmb-btn:active { transform: scale(.975); }
        .tmb-ico { display: inline-flex; align-items: center; justify-content: center; }
        .tmb-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* SECONDARY · Linear-style frosted ghost pill.
           Same shape weight as the primary, never a "tiny outline". The
           backdrop blur reads as floating glass over the page beneath. */
        .tmb-secondary {
          background: rgba(255,255,255,0.06);
          color: var(--text, #F4F4F4);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.10),
            0 14px 32px -16px rgba(0,0,0,0.55);
        }
        .tmb-secondary:active { background: rgba(255,255,255,0.10); }

        /* Light/Read themes flip to a frosted white pill — same hierarchy,
           inverted tone so it still reads as 'safe action'. */
        :global([data-theme="light"]) .tmb-secondary,
        :global([data-theme="read"]) .tmb-secondary {
          background: rgba(255,255,255,0.92);
          color: #111;
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          box-shadow:
            inset 0 0 0 1px rgba(15,23,42,0.06),
            0 14px 32px -16px rgba(15,23,42,0.24);
        }
        :global([data-theme="light"]) .tmb-secondary:active,
        :global([data-theme="read"]) .tmb-secondary:active {
          background: rgba(245,245,245,1);
        }

        /* PRIMARY — monochrome fill (white on dark, black on light). */
        .tmb-primary {
          background: var(--btn-prim, #000);
          color: var(--btn-prim-text, #FFF);
          box-shadow: 0 8px 24px rgba(0,0,0,0.16);
        }
        .tmb-primary:active { opacity: 0.88; }
        :global([data-theme="dark"]) .tmb-primary,
        :global([data-theme="classic-dark"]) .tmb-primary {
          background: #FFFFFF;
          color: #000000;
          box-shadow: 0 8px 28px rgba(0,0,0,0.42);
        }
        .tmb-primary.is-single { /* takes whole row when no left action */ }

        /* Reduced-motion: drop the slide-up. */
        @media (prefers-reduced-motion: reduce) {
          .tmb { animation: none; }
          .tmb-btn:active { transform: none; }
        }
      `}</style>
    </div>
  )
}
