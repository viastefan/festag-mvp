'use client'

/**
 * Floating Tagro edit button — bottom-right of a content container (Figma 307:84).
 * Opens the global Tagro overlay with the supplied context.
 */

import { PencilSimple } from '@phosphor-icons/react'
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
        <PencilSimple size={24} weight="bold" />
      </button>
      <style jsx>{`
        .festag-content-fab {
          z-index: 12;
          width: 56px;
          height: 56px;
          border: 0;
          border-radius: 999px !important;
          background: var(--portal-btn-primary, #5b647d);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.1),
            0 12px 28px -10px rgba(91, 100, 125, 0.45);
          transition: transform 0.14s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s, background 0.14s;
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
          background: color-mix(in srgb, var(--portal-btn-primary, #5b647d) 88%, #000);
          box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.1),
            0 18px 36px -10px rgba(91, 100, 125, 0.55);
        }
        .festag-content-fab:active {
          transform: translateY(0);
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
