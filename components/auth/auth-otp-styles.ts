import {
  AUTH_INPUT_CARET_DARK,
  AUTH_INPUT_FG_DARK,
} from '@/components/auth/auth-chrome-tokens'

/**
 * Shared 6-box OTP / PIN digit styles — used by AuthLanding (`/login`) and Dev login.
 * Classes: `.al-otp`, `.al-otp-cell` (from AuthOtpInput).
 * Dark selectors cover both `.al-root` and `.dl-root`.
 * Stroke matches auth email fields: quiet 1px idle → 2px slate accent on focus.
 */
export const AUTH_OTP_STYLES = `
        .al-otp {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          width:100%;
        }
        .al-otp-cell {
          width:42px;
          height:45px;
          flex:0 0 42px;
          border-radius:12px;
          border:var(--festag-input-border-width, 1px) solid var(--festag-input-border, rgba(30,30,32,0.08));
          background-color:var(--festag-input-fill, transparent);
          background-image:none;
          color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-size:20px;
          font-weight:400;
          letter-spacing:0;
          text-align:center;
          outline:none;
          caret-color:#5B647D;
          box-shadow:none;
          box-sizing:border-box;
          transition:border-color .2s ease, border-width .2s ease, background .15s;
        }
        .al-root:not([data-theme="dark"]) .al-otp-cell,
        .dl-root:not([data-theme="dark"]) .al-otp-cell {
          background-color:transparent !important;
          color:#1e1e20 !important;
          -webkit-text-fill-color:#1e1e20;
          border:var(--festag-input-border-width, 1px) solid var(--festag-input-border, rgba(30,30,32,0.08)) !important;
        }
        .al-otp-cell:hover {
          border-color:var(--festag-input-border-hover, rgba(30,30,32,0.12));
        }
        .al-otp-cell:focus,
        .al-otp-cell:focus-visible {
          background:transparent;
          border:var(--festag-input-border-width-focus, 2px) solid var(--festag-input-border-focus, #5B647D) !important;
          box-shadow:none;
        }
        .al-otp-cell:disabled { opacity:.55; cursor:not-allowed; }

        .al-root[data-theme="dark"] .al-otp-cell,
        .dl-root[data-theme="dark"] .al-otp-cell {
          background:transparent !important;
          background-color:transparent !important;
          color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK}) !important;
          -webkit-text-fill-color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK});
          border:var(--festag-input-border-width, 1px) solid var(--festag-input-border, rgba(255,255,255,0.08)) !important;
          box-shadow:none;
          caret-color:var(--festag-input-caret, ${AUTH_INPUT_CARET_DARK});
        }
        .al-root[data-theme="dark"] .al-otp-cell:hover,
        .dl-root[data-theme="dark"] .al-otp-cell:hover {
          background:transparent !important;
          border-color:var(--festag-input-border-hover, rgba(255,255,255,0.12)) !important;
          box-shadow:none;
        }
        .al-root[data-theme="dark"] .al-otp-cell:focus,
        .dl-root[data-theme="dark"] .al-otp-cell:focus,
        .al-root[data-theme="dark"] .al-otp-cell:focus-visible,
        .dl-root[data-theme="dark"] .al-otp-cell:focus-visible {
          background:transparent !important;
          background-color:transparent !important;
          border:var(--festag-input-border-width-focus, 2px) solid var(--festag-input-border-focus, #5B647D) !important;
          box-shadow:none;
        }

        @media (min-width: 769px) {
          .al-otp-cell {
            height:45px;
            width:42px;
            flex:0 0 42px;
            border-radius:12px;
            font-size:18px;
          }
        }

        @media (max-width: 768px) {
          .al-otp {
            gap:6px;
          }
          .al-otp-cell {
            width:min(42px, calc((100% - 30px) / 6));
            flex:1 1 0;
            min-width:0;
            height:48px;
            border-radius:12px;
            font-size:18px;
          }
        }
`
