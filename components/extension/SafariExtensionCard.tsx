'use client'

import { useEffect, useState } from 'react'
import { DownloadSimple, Compass } from '@phosphor-icons/react'
import { FESTAG_SAFARI_EXTENSION } from '@/lib/extension/safari-extension'

export default function SafariExtensionCard() {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent))
  }, [])

  return (
    <>
      <div className="saf-panel">
        <div className="saf-head">
          <span className="saf-mark" aria-hidden>
            <Compass size={18} weight="regular" />
          </span>
          <div>
            <p className="saf-title">{FESTAG_SAFARI_EXTENSION.name}</p>
            <p className="saf-lead">{FESTAG_SAFARI_EXTENSION.description}</p>
          </div>
        </div>

        <ol className="saf-steps">
          {FESTAG_SAFARI_EXTENSION.installSteps.map((step, i) => (
            <li key={step.title}>
              <span className="saf-num">{i + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </div>
            </li>
          ))}
        </ol>

        <div className="saf-actions">
          <a className="saf-btn saf-btn-primary" href={FESTAG_SAFARI_EXTENSION.downloadPath} download>
            <DownloadSimple size={15} aria-hidden />
            Safari-Quellpaket
          </a>
        </div>

        {!isMac ? (
          <p className="saf-note">Safari-Erweiterungen werden auf dem Mac gebaut — Xcode und macOS sind nötig.</p>
        ) : (
          <p className="saf-note">Nach dem Entpacken: Terminal-Befehl in SAFARI-INSTALL.txt ausführen.</p>
        )}
      </div>
      <style suppressHydrationWarning>{CSS}</style>
    </>
  )
}

const CSS = `
  .saf-panel {
    margin-top: 20px;
    padding: 16px;
    border-radius: 16px;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  [data-theme="dark"] .saf-panel,
  [data-theme="classic-dark"] .saf-panel {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .saf-head {
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
  }
  .saf-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    color: #1d1d1f;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    flex-shrink: 0;
  }
  [data-theme="dark"] .saf-mark,
  [data-theme="classic-dark"] .saf-mark {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }
  .saf-title {
    margin: 0 0 2px;
    font-size: 15px;
    font-weight: 600;
    color: var(--portal-text, #1d1d1f);
  }
  .saf-lead {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  .saf-steps {
    list-style: none;
    margin: 0 0 14px;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .saf-steps li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .saf-num {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .saf-steps strong {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--portal-text, #1d1d1f);
  }
  .saf-steps span {
    font-size: 12px;
    line-height: 1.4;
    color: var(--portal-muted, #86868b);
  }
  .saf-actions { margin-bottom: 10px; }
  .saf-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
  }
  .saf-btn-primary {
    background: #5b647d;
    color: #fff;
  }
  .saf-note {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
`
