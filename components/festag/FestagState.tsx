'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

/**
 * Der eine Zustand.
 *
 * 29 von 52 Seiten hatten keinen Fehlerzustand, 19 keinen Leerzustand, 21
 * keinen Ladezustand — nicht aus Nachlässigkeit, sondern weil jede Seite ihn
 * selbst schreiben musste. Hier ist er einmal gebaut, damit er auf jeder
 * Fläche gleich aussieht und in drei Zeilen entsteht.
 *
 * Die Regeln aus dem Produktgesetz stecken in der Form, nicht im Aufrufer:
 *   leer   — was fehlt, warum es zählt, was du tun kannst (§26)
 *   lädt   — was gerade passiert, nicht ein Spinner (§27)
 *   Fehler — was passiert ist, was betroffen ist, was du tun kannst (§28)
 *
 * Rohe Backend-Meldungen kommen hier nicht durch: `detail` ist bewusst nicht
 * Teil der öffentlichen Form. Wer eine Fehlermeldung zeigen will, formuliert
 * sie als Satz.
 *
 * ── Wann dieses, wann EmptyState? ───────────────────────────────────────
 * FestagState = alles Inline: Laden, Fehler, gefilterte Leere. Leise.
 * EmptyState  = der große Erstnutzungs-Moment ("Noch kein Projekt"), mit
 *               Illustration. → components/EmptyState.tsx
 *
 * Kein drittes Primitiv.
 */

type Action = {
  label: string
  /** Entweder Ziel … */
  href?: string
  /** … oder Handlung. Beides gleichzeitig ergibt keinen Sinn. */
  onClick?: () => void
}

type Props = {
  kind: 'empty' | 'loading' | 'error'
  /** Eine Zeile: der Zustand, nicht die Ursache. */
  title: string
  /** Zwei bis drei Sätze: warum das zählt und was als Nächstes geht. */
  body?: string
  icon?: ReactNode
  primary?: Action
  secondary?: Action
  /** Nur für kind="loading": wie viele Zeilen das Gerüst andeutet. */
  rows?: number
  /** Kompakt für Panels und Drawer statt ganzer Seiten. */
  compact?: boolean
}

export default function FestagState({
  kind, title, body, icon, primary, secondary, rows = 4, compact,
}: Props) {
  if (kind === 'loading') {
    return (
      <div
        className={`fst-state fst-state--loading${compact ? ' is-compact' : ''}`}
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="fst-state-loading-line">{title}</p>
        <div className="fst-skeletons" aria-hidden="true">
          {Array.from({ length: Math.max(1, Math.min(8, rows)) }).map((_, index) => (
            <div key={index} className="fst-skeleton" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`fst-state fst-state--${kind}${compact ? ' is-compact' : ''}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {icon ? <span className="fst-state-icon" aria-hidden="true">{icon}</span> : null}
      <strong className="fst-state-title">{title}</strong>
      {body ? <p className="fst-state-body">{body}</p> : null}
      {(primary || secondary) && (
        <div className="fst-state-actions">
          {primary ? <StateAction action={primary} tone="primary" /> : null}
          {secondary ? <StateAction action={secondary} tone="ghost" /> : null}
        </div>
      )}
    </div>
  )
}

function StateAction({ action, tone }: { action: Action; tone: 'primary' | 'ghost' }) {
  const className = `fst-state-btn${tone === 'primary' ? ' is-primary' : ''}`
  if (action.href) {
    return <Link href={action.href} className={className}>{action.label}</Link>
  }
  return (
    <button type="button" className={className} onClick={action.onClick}>
      {action.label}
    </button>
  )
}
