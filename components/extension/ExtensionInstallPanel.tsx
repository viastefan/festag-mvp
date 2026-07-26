'use client'

import { useContext, useEffect, useState } from 'react'
import {
  ArrowSquareOut,
  CheckCircle,
  DownloadSimple,
  PuzzlePiece,
  WarningCircle,
} from '@phosphor-icons/react'
import {
  CHROME_EXTENSION_INSTALL_STEPS,
  FESTAG_CHROME_EXTENSION,
  isChromiumBrowser,
} from '@/lib/extension/chrome-extension'
import { TagroHealthContext, TagroHealthProvider, useTagroHealth } from '@/components/extension/TagroHealthProvider'

type Props = {
  variant?: 'full' | 'compact'
  className?: string
  sectionId?: string
}

function ExtensionInstallPanelInner({
  variant = 'full',
  className = '',
  sectionId = variant === 'full' ? FESTAG_CHROME_EXTENSION.anchorId : undefined,
}: Props) {
  const {
    version,
    installed,
    checking,
    browserSessionOk,
    extensionSessionOk,
    extensionBackendReady,
    browserBackendReady,
    versionCurrent,
    ready,
    refreshAll,
  } = useTagroHealth()
  const [isChromium, setIsChromium] = useState(true)

  useEffect(() => {
    setIsChromium(isChromiumBrowser(navigator.userAgent || ''))
  }, [])

  const showSteps = !installed && isChromium
  const backendReady = extensionBackendReady === true || browserBackendReady === true
  const backendFailed = extensionBackendReady === false && browserBackendReady === false

  const statusTone = checking
    ? 'checking'
    : ready
      ? 'ready'
      : !installed
        ? 'missing'
        : !browserSessionOk
          ? 'auth'
          : extensionSessionOk === false
            ? 'auth'
            : backendFailed
              ? 'auth'
              : !versionCurrent
                ? 'update'
                : 'installed'

  return (
    <section
      id={sectionId}
      className={`eip eip--${variant} ${className}`.trim()}
      aria-labelledby={variant === 'full' ? 'eip-title' : undefined}
    >
      <div className="eip-head">
        <span className="eip-mark" aria-hidden>
          <PuzzlePiece size={variant === 'compact' ? 18 : 20} weight="regular" />
        </span>
        <div className="eip-copy">
          <h2 id="eip-title" className="eip-title">{FESTAG_CHROME_EXTENSION.shortName}</h2>
          <p className="eip-lead">{FESTAG_CHROME_EXTENSION.description}</p>
        </div>
      </div>

      <div className={`eip-status eip-status--${statusTone}`}>
        {checking ? (
          <>
            <span className="eip-status-dot" aria-hidden />
            <span>Prüfe Installation…</span>
          </>
        ) : ready ? (
          <>
            <CheckCircle size={16} weight="fill" aria-hidden />
            <span>Tagro bereit{version ? ` (v${version})` : ''}</span>
          </>
        ) : installed ? (
          <>
            <CheckCircle size={16} weight="fill" aria-hidden />
            <span>
              Tagro installiert{version ? ` (v${version})` : ''}
              {browserSessionOk && extensionSessionOk && backendReady ? ', verbunden' : !browserSessionOk ? ', bitte anmelden' : extensionSessionOk === false ? ', Extension nicht verbunden' : backendFailed ? ', Backend prüfen' : !versionCurrent ? ', Update verfügbar' : ''}
            </span>
          </>
        ) : (
          <>
            <WarningCircle size={16} weight="regular" aria-hidden />
            <span>Noch nicht installiert</span>
          </>
        )}
        {!checking ? (
          <button type="button" className="eip-status-refresh" onClick={refreshAll}>
            Erneut prüfen
          </button>
        ) : null}
      </div>

      {showSteps ? (
        <ol className="eip-steps" role="list">
          {CHROME_EXTENSION_INSTALL_STEPS.map((step, index) => (
            <li key={step.title} className="eip-step">
              <span className="eip-step-num" aria-hidden>{index + 1}</span>
              <div className="eip-step-copy">
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {installed && !browserSessionOk ? (
        <p className="eip-note eip-note--warn">
          Bei festag.app anmelden — im selben Chrome-Profil wie die Extension.
        </p>
      ) : null}

      {installed && browserSessionOk && extensionSessionOk === false ? (
        <p className="eip-note eip-note--warn">
          Browser ist angemeldet, aber die Extension findet keine Session. Extension-Popup öffnen oder in chrome://extensions neu laden.
        </p>
      ) : null}

      {installed && backendFailed ? (
        <p className="eip-note eip-note--warn">
          KI-Backend noch nicht bereit. Kurz warten und erneut prüfen — oder Hilfe unten öffnen.
        </p>
      ) : null}

      {installed && !versionCurrent && version ? (
        <p className="eip-note eip-note--warn">
          Version {version} installiert — neuere Version {FESTAG_CHROME_EXTENSION.version} verfügbar. ZIP laden und in Chrome aktualisieren.
        </p>
      ) : null}

      {ready ? (
        <p className="eip-note eip-note--ok">
          Tagro ist bereit. Öffne eine beliebige Seite, lade mit F5 neu, dann Text markieren oder ein Feld fokussieren.
        </p>
      ) : null}

      <div className="eip-actions">
        {showSteps ? (
          <>
            <a className="eip-primary" href={FESTAG_CHROME_EXTENSION.downloadPath} download>
              <DownloadSimple size={16} weight="regular" aria-hidden />
              Erweiterung laden
            </a>
            <a
              className="eip-secondary"
              href="https://support.google.com/chrome/answer/187443"
              target="_blank"
              rel="noreferrer"
            >
              Anleitung
              <ArrowSquareOut size={14} aria-hidden />
            </a>
          </>
        ) : ready ? (
          <a className="eip-primary" href="/settings/apps">
            Einstellungen öffnen
          </a>
        ) : installed ? (
          <>
            {!versionCurrent ? (
              <a className="eip-primary" href={FESTAG_CHROME_EXTENSION.downloadPath} download>
                <DownloadSimple size={16} weight="regular" aria-hidden />
                Update laden
              </a>
            ) : null}
            <button type="button" className="eip-secondary eip-secondary--btn" onClick={refreshAll}>
              Status aktualisieren
            </button>
          </>
        ) : !isChromium ? (
          <p className="eip-note">Tagro läuft in Chrome und Edge. Safari: separates Paket unter Einstellungen.</p>
        ) : null}
      </div>

      {variant === 'full' && !installed && !checking ? (
        <p className="eip-foot">
          Beta: Ein-Klick-Installation folgt mit dem Chrome Web Store. Nach dem Laden in Chrome diese Seite mit F5 neu laden, damit Festag Tagro erkennt.
        </p>
      ) : null}

      <style suppressHydrationWarning>{CSS}</style>
    </section>
  )
}

export default function ExtensionInstallPanel(props: Props) {
  const ctx = useContext(TagroHealthContext)
  if (!ctx) {
    return (
      <TagroHealthProvider>
        <ExtensionInstallPanelInner {...props} />
      </TagroHealthProvider>
    )
  }
  return <ExtensionInstallPanelInner {...props} />
}

const CSS = `
  .eip { font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif); color: var(--portal-text, #1d1d1f); }
  .eip--full {
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
    padding: 22px 20px 20px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 16px;
    background: #ffffff;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 1), 0 8px 24px rgba(144, 149, 159, 0.08);
  }
  [data-theme="dark"] .eip--full,
  [data-theme="classic-dark"] .eip--full {
    background: var(--festag-black-popup, #121214);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .eip--compact {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--portal-text, #1d1d1f) 10%, transparent);
    background: color-mix(in srgb, var(--portal-row-hover, #f5f5f7) 72%, transparent);
  }
  .eip-head { display: flex; gap: 12px; margin-bottom: 16px; }
  .eip--compact .eip-head { margin-bottom: 0; }
  .eip-mark {
    width: 40px; height: 40px; border-radius: 12px;
    display: inline-flex; align-items: center; justify-content: center;
    background: #f5f5f7; color: var(--portal-text, #1d1d1f); flex-shrink: 0;
  }
  .eip-title {
    margin: 0 0 6px; font-size: 18px; line-height: 1.25; font-weight: 500;
    letter-spacing: -0.02em; color: var(--portal-text, #1d1d1f);
  }
  .eip-lead { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--portal-muted, #86868b); }
  .eip-status {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    margin-bottom: 16px; padding: 10px 12px; border-radius: 12px;
    font-size: 13px; font-weight: 500;
  }
  .eip-status--checking { background: #f5f5f7; color: var(--portal-muted, #86868b); }
  .eip-status--missing { background: #fff7ed; color: #9a3412; border: 0.5px solid rgba(154, 52, 18, 0.12); }
  .eip-status--installed { background: #f0fdf4; color: #166534; border: 0.5px solid rgba(22, 101, 52, 0.12); }
  .eip-status--update { background: #fff7ed; color: #9a3412; border: 0.5px solid rgba(154, 52, 18, 0.12); }
  .eip-status--auth { background: #fff7ed; color: #9a3412; border: 0.5px solid rgba(154, 52, 18, 0.12); }
  .eip-status--ready { background: #f0fdf4; color: #166534; border: 0.5px solid rgba(22, 101, 52, 0.12); }
  .eip-status-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #86868b;
    animation: eip-pulse 1s ease-in-out infinite;
  }
  @keyframes eip-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
  .eip-status-refresh {
    margin-left: auto; border: 0; background: transparent;
    font: inherit; font-size: 12px; color: inherit; opacity: 0.8; cursor: pointer; text-decoration: underline;
  }
  .eip-steps {
    list-style: none; margin: 0 0 16px; padding: 0;
    border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 12px; overflow: hidden;
  }
  .eip-step {
    display: flex; gap: 12px; padding: 12px 14px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }
  .eip-step:first-child { border-top: 0; }
  .eip-step-num {
    width: 22px; height: 22px; border-radius: 999px; background: #f5f5f7;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 500; flex-shrink: 0;
  }
  .eip-step-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .eip-step-copy strong { font-size: 13px; font-weight: 500; }
  .eip-step-copy span { font-size: 12.5px; line-height: 1.45; color: var(--portal-muted, #86868b); }
  .eip--compact .eip-steps, .eip--compact .eip-foot { display: none; }
  .eip-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
  .eip-primary, .eip-secondary {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 40px; padding: 0 16px; border-radius: 999px;
    font: inherit; font-size: 14px; font-weight: 500; text-decoration: none; cursor: pointer;
  }
  .eip-primary {
    border: 0.7px solid var(--festag-btn-dark-border, #e7ebf0);
    background: var(--festag-btn-dark-bg, #ffffff);
    color: var(--festag-btn-dark-fg, #1e1e20);
    box-shadow: var(--festag-btn-dark-shadow, none);
  }
  .eip-primary:hover {
    background: var(--festag-btn-dark-bg-hover, #f7f8fb);
    color: var(--festag-btn-dark-fg-hover, #1e1e20);
    border-color: var(--festag-btn-dark-border-hover, #dce1ea);
    box-shadow: var(--festag-btn-dark-shadow-hover, none);
  }
  .eip-secondary {
    border: 1px solid rgba(0, 0, 0, 0.08); background: transparent; color: var(--portal-text, #1d1d1f);
  }
  .eip-secondary--btn { font: inherit; }
  .eip-note { margin: 0 0 8px; font-size: 12.5px; line-height: 1.5; color: var(--portal-muted, #86868b); }
  .eip-note--warn { color: #9a3412; }
  .eip-note--ok { color: #166534; }
  .eip-foot { margin: 8px 0 0; font-size: 11.5px; line-height: 1.45; color: var(--portal-muted, #86868b); }
`
