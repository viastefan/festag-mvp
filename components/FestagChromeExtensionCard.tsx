'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowSquareOut, DownloadSimple, PuzzlePiece } from '@phosphor-icons/react'
import {
  CHROME_EXTENSION_INSTALL_STEPS,
  FESTAG_CHROME_EXTENSION,
  isChromiumBrowser,
} from '@/lib/extension/chrome-extension'

type Props = {
  /** compact = inline teaser; full = download page section */
  variant?: 'compact' | 'full'
  className?: string
}

export default function FestagChromeExtensionCard({ variant = 'full', className = '' }: Props) {
  const [isChromium, setIsChromium] = useState(true)

  useEffect(() => {
    setIsChromium(isChromiumBrowser(navigator.userAgent || ''))
  }, [])

  const downloadHref = FESTAG_CHROME_EXTENSION.downloadPath
  const sectionId = variant === 'full' ? FESTAG_CHROME_EXTENSION.anchorId : undefined

  return (
    <section
      id={sectionId}
      className={`fce-card fce-card--${variant} ${className}`.trim()}
      aria-labelledby={variant === 'full' ? 'fce-title' : undefined}
    >
      <div className="fce-head">
        <span className="fce-mark" aria-hidden>
          <PuzzlePiece size={variant === 'compact' ? 18 : 20} weight="regular" />
        </span>
        <div className="fce-copy">
          <p className="fce-kicker">Chrome-Erweiterung</p>
          <h2 id="fce-title" className="fce-title">
            {FESTAG_CHROME_EXTENSION.shortName}
          </h2>
          <p className="fce-lead">{FESTAG_CHROME_EXTENSION.description}</p>
        </div>
      </div>

      <div className="fce-warn" role="note">
        <strong>Chrome lädt keine ZIP direkt.</strong>
        <span>ZIP entpacken, dann <code>INSTALLIEREN.html</code> im Ordner öffnen — oder den Ordner <code>festag-chrome-extension</code> unter chrome://extensions laden.</span>
      </div>

      <ul className="fce-steps" role="list">
        {CHROME_EXTENSION_INSTALL_STEPS.map((step, index) => (
          <li key={step.title} className="fce-step">
            <span className="fce-step-num" aria-hidden>{index + 1}</span>
            <div className="fce-step-copy">
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="fce-actions">
        <a className="fce-primary" href={downloadHref} download>
          <DownloadSimple size={16} weight="regular" aria-hidden />
          Erweiterung herunterladen
        </a>
        {variant === 'full' ? (
          <a
            className="fce-secondary"
            href="https://support.google.com/chrome/answer/187443"
            target="_blank"
            rel="noreferrer"
          >
            Chrome-Hilfe
            <ArrowSquareOut size={14} aria-hidden />
          </a>
        ) : (
          <Link className="fce-secondary" href={FESTAG_CHROME_EXTENSION.appDownloadPath}>
            Installationsanleitung
          </Link>
        )}
      </div>

      {!isChromium ? (
        <p className="fce-note">
          Die Erweiterung läuft in Chrome und Edge. In Safari oder Firefox kannst du Live-Feedback
          weiterhin direkt in Festag unter Freigaben starten.
        </p>
      ) : (
        <p className="fce-note">
          Version {FESTAG_CHROME_EXTENSION.version}. Nach dem Laden erscheint das Festag-Icon in der
          Chrome-Symbolleiste.
        </p>
      )}

      <style suppressHydrationWarning>{CSS}</style>
    </section>
  )
}

const CSS = `
  .fce-card {
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    color: var(--portal-text, #1d1d1f);
  }
  .fce-card--full {
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
    padding: 22px 20px 20px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 16px;
    background: #ffffff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 1),
      0 1px 0 rgba(0, 0, 0, 0.03),
      0 8px 24px rgba(144, 149, 159, 0.08);
  }
  [data-theme="dark"] .fce-card--full,
  [data-theme="classic-dark"] .fce-card--full {
    background: var(--festag-black-popup, #121214);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      0 8px 24px rgba(0, 0, 0, 0.28);
  }
  .fce-card--compact {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--portal-text, #1d1d1f) 10%, transparent);
    background: color-mix(in srgb, var(--portal-row-hover, #f5f5f7) 72%, transparent);
  }
  .fce-head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }
  .fce-card--compact .fce-head { margin-bottom: 0; }
  .fce-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: #f5f5f7;
    color: var(--portal-text, #1d1d1f);
  }
  [data-theme="dark"] .fce-mark,
  [data-theme="classic-dark"] .fce-mark {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }
  .fce-card--compact .fce-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
  .fce-copy { min-width: 0; }
  .fce-kicker {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--portal-muted, #86868b);
  }
  .fce-title {
    margin: 0 0 6px;
    font-size: 18px;
    line-height: 1.25;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--portal-text, #1d1d1f);
  }
  .fce-card--compact .fce-title { font-size: 15px; margin-bottom: 4px; }
  .fce-lead {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--portal-muted, #86868b);
  }
  .fce-card--compact .fce-lead { font-size: 12.5px; }
  .fce-warn {
    margin: 0 0 16px;
    padding: 12px 14px;
    border-radius: 12px;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  [data-theme="dark"] .fce-warn,
  [data-theme="classic-dark"] .fce-warn {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .fce-warn strong {
    font-size: 13px;
    font-weight: 600;
    color: var(--portal-text, #1d1d1f);
  }
  .fce-warn span {
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  .fce-warn code {
    font-family: ui-monospace, Menlo, monospace;
    font-size: 11.5px;
    background: rgba(0, 0, 0, 0.05);
    padding: 1px 5px;
    border-radius: 5px;
  }
  .fce-card--compact .fce-warn { display: none; }
  .fce-card--compact .fce-steps,
  .fce-card--compact .fce-note { display: none; }
  .fce-steps {
    list-style: none;
    margin: 0 0 18px;
    padding: 0;
    display: grid;
    gap: 0;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 12px;
    overflow: hidden;
  }
  [data-theme="dark"] .fce-steps,
  [data-theme="classic-dark"] .fce-steps {
    border-color: rgba(255, 255, 255, 0.08);
  }
  .fce-step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }
  [data-theme="dark"] .fce-step,
  [data-theme="classic-dark"] .fce-step {
    border-top-color: rgba(255, 255, 255, 0.08);
  }
  .fce-step:first-child { border-top: 0; }
  .fce-step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: #f5f5f7;
    font-size: 11px;
    font-weight: 500;
    color: var(--portal-text, #1d1d1f);
  }
  [data-theme="dark"] .fce-step-num,
  [data-theme="classic-dark"] .fce-step-num {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }
  .fce-step-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .fce-step-copy strong {
    font-size: 13px;
    font-weight: 500;
    color: var(--portal-text, #1d1d1f);
  }
  .fce-step-copy span {
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  .fce-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .fce-card--compact .fce-actions { margin-bottom: 0; }
  .fce-primary,
  .fce-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 999px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: background .12s ease, color .12s ease, opacity .12s ease;
  }
  .fce-card--compact .fce-primary,
  .fce-card--compact .fce-secondary {
    min-height: 36px;
    font-size: 13px;
  }
  .fce-primary {
    border: 0;
    background: var(--festag-btn-dark, #2d2e2c);
    color: #ffffff;
  }
  .fce-primary:hover { background: var(--festag-btn-dark-hover, #000); }
  [data-theme="dark"] .fce-primary,
  [data-theme="classic-dark"] .fce-primary {
    background: #ffffff;
    color: #121214;
  }
  [data-theme="dark"] .fce-primary:hover,
  [data-theme="classic-dark"] .fce-primary:hover {
    background: #f0f0f2;
  }
  .fce-secondary {
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: transparent;
    color: var(--portal-text, #1d1d1f);
  }
  .fce-secondary:hover {
    background: var(--portal-row-hover, #f5f5f7);
  }
  [data-theme="dark"] .fce-secondary,
  [data-theme="classic-dark"] .fce-secondary {
    border-color: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }
  .fce-note {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--portal-muted, #86868b);
  }
`
