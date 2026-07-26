'use client'

import { DownloadSimple, Storefront } from '@phosphor-icons/react'
import { CHROME_WEB_STORE_LISTING, FESTAG_CHROME_EXTENSION } from '@/lib/extension/chrome-extension'

const STORE_ZIP = '/downloads/festag-chrome-extension-store.zip'
const DEVCONSOLE = 'https://chrome.google.com/webstore/devconsole'

const CHECKLIST = [
  'ZIP mit manifest.json im Root (Store-Paket, nicht Dev-ZIP)',
  'Privacy Policy URL im Dashboard eintragen',
  'Listing-Text aus store-listing.json übernehmen',
  'Screenshots: Popup + Markierungs-Toolbar + Vorschau',
  'Einzelzweck-Beschreibung: Schreibhilfe + optionales Live-Feedback',
] as const

export default function ChromeWebStorePanel() {
  return (
    <>
      <div className="cws-panel">
        <div className="cws-head">
          <span className="cws-mark" aria-hidden>
            <Storefront size={18} weight="regular" />
          </span>
          <div>
            <p className="cws-title">Chrome Web Store</p>
            <p className="cws-lead">Store-Paket für die Einreichung — Version {FESTAG_CHROME_EXTENSION.version}</p>
          </div>
        </div>

        <p className="cws-kicker">Listing</p>
        <p className="cws-name">{CHROME_WEB_STORE_LISTING.name}</p>
        <p className="cws-summary">{CHROME_WEB_STORE_LISTING.summary}</p>

        <p className="cws-kicker">Checkliste</p>
        <ul className="cws-list">
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="cws-actions">
          <a className="cws-btn cws-btn-primary" href={STORE_ZIP} download>
            <DownloadSimple size={15} aria-hidden />
            Store-Paket laden
          </a>
          <a className="cws-btn" href={DEVCONSOLE} target="_blank" rel="noreferrer">
            Developer Console
          </a>
          <a className="cws-btn" href={CHROME_WEB_STORE_LISTING.privacyPolicyUrl}>
            Privacy Policy
          </a>
        </div>
      </div>
      <style suppressHydrationWarning>{CSS}</style>
    </>
  )
}

const CSS = `
  .cws-panel {
    margin-top: 20px;
    padding: 16px;
    border-radius: 16px;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  [data-theme="dark"] .cws-panel,
  [data-theme="classic-dark"] .cws-panel {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .cws-head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 14px;
  }
  .cws-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #5b647d;
    color: #fff;
    flex-shrink: 0;
  }
  .cws-title {
    margin: 0 0 2px;
    font-size: 15px;
    font-weight: 600;
    color: var(--portal-text, #1d1d1f);
  }
  .cws-lead {
    margin: 0;
    font-size: 12.5px;
    color: var(--portal-muted, #86868b);
  }
  .cws-kicker {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--portal-muted, #86868b);
  }
  .cws-name {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 500;
    color: var(--portal-text, #1d1d1f);
  }
  .cws-summary {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  .cws-list {
    margin: 0 0 14px;
    padding-left: 18px;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--portal-text, #1d1d1f);
  }
  .cws-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cws-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    border: 1px solid rgba(0, 0, 0, 0.08);
    color: var(--portal-text, #1d1d1f);
    background: #fff;
  }
  [data-theme="dark"] .cws-btn,
  [data-theme="classic-dark"] .cws-btn {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  .cws-btn-primary {
    background: #5b647d;
    border-color: transparent;
    color: #fff;
  }
  .cws-btn-primary:hover { opacity: 0.92; }
`
