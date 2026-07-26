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
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          border: 0; font: inherit; font-weight: 500; letter-spacing: .01em;
          cursor: pointer;
          transition: background .14s, opacity .14s, transform .14s, color .14s, box-shadow .14s;
        }
        .teb:active { transform: scale(.97); }
        .teb-primary {
          height: 36px; padding: 0 14px 0 12px;
          border-radius: 999px;
          font-size: 13px;
          background: var(--btn-prim, #0f0f10);
          color: var(--btn-prim-text, #fff);
          box-shadow: 0 6px 18px rgba(15, 15, 16, 0.14);
        }
        .teb-primary:hover { opacity: .92; }
        :global(html[data-theme="dark"]) .teb-primary,
        :global(html[data-theme="classic-dark"]) .teb-primary {
          background: #fff;
          color: #0f0f10;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .teb-ghost {
          height: 34px; padding: 0 14px;
          border-radius: 999px; font-size: 13px;
          background: rgba(255,255,255,0.06); color: var(--text, #F4F4F4);
        }
        :global(html[data-theme="light"]) .teb-ghost,
        :global(html[data-theme="read"]) .teb-ghost { background: rgba(0,0,0,0.05); color: #111; }
        .teb-ghost:hover { background: rgba(255,255,255,0.10); }
        :global(html[data-theme="light"]) .teb-ghost:hover,
        :global(html[data-theme="read"]) .teb-ghost:hover { background: rgba(0,0,0,0.08); }
        .teb-chip {
          height: 26px; padding: 0 10px 0 8px; font-size: 11.5px; gap: 6px;
          border-radius: 999px;
          background: var(--festag-elev-bg, #fff);
          color: var(--text-secondary, #6e6e73);
          border: 1px solid var(--festag-elev-border, rgba(0,0,0,0.08));
          box-shadow: var(--festag-elev-shadow, 0 4px 14px rgba(15, 23, 42, 0.08));
        }
        .teb-chip:hover {
          background: var(--festag-elev-bg, #fff);
          color: var(--text, #1d1d1f);
          box-shadow: var(--festag-elev-shadow-hover, 0 6px 18px rgba(15, 23, 42, 0.12));
        }
        .teb-orb {
          width: 40px; height: 40px; min-width: 40px; min-height: 40px; padding: 0;
          border-radius: 50%;
          background: var(--festag-elev-bg, #fff);
          color: #0f0f10;
          border: 1px solid var(--festag-elev-border, rgba(0,0,0,0.08));
          box-shadow: var(--festag-elev-shadow, 0 4px 14px rgba(15, 23, 42, 0.1));
        }
        .teb-orb:hover {
          box-shadow: var(--festag-elev-shadow-hover, 0 8px 22px rgba(15, 23, 42, 0.14));
        }
        :global(html[data-theme="dark"]) .teb-orb,
        :global(html[data-theme="classic-dark"]) .teb-orb {
          background: rgba(255,255,255,0.96);
          color: #0f0f10;
        }
      `}</style>
    </>
  )
}
