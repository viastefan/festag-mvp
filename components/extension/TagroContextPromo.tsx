'use client'

import Link from 'next/link'
import { CheckCircle, DownloadSimple, PuzzlePiece, WarningCircle } from '@phosphor-icons/react'
import { FESTAG_CHROME_EXTENSION } from '@/lib/extension/chrome-extension'
import { useTagroHealth } from '@/hooks/useTagroHealth'
import { TagroHealthProvider } from '@/components/extension/TagroHealthProvider'

type Props = {
  context?: 'default' | 'captures'
  className?: string
}

function TagroContextPromoInner({ context = 'default', className = '' }: Props) {
  const { checking, installed, ready, refreshAll } = useTagroHealth()

  if (checking) {
    return (
      <>
        <div className={`tcp tcp--loading ${className}`.trim()}>
          <span className="tcp-dot" aria-hidden />
          <span>Tagro wird geprüft…</span>
        </div>
        <style suppressHydrationWarning>{CSS}</style>
      </>
    )
  }

  if (ready) {
    return (
      <>
        <div className={`tcp tcp--ready ${className}`.trim()}>
          <CheckCircle size={18} weight="fill" aria-hidden />
          <div className="tcp-copy">
            <strong>Tagro bereit</strong>
            <span>
              {context === 'captures'
                ? 'Staging öffnen, Element markieren, Feedback per Stimme senden.'
                : 'Text markieren oder Feld fokussieren — überall im Browser.'}
            </span>
          </div>
          <Link className="tcp-link" href="/settings/apps">Apps</Link>
        </div>
        <style suppressHydrationWarning>{CSS}</style>
      </>
    )
  }

  const title = context === 'captures'
    ? 'Live-Feedback braucht Tagro'
    : 'Tagro im Browser'

  const lead = context === 'captures'
    ? 'Extension installieren, Staging-URL öffnen, Element markieren — Feedback landet hier unter Freigaben.'
    : 'Schreibhilfe in Gmail, LinkedIn und überall sonst.'

  return (
    <>
      <div className={`tcp ${className}`.trim()}>
        <span className="tcp-mark" aria-hidden>
          {installed ? <WarningCircle size={18} weight="regular" /> : <PuzzlePiece size={18} weight="regular" />}
        </span>
        <div className="tcp-copy">
          <strong>{installed ? 'Tagro fast bereit' : title}</strong>
          <span>{installed ? 'Anmeldung oder Verbindung in den Apps-Einstellungen prüfen.' : lead}</span>
        </div>
        <div className="tcp-actions">
          {!installed ? (
            <a className="tcp-cta" href={FESTAG_CHROME_EXTENSION.downloadPath} download>
              <DownloadSimple size={14} aria-hidden />
              Laden
            </a>
          ) : null}
          <Link className="tcp-link" href="/settings/apps">
            {installed ? 'Prüfen' : 'Setup'}
          </Link>
          {installed ? (
            <button type="button" className="tcp-refresh" onClick={refreshAll}>
              Neu
            </button>
          ) : null}
        </div>
      </div>
      <style suppressHydrationWarning>{CSS}</style>
    </>
  )
}

export default function TagroContextPromo(props: Props) {
  return (
    <TagroHealthProvider>
      <TagroContextPromoInner {...props} />
    </TagroHealthProvider>
  )
}

const CSS = `
  .tcp {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 16px;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  .tcp--ready {
    align-items: center;
    background: #f0fdf4;
    border-color: rgba(22, 101, 52, 0.12);
    color: #166534;
  }
  .tcp--loading {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 14px;
    background: #f5f5f7;
    font-size: 12px;
    color: var(--portal-muted, #86868b);
  }
  .tcp-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #86868b;
    animation: tcp-pulse 1s ease-in-out infinite;
  }
  @keyframes tcp-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  [data-theme="dark"] .tcp,
  [data-theme="classic-dark"] .tcp {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  [data-theme="dark"] .tcp--ready,
  [data-theme="classic-dark"] .tcp--ready {
    background: rgba(22, 101, 52, 0.12);
    border-color: rgba(22, 101, 52, 0.2);
  }
  .tcp-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #5B647D;
    color: #fff;
    flex-shrink: 0;
  }
  .tcp--ready .tcp-mark { display: none; }
  .tcp-copy { flex: 1; min-width: 0; }
  .tcp-copy strong {
    display: block;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--portal-text, #1d1d1f);
    margin-bottom: 3px;
  }
  .tcp--ready .tcp-copy strong { color: #166534; }
  .tcp-copy span {
    font-size: 12px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  .tcp--ready .tcp-copy span { color: #15803d; }
  .tcp-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
  }
  .tcp-cta {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    background: #5B647D;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
  }
  .tcp-cta:hover { opacity: 0.92; }
  .tcp-link {
    font-size: 12px;
    font-weight: 500;
    color: #5B647D;
    text-decoration: none;
  }
  .tcp-link:hover { text-decoration: underline; }
  .tcp-refresh {
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 11px;
    color: var(--portal-muted, #86868b);
    cursor: pointer;
    text-decoration: underline;
  }
`
