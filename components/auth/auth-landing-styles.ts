import { AUTH_OTP_STYLES } from '@/components/auth/auth-otp-styles'

const AUTH_LANDING_STYLES_BASE = `
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .al-root {
          min-height:100dvh; width:100%;
          --al-panel-width:360px;
          --al-mobile-gutter:24px;
          --al-col-pad:max(24px, calc(50% - (var(--al-panel-width) / 2)));
          --al-accent:#5B647D;
          /* Apple gray header muted — cool slate (path, secondary titles) */
          --al-text-muted:#8891a0;
          --al-text-muted-soft:#b0b7c4;
          font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
          transition: opacity 0.12s ease;
          /* Light auth: opaque white so no gray portal canvas peeks through. */
          background:#ffffff;
          color:#1e1e20;
          display:flex;
          flex-direction:column;
          overflow-x:hidden;
        }
        /* Auth copy always Aeonik Regular — beat globals Medium (500) defaults. */
        .al-root a,
        .al-root button,
        .al-root input,
        .al-root textarea,
        .al-root select,
        .al-root p,
        .al-root label,
        .al-root strong,
        .al-root b,
        .al-root h1,
        .al-root h2,
        .al-root h3,
        .al-root span {
          font-weight:400;
        }
        .al-root.exiting { opacity:0; pointer-events:none; }
        /* Content-only enter — keep opaque canvas so opacity never reveals a white html frame. */
        @keyframes alPageEnter { from { opacity:0.001; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .al-root:not(.exiting):not(.al-panel-enter) { animation: alPageEnter 0.16s cubic-bezier(.16,1,.3,1) both; }
        /* Cross-panel (client ↔ Dev): slightly longer cue that you switched portal. */
        @keyframes alPanelEnter {
          from { opacity:0.001; transform:translateY(12px) scale(0.991); }
          to { opacity:1; transform:translateY(0) scale(1); }
        }
        .al-root.al-panel-enter:not(.exiting) {
          animation: alPanelEnter 0.26s cubic-bezier(.16,1,.3,1) both;
        }

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
          gap:16px;
          padding:16px 24px;
          flex-shrink:0;
        }
        .al-header-brand {
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
        }
        .al-wordmark {
          font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-size:19px;
          font-weight:400;
          letter-spacing:0.004em;
          color:#1e1e20;
          /* >1 so Aeonik descenders (g/y/p) are not clipped */
          line-height:1.2;
          padding:2px 0 3px;
          text-decoration:none;
          max-width:min(72vw, 320px);
          overflow:visible;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .al-wordmark:hover { color:#1e1e20; }
        .al-header-nav {
          display:none;
        }
        .al-header-nav a {
          font-size:13px;
          font-weight:400;
          color:var(--al-text-muted);
          text-decoration:none;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          transition:color .15s;
        }
        .al-header-nav a:hover { color:#1e1e20; }
        .al-header-actions {
          flex-shrink:0;
          display:flex;
          align-items:center;
          gap:8px;
          margin-left:auto;
        }
        .al-header-cta,
        .al-float-cta {
          display:none !important;
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
        /* SSL lives in the page footer on desktop; mobile login mounts it in-sheet. */
        .al-cta-sheet {
          display:flex;
          flex-direction:column;
          width:100%;
          min-width:0;
        }
        .al-cta-sheet-grip {
          display:none;
        }
        .al-cta-sheet-inner {
          display:flex;
          flex-direction:column;
          width:100%;
          min-width:0;
        }
        .al-cta-sheet-footer,
        .al-register-meta {
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
          padding:20px 24px 28px;
        }
        .al-signin {
          width:100%;
          max-width:var(--al-panel-width);
          margin:0 auto;
        }
        .al-auth-card {
          padding:0;
          border-radius:0;
          background:transparent;
          border:0;
          box-shadow:none;
          backdrop-filter:none;
          -webkit-backdrop-filter:none;
        }
        .al-tabs { display:none; }
        .al-float-cta {
          position:fixed;
          z-index:30;
          left:16px;
          right:16px;
          bottom:max(16px, env(safe-area-inset-bottom));
          display:none;
          align-items:center;
          justify-content:center;
          min-height:48px;
          padding:0 22px;
          border-radius:999px;
          background:#1e1e20;
          color:#f5f5f7;
          text-decoration:none;
          font-family:inherit;
          font-size:15px;
          font-weight:400;
          letter-spacing:-0.01em;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.08) inset,
            0 12px 32px rgba(15, 23, 42, 0.22);
          transition:transform .16s ease, background .16s ease, box-shadow .16s ease;
        }
        .al-float-cta:hover {
          background:#2a2a2c;
          transform:translateY(-1px);
        }
        .al-root[data-theme="dark"] .al-float-cta {
          background:#f5f5f7;
          color:#0c0c0e;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.65) inset,
            0 12px 32px rgba(0, 0, 0, 0.4);
        }
        .al-root[data-theme="dark"] .al-float-cta:hover {
          background:#ffffff;
        }
        .al-signin-head {
          display:flex;
          flex-direction:column;
          gap:4px;
          margin-bottom:28px;
          align-items:flex-start;
          text-align:left;
        }
        .al-kicker { display:none; }
        .al-title,
        h1.al-title,
        h1.al-title.al-title-display {
          font-size:32px !important;
          font-weight:400;
          line-height:39px !important;
          letter-spacing:-0.025em;
          color:#1e1e20;
          text-align:left;
        }
        .al-title-nowrap { white-space:nowrap; }
        .al-hero-brand {
          display:flex;
          align-items:flex-start;
          justify-content:flex-start;
          margin:0 0 10px;
        }
        .al-root--centered .al-header {
          justify-content:space-between;
        }
        .al-root--centered .al-header-nav {
          display:none;
        }
        .al-hero-copy {
          display:flex;
          flex-direction:column;
          gap:0;
          width:100%;
          text-align:left;
          align-items:flex-start;
        }
        .al-hero-copy .al-title-display + .al-hero-gray {
          margin-top:0;
        }
        .al-hero-copy .al-title.al-title-display,
        .al-hero-copy .al-hero-gray,
        .al-hero-copy .al-ws-name-input {
          font-size:32px;
          line-height:39px;
          letter-spacing:-0.025em;
          font-weight:400;
          width:100%;
          margin:0;
          text-align:left;
        }
        .al-hero-copy .al-title.al-title-display {
          color:#1e1e20;
        }
        .al-hero-copy .al-ws-path,
        .al-hero-copy button.al-ws-path--editable {
          font-size:32px;
          line-height:39px;
          letter-spacing:-0.025em;
          font-weight:400;
          width:100%;
          margin:6px 0 0;
          text-align:left;
        }
        .al-hero-copy .al-ws-path .al-ws-slash,
        .al-hero-copy button.al-ws-path--editable .al-ws-slash {
          font-size:32px;
          line-height:39px;
          letter-spacing:-0.025em;
        }
        .al-ws-name-line {
          position:relative;
          display:block;
          width:100%;
          min-height:39px;
        }
        .al-ws-name-line--login {
          display:flex;
          align-items:baseline;
          gap:8px;
        }
        .al-ws-slash {
          flex-shrink:0;
          font-size:32px;
          line-height:39px;
          letter-spacing:-0.025em;
          font-weight:400;
          color:var(--al-text-muted);
        }
        .al-ws-name-line--login .al-ws-name-input {
          flex:1;
          min-width:0;
        }
        .al-ws-name-input {
          display:block;
          width:100%;
          border:0;
          outline:none;
          background:transparent;
          color:#1e1e20;
          padding:0;
          caret-color:#5B647D;
          font-family:inherit;
          box-shadow:none;
          -webkit-appearance:none;
          appearance:none;
        }
        .al-ws-name-input::placeholder { color:transparent; }
        .al-ws-name-line:not(.has-value):not(:focus-within)::after {
          content:'';
          position:absolute;
          left:0;
          top:6px;
          width:2px;
          height:22px;
          border-radius:1px;
          background:#5B647D;
          animation: alCaretBlink 1.05s steps(1, end) infinite;
          pointer-events:none;
        }
        .al-ws-name-line--login:not(.has-value):not(:focus-within)::after {
          left:22px;
        }
        @keyframes alCaretBlink {
          0%, 49% { opacity:1; }
          50%, 100% { opacity:0; }
        }
        .al-ws-path {
          color:var(--al-text-muted);
        }
        button.al-ws-path--editable {
          display:block;
          width:100%;
          border:0;
          background:transparent;
          padding:0;
          cursor:text;
          font:inherit;
          text-align:left;
          color:var(--al-text-muted);
        }
        button.al-ws-path--editable:hover { color:#1e1e20; }
        .al-ws-status {
          margin:16px 0 0 12px;
          padding:0;
          font-size:13px;
          line-height:1.35;
          color:var(--al-text-muted);
          text-align:left;
          align-self:flex-start;
        }
        .al-ws-status--ok { color:#2E9B52; }
        .al-ws-status--bad { color:#c9342a; }
        .sr-only {
          position:absolute;
          width:1px;
          height:1px;
          padding:0;
          margin:-1px;
          overflow:hidden;
          clip:rect(0,0,0,0);
          white-space:nowrap;
          border:0;
        }
        .al-hero-gray,
        .al-agreements-text,
        .al-signup-alt {
          color:var(--al-text-muted);
        }
        .al-t1 {
          color:var(--al-text-muted);
        }
        .al-title-display {
          font-size:32px;
          line-height:39px;
          letter-spacing:-0.025em;
          margin:0;
        }
        .al-hero-gray {
          font-size:32px;
          line-height:39px;
          letter-spacing:-0.025em;
          font-weight:400;
          margin:0;
        }
        .al-t1 {
          margin:8px 0 0;
          font-size:14px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          max-width:100%;
        }
        .al-subtitle {
          font-size:13px;
          font-weight:400;
          line-height:1.4;
          color:var(--al-text-muted);
          letter-spacing:var(--festag-tracking-small, 0.015em);
          max-width:100%;
          margin:6px 0 0;
        }
        .al-subtitle-strong { color:#1e1e20; font-weight:400; }
        .al-subtitle-muted { color:var(--al-text-muted); font-weight:400; }
        .al-lead {
          font-size:13px;
          font-weight:400;
          line-height:1.45;
          color:var(--al-text-muted);
          margin-top:4px;
        }

        .al-content {
          transition:opacity 0.12s cubic-bezier(.16,1,.3,1), transform 0.12s cubic-bezier(.16,1,.3,1);
        }
        .al-content.animating { opacity:0; transform:translateY(6px); }
        .al-content:not(.animating) {
          animation: alContentIn 0.16s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes alContentIn {
          from { opacity:0; transform:translateY(6px); }
          to { opacity:1; transform:translateY(0); }
        }

        .al-signin-stack {
          display:flex;
          flex-direction:column;
          gap:16px;
        }
        .al-method-group { display:flex; flex-direction:column; gap:10px; }
        .al-sso-group { margin-top:6px; }
        /* Desktop: full OAuth labels. Mobile row uses .al-oauth-label-short. */
        .al-oauth-label-short { display:none; }

        .al-btn {
          width:100%;
          height:45px;
          border-radius:999px;
          border:1px solid transparent;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          font-family:inherit;
          font-size:14px;
          font-weight:400;
          letter-spacing:-0.01em;
          cursor:pointer;
          padding:0 18px;
          transition:background .15s, border-color .15s, color .15s, transform .08s ease, opacity .15s, box-shadow .15s;
          -webkit-tap-highlight-color:transparent;
        }
        .al-btn:active:not(:disabled) { transform:scale(0.985); }
        .al-btn:disabled { opacity:.55; cursor:not-allowed; }

        /* Match AuthSecurityModal .auth-sec-cta via shared tokens. */
        .al-btn-primary,
        .al-btn-ghost {
          background:var(--festag-btn-dark-bg, #ffffff);
          color:var(--festag-btn-dark-fg, #1e1e20);
          border:0.7px solid var(--festag-btn-dark-border, #e7ebf0);
          box-shadow:var(--festag-btn-dark-shadow,
            0 1px 2px rgba(15, 23, 42, 0.04),
            0 1px 3px rgba(15, 23, 42, 0.03));
        }
        .al-btn-google {
          background:#5B647D;
          color:#ffffff;
          border:0.7px solid color-mix(in srgb, #5B647D 88%, #000000);
          box-shadow:none;
        }
        .al-btn-apple {
          background:#ffffff;
          color:#1e1e20;
          border:0.7px solid #e7ebf0;
          box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.04),
            0 1px 3px rgba(15, 23, 42, 0.03);
        }
        .al-btn-primary:hover:not(:disabled),
        .al-btn-ghost:hover:not(:disabled) {
          background:var(--festag-btn-dark-bg-hover, #f7f8fb);
          color:var(--festag-btn-dark-fg-hover, #1e1e20);
          border-color:var(--festag-btn-dark-border-hover, #dce1ea);
          box-shadow:var(--festag-btn-dark-shadow-hover,
            0 1px 2px rgba(15, 23, 42, 0.05),
            0 1px 3px rgba(15, 23, 42, 0.04));
        }
        .al-btn-apple:hover:not(:disabled) {
          background:#f7f8fb;
          border-color:#dce1ea;
          box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.05),
            0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .al-btn-google:hover:not(:disabled) {
          background:color-mix(in srgb, #5B647D 90%, #ffffff);
          border-color:color-mix(in srgb, #5B647D 82%, #000000);
          box-shadow:none;
        }
        /* Pressed: denser fill + inset lift — never wash the background out. */
        .al-btn-primary:active:not(:disabled),
        .al-btn-ghost:active:not(:disabled) {
          background:var(--festag-btn-dark-bg-active, #e8ebf0);
          color:var(--festag-btn-dark-fg-active, #1e1e20);
          border-color:var(--festag-btn-dark-border-active, #cfd5df);
          box-shadow:var(--festag-btn-dark-shadow-active,
            inset 0 1px 2px rgba(15, 23, 42, 0.07),
            0 0.5px 1px rgba(15, 23, 42, 0.03));
        }
        .al-btn-apple:active:not(:disabled) {
          background:#e8ebf0;
          border-color:#cfd5df;
          box-shadow:
            inset 0 1px 2px rgba(15, 23, 42, 0.07),
            0 0.5px 1px rgba(15, 23, 42, 0.03);
        }
        .al-btn-google:active:not(:disabled) {
          background:color-mix(in srgb, #5B647D 82%, #000000);
          border-color:color-mix(in srgb, #5B647D 70%, #000000);
          box-shadow:none;
        }

        .al-google-icon { width:18px; height:18px; flex-shrink:0; display:block; object-fit:contain; }
        .al-apple-icon { width:18px; height:18px; flex-shrink:0; display:block; }

        .al-divider {
          display:flex;
          align-items:center;
          gap:10px;
          color:var(--al-text-muted);
          font-size:13px;
          font-weight:400;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          margin:2px 0;
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
          border-radius:999px;
          /* Transparent stroke reserves focus-ring width (avoids layout jump). */
          border:1.2px solid transparent;
          background-color:var(--festag-input-fill, #F5F5F7);
          background-image:none;
          color:#1e1e20;
          font-family:inherit;
          font-size:14px;
          font-weight:400;
          font-synthesis:none;
          letter-spacing:-0.01em;
          padding:0 18px;
          outline:none;
          caret-color:#1e1e20;
          box-shadow:none;
          transition:border-color .15s, background-color .15s;
        }
        .al-input::placeholder {
          color:var(--al-text-muted-soft);
          font-family:inherit;
          font-weight:400;
        }
        /* Hover / focus / filled — solid step via --festag-input-fill-focus. */
        .al-input:hover,
        .al-input:focus,
        .al-input:focus-visible,
        .al-input:active,
        .al-input:not(:placeholder-shown) {
          background-color:var(--festag-input-fill-focus, #EEEEF0);
          background-image:none;
          border:1.2px solid transparent;
          outline:none;
        }
        /* Chrome autofill — flat solid fill via inset box-shadow (no yellow / gradient). */
        .al-input:-webkit-autofill,
        .al-input:-webkit-autofill:hover,
        .al-input:-webkit-autofill:focus,
        .al-input:-webkit-autofill:active {
          -webkit-text-fill-color:#1e1e20 !important;
          caret-color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          background-color:var(--festag-input-fill, #F5F5F7) !important;
          background-image:none !important;
          border:1.2px solid transparent;
          -webkit-box-shadow:0 0 0 1000px var(--festag-input-fill, #F5F5F7) inset !important;
          box-shadow:0 0 0 1000px var(--festag-input-fill, #F5F5F7) inset !important;
          transition:background-color 9999s ease-out 0s;
        }
        .al-code-input {
          text-align:center;
          letter-spacing:0.35em;
          font-size:18px;
          font-weight:400;
        }

        .al-hint {
          font-size:12.5px;
          font-weight:400;
          color:var(--al-text-muted);
          text-align:center;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          width:100%;
        }
        .al-hint--last-sso {
          margin:0;
          text-align:center;
        }
        .al-flow-info {
          font-size:13px;
          font-weight:400;
          line-height:1.45;
          color:var(--al-text-muted);
          letter-spacing:var(--festag-tracking-small, 0.015em);
          text-align:left;
        }
        .al-flow-info strong { color:#1e1e20; font-weight:400; }

        .al-link,
        .al-back {
          font-family:inherit;
          font-size:14px;
          font-weight:400;
          color:var(--al-text-muted);
          background:none;
          border:none;
          cursor:pointer;
          text-align:left;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          padding:4px 0;
          transition:color .15s;
        }
        .al-link:hover,
        .al-back:hover { color:#1e1e20; }
        .al-link:disabled { opacity:.5; cursor:not-allowed; }

        /* Match Dev login AuthHelpAccordion toggle under CTA. */
        .al-support-note {
          display:block;
          width:100%;
          margin:14px 0 0;
          padding:4px 0;
          border:0;
          background:transparent;
          font:inherit;
          font-size:13px;
          font-weight:400;
          line-height:1.4;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          color:var(--al-text-muted);
          text-align:left;
          cursor:pointer;
          transform:none;
          transition:color .18s ease;
        }
        .al-support-note:hover,
        .al-support-note:active {
          color:#1e1e20;
          transform:none;
        }
        .al-support-note button {
          border:0;
          background:transparent;
          padding:0;
          color:inherit;
          font:inherit;
          font-weight:inherit;
          text-decoration:none;
          cursor:pointer;
        }

        .al-agreements {
          flex-shrink:0;
          width:100%;
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        /* Desktop: legal sits under SSO / Weiter inside the form column. */
        .al-agreements--under-form {
          max-width:100%;
          margin:16px 0 0;
          padding:0;
        }
        /* Mobile-only dock near footer — hidden on desktop. */
        .al-agreements--mobile-dock {
          display:none;
        }
        /* Desktop: form-inline legal — main keeps centered clearance above footer chrome. */
        .al-container:has(.al-agreements--under-form) .al-main {
          padding-bottom:120px;
        }
        .al-agreements-text,
        .al-signup-alt {
          margin:0;
          font-size:11.5px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          text-align:left;
        }
        .al-agreements-text a {
          color:#1e1e20;
          font-weight:400;
          text-decoration:none;
          border-bottom:1px solid rgba(30, 30, 32, 0.2);
          transition:border-color .15s, color .15s;
        }
        .al-agreements-text a:hover {
          border-bottom-color:#1e1e20;
        }
        /* Compact primary CTA for mode switch (Anmelden / Registrieren). */
        .al-under-cta-switch.al-btn {
          width:auto;
          height:32px;
          min-height:32px;
          padding:0 14px;
          font-size:13px;
          letter-spacing:-0.01em;
          flex:0 0 auto;
          text-decoration:none;
        }
        .al-signup-alt a {
          color:#1e1e20;
          font-weight:400;
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
          color:var(--al-text-muted);
          letter-spacing:var(--festag-tracking-small, 0.015em);
          text-align:left;
        }
        .al-legal a {
          color:#1e1e20;
          text-decoration:underline;
          text-underline-offset:3px;
        }
        .al-legal a:hover { opacity:.75; }

        .al-footer-meta {
          position:fixed;
          left:0;
          right:0;
          bottom:0;
          z-index:20;
          display:flex;
          flex-direction:row;
          align-items:center;
          justify-content:flex-start;
          gap:10px;
          /* Same centered 360px column as form panel */
          padding:16px var(--al-col-pad) max(20px, env(safe-area-inset-bottom));
          margin:0;
          width:100%;
          max-width:none;
          text-align:left;
          pointer-events:none;
          background:transparent;
          border-top:none;
          box-sizing:border-box;
        }
        .al-footer-meta > * {
          pointer-events:auto;
        }
        .al-footer-logo {
          display:none;
        }
        .al-theme-icon {
          width:28px;
          height:28px;
          flex-shrink:0;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:0;
          border-radius:999px;
          background:transparent;
          color:var(--al-text-muted);
          cursor:pointer;
          transition:color .15s ease, transform .15s ease;
          -webkit-tap-highlight-color:transparent;
        }
        .al-theme-icon:hover {
          color:#1e1e20;
          background:transparent;
        }
        .al-theme-icon:active {
          transform:scale(0.96);
        }
        .al-root[data-theme="dark"] .al-theme-icon {
          color:var(--al-text-muted);
          background:transparent;
        }
        .al-root[data-theme="dark"] .al-theme-icon:hover {
          color:#f5f5f7;
          background:transparent;
        }
        /* Desktop: theme in footer next to Dev Zugang. Mobile: theme in header next to docs. */
        .al-theme-icon--header { display:none; }
        .al-theme-icon--footer { display:inline-flex; }
        .al-footer-links {
          display:flex;
          align-items:center;
          justify-content:flex-start;
          flex-wrap:wrap;
          gap:8px;
        }
        .al-footer-sep {
          color:#c7c7cc;
          font-size:11px;
          line-height:1;
          user-select:none;
        }
        .al-root[data-theme="dark"] .al-footer-sep {
          color:rgba(245,245,247,0.28);
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
          letter-spacing:var(--festag-tracking-small, 0.015em);
          line-height:1.55;
          color:var(--al-text-muted);
        }
        .al-ssl-badge {
          display:inline-flex;
          align-items:center;
          gap:5px;
          user-select:none;
          margin:0;
          padding:0;
          border:0;
          background:transparent;
          font-size:11px;
          font-weight:400;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          line-height:1.55;
          color:var(--al-text-muted);
          font-family:inherit;
          cursor:pointer;
          box-shadow:none;
          -webkit-appearance:none;
          appearance:none;
        }
        .al-ssl-badge:hover,
        .al-ssl-badge:active,
        .al-dev-link:hover,
        .al-dev-link:active { color:#1e1e20; transform:none; text-decoration:none; }
        .al-ssl-badge:focus-visible { color:#1e1e20; outline:none; }
        .al-ssl-badge svg {
          width:0.85em;
          height:1em;
          flex-shrink:0;
          display:block;
        }
        .al-region-note { margin:0; text-align:right; white-space:nowrap; }
        .al-dev-link {
          text-decoration:none;
          transition:color .15s;
        }

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
          background:rgba(15, 23, 42, 0.46);
          backdrop-filter:none;
          -webkit-backdrop-filter:none;
          animation:alModalFade .22s ease both;
        }
        .al-support-modal {
          width:min(360px, 100%);
          border-radius:18px;
          border:1px solid rgba(210,210,215,.8);
          background:#ffffff;
          box-shadow:0 24px 70px rgba(0,0,0,.12);
          padding:18px;
          animation:alModalPop .24s cubic-bezier(.16,1,.3,1) both;
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
          margin:5px 0 0; color:var(--al-text-muted); font-size:13px; line-height:1.45;
          font-weight:400; letter-spacing:var(--festag-tracking-small, 0.015em);
        }
        .al-support-close {
          width:28px; height:28px; border-radius:9px;
          border:1px solid #d2d2d7; background:transparent;
          color:var(--al-text-muted); font-size:16px; line-height:1; cursor:pointer;
        }
        .al-support-field {
          display:flex; flex-direction:column; gap:6px; margin-bottom:10px;
        }
        .al-support-field span {
          color:var(--al-text-muted); font-size:11px; line-height:16px;
          font-weight:400; letter-spacing:.04em; text-transform:uppercase;
        }
        .al-support-field input,
        .al-support-field textarea {
          width:100%; border-radius:12px;
          border:1px solid #d2d2d7; background-color:var(--festag-input-fill, #F5F5F7); background-image:none; color:#1e1e20;
          font-family:inherit; font-size:14px; font-weight:400;
          outline:none; padding:11px 12px; resize:none;
        }
        .al-support-field input:focus,
        .al-support-field textarea:focus {
          background:#ffffff;
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
        @keyframes alModalPop { from{opacity:0; transform:translateY(8px) scale(.985);} to{opacity:1; transform:none;} }

        /* Theme switcher: soft segmented control (styles live in AuthThemeSwitcher) */
        .al-header-actions .auth-theme-switcher {
          gap: 2px;
        }
        .al-header-actions .log-theme-pill {
          box-shadow: none !important;
          border: 0 !important;
        }

        /* Dark mode */
        .al-root[data-theme="dark"] {
          background:transparent;
          color:#f5f5f7;
          --al-text-muted:#9aa3b5;
          --al-text-muted-soft:rgba(154,163,181,0.58);
          /* Local SSL-CTA tokens so dark buttons match even if html theme lags. */
          --festag-btn-dark-bg:rgba(186,194,210,0.10);
          --festag-btn-dark-bg-hover:rgba(186,194,210,0.16);
          --festag-btn-dark-bg-active:rgba(186,194,210,0.22);
          --festag-btn-dark-fg:rgba(245,245,247,0.62);
          --festag-btn-dark-fg-hover:#f5f5f7;
          --festag-btn-dark-fg-active:#f5f5f7;
          --festag-btn-dark-border:transparent;
          --festag-btn-dark-border-hover:transparent;
          --festag-btn-dark-border-active:transparent;
          --festag-btn-dark-shadow:none;
          --festag-btn-dark-shadow-hover:none;
          --festag-btn-dark-shadow-active:none;
        }
        .al-root[data-theme="dark"] .al-wordmark { color:#f5f5f7; }
        .al-root[data-theme="dark"] .al-auth-card {
          background:transparent;
          border:0;
          box-shadow:none;
        }
        .al-root[data-theme="dark"] .al-header-nav a { color:var(--al-text-muted); }
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
          color:var(--al-text-muted);
        }
        .al-root[data-theme="dark"] .al-hero-gray,
        .al-root[data-theme="dark"] .al-t1,
        .al-root[data-theme="dark"] .al-agreements-text,
        .al-root[data-theme="dark"] .al-signup-alt {
          color:var(--al-text-muted);
        }
        .al-root[data-theme="dark"] .al-ssl-badge:hover,
        .al-root[data-theme="dark"] .al-ssl-badge:active,
        .al-root[data-theme="dark"] .al-dev-link:hover,
        .al-root[data-theme="dark"] .al-dev-link:active { color:#f5f5f7; transform:none; }
        .al-root[data-theme="dark"] .al-ws-path,
        .al-root[data-theme="dark"] .al-ws-slash,
        .al-root[data-theme="dark"] button.al-ws-path--editable { color:var(--al-text-muted); }
        .al-root[data-theme="dark"] button.al-ws-path--editable:hover { color:#f5f5f7; }
        .al-root[data-theme="dark"] .al-ws-status { color:var(--al-text-muted-soft); }
        .al-root[data-theme="dark"] .al-ws-status--ok { color:#3dba66; }
        .al-root[data-theme="dark"] .al-ws-status--bad { color:#ff6961; }
        .al-root[data-theme="dark"] .al-ws-name-input {
          color:#f5f5f7;
          caret-color:#9aa3b5;
        }
        .al-root[data-theme="dark"] .al-ws-name-line:not(.has-value):not(:focus-within)::after {
          background:#9aa3b5;
        }
        .al-root[data-theme="dark"] .al-title,
        .al-root[data-theme="dark"] .al-flow-info strong,
        .al-root[data-theme="dark"] .al-legal a,
        .al-root[data-theme="dark"] .al-agreements-text a,
        .al-root[data-theme="dark"] .al-signup-alt a,
        .al-root[data-theme="dark"] .al-support-note:hover,
        .al-root[data-theme="dark"] .al-support-note:active,
        .al-root[data-theme="dark"] .al-support-note button,
        .al-root[data-theme="dark"] .al-subtitle-strong {
          color:#f5f5f7;
        }
        /* Ghost/primary CTAs — identical to .auth-sec-cta (shared tokens). */
        .al-root[data-theme="dark"] .al-btn-primary,
        .al-root[data-theme="dark"] .al-btn-ghost {
          background:var(--festag-btn-dark-bg, rgba(186,194,210,0.10));
          color:var(--festag-btn-dark-fg, rgba(245,245,247,0.62));
          border:0.7px solid var(--festag-btn-dark-border, transparent);
          box-shadow:var(--festag-btn-dark-shadow, none);
        }
        .al-root[data-theme="dark"] .al-btn-google {
          background:#5B647D;
          color:#ffffff;
          border:0.7px solid transparent;
          box-shadow:none;
        }
        .al-root[data-theme="dark"] .al-btn-apple {
          background:#ffffff;
          color:#1e1e20;
          border:0.7px solid transparent;
          box-shadow:none;
        }
        .al-root[data-theme="dark"] .al-btn-primary:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary:active:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary:focus-visible:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-ghost:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-ghost:active:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-ghost:focus-visible:not(:disabled) {
          background:var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.16));
          color:var(--festag-btn-dark-fg-hover, #f5f5f7);
          border-color:var(--festag-btn-dark-border-hover, transparent);
          box-shadow:var(--festag-btn-dark-shadow-hover, none);
        }
        .al-root[data-theme="dark"] .al-btn-google:hover:not(:disabled) {
          background:color-mix(in srgb, #5B647D 88%, #ffffff);
          border-color:transparent;
          box-shadow:none;
        }
        .al-root[data-theme="dark"] .al-btn-apple:hover:not(:disabled) {
          background:#f5f5f7;
          border-color:transparent;
          color:#1e1e20;
          box-shadow:none;
        }
        .al-root[data-theme="dark"] .al-divider { color:var(--al-text-muted-soft); }
        .al-root[data-theme="dark"] .al-divider::before,
        .al-root[data-theme="dark"] .al-divider::after {
          background:rgba(186,194,210,0.14);
        }
        /* Dark auth inputs: cool slate fill on OLED, strokeless; hover/focus slightly lighter. */
        .al-root[data-theme="dark"] .al-input {
          background:rgba(186,194,210,0.10);
          background-color:rgba(186,194,210,0.10);
          background-image:none;
          color:#f5f5f7;
          border:1.2px solid transparent;
          border-color:transparent;
          box-shadow:none;
          caret-color:#f5f5f7;
        }
        .al-root[data-theme="dark"] .al-input::placeholder { color:rgba(245,245,247,0.40); }
        .al-root[data-theme="dark"] .al-input:-webkit-autofill,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:hover,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:focus {
          -webkit-text-fill-color:#f5f5f7;
          font-weight:400;
          border:1.2px solid transparent;
          border-color:transparent;
          box-shadow:0 0 0 1000px #101014 inset;
        }
        .al-root[data-theme="dark"] .al-input:hover,
        .al-root[data-theme="dark"] .al-input:focus,
        .al-root[data-theme="dark"] .al-input:focus-visible,
        .al-root[data-theme="dark"] .al-input:active,
        .al-root[data-theme="dark"] .al-input:not(:placeholder-shown) {
          background:rgba(186,194,210,0.16);
          background-color:rgba(186,194,210,0.16);
          background-image:none;
          border:1.2px solid transparent;
          border-color:transparent;
          box-shadow:none;
          outline:none;
        }
        @media (max-width: 768px) {
          .al-root[data-theme="dark"] .al-input:hover,
          .al-root[data-theme="dark"] .al-input:focus,
          .al-root[data-theme="dark"] .al-input:focus-visible,
          .al-root[data-theme="dark"] .al-input:active,
          .al-root[data-theme="dark"] .al-input:not(:placeholder-shown) {
            background:rgba(186,194,210,0.16);
            background-color:rgba(186,194,210,0.16);
            background-image:none;
            border:1.2px solid transparent;
            border-color:transparent;
            box-shadow:none;
          }
        }
        .al-root[data-theme="dark"] .al-error {
          background:rgba(255,69,58,0.1);
          color:#ff6961;
          border-color:transparent;
        }
        .al-root[data-theme="dark"] .al-support-backdrop { background:rgba(0,0,0,.62); }
        .al-root[data-theme="dark"] .al-support-modal {
          background:var(--festag-black-popup, #18181c);
          border-color:transparent;
          box-shadow:0 24px 70px rgba(0,0,0,.5);
        }
        .al-root[data-theme="dark"] .al-support-head h2,
        .al-root[data-theme="dark"] .al-support-success { color:#f5f5f7; }
        .al-root[data-theme="dark"] .al-support-head p,
        .al-root[data-theme="dark"] .al-support-field span { color:var(--al-text-muted); }
        .al-root[data-theme="dark"] .al-support-close {
          border-color:transparent;
          color:var(--al-text-muted);
          background:rgba(186,194,210,0.10);
        }
        .al-root[data-theme="dark"] .al-support-field input,
        .al-root[data-theme="dark"] .al-support-field textarea {
          background:#101014;
          color:#f5f5f7;
          border-color:transparent;
        }
        .al-root[data-theme="dark"] .al-mobile-menu {
          background:rgba(186, 194, 210, 0.12);
          box-shadow:
            inset 0 1px 0 rgba(186, 194, 210, 0.10),
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
            grid-template-columns:minmax(0, 1fr) minmax(420px, 0.92fr);
            gap:0;
            align-items:stretch;
            justify-content:stretch;
            min-height:0;
            max-height:100%;
          }
          .al-desktop-stage--focus {
            grid-template-columns:1fr;
            max-width:none;
            margin:0;
          }
          .al-desktop-stage--focus .al-desktop-left {
            padding-left:32px;
            padding-right:32px;
            max-width:none;
          }
          /* Desktop: slightly above mid-viewport — vertical centering is mobile-only. */
          .al-root--centered .al-main {
            align-items:flex-start;
            justify-content:center;
            padding-top:clamp(56px, 12vh, 120px);
            padding-bottom:120px;
          }
          /* Desktop: legal is under form buttons — do not collapse main for a footer-dock. */
          .al-root--centered:has(.al-agreements--under-form) .al-main {
            padding-bottom:120px;
          }
          .al-header-cta,
          .al-float-cta {
            display:none !important;
          }
          .al-hero-copy .al-title.al-title-display,
          .al-hero-copy .al-hero-gray,
          .al-title,
          .al-title-display {
            font-size:32px;
            line-height:39px;
          }
          /* Desktop controls stay compact — never inherit mobile 54px heights. */
          .al-btn,
          .al-input {
            height:45px;
            font-size:14px;
            border-radius:999px;
          }
          .al-desktop-stage--centered {
            grid-template-columns:1fr;
            justify-items:center;
            max-width:none;
            margin:0 auto;
          }
          .al-root--centered .al-desktop-left {
            align-items:center;
            justify-content:flex-start;
            width:100%;
            max-width:none;
            padding-left:32px;
            padding-right:32px;
            padding-top:0;
            padding-bottom:24px;
          }
          .al-root--centered .al-mobile-sheet,
          .al-root--centered .al-sheet-body,
          .al-root--centered .al-signin {
            margin-inline:auto;
          }
          .al-root--centered .al-sheet-body {
            justify-content:flex-start;
          }
          .al-desktop-left {
            min-width:0;
            min-height:0;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:flex-start;
            padding:clamp(36px, 5vh, 72px) 32px;
            background:#ffffff;
          }
          .al-root[data-theme="dark"] .al-desktop-left {
            background:#000000;
          }
          .al-desktop-showcase {
            display:flex;
            align-items:stretch;
            justify-content:stretch;
            min-width:0;
            min-height:0;
            padding:
              clamp(16px, 2.4vh, 24px)
              clamp(16px, 2vw, 24px)
              clamp(16px, 2.4vh, 24px)
              clamp(8px, 1vw, 16px);
            background:transparent;
            border-left:none;
          }
          .al-showcase-panel {
            display:flex;
            align-items:center;
            justify-content:center;
            width:100%;
            height:100%;
            min-height:0;
            margin:0;
            margin-left:auto;
            padding:clamp(16px, 2.5vh, 28px) clamp(16px, 2vw, 32px);
            border-radius:28px;
            background:#ffffff;
            border:0.7px solid #e7ebf0;
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.55) inset,
              0 12px 40px rgba(15, 23, 42, 0.04);
            overflow:hidden;
          }
          .al-root[data-theme="dark"] .al-showcase-panel {
            background:#161618;
            border-color:transparent;
            box-shadow:
              0 1px 0 rgba(255, 255, 255, 0.045) inset,
              0 12px 40px rgba(0, 0, 0, 0.32);
          }
          .al-mobile-sheet {
            flex:0 1 auto;
            display:flex;
            flex-direction:column;
            width:min(100%, var(--al-panel-width));
            max-width:var(--al-panel-width);
            margin-inline:0;
            margin-right:auto;
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
            margin-inline:0;
            margin-right:auto;
          }
          .al-signin {
            flex:0 0 auto;
            display:block;
            width:100%;
            max-width:var(--al-panel-width);
            margin:0;
            text-align:left;
          }
          .al-signin-head {
            margin-bottom:clamp(18px, 2.8vh, 28px);
            gap:clamp(8px, 1.2vh, 12px);
          }
          .al-t1 {
            font-size:14px;
            margin-top:clamp(4px, 0.8vh, 8px);
            line-height:1.45;
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
          .al-agreements--under-form {
            margin-top:clamp(14px, 2vh, 20px);
            gap:clamp(8px, 1.1vh, 12px);
          }
          .al-hint {
            font-size:13px;
            line-height:1.35;
          }
          .al-footer-meta {
            position:fixed;
            left:0;
            right:0;
            bottom:0;
            z-index:20;
            margin:0;
            padding:18px var(--al-col-pad) max(24px, env(safe-area-inset-bottom));
            width:100%;
            max-width:none;
            display:flex;
            flex-direction:row;
            align-items:center;
            justify-content:flex-start;
            gap:10px;
            border-top:none;
            background:transparent;
          }
          .al-root[data-theme="dark"] .al-footer-meta {
            background:transparent;
          }
          .al-footer-links {
            display:flex;
            align-items:center;
            justify-content:flex-start;
            flex-wrap:wrap;
            gap:8px;
          }
          .al-region-note {
            text-align:center;
            white-space:nowrap;
          }
        }

        @media (min-width: 769px) and (max-height: 860px) {
          .al-header { padding:12px 32px; }
          .al-main { padding-bottom:40px; }
        }

        @media (min-width: 769px) and (max-height: 780px) {
          .al-main { padding:4px 32px 36px; }
          .al-desktop-showcase { display:none; }
          .al-desktop-stage { grid-template-columns:1fr; }
          .al-desktop-left { align-items:flex-start; }
          .al-mobile-sheet { margin-inline:0; margin-right:auto; }
          .al-signin-head { margin-bottom:16px; }
          .al-signin-stack { gap:10px; }
          .al-btn,
          .al-input {
            height:42px;
            font-size:14px;
          }
          .al-agreements--under-form {
            margin-top:12px;
            gap:8px;
          }
          .al-agreements-text,
          .al-signup-alt {
            font-size:12px;
          }
          .al-footer-meta {
            padding:14px var(--al-col-pad) max(18px, env(safe-area-inset-bottom));
            gap:10px;
          }
        }

        @media (min-width: 769px) and (max-height: 700px) {
          .al-header { padding:10px 32px; }
          .al-hero-copy .al-title.al-title-display,
          .al-hero-copy .al-hero-gray {
            font-size:32px;
            line-height:39px;
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
          .al-root {
            /* Fixed 24px gutters — match Dev mobile; keep header/form/legal/footer on one left edge */
            --al-col-pad:var(--al-mobile-gutter);
          }
          .al-root,
          .al-container {
            height:100dvh;
            max-height:100dvh;
            min-height:0;
            overflow:hidden;
            background:#ffffff;
          }
          .al-root[data-theme="dark"],
          .al-root[data-theme="dark"] .al-container {
            background:transparent;
          }
          .al-container {
            position:relative;
          }
          .al-header {
            /* Compact sticky chrome — opt out of global 44px min-tap on icons */
            padding:max(6px, env(safe-area-inset-top)) var(--al-col-pad) 4px;
            min-height:0;
            flex-wrap:nowrap;
            flex-shrink:0;
            background:transparent;
            justify-content:flex-start;
            align-items:center;
            gap:10px;
          }
          .al-wordmark {
            font-size:15px;
            line-height:1.2;
            padding:1px 0 2px;
            max-width:min(72vw, 240px);
            overflow:visible;
          }
          .al-header-actions {
            display:flex !important;
            margin-left:auto;
            gap:4px;
            align-items:center;
          }
          .al-header-actions .auth-docs-trigger,
          .al-theme-icon--header {
            width:26px !important;
            height:26px !important;
            min-width:26px !important;
            min-height:26px !important;
            max-width:26px !important;
            max-height:26px !important;
          }
          .al-header-nav,
          .al-mobile-menu { display:none !important; }
          .al-theme-icon--header { display:inline-flex !important; }
          .al-theme-icon--footer { display:none !important; }
          .al-main {
            flex:1;
            min-height:0;
            overflow:hidden;
            display:flex;
            flex-direction:column;
            align-items:stretch;
            justify-content:center;
            /* Mobile inset: 24px gutters; light vertical pad (shared with Dev /enter) */
            padding:4px var(--al-col-pad) max(104px, calc(80px + env(safe-area-inset-bottom)));
          }
          .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:12px;
          }
          /* Mobile login: hero above a bottom-docked full-bleed CTA sheet. */
          .al-root[data-auth-mode="login"] .al-main {
            justify-content:stretch;
            padding-top:4px;
            padding-left:0;
            padding-right:0;
            padding-bottom:0;
          }
          .al-root[data-auth-mode="login"] .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:0;
          }
          /* SSL + mode switch live in-sheet / in-stack — hide page footer on mobile auth. */
          .al-root[data-auth-mode="login"] .al-footer-meta,
          .al-root[data-auth-mode="signup"] .al-footer-meta {
            display:none !important;
          }
          /* Register: classic stack — mild hero raise, CTAs centered, meta pinned bottom. */
          .al-root[data-auth-mode="signup"] .al-main {
            justify-content:stretch;
            padding-top:clamp(20px, 4.5vh, 40px);
            padding-bottom:0;
          }
          .al-root[data-auth-mode="signup"] .al-desktop-stage,
          .al-root[data-auth-mode="signup"] .al-desktop-stage--centered,
          .al-root[data-auth-mode="signup"] .al-desktop-left,
          .al-root[data-auth-mode="signup"] .al-mobile-sheet,
          .al-root[data-auth-mode="signup"] .al-sheet-body,
          .al-root[data-auth-mode="signup"] .al-signin {
            flex:1 1 auto;
            height:100%;
            max-height:100%;
            min-height:0;
            width:100%;
            max-width:none;
            margin-inline:0;
            display:flex;
            flex-direction:column;
            justify-content:stretch;
          }
          .al-root[data-auth-mode="signup"] .al-sheet-body {
            overflow:hidden;
          }
          /* Mobile: legal leaves the form column and docks above the footer. */
          .al-agreements--under-form {
            display:none !important;
          }
          .al-agreements--mobile-dock {
            display:flex;
            flex-direction:column;
            align-items:flex-start;
            width:100%;
            max-width:none;
            margin:0;
            padding:8px 0 max(12px, env(safe-area-inset-bottom));
            gap:2px;
            justify-content:flex-start;
            text-align:left;
            box-sizing:border-box;
          }
          .al-root[data-auth-mode="login"] .al-agreements--mobile-dock {
            padding:6px 0 2px;
            margin:0;
          }
          /* Never show long AGB consent under mobile CTAs */
          .al-agreements--mobile-dock .al-agreements-text {
            display:none !important;
          }
          .al-dev-link--desktop-only,
          .al-footer-sep--desktop-only,
          .al-mode-switch--desktop-only {
            display:none !important;
          }
          .al-desktop-stage,
          .al-desktop-stage--centered,
          .al-desktop-left {
            width:100%;
            max-width:100%;
            min-height:0;
            display:flex;
            flex-direction:column;
            align-items:stretch;
            justify-content:center;
            padding:0;
            background:transparent;
          }
          .al-mobile-sheet {
            flex:0 1 auto;
            min-height:0;
            max-height:100%;
            display:flex;
            flex-direction:column;
            background:transparent;
            border-radius:0;
            box-shadow:none;
            overflow:hidden;
            width:100%;
            max-width:min(100%, var(--al-panel-width));
            /* Left-align with header / legal / footer (24px gutter) — do not center */
            margin-inline:0;
            margin-right:auto;
          }
          .al-root[data-theme="dark"] .al-mobile-sheet {
            background:transparent;
            box-shadow:none;
          }
          /* Login mobile: full-height column so hero sits above a docked CTA sheet. */
          .al-root[data-auth-mode="login"] .al-desktop-stage,
          .al-root[data-auth-mode="login"] .al-desktop-stage--centered,
          .al-root[data-auth-mode="login"] .al-desktop-left,
          .al-root[data-auth-mode="login"] .al-mobile-sheet,
          .al-root[data-auth-mode="login"] .al-sheet-body,
          .al-root[data-auth-mode="login"] .al-signin {
            flex:1 1 auto;
            height:100%;
            max-height:100%;
            min-height:0;
            width:100%;
            max-width:none;
            margin-inline:0;
            overflow:hidden;
          }
          .al-root[data-auth-mode="login"] .al-signin {
            display:flex;
            flex-direction:column;
            text-align:left;
          }
          .al-root[data-auth-mode="login"] .al-signin-head {
            flex:1 1 auto;
            min-height:0;
            margin-bottom:0;
            display:flex;
            flex-direction:column;
            align-items:center;
            /* Mild raise above true center — not extreme. */
            justify-content:center;
            width:100%;
            text-align:left;
            padding-left:var(--al-col-pad);
            padding-right:var(--al-col-pad);
            padding-top:clamp(8px, 2vh, 20px);
            padding-bottom:clamp(28px, 5vh, 40px);
            box-sizing:border-box;
          }
          /* Center the title+path block; keep text left-aligned inside it. */
          .al-root[data-auth-mode="login"] .al-hero-copy {
            width:fit-content;
            max-width:100%;
            margin-inline:auto;
            text-align:left;
            align-items:flex-start;
          }
          /* Full-bleed bottom dock — edge-to-edge, flush with screen bottom. */
          .al-root[data-auth-mode="login"] .al-cta-sheet {
            flex:0 0 auto;
            position:relative;
            left:0;
            right:0;
            width:100%;
            max-width:100%;
            margin:0;
            margin-top:auto;
            padding:0 var(--festag-sheet-gutter, 24px) calc(env(safe-area-inset-bottom, 0px) + 8px);
            border-radius:var(--festag-sheet-radius, 22px) var(--festag-sheet-radius, 22px) 0 0;
            background:#ffffff;
            border:none;
            border-bottom:none;
            box-shadow:
              0 -1px 2px rgba(0, 0, 0, 0.06),
              0 -18px 48px -22px rgba(15, 23, 42, 0.18);
            overflow-x:hidden;
            overflow-y:auto;
            overscroll-behavior:contain;
            -webkit-overflow-scrolling:touch;
            max-height:min(68dvh, 600px);
            box-sizing:border-box;
            isolation:isolate;
            background-clip:padding-box;
            animation:festagPopupSheetIn var(--festag-sheet-ms, 240ms) var(--festag-sheet-ease, cubic-bezier(.16, 1, .3, 1)) both;
          }
          .al-root[data-auth-mode="login"][data-theme="dark"] .al-cta-sheet {
            background:var(--festag-black-popup, #18181c);
            box-shadow:
              0 -1px 2px rgba(0, 0, 0, 0.28),
              0 -24px 56px -20px rgba(0, 0, 0, 0.55);
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet-grip.festag-popup-drag-area {
            display:flex;
            cursor:default;
            touch-action:auto;
            /* Comfortable grip pad under the hero air above. */
            padding:14px 0 8px;
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet .festag-popup-drag-handle {
            width:var(--festag-sheet-grip-width, 36px);
            height:var(--festag-sheet-grip-height, 4px);
            background:rgba(0, 0, 0, 0.12);
            opacity:1;
          }
          .al-root[data-auth-mode="login"][data-theme="dark"] .al-cta-sheet .festag-popup-drag-handle {
            background:rgba(255, 255, 255, 0.22);
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet-inner {
            display:flex;
            flex-direction:column;
            gap:0;
            padding-bottom:0;
            flex:1 1 auto;
            min-height:0;
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet .al-content {
            flex:1 1 auto;
            min-height:0;
            display:flex;
            flex-direction:column;
            justify-content:center;
          }
          /* Clear, discreet air between controls — not cramped. */
          .al-root[data-auth-mode="login"] .al-cta-sheet .al-signin-stack {
            gap:18px;
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet .al-method-group {
            gap:14px;
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet .al-method-group--oauth {
            gap:10px;
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet .al-divider {
            margin:4px 0;
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet .al-sso-group {
            margin-top:4px;
            gap:14px;
          }
          /* Tight Zugang note; mode switch + SSL share one footer row. */
          .al-root[data-auth-mode="login"] .al-cta-sheet .al-support-note {
            margin-top:10px;
            margin-bottom:0;
            padding:2px 0;
            font-size:14px;
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet-footer {
            display:flex;
            flex-direction:row;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            width:100%;
            flex:0 0 auto;
            margin-top:auto;
            padding:10px 0 0;
            box-sizing:border-box;
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet-footer .al-under-cta-switch {
            margin:0;
            flex:0 0 auto;
          }
          .al-root[data-auth-mode="login"] .al-cta-sheet-footer .al-ssl-badge {
            font-size:11px;
            line-height:1.35;
            margin-left:auto;
            flex:0 1 auto;
            min-width:0;
          }
          /* Register: no grip — hero mild, CTAs mittig, Anmelden+SSL ganz unten. */
          .al-root[data-auth-mode="signup"] .al-signin-head {
            flex:0 0 auto;
            margin-bottom:clamp(16px, 2.8vh, 24px);
            padding-top:0;
          }
          .al-root[data-auth-mode="signup"] .al-hero-copy {
            align-items:flex-start;
            text-align:left;
          }
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-ws-status {
            margin-top:18px;
            margin-left:12px;
            padding-left:0;
            align-self:flex-start;
          }
          .al-root[data-auth-mode="signup"] .al-content {
            flex:1 1 auto;
            min-height:0;
            display:flex;
            flex-direction:column;
            justify-content:center;
          }
          .al-root[data-auth-mode="signup"] .al-register-meta {
            display:flex;
            flex-direction:row;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            flex:0 0 auto;
            width:100%;
            margin-top:auto;
            padding:10px 0 max(12px, env(safe-area-inset-bottom, 0px));
            box-sizing:border-box;
          }
          .al-root[data-auth-mode="signup"] .al-register-meta .al-under-cta-switch {
            margin:0;
            flex:0 0 auto;
          }
          .al-root[data-auth-mode="signup"] .al-register-meta .al-ssl-badge {
            font-size:11px;
            line-height:1.35;
            margin-left:auto;
            flex:0 1 auto;
            min-width:0;
          }
          @media (prefers-reduced-motion: reduce) {
            .al-root[data-auth-mode="login"] .al-cta-sheet {
              animation:none;
            }
          }
          .al-sheet-body {
            flex:0 1 auto;
            min-height:0;
            overflow-x:hidden;
            overflow-y:auto;
            overscroll-behavior:contain;
            -webkit-overflow-scrolling:touch;
            scroll-behavior:smooth;
            display:flex;
            flex-direction:column;
            width:100%;
            max-width:100%;
            padding:0;
            /* hide scrollbar chrome, keep scroll */
            scrollbar-width:none;
          }
          .al-sheet-body::-webkit-scrollbar { display:none; }
          .al-signin {
            flex:0 1 auto;
            min-height:0;
            display:flex;
            flex-direction:column;
            width:100%;
            max-width:100%;
            margin:0;
            text-align:left;
          }
          .al-signin-head {
            flex-shrink:0;
            margin-bottom:clamp(18px, 2.8vh, 26px);
            gap:0;
            width:100%;
            align-items:flex-start;
            text-align:left;
          }
          .al-hero-copy {
            width:100%;
            text-align:left;
          }
          /* Mobile: title + HQ/path both a bit smaller than desktop 32px. */
          h1.al-title,
          h1.al-title.al-title-display,
          .al-title,
          .al-title-nowrap,
          .al-hero-copy .al-title.al-title-display,
          .al-title-display {
            font-size:26px !important;
            line-height:32px !important;
            letter-spacing:-0.028em;
            font-weight:400;
            text-align:left;
          }
          .al-hero-copy .al-hero-gray,
          .al-hero-copy .al-ws-name-input,
          .al-hero-copy .al-ws-path,
          .al-hero-copy button.al-ws-path--editable,
          .al-hero-copy .al-ws-path .al-ws-slash,
          .al-hero-copy button.al-ws-path--editable .al-ws-slash,
          .al-hero-copy .auth-ws-path,
          .al-hero-copy button.auth-ws-path--tap,
          .al-hero-copy button.auth-ws-path--edit,
          .al-ws-slash {
            font-size:24px !important;
            line-height:30px !important;
            letter-spacing:-0.025em;
            font-weight:400;
            text-align:left;
          }
          .al-title,
          .al-title-nowrap {
            width:100%;
          }
          .al-title-nowrap { white-space:normal; }
          .al-hero-copy .al-ws-path,
          .al-hero-copy button.al-ws-path--editable,
          .al-hero-copy .auth-ws-path-wrap {
            margin-top:4px;
          }
          .al-ws-name-line { min-height:30px; }
          .al-ws-name-line:not(.has-value):not(:focus-within)::after {
            top:6px;
            height:18px;
          }
          .al-ws-name-line--login:not(.has-value):not(:focus-within)::after {
            left:22px;
          }
          .al-ws-status {
            font-size:13px;
            margin-top:18px;
            margin-left:12px;
            padding-left:0;
            align-self:flex-start;
            text-align:left;
          }
          .al-signin-stack { gap:14px; }
          .al-content { transition: opacity .18s ease, transform .18s ease; }
          .al-agreements-text,
          .al-signup-alt {
            font-size:12px;
            line-height:1.5;
            text-align:left;
          }
          .al-hint {
            text-align:center;
            font-size:13px;
          }
          .al-flow-info {
            text-align:left;
            font-size:13px;
          }
          .al-footer-meta {
            flex-direction:row;
            gap:8px;
            padding:10px var(--al-col-pad) max(14px, env(safe-area-inset-bottom));
            justify-content:flex-start;
            text-align:left;
          }
          .al-footer-links {
            gap:6px 8px;
            justify-content:flex-start;
          }
          .al-ssl-badge,
          .al-dev-link {
            font-size:11px;
          }
          .al-auth-card {
            padding:0;
            border-radius:0;
            background:transparent;
            border:0;
            box-shadow:none;
          }
          .al-tabs { display:none; }
          .al-header-cta,
          .al-float-cta {
            display:none !important;
          }
          .al-subtitle {
            font-size:14px;
            line-height:1.45;
            letter-spacing:var(--festag-tracking-small, 0.015em);
            max-width:none;
            width:100%;
            margin:8px 0 0;
          }
          .al-content {
            flex:0 1 auto;
            min-height:0;
            display:flex;
            flex-direction:column;
          }
          .al-signin-stack {
            gap:14px;
          }
          .al-method-group { gap:10px; }
          /* Mobile controls — pill inputs / CTAs */
          .al-btn {
            height:48px;
            min-height:48px;
            font-size:15px;
            font-weight:400;
            border-radius:999px;
            padding:0 16px;
            letter-spacing:-0.015em;
            gap:10px;
          }
          /* Keep mode-switch compact vs full-width mobile CTAs. */
          .al-under-cta-switch.al-btn {
            width:auto;
            height:34px;
            min-height:34px;
            padding:0 14px;
            font-size:13px;
            letter-spacing:-0.01em;
          }
          .al-btn-primary.al-under-cta-switch {
            font-size:13px;
            letter-spacing:-0.01em;
          }
          .al-btn-google,
          .al-btn-apple {
            box-shadow:none !important;
          }
          .al-btn-google span,
          .al-btn-apple span {
            min-width:0;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            font-size:inherit;
            letter-spacing:inherit;
            font-weight:400;
          }
          /* Login mobile CTA sheet only: Google + Apple side by side.
             Register mobile stays stacked full-width. Desktop unchanged. */
          .al-root[data-auth-mode="login"] .al-method-group--oauth {
            flex-direction:row;
            flex-wrap:wrap;
            align-items:stretch;
            gap:8px;
          }
          .al-root[data-auth-mode="login"] .al-method-group--oauth .al-hint {
            flex:1 1 100%;
          }
          .al-root[data-auth-mode="login"] .al-method-group--oauth .al-btn-google,
          .al-root[data-auth-mode="login"] .al-method-group--oauth .al-btn-apple {
            flex:1 1 0;
            width:auto;
            min-width:0;
            height:42px;
            min-height:42px;
            font-size:13px;
            letter-spacing:-0.01em;
            padding:0 10px;
            gap:8px;
            box-shadow:none !important;
          }
          .al-root[data-auth-mode="login"] .al-method-group--oauth .al-oauth-label-full { display:none; }
          .al-root[data-auth-mode="login"] .al-method-group--oauth .al-oauth-label-short {
            display:inline;
            min-width:0;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            font-size:inherit;
            letter-spacing:inherit;
            font-weight:400;
          }
          .al-root[data-auth-mode="login"] .al-method-group--oauth .al-google-icon,
          .al-root[data-auth-mode="login"] .al-method-group--oauth .al-apple-icon {
            width:15px;
            height:15px;
          }
          .al-btn-primary,
          .al-btn-ghost {
            font-size:15px;
            letter-spacing:-0.015em;
          }
          .al-input,
          .al-input::placeholder {
            font-size:15px;
            letter-spacing:-0.015em;
          }
          .al-google-icon,
          .al-apple-icon {
            width:16px;
            height:16px;
          }
          /* Even more minimal lift than desktop on light ghost / Apple CTAs. */
          .al-btn-primary,
          .al-btn-ghost,
          .al-btn-apple {
            box-shadow:
              0 1px 1px rgba(15, 23, 42, 0.03),
              0 1px 2px rgba(15, 23, 42, 0.02) !important;
          }
          .al-btn-primary:hover:not(:disabled),
          .al-btn-ghost:hover:not(:disabled),
          .al-btn-apple:hover:not(:disabled) {
            box-shadow:
              0 1px 1px rgba(15, 23, 42, 0.035),
              0 1px 2px rgba(15, 23, 42, 0.025) !important;
          }
          .al-root[data-theme="dark"] .al-btn-primary,
          .al-root[data-theme="dark"] .al-btn-ghost,
          .al-root[data-theme="dark"] .al-btn-google,
          .al-root[data-theme="dark"] .al-btn-apple {
            box-shadow:none !important;
          }
          .al-input {
            height:48px;
            font-size:15px;
            border-radius:999px;
            padding:0 18px;
            letter-spacing:-0.01em;
          }
          .al-input:hover,
          .al-input:focus,
          .al-input:focus-visible,
          .al-input:active,
          .al-input:not(:placeholder-shown) {
            background-color:var(--festag-input-fill-focus, #EEEEF0);
            background-image:none;
            border:1.2px solid transparent;
          }
          .al-input:-webkit-autofill,
          .al-input:-webkit-autofill:hover,
          .al-input:-webkit-autofill:focus,
          .al-input:-webkit-autofill:active {
            background-color:var(--festag-input-fill, #F5F5F7) !important;
            background-image:none !important;
            -webkit-box-shadow:0 0 0 1000px var(--festag-input-fill, #F5F5F7) inset !important;
            box-shadow:0 0 0 1000px var(--festag-input-fill, #F5F5F7) inset !important;
          }
          .al-code-input { font-size:16px; }
          .al-divider {
            font-size:13px;
            margin:4px 0;
          }
          .al-hint {
            font-size:12px;
            line-height:1.3;
            text-align:center;
            letter-spacing:var(--festag-tracking-small, 0.015em);
          }
          .al-sso-group { margin-top:2px; }
          .al-agreements--mobile-dock {
            padding-top:6px;
            gap:2px;
            flex-shrink:0;
          }
          .al-agreements-text,
          .al-signup-alt {
            font-size:12px;
            line-height:1.45;
            letter-spacing:var(--festag-tracking-small, 0.015em);
            text-align:left;
          }
          .al-flow-info { font-size:15px; text-align:left; }
          .al-link,
          .al-back { font-size:15px; }
          .al-footer-meta {
            position:fixed;
            left:0;
            right:0;
            bottom:0;
            z-index:20;
            flex-direction:row;
            align-items:center;
            justify-content:flex-start;
            gap:8px;
            padding:10px var(--al-col-pad) max(14px, env(safe-area-inset-bottom));
            margin:0;
            width:100%;
            max-width:none;
            border-top:none;
            background:transparent;
            text-align:left;
          }
          .al-root[data-theme="dark"] .al-footer-meta {
            border-top:none;
            background:transparent;
          }
          .al-footer-logo {
            display:none;
          }
          .al-footer-links {
            display:flex;
            align-items:center;
            justify-content:flex-start;
            flex-wrap:wrap;
            gap:6px 8px;
            max-width:100%;
            text-align:left;
          }
          .al-ssl-badge,
          .al-region-note,
          .al-dev-link {
            font-size:11px;
            line-height:1.35;
            letter-spacing:var(--festag-tracking-small, 0.015em);
            max-width:none;
            min-height:0;
          }
          .al-ssl-badge {
            flex:0 1 auto;
            min-width:0;
            max-width:none;
            min-height:0;
            height:auto;
          }
          .al-ssl-badge span {
            white-space:normal;
          }
          .al-ssl-badge svg {
            width:0.85em;
            height:1em;
            flex-shrink:0;
            display:block;
          }
          .al-footer-end {
            display:none;
          }
          .al-region-note {
            text-align:left;
            white-space:normal;
          }
        }

        @media (max-width: 768px) and (max-height: 740px) {
          .al-main {
            padding-top:4px;
            padding-bottom:100px;
          }
          .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:10px;
          }
          .al-root[data-auth-mode="login"] .al-main,
          .al-root[data-auth-mode="login"] .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-left:0;
            padding-right:0;
            padding-bottom:0;
          }
          .al-hero-copy .al-title.al-title-display,
          .al-title,
          .al-title-nowrap,
          .al-title-display {
            font-size:26px !important;
            line-height:32px !important;
          }
          .al-hero-copy .al-hero-gray,
          .al-hero-copy .al-ws-name-input,
          .al-hero-copy .al-ws-path,
          .al-hero-copy button.al-ws-path--editable,
          .al-hero-copy .al-ws-path .al-ws-slash,
          .al-hero-copy button.al-ws-path--editable .al-ws-slash,
          .al-hero-copy .auth-ws-path,
          .al-hero-copy button.auth-ws-path--tap,
          .al-hero-copy button.auth-ws-path--edit,
          .al-ws-slash {
            font-size:24px !important;
            line-height:30px !important;
          }
          .al-subtitle,
          .al-t1,
          .al-flow-info { font-size:14px; }
          .al-btn,
          .al-input {
            height:46px;
            font-size:15px;
            border-radius:999px;
          }
          .al-under-cta-switch.al-btn,
          .al-btn-primary.al-under-cta-switch {
            height:32px;
            min-height:32px;
            font-size:13px;
            padding:0 14px;
            letter-spacing:-0.01em;
          }
          .al-input {
            box-shadow:none !important;
          }
          .al-signin-stack { gap:12px; }
          .al-signin-head { margin-bottom:18px; }
          .al-agreements-text,
          .al-signup-alt { font-size:11.5px; }
        }

        @media (max-width: 768px) and (max-height: 670px) {
          .al-main {
            padding-top:4px;
            padding-bottom:92px;
          }
          .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:8px;
          }
          .al-root[data-auth-mode="login"] .al-main,
          .al-root[data-auth-mode="login"] .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-left:0;
            padding-right:0;
            padding-bottom:0;
          }
          .al-hero-copy .al-title.al-title-display,
          .al-title,
          .al-title-nowrap,
          .al-title-display {
            font-size:24px !important;
            line-height:30px !important;
          }
          .al-hero-copy .al-hero-gray,
          .al-hero-copy .al-ws-name-input,
          .al-hero-copy .al-ws-path,
          .al-hero-copy button.al-ws-path--editable,
          .al-hero-copy .al-ws-path .al-ws-slash,
          .al-hero-copy button.al-ws-path--editable .al-ws-slash,
          .al-hero-copy .auth-ws-path,
          .al-hero-copy button.auth-ws-path--tap,
          .al-hero-copy button.auth-ws-path--edit,
          .al-ws-slash {
            font-size:22px !important;
            line-height:28px !important;
          }
          .al-subtitle,
          .al-t1,
          .al-flow-info { font-size:13px; }
          .al-btn,
          .al-input {
            height:48px;
            font-size:15px;
          }
          .al-under-cta-switch.al-btn,
          .al-btn-primary.al-under-cta-switch {
            height:32px;
            min-height:32px;
            font-size:13px;
            padding:0 14px;
            letter-spacing:-0.01em;
          }
          .al-btn-google,
          .al-btn-apple,
          .al-btn-primary,
          .al-btn-ghost,
          .al-input,
          .al-input::placeholder {
            font-size:15px;
            letter-spacing:-0.015em;
          }
          .al-root[data-auth-mode="login"] .al-method-group--oauth .al-btn-google,
          .al-root[data-auth-mode="login"] .al-method-group--oauth .al-btn-apple {
            height:40px;
            min-height:40px;
            font-size:13px;
            letter-spacing:-0.01em;
            padding:0 10px;
          }
          .al-footer-meta {
            padding:8px var(--al-col-pad) max(12px, env(safe-area-inset-bottom));
            gap:8px;
            justify-content:flex-start;
          }
          .al-hint { display:none; }
        }

        @media (max-width: 380px) {
          /* Keep 24px gutters — do not tighten below mobile gutter */
          .al-hero-copy .al-title.al-title-display,
          .al-title,
          .al-title-display {
            font-size:24px !important;
            line-height:30px !important;
          }
          .al-hero-copy .al-ws-name-input,
          .al-hero-copy .al-ws-path,
          .al-hero-copy button.al-ws-path--editable,
          .al-hero-copy .auth-ws-path,
          .al-hero-copy button.auth-ws-path--tap,
          .al-hero-copy button.auth-ws-path--edit,
          .al-ws-slash {
            font-size:22px !important;
            line-height:28px !important;
          }
          .al-btn,
          .al-input {
            height:48px;
          }
          .al-under-cta-switch.al-btn,
          .al-btn-primary.al-under-cta-switch {
            height:32px;
            min-height:32px;
            font-size:13px;
            padding:0 14px;
            letter-spacing:-0.01em;
          }
          .al-btn-google,
          .al-btn-apple,
          .al-btn-primary,
          .al-btn-ghost,
          .al-input,
          .al-input::placeholder {
            font-size:15px;
            letter-spacing:-0.015em;
            padding:0 16px;
          }
          .al-input {
            padding:0 18px;
          }
        }
`

export const AUTH_LANDING_STYLES = `${AUTH_LANDING_STYLES_BASE}${AUTH_OTP_STYLES}`
