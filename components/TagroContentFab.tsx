'use client'

/**
 * Floating Tagro edit button — Codex compose orb.
 * Opens the global Tagro overlay with the supplied context.
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
        className={`festag-content-fab festag-tagro-compose-btn festag-content-fab--${position}${className ? ` ${className}` : ''}`}
        aria-label="Mit Tagro bearbeiten"
        title="Mit Tagro bearbeiten"
        onClick={() => openTagro(context)}
      >
        <TagroComposeIcon size={24} />
      </button>
      <style jsx>{`
        .festag-content-fab--absolute {
          position: absolute;
          right: 24px;
          bottom: 24px;
          z-index: 12;
        }
        .festag-content-fab--fixed {
          position: fixed;
          right: 32px;
          bottom: 32px;
          z-index: 12;
        }
        @media (max-width: 768px) {
          .festag-content-fab--absolute,
          .festag-content-fab--fixed {
            right: 16px;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>
    </>
  )
}
