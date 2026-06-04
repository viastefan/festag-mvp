'use client'

/**
 * TagroEntryButton — the one-liner button that opens the global Tagro Overlay
 * with the current object's context. Drop this on any detail view so
 * "Mit Tagro bearbeiten" always opens the centered Tagro popup — never Copilot.
 *
 *   <TagroEntryButton context={{ contextType: 'task', id, title: task.title }} />
 */

import type { ReactNode } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import { openTagro, type TagroOpenDetail } from '@/components/TagroOverlay'

type Variant = 'primary' | 'ghost' | 'chip'

export default function TagroEntryButton({
  context, label = 'Mit Tagro bearbeiten', variant = 'primary', icon, className,
}: {
  context: TagroOpenDetail
  label?: string
  variant?: Variant
  icon?: ReactNode
  className?: string
}) {
  return (
    <>
      <button
        type="button"
        className={`teb teb-${variant}${className ? ` ${className}` : ''}`}
        onClick={() => openTagro(context)}
      >
        {icon ?? <Sparkle size={variant === 'chip' ? 12 : 14} weight="regular" />}
        <span>{label}</span>
      </button>
      <style jsx>{`
        .teb {
          display: inline-flex; align-items: center; gap: 7px;
          height: 34px; padding: 0 14px;
          border: 0; border-radius: 999px;
          font: inherit; font-size: 13px; font-weight: 500; letter-spacing: .01em;
          cursor: pointer;
          transition: background .14s, opacity .14s, transform .14s, color .14s;
        }
        .teb:active { transform: scale(.97); }
        .teb-primary { background: #5B647D; color: #FFFFFF; }
        .teb-primary:hover { opacity: .94; }
        .teb-ghost { background: rgba(255,255,255,0.06); color: var(--text, #F4F4F4); }
        :global(html[data-theme="light"]) .teb-ghost,
        :global(html[data-theme="read"]) .teb-ghost { background: rgba(0,0,0,0.05); color: #111; }
        .teb-ghost:hover { background: rgba(255,255,255,0.10); }
        :global(html[data-theme="light"]) .teb-ghost:hover,
        :global(html[data-theme="read"]) .teb-ghost:hover { background: rgba(0,0,0,0.08); }
        .teb-chip {
          height: 26px; padding: 0 10px; font-size: 11.5px;
          background: rgba(255,255,255,0.06); color: var(--text-secondary, #A3A3A3);
        }
        :global(html[data-theme="light"]) .teb-chip,
        :global(html[data-theme="read"]) .teb-chip { background: rgba(0,0,0,0.05); color: #555; }
        .teb-chip:hover { background: rgba(255,255,255,0.10); color: var(--text, #F4F4F4); }
        :global(html[data-theme="light"]) .teb-chip:hover,
        :global(html[data-theme="read"]) .teb-chip:hover { background: rgba(0,0,0,0.08); color: #111; }
      `}</style>
    </>
  )
}
