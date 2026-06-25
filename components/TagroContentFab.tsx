'use client'

/**
 * Floating Tagro compose orb — opens the global Tagro overlay.
 * Fixed position is portaled to document.body so overflow/transform ancestors
 * cannot pin it mid-page.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { openTagro, type TagroOpenDetail } from '@/components/TagroOverlay'

type Props = {
  context: TagroOpenDetail
  className?: string
  /** absolute = inside a positioned parent; fixed = viewport corner (portaled) */
  position?: 'absolute' | 'fixed'
  ariaLabel?: string
  title?: string
}

function fabLabel(context: TagroOpenDetail, override?: string) {
  if (override?.trim()) return override.trim()
  if (context.title?.trim()) return `Mit Tagro, ${context.title.trim()}`
  return 'Mit Tagro bearbeiten'
}

export default function TagroContentFab({
  context,
  className = '',
  position = 'absolute',
  ariaLabel,
  title,
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const label = fabLabel(context, ariaLabel)
  const tip = title?.trim() || label

  const button = (
    <button
      type="button"
      className={`festag-content-fab festag-tagro-compose-btn festag-content-fab--${position}${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={tip}
      onClick={() => openTagro(context)}
    >
      <TagroComposeIcon size={22} />
    </button>
  )

  const styles = (
    <style jsx global>{`
      .festag-content-fab--absolute {
        position: absolute;
        right: 24px;
        bottom: 24px;
        z-index: 12;
      }
      .festag-content-fab--fixed {
        position: fixed;
        right: max(24px, calc(env(safe-area-inset-right, 0px) + 16px));
        bottom: max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px));
        z-index: 48;
      }
      @media (max-width: 768px) {
        .festag-content-fab--absolute,
        .festag-content-fab--fixed {
          right: max(16px, calc(env(safe-area-inset-right, 0px) + 12px));
          bottom: max(16px, calc(env(safe-area-inset-bottom, 0px) + 12px));
        }
      }
    `}</style>
  )

  if (position === 'fixed' && mounted && typeof document !== 'undefined') {
    return createPortal(
      <>
        {button}
        {styles}
      </>,
      document.body,
    )
  }

  return (
    <>
      {button}
      {styles}
    </>
  )
}
