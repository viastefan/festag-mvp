'use client'

/**
 * Floating Tagro edit button — bottom-right of a content container (Figma 307:84).
 * Opens the global Tagro overlay with the supplied context.
 */

import { NotePencil } from '@phosphor-icons/react'
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
        <NotePencil size={22} weight="regular" />
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
            border-color 0.14s ease;
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
          background: rgba(255, 255, 255, 0.08);
          color: #f4f4f4;
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.06) inset,
            0 8px 24px -10px rgba(0, 0, 0, 0.45);
        }
        :global([data-theme='dark']) .festag-content-fab:hover,
        :global([data-theme='classic-dark']) .festag-content-fab:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.14);
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
