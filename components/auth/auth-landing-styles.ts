export const AUTH_LANDING_STYLES = `
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .al-root {
          min-height:100dvh; width:100%;
          font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
          transition: opacity 0.16s linear;
          background:#ffffff;
          color:#1d1d1f;
          display:flex;
          flex-direction:column;
        }
        .al-root.exiting { opacity:0; pointer-events:none; }
        @keyframes alPageEnter { from { opacity:0; } to { opacity:1; } }
        .al-root:not(.exiting) { animation: alPageEnter 0.18s linear both; }

        .al-container {
          flex:1;
          display:flex;
          flex-direction:column;
          min-height:100dvh;
        }

        .al-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
          padding:20px 32px;
          flex-shrink:0;
        }
        .al-header-brand {
          display:flex;
          align-items:center;
          gap:14px;
          min-width:0;
        }
        .al-header-nav {
          display:flex;
          align-items:center;
          gap:24px;
          margin-left:auto;
          margin-right:24px;
        }
        .al-header-nav a {
          font-size:14px;
          font-weight:400;
          color:#6e6e73;
          text-decoration:none;
          letter-spacing:-0.01em;
          transition:color .15s;
        }
        .al-header-nav a:hover { color:#1d1d1f; }
        .al-header-actions { flex-shrink:0; }

        .al-main {
          flex:1;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:32px 32px 48px;
        }
        .al-signin {
          width:100%;
          max-width:400px;
          margin:0 auto;
        }
        .al-signin-head {
          display:flex;
          flex-direction:column;
          gap:10px;
          margin-bottom:32px;
          align-items:flex-start;
          text-align:left;
        }
        .al-kicker {
          font-size:14px;
          font-weight:400;
          color:#6e6e73;
          letter-spacing:-0.01em;
        }
        .al-title {
          font-size:clamp(28px, 4vw, 36px);
          font-weight:400;
          line-height:1.12;
          letter-spacing:-0.02em;
          color:#1d1d1f;
        }
        .al-title-nowrap { white-space:nowrap; }
        .al-title-display {
          font-size:35px;
          line-height:36px;
          letter-spacing:-0.02em;
        }
        .al-hero-gray {
          font-size:35px;
          line-height:36px;
          letter-spacing:0.1px;
          font-weight:400;
          color:#6e6e73;
          margin:0;
        }
        .al-subtitle {
          font-size:17px;
          font-weight:400;
          line-height:1.45;
          color:#6e6e73;
          letter-spacing:0.1px;
          max-width:36ch;
        }
        .al-subtitle-strong { color:#1d1d1f; font-weight:400; }
        .al-subtitle-muted { color:#6e6e73; font-weight:400; }
        .al-lead {
          font-size:14px;
          font-weight:400;
          line-height:1.5;
          color:#86868b;
          margin-top:4px;
        }

        .al-content {
          transition:opacity 0.18s ease, transform 0.18s ease;
        }
        .al-content.animating { opacity:0; transform:translateY(6px); }

        .al-signin-stack {
          display:flex;
          flex-direction:column;
          gap:16px;
        }
        .al-method-group { display:flex; flex-direction:column; gap:8px; }
        .al-sso-group { margin-top:4px; }

        .al-btn {
          width:100%;
          height:48px;
          border-radius:12px;
          border:1px solid transparent;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          font-family:inherit;
          font-size:15px;
          font-weight:500;
          letter-spacing:-0.01em;
          cursor:pointer;
          padding:0 16px;
          transition:background .15s, border-color .15s, color .15s, transform .08s ease, opacity .15s;
          -webkit-tap-highlight-color:transparent;
        }
        .al-btn:active:not(:disabled) { transform:scale(0.985); }
        .al-btn:disabled { opacity:.55; cursor:not-allowed; }

        .al-btn-google {
          background:#ffffff;
          color:#1d1d1f;
          border-color:#d2d2d7;
        }
        .al-btn-google:hover:not(:disabled) { background:#f5f5f7; border-color:#c7c7cc; }

        .al-btn-primary {
          background:#1d1d1f;
          color:#ffffff;
          border-color:#1d1d1f;
        }
        .al-btn-primary:hover:not(:disabled) { background:#333336; border-color:#333336; }

        .al-btn-ghost {
          background:transparent;
          color:#1d1d1f;
          border-color:#d2d2d7;
        }
        .al-btn-ghost:hover:not(:disabled) { background:#f5f5f7; }

        .al-google-icon { width:18px; height:18px; flex-shrink:0; display:block; object-fit:contain; }

        .al-divider {
          display:flex;
          align-items:center;
          gap:12px;
          color:#86868b;
          font-size:13px;
          font-weight:400;
          margin:4px 0;
        }
        .al-divider::before,
        .al-divider::after {
          content:'';
          flex:1;
          height:1px;
          background:#e8e8ed;
        }

        .al-input {
          width:100%;
          height:48px;
          border-radius:12px;
          border:1px solid #d2d2d7;
          background:#ffffff;
          color:#1d1d1f;
          font-family:inherit;
          font-size:15px;
          font-weight:400;
          letter-spacing:-0.01em;
          padding:0 16px;
          outline:none;
          caret-color:#1d1d1f;
          transition:border-color .15s, box-shadow .15s, background .15s;
        }
        .al-input::placeholder { color:#86868b; }
        .al-input:focus {
          border-color:#1d1d1f;
          box-shadow:0 0 0 3px rgba(29,29,31,0.08);
        }
        .al-code-input { text-align:center; letter-spacing:0.35em; font-size:16px; }

        .al-hint {
          font-size:12px;
          font-weight:400;
          color:#86868b;
          text-align:center;
          letter-spacing:-0.01em;
        }
        .al-flow-info {
          font-size:14px;
          font-weight:400;
          line-height:1.5;
          color:#6e6e73;
          letter-spacing:-0.01em;
          text-align:left;
        }
        .al-flow-info strong { color:#1d1d1f; font-weight:400; }

        .al-link,
        .al-back {
          font-family:inherit;
          font-size:14px;
          font-weight:400;
          color:#6e6e73;
          background:none;
          border:none;
          cursor:pointer;
          text-align:center;
          letter-spacing:-0.01em;
          padding:4px;
          transition:color .15s;
        }
        .al-link:hover,
        .al-back:hover { color:#1d1d1f; }
        .al-link:disabled { opacity:.5; cursor:not-allowed; }

        .al-support-note {
          font-size:13px;
          line-height:1.45;
          font-weight:400;
          color:#86868b;
          text-align:center;
        }
        .al-support-note button {
          border:0;
          background:transparent;
          padding:0;
          color:#1d1d1f;
          font:inherit;
          text-decoration:underline;
          text-underline-offset:3px;
          cursor:pointer;
        }

        .al-legal {
          margin-top:28px;
          font-size:13px;
          font-weight:400;
          line-height:1.55;
          color:#86868b;
          letter-spacing:-0.01em;
          text-align:left;
        }
        .al-legal a {
          color:#1d1d1f;
          text-decoration:underline;
          text-underline-offset:3px;
        }
        .al-legal a:hover { opacity:.75; }

        .al-footer-meta {
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:16px;
          padding:0 32px 20px;
          flex-shrink:0;
        }
        .al-footer-end {
          display:flex;
          flex-direction:column;
          align-items:flex-end;
          gap:4px;
        }
        .al-ssl-badge,
        .al-region-note,
        .al-dev-link {
          font-size:11px;
          font-weight:400;
          letter-spacing:0.02em;
          line-height:1.55;
          color:#86868b;
        }
        .al-ssl-badge {
          display:flex;
          align-items:center;
          gap:6px;
          user-select:none;
        }
        .al-ssl-badge svg { width:11px; height:13px; flex-shrink:0; }
        .al-region-note { margin:0; text-align:right; white-space:nowrap; }
        .al-dev-link {
          text-decoration:none;
          transition:color .15s;
        }
        .al-dev-link:hover { color:#1d1d1f; }

        .al-error {
          background:rgba(255,59,48,0.06);
          color:#c9342a;
          border:1px solid rgba(255,59,48,0.14);
          border-radius:12px;
          padding:10px 12px;
          font-size:13px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:-0.01em;
        }

        .al-loader {
          width:16px;
          height:16px;
          border-radius:999px;
          border:2px solid rgba(29,29,31,.18);
          border-top-color:#1d1d1f;
          animation:alSpin .75s linear infinite;
          flex-shrink:0;
        }
        .al-loader-dark {
          border-color:rgba(255,255,255,.28);
          border-top-color:#fff;
        }
        @keyframes alSpin { to { transform:rotate(360deg); } }

        /* Support modal */
        .al-support-backdrop {
          position:fixed; inset:0; z-index:90;
          display:flex; align-items:center; justify-content:center;
          padding:20px;
          background:var(--modal-backdrop, rgba(245,245,247,0.72));
          animation:alModalFade .16s ease both;
        }
        .al-support-modal {
          width:min(360px, 100%);
          border-radius:18px;
          border:1px solid rgba(210,210,215,.8);
          background:#ffffff;
          box-shadow:0 24px 70px rgba(0,0,0,.12);
          padding:18px;
          animation:alModalPop .18s cubic-bezier(.16,1,.3,1) both;
        }
        .al-support-head {
          display:flex; align-items:flex-start; justify-content:space-between;
          gap:14px; margin-bottom:14px;
        }
        .al-support-head h2 {
          margin:0; color:#1d1d1f; font-size:17px; line-height:1.18;
          font-weight:400; letter-spacing:-0.01em;
        }
        .al-support-head p {
          margin:5px 0 0; color:#6e6e73; font-size:13px; line-height:1.45;
          font-weight:400; letter-spacing:-0.01em;
        }
        .al-support-close {
          width:28px; height:28px; border-radius:9px;
          border:1px solid #d2d2d7; background:transparent;
          color:#6e6e73; font-size:16px; line-height:1; cursor:pointer;
        }
        .al-support-field {
          display:flex; flex-direction:column; gap:6px; margin-bottom:10px;
        }
        .al-support-field span {
          color:#86868b; font-size:11px; line-height:16px;
          font-weight:400; letter-spacing:.04em; text-transform:uppercase;
        }
        .al-support-field input,
        .al-support-field textarea {
          width:100%; border-radius:12px;
          border:1px solid #d2d2d7; background:#fff; color:#1d1d1f;
          font-family:inherit; font-size:14px; font-weight:400;
          outline:none; padding:11px 12px; resize:none;
        }
        .al-support-field input:focus,
        .al-support-field textarea:focus {
          border-color:#1d1d1f;
          box-shadow:0 0 0 3px rgba(29,29,31,0.08);
        }
        .al-support-actions { display:flex; gap:8px; margin-top:14px; }
        .al-support-actions .al-btn { height:40px; font-size:14px; }
        .al-support-success {
          margin:8px 0 2px; color:#1d1d1f; font-size:13px;
          line-height:1.45; text-align:center; font-weight:400;
        }
        @keyframes alModalFade { from{opacity:0;} to{opacity:1;} }
        @keyframes alModalPop { from{opacity:0; transform:translateY(8px) scale(.98);} to{opacity:1; transform:none;} }

        /* Theme switcher overrides for landing header */
        .al-header-actions .log-theme-pill {
          min-width:36px; height:30px; padding:0 10px;
          border-radius:10px; font-weight:400;
          box-shadow:none; border:1px solid #d2d2d7; background:#fff;
        }
        .al-header-actions .log-theme-pill.active {
          background:#f5f5f7; color:#1d1d1f;
          box-shadow:none; border-color:#c7c7cc;
        }

        /* Dark mode */
        .al-root[data-theme="dark"] {
          background:#000000;
          color:#f5f5f7;
        }
        .al-root[data-theme="dark"] .al-header-nav a { color:rgba(245,245,247,0.58); }
        .al-root[data-theme="dark"] .al-header-nav a:hover { color:#f5f5f7; }
        .al-root[data-theme="dark"] .al-kicker,
        .al-root[data-theme="dark"] .al-subtitle,
        .al-root[data-theme="dark"] .al-subtitle-muted,
        .al-root[data-theme="dark"] .al-hero-gray,
        .al-root[data-theme="dark"] .al-lead,
        .al-root[data-theme="dark"] .al-hint,
        .al-root[data-theme="dark"] .al-flow-info,
        .al-root[data-theme="dark"] .al-link,
        .al-root[data-theme="dark"] .al-back,
        .al-root[data-theme="dark"] .al-support-note,
        .al-root[data-theme="dark"] .al-legal,
        .al-root[data-theme="dark"] .al-ssl-badge,
        .al-root[data-theme="dark"] .al-region-note,
        .al-root[data-theme="dark"] .al-dev-link {
          color:rgba(245,245,247,0.58);
        }
        .al-root[data-theme="dark"] .al-title,
        .al-root[data-theme="dark"] .al-flow-info strong,
        .al-root[data-theme="dark"] .al-legal a,
        .al-root[data-theme="dark"] .al-support-note button,
        .al-root[data-theme="dark"] .al-subtitle-strong {
          color:#f5f5f7;
        }
        .al-root[data-theme="dark"] .al-btn-google {
          background:#121214;
          color:#f5f5f7;
          border-color:rgba(255,255,255,0.12);
        }
        .al-root[data-theme="dark"] .al-btn-google:hover:not(:disabled) {
          background:#1c1c1e;
          border-color:rgba(255,255,255,0.18);
        }
        .al-root[data-theme="dark"] .al-btn-primary {
          background:#f5f5f7;
          color:#1d1d1f;
          border-color:#f5f5f7;
        }
        .al-root[data-theme="dark"] .al-btn-primary:hover:not(:disabled) {
          background:#ffffff;
          border-color:#ffffff;
        }
        .al-root[data-theme="dark"] .al-btn-ghost {
          color:#f5f5f7;
          border-color:rgba(255,255,255,0.12);
        }
        .al-root[data-theme="dark"] .al-btn-ghost:hover:not(:disabled) {
          background:rgba(255,255,255,0.06);
        }
        .al-root[data-theme="dark"] .al-divider { color:rgba(245,245,247,0.45); }
        .al-root[data-theme="dark"] .al-divider::before,
        .al-root[data-theme="dark"] .al-divider::after {
          background:rgba(255,255,255,0.1);
        }
        .al-root[data-theme="dark"] .al-input {
          background:#121214;
          color:#f5f5f7;
          border-color:rgba(255,255,255,0.12);
          caret-color:#f5f5f7;
        }
        .al-root[data-theme="dark"] .al-input::placeholder { color:rgba(245,245,247,0.38); }
        .al-root[data-theme="dark"] .al-input:focus {
          border-color:rgba(245,245,247,0.45);
          box-shadow:0 0 0 3px rgba(245,245,247,0.08);
        }
        .al-root[data-theme="dark"] .al-error {
          background:rgba(255,69,58,0.1);
          color:#ff6961;
          border-color:rgba(255,69,58,0.2);
        }
        .al-root[data-theme="dark"] .al-support-backdrop { background:rgba(0,0,0,.55); }
        .al-root[data-theme="dark"] .al-support-modal {
          background:#121214;
          border-color:rgba(255,255,255,0.1);
          box-shadow:0 24px 70px rgba(0,0,0,.5);
        }
        .al-root[data-theme="dark"] .al-support-head h2,
        .al-root[data-theme="dark"] .al-support-success { color:#f5f5f7; }
        .al-root[data-theme="dark"] .al-support-head p,
        .al-root[data-theme="dark"] .al-support-field span { color:rgba(245,245,247,0.58); }
        .al-root[data-theme="dark"] .al-support-close {
          border-color:rgba(255,255,255,0.12);
          color:rgba(245,245,247,0.58);
        }
        .al-root[data-theme="dark"] .al-support-field input,
        .al-root[data-theme="dark"] .al-support-field textarea {
          background:#0c0c0e;
          color:#f5f5f7;
          border-color:rgba(255,255,255,0.12);
        }
        .al-root[data-theme="dark"] .al-header-actions .log-theme-pill {
          background:#121214;
          border-color:rgba(255,255,255,0.12);
          color:rgba(245,245,247,0.58);
          box-shadow:none;
        }
        .al-root[data-theme="dark"] .al-header-actions .log-theme-pill.active {
          background:#1c1c1e;
          color:#f5f5f7;
          border-color:rgba(255,255,255,0.18);
        }

        @media (max-width: 768px) {
          .al-header {
            padding:14px 20px 10px;
            flex-wrap:wrap;
          }
          .al-header-nav { display:none; }
          .al-main {
            align-items:center;
            justify-content:center;
            flex:1;
            padding:20px 20px 32px;
          }
          .al-signin {
            max-width:none;
          }
          .al-signin-head {
            margin-bottom:28px;
            gap:10px;
          }
          .al-kicker {
            font-size:14px;
            letter-spacing:0.02em;
          }
          .al-title,
          .al-title-nowrap {
            font-size:35px;
            line-height:36px;
            letter-spacing:-0.02em;
          }
          .al-subtitle {
            font-size:35px;
            line-height:36px;
            letter-spacing:0.1px;
            max-width:none;
          }
          .al-footer-meta {
            flex-direction:column;
            align-items:flex-start;
            padding:0 20px max(20px, env(safe-area-inset-bottom));
          }
          .al-region-note { text-align:left; white-space:normal; }
        }
`
