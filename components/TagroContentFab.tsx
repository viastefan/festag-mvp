'use client'

/**
 * Floating Tagro edit button — Codex compose orb (Figma / Codex sidebar reference).
 * Opens the global Tagro overlay with the supplied context.
 *
 * Light: white disc, thin border, black compose glyph.
 * Dark: elevated dark disc, light glyph.
 */

import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { openTagro, type TagroOpenDetail } from '@/components/TagroOverlay'

type Props = {
  context: TagroOpenDetail
  className?: string
  /** absolute = inside a positioned parent; fixed = viewport corner */
  position?: 'absolute' | 'fixed'
}

export default function TagroContentFab({
  context,
  className = '',
  position = 'absolute',
}: Props) {
  return (
    <>
      <button
        type="button"
        className={`festag-content-fab festag-content-fab--${position}${className ? ` ${className}` : ''}`}
        aria-label="Mit Tagro bearbeiten"
        title="Mit Tagro bearbeiten"
        onClick={() => openTagro(context)}
      >
        <TagroComposeIcon size={20} />
      </button>
      <style jsx>{`
        .festag-content-fab {
          z-index: 12;
          width: var(--festag-tagro-fab-size, 44px);
          height: var(--festag-tagro-fab-size, 44px);
          border: 1px solid var(--festag-elev-border, rgba(0, 0, 0, 0.08));
          border-radius: 50% !important;
          background: var(--festag-elev-bg, #fff);
          color: var(--festag-elev-icon, #1d1d1f);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: var(--festag-elev-shadow);
          transition:
            transform 0.14s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.18s ease,
            background 0.14s ease,
            border-color 0.14s ease,
            color 0.14s ease;
        }
        .festag-content-fab :global(svg) {
          display: block;
          flex-shrink: 0;
          pointer-events: none;
        }
        .festag-content-fab--absolute {
          position: absolute;
          right: 24px;
          bottom: 24px;
        }
        .festag-content-fab--fixed {
          position: fixed;
          right: 32px;
          bottom: 32px;
        }
        .festag-content-fab:hover {
          background: var(--festag-elev-bg, #fff);
          border-color: var(--festag-elev-border);
          color: var(--festag-elev-icon, #1d1d1f);
          box-shadow: var(--festag-elev-shadow-hover);
        }
        .festag-content-fab:active {
          transform: none;
          background: var(--festag-elev-active-bg, #f5f5f7);
          box-shadow: var(--festag-elev-shadow);
        }
        @media (max-width: 768px) {
          .festag-content-fab--absolute,
          .festag-content-fab--fixed {
            right: 16px;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px));
            width: 44px;
            height: 44px;
          }
        }
      `}</style>
    </>
  )
}
