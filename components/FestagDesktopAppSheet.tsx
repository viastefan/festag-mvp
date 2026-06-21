'use client'

import { useEffect, useState } from 'react'
import Modal, { ModalButton } from '@/components/Modal'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import {
  Bell, DeviceMobile, Sparkle, AppleLogo, AndroidLogo, Desktop,
} from '@phosphor-icons/react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const FEATURES = [
  {
    icon: DeviceMobile,
    title: 'Dort weitermachen, wo du aufgehört hast',
    copy: 'Projekte, Status und Tagro-Verläufe bleiben zwischen Geräten synchron.',
  },
  {
    icon: Bell,
    title: 'Immer auf dem Laufenden bleiben',
    copy: 'Freigaben, Entscheidungen und Team-Updates direkt vom Dock oder Home Screen.',
  },
  {
    icon: Sparkle,
    title: 'Schneller Start ohne Browser-Tab',
    copy: 'Festag als fokussierte App — ohne Ablenkung, mit klarem Delivery-Flow.',
  },
]

type Props = {
  open: boolean
  onClose: () => void
}

export default function FestagDesktopAppSheet({ open, onClose }: Props) {
  const isMobile = useFestagMobile()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIosSafari, setIsIosSafari] = useState(false)

  useEffect(() => {
    if (!open) return
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    setIsStandalone(standalone)

    const ua = navigator.userAgent || ''
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua)
    setIsIosSafari(isIos && isSafari && !standalone)
    setShowIosHint(false)

    function onBeforePrompt(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforePrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforePrompt)
  }, [open])

  async function handleInstall() {
    if (isStandalone) {
      onClose()
      return
    }
    if (deferred) {
      setInstalling(true)
      try {
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        if (outcome === 'accepted') onClose()
      } catch { /* noop */ }
      setInstalling(false)
      return
    }
    if (isIosSafari) {
      setShowIosHint(true)
      return
    }
    window.open('/download', '_self')
  }

  return (
    <Modal open={open} onClose={onClose} size="xl" bare noPadding>
      <div className="fdas-shell">
        <div className="fdas-copy">
          <h2 className="fdas-title">
            {isMobile ? 'Festag auf deinem Gerät' : 'Installiere Festag auf diesem Gerät'}
          </h2>
          <p className="fdas-lead">
            Mit Festag als App arbeitest du mit Status, Freigaben und Tagro — vom Mac, Windows oder Mobilgerät.
          </p>

          <div className="fdas-features" role="list">
            {FEATURES.map(item => {
              const Icon = item.icon
              return (
                <div key={item.title} className="fdas-feature" role="listitem">
                  <span className="fdas-feature-icon" aria-hidden>
                    <Icon size={18} weight="regular" />
                  </span>
                  <div className="fdas-feature-copy">
                    <strong>{item.title}</strong>
                    <span>{item.copy}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="fdas-actions">
            <ModalButton variant="primary" onClick={() => { void handleInstall() }} loading={installing}>
              {isStandalone ? 'Bereits installiert' : 'Loslegen'}
            </ModalButton>
            {!isStandalone && (
              <ModalButton variant="ghost" onClick={onClose}>Später</ModalButton>
            )}
          </div>

          {showIosHint ? (
            <p className="fdas-ios">
              Tippe in Safari auf <strong>Teilen</strong> und wähle <strong>Zum Home-Bildschirm</strong>, um Festag zu installieren.
            </p>
          ) : (
            <p className="fdas-foot">
              Festag läuft als Web-App. Deine Daten bleiben in deinem Workspace — keine zusätzliche Anmeldung nötig.
            </p>
          )}

          <div className="fdas-platforms" aria-label="Unterstützte Plattformen">
            <span><AppleLogo size={14} weight="regular" /> iPhone / Mac</span>
            <span><AndroidLogo size={14} weight="regular" /> Android</span>
            <span><Desktop size={14} weight="regular" /> Windows</span>
          </div>
        </div>

        {!isMobile ? (
          <div className="fdas-preview" aria-hidden>
            <div className="fdas-phone">
              <div className="fdas-phone-notch" />
              <div className="fdas-phone-screen">
                <div className="fdas-phone-head">
                  <span className="fdas-phone-dot" />
                  <span>Festag</span>
                </div>
                <div className="fdas-phone-section">Projekte</div>
                {['Website Relaunch', 'Brand Sprint', 'Q3 Delivery'].map(label => (
                  <div key={label} className="fdas-phone-row">
                    <span className="fdas-phone-folder" />
                    <span>{label}</span>
                  </div>
                ))}
                <div className="fdas-phone-section">Aktuell</div>
                {['Logo-Farbe freigeben', 'Status für Kunde'].map(label => (
                  <div key={label} className="fdas-phone-row fdas-phone-row--muted">
                    <span className="fdas-phone-pulse" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <style>{CSS}</style>
    </Modal>
  )
}

const CSS = `
  .fdas-shell {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(220px, 0.9fr);
    gap: 28px;
    padding: 28px 28px 24px;
    min-height: min(68vh, 520px);
    box-sizing: border-box;
  }
  @media (max-width: 768px) {
    .fdas-shell {
      grid-template-columns: 1fr;
      gap: 0;
      padding: 22px 20px 20px;
      min-height: 0;
    }
  }
  .fdas-copy { min-width: 0; display: flex; flex-direction: column; }
  .fdas-title {
    margin: 0 0 10px;
    font-size: clamp(22px, 2.4vw, 28px);
    line-height: 1.15;
    letter-spacing: -0.03em;
    font-weight: 500;
    color: var(--fp-text, var(--text));
  }
  .fdas-lead {
    margin: 0 0 20px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--fp-muted, var(--text-secondary));
    max-width: 46ch;
  }
  .fdas-features {
    display: grid;
    gap: 0;
    border: 1px solid var(--fp-border, var(--border));
    border-radius: 14px;
    overflow: hidden;
    background: color-mix(in srgb, var(--fp-pill, var(--surface-2)) 55%, transparent);
    margin-bottom: 22px;
  }
  .fdas-feature {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-top: 1px solid var(--fp-divider, var(--border));
  }
  .fdas-feature:first-child { border-top: 0; }
  .fdas-feature-icon {
    width: 34px; height: 34px;
    border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--fp-bg, var(--surface));
    color: var(--fp-text, var(--text));
    border: 1px solid var(--fp-border, var(--border));
    flex-shrink: 0;
  }
  .fdas-feature-copy {
    display: flex; flex-direction: column; gap: 3px;
    min-width: 0;
  }
  .fdas-feature-copy strong {
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--fp-text, var(--text));
  }
  .fdas-feature-copy span {
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--fp-muted, var(--text-secondary));
  }
  .fdas-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .fdas-foot, .fdas-ios {
    margin: 0 0 14px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--fp-muted, var(--text-muted));
    max-width: 52ch;
  }
  .fdas-platforms {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: auto;
    padding-top: 8px;
    font-size: 12px;
    color: var(--fp-muted, var(--text-muted));
  }
  .fdas-platforms span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .fdas-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 0 0;
    background:
      radial-gradient(ellipse 80% 70% at 50% 30%, color-mix(in srgb, #5b647d 18%, transparent), transparent 70%);
  }
  .fdas-phone {
    width: min(240px, 100%);
    aspect-ratio: 9 / 19;
    border-radius: 34px;
    padding: 10px;
    background: linear-gradient(160deg, #2a2a2e 0%, #121214 100%);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
    position: relative;
  }
  .fdas-phone-notch {
    position: absolute;
    top: 12px; left: 50%;
    transform: translateX(-50%);
    width: 72px; height: 18px;
    border-radius: 999px;
    background: #000;
    z-index: 2;
  }
  .fdas-phone-screen {
    height: 100%;
    border-radius: 26px;
    background: var(--festag-black-content, #0c0c0e);
    padding: 34px 12px 12px;
    box-sizing: border-box;
    overflow: hidden;
    color: #fff;
    font-size: 11px;
  }
  .fdas-phone-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    margin-bottom: 14px;
    letter-spacing: -0.02em;
  }
  .fdas-phone-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #34c759;
    flex-shrink: 0;
  }
  .fdas-phone-section {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8e8e93;
    margin: 10px 0 6px;
  }
  .fdas-phone-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border-radius: 8px;
    margin-bottom: 2px;
    background: rgba(255, 255, 255, 0.04);
  }
  .fdas-phone-row--muted { opacity: 0.88; }
  .fdas-phone-folder {
    width: 12px; height: 10px;
    border-radius: 2px 2px 1px 1px;
    background: color-mix(in srgb, #8e8e93 70%, transparent);
    flex-shrink: 0;
  }
  .fdas-phone-pulse {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #5b8def;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(91, 141, 239, 0.18);
  }
`
