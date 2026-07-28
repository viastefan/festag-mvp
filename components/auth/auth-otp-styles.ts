import {
  AUTH_INPUT_CARET_DARK,
  AUTH_INPUT_FG_DARK,
} from '@/components/auth/auth-chrome-tokens'

/**
 * Shared 6-box OTP / PIN digit styles — AuthLanding (`/login`) + Dev login.
 * Classes: `.al-otp`, `.al-otp-cell` (from AuthOtpInput).
 * Geometry matches auth CTAs: 8px soft rects (never pills).
 */
export const AUTH_OTP_STYLES = `
        /* Single-field PIN (variant="pill") — same soft rect as email, digits centered. */
        .al-otp-pill {
          text-align:center;
          letter-spacing:0.3em;
          -webkit-text-fill-color:currentColor;
          border-radius:var(--festag-input-radius, 8px) !important;
        }
        .al-otp-pill::placeholder {
          letter-spacing:0;
        }
        .al-otp {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          width:100%;
        }
        .al-otp-cell {
          width:40px;
          height:40px;
          flex:0 0 40px;
          /* Match fields — soft rect (Read keeps 6px via --festag-input-radius). */
          border-radius:var(--festag-input-radius, 8px) !important;
          border:var(--festag-input-border-width, 1px) solid var(--festag-input-border, rgba(30,30,32,0.15));
          background-color:var(--festag-input-fill, transparent);
          background-image:none;
          color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-size:18px;
          font-weight:400;
          letter-spacing:0;
          text-align:center;
          outline:none;
          caret-color:var(--al-accent, #5B647D);
          box-shadow:none;
          box-sizing:border-box;
          transition:border-color .2s ease, border-width .2s ease, background .15s;
        }
        .al-root:not([data-theme="dark"]) .al-otp-cell,
        .dl-root:not([data-theme="dark"]) .al-otp-cell {
          background-color:transparent !important;
          color:#1e1e20 !important;
          -webkit-text-fill-color:#1e1e20;
          border:var(--festag-input-border-width, 1px) solid var(--festag-input-border, rgba(40,34,28,0.14)) !important;
          border-radius:8px !important;
        }
        .al-root:not([data-theme="dark"]) .al-otp-cell:hover,
        .dl-root:not([data-theme="dark"]) .al-otp-cell:hover {
          border-color:var(--festag-input-border-hover, rgba(40,34,28,0.20)) !important;
        }
        .al-root:not([data-theme="dark"]) .al-otp-cell:focus,
        .al-root:not([data-theme="dark"]) .al-otp-cell:focus-visible,
        .al-root:not([data-theme="dark"]) .al-otp-cell.has-value,
        .dl-root:not([data-theme="dark"]) .al-otp-cell:focus,
        .dl-root:not([data-theme="dark"]) .al-otp-cell:focus-visible,
        .dl-root:not([data-theme="dark"]) .al-otp-cell.has-value {
          background:transparent !important;
          border:var(--festag-input-border-width-focus, 1.5px) solid var(--festag-input-border-focus, #5B647D) !important;
          border-radius:8px !important;
          box-shadow:none !important;
        }
        .al-otp-cell:disabled { opacity:.55; cursor:not-allowed; }

        .al-root[data-theme="dark"] .al-otp-cell,
        .dl-root[data-theme="dark"] .al-otp-cell {
          background:transparent !important;
          background-color:transparent !important;
          color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK}) !important;
          -webkit-text-fill-color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK});
          border:var(--festag-input-border-width, 1px) solid var(--festag-input-border, rgba(255,255,255,0.10)) !important;
          border-radius:8px !important;
          box-shadow:none;
          caret-color:var(--festag-input-caret, ${AUTH_INPUT_CARET_DARK});
        }
        .al-root[data-theme="dark"] .al-otp-cell:hover,
        .dl-root[data-theme="dark"] .al-otp-cell:hover {
          background:transparent !important;
          border-color:var(--festag-input-border-hover, rgba(255,255,255,0.16)) !important;
          box-shadow:none;
        }
        .al-root[data-theme="dark"] .al-otp-cell:focus,
        .al-root[data-theme="dark"] .al-otp-cell:focus-visible,
        .al-root[data-theme="dark"] .al-otp-cell.has-value,
        .dl-root[data-theme="dark"] .al-otp-cell:focus,
        .dl-root[data-theme="dark"] .al-otp-cell:focus-visible,
        .dl-root[data-theme="dark"] .al-otp-cell.has-value {
          background:transparent !important;
          background-color:transparent !important;
          border:var(--festag-input-border-width-focus, 1.5px) solid var(--festag-input-border-focus, #5B647D) !important;
          border-radius:8px !important;
          box-shadow:none !important;
        }

        @media (min-width: 769px) {
          .al-otp-cell {
            height:40px;
            width:40px;
            flex:0 0 40px;
            border-radius:8px !important;
            font-size:17px;
          }
        }

        @media (max-width: 768px) {
          .al-otp {
            gap:6px;
          }
          .al-otp-cell {
            width:min(40px, calc((100% - 30px) / 6));
            flex:1 1 0;
            min-width:0;
            height:40px;
            border-radius:8px !important;
            font-size:17px;
          }
        }
`
