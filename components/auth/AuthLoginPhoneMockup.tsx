'use client'

import AuthBrandLogo from '@/components/AuthBrandLogo'
import GoogleBrandIcon from '@/components/auth/GoogleBrandIcon'
import type { AuthThemeMode } from '@/lib/auth-theme'

type Props = {
  theme?: AuthThemeMode
  variant?: 'login' | 'register'
}

/** Desktop auth showcase — upright iPhone mockup in the right panel. */
export default function AuthLoginPhoneMockup({ theme = 'light', variant = 'login' }: Props) {
  const isDark = theme === 'dark'
  const isRegister = variant === 'register'

  return (
    <div className={`al-phone-stage${isDark ? ' is-dark' : ''}`} aria-hidden>
      <div className="al-phone-glow" />
      <div className="al-phone-shell">
        <div className="al-phone-bezel">
          <div className="al-phone-island" />
          <div className="al-phone-screen">
            <div className="al-phone-status">
              <span>9:41</span>
              <span className="al-phone-status-icons">
                <i />
                <i />
                <i />
              </span>
            </div>

            <div className="al-phone-app">
              <div className="al-phone-brand">
                <AuthBrandLogo size="mobile" />
              </div>

              <div className="al-phone-copy">
                {isRegister ? (
                  <>
                    <p className="al-phone-title">Einen Schritt voraus</p>
                    <p className="al-phone-sub">
                      Erstellen Sie ein kostenloses Konto mit Ihrer Arbeits-E-Mail
                    </p>
                  </>
                ) : (
                  <>
                    <p className="al-phone-title">
                      Delivery Intelligence
                      <br />
                      für Ihre Projekte
                    </p>
                    <p className="al-phone-sub">Melden Sie sich an.</p>
                  </>
                )}
              </div>

              <div className="al-phone-stack">
                <div className="al-phone-btn al-phone-btn-google">
                  <GoogleBrandIcon />
                  <span>{isRegister ? 'Mit Google registrieren' : 'Mit Google anmelden'}</span>
                </div>
                <div className="al-phone-or"><span>oder</span></div>
                <div className="al-phone-field" />
                <div className="al-phone-btn al-phone-btn-primary">Weiter mit E-Mail</div>
              </div>
            </div>

            <div className="al-phone-home" />
          </div>
        </div>
      </div>

      <style jsx>{`
        .al-phone-stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-height: 0;
          padding: 8px;
        }
        .al-phone-glow {
          position: absolute;
          inset: 15% 10%;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(110, 143, 184, 0.12), transparent 72%);
          pointer-events: none;
          filter: blur(10px);
        }
        .al-phone-stage.is-dark .al-phone-glow {
          background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.06), transparent 74%);
        }
        .al-phone-shell {
          position: relative;
          z-index: 1;
          width: min(100%, 248px);
          padding: 11px;
          border-radius: 44px;
          background: linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 42%, #2c2c2e 100%);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.12) inset,
            0 28px 64px rgba(15, 23, 42, 0.2);
          transform: none;
        }
        .al-phone-stage.is-dark .al-phone-shell {
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.1) inset,
            0 32px 72px rgba(0, 0, 0, 0.45);
        }
        .al-phone-bezel {
          border-radius: 36px;
          overflow: hidden;
          background: #000;
          position: relative;
        }
        .al-phone-island {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 76px;
          height: 24px;
          border-radius: 999px;
          background: #000;
          z-index: 3;
        }
        .al-phone-screen {
          min-height: 520px;
          background: #f5f5f7;
          display: flex;
          flex-direction: column;
        }
        .al-phone-stage.is-dark .al-phone-screen {
          background: #0c0c0e;
        }
        .al-phone-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px 8px;
          font-size: 11px;
          font-weight:400;
          color: #1e1e20;
        }
        .al-phone-stage.is-dark .al-phone-status { color: #f5f5f7; }
        .al-phone-status-icons {
          display: inline-flex;
          gap: 3px;
          align-items: flex-end;
        }
        .al-phone-status-icons i {
          display: block;
          background: currentColor;
          border-radius: 1px;
        }
        .al-phone-status-icons i:nth-child(1) { width: 14px; height: 8px; opacity: 0.85; }
        .al-phone-status-icons i:nth-child(2) { width: 10px; height: 8px; opacity: 0.65; }
        .al-phone-status-icons i:nth-child(3) { width: 18px; height: 8px; }
        .al-phone-app {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 10px 18px 14px;
          background: #fff;
          border-radius: 28px 28px 0 0;
        }
        .al-phone-stage.is-dark .al-phone-app {
          background: #121214;
        }
        .al-phone-brand { margin-bottom: 16px; }
        .al-phone-brand :global(.auth-brand-logo.mobile) {
          width: 42px;
          height: 42px;
          border-radius: 11px;
        }
        .al-phone-copy { margin-bottom: 18px; }
        .al-phone-title {
          margin: 0;
          font-size: 18px;
          font-weight:400;
          line-height: 1.12;
          letter-spacing: -0.03em;
          color: #1d1d1f;
        }
        .al-phone-stage.is-dark .al-phone-title { color: #f5f5f7; }
        .al-phone-sub {
          margin: 8px 0 0;
          font-size: 12px;
          line-height: 1.35;
          color: #86868b;
        }
        .al-phone-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: auto;
        }
        .al-phone-or {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #86868b;
          font-size: 9px;
          margin: 2px 0;
        }
        .al-phone-or::before,
        .al-phone-or::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e8e8ed;
        }
        .al-phone-stage.is-dark .al-phone-or::before,
        .al-phone-stage.is-dark .al-phone-or::after {
          background: rgba(255, 255, 255, 0.1);
        }
        .al-phone-btn {
          height: 34px;
          border-radius: 11px;
          border: 1px solid rgba(0,0,0,0.08);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;
          padding: 0 12px;
          font-size: 11px;
          font-weight:400;
          color: #1d1d1f;
        }
        .al-phone-stage.is-dark .al-phone-btn {
          background: rgba(255,255,255,0.06);
          border-color: transparent;
          color: rgba(245,245,247,0.55);
        }
        .al-phone-btn-primary {
          justify-content: center;
          background: var(--festag-btn-dark-bg, #ffffff);
          color: var(--festag-btn-dark-fg, #1e1e20);
          border-color: var(--festag-btn-dark-border, #e7ebf0);
        }
        .al-phone-stage.is-dark .al-phone-btn-primary {
          background: var(--festag-btn-dark-bg, rgba(255,255,255,0.06));
          color: var(--festag-btn-dark-fg, rgba(245,245,247,0.55));
          border-color: var(--festag-btn-dark-border, transparent);
        }
        .al-phone-field {
          height: 34px;
          border-radius: 11px;
          border: 1px solid rgba(0,0,0,0.08);
          background: #fff;
        }
        .al-phone-stage.is-dark .al-phone-field {
          background: #121214;
          border-color: transparent;
        }
        .al-phone-home {
          width: 96px;
          height: 4px;
          border-radius: 999px;
          background: rgba(30, 30, 32, 0.18);
          margin: 10px auto 8px;
        }
        .al-phone-stage.is-dark .al-phone-home {
          background: rgba(255, 255, 255, 0.28);
        }
      `}</style>
    </div>
  )
}
