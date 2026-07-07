export const AUTH_LANDING_STYLES = `
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .al-root {
          min-height:100dvh; width:100%;
          --al-panel-width:380px;
          --al-mobile-gutter:24px;
          font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
          transition: opacity 0.16s linear;
          background:#f5f5f7;
          color:#1e1e20;
          display:flex;
          flex-direction:column;
          overflow-x:hidden;
        }
        .al-root.exiting { opacity:0; pointer-events:none; }
        @keyframes alPageEnter { from { opacity:0; } to { opacity:1; } }
        .al-root:not(.exiting) { animation: alPageEnter 0.18s linear both; }

        .al-container {
          flex:1;
          display:flex;
          flex-direction:column;
          min-height:100dvh;
          background:inherit;
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
        .al-header-brand :global(.auth-brand-logo.compact) {
          width:32px;
          height:32px;
          border-radius:8px;
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
        .al-header-nav a:hover { color:#1e1e20; }
        .al-header-actions {
          flex-shrink:0;
          display:flex;
          align-items:center;
          gap:8px;
        }
        .al-mobile-menu {
          display:none;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          height:44px;
          padding:0 2px;
          border-radius:999px;
          background:#fff;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 2px 4px rgba(144, 149, 159, 0.09);
        }
        .al-mobile-sheet {
          width:min(100%, var(--al-panel-width));
          max-width:var(--al-panel-width);
          margin-inline:auto;
          display:flex;
          flex-direction:column;
          min-height:0;
        }
        .al-sheet-grip {
          display:none;
        }

        .al-sheet-body {
          display:flex;
          flex-direction:column;
          flex:1 1 auto;
          min-height:0;
          width:100%;
          max-width:var(--al-panel-width);
          margin-inline:auto;
        }

        .al-main {
          flex:1;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px 32px 32px;
        }
        .al-signin {
          width:100%;
          max-width:var(--al-panel-width);
          margin:0 auto;
        }
        .al-signin-head {
          display:flex;
          flex-direction:column;
          gap:12px;
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
          font-size:clamp(32px, 4vw, 41px);
          font-weight:400;
          line-height:1.12;
          letter-spacing:-0.02em;
          color:#1e1e20;
        }
        .al-title-nowrap { white-space:nowrap; }
        .al-hero-copy {
          display:flex;
          flex-direction:column;
          gap:0;
          width:100%;
        }
        .al-hero-copy .al-title-display + .al-hero-gray {
          margin-top:0;
        }
        .al-hero-copy .al-title.al-title-display,
        .al-hero-copy .al-hero-gray {
          font-size:34px;
          line-height:1.06;
          letter-spacing:-0.03em;
          font-weight:400;
          width:100%;
          margin:0;
        }
        .al-hero-copy .al-title.al-title-display {
          color:#1e1e20;
        }
        .al-hero-gray,
        .al-t1,
        .al-agreements-text,
        .al-signup-alt {
          color:#86868b;
        }
        .al-title-display {
          font-size:30px;
          line-height:34px;
          letter-spacing:-0.02em;
          margin:0;
        }
        .al-hero-gray {
          font-size:30px;
          line-height:34px;
          letter-spacing:-0.02em;
          font-weight:400;
          margin:0;
        }
        .al-t1 {
          margin:10px 0 0;
          font-size:15px;
          font-weight:400;
          line-height:1.5;
          letter-spacing:-0.01em;
          max-width:100%;
        }
        .al-subtitle {
          font-size:clamp(21px, 2.4vw, 30px);
          font-weight:400;
          line-height:1.12;
          color:#6e6e73;
          letter-spacing:-0.02em;
          max-width:none;
          width:100%;
        }
        .al-subtitle-strong { color:#1e1e20; font-weight:400; }
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
        .al-method-group { display:flex; flex-direction:column; gap:10px; }
        .al-sso-group { margin-top:6px; }
        .al-method-head {
          display:none;
          flex-direction:column;
          gap:2px;
        }
        .al-method-kicker {
          margin:0;
          font-size:12px;
          font-weight:600;
          letter-spacing:0.04em;
          text-transform:uppercase;
          color:#1e1e20;
        }
        .al-method-desc {
          margin:0;
          font-size:13px;
          font-weight:400;
          line-height:1.4;
          color:#86868b;
          letter-spacing:-0.01em;
        }

        .al-btn {
          width:100%;
          height:45px;
          border-radius:14px;
          border:1px solid transparent;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          font-family:inherit;
          font-size:14px;
          font-weight:500;
          letter-spacing:-0.01em;
          cursor:pointer;
          padding:0 18px;
          transition:background .15s, border-color .15s, color .15s, transform .08s ease, opacity .15s;
          -webkit-tap-highlight-color:transparent;
        }
        .al-btn:active:not(:disabled) { transform:scale(0.985); }
        .al-btn:disabled { opacity:.55; cursor:not-allowed; }

        .al-btn-google,
        .al-btn-primary,
        .al-btn-ghost {
          background:#ffffff;
          color:#1e1e20;
          border:0.7px solid #e7ebf0;
          box-shadow:0 2px 4px rgba(15, 23, 42, 0.045);
        }
        .al-btn-google:hover:not(:disabled),
        .al-btn-primary:hover:not(:disabled),
        .al-btn-ghost:hover:not(:disabled) {
          background:#f7f8fb;
          border-color:#dce1ea;
          box-shadow:0 2px 5px rgba(15, 23, 42, 0.055);
        }

        .al-google-icon { width:20px; height:20px; flex-shrink:0; display:block; object-fit:contain; }

        .al-divider {
          display:flex;
          align-items:center;
          gap:12px;
          color:#86868b;
          font-size:15px;
          font-weight:400;
          margin:6px 0;
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
          height:45px;
          border-radius:14px;
          border:0.7px solid #e7ebf0;
          background:#f5f5f7;
          color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-size:14px;
          font-weight:500;
          font-synthesis:none;
          letter-spacing:-0.01em;
          padding:0 18px;
          outline:none;
          caret-color:#1e1e20;
          box-shadow:0 1px 2px rgba(15, 23, 42, 0.03);
          transition:border-color .15s, box-shadow .15s, background .15s;
        }
        .al-input::placeholder {
          color:#86868b;
          font-family:inherit;
          font-weight:400;
        }
        .al-input:-webkit-autofill,
        .al-input:-webkit-autofill:hover,
        .al-input:-webkit-autofill:focus {
          -webkit-text-fill-color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:500;
          box-shadow:0 0 0 1000px #f5f5f7 inset;
          transition:background-color 9999s ease-out 0s;
        }
        .al-input:focus,
        .al-input:focus-visible {
          background:#ebebed;
          border-color:#e7ebf0;
          box-shadow:0 1px 2px rgba(15, 23, 42, 0.03);
          outline:none;
        }
        .al-code-input {
          text-align:center;
          letter-spacing:0.35em;
          font-size:18px;
          font-weight:500;
        }

        .al-hint {
          font-size:14px;
          font-weight:500;
          color:#86868b;
          text-align:center;
          letter-spacing:0.1px;
        }
        .al-flow-info {
          font-size:16px;
          font-weight:400;
          line-height:1.5;
          color:#6e6e73;
          letter-spacing:-0.01em;
          text-align:left;
        }
        .al-flow-info strong { color:#1e1e20; font-weight:400; }

        .al-link,
        .al-back {
          font-family:inherit;
          font-size:16px;
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
        .al-back:hover { color:#1e1e20; }
        .al-link:disabled { opacity:.5; cursor:not-allowed; }

        .al-support-note {
          font-size:15px;
          line-height:1.45;
          font-weight:400;
          color:#86868b;
          text-align:center;
        }
        .al-support-note button {
          border:0;
          background:transparent;
          padding:0;
          color:#1e1e20;
          font:inherit;
          text-decoration:underline;
          text-underline-offset:3px;
          cursor:pointer;
        }

        .al-agreements {
          margin-top:22px;
          display:flex;
          flex-direction:column;
          gap:12px;
        }
        .al-agreements-text,
        .al-signup-alt {
          margin:0;
          font-size:12px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:0.1px;
          text-align:left;
        }
        .al-agreements-text a {
          color:#1e1e20;
          font-weight:500;
          text-decoration:none;
          border-bottom:1px solid rgba(30, 30, 32, 0.2);
          transition:border-color .15s, color .15s;
        }
        .al-agreements-text a:hover {
          border-bottom-color:#1e1e20;
        }
        .al-signup-alt a {
          color:#1e1e20;
          font-weight:500;
          text-decoration:none;
          border-bottom:1px solid rgba(30, 30, 32, 0.2);
          transition:border-color .15s;
        }
        .al-signup-alt a:hover { border-bottom-color:#1e1e20; }

        .al-legal {
          margin-top:32px;
          font-size:15px;
          font-weight:400;
          line-height:1.55;
          color:#86868b;
          letter-spacing:-0.01em;
          text-align:left;
        }
        .al-legal a {
          color:#1e1e20;
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
        .al-dev-link:hover { color:#1e1e20; }

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
          border:2px solid rgba(30,30,32,.18);
          border-top-color:#1e1e20;
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
          margin:0; color:#1e1e20; font-size:17px; line-height:1.18;
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
          border:1px solid #d2d2d7; background:#fff; color:#1e1e20;
          font-family:inherit; font-size:14px; font-weight:400;
          outline:none; padding:11px 12px; resize:none;
        }
        .al-support-field input:focus,
        .al-support-field textarea:focus {
          border-color:#1e1e20;
          box-shadow:0 0 0 3px rgba(30,30,32,0.08);
        }
        .al-support-actions { display:flex; gap:8px; margin-top:14px; }
        .al-support-actions .al-btn { height:40px; font-size:14px; }
        .al-support-success {
          margin:8px 0 2px; color:#1e1e20; font-size:13px;
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
          background:#f5f5f7; color:#1e1e20;
          box-shadow:none; border-color:#c7c7cc;
        }

        /* Dark mode */
        .al-root[data-theme="dark"] {
          background:#0c0c0e;
          color:#f5f5f7;
        }
        .al-root[data-theme="dark"] .al-header-nav a { color:rgba(245,245,247,0.58); }
        .al-root[data-theme="dark"] .al-header-nav a:hover { color:#f5f5f7; }
        .al-root[data-theme="dark"] .al-kicker,
        .al-root[data-theme="dark"] .al-subtitle,
        .al-root[data-theme="dark"] .al-subtitle-muted,
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
        .al-root[data-theme="dark"] .al-hero-gray,
        .al-root[data-theme="dark"] .al-t1,
        .al-root[data-theme="dark"] .al-agreements-text,
        .al-root[data-theme="dark"] .al-signup-alt {
          color:rgba(245,245,247,0.58);
        }
        .al-root[data-theme="dark"] .al-title,
        .al-root[data-theme="dark"] .al-flow-info strong,
        .al-root[data-theme="dark"] .al-legal a,
        .al-root[data-theme="dark"] .al-agreements-text a,
        .al-root[data-theme="dark"] .al-signup-alt a,
        .al-root[data-theme="dark"] .al-support-note button,
        .al-root[data-theme="dark"] .al-subtitle-strong {
          color:#f5f5f7;
        }
        .al-root[data-theme="dark"] .al-method-kicker { color:#f5f5f7; }
        .al-root[data-theme="dark"] .al-method-desc { color:rgba(245,245,247,0.58); }
        .al-root[data-theme="dark"] .al-btn-google,
        .al-root[data-theme="dark"] .al-btn-primary,
        .al-root[data-theme="dark"] .al-btn-ghost {
          background:#121214;
          color:#f5f5f7;
          border:0.7px solid rgba(255,255,255,0.1);
          box-shadow:0 2px 4px rgba(0, 0, 0, 0.24);
        }
        .al-root[data-theme="dark"] .al-btn-google:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-ghost:hover:not(:disabled) {
          background:#1c1c1e;
          border-color:rgba(255,255,255,0.16);
          box-shadow:0 2px 6px rgba(0, 0, 0, 0.3);
        }
        .al-root[data-theme="dark"] .al-divider { color:rgba(245,245,247,0.45); }
        .al-root[data-theme="dark"] .al-divider::before,
        .al-root[data-theme="dark"] .al-divider::after {
          background:rgba(255,255,255,0.1);
        }
        .al-root[data-theme="dark"] .al-input {
          background:#121214;
          color:#f5f5f7;
          border:0.7px solid rgba(255,255,255,0.1);
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.22);
          caret-color:#f5f5f7;
        }
        .al-root[data-theme="dark"] .al-input::placeholder { color:rgba(245,245,247,0.38); }
        .al-root[data-theme="dark"] .al-input:-webkit-autofill,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:hover,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:focus {
          -webkit-text-fill-color:#f5f5f7;
          font-weight:500;
          box-shadow:0 0 0 1000px #121214 inset;
        }
        .al-root[data-theme="dark"] .al-input:focus,
        .al-root[data-theme="dark"] .al-input:focus-visible {
          background:#18181a;
          border-color:rgba(255,255,255,0.1);
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.22);
          outline:none;
        }
        @media (max-width: 768px) {
          .al-root[data-theme="dark"] .al-input:focus,
          .al-root[data-theme="dark"] .al-input:focus-visible {
            background:#18181a;
            border-color:rgba(255,255,255,0.1);
            box-shadow:0 1px 2px rgba(0, 0, 0, 0.22);
          }
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
        .al-root[data-theme="dark"] .al-mobile-menu {
          background:rgba(255, 255, 255, 0.08);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            0 2px 4px rgba(0, 0, 0, 0.34);
        }

        html:has(.al-root),
        html:has(.al-root) body {
          height:100%;
          overflow:hidden;
        }

        @media (min-width: 769px) {
          html:has(.al-root),
          html:has(.al-root) body {
            height:100%;
            overflow:hidden;
          }
          .al-root,
          .al-container {
            height:100dvh;
            max-height:100dvh;
            min-height:0;
            overflow:hidden;
          }
          .al-container {
            position:relative;
          }
          .al-header {
            padding:14px 32px;
            flex-shrink:0;
          }
          .al-main {
            flex:1;
            min-height:0;
            overflow:hidden;
            display:flex;
            align-items:stretch;
            justify-content:stretch;
            padding:0;
          }
          .al-desktop-stage {
            width:100%;
            max-width:none;
            flex:1;
            display:grid;
            grid-template-columns:minmax(360px, 460px) minmax(480px, 1fr);
            gap:0;
            align-items:stretch;
            justify-content:stretch;
            min-height:0;
            max-height:100%;
          }
          .al-desktop-left {
            min-width:0;
            min-height:0;
            display:flex;
            flex-direction:column;
            justify-content:center;
            padding:clamp(28px, 4vh, 56px) clamp(40px, 5vw, 80px);
          }
          .al-desktop-showcase {
            display:flex;
            align-items:center;
            justify-content:flex-end;
            min-width:0;
            min-height:0;
            margin-left:auto;
            padding:clamp(28px, 3.5vh, 48px) clamp(28px, 3.5vw, 56px) clamp(28px, 3.5vh, 48px) clamp(40px, 4vw, 64px);
            background:#ebebed;
            border-left:1px solid rgba(0, 0, 0, 0.06);
          }
          .al-root[data-theme="dark"] .al-desktop-showcase {
            background:#161618;
            border-left-color:rgba(255, 255, 255, 0.08);
          }
          .al-method-head { display:none !important; }
          .al-method-group { gap:8px; }
          .al-method-group + .al-divider { margin-top:4px; }
          .al-mobile-sheet {
            flex:0 1 auto;
            display:flex;
            flex-direction:column;
            width:100%;
            max-width:var(--al-panel-width);
            margin-inline:0;
            max-height:100%;
            overflow:visible;
          }
          .al-sheet-body {
            flex:0 1 auto;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:stretch;
            min-height:0;
            max-height:100%;
            overflow:hidden;
            width:100%;
            max-width:var(--al-panel-width);
            margin-inline:auto;
          }
          .al-signin {
            flex:0 0 auto;
            display:block;
            width:100%;
            max-width:var(--al-panel-width);
            margin:0 auto;
          }
          .al-signin-head {
            margin-bottom:clamp(24px, 3.2vh, 36px);
            gap:clamp(10px, 1.4vh, 14px);
          }
          .al-signin-head .al-title,
          .al-signin-head .al-title-nowrap {
            font-size:clamp(30px, 2.8vw, 41px);
            line-height:1.12;
            letter-spacing:-0.02em;
            max-width:none;
            width:100%;
          }
          .al-signin-head .al-subtitle {
            font-size:clamp(21px, 2.2vw, 30px);
            line-height:1.12;
            letter-spacing:-0.02em;
            max-width:none;
            width:100%;
          }
          .al-signin-head .al-kicker {
            font-size:14px;
          }
          .al-agreements-text,
          .al-signup-alt {
            font-size:12px;
            line-height:1.45;
          }
          .al-signin-stack {
            gap:clamp(12px, 1.6vh, 16px);
          }
          .al-method-group {
            gap:clamp(6px, 0.9vh, 10px);
          }
          .al-sso-group {
            margin-top:clamp(0px, 0.4vh, 4px);
          }
          .al-divider {
            margin:clamp(2px, 0.5vh, 6px) 0;
          }
          .al-agreements {
            margin-top:clamp(14px, 2vh, 22px);
            gap:clamp(8px, 1.1vh, 12px);
          }
          .al-agreements-text,
          .al-signup-alt {
            line-height:1.45;
          }
          .al-hint {
            font-size:13px;
            line-height:1.35;
          }
          .al-footer-meta {
            position:absolute;
            left:0;
            right:0;
            bottom:0;
            z-index:1;
            flex-shrink:0;
            margin-top:0;
            padding:0 32px max(12px, env(safe-area-inset-bottom));
            width:100%;
            max-width:none;
            transform:none;
            align-items:flex-end;
            justify-content:space-between;
            flex-direction:row;
            border-top:none;
            background:transparent;
          }
          .al-root[data-theme="dark"] .al-footer-meta {
            background:transparent;
          }
          .al-footer-end {
            align-items:flex-end;
          }
          .al-region-note {
            text-align:right;
            white-space:nowrap;
          }
        }

        @media (min-width: 769px) and (max-height: 860px) {
          .al-header { padding:12px 32px; }
          .al-main { padding-bottom:40px; }
          .al-desktop-stage { gap:28px; }
        }

        @media (min-width: 769px) and (max-height: 780px) {
          .al-main { padding:4px 32px 36px; }
          .al-desktop-showcase { display:none; }
          .al-desktop-stage { grid-template-columns:1fr; }
          .al-desktop-left { align-items:center; }
          .al-mobile-sheet { margin-inline:auto; }
          .al-signin-head { margin-bottom:16px; }
          .al-signin-stack { gap:10px; }
          .al-btn,
          .al-input {
            height:42px;
            font-size:14px;
            border-radius:12px;
          }
          .al-agreements {
            margin-top:12px;
            gap:8px;
          }
          .al-agreements-text,
          .al-signup-alt {
            font-size:12px;
          }
          .al-footer-meta { padding-bottom:10px; }
        }

        @media (min-width: 769px) and (max-height: 700px) {
          .al-header { padding:10px 32px; }
          .al-hero-copy .al-title.al-title-display,
          .al-hero-copy .al-hero-gray {
            font-size:28px;
            line-height:32px;
          }
          .al-t1 { font-size:14px; }
          .al-btn,
          .al-input {
            height:40px;
            font-size:14px;
          }
          .al-signin-stack { gap:8px; }
          .al-hint { font-size:12px; }
        }

        @media (max-width: 768px) {
          .al-desktop-stage {
            width:100%;
            display:flex;
            flex-direction:column;
            min-height:0;
          }
          .al-desktop-left {
            flex:1;
            min-height:0;
            display:flex;
            flex-direction:column;
          }
          .al-desktop-showcase { display:none; }
          .al-method-head { display:none; }
          .al-root,
          .al-container {
            height:100dvh;
            max-height:100dvh;
            min-height:0;
            overflow:hidden;
            background:#f5f5f7;
          }
          .al-root[data-theme="dark"],
          .al-root[data-theme="dark"] .al-container {
            background:#0c0c0e;
          }
          .al-container {
            position:relative;
          }
          .al-header {
            padding:max(10px, env(safe-area-inset-top)) 16px 10px;
            flex-wrap:nowrap;
            flex-shrink:0;
            background:transparent;
          }
          .al-header-nav { display:none; }
          .al-mobile-menu { display:inline-flex; }
          .al-header-actions {
            gap:4px;
          }
          .al-header-actions .auth-theme-switcher {
            gap:4px;
          }
          .al-header-actions .log-theme-pill {
            min-width:32px;
            width:32px;
            height:32px;
            padding:0;
            border-radius:999px;
            border:none;
            background:transparent;
            box-shadow:none;
            font-size:11px;
            font-weight:500;
            color:#86868b;
            transform:none;
          }
          .al-header-actions .log-theme-pill:hover {
            background:transparent;
            transform:none;
          }
          .al-header-actions .log-theme-pill.active {
            background:transparent;
            border:none;
            box-shadow:none;
            color:#1e1e20;
            opacity:1;
          }
          .al-header-actions .log-theme-pill:not(.active) {
            opacity:0.62;
          }
          .al-root[data-theme="dark"] .al-header-actions .log-theme-pill {
            background:transparent;
            border:none;
            box-shadow:none;
            color:rgba(245,245,247,0.58);
          }
          .al-root[data-theme="dark"] .al-header-actions .log-theme-pill.active {
            background:transparent;
            border:none;
            box-shadow:none;
            color:#f5f5f7;
            opacity:1;
          }
          .al-mobile-menu {
            height:32px;
            padding:0;
            background:transparent;
            box-shadow:none;
            border-radius:999px;
          }
          .al-mobile-menu .cx-action-pill-btn {
            width:32px;
            height:32px;
            color:#1e1e20;
          }
          .al-root[data-theme="dark"] .al-mobile-menu .cx-action-pill-btn {
            color:rgba(245,245,247,0.88);
          }
          .al-main {
            flex:1;
            min-height:0;
            overflow:hidden;
            display:flex;
            flex-direction:column;
            align-items:stretch;
            justify-content:flex-end;
            padding:0;
          }
          .al-mobile-sheet {
            flex:1 1 auto;
            min-height:0;
            max-height:none;
            display:flex;
            flex-direction:column;
            background:#ffffff;
            border-radius:24px 24px 0 0;
            box-shadow:0 -8px 32px rgba(15, 23, 42, 0.06);
            overflow:hidden;
            width:100%;
            max-width:100%;
            margin-inline:0;
          }
          .al-root[data-theme="dark"] .al-mobile-sheet {
            background:#121214;
            box-shadow:0 -8px 32px rgba(0, 0, 0, 0.38);
          }
          .al-sheet-body {
            flex:1;
            min-height:0;
            overflow-x:hidden;
            overflow-y:auto;
            overscroll-behavior:contain;
            -webkit-overflow-scrolling:touch;
            display:flex;
            flex-direction:column;
            width:100%;
            max-width:100%;
            padding:20px var(--al-mobile-gutter) 12px;
          }
          .al-signin {
            flex:1 1 auto;
            min-height:0;
            display:flex;
            flex-direction:column;
            width:100%;
            max-width:min(100%, var(--al-panel-width));
            margin:0 auto;
          }
          .al-signin-head {
            flex-shrink:0;
            margin-bottom:clamp(12px, 2vh, 16px);
            gap:8px;
            width:100%;
          }
          .al-hero-copy {
            width:100%;
          }
          .al-kicker {
            font-size:13px;
            letter-spacing:0.02em;
          }
          .al-title,
          .al-title-nowrap {
            font-size:30px;
            line-height:34px;
            letter-spacing:-0.02em;
            width:100%;
          }
          .al-title-nowrap { white-space:normal; }
          .al-subtitle {
            font-size:30px;
            line-height:34px;
            letter-spacing:-0.02em;
            max-width:none;
            width:100%;
          }
          .al-subtitle-strong,
          .al-subtitle-muted {
            letter-spacing:-0.02em;
          }
          .al-t1 {
            font-size:14px;
            margin-top:6px;
            max-width:none;
            line-height:1.45;
            letter-spacing:0.1px;
          }
          .al-content {
            flex:1 1 auto;
            min-height:0;
            display:flex;
            flex-direction:column;
          }
          .al-signin-stack {
            gap:clamp(10px, 1.4vh, 12px);
          }
          .al-method-group { gap:6px; }
          .al-btn {
            height:45px;
            font-size:14px;
            border-radius:12px;
            padding:0 14px;
          }
          .al-input {
            height:45px;
            font-size:14px;
            border-radius:12px;
            padding:0 14px;
          }
          .al-input:focus,
          .al-input:focus-visible {
            background:#ebebed;
            border-color:#e7ebf0;
            box-shadow:0 1px 2px rgba(15, 23, 42, 0.03);
          }
          .al-code-input { font-size:16px; }
          .al-divider {
            font-size:13px;
            margin:2px 0;
          }
          .al-hint {
            font-size:12px;
            line-height:1.3;
          }
          .al-sso-group { margin-top:0; }
          .al-agreements {
            margin-top:clamp(10px, 1.6vh, 14px);
            gap:8px;
            flex-shrink:0;
          }
          .al-agreements-text,
          .al-signup-alt {
            font-size:12px;
            line-height:1.45;
            letter-spacing:0.1px;
          }
          .al-flow-info { font-size:14px; }
          .al-link,
          .al-back { font-size:14px; }
          .al-footer-meta {
            position:static;
            flex-shrink:0;
            flex-direction:row;
            align-items:flex-end;
            justify-content:space-between;
            gap:12px;
            padding:14px var(--al-mobile-gutter) max(14px, env(safe-area-inset-bottom));
            margin-top:0;
            width:100%;
            max-width:none;
            border-top:1px solid #e8e8ed;
            background:#ffffff;
          }
          .al-root[data-theme="dark"] .al-footer-meta {
            border-top-color:rgba(255,255,255,0.1);
            background:#121214;
          }
          .al-ssl-badge,
          .al-region-note,
          .al-dev-link {
            font-size:11px;
            line-height:1.35;
            letter-spacing:0.02em;
          }
          .al-ssl-badge {
            flex:0 1 auto;
            min-width:0;
            max-width:52%;
          }
          .al-ssl-badge span {
            white-space:normal;
          }
          .al-ssl-badge svg {
            width:11px;
            height:13px;
            flex-shrink:0;
          }
          .al-footer-end {
            flex:0 1 auto;
            align-items:flex-end;
            gap:3px;
            width:auto;
            max-width:48%;
          }
          .al-region-note {
            text-align:right;
            white-space:normal;
          }
        }

        @media (max-width: 768px) and (max-height: 740px) {
          .al-hero-copy .al-title.al-title-display,
          .al-hero-copy .al-hero-gray,
          .al-title,
          .al-title-nowrap,
          .al-subtitle {
            font-size:28px;
            line-height:32px;
          }
          .al-t1 { font-size:14px; }
          .al-btn,
          .al-input {
            height:42px;
            font-size:14px;
          }
          .al-signin-stack { gap:8px; }
          .al-signin-head { margin-bottom:10px; }
          .al-agreements-text,
          .al-signup-alt { font-size:12px; }
        }

        @media (max-width: 768px) and (max-height: 670px) {
          .al-hero-copy .al-title.al-title-display,
          .al-hero-copy .al-hero-gray,
          .al-title,
          .al-title-nowrap,
          .al-subtitle {
            font-size:26px;
            line-height:30px;
          }
          .al-btn,
          .al-input {
            height:40px;
            font-size:14px;
          }
          .al-footer-meta {
            padding:12px var(--al-mobile-gutter) max(12px, env(safe-area-inset-bottom));
            gap:10px;
          }
          .al-hint { display:none; }
        }

        @media (max-width: 380px) {
          .al-root { --al-mobile-gutter:20px; }
          .al-sheet-body {
            padding:18px var(--al-mobile-gutter) 10px;
          }
          .al-ssl-badge { max-width:54%; }
          .al-footer-end { max-width:46%; }
        }
`
