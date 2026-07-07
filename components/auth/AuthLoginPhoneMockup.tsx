'use client'

import AuthBrandLogo from '@/components/AuthBrandLogo'
import GoogleBrandIcon from '@/components/auth/GoogleBrandIcon'
import type { AuthThemeMode } from '@/lib/auth-theme'

type Props = {
  theme?: AuthThemeMode
}

/**
 * Static phone mockup for the desktop login showcase — mirrors the mobile
 * Festag auth sheet inside an iPhone-style frame.
 */
export default function AuthLoginPhoneMockup({ theme = 'light' }: Props) {
  const isDark = theme === 'dark'

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

              <p className="al-phone-legal">
                AGB, Datenschutz, Cookies
              </p>
            </div>

            <div className="al-phone-home" />
          </div>
        </div>
      </div>

      <p className="al-phone-caption">Festag mobil — dieselbe Anmeldung unterwegs</p>

      <style jsx>{`
        .al-phone-stage {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 420px;
          padding: 28px 24px 20px;
          border-radius: 28px;
          background: #f5f5f7;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 24px 64px rgba(15, 23, 42, 0.08);
        }
        .al-phone-stage.is-dark {
          background: linear-gradient(165deg, #161713 0%, #2a2a24 48%, #121214 100%);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.06) inset,
            0 28px 72px rgba(0, 0, 0, 0.45);
        }
        .al-phone-glow {
          position: absolute;
          inset: 12% 8% auto;
          height: 42%;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(110, 143, 184, 0.18), transparent 68%);
          pointer-events: none;
          filter: blur(8px);
        }
        .al-phone-stage.is-dark .al-phone-glow {
          background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.08), transparent 70%);
        }
        .al-phone-shell {
          position: relative;
          z-index: 1;
          width: min(100%, 248px);
          padding: 10px;
          border-radius: 42px;
          background: linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 42%, #2c2c2e 100%);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.12) inset,
            0 18px 40px rgba(0, 0, 0, 0.28);
        }
        .al-phone-stage.is-dark .al-phone-shell {
          background: linear-gradient(145deg, #4a4a4c 0%, #1a1a1c 45%, #303032 100%);
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
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04);
        }
        .al-phone-screen {
          min-height: 500px;
          background: #f5f5f7;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .al-phone-stage.is-dark .al-phone-screen {
          background: #000;
        }
        .al-phone-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px 8px;
          font-size: 11px;
          font-weight: 600;
          color: #1e1e20;
          letter-spacing: -0.02em;
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
        .al-phone-status-icons i:nth-child(1) { width: 14px; height: 8px; opacity: 0.85; border-radius: 2px; }
        .al-phone-status-icons i:nth-child(2) { width: 10px; height: 8px; opacity: 0.65; }
        .al-phone-status-icons i:nth-child(3) { width: 18px; height: 8px; border-radius: 2px; }

        .al-phone-app {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 8px 16px 12px;
          background: #fff;
          margin: 0 0 0;
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -6px 24px rgba(15, 23, 42, 0.05);
        }
        .al-phone-stage.is-dark .al-phone-app {
          background: #121214;
          box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.35);
        }
        .al-phone-brand {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 14px;
        }
        .al-phone-brand :global(.auth-brand-logo.mobile) {
          width: 44px;
          height: 44px;
          border-radius: 12px;
        }
        .al-phone-copy { margin-bottom: 16px; }
        .al-phone-title {
          margin: 0;
          font-size: 18px;
          line-height: 1.15;
          letter-spacing: -0.03em;
          font-weight: 400;
          color: #1e1e20;
        }
        .al-phone-stage.is-dark .al-phone-title { color: #f5f5f7; }
        .al-phone-sub {
          margin: 4px 0 0;
          font-size: 18px;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: #86868b;
        }
        .al-phone-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .al-phone-btn {
          height: 34px;
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
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .al-phone-stage.is-dark .al-phone-btn {
          background: #1c1c1e;
          border-color: rgba(255, 255, 255, 0.1);
          color: #f5f5f7;
        }
        .al-phone-btn-google :global(.al-google-icon),
        .al-phone-btn-google :global(svg) {
          width: 14px !important;
          height: 14px !important;
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
          height: 34px;
          border-radius: 10px;
          border: 0.7px solid #e7ebf0;
          background: #f5f5f7;
        }
        .al-phone-stage.is-dark .al-phone-field {
          background: #0c0c0e;
          border-color: rgba(255, 255, 255, 0.1);
        }
        .al-phone-legal {
          margin: 14px 0 0;
          font-size: 8px;
          line-height: 1.4;
          color: #86868b;
          text-align: left;
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
        .al-phone-caption {
          position: relative;
          z-index: 1;
          margin: 18px 0 0;
          font-size: 12px;
          line-height: 1.45;
          letter-spacing: -0.01em;
          color: #6e6e73;
          text-align: center;
          max-width: 26ch;
        }
        .al-phone-stage.is-dark .al-phone-caption {
          color: rgba(245, 245, 247, 0.58);
        }
      `}</style>
    </div>
  )
}
