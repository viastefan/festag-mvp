'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChatsCircle, DeviceMobile } from '@phosphor-icons/react'
import { useFestagMobile } from '@/hooks/useFestagMobile'

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
    icon: ChatsCircle,
    title: 'Immer auf dem Laufenden bleiben',
    copy: 'Freigaben, Entscheidungen und Team-Updates direkt vom Dock oder Home Screen.',
  },
  {
    icon: Bell,
    title: 'Schneller Start ohne Browser-Tab',
    copy: 'Festag als fokussierte App — ohne Ablenkung, mit klarem Delivery-Flow.',
  },
] as const

type Props = {
  onLater?: () => void
}

export default function FestagDesktopAppInstall({ onLater }: Props) {
  const router = useRouter()
  const isMobile = useFestagMobile()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIosSafari, setIsIosSafari] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    setIsStandalone(standalone)

    const ua = navigator.userAgent || ''
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua)
    setIsIosSafari(isIos && isSafari && !standalone)

    function onBeforePrompt(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforePrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforePrompt)
  }, [])

  function handleLater() {
    if (onLater) {
      onLater()
      return
    }
    if (window.history.length > 1) router.back()
    else router.push('/dashboard')
  }

  async function handleInstall() {
    if (isStandalone) {
      handleLater()
      return
    }
    if (deferred) {
      setInstalling(true)
      try {
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        if (outcome === 'accepted') handleLater()
      } catch { /* noop */ }
      setInstalling(false)
      return
    }
    if (isIosSafari) {
      setShowIosHint(true)
      return
    }
  }

  return (
    <div className="fdai-page">
      <div className="fdai-inner">
        <h1 className="fdai-title">
          {isMobile ? 'Festag auf deinem Gerät' : 'Installiere Festag auf diesem Gerät'}
        </h1>
        <p className="fdai-lead">
          Mit Festag als App arbeitest du mit Status, Freigaben und Tagro — vom Mac, Windows oder Mobilgerät.
        </p>

        <div className="fdai-features" role="list">
          {FEATURES.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="fdai-feature" role="listitem">
                <span className="fdai-feature-icon" aria-hidden>
                  <Icon size={18} weight="regular" />
                </span>
                <div className="fdai-feature-copy">
                  <strong>{item.title}</strong>
                  <span>{item.copy}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="fdai-actions">
          <button
            type="button"
            className="fdai-primary"
            onClick={() => { void handleInstall() }}
            disabled={installing}
          >
            {isStandalone ? 'Bereits installiert' : installing ? 'Wird geöffnet…' : 'Loslegen'}
          </button>
          {!isStandalone ? (
            <button type="button" className="fdai-later" onClick={handleLater}>
              Später
            </button>
          ) : null}
        </div>

        {showIosHint ? (
          <p className="fdai-foot">
            Tippe in Safari auf <strong>Teilen</strong> und wähle <strong>Zum Home-Bildschirm</strong>, um Festag zu installieren.
          </p>
        ) : (
          <p className="fdai-foot">
            Festag läuft als Web-App. Deine Daten bleiben in deinem Workspace — keine zusätzliche Anmeldung nötig.
          </p>
        )}
      </div>
      <style suppressHydrationWarning>{CSS}</style>
    </div>
  )
}

const CSS = `
  .fdai-page {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 24px 72px;
    box-sizing: border-box;
    background: var(--portal-card, #ffffff);
    color: var(--portal-text, #1d1d1f);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .fdai-inner {
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
  }
  .fdai-title {
    margin: 0 0 10px;
    font-size: clamp(21px, 2.2vw, 24px);
    line-height: 1.2;
    font-weight: 500;
    letter-spacing: -0.02em;
    text-align: center;
    color: var(--portal-text, #1d1d1f);
  }
  .fdai-lead {
    margin: 0 0 28px;
    font-size: 14px;
    line-height: 1.55;
    text-align: center;
    color: var(--portal-muted, #86868b);
    max-width: 36ch;
    margin-left: auto;
    margin-right: auto;
  }
  .fdai-features {
    display: grid;
    gap: 0;
    margin-bottom: 24px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    overflow: hidden;
    background: #ffffff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 1),
      0 1px 0 rgba(0, 0, 0, 0.03),
      0 4px 14px rgba(144, 149, 159, 0.1);
  }
  [data-theme="dark"] .fdai-features,
  [data-theme="classic-dark"] .fdai-features {
    background: var(--festag-black-popup, #121214);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      0 2px 8px rgba(0, 0, 0, 0.28);
  }
  .fdai-feature {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }
  [data-theme="dark"] .fdai-feature,
  [data-theme="classic-dark"] .fdai-feature {
    border-top-color: rgba(255, 255, 255, 0.08);
  }
  .fdai-feature:first-child { border-top: 0; }
  .fdai-feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    padding-top: 1px;
    color: var(--portal-text, #1d1d1f);
  }
  .fdai-feature-copy {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .fdai-feature-copy strong {
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--portal-text, #1d1d1f);
  }
  .fdai-feature-copy span {
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--portal-muted, #86868b);
  }
  .fdai-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin-bottom: 18px;
  }
  .fdai-primary {
    width: 100%;
    min-height: 40px;
    padding: 0 18px;
    border: 0;
    border-radius: 999px;
    background: var(--portal-btn-primary, #1d1d1f);
    color: var(--portal-btn-primary-text, #ffffff);
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0;
    cursor: pointer;
    transition: opacity .12s ease, transform .1s ease;
  }
  .fdai-primary:hover:not(:disabled) { opacity: 0.92; }
  .fdai-primary:active:not(:disabled) { transform: translateY(1px); }
  .fdai-primary:disabled { opacity: 0.55; cursor: not-allowed; }
  [data-theme="dark"] .fdai-primary,
  [data-theme="classic-dark"] .fdai-primary {
    background: #ffffff;
    color: #121214;
  }
  .fdai-later {
    border: 0;
    background: transparent;
    color: var(--portal-muted, #86868b);
    font: inherit;
    font-size: 13px;
    font-weight: 400;
    padding: 10px 14px;
    cursor: pointer;
    transition: color .12s ease;
  }
  .fdai-later:hover { color: var(--portal-text, #1d1d1f); }
  .fdai-foot {
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    text-align: center;
    color: var(--portal-muted, #86868b);
    max-width: 40ch;
    margin-left: auto;
    margin-right: auto;
  }
  .fdai-foot strong { font-weight: 500; color: var(--portal-text, #1d1d1f); }
  @media (max-width: 768px) {
    .fdai-page {
      align-items: flex-start;
      padding: 32px 20px 48px;
    }
  }
`
