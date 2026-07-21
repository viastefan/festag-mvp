/**
 * Shared 6-box OTP / PIN digit styles — used by AuthLanding (`/login`) and Dev login.
 * Classes: `.al-otp`, `.al-otp-cell` (from AuthOtpInput).
 * Dark selectors cover both `.al-root` and `.dl-root`.
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
          height:48px;
          flex:0 0 42px;
          border-radius:12px;
          border:0.7px solid #e7ebf0;
          background-color:var(--festag-input-fill, #EEEEF0);
          background-image:none;
          color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-size:20px;
          font-weight:400;
          letter-spacing:0;
          text-align:center;
          outline:none;
          caret-color:#5B647D;
          box-shadow:0 1px 2px rgba(15, 23, 42, 0.03);
          transition:border-color .15s, box-shadow .15s, background .15s;
        }
        .al-root:not([data-theme="dark"]) .al-otp-cell,
        .dl-root:not([data-theme="dark"]) .al-otp-cell {
          background-color:#EEEEF0 !important;
          color:#1e1e20 !important;
          -webkit-text-fill-color:#1e1e20;
        }
        .al-otp-cell:focus {
          background:#ffffff;
          border-color:color-mix(in srgb, #5B647D 55%, #e7ebf0);
          box-shadow:0 0 0 3px rgba(91, 100, 125, 0.16);
        }
        .al-otp-cell:disabled { opacity:.55; cursor:not-allowed; }

        .al-root[data-theme="dark"] .al-otp-cell,
        .dl-root[data-theme="dark"] .al-otp-cell {
          background:#1c1d22 !important;
          background-color:#1c1d22 !important;
          color:#f5f5f7 !important;
          -webkit-text-fill-color:#f5f5f7;
          border-color:transparent;
          box-shadow:none;
          caret-color:#f5f5f7;
        }
        .al-root[data-theme="dark"] .al-otp-cell:hover,
        .dl-root[data-theme="dark"] .al-otp-cell:hover,
        .al-root[data-theme="dark"] .al-otp-cell:focus,
        .dl-root[data-theme="dark"] .al-otp-cell:focus {
          background:#24262c !important;
          background-color:#24262c !important;
          border-color:transparent;
          box-shadow:none;
        }

        @media (min-width: 769px) {
          .al-otp-cell {
            height:44px;
            width:42px;
            flex:0 0 42px;
            max-width:42px;
            font-size:18px;
            border-radius:12px;
          }
        }

        @media (max-width: 768px) {
          .al-otp {
            gap:8px;
          }
          .al-otp-cell {
            width:48px;
            height:54px;
            flex:1 1 0;
            max-width:52px;
            font-size:22px;
            border-radius:14px;
          }
        }
`
