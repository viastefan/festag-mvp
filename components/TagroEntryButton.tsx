'use client'

/**
 * TagroEntryButton — opens the global Tagro overlay with object context.
 */

import type { ReactNode } from 'react'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { openTagro, type TagroOpenDetail } from '@/components/TagroOverlay'

type Variant = 'primary' | 'ghost' | 'chip' | 'orb'

export default function TagroEntryButton({
  context, label = 'Mit Tagro bearbeiten', variant = 'primary', icon, className,
}: {
  context: TagroOpenDetail
  label?: string
  variant?: Variant
  icon?: ReactNode
  className?: string
}) {
  const mark = icon ?? <TagroComposeIcon size={variant === 'orb' ? 18 : variant === 'chip' ? 14 : 16} />
  const aria = label || 'Mit Tagro bearbeiten'

  return (
    <>
      <button
        type="button"
        className={`teb teb-${variant}${className ? ` ${className}` : ''}`}
        onClick={() => openTagro(context)}
        aria-label={variant === 'orb' ? aria : undefined}
        title={variant === 'orb' ? aria : undefined}
      >
        {mark}
        {variant !== 'orb' ? <span>{label}</span> : null}
      </button>
      <style jsx>{`
        .teb {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          border: 0; font: inherit; font-weight: 500; letter-spacing: 0;
          cursor: pointer;
          transition: background .12s, opacity .12s, color .12s, border-color .12s;
          white-space: nowrap;
        }
        .teb:active { transform: none; opacity: .88; }
        .teb-primary {
          height: 30px; padding: 0 11px;
          border-radius: var(--festag-control-radius-sm, 6px);
          font-size: 12.5px;
          background: var(--festag-btn-dark-bg, #ffffff);
          color: var(--festag-btn-dark-fg, #1e1e20);
          border: 1px solid var(--festag-btn-dark-border, rgba(30,30,32,0.1));
          box-shadow: none;
        }
        .teb-primary:hover { background: var(--festag-btn-dark-bg-hover, #fafafa); }
        :global(html[data-theme="dark"]) .teb-primary,
        :global(html[data-theme="classic-dark"]) .teb-primary {
          background: #ffffff;
          color: #1e1e20;
          border-color: transparent;
          box-shadow: none;
        }
        .teb-ghost {
          height: 30px; padding: 0 11px;
          border-radius: var(--festag-control-radius-sm, 6px); font-size: 12.5px;
          background: transparent;
          color: var(--text-secondary, #6e6e73);
          border: 1px solid var(--border, rgba(0,0,0,0.08));
        }
        :global(html[data-theme="light"]) .teb-ghost,
        :global(html[data-theme="read"]) .teb-ghost { background: transparent; color: #5c5c62; }
        .teb-ghost:hover { background: color-mix(in srgb, var(--text) 5%, transparent); color: var(--text); }
        :global(html[data-theme="light"]) .teb-ghost:hover,
        :global(html[data-theme="read"]) .teb-ghost:hover { background: rgba(0,0,0,0.04); }
        .teb-chip {
          height: 26px; padding: 0 9px 0 8px; font-size: 12px; gap: 6px;
          border-radius: var(--festag-control-radius-sm, 6px);
          background: transparent;
          color: var(--text-secondary, #6e6e73);
          border: 1px solid var(--festag-elev-border, rgba(0,0,0,0.08));
          box-shadow: none;
        }
        .teb-chip:hover {
          background: color-mix(in srgb, var(--text) 4%, transparent);
          color: var(--text, #1d1d1f);
          box-shadow: none;
        }
        .teb-orb {
          width: 32px; height: 32px; min-width: 32px; min-height: 32px; padding: 0;
          border-radius: var(--festag-control-radius-sm, 6px);
          background: transparent;
          color: var(--text, #1e1e20);
          border: 1px solid var(--festag-elev-border, rgba(0,0,0,0.08));
          box-shadow: none;
        }
        .teb-orb:hover {
          background: color-mix(in srgb, var(--text) 5%, transparent);
          box-shadow: none;
        }
        :global(html[data-theme="dark"]) .teb-orb,
        :global(html[data-theme="classic-dark"]) .teb-orb {
          background: transparent;
          color: #f5f5f7;
          border-color: rgba(255,255,255,0.1);
        }
      `}</style>
    </>
  )
}
