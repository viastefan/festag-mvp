'use client'

/**
 * Floating Tagro edit button — bottom-right of a content container (Figma 307:84).
 * Opens the global Tagro overlay with the supplied context.
 *
 * Light: white pill + 3D inset highlight.
 * Dark: matches --portal-card surface with subtle depth (not a white disc).
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
          width: 56px;
          height: 56px;
          border: 1px solid color-mix(in srgb, #e4e7eb 72%, transparent);
          border-radius: 999px !important;
          background: #fff;
          color: #0f0f10;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.92) inset,
            0 1px 2px rgba(15, 23, 42, 0.05),
            0 2px 6px rgba(15, 23, 42, 0.06),
            0 10px 24px -8px rgba(15, 23, 42, 0.14);
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
          transform: translateY(-2px);
          background: #fff;
          border-color: color-mix(in srgb, #d2d7de 88%, transparent);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.96) inset,
            0 2px 4px rgba(15, 23, 42, 0.06),
            0 8px 18px -6px rgba(15, 23, 42, 0.16),
            0 16px 32px -10px rgba(15, 23, 42, 0.18);
        }
        .festag-content-fab:active {
          transform: translateY(0);
          background: #f8f9fb;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.7) inset,
            0 1px 2px rgba(15, 23, 42, 0.08),
            0 4px 12px -6px rgba(15, 23, 42, 0.14);
        }
        :global([data-theme='dark']) .festag-content-fab,
        :global([data-theme='classic-dark']) .festag-content-fab {
          background: var(--portal-card, #141416);
          color: #e8e8ed;
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            inset 0 -1px 0 rgba(0, 0, 0, 0.22),
            0 4px 14px -4px rgba(0, 0, 0, 0.42),
            0 1px 3px rgba(0, 0, 0, 0.28);
        }
        :global([data-theme='dark']) .festag-content-fab:hover,
        :global([data-theme='classic-dark']) .festag-content-fab:hover {
          transform: translateY(-2px);
          background: color-mix(in srgb, var(--portal-card, #141416) 86%, rgba(255, 255, 255, 0.1));
          border-color: rgba(255, 255, 255, 0.14);
          color: #f4f4f4;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2),
            0 8px 20px -6px rgba(0, 0, 0, 0.48),
            0 2px 6px rgba(0, 0, 0, 0.32);
        }
        :global([data-theme='dark']) .festag-content-fab:active,
        :global([data-theme='classic-dark']) .festag-content-fab:active {
          transform: translateY(0);
          background: var(--portal-card, #141416);
          box-shadow:
            inset 0 2px 4px rgba(0, 0, 0, 0.32),
            0 1px 2px rgba(0, 0, 0, 0.2);
        }
        @media (max-width: 768px) {
          .festag-content-fab--absolute,
          .festag-content-fab--fixed {
            right: 16px;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px));
            width: 52px;
            height: 52px;
          }
        }
      `}</style>
    </>
  )
}
