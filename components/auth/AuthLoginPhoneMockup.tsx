'use client'

import AuthBrandLogo from '@/components/AuthBrandLogo'
import GoogleBrandIcon from '@/components/auth/GoogleBrandIcon'
import type { AuthThemeMode } from '@/lib/auth-theme'

type Props = {
  theme?: AuthThemeMode
}

/**
 * Desktop login showcase — iPhone mockup in landscape, tilted inside the right panel.
 */
export default function AuthLoginPhoneMockup({ theme = 'light' }: Props) {
  const isDark = theme === 'dark'

  return (
    <div className={`al-phone-stage al-phone-stage--landscape${isDark ? ' is-dark' : ''}`} aria-hidden>
      <div className="al-phone-glow" />
      <div className="al-phone-tilt">
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
                  <p className="al-phone-title">
                    Delivery Intelligence
                    <br />
                    für Ihre Projekte
                  </p>
                  <p className="al-phone-sub">Melden Sie sich an.</p>
                </div>

                <div className="al-phone-stack">
                  <div className="al-phone-btn al-phone-btn-google">
                    <GoogleBrandIcon />
                    <span>Mit Google anmelden</span>
                  </div>

                  <div className="al-phone-or">
                    <span>oder</span>
                  </div>

                  <div className="al-phone-field" />
                  <div className="al-phone-btn al-phone-btn-primary">
                    Weiter mit E-Mail
                  </div>

                  <div className="al-phone-btn al-phone-btn-ghost">
                    Single Sign-On (SSO)
                  </div>
                </div>
              </div>

              <div className="al-phone-home" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .al-phone-stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 100%;
          min-height: min(72vh, 640px);
          padding: 12px 0;
        }
        .al-phone-stage--landscape .al-phone-tilt {
          transform: rotate(-90deg) scale(1.22);
          transform-origin: center center;
        }
        .al-phone-glow {
          position: absolute;
          inset: 8% 0 8% 20%;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(110, 143, 184, 0.14), transparent 70%);
          pointer-events: none;
          filter: blur(12px);
        }
        .al-phone-stage.is-dark .al-phone-glow {
          background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.07), transparent 72%);
        }
        .al-phone-tilt {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .al-phone-shell {
          width: 248px;
          padding: 10px;
          border-radius: 42px;
          background: linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 42%, #2c2c2e 100%);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.12) inset,
            0 24px 56px rgba(15, 23, 42, 0.22);
        }
        .al-phone-stage.is-dark .al-phone-shell {
          background: linear-gradient(145deg, #4a4a4c 0%, #1a1a1c 45%, #303032 100%);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.1) inset,
            0 28px 64px rgba(0, 0, 0, 0.48);
        }
        .al-phone-bezel {
          border-radius: 34px;
          overflow: hidden;
          background: #000;
          position: relative;
        }
        .al-phone-island {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 72px;
          height: 22px;
          border-radius: 999px;
          background: #000;
          z-index: 3;
        }
        .al-phone-screen {
          min-height: 500px;
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
          font-weight: 600;
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
          padding: 8px 16px 12px;
          background: #fff;
          border-radius: 24px 24px 0 0;
        }
        .al-phone-stage.is-dark .al-phone-app {
          background: #121214;
        }
        .al-phone-brand { margin-bottom: 14px; }
        .al-phone-brand :global(.auth-brand-logo.mobile) {
          width: 40px;
          height: 40px;
          border-radius: 11px;
        }
        .al-phone-copy { margin-bottom: 16px; }
        .al-phone-title {
          margin: 0;
          font-size: 17px;
          line-height: 1.12;
          letter-spacing: -0.03em;
          color: #1e1e20;
        }
        .al-phone-stage.is-dark .al-phone-title { color: #f5f5f7; }
        .al-phone-sub {
          margin: 4px 0 0;
          font-size: 17px;
          line-height: 1.12;
          color: #86868b;
        }
        .al-phone-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .al-phone-btn {
          height: 32px;
          border-radius: 10px;
          border: 0.7px solid #e7ebf0;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 500;
          color: #1e1e20;
        }
        .al-phone-stage.is-dark .al-phone-btn {
          background: #1c1c1e;
          border-color: rgba(255, 255, 255, 0.1);
          color: #f5f5f7;
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
        .al-phone-field {
          height: 32px;
          border-radius: 10px;
          border: 0.7px solid #e7ebf0;
          background: #f5f5f7;
        }
        .al-phone-stage.is-dark .al-phone-field {
          background: #0c0c0e;
          border-color: rgba(255, 255, 255, 0.1);
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
        @media (max-width: 1100px) {
          .al-phone-stage--landscape .al-phone-tilt {
            transform: rotate(-90deg) scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}
