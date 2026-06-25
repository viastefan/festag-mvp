'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DownloadSimple, PuzzlePiece, X } from '@phosphor-icons/react'
import {
  EXTENSION_PROMO_DISMISS_KEY,
  FESTAG_CHROME_EXTENSION,
  isChromiumBrowser,
} from '@/lib/extension/chrome-extension'

type Props = {
  variant?: 'portal' | 'codex'
  collapsed?: boolean
}

export default function SidebarExtensionPromo({ variant = 'portal', collapsed = false }: Props) {
  const [visible, setVisible] = useState(false)
  const [isChromium, setIsChromium] = useState(true)

  useEffect(() => {
    setIsChromium(isChromiumBrowser(navigator.userAgent || ''))
    try {
      setVisible(localStorage.getItem(EXTENSION_PROMO_DISMISS_KEY) !== '1')
    } catch {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    try { localStorage.setItem(EXTENSION_PROMO_DISMISS_KEY, '1') } catch { /* noop */ }
    setVisible(false)
  }

  if (!visible) return null

  const rootClass = `sep sep--${variant}${collapsed ? ' sep--collapsed' : ''}`

  if (collapsed) {
    return (
      <>
        <div className={rootClass}>
          <a
            className="sep-collapsed-btn"
            href={FESTAG_CHROME_EXTENSION.downloadPath}
            download
            title="Tagro Chrome-Erweiterung herunterladen"
            aria-label="Tagro Chrome-Erweiterung herunterladen"
          >
            <PuzzlePiece size={15} weight="regular" />
          </a>
        </div>
        <style suppressHydrationWarning>{CSS}</style>
      </>
    )
  }

  return (
    <>
      <div className={rootClass}>
        <div className="sep-card">
          <button type="button" className="sep-dismiss" onClick={dismiss} aria-label="Hinweis schließen">
            <X size={12} weight="bold" />
          </button>
          <div className="sep-mark" aria-hidden>
            <PuzzlePiece size={16} weight="regular" />
          </div>
          <div className="sep-copy">
            <strong>Tagro im Browser</strong>
            <span>
              {isChromium
                ? 'ZIP entpacken, INSTALLIEREN.html öffnen, Ordner in Chrome laden.'
                : 'Schreibhilfe läuft in Chrome und Edge.'}
            </span>
          </div>
          <div className="sep-actions">
            {isChromium ? (
              <a className="sep-cta" href={FESTAG_CHROME_EXTENSION.downloadPath} download>
                <DownloadSimple size={14} weight="regular" aria-hidden />
                Herunterladen
              </a>
            ) : null}
            <Link className="sep-link" href="/settings/apps">
              {isChromium ? 'Einstellungen' : 'Mehr erfahren'}
            </Link>
          </div>
        </div>
      </div>
      <style suppressHydrationWarning>{CSS}</style>
    </>
  )
}

const CSS = `
  .sep {
    flex-shrink: 0;
    width: 100%;
    padding: 0 4px 10px;
    box-sizing: border-box;
  }
  .sep--codex {
    padding: 0 0 10px;
  }
  .sep--collapsed {
    display: flex;
    justify-content: center;
    padding: 0 0 8px;
  }
  .sep-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 12px 11px;
    border-radius: 14px;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    transition: background .14s ease, box-shadow .14s ease;
  }
  .sep-card:hover {
    background: #ebebed;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  }
  [data-theme="dark"] .sep-card,
  [data-theme="classic-dark"] .sep-card {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: none;
  }
  [data-theme="dark"] .sep-card:hover,
  [data-theme="classic-dark"] .sep-card:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  .sep-dismiss {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 22px;
    height: 22px;
    border: 0;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.05);
    color: #6e6e73;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background .12s ease, color .12s ease;
  }
  .sep-dismiss:hover {
    background: rgba(0, 0, 0, 0.09);
    color: #1d1d1f;
  }
  [data-theme="dark"] .sep-dismiss,
  [data-theme="classic-dark"] .sep-dismiss {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.55);
  }
  [data-theme="dark"] .sep-dismiss:hover,
  [data-theme="classic-dark"] .sep-dismiss:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
  .sep-mark {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #5B647D;
    color: #fff;
    flex-shrink: 0;
  }
  .sep-copy {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-right: 18px;
  }
  .sep-copy strong {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #1d1d1f;
    line-height: 1.2;
  }
  .sep-copy span {
    font-size: 11.5px;
    line-height: 1.35;
    color: #6e6e73;
  }
  [data-theme="dark"] .sep-copy strong,
  [data-theme="classic-dark"] .sep-copy strong {
    color: #f4f4f4;
  }
  [data-theme="dark"] .sep-copy span,
  [data-theme="classic-dark"] .sep-copy span {
    color: rgba(255, 255, 255, 0.55);
  }
  .sep-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .sep-cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    background: #5B647D;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    transition: opacity .12s ease;
  }
  .sep-cta:hover { opacity: 0.92; }
  .sep-link {
    font-size: 12px;
    font-weight: 500;
    color: #5B647D;
    text-decoration: none;
  }
  .sep-link:hover { text-decoration: underline; }
  [data-theme="dark"] .sep-link,
  [data-theme="classic-dark"] .sep-link {
    color: rgba(255, 255, 255, 0.72);
  }
  .sep-collapsed-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f7;
    color: #5B647D;
    text-decoration: none;
    border: 1px solid rgba(0, 0, 0, 0.05);
    transition: background .12s ease;
  }
  .sep-collapsed-btn:hover { background: #ebebed; }
  [data-theme="dark"] .sep-collapsed-btn,
  [data-theme="classic-dark"] .sep-collapsed-btn {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
`
