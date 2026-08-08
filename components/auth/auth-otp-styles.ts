import {
  AUTH_INPUT_CARET_DARK,
  AUTH_INPUT_FG_DARK,
  AUTH_STROKE,
  AUTH_STROKE_WIDTH_FOCUS,
} from '@/components/auth/auth-chrome-tokens'

/**
 * Shared 6-box OTP / PIN digit styles — AuthLanding (`/login`) + Dev login.
 * Classes: `.al-otp`, `.al-otp-cell` (from AuthOtpInput).
 *
 * Auth text fields + OTP cells share the same soft idle hairline family
 * (`AUTH_STROKE_IDLE` / dark twin). OTP cells still hardcode the gray so
 * empty code boxes never collapse if a theme resets input tokens.
 */
const OTP_IDLE_LIGHT = 'rgba(30, 30, 32, 0.16)'
const OTP_HOVER_LIGHT = 'rgba(30, 30, 32, 0.24)'
const OTP_IDLE_DARK = 'rgba(255, 255, 255, 0.16)'
const OTP_HOVER_DARK = 'rgba(255, 255, 255, 0.24)'
const OTP_STROKE_WIDTH = '1.5px'

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
          /* Gutter so focus/filled strokes never clip L/R. */
          padding-inline:2px;
          box-sizing:border-box;
        }
        .al-otp-cell {
          width:40px;
          height:40px;
          flex:0 0 40px;
          min-width:40px;
          max-width:40px;
          border-radius:var(--festag-input-radius, 8px) !important;
          /* Always-visible idle box — soft gray matching auth text fields. */
          border:${OTP_STROKE_WIDTH} solid ${OTP_IDLE_LIGHT} !important;
          background-color:transparent;
          background-image:none;
          color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-size:18px;
          font-weight:400;
          letter-spacing:0;
          text-align:center;
          outline:none;
          caret-color:var(--festag-input-caret, ${AUTH_STROKE});
          box-shadow:none;
          box-sizing:border-box;
          transition:border-color .18s ease, background .15s;
        }
        .al-root:not([data-theme="dark"]) .al-otp-cell,
        .dl-root:not([data-theme="dark"]) .al-otp-cell {
          background-color:transparent !important;
          color:#1e1e20 !important;
          -webkit-text-fill-color:#1e1e20;
          border:${OTP_STROKE_WIDTH} solid ${OTP_IDLE_LIGHT} !important;
          border-radius:8px !important;
        }
        .al-root:not([data-theme="dark"]) .al-otp-cell:hover,
        .dl-root:not([data-theme="dark"]) .al-otp-cell:hover {
          border-color:${OTP_HOVER_LIGHT} !important;
        }
        .al-root:not([data-theme="dark"]) .al-otp-cell:focus,
        .al-root:not([data-theme="dark"]) .al-otp-cell:focus-visible,
        .al-root:not([data-theme="dark"]) .al-otp-cell.has-value,
        .dl-root:not([data-theme="dark"]) .al-otp-cell:focus,
        .dl-root:not([data-theme="dark"]) .al-otp-cell:focus-visible,
        .dl-root:not([data-theme="dark"]) .al-otp-cell.has-value {
          background:transparent !important;
          border:${AUTH_STROKE_WIDTH_FOCUS} solid var(--festag-input-border-focus, ${AUTH_STROKE}) !important;
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
          border:${OTP_STROKE_WIDTH} solid ${OTP_IDLE_DARK} !important;
          border-radius:8px !important;
          box-shadow:none;
          caret-color:var(--festag-input-caret, ${AUTH_INPUT_CARET_DARK});
        }
        .al-root[data-theme="dark"] .al-otp-cell:hover,
        .dl-root[data-theme="dark"] .al-otp-cell:hover {
          background:transparent !important;
          border-color:${OTP_HOVER_DARK} !important;
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
          border:${AUTH_STROKE_WIDTH_FOCUS} solid var(--festag-input-border-focus, ${AUTH_STROKE}) !important;
          border-radius:8px !important;
          box-shadow:none !important;
        }

        @media (min-width: 769px) {
          .al-otp-cell {
            height:40px;
            width:40px;
            flex:0 0 40px;
            min-width:40px;
            max-width:40px;
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
            max-width:none;
            height:40px;
            border-radius:8px !important;
            font-size:17px;
          }
        }
`
