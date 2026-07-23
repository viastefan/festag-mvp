import { AUTH_OTP_STYLES } from '@/components/auth/auth-otp-styles'
import {
  AUTH_CHROME_VARS_DARK,
  AUTH_CHROME_VARS_LIGHT,
  AUTH_INPUT_AUTOFILL_LIGHT,
  AUTH_INPUT_CARET_DARK,
  AUTH_INPUT_FG_DARK,
  AUTH_INPUT_FILL_DARK,
  AUTH_INPUT_FILL_DARK_FOCUS,
  AUTH_INPUT_PLACEHOLDER_DARK,
} from '@/components/auth/auth-chrome-tokens'

const AUTH_LANDING_STYLES_BASE = `
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .al-root {
          min-height:100dvh; width:100%;
          --al-panel-width:340px;
          --al-mobile-gutter:24px;
          --al-col-pad:max(24px, calc(50% - (var(--al-panel-width) / 2)));
          --al-accent:#5B647D;
          /* Hero H1 + workspace/username line + caret share one size (never diverge). */
          --al-hero-display-size:32px;
          --al-hero-display-lh:39px;
          --al-hero-caret-h:32px;
          --al-kb-shift:0px;
          /* Apple gray header muted — cool slate (path, secondary titles) */
          --al-text-muted:#8891a0;
          /* Placeholders — secondary gray (Apple/Linear-like), quieter than typed #1e1e20. */
          --al-text-muted-soft:#8e95a3;
          ${AUTH_CHROME_VARS_LIGHT}
          font-family: var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          -webkit-font-smoothing:antialiased;
          text-rendering:geometricPrecision;
          transition: opacity 0.12s ease;
          /* Soft gray canvas so white CTAs lift like Linear login. */
          background:#f7f8f8;
          color:#1e1e20;
          display:flex;
          flex-direction:column;
          overflow-x:hidden;
          border-radius:0 !important;
        }
        .al-root[data-theme="dark"] {
          ${AUTH_CHROME_VARS_DARK}
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
        /* Keep opaque canvas during route change — fade content only (no white flash). */
        .al-root.exiting { pointer-events:none; }
        .al-root.exiting .al-main,
        .al-root.exiting .al-header,
        .al-root.exiting .al-footer-meta,
        .al-root.exiting .al-content {
          opacity:0;
          transition: opacity 0.28s cubic-bezier(.32,.72,0,1);
        }
        /* Content-only enter — opacity only (transform would trap position:fixed footer). */
        @keyframes alPageEnter { from { opacity:0.85; } to { opacity:1; } }
        .al-root:not(.exiting):not(.al-panel-enter):not(.al-soft-enter) { animation: alPageEnter 0.12s cubic-bezier(.16,1,.3,1) both; }
        /* Login ↔ register soft handoff — content fade only, no root remount pulse. */
        .al-root.al-soft-enter:not(.exiting):not(.al-panel-enter) { animation: none; }
        /* Cross-panel (client ↔ Dev): soft opacity only — no motion hitch. */
        @keyframes alPanelEnter {
          from { opacity:0; }
          to { opacity:1; }
        }
        .al-root.al-panel-enter:not(.exiting) {
          animation: alPanelEnter 0.32s cubic-bezier(.16,1,.3,1) both;
        }

        .al-container {
          position:relative;
          flex:1;
          display:flex;
          flex-direction:column;
          min-height:100dvh;
          border-radius:0 !important;
          background:inherit;
        }

        .al-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:20px 24px 12px;
          flex-shrink:0;
          border-radius:0 !important;
          background:#f7f8f8;
        }
        .al-root[data-theme="dark"] .al-header {
          background:#000000;
        }
        .al-header-brand {
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
        }
        /* Brand mark sits in the same header row as docs / panel icons. */
        .al-wordmark {
          position:relative;
          z-index:1;
          flex-shrink:0;
          width:36px;
          height:36px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          margin:0;
          padding:0;
          color:#1e1e20;
          text-decoration:none;
          -webkit-tap-highlight-color:transparent;
        }
        .al-wordmark:hover { opacity:0.88; }
        .al-root[data-theme="dark"] .al-wordmark:hover { color:#f5f5f7; opacity:0.88; }
        .al-wordmark-mark {
          display:block;
          width:20px;
          height:22px;
          background-color:currentColor;
          -webkit-mask-image:url(/brand/festag-mark.png);
          -webkit-mask-size:contain;
          -webkit-mask-repeat:no-repeat;
          -webkit-mask-position:center;
          mask-image:url(/brand/festag-mark.png);
          mask-size:contain;
          mask-repeat:no-repeat;
          mask-position:center;
        }
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
        .al-panel-switch-trigger {
          width:36px;
          height:36px;
          flex-shrink:0;
          display:none;
          align-items:center;
          justify-content:center;
          border:0 !important;
          border-radius:999px;
          background:transparent !important;
          color:var(--al-text-muted);
          cursor:pointer;
          box-shadow:none !important;
          outline:none !important;
          -webkit-tap-highlight-color:transparent;
          -webkit-appearance:none;
          appearance:none;
          transition:color .15s ease;
        }
        .al-panel-switch-trigger:hover,
        .al-panel-switch-trigger:focus-visible {
          color:#1e1e20;
        }
        .al-root[data-theme="dark"] .al-panel-switch-trigger:hover,
        .al-root[data-theme="dark"] .al-panel-switch-trigger:focus-visible {
          color:#f5f5f7;
        }
        .al-account-hint {
          display:none;
          margin:14px 0 0;
          padding:0;
          width:100%;
          text-align:left;
          font-size:13.5px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:var(--ls-body, 0.021em);
          color:var(--al-text-muted);
        }
        .al-account-hint-link {
          display:inline;
          margin:0;
          padding:0;
          border:0;
          background:none;
          font:inherit;
          font-weight:400;
          color:#1e1e20;
          text-decoration:underline;
          text-underline-offset:2px;
          cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
        .al-root[data-theme="dark"] .al-account-hint-link {
          color:#f5f5f7;
        }
        .al-footer-center {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          flex-shrink:0;
        }
        .al-footer-mobile-bar {
          display:none;
        }
        .al-footer-links--desktop {
          display:flex;
        }
        .al-footer-legal--mobile {
          display:none;
        }
        .al-register-meta--desktop {
          display:flex;
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
          min-height:52px;
          padding:0 22px;
          border-radius:999px;
          background:var(--festag-btn-dark-bg, #ffffff);
          color:var(--festag-btn-dark-fg, #1e1e20);
          border:1px solid var(--festag-btn-dark-border, #e5e5e6);
          outline:none;
          text-decoration:none;
          font-family:inherit;
          font-size:15px;
          font-weight:400;
          letter-spacing:var(--ls-body, 0.021em);
          box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.04));
          transition:transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease;
        }
        .al-float-cta:hover {
          background:var(--festag-btn-dark-bg-hover, #fafafa);
          border-color:var(--festag-btn-dark-border-hover, rgba(30, 30, 32, 0.08));
          outline:none;
          box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.04));
          transform:translateY(-1px);
        }
        .al-float-cta:active {
          background:var(--festag-btn-dark-bg-active, #f5f5f6);
          box-shadow:var(--festag-btn-dark-shadow-active, none);
          transform:none;
        }
        .al-root[data-theme="dark"] .al-float-cta {
          background:var(--festag-btn-dark-bg, rgba(186,194,210,0.06));
          color:var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
          border:0;
          box-shadow:var(--festag-btn-dark-shadow, none);
        }
        .al-root[data-theme="dark"] .al-float-cta:hover {
          background:var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.09));
          border:0;
          box-shadow:var(--festag-btn-dark-shadow-hover, none);
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
          /* Full viewport chrome — mark left, actions right. */
          padding-left:32px;
          padding-right:32px;
          padding-top:24px;
          padding-bottom:12px;
        }
        @media (min-width: 769px) {
          .al-wordmark {
            width:36px;
            height:36px;
          }
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
        .al-hero-copy .al-ws-name-input,
        .al-hero-copy input.al-ws-name-input,
        .al-hero-copy .auth-expand-compact {
          font-size:var(--al-hero-display-size) !important;
          line-height:var(--al-hero-display-lh) !important;
          letter-spacing:-0.025em;
          font-weight:400 !important;
          width:100%;
          margin:0;
          text-align:left;
        }
        .al-hero-copy .auth-expand-idle-caret {
          font-size:var(--al-hero-display-size) !important;
          line-height:var(--al-hero-display-lh) !important;
          width:2px !important;
          max-width:2px;
          height:var(--al-hero-caret-h) !important;
          min-height:var(--al-hero-caret-h) !important;
          margin:0;
          align-self:center;
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
          font-size:32px;
          line-height:39px;
          overflow:visible;
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
        .al-ws-name-input,
        .al-hero-copy .al-ws-name-input,
        .al-hero-copy input.al-ws-name-input,
        .al-hero-copy .auth-expand-compact.al-ws-name-input {
          display:block;
          width:100%;
          border:0;
          outline:none;
          background:transparent;
          color:#1e1e20;
          padding:0;
          caret-color:#5B647D;
          font-family:inherit;
          font-size:var(--al-hero-display-size) !important;
          line-height:var(--al-hero-display-lh) !important;
          font-weight:400 !important;
          letter-spacing:-0.025em;
          box-shadow:none;
          -webkit-appearance:none;
          appearance:none;
          -webkit-text-size-adjust:100%;
          text-size-adjust:100%;
        }
        .al-ws-name-input::placeholder { color:transparent; }
        .al-ws-name-line:not(.has-value):not(:focus-within)::after {
          content:'';
          position:absolute;
          left:0;
          top:50%;
          transform:translateY(-50%);
          width:1px;
          height:var(--al-hero-caret-h);
          border-radius:0;
          background:#5B647D;
          animation: alCaretBlink 1.05s steps(1, end) infinite;
          pointer-events:none;
        }
        /* Idle-caret mode owns the blink — hide legacy empty ::after. */
        .al-ws-name-line.auth-expand-line--idle-caret::after,
        .al-ws-name-line.auth-expand-line--idle-caret:not(.has-value):not(:focus-within)::after {
          content:none !important;
          display:none !important;
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
          margin:16px 0 0;
          padding:0;
          font-size:13px;
          line-height:1.35;
          color:var(--al-text-muted);
          text-align:left;
          align-self:stretch;
          width:100%;
          box-sizing:border-box;
        }
        .al-ws-status--ok {
          display:inline-flex;
          align-items:center;
          gap:8px;
          color:#2E9B52;
        }
        .al-ws-status-check {
          flex-shrink:0;
          box-sizing:border-box;
          width:22px;
          height:22px;
          padding:4px;
          border-radius:7px;
          color:#2E9B52;
          background:rgba(46, 155, 82, 0.10);
        }
        .al-root[data-theme="dark"] .al-ws-status-check {
          color:#3dba66;
          background:rgba(61, 186, 102, 0.12);
        }
        .al-hero-copy > .al-ws-status {
          margin-left:0;
          margin-right:0;
          padding-left:0;
          padding-right:0;
          text-indent:0;
        }
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
        /* Mode / step exit — fade hero + form together (Anmelden ↔ Registrieren, SSO, Code). */
        .al-signin {
          transition:opacity 0.12s cubic-bezier(.16,1,.3,1), transform 0.12s cubic-bezier(.16,1,.3,1);
        }
        .al-signin.al-signin--out {
          opacity:0;
          transform:translateY(6px);
          pointer-events:none;
        }
        .al-root.al-soft-enter .al-signin:not(.al-signin--out) {
          animation: alContentIn 0.16s cubic-bezier(.16,1,.3,1) both;
        }
        .al-root.al-soft-enter .al-content:not(.animating) {
          animation: none;
        }
        @keyframes alContentIn {
          from { opacity:0; transform:translateY(6px); }
          to { opacity:1; transform:translateY(0); }
        }

        .al-signin-stack {
          display:flex;
          flex-direction:column;
          gap:16px;
          overflow:visible;
        }
        .al-method-group {
          display:flex;
          flex-direction:column;
          gap:10px;
          overflow:visible;
          /* Room for hairline + minimal bottom shadow so corners aren’t clipped. */
          padding:1px 1px 3px;
          margin:-1px -1px -3px;
        }
        .al-sso-group { margin-top:6px; overflow:visible; }
        /* Desktop: full OAuth labels. Mobile row uses .al-oauth-label-short. */
        .al-oauth-label-short { display:none; }

        .al-btn {
          width:100%;
          height:45px;
          border-radius:999px;
          border:0;
          outline:none;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          font-family:inherit;
          font-size:13.5px;
          font-weight:400;
          letter-spacing:var(--ls-body, 0.021em);
          cursor:pointer;
          padding:0 16px;
          white-space:nowrap;
          -webkit-appearance:none;
          appearance:none;
          background-clip:padding-box;
          transition:background .15s, border-color .15s, color .15s, transform .08s ease, opacity .15s, box-shadow .15s;
          -webkit-tap-highlight-color:transparent;
        }
        .al-btn:active:not(:disabled) { transform:scale(0.985); }
        .al-btn:disabled { opacity:.55; cursor:not-allowed; }

        /* Work-email nudge — quiet container, agreements-scale type. */
        .al-work-email-tip {
          margin:2px 0 0;
          padding:10px 14px;
          border-radius:14px;
          border:0;
          background:rgba(30, 30, 32, 0.03);
          text-align:left;
        }
        .al-work-email-tip-text {
          margin:0;
          font-size:11.5px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          color:var(--al-text-muted, #8891a0);
        }
        .al-work-email-tip-text strong {
          font-weight:600;
          color:#1e1e20;
        }

        /*
         * Mobile: shared slot under the email field.
         * Tip ↔ invalid error morph in place (height + color + copy).
         */
        .al-email-feedback-host {
          display:grid;
          grid-template-rows:0fr;
          transition:grid-template-rows 0.32s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .al-email-feedback-host.is-open {
          grid-template-rows:1fr;
        }
        .al-email-feedback-clip {
          overflow:hidden;
          min-height:0;
        }
        .al-email-feedback {
          margin:2px 0 0;
          padding:10px 14px;
          border-radius:14px;
          border:0;
          text-align:left;
          transition:
            background 0.28s ease,
            box-shadow 0.28s ease,
            color 0.28s ease;
        }
        .al-email-feedback--tip {
          background:rgba(30, 30, 32, 0.03);
          box-shadow:none;
          color:var(--al-text-muted, #8891a0);
        }
        .al-email-feedback--error {
          background:rgba(201, 52, 42, 0.06);
          box-shadow:inset 0 0 0 1px rgba(201, 52, 42, 0.10);
          color:#b42318;
        }
        .al-email-feedback-text {
          margin:0;
          font-size:11.5px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          color:inherit;
        }
        .al-email-feedback--tip .al-email-feedback-text strong {
          font-weight:600;
          color:#1e1e20;
        }
        .al-email-feedback-inner {
          animation:alEmailFeedbackSwap 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes alEmailFeedbackSwap {
          from { opacity:0; transform:translateY(4px); }
          to { opacity:1; transform:none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .al-email-feedback-host,
          .al-email-feedback {
            transition:none !important;
          }
          .al-email-feedback-inner {
            animation:none !important;
          }
        }

        /*
         * Light CTAs — soft hairline + idle lift.
         * Hover: minimal darker fill. Press: no shadow.
         */
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-under-cta-switch {
          background:var(--festag-btn-dark-bg, #ffffff) !important;
          color:#1e1e20 !important;
          border:1px solid rgba(30, 30, 32, 0.08) !important;
          outline:none !important;
          box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.04)) !important;
        }
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary:hover:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost:hover:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple:hover:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready:hover:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready:focus-visible:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-under-cta-switch:hover:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-under-cta-switch:focus-visible:not(:disabled) {
          background:var(--festag-btn-dark-bg-hover, #fafafa) !important;
          color:#1e1e20 !important;
          border-color:rgba(30, 30, 32, 0.08) !important;
          outline:none !important;
          box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.04)) !important;
        }
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary:active:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost:active:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple:active:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready:active:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-under-cta-switch:active:not(:disabled) {
          background:var(--festag-btn-dark-bg-active, #f5f5f6) !important;
          color:#1e1e20 !important;
          border-color:rgba(30, 30, 32, 0.08) !important;
          outline:none !important;
          box-shadow:none !important;
        }
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary:focus,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary:focus-visible,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost:focus,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost:focus-visible,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple:focus,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple:focus-visible,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready:focus,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready:focus-visible {
          outline:none !important;
          box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.04)) !important;
        }
        .al-btn-google {
          background:#5B647D;
          color:#ffffff;
          border:0;
          outline:none;
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .al-btn-google:hover:not(:disabled) {
          background:color-mix(in srgb, #5B647D 90%, #ffffff);
          border:0;
          outline:none;
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .al-btn-google:active:not(:disabled) {
          background:color-mix(in srgb, #5B647D 82%, #000000);
          border:0;
          outline:none;
          box-shadow:none;
        }
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-google {
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.04) !important;
        }
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-google:hover:not(:disabled) {
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.04) !important;
        }
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-google:active:not(:disabled) {
          box-shadow:none !important;
        }

        /* Kill global focus ring + focus box-shadow:none that flashes on press. */
        .al-root .al-input:focus,
        .al-root .al-input:focus-visible,
        .al-root .al-btn:focus,
        .al-root .al-btn:focus-visible,
        .al-root .al-btn-primary:focus,
        .al-root .al-btn-primary:focus-visible,
        .al-root .al-btn-ghost:focus,
        .al-root .al-btn-ghost:focus-visible,
        .al-root .al-btn-google:focus,
        .al-root .al-btn-google:focus-visible,
        .al-root .al-btn-apple:focus,
        .al-root .al-btn-apple:focus-visible {
          outline:none !important;
          outline-offset:0 !important;
        }
        .al-root .al-btn-primary:focus:not(:focus-visible),
        .al-root .al-btn-ghost:focus:not(:focus-visible),
        .al-root .al-btn-apple:focus:not(:focus-visible) {
          box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.04)) !important;
        }
        .al-root .al-btn-primary:active:not(:disabled),
        .al-root .al-btn-ghost:active:not(:disabled),
        .al-root .al-btn-apple:active:not(:disabled),
        .al-root .al-btn-google:active:not(:disabled) {
          box-shadow:var(--festag-btn-dark-shadow-active, none) !important;
        }

        .al-google-icon {
          width:18px;
          height:18px;
          flex-shrink:0;
          display:block;
          object-fit:contain;
        }
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
          /* Always 2px so focus doesn’t shift caret vs placeholder. */
          border:2px solid var(--festag-input-border, rgba(30,30,32,0.15)) !important;
          background-color:var(--festag-input-fill, transparent);
          background-image:none;
          color:#1e1e20;
          font-family:inherit;
          font-size:13.5px;
          font-weight:400;
          font-synthesis:none;
          letter-spacing:0;
          padding:0 14px;
          text-align:left;
          text-indent:0;
          outline:none !important;
          outline-offset:0 !important;
          caret-color:#1e1e20;
          box-shadow:none;
          -webkit-appearance:none;
          appearance:none;
          transition:border-color .2s ease;
        }
        .al-input::placeholder {
          color:var(--festag-input-placeholder, var(--al-text-muted-soft, #8e95a3));
          -webkit-text-fill-color:var(--festag-input-placeholder, var(--al-text-muted-soft, #8e95a3));
          font-family:inherit;
          font-weight:400;
          letter-spacing:0;
          opacity:1;
          text-align:left;
          text-indent:0;
        }
        /* Fake placeholder — same left edge as caret (native ::placeholder drifts on iOS). */
        .al-input-shell {
          position:relative;
          width:100%;
          display:block;
        }
        .al-input-fake-ph {
          position:absolute;
          left:14px;
          right:14px;
          top:50%;
          transform:translateY(-50%);
          margin:0;
          padding:0;
          border:0;
          pointer-events:none;
          z-index:1;
          font-family:inherit;
          font-size:inherit;
          font-weight:400;
          letter-spacing:0;
          line-height:1.2;
          text-align:left;
          color:var(--festag-input-placeholder, var(--al-text-muted-soft, #8e95a3));
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .al-input-shell .al-input {
          position:relative;
          z-index:2;
          background:transparent !important;
        }
        .al-input-shell.has-value .al-input-fake-ph {
          display:none;
        }
        /* Empty hover — quiet hairline lift. Focus or filled — accent stroke stays until cleared. */
        .al-input:hover,
        .al-input:active {
          background-color:var(--festag-input-fill-focus, transparent);
          background-image:none;
          border:2px solid var(--festag-input-border-hover, rgba(30,30,32,0.20)) !important;
          outline:none !important;
          outline-offset:0 !important;
          box-shadow:none;
        }
        .al-input:not(:placeholder-shown),
        .al-input:focus,
        .al-input:focus-visible {
          background-color:var(--festag-input-fill-focus, transparent);
          background-image:none;
          border:2px solid var(--festag-input-border-focus, #5B647D) !important;
          outline:none !important;
          outline-offset:0 !important;
          box-shadow:none;
        }
        /* Hard-lock light fills so portal/html dark tokens cannot bleach the field. */
        .al-root:not([data-theme="dark"]) .al-input {
          background:transparent !important;
          background-color:transparent !important;
          background-image:none !important;
          color:#1e1e20 !important;
          -webkit-text-fill-color:#1e1e20;
          caret-color:#1e1e20;
          border:2px solid var(--festag-input-border, rgba(30,30,32,0.15)) !important;
        }
        /* Placeholder must beat -webkit-text-fill-color on the input (else it looks black). */
        .al-root:not([data-theme="dark"]) .al-input::placeholder {
          color:var(--festag-input-placeholder, #8e95a3) !important;
          -webkit-text-fill-color:var(--festag-input-placeholder, #8e95a3) !important;
          opacity:1 !important;
        }
        .al-root:not([data-theme="dark"]) .al-input:hover,
        .al-root:not([data-theme="dark"]) .al-input:active {
          background:transparent !important;
          background-color:transparent !important;
          border-color:var(--festag-input-border-hover, rgba(30,30,32,0.20)) !important;
        }
        .al-root:not([data-theme="dark"]) .al-input:not(:placeholder-shown),
        .al-root:not([data-theme="dark"]) .al-input:focus,
        .al-root:not([data-theme="dark"]) .al-input:focus-visible {
          background:transparent !important;
          background-color:transparent !important;
          border-width:2px !important;
          border-color:var(--festag-input-border-focus, #5B647D) !important;
        }
        /* Chrome autofill — canvas-matched inset so the field stays non-gray. */
        .al-input:-webkit-autofill,
        .al-input:-webkit-autofill:hover,
        .al-input:-webkit-autofill:focus,
        .al-input:-webkit-autofill:active {
          -webkit-text-fill-color:#1e1e20 !important;
          caret-color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          background-color:transparent !important;
          background-image:none !important;
          border:var(--festag-input-border-width-focus, 2px) solid var(--festag-input-border-focus, #5B647D) !important;
          outline:none !important;
          -webkit-box-shadow:0 0 0 1000px ${AUTH_INPUT_AUTOFILL_LIGHT} inset !important;
          box-shadow:0 0 0 1000px ${AUTH_INPUT_AUTOFILL_LIGHT} inset !important;
          transition:background-color 9999s ease-out 0s;
        }
        .al-root:not([data-theme="dark"]) .al-input:-webkit-autofill,
        .al-root:not([data-theme="dark"]) .al-input:-webkit-autofill:hover,
        .al-root:not([data-theme="dark"]) .al-input:-webkit-autofill:active,
        .al-root:not([data-theme="dark"]) .al-input:-webkit-autofill:focus {
          background-color:transparent !important;
          border:var(--festag-input-border-width-focus, 2px) solid var(--festag-input-border-focus, #5B647D) !important;
          -webkit-box-shadow:0 0 0 1000px ${AUTH_INPUT_AUTOFILL_LIGHT} inset !important;
          box-shadow:0 0 0 1000px ${AUTH_INPUT_AUTOFILL_LIGHT} inset !important;
          -webkit-text-fill-color:#1e1e20 !important;
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

        /* Login: stacked calm help — sentence + recovery (not stretched space-between). */
        .al-login-aux {
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          gap:6px;
          width:100%;
          margin:16px 0 0;
          padding:0;
        }
        .al-login-aux-line {
          margin:0;
          padding:0;
          font-size:13.5px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:var(--ls-body, 0.021em);
          color:var(--al-text-muted);
        }
        .al-login-aux-action {
          display:inline;
          margin:0;
          padding:0;
          border:0;
          background:none;
          font:inherit;
          font-weight:400;
          color:#1e1e20;
          text-decoration:underline;
          text-underline-offset:2px;
          cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
        .al-login-aux-secondary {
          margin:0;
          padding:0;
          border:0;
          background:transparent;
          font:inherit;
          font-size:13px;
          font-weight:400;
          line-height:1.4;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          color:var(--al-text-muted);
          cursor:pointer;
          -webkit-tap-highlight-color:transparent;
          transition:color .18s ease;
        }
        .al-login-aux-secondary:hover,
        .al-login-aux-secondary:active {
          color:#1e1e20;
        }

        .al-code-help {
          margin:14px 0 0;
          padding:0;
          width:100%;
          font-size:13px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:var(--festag-tracking-small, 0.015em);
          color:var(--al-text-muted);
          text-align:left;
        }
        .al-code-help-action {
          display:inline;
          margin:0;
          padding:0;
          border:0;
          background:none;
          font:inherit;
          font-weight:400;
          color:#1e1e20;
          text-decoration:underline;
          text-underline-offset:2px;
          cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
        .al-code-help-action:disabled {
          opacity:.5;
          cursor:not-allowed;
          text-decoration:none;
        }

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
        /* Links share body muted gray — underline only, no brighter/darker words. */
        .al-agreements-text a {
          color:inherit;
          font-weight:400;
          text-decoration:none;
          border-bottom:1px solid color-mix(in srgb, currentColor 42%, transparent);
          transition:border-color .15s;
        }
        .al-agreements-text a:hover {
          border-bottom-color:currentColor;
        }
        /* Compact primary CTA for mode switch (Anmelden / Registrieren). */
        .al-under-cta-switch.al-btn {
          width:auto;
          height:32px;
          min-height:32px;
          padding:0 14px;
          font-size:13px;
          letter-spacing:var(--ls-body, 0.021em);
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
          z-index:40;
          display:flex !important;
          flex-direction:row;
          flex-wrap:nowrap;
          align-items:center;
          justify-content:flex-start;
          gap:10px;
          /* Full-bleed chrome like the header — not the narrow form column. */
          padding:16px 24px max(20px, env(safe-area-inset-bottom));
          margin:0;
          width:100%;
          max-width:none;
          text-align:left;
          pointer-events:none;
          background:transparent;
          border-top:none;
          box-sizing:border-box;
          visibility:visible;
          opacity:1;
        }
        .al-footer-meta > * {
          pointer-events:auto;
          flex-shrink:0;
        }
        .al-footer-links {
          display:flex;
          align-items:center;
          justify-content:flex-start;
          flex-wrap:nowrap;
          gap:8px;
          white-space:nowrap;
          min-width:0;
          flex:1 1 auto;
        }
        .al-footer-links .al-ssl-badge,
        .al-footer-links .al-ssl-badge span {
          white-space:nowrap;
        }
        /* Same 1px stroke as Dev|SSL — lives in .al-footer-links, pushed right with Anmelden. */
        .al-footer-sep--mode {
          margin-left:auto;
        }
        .al-footer-mode-switch {
          margin-left:0;
          white-space:nowrap;
          flex-shrink:0;
        }
        .al-footer-logo {
          display:none;
        }
        .al-theme-icon {
          width:36px;
          height:36px;
          flex-shrink:0;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:0 !important;
          border-radius:999px;
          background:transparent !important;
          color:var(--al-text-muted);
          cursor:pointer;
          box-shadow:none !important;
          outline:none !important;
          outline-offset:0 !important;
          transition:color .15s ease, transform .15s ease;
          -webkit-tap-highlight-color:transparent;
          -webkit-appearance:none;
          appearance:none;
        }
        .al-theme-icon:hover,
        .al-theme-icon:active,
        .al-theme-icon:focus,
        .al-theme-icon:focus-visible,
        .al-theme-icon:focus-within {
          color:#1e1e20;
          background:transparent !important;
          border:0 !important;
          box-shadow:none !important;
          outline:none !important;
          outline-offset:0 !important;
        }
        .al-theme-icon:active {
          transform:scale(0.96);
        }
        .al-root[data-theme="dark"] .al-theme-icon {
          color:var(--al-text-muted);
          background:transparent !important;
          border:0 !important;
          box-shadow:none !important;
          outline:none !important;
        }
        .al-root[data-theme="dark"] .al-theme-icon:hover,
        .al-root[data-theme="dark"] .al-theme-icon:active,
        .al-root[data-theme="dark"] .al-theme-icon:focus,
        .al-root[data-theme="dark"] .al-theme-icon:focus-visible {
          color:#f5f5f7;
          background:transparent !important;
          border:0 !important;
          box-shadow:none !important;
          outline:none !important;
        }
        /* Desktop: theme in footer next to Dev Zugang. Mobile: theme in header next to docs. */
        .al-theme-icon--header { display:none; }
        .al-theme-icon--footer { display:inline-flex; }
        .al-footer-sep {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          width:1px;
          height:11px;
          padding:0;
          margin:0;
          border:0;
          background:#c7c7cc;
          color:transparent;
          font-size:0;
          line-height:0;
          overflow:hidden;
          user-select:none;
        }
        .al-root[data-theme="dark"] .al-footer-sep {
          background:rgba(245,245,247,0.28);
          color:transparent;
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
          margin:0;
          padding:11px 14px;
          background:rgba(201, 52, 42, 0.06);
          border:0;
          border-radius:14px;
          box-shadow:inset 0 0 0 1px rgba(201, 52, 42, 0.10);
          color:#b42318;
          font-size:13px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:-0.011em;
          text-align:left;
          animation: alErrorIn .28s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes alErrorIn {
          from { opacity:0; transform:translateY(-3px); }
          to { opacity:1; transform:translateY(0); }
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
          font-weight:400; letter-spacing:var(--ls-body, 0.021em);
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
        .al-support-actions .al-btn { height:42px; font-size:14px; }
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
          background:#000000;
          color:#f5f5f7;
          --al-text-muted:rgba(245, 245, 247, 0.55);
          --al-text-muted-soft:rgba(245, 245, 247, 0.40);
          ${AUTH_CHROME_VARS_DARK}
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
        .al-root[data-theme="dark"] .al-login-aux-line,
        .al-root[data-theme="dark"] .al-login-aux-secondary,
        .al-root[data-theme="dark"] .al-code-help,
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
          color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK});
          caret-color:var(--festag-input-caret, ${AUTH_INPUT_CARET_DARK});
        }
        .al-root[data-theme="dark"] .al-ws-name-line:not(.has-value):not(:focus-within)::after {
          background:var(--al-text-muted, rgba(245, 245, 247, 0.55));
        }
        .al-root[data-theme="dark"] .al-title,
        .al-root[data-theme="dark"] .al-flow-info strong,
        .al-root[data-theme="dark"] .al-legal a,
        .al-root[data-theme="dark"] .al-signup-alt a,
        .al-root[data-theme="dark"] .al-support-note:hover,
        .al-root[data-theme="dark"] .al-support-note:active,
        .al-root[data-theme="dark"] .al-support-note button,
        .al-root[data-theme="dark"] .al-login-aux-action,
        .al-root[data-theme="dark"] .al-login-aux-secondary:hover,
        .al-root[data-theme="dark"] .al-login-aux-secondary:active,
        .al-root[data-theme="dark"] .al-code-help-action,
        .al-root[data-theme="dark"] .al-subtitle-strong {
          color:#f5f5f7;
        }
        /* Ghost/primary CTAs — soft slate + minimal white hairline. Idle stays quiet. */
        .al-root[data-theme="dark"] .al-btn-primary,
        .al-root[data-theme="dark"] .al-btn-ghost {
          background:var(--festag-btn-dark-bg, rgba(186,194,210,0.06));
          color:var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
          border:1px solid var(--festag-btn-dark-border, rgba(255,255,255,0.06)) !important;
          box-shadow:var(--festag-btn-dark-shadow, none);
        }
        /* Ready — solid white primary after a valid email (Sana-style). */
        .al-root[data-theme="dark"] .al-btn-primary.al-btn-primary--ready {
          background:#ffffff;
          color:#1e1e20;
          border:1px solid transparent !important;
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.18);
        }
        /* Sana dark hover: foreground-95 — cool soft white, not gray wash. */
        .al-root[data-theme="dark"] .al-btn-primary.al-btn-primary--ready:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary.al-btn-primary--ready:focus-visible:not(:disabled) {
          background:#d9dfe6;
          color:#1e1e20;
          border-color:transparent !important;
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.16);
        }
        .al-root[data-theme="dark"] .al-btn-primary.al-btn-primary--ready:active:not(:disabled) {
          background:#cdd3db;
          color:#1e1e20;
          border-color:transparent !important;
          box-shadow:0 1px 1px rgba(0, 0, 0, 0.14);
        }
        .al-root[data-theme="dark"] .al-work-email-tip {
          border:1px solid rgba(255, 255, 255, 0.08);
          background:rgba(186, 194, 210, 0.05);
        }
        .al-root[data-theme="dark"] .al-work-email-tip-text {
          color:var(--al-text-muted, rgba(245, 245, 247, 0.55));
        }
        .al-root[data-theme="dark"] .al-work-email-tip-text strong {
          color:#f5f5f7;
          font-weight:600;
        }
        .al-root[data-theme="dark"] .al-email-feedback--tip {
          border:1px solid rgba(255, 255, 255, 0.08);
          background:rgba(186, 194, 210, 0.05);
          color:var(--al-text-muted, rgba(245, 245, 247, 0.55));
        }
        .al-root[data-theme="dark"] .al-email-feedback--tip .al-email-feedback-text strong {
          color:#f5f5f7;
          font-weight:600;
        }
        .al-root[data-theme="dark"] .al-email-feedback--error {
          background:rgba(255, 107, 97, 0.10);
          box-shadow:inset 0 0 0 1px rgba(255, 107, 97, 0.16);
          color:#ff9a93;
        }
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch,
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:focus-visible:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:active:not(:disabled) {
          background:var(--festag-btn-dark-bg, rgba(186,194,210,0.06));
          color:var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
          border:1px solid var(--festag-btn-dark-border, rgba(255,255,255,0.06)) !important;
          box-shadow:var(--festag-btn-dark-shadow, none);
        }
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:focus-visible:not(:disabled) {
          background:var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.09));
          color:var(--festag-btn-dark-fg-hover, #f5f5f7);
          border-color:var(--festag-btn-dark-border-hover, rgba(255,255,255,0.09)) !important;
          box-shadow:var(--festag-btn-dark-shadow-hover, none);
        }
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:active:not(:disabled) {
          background:var(--festag-btn-dark-bg-active, rgba(186,194,210,0.12));
          color:var(--festag-btn-dark-fg-active, #f5f5f7);
          border-color:var(--festag-btn-dark-border-active, rgba(255,255,255,0.07)) !important;
          box-shadow:var(--festag-btn-dark-shadow-active, none);
        }
        .al-root[data-theme="dark"] .al-btn-google {
          background:#5B647D;
          color:#ffffff;
          border:1px solid var(--festag-btn-dark-border, rgba(255,255,255,0.06)) !important;
          box-shadow:var(--festag-btn-dark-shadow, none);
        }
        .al-root[data-theme="dark"] .al-btn-apple {
          background:var(--festag-btn-dark-bg, rgba(186,194,210,0.06));
          color:#f5f5f7;
          border:1px solid var(--festag-btn-dark-border, rgba(255,255,255,0.06)) !important;
          box-shadow:var(--festag-btn-dark-shadow, none);
        }
        .al-root[data-theme="dark"] .al-btn-primary:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary:focus-visible:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-ghost:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-ghost:focus-visible:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-apple:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-apple:focus-visible:not(:disabled) {
          background:var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.09));
          color:var(--festag-btn-dark-fg-hover, #f5f5f7);
          border-color:var(--festag-btn-dark-border-hover, rgba(255,255,255,0.09)) !important;
          box-shadow:var(--festag-btn-dark-shadow-hover, none);
        }
        .al-root[data-theme="dark"] .al-btn-primary:active:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-ghost:active:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-apple:active:not(:disabled) {
          background:var(--festag-btn-dark-bg-active, rgba(186,194,210,0.12));
          color:var(--festag-btn-dark-fg-active, #f5f5f7);
          border-color:var(--festag-btn-dark-border-active, rgba(255,255,255,0.07)) !important;
          box-shadow:var(--festag-btn-dark-shadow-active, none);
        }
        .al-root[data-theme="dark"] .al-btn-google:hover:not(:disabled) {
          background:color-mix(in srgb, #5B647D 88%, #ffffff);
          border-color:var(--festag-btn-dark-border-hover, rgba(255,255,255,0.09)) !important;
          box-shadow:var(--festag-btn-dark-shadow-hover, none);
        }
        .al-root[data-theme="dark"] .al-divider { color:var(--al-text-muted-soft); }
        .al-root[data-theme="dark"] .al-divider::before,
        .al-root[data-theme="dark"] .al-divider::after {
          background:rgba(186,194,210,0.18);
        }
        /* Dark auth inputs — transparent fill + Sana-style outer hairline stroke. */
        .al-root[data-theme="dark"] .al-input {
          background:transparent !important;
          background-color:transparent !important;
          background-image:none !important;
          color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK}) !important;
          -webkit-text-fill-color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK});
          border:2px solid var(--festag-input-border, rgba(255,255,255,0.15)) !important;
          box-shadow:none;
          caret-color:var(--festag-input-caret, ${AUTH_INPUT_CARET_DARK});
          transition:border-color .2s ease, background-color .15s;
        }
        .al-root[data-theme="dark"] .al-input::placeholder {
          color:var(--festag-input-placeholder, ${AUTH_INPUT_PLACEHOLDER_DARK}) !important;
          -webkit-text-fill-color:var(--festag-input-placeholder, ${AUTH_INPUT_PLACEHOLDER_DARK}) !important;
          opacity:1 !important;
        }
        .al-root[data-theme="dark"] .al-input-fake-ph {
          color:var(--festag-input-placeholder, ${AUTH_INPUT_PLACEHOLDER_DARK});
        }
        .al-root[data-theme="dark"] .al-input:hover,
        .al-root[data-theme="dark"] .al-input:active {
          background:transparent !important;
          background-color:transparent !important;
          background-image:none !important;
          border:2px solid var(--festag-input-border-hover, rgba(255,255,255,0.20)) !important;
          box-shadow:none;
          outline:none;
        }
        .al-root[data-theme="dark"] .al-input:not(:placeholder-shown),
        .al-root[data-theme="dark"] .al-input:focus,
        .al-root[data-theme="dark"] .al-input:focus-visible {
          background:transparent !important;
          background-color:transparent !important;
          background-image:none !important;
          border:2px solid var(--festag-input-border-focus, #5B647D) !important;
          box-shadow:none;
          outline:none;
        }
        /* Dark autofill — soft slate inset + keep outer stroke (Chrome needs opaque paint). */
        .al-root[data-theme="dark"] .al-input:-webkit-autofill,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:hover,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:focus,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:active,
        html[data-theme="dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill,
        html[data-theme="dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:hover,
        html[data-theme="dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:focus,
        html[data-theme="dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:active,
        html[data-theme="classic-dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill,
        html[data-theme="classic-dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:hover,
        html[data-theme="classic-dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:focus,
        html[data-theme="classic-dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:active {
          -webkit-text-fill-color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK}) !important;
          caret-color:var(--festag-input-caret, ${AUTH_INPUT_CARET_DARK}) !important;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          background-color:transparent !important;
          background-image:none !important;
          border:var(--festag-input-border-width-focus, 2px) solid var(--festag-input-border-focus, #5B647D) !important;
          -webkit-box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_DARK} inset !important;
          box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_DARK} inset !important;
          transition:background-color 9999s ease-out 0s;
        }
        .al-root[data-theme="dark"] .al-input:-webkit-autofill,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:hover,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:active,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:focus {
          border-width:var(--festag-input-border-width-focus, 2px) !important;
          border-color:var(--festag-input-border-focus, #5B647D) !important;
          -webkit-box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_DARK_FOCUS} inset !important;
          box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_DARK_FOCUS} inset !important;
        }
        @media (max-width: 768px) {
          .al-root[data-theme="dark"] .al-input:hover,
          .al-root[data-theme="dark"] .al-input:active {
            background:transparent !important;
            background-color:transparent !important;
            background-image:none !important;
            border:1px solid var(--festag-input-border-hover, rgba(255,255,255,0.20)) !important;
            box-shadow:none;
          }
          .al-root[data-theme="dark"] .al-input:not(:placeholder-shown),
          .al-root[data-theme="dark"] .al-input:focus,
          .al-root[data-theme="dark"] .al-input:focus-visible {
            background:transparent !important;
            background-color:transparent !important;
            background-image:none !important;
            border:var(--festag-input-border-width-focus, 2px) solid var(--festag-input-border-focus, #5B647D) !important;
            box-shadow:none;
          }
        }
        .al-root[data-theme="dark"] .al-error {
          background:rgba(255, 107, 97, 0.10);
          box-shadow:inset 0 0 0 1px rgba(255, 107, 97, 0.16);
          color:#ff9a93;
          border:0;
        }
        .al-root[data-theme="dark"] .al-support-backdrop { background:rgba(0,0,0,.62); }
        .al-root[data-theme="dark"] .al-support-modal {
          background:var(--festag-black-popup, #121214);
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
          background:rgba(186,194,210,0.26);
        }
        .al-root[data-theme="dark"] .al-support-field input,
        .al-root[data-theme="dark"] .al-support-field textarea {
          background:#101014;
          color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK});
          -webkit-text-fill-color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK});
          caret-color:var(--festag-input-caret, ${AUTH_INPUT_CARET_DARK});
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
          /* Desktop: buttons 48px; inputs stay compact — never inherit mobile heights. */
          .al-btn {
            height:45px;
            font-size:13.5px;
            border-radius:999px;
          }
          .al-input {
            height:45px;
            font-size:13.5px;
            border-radius:999px;
          }
          .al-root--centered .al-header {
            /* Keep mark + docs/actions on the viewport edge. */
            padding-left:32px;
            padding-right:32px;
            padding-top:24px;
            padding-bottom:12px;
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
            padding-left:var(--al-col-pad);
            padding-right:var(--al-col-pad);
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
            /* No own fill — must not read as a separate panel vs .al-root canvas. */
            background:transparent;
          }
          .al-root[data-theme="dark"] .al-desktop-left {
            background:transparent;
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
            background:var(--festag-black-content, #0c0c0e);
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
          .al-signup-alt,
          .al-work-email-tip-text {
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
            padding:18px 32px max(24px, env(safe-area-inset-bottom));
            width:100%;
            max-width:none;
            display:flex;
            flex-direction:row;
            align-items:center;
            justify-content:center;
            gap:10px;
            border-top:none;
            background:transparent;
            text-align:center;
          }
          .al-root[data-theme="dark"] .al-footer-meta {
            background:transparent;
          }
          .al-footer-links {
            display:flex;
            align-items:center;
            justify-content:center;
            flex-wrap:nowrap;
            gap:8px;
            white-space:nowrap;
            flex:0 0 auto;
            min-width:0;
          }
          .al-footer-sep--mode {
            margin-left:0;
          }
          .al-footer-mode-switch {
            margin-left:0;
            white-space:nowrap;
            flex-shrink:0;
            display:inline-flex !important;
          }
          .al-mode-switch--desktop-only {
            display:inline-flex !important;
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
          .al-btn {
            height:45px;
            font-size:14px;
          }
          .al-input {
            height:45px;
            font-size:14px;
          }
          .al-agreements--under-form {
            margin-top:12px;
            gap:8px;
          }
          .al-agreements-text,
          .al-signup-alt,
          .al-work-email-tip-text {
            font-size:12px;
          }
          .al-footer-meta {
            padding:14px 32px max(18px, env(safe-area-inset-bottom));
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
            height:45px;
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
          /* Pin auth to the viewport — iOS must not leave a blank scrolled page after keyboard. */
          .al-root[data-auth-mode="login"],
          .al-root[data-auth-mode="signup"] {
            position:fixed;
            inset:0;
            width:100%;
            height:100%;
            max-height:100%;
            min-height:0;
            overflow:hidden;
            overscroll-behavior:none;
          }
          .al-root[data-auth-mode="login"] .al-desktop-left,
          .al-root[data-auth-mode="signup"] .al-desktop-left {
            transform:translate3d(0, calc(-1 * var(--al-kb-shift, 0px)), 0);
            transition:transform 0.22s cubic-bezier(.16,1,.3,1);
            will-change:transform;
          }
          @media (prefers-reduced-motion: reduce) {
            .al-root[data-auth-mode="login"] .al-desktop-left,
            .al-root[data-auth-mode="signup"] .al-desktop-left {
              transition:none;
            }
          }
          .al-root,
          .al-container {
            height:100dvh;
            max-height:100dvh;
            min-height:0;
            overflow:hidden;
            background:#f7f8f8;
            border-radius:0 !important;
          }
          /* Same OLED canvas as desktop / Dev auth. */
          .al-root[data-theme="dark"],
          .al-root[data-theme="dark"] .al-container {
            background:#000000;
            color:#f5f5f7;
          }
          .al-container {
            position:relative;
          }
          .al-header {
            /* One chrome row: mark left, docs/panel right — shared vertical center.
             * Match content gutter (same x as hero input / Google CTA). */
            padding:max(10px, calc(env(safe-area-inset-top, 0px) + 8px)) var(--al-mobile-gutter) 10px;
            min-height:44px;
            flex-wrap:nowrap;
            flex-shrink:0;
            width:100%;
            max-width:none;
            box-sizing:border-box;
            /* Solid canvas fill — never transparent (avoids white rounded corners). */
            background:#f7f8f8;
            border-radius:0 !important;
            justify-content:space-between;
            align-items:center;
            gap:12px;
          }
          /* Beat .al-root--centered .al-header { 32px } so chrome lines up with form. */
          .al-root--centered .al-header {
            padding-left:var(--al-mobile-gutter);
            padding-right:var(--al-mobile-gutter);
            padding-top:max(10px, calc(env(safe-area-inset-top, 0px) + 8px));
            padding-bottom:10px;
          }
          .al-root[data-theme="dark"] .al-header {
            background:#000000;
          }
          /* Mark glyph on the left edge of the gutter — not optically inset in the hit box. */
          .al-wordmark {
            width:36px;
            height:36px;
            padding:0;
            justify-content:flex-start;
          }
          .al-wordmark-mark {
            width:20px;
            height:22px;
            margin:0;
          }
          .al-header-actions {
            display:flex !important;
            margin-left:0;
            margin-right:0;
            gap:4px;
            align-items:center;
            flex-shrink:0;
            visibility:visible !important;
            opacity:1 !important;
          }
          .al-header-actions .auth-docs,
          .al-header-actions .auth-docs-trigger {
            display:inline-flex !important;
            visibility:visible !important;
            opacity:1 !important;
            color:#6e6e73 !important;
          }
          .al-root[data-theme="dark"] .al-header-actions .auth-docs-trigger {
            color:rgba(245,245,247,0.55) !important;
          }
          .al-header-actions .auth-docs-trigger,
          .al-theme-icon--header,
          .al-panel-switch-trigger {
            width:36px !important;
            height:36px !important;
            min-width:36px !important;
            min-height:36px !important;
            max-width:36px !important;
            max-height:36px !important;
          }
          .al-panel-switch-trigger {
            display:inline-flex !important;
            color:#6e6e73 !important;
          }
          .al-root[data-theme="dark"] .al-panel-switch-trigger {
            color:rgba(245,245,247,0.55) !important;
          }
          .al-header-nav,
          .al-mobile-menu { display:none !important; }
          .al-theme-icon--header { display:none !important; }
          .al-theme-icon--footer { display:inline-flex !important; }
          .al-main {
            flex:1;
            min-height:0;
            overflow:hidden;
            display:flex;
            flex-direction:column;
            align-items:stretch;
            justify-content:center;
            padding:8px var(--al-col-pad) max(88px, calc(64px + env(safe-area-inset-bottom)));
          }
          .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:12px;
          }
          /* Mobile auth: hero top with calm header clearance; CTAs below. */
          .al-root[data-auth-mode="login"] .al-main,
          .al-root[data-auth-mode="signup"] .al-main {
            justify-content:stretch;
            padding-top:clamp(40px, 7vh, 72px);
            padding-bottom:max(96px, calc(76px + env(safe-area-inset-bottom)));
            overflow:hidden;
            overscroll-behavior:none;
            touch-action:manipulation;
          }
          .al-root[data-auth-mode="login"] .al-container:has(.al-agreements--mobile-dock) .al-main,
          .al-root[data-auth-mode="signup"] .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:max(96px, calc(76px + env(safe-area-inset-bottom)));
          }
          .al-root[data-auth-mode="login"] .al-footer-meta,
          .al-root[data-auth-mode="signup"] .al-footer-meta {
            display:flex !important;
          }
          .al-root[data-auth-mode="login"] .al-register-meta,
          .al-root[data-auth-mode="signup"] .al-register-meta,
          .al-register-meta--desktop {
            display:none !important;
          }
          .al-footer-links--desktop,
          .al-footer-center--desktop {
            display:none !important;
          }
          .al-footer-mobile-bar {
            display:flex !important;
            align-items:center;
            justify-content:space-between;
            width:100%;
            gap:12px;
            box-sizing:border-box;
          }
          .al-footer-legal--mobile {
            display:inline-flex !important;
            align-items:center;
            justify-content:flex-start;
            gap:8px;
            width:auto;
            max-width:calc(100% - 44px);
            flex:0 1 auto;
            min-width:0;
            white-space:nowrap;
            margin:0;
            margin-right:auto;
          }
          .al-footer-legal--mobile a {
            font-size:11px;
            font-weight:400;
            letter-spacing:var(--festag-tracking-small, 0.015em);
            line-height:1.55;
            color:var(--al-text-muted);
            text-decoration:none;
          }
          .al-footer-legal--mobile a:hover {
            opacity:0.75;
          }
          .al-footer-legal--mobile .al-footer-sep {
            flex-shrink:0;
          }
          .al-theme-icon--mobile-end {
            flex:0 0 auto;
            margin:0;
            margin-left:auto;
          }
          .al-footer-center:not(.al-footer-center--desktop) {
            display:none !important;
          }
          .al-account-hint {
            display:block !important;
          }
          /* Registrieren / Anmelden mode links — no underline on mobile. */
          .al-login-aux-action,
          .al-account-hint-link {
            text-decoration:none !important;
          }
          .al-root[data-auth-mode="login"] .al-desktop-stage,
          .al-root[data-auth-mode="login"] .al-desktop-stage--centered,
          .al-root[data-auth-mode="login"] .al-desktop-left,
          .al-root[data-auth-mode="login"] .al-mobile-sheet,
          .al-root[data-auth-mode="login"] .al-sheet-body,
          .al-root[data-auth-mode="login"] .al-signin,
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
          .al-root[data-auth-mode="login"] .al-sheet-body,
          .al-root[data-auth-mode="signup"] .al-sheet-body {
            overflow:hidden;
            overscroll-behavior:none;
            -webkit-overflow-scrolling:auto;
          }
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
          .al-root[data-auth-mode="login"] .al-agreements--mobile-dock,
          .al-root[data-auth-mode="signup"] .al-agreements--mobile-dock {
            padding:6px 0 2px;
            margin:0;
          }
          .al-agreements--mobile-dock .al-agreements-text {
            display:none !important;
          }
          .al-dev-link--desktop-only,
          .al-footer-sep--desktop-only,
          .al-mode-switch--desktop-only {
            display:none !important;
          }
          .al-root[data-auth-mode="login"] .al-footer-meta,
          .al-root[data-auth-mode="signup"] .al-footer-meta {
            display:flex !important;
            visibility:visible !important;
            opacity:1 !important;
            z-index:40;
            flex-direction:column;
            justify-content:center;
            align-items:stretch;
            gap:0;
            padding:10px var(--al-mobile-gutter) max(14px, env(safe-area-inset-bottom));
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
            margin-inline:0;
            margin-right:auto;
          }
          .al-root[data-auth-mode="login"] .al-mobile-sheet,
          .al-root[data-auth-mode="signup"] .al-mobile-sheet {
            overflow:hidden;
            max-height:100%;
            max-width:100%;
          }
          .al-root[data-theme="dark"] .al-mobile-sheet {
            background:transparent;
            box-shadow:none;
          }
          .al-root[data-auth-mode="login"] .al-signin,
          .al-root[data-auth-mode="signup"] .al-signin {
            display:flex;
            flex-direction:column;
            text-align:left;
          }
          .al-root[data-auth-mode="login"] .al-signin-head,
          .al-root[data-auth-mode="signup"] .al-signin-head {
            flex:0 0 auto;
            /* Title + username sit a fixed 24px above the Google CTA — not centered into it. */
            min-height:calc(var(--al-hero-display-lh, 42px) * 2);
            margin-bottom:24px !important;
            padding-top:0;
            width:100%;
            align-items:flex-start;
            align-self:stretch;
            text-align:left;
            box-sizing:border-box;
          }
          .al-root[data-auth-mode="login"] .al-hero-copy,
          .al-root[data-auth-mode="signup"] .al-hero-copy {
            width:100%;
            max-width:100%;
            margin-inline:0;
            align-self:stretch;
            align-items:flex-start;
            text-align:left;
          }
          .al-root[data-auth-mode="login"],
          .al-root[data-auth-mode="signup"] {
            --al-hero-display-size:36px;
            --al-hero-display-lh:42px;
            --al-hero-caret-h:36px;
          }
          .al-root[data-auth-mode="login"] .al-hero-copy .al-title.al-title-display,
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-title.al-title-display {
            font-size:var(--al-hero-display-size) !important;
            line-height:var(--al-hero-display-lh) !important;
            letter-spacing:-0.028em;
          }
          /* Name / path under H1 — same size as H1 (never smaller). */
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-ws-name-input,
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-ws-path,
          .al-root[data-auth-mode="signup"] .al-hero-copy button.al-ws-path--editable,
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-ws-path .al-ws-slash,
          .al-root[data-auth-mode="signup"] .al-hero-copy button.al-ws-path--editable .al-ws-slash,
          .al-root[data-auth-mode="signup"] .al-hero-copy .auth-ws-path,
          .al-root[data-auth-mode="signup"] .al-hero-copy button.auth-ws-path--tap,
          .al-root[data-auth-mode="signup"] .al-hero-copy button.auth-ws-path--edit,
          .al-root[data-auth-mode="login"] .al-hero-copy .auth-ws-path,
          .al-root[data-auth-mode="login"] .al-hero-copy button.auth-ws-path--tap,
          .al-root[data-auth-mode="login"] .al-hero-copy .auth-expand-slash,
          .al-root[data-auth-mode="signup"] .al-hero-copy .auth-expand-slash,
          .al-root[data-auth-mode="login"] .al-hero-copy .auth-expand-compact,
          .al-root[data-auth-mode="signup"] .al-hero-copy .auth-expand-compact {
            font-size:var(--al-hero-display-size) !important;
            line-height:var(--al-hero-display-lh) !important;
          }
          .al-root[data-auth-mode="login"] .al-hero-copy .auth-expand-idle-caret,
          .al-root[data-auth-mode="signup"] .al-hero-copy .auth-expand-idle-caret {
            font-size:var(--al-hero-display-size) !important;
            line-height:var(--al-hero-display-lh) !important;
            width:2px !important;
            max-width:2px;
            height:var(--al-hero-caret-h) !important;
            min-height:var(--al-hero-caret-h) !important;
            align-self:center;
          }
          .al-root[data-auth-mode="login"] .al-hero-copy .auth-ws-path,
          .al-root[data-auth-mode="login"] .al-hero-copy button.auth-ws-path--tap,
          .al-root[data-auth-mode="signup"] .al-hero-copy .auth-ws-path,
          .al-root[data-auth-mode="signup"] .al-hero-copy button.auth-ws-path--tap,
          .al-root[data-auth-mode="signup"] .al-hero-copy button.auth-ws-path--edit,
          .al-root[data-auth-mode="login"] .al-hero-copy .auth-expand-slash,
          .al-root[data-auth-mode="signup"] .al-hero-copy .auth-expand-slash {
            color:#5c6370 !important;
          }
          .al-root[data-theme="dark"][data-auth-mode="login"] .al-hero-copy .auth-ws-path,
          .al-root[data-theme="dark"][data-auth-mode="login"] .al-hero-copy button.auth-ws-path--tap,
          .al-root[data-theme="dark"][data-auth-mode="signup"] .al-hero-copy .auth-ws-path,
          .al-root[data-theme="dark"][data-auth-mode="signup"] .al-hero-copy button.auth-ws-path--tap,
          .al-root[data-theme="dark"][data-auth-mode="signup"] .al-hero-copy button.auth-ws-path--edit,
          .al-root[data-theme="dark"][data-auth-mode="login"] .al-hero-copy .auth-expand-slash,
          .al-root[data-theme="dark"][data-auth-mode="signup"] .al-hero-copy .auth-expand-slash {
            color:var(--al-text-muted, rgba(245, 245, 247, 0.55)) !important;
          }
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-ws-status {
            margin-top:14px;
            margin-bottom:0;
            margin-left:0 !important;
            margin-right:0;
            padding-left:0 !important;
            padding-right:0;
            text-indent:0;
            align-self:stretch;
            width:100%;
            text-align:left;
            position:relative;
            z-index:1;
            flex:0 0 auto;
          }
          .al-root[data-auth-mode="signup"] .al-signin-head:has(.al-ws-status) {
            min-height:calc(var(--al-hero-display-lh, 40px) * 2 + 32px);
            margin-bottom:clamp(18px, 2.8vh, 28px);
          }
          .al-root[data-auth-mode="login"] .al-content,
          .al-root[data-auth-mode="signup"] .al-content {
            flex:0 0 auto;
            min-height:0;
            display:flex;
            flex-direction:column;
            /* Keep Google directly under title/username (24px via .al-signin-head). */
            justify-content:flex-start;
            padding-top:0;
            padding-bottom:4px;
            position:relative;
            z-index:0;
          }
          .al-root[data-auth-mode="signup"]:has(.al-ws-status) .al-content {
            justify-content:flex-start;
            padding-top:2px;
          }
          .al-root[data-auth-mode="login"] .al-content > .al-signin-stack,
          .al-root[data-auth-mode="signup"] .al-content > .al-signin-stack {
            flex:0 0 auto;
            width:100%;
          }
          .al-root[data-auth-mode="login"] .al-register-meta,
          .al-root[data-auth-mode="signup"] .al-register-meta {
            display:flex;
            flex-direction:row;
            flex-wrap:nowrap;
            align-items:center;
            justify-content:space-between;
            gap:8px;
            flex:0 0 auto;
            width:100%;
            min-width:0;
            margin-top:0;
            padding:10px 0 max(12px, env(safe-area-inset-bottom, 0px));
            box-sizing:border-box;
          }
          .al-root[data-auth-mode="login"] .al-register-meta .al-footer-sep,
          .al-root[data-auth-mode="signup"] .al-register-meta .al-footer-sep {
            display:inline-flex;
            margin:0 auto;
          }
          .al-root[data-auth-mode="login"] .al-register-meta .al-under-cta-switch,
          .al-root[data-auth-mode="signup"] .al-register-meta .al-under-cta-switch {
            margin:0;
            flex:0 1 auto;
            width:auto;
            max-width:46%;
            min-width:0;
            height:30px;
            min-height:30px;
            padding:0 10px;
            font-size:12px;
            letter-spacing:var(--ls-body, 0.021em);
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          }
          .al-root[data-auth-mode="login"] .al-register-meta .al-ssl-badge,
          .al-root[data-auth-mode="signup"] .al-register-meta .al-ssl-badge {
            font-size:10px;
            line-height:1.3;
            margin-left:auto;
            flex:1 1 auto;
            min-width:0;
            max-width:100%;
            overflow:hidden;
          }
          .al-root[data-auth-mode="login"] .al-register-meta .al-ssl-badge span,
          .al-root[data-auth-mode="signup"] .al-register-meta .al-ssl-badge span {
            display:block;
            min-width:0;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          }
          .al-sheet-body {
            flex:0 1 auto;
            min-height:0;
            overflow:hidden;
            overscroll-behavior:none;
            -webkit-overflow-scrolling:auto;
            display:flex;
            flex-direction:column;
            width:100%;
            max-width:100%;
            padding:0;
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
          /* Mobile: H1 + name/path share --al-hero-display-* (same size, never smaller). */
          .al-root {
            --al-hero-display-size:36px;
            --al-hero-display-lh:42px;
            --al-hero-caret-h:36px;
          }
          h1.al-title,
          h1.al-title.al-title-display,
          .al-title,
          .al-title-nowrap,
          .al-hero-copy .al-title.al-title-display,
          .al-title-display {
            font-size:var(--al-hero-display-size) !important;
            line-height:var(--al-hero-display-lh) !important;
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
          .al-hero-copy .auth-expand-slash,
          .al-hero-copy .auth-expand-compact,
          .al-ws-slash {
            font-size:var(--al-hero-display-size) !important;
            line-height:var(--al-hero-display-lh) !important;
            letter-spacing:-0.025em;
            font-weight:400;
            text-align:left;
          }
          .al-hero-copy .auth-expand-idle-caret {
            font-size:var(--al-hero-display-size) !important;
            line-height:var(--al-hero-display-lh) !important;
            width:2px !important;
            max-width:2px;
            height:var(--al-hero-caret-h) !important;
            min-height:var(--al-hero-caret-h) !important;
            align-self:center;
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
          .al-ws-name-line,
          .al-hero-copy .auth-expand-line {
            min-height:var(--al-hero-display-lh);
            font-size:var(--al-hero-display-size) !important;
            line-height:var(--al-hero-display-lh) !important;
            overflow:visible;
          }
          .al-ws-name-line:not(.has-value):not(:focus-within)::after {
            top:50%;
            transform:translateY(-50%);
            height:var(--al-hero-caret-h);
            width:1px;
            border-radius:0;
          }
          .al-ws-name-line--login:not(.has-value):not(:focus-within)::after {
            left:22px;
          }
          .al-ws-status {
            font-size:13px;
            margin-top:14px;
            margin-left:0;
            margin-right:0;
            padding-left:0;
            align-self:flex-start;
            text-align:left;
          }
          .al-ws-status--ok {
            display:inline-flex;
            align-items:center;
            gap:8px;
          }
          .al-ws-status-check {
            width:22px;
            height:22px;
            padding:4px;
            border-radius:7px;
            background:rgba(46, 155, 82, 0.10);
            animation:al-ws-check-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .al-root[data-theme="dark"] .al-ws-status-check {
            background:rgba(61, 186, 102, 0.12);
          }
          @keyframes al-ws-check-in {
            from {
              opacity:0;
              transform:scale(0.35);
            }
            to {
              opacity:1;
              transform:scale(1);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .al-ws-status-check {
              animation:none;
            }
          }
          .al-signin-stack { gap:14px; }
          .al-content { transition: opacity .18s ease, transform .18s ease; }
          .al-agreements-text,
          .al-signup-alt,
          .al-work-email-tip-text,
          .al-email-feedback-text {
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
            flex-direction:column;
            gap:0;
            padding:10px var(--al-mobile-gutter) max(14px, env(safe-area-inset-bottom));
            justify-content:center;
            text-align:center;
            align-items:stretch;
          }
          .al-footer-links {
            gap:6px 8px;
            justify-content:center;
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
            gap:16px;
          }
          .al-method-group { gap:12px; }
          /* Mobile controls — 52px tap targets; inputs match buttons. */
          .al-btn {
            height:52px;
            min-height:52px;
            font-size:15px;
            font-weight:400;
            border-radius:999px;
            padding:0 18px;
            letter-spacing:var(--ls-body, 0.021em);
            gap:10px;
            white-space:nowrap;
          }
          /* Keep mode-switch compact vs full-width mobile CTAs. */
          .al-under-cta-switch.al-btn {
            width:auto;
            height:36px;
            min-height:36px;
            padding:0 14px;
            font-size:13px;
            letter-spacing:var(--ls-body, 0.021em);
          }
          .al-btn-primary.al-under-cta-switch {
            font-size:13px;
            letter-spacing:var(--ls-body, 0.021em);
          }
          /* Light: Google keeps a minimal lift; primary/Apple stay flat. */
          .al-root:not([data-theme="dark"]) .al-btn-google {
            box-shadow:0 1px 2px rgba(0, 0, 0, 0.04) !important;
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
          .al-btn-primary,
          .al-btn-ghost {
            font-size:15px;
            letter-spacing:-0.015em;
          }
          .al-input,
          .al-input::placeholder {
            font-size:15px;
            letter-spacing:0;
            text-align:left;
            text-indent:0;
          }
          .al-input-fake-ph {
            left:14px;
            font-size:15px;
            letter-spacing:0;
          }
          /* Caret + fake placeholder share the same left inset. */
          .al-root[data-auth-mode="login"] .al-input,
          .al-root[data-auth-mode="signup"] .al-input {
            text-align:left !important;
            text-indent:0 !important;
            letter-spacing:0 !important;
            padding-left:14px !important;
            padding-right:14px !important;
          }
          .al-root[data-auth-mode="login"] .al-input::placeholder,
          .al-root[data-auth-mode="signup"] .al-input::placeholder {
            text-align:left !important;
            text-indent:0 !important;
            letter-spacing:0 !important;
          }
          .al-google-icon,
          .al-apple-icon {
            width:16px;
            height:16px;
          }
          /* Light mobile — soft hairline; hover darker; press no shadow. */
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary,
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost,
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple,
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready {
            background:var(--festag-btn-dark-bg, #ffffff) !important;
            color:#1e1e20 !important;
            border:1px solid rgba(30, 30, 32, 0.08) !important;
            box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.04)) !important;
          }
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary:hover:not(:disabled),
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost:hover:not(:disabled),
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple:hover:not(:disabled) {
            background:var(--festag-btn-dark-bg-hover, #fafafa) !important;
            border-color:rgba(30, 30, 32, 0.08) !important;
            box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.04)) !important;
          }
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary:active:not(:disabled),
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost:active:not(:disabled),
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple:active:not(:disabled) {
            background:var(--festag-btn-dark-bg-active, #f5f5f6) !important;
            border-color:rgba(30, 30, 32, 0.08) !important;
            box-shadow:none !important;
          }
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-google {
            box-shadow:0 1px 2px rgba(0, 0, 0, 0.04) !important;
          }
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-google:hover:not(:disabled) {
            box-shadow:0 1px 2px rgba(0, 0, 0, 0.04) !important;
          }
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-google:active:not(:disabled) {
            box-shadow:none !important;
          }
          /* Dark mobile — soft slate + minimal white hairline. */
          .al-root[data-theme="dark"] .al-btn.al-btn-primary,
          .al-root[data-theme="dark"] .al-btn.al-btn-ghost,
          .al-root[data-theme="dark"] .al-btn.al-btn-apple,
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-under-cta-switch {
            background:var(--festag-btn-dark-bg, rgba(186,194,210,0.06)) !important;
            color:rgba(245,245,247,0.88) !important;
            border:1px solid rgba(255,255,255,0.06) !important;
            box-shadow:var(--festag-btn-dark-shadow, none) !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-btn-primary--ready {
            background:#ffffff !important;
            color:#1e1e20 !important;
            border:1px solid transparent !important;
            box-shadow:0 1px 2px rgba(0, 0, 0, 0.18) !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-primary:hover:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-ghost:hover:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-apple:hover:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-under-cta-switch:hover:not(:disabled) {
            background:rgba(186,194,210,0.09) !important;
            color:rgba(245,245,247,0.96) !important;
            border-color:rgba(255,255,255,0.09) !important;
            box-shadow:none !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-btn-primary--ready:hover:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-btn-primary--ready:focus-visible:not(:disabled) {
            background:#d9dfe6 !important;
            color:#1e1e20 !important;
            border-color:transparent !important;
            box-shadow:0 1px 2px rgba(0, 0, 0, 0.16) !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-primary:active:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-ghost:active:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-apple:active:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-under-cta-switch:active:not(:disabled) {
            background:rgba(186,194,210,0.12) !important;
            color:#f5f5f7 !important;
            border-color:rgba(255,255,255,0.07) !important;
            box-shadow:none !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-btn-primary--ready:active:not(:disabled) {
            background:#cdd3db !important;
            color:#1e1e20 !important;
            border-color:transparent !important;
            box-shadow:0 1px 1px rgba(0, 0, 0, 0.14) !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-google {
            background:#5B647D !important;
            color:#ffffff !important;
            border:1px solid rgba(255,255,255,0.06) !important;
            box-shadow:none !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-google:hover:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-google:active:not(:disabled) {
            background:color-mix(in srgb, #5B647D 88%, #ffffff) !important;
            border-color:rgba(255,255,255,0.09) !important;
            box-shadow:none !important;
          }
          .al-input {
            height:52px;
            min-height:52px;
            font-size:15px;
            border-radius:999px;
            padding:0 14px;
            letter-spacing:0;
            text-align:left;
            text-indent:0;
          }
          .al-input::placeholder {
            letter-spacing:0;
            text-align:left;
            text-indent:0;
          }
          .al-input-fake-ph {
            left:14px;
            font-size:15px;
          }
          textarea.al-input {
            height:auto;
            min-height:96px;
            border-radius:18px;
            padding:14px 18px;
            line-height:1.55;
            resize:none !important;
            overflow-y:hidden;
            field-sizing:content;
            max-block-size:320px;
          }
          .al-root:not([data-theme="dark"]) .al-input:hover,
          .al-root:not([data-theme="dark"]) .al-input:active {
            background:transparent !important;
            background-color:transparent !important;
            background-image:none;
            border:2px solid var(--festag-input-border-hover, rgba(30,30,32,0.20)) !important;
          }
          .al-root:not([data-theme="dark"]) .al-input:not(:placeholder-shown),
          .al-root:not([data-theme="dark"]) .al-input:focus,
          .al-root:not([data-theme="dark"]) .al-input:focus-visible {
            background:transparent !important;
            background-color:transparent !important;
            background-image:none;
            border:2px solid var(--festag-input-border-focus, #5B647D) !important;
          }
          .al-root:not([data-theme="dark"]) .al-input {
            background:transparent !important;
            background-color:transparent !important;
            border:2px solid var(--festag-input-border, rgba(30,30,32,0.15)) !important;
          }
          .al-root[data-theme="dark"] .al-input,
          .al-root[data-theme="dark"] .al-input:hover,
          .al-root[data-theme="dark"] .al-input:active {
            background:transparent !important;
            background-color:transparent !important;
            background-image:none !important;
            border:2px solid var(--festag-input-border, rgba(255,255,255,0.15)) !important;
            box-shadow:none !important;
          }
          .al-root[data-theme="dark"] .al-input:hover,
          .al-root[data-theme="dark"] .al-input:active {
            border-color:var(--festag-input-border-hover, rgba(255,255,255,0.20)) !important;
          }
          .al-root[data-theme="dark"] .al-input:not(:placeholder-shown),
          .al-root[data-theme="dark"] .al-input:focus,
          .al-root[data-theme="dark"] .al-input:focus-visible {
            background:transparent !important;
            background-color:transparent !important;
            background-image:none !important;
            border:var(--festag-input-border-width-focus, 2px) solid var(--festag-input-border-focus, #5B647D) !important;
            box-shadow:none !important;
          }
          .al-input:-webkit-autofill,
          .al-input:-webkit-autofill:hover,
          .al-input:-webkit-autofill:focus,
          .al-input:-webkit-autofill:active {
            background-color:transparent !important;
            background-image:none !important;
            -webkit-box-shadow:0 0 0 1000px ${AUTH_INPUT_AUTOFILL_LIGHT} inset !important;
            box-shadow:0 0 0 1000px ${AUTH_INPUT_AUTOFILL_LIGHT} inset !important;
          }
          .al-root[data-theme="dark"] .al-input:-webkit-autofill,
          .al-root[data-theme="dark"] .al-input:-webkit-autofill:hover,
          .al-root[data-theme="dark"] .al-input:-webkit-autofill:focus,
          .al-root[data-theme="dark"] .al-input:-webkit-autofill:active,
          html[data-theme="dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill,
          html[data-theme="dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:hover,
          html[data-theme="dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:focus,
          html[data-theme="dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:active,
          html[data-theme="classic-dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill,
          html[data-theme="classic-dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:hover,
          html[data-theme="classic-dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:focus,
          html[data-theme="classic-dark"] .al-root[data-theme="dark"] .al-input:-webkit-autofill:active {
            -webkit-text-fill-color:var(--festag-input-fg, ${AUTH_INPUT_FG_DARK}) !important;
            caret-color:var(--festag-input-caret, ${AUTH_INPUT_CARET_DARK}) !important;
            background-color:transparent !important;
            background-image:none !important;
            border:var(--festag-input-border-width-focus, 2px) solid var(--festag-input-border-focus, #5B647D) !important;
            -webkit-box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_DARK} inset !important;
            box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_DARK} inset !important;
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
          .al-signup-alt,
          .al-work-email-tip-text {
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
            z-index:40;
            flex-direction:row;
            align-items:center;
            justify-content:flex-start;
            gap:8px;
            padding:10px var(--al-mobile-gutter) max(14px, env(safe-area-inset-bottom));
            margin:0;
            width:100%;
            max-width:none;
            border-top:none;
            background:transparent;
            text-align:left;
            display:flex !important;
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
            flex-wrap:nowrap;
            gap:6px 8px;
            max-width:100%;
            text-align:left;
            white-space:nowrap;
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
            padding-top:max(18px, env(safe-area-inset-top, 0px));
            padding-bottom:100px;
          }
          .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:10px;
          }
          .al-root[data-auth-mode="login"] .al-main,
          .al-root[data-auth-mode="signup"] .al-main,
          .al-root[data-auth-mode="login"] .al-container:has(.al-agreements--mobile-dock) .al-main,
          .al-root[data-auth-mode="signup"] .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-top:clamp(28px, 5vh, 48px);
            padding-bottom:max(88px, calc(68px + env(safe-area-inset-bottom)));
          }
          .al-root,
          .al-root[data-auth-mode="login"],
          .al-root[data-auth-mode="signup"] {
            --al-hero-display-size:30px;
            --al-hero-display-lh:36px;
            --al-hero-caret-h:30px;
          }
          .al-hero-copy .al-title.al-title-display,
          .al-title,
          .al-title-nowrap,
          .al-title-display {
            font-size:var(--al-hero-display-size) !important;
            line-height:var(--al-hero-display-lh) !important;
          }
          .al-subtitle,
          .al-t1,
          .al-flow-info { font-size:14px; }
          .al-btn,
          .al-input {
            height:50px;
            min-height:50px;
            font-size:15px;
            border-radius:999px;
          }
          .al-under-cta-switch.al-btn,
          .al-btn-primary.al-under-cta-switch {
            height:34px;
            min-height:34px;
            font-size:13px;
            padding:0 14px;
            letter-spacing:var(--ls-body, 0.021em);
          }
          .al-input {
            box-shadow:none !important;
          }
          .al-signin-stack { gap:12px; }
          .al-signin-head { margin-bottom:clamp(18px, 3vh, 28px); }
          .al-agreements-text,
          .al-signup-alt,
          .al-work-email-tip-text { font-size:11.5px; }
        }

        @media (max-width: 768px) and (max-height: 670px) {
          .al-main {
            padding-top:max(14px, env(safe-area-inset-top, 0px));
            padding-bottom:92px;
          }
          .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:8px;
          }
          .al-root[data-auth-mode="login"] .al-main,
          .al-root[data-auth-mode="signup"] .al-main,
          .al-root[data-auth-mode="login"] .al-container:has(.al-agreements--mobile-dock) .al-main,
          .al-root[data-auth-mode="signup"] .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-top:clamp(22px, 4vh, 36px);
            padding-bottom:max(84px, calc(64px + env(safe-area-inset-bottom)));
          }
          .al-root,
          .al-root[data-auth-mode="login"],
          .al-root[data-auth-mode="signup"] {
            --al-hero-display-size:28px;
            --al-hero-display-lh:34px;
            --al-hero-caret-h:28px;
          }
          .al-hero-copy .al-title.al-title-display,
          .al-title,
          .al-title-nowrap,
          .al-title-display {
            font-size:var(--al-hero-display-size) !important;
            line-height:var(--al-hero-display-lh) !important;
          }
          .al-subtitle,
          .al-t1,
          .al-flow-info { font-size:13px; }
          .al-btn,
          .al-input {
            height:48px;
            min-height:48px;
            font-size:15px;
          }
          .al-under-cta-switch.al-btn,
          .al-btn-primary.al-under-cta-switch {
            height:34px;
            min-height:34px;
            font-size:13px;
            padding:0 14px;
            letter-spacing:var(--ls-body, 0.021em);
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
          .al-footer-meta {
            padding:8px var(--al-mobile-gutter) max(12px, env(safe-area-inset-bottom));
            gap:8px;
            justify-content:flex-start;
          }
          .al-hint { display:none; }
        }

        @media (max-width: 380px) {
          /* Keep 24px gutters — do not tighten below mobile gutter */
          .al-root,
          .al-root[data-auth-mode="login"],
          .al-root[data-auth-mode="signup"] {
            --al-hero-display-size:28px;
            --al-hero-display-lh:34px;
            --al-hero-caret-h:28px;
          }
          .al-hero-copy .al-title.al-title-display,
          .al-title,
          .al-title-display {
            font-size:var(--al-hero-display-size) !important;
            line-height:var(--al-hero-display-lh) !important;
          }
          .al-btn,
          .al-input {
            height:50px;
          }
          .al-under-cta-switch.al-btn,
          .al-btn-primary.al-under-cta-switch {
            height:32px;
            min-height:32px;
            font-size:13px;
            padding:0 14px;
            letter-spacing:var(--ls-body, 0.021em);
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
