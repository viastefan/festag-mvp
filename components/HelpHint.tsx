'use client'

/**
 * HelpHint — a tiny "?" affordance that sits next to a page/section title.
 *
 * Why it exists: instead of permanent explanatory paragraphs under every
 * header (which the app had too many of), each surface keeps just its title
 * and offers a quiet question mark. Click it → a small, animated popover
 * explains what the area is, optionally with a few icon-led points.
 *
 * Design: Phosphor Question glyph, slate/border tokens, 8px radius, calm
 * entrance. Closes on outside click or Esc. No backdrop dimming — it's a
 * lightweight hint, not a modal.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Question } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

export type HelpPoint = { icon?: Icon; text: ReactNode }

interface Props {
  /** Short heading inside the popover (defaults to "Was ist das?"). */
  title?: string
  /** One or two calm sentences. */
  description?: ReactNode
  /** Optional icon-led bullet points. */
  points?: HelpPoint[]
  /** Accent for the icon badge — defaults to the workspace accent. */
  accent?: string
  /** Horizontal anchor side of the popover. */
  align?: 'left' | 'right'
  /** Accessible label for the trigger. */
  label?: string
}

export default function HelpHint({
  title = 'Was ist das?',
  description,
  points = [],
  accent,
  align = 'left',
  label = 'Hilfe',
}: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const id = useId()
  const tone = accent || 'var(--workspace-accent, var(--btn-prim))'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <span className="hh-wrap" ref={wrapRef} style={{ ['--hh-accent' as string]: tone }}>
      <style>{`
        .hh-wrap { position:relative; display:inline-flex; vertical-align:middle; }
        .hh-trigger {
          display:inline-flex; align-items:center; justify-content:center;
          width:20px; height:20px; border-radius:999px;
          border:1px solid var(--border); background:transparent;
          color:var(--text-muted); cursor:pointer; padding:0;
          transition:background .12s, color .12s, border-color .12s;
        }
        .hh-trigger:hover, .hh-trigger[aria-expanded="true"] {
          background:var(--surface-2); color:var(--text);
          border-color:color-mix(in srgb, var(--text) 16%, var(--border));
        }
        .hh-pop {
          position:absolute; top:calc(100% + 8px); z-index:80;
          width:280px; max-width:78vw; padding:14px;
          background:var(--card); border:1px solid var(--border);
          border-radius:12px;
          box-shadow:0 18px 44px -18px rgba(0,0,0,.4), 0 2px 6px rgba(0,0,0,.08);
          animation:hhIn .16s cubic-bezier(.16,1,.3,1) both;
        }
        .hh-pop.left { left:0; }
        .hh-pop.right { right:0; }
        @keyframes hhIn { from{opacity:0; transform:translateY(-4px) scale(.98);} to{opacity:1; transform:none;} }
        .hh-pop-head { display:flex; align-items:center; gap:9px; margin-bottom:8px; }
        .hh-badge {
          width:26px; height:26px; border-radius:8px; flex:0 0 auto;
          display:flex; align-items:center; justify-content:center;
          background:color-mix(in srgb, var(--hh-accent) 14%, var(--card));
          color:var(--hh-accent);
          border:1px solid color-mix(in srgb, var(--hh-accent) 26%, var(--border));
        }
        .hh-badge .hh-orb {
          width:9px; height:9px; border-radius:50%; background:var(--hh-accent);
          box-shadow:0 0 0 3px color-mix(in srgb, var(--hh-accent) 18%, transparent);
          animation:hhBreathe 3s ease-in-out infinite;
        }
        @keyframes hhBreathe { 0%,100%{transform:scale(1);opacity:.9;} 50%{transform:scale(1.18);opacity:1;} }
        .hh-title { margin:0; font-size:13px; font-weight:600; color:var(--text); letter-spacing:var(--ls-header,.012em); }
        .hh-desc { margin:0; font-size:12.5px; line-height:1.55; color:var(--text-secondary); letter-spacing:var(--ls-body,.017em); }
        .hh-points { list-style:none; margin:10px 0 0; padding:0; display:flex; flex-direction:column; gap:8px; }
        .hh-point { display:flex; align-items:flex-start; gap:9px; font-size:12.5px; line-height:1.45; color:var(--text-secondary); }
        .hh-point-ico { color:var(--hh-accent); margin-top:1px; flex:0 0 auto; }
      `}</style>

      <button
        type="button"
        className="hh-trigger"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen(o => !o)}
      >
        <Question size={12} weight="bold" />
      </button>

      {open && (
        <div id={id} role="tooltip" className={`hh-pop ${align}`}>
          <div className="hh-pop-head">
            <span className="hh-badge"><span className="hh-orb" /></span>
            <p className="hh-title">{title}</p>
          </div>
          {description && <p className="hh-desc">{description}</p>}
          {points.length > 0 && (
            <ul className="hh-points">
              {points.map((p, i) => {
                const PointIcon = p.icon
                return (
                  <li key={i} className="hh-point">
                    {PointIcon && <PointIcon className="hh-point-ico" size={15} weight="regular" />}
                    <span>{p.text}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </span>
  )
}
