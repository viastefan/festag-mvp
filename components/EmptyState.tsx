'use client'

/**
 * EmptyState — the one calm, on-brand empty screen used across every
 * sidebar section when its content container has nothing to show yet.
 *
 * Design language (our own — not a stock icon on a grey card):
 *   • A custom "Festag panel" illustration: softly layered surfaces with a
 *     few quiet rows and a glowing Veyra orb. The orb breathes slowly.
 *   • The section's own Phosphor glyph sits in a small badge on the panel,
 *     so each section feels distinct while the graphic language stays one.
 *   • Accent colour flows from the workspace/brand colour (passed in) so
 *     the orb + badge match the rest of the app.
 *   • Calm, flat, spacious. Slate is the only primary button tone. 8px
 *     radii. Aeonik typography via the inherited tokens.
 *
 * It renders centred inside whatever content container hosts it, so pages
 * just drop <EmptyState …/> where their "Noch keine …" block used to be.
 */

import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'

interface EmptyAction {
  label: string
  onClick?: () => void
  href?: string
  icon?: Icon
  primary?: boolean
}

interface Props {
  /** Phosphor icon for the section (shown in the panel badge). */
  icon?: Icon
  title: string
  description?: ReactNode
  actions?: EmptyAction[]
  /** Accent colour (workspace/brand). Defaults to slate primary. */
  accent?: string
  /** Optional small kicker above the title (e.g. section name). */
  kicker?: string
}

export default function EmptyState({
  icon: Glyph,
  title,
  description,
  actions = [],
  accent,
  kicker,
}: Props) {
  const tone = accent || 'var(--btn-prim)'

  return (
    <div className="es-wrap" style={{ ['--es-accent' as any]: tone }}>
      <style>{`
        @keyframes esBreathe {
          0%,100% { transform: scale(1); opacity: .9; }
          50%     { transform: scale(1.08); opacity: 1; }
        }
        @keyframes esRing {
          0%   { transform: scale(.7); opacity: .5; }
          70%  { opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes esFloat {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-5px); }
        }
        @keyframes esFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .es-wrap {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          text-align:center; padding:56px 24px; min-height:340px;
          animation: esFade .4s cubic-bezier(.16,1,.3,1) both;
        }
        .es-art {
          position:relative; width:188px; height:132px; margin-bottom:28px;
          animation: esFloat 6s ease-in-out infinite;
        }
        /* layered surfaces */
        .es-panel {
          position:absolute; left:50%; border-radius:14px;
          background:var(--card); border:1px solid var(--border);
          transform:translateX(-50%);
        }
        .es-panel.back {
          width:150px; height:96px; top:0;
          opacity:.5; transform:translateX(-50%) scale(.9);
        }
        .es-panel.mid {
          width:166px; height:104px; top:10px;
          opacity:.8; transform:translateX(-50%) scale(.96);
        }
        .es-panel.front {
          width:180px; height:112px; top:20px;
          box-shadow:0 12px 32px -16px rgba(0,0,0,.28);
          display:flex; flex-direction:column; gap:9px; padding:18px 18px 0;
        }
        .es-row { height:7px; border-radius:4px; background:var(--surface-2); }
        .es-row.r1 { width:62%; }
        .es-row.r2 { width:84%; }
        .es-row.r3 { width:46%; }
        /* orb */
        .es-orb-wrap {
          position:absolute; right:14px; bottom:14px; width:34px; height:34px;
          display:flex; align-items:center; justify-content:center;
        }
        .es-orb {
          width:18px; height:18px; border-radius:50%;
          background:var(--es-accent);
          box-shadow:0 0 0 4px color-mix(in srgb, var(--es-accent) 18%, transparent);
          animation: esBreathe 3.4s ease-in-out infinite;
        }
        .es-orb-ring {
          position:absolute; inset:0; border-radius:50%;
          border:1.5px solid var(--es-accent);
          animation: esRing 3.4s ease-in-out infinite;
        }
        /* section badge */
        .es-badge {
          position:absolute; left:14px; top:12px; width:30px; height:30px;
          border-radius:9px; display:flex; align-items:center; justify-content:center;
          background:color-mix(in srgb, var(--es-accent) 14%, var(--card));
          color:var(--es-accent);
          border:1px solid color-mix(in srgb, var(--es-accent) 26%, var(--border));
        }
        .es-kicker {
          font-size:11px; font-weight:600; letter-spacing:var(--ls-sidebar, .023em);
          text-transform:uppercase; color:var(--text-muted); margin:0 0 8px;
        }
        .es-title {
          font-size:17px; font-weight:600; color:var(--text);
          letter-spacing:var(--ls-header, .012em); margin:0 0 8px; line-height:1.3;
        }
        .es-desc {
          font-size:13.5px; color:var(--text-secondary); line-height:1.6;
          letter-spacing:var(--ls-body, .017em); max-width:380px; margin:0 0 22px;
        }
        .es-actions { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
        .es-btn {
          display:inline-flex; align-items:center; gap:7px;
          font-size:13px; font-weight:600; letter-spacing:var(--ls-body, .017em);
          padding:9px 15px; border-radius:8px; cursor:pointer;
          border:1px solid var(--border); background:var(--card); color:var(--text);
          text-decoration:none; transition:background .15s, border-color .15s;
        }
        .es-btn:hover { background:var(--surface-2); }
        .es-btn.primary {
          background:var(--btn-prim); color:var(--btn-prim-text); border-color:transparent;
        }
        .es-btn.primary:hover { filter:brightness(1.06); background:var(--btn-prim); }
        @media (max-width:560px) {
          .es-wrap { padding:40px 18px; min-height:300px; }
          .es-actions { flex-direction:column; width:100%; max-width:300px; }
          .es-btn { justify-content:center; }
        }
      `}</style>

      <div className="es-art" aria-hidden="true">
        <div className="es-panel back" />
        <div className="es-panel mid" />
        <div className="es-panel front">
          <span className="es-row r1" />
          <span className="es-row r2" />
          <span className="es-row r3" />
          {Glyph && (
            <span className="es-badge">
              <Glyph size={16} weight="regular" />
            </span>
          )}
          <span className="es-orb-wrap">
            <span className="es-orb-ring" />
            <span className="es-orb" />
          </span>
        </div>
      </div>

      {kicker && <p className="es-kicker">{kicker}</p>}
      <h2 className="es-title">{title}</h2>
      {description && <p className="es-desc">{description}</p>}

      {actions.length > 0 && (
        <div className="es-actions">
          {actions.map((a, i) => {
            const ActionIcon = a.icon
            const cls = `es-btn${a.primary ? ' primary' : ''}`
            const inner = (
              <>
                {ActionIcon && <ActionIcon size={14} weight="bold" />}
                {a.label}
              </>
            )
            return a.href ? (
              <a key={i} href={a.href} className={cls}>{inner}</a>
            ) : (
              <button key={i} type="button" className={cls} onClick={a.onClick}>{inner}</button>
            )
          })}
        </div>
      )}
    </div>
  )
}
