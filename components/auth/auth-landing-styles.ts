import { AUTH_OTP_STYLES } from '@/components/auth/auth-otp-styles'
import {
  AUTH_CHROME_VARS_DARK,
  AUTH_CHROME_VARS_LIGHT,
  AUTH_INPUT_FILL_DARK,
  AUTH_INPUT_FILL_DARK_FOCUS,
  AUTH_INPUT_FILL_LIGHT,
  AUTH_INPUT_FILL_LIGHT_FOCUS,
} from '@/components/auth/auth-chrome-tokens'

const AUTH_LANDING_STYLES_BASE = `
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        .al-root {
          min-height:100dvh; width:100%;
          --al-panel-width:340px;
          --al-mobile-gutter:24px;
          --al-col-pad:max(24px, calc(50% - (var(--al-panel-width) / 2)));
          --al-accent:#5B647D;
          /* Apple gray header muted — cool slate (path, secondary titles) */
          --al-text-muted:#8891a0;
          --al-text-muted-soft:#b0b7c4;
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
        /* Keep opaque during route change — opacity:0 flashed white under dark auth. */
        .al-root.exiting { pointer-events:none; }
        /* Content-only enter — opacity only (transform would trap position:fixed footer). */
        @keyframes alPageEnter { from { opacity:0.85; } to { opacity:1; } }
        .al-root:not(.exiting):not(.al-panel-enter):not(.al-soft-enter) { animation: alPageEnter 0.12s cubic-bezier(.16,1,.3,1) both; }
        /* Login ↔ register soft handoff — content fade only, no root remount pulse. */
        .al-root.al-soft-enter:not(.exiting):not(.al-panel-enter) { animation: none; }
        /* Cross-panel (client ↔ Dev): slightly longer cue that you switched portal. */
        @keyframes alPanelEnter {
          from { opacity:0.88; }
          to { opacity:1; }
        }
        .al-root.al-panel-enter:not(.exiting) {
          animation: alPanelEnter 0.18s cubic-bezier(.16,1,.3,1) both;
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
          font-size:17px;
          font-weight:400 !important; /* Aeonik Regular */
          letter-spacing:-0.015em;
          color:#1e1e20;
          /* >1 so Aeonik descenders (g/y/p) are not clipped */
          line-height:1.2;
          /* Optical nudge right — Aeonik cap “F” reads left-heavy in the nav grid. */
          padding:2px 0 3px 2px;
          text-decoration:none;
          max-width:min(72vw, 320px);
          overflow:visible;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .al-wordmark:hover { color:#1e1e20; font-weight:400 !important; }
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
          background:var(--festag-btn-dark-bg, #ffffff);
          color:var(--festag-btn-dark-fg, #1e1e20);
          border:1px solid var(--festag-btn-dark-border, #e5e5e6);
          outline:none;
          text-decoration:none;
          font-family:inherit;
          font-size:15px;
          font-weight:400;
          letter-spacing:-0.01em;
          box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.05));
          transition:transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease;
        }
        .al-float-cta:hover {
          background:var(--festag-btn-dark-bg-hover, #fafafa);
          border-color:var(--festag-btn-dark-border-hover, #d8d8da);
          outline:none;
          box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.07));
          transform:translateY(-1px);
        }
        .al-root[data-theme="dark"] .al-float-cta {
          background:var(--festag-btn-dark-bg, rgba(186,194,210,0.08));
          color:var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
          border:0;
          box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.35));
        }
        .al-root[data-theme="dark"] .al-float-cta:hover {
          background:var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.16));
          border:0;
          box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.42));
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
          /* Full viewport chrome — logo left, docs right (not the form column). */
          padding-left:24px;
          padding-right:24px;
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
        .al-hero-copy > .al-ws-status {
          margin-left:0;
          margin-right:0;
          padding-left:0;
          padding-right:0;
          text-indent:0;
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
          height:42px;
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
          letter-spacing:-0.01em;
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

        /*
         * Light CTAs — soft hairline only (very light), soft bottom lift.
         * Dark CTAs — fill only, never a stroke (see dark block below).
         */
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready,
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-under-cta-switch {
          background:#ffffff !important;
          color:#1e1e20 !important;
          border:1px solid rgba(30, 30, 32, 0.08) !important;
          outline:none !important;
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.04) !important;
        }
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary:hover:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost:hover:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple:hover:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready:hover:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready:focus-visible:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-under-cta-switch:hover:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-under-cta-switch:focus-visible:not(:disabled) {
          background:#fafafa !important;
          color:#1e1e20 !important;
          border-color:rgba(30, 30, 32, 0.12) !important;
          outline:none !important;
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.06) !important;
        }
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary:active:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost:active:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple:active:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready:active:not(:disabled),
        .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-under-cta-switch:active:not(:disabled) {
          background:#f4f4f5 !important;
          color:#1e1e20 !important;
          border-color:rgba(30, 30, 32, 0.12) !important;
          outline:none !important;
          box-shadow:0 1px 1px rgba(0, 0, 0, 0.03) !important;
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
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.04) !important;
        }
        .al-btn-google {
          background:#5B647D;
          color:#ffffff;
          border:0;
          outline:none;
          box-shadow:none;
        }
        .al-btn-google:hover:not(:disabled) {
          background:color-mix(in srgb, #5B647D 90%, #ffffff);
          border:0;
          outline:none;
          box-shadow:none;
        }
        .al-btn-google:active:not(:disabled) {
          background:color-mix(in srgb, #5B647D 82%, #000000);
          border:0;
          outline:none;
          box-shadow:none;
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
          box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.05)) !important;
        }
        .al-root .al-btn-primary:active:not(:disabled),
        .al-root .al-btn-ghost:active:not(:disabled),
        .al-root .al-btn-apple:active:not(:disabled) {
          box-shadow:var(--festag-btn-dark-shadow-active, 0 1px 1px rgba(0, 0, 0, 0.04)) !important;
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
          height:42px;
          border-radius:999px;
          border:0 !important;
          background-color:var(--festag-input-fill, #EEEEF0);
          background-image:none;
          color:#1e1e20;
          font-family:inherit;
          font-size:13.5px;
          font-weight:400;
          font-synthesis:none;
          letter-spacing:-0.01em;
          padding:0 16px;
          outline:none !important;
          outline-offset:0 !important;
          caret-color:#1e1e20;
          box-shadow:none;
          transition:background-color .15s;
        }
        .al-input::placeholder {
          color:var(--al-text-muted-soft);
          font-family:inherit;
          font-weight:400;
        }
        /* Hover / focus / filled — fill step only, never a stroke. */
        .al-input:hover,
        .al-input:focus,
        .al-input:focus-visible,
        .al-input:active,
        .al-input:not(:placeholder-shown) {
          background-color:var(--festag-input-fill-focus, #E4E4E9);
          background-image:none;
          border:0 !important;
          outline:none !important;
          outline-offset:0 !important;
          box-shadow:none;
        }
        /* Hard-lock light fills so portal/html dark tokens cannot bleach the field. */
        .al-root:not([data-theme="dark"]) .al-input {
          background-color:${AUTH_INPUT_FILL_LIGHT} !important;
          background-image:none !important;
          color:#1e1e20 !important;
          -webkit-text-fill-color:#1e1e20;
          caret-color:#1e1e20;
        }
        .al-root:not([data-theme="dark"]) .al-input:hover,
        .al-root:not([data-theme="dark"]) .al-input:focus,
        .al-root:not([data-theme="dark"]) .al-input:focus-visible,
        .al-root:not([data-theme="dark"]) .al-input:active,
        .al-root:not([data-theme="dark"]) .al-input:not(:placeholder-shown) {
          background-color:${AUTH_INPUT_FILL_LIGHT_FOCUS} !important;
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
          background-color:var(--festag-input-fill, ${AUTH_INPUT_FILL_LIGHT}) !important;
          background-image:none !important;
          border:0 !important;
          outline:none !important;
          -webkit-box-shadow:0 0 0 1000px var(--festag-input-fill, ${AUTH_INPUT_FILL_LIGHT}) inset !important;
          box-shadow:0 0 0 1000px var(--festag-input-fill, ${AUTH_INPUT_FILL_LIGHT}) inset !important;
          transition:background-color 9999s ease-out 0s;
        }
        .al-root:not([data-theme="dark"]) .al-input:-webkit-autofill,
        .al-root:not([data-theme="dark"]) .al-input:-webkit-autofill:hover,
        .al-root:not([data-theme="dark"]) .al-input:-webkit-autofill:focus,
        .al-root:not([data-theme="dark"]) .al-input:-webkit-autofill:active {
          background-color:${AUTH_INPUT_FILL_LIGHT} !important;
          -webkit-box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_LIGHT} inset !important;
          box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_LIGHT} inset !important;
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
          width:28px;
          height:28px;
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
          padding:0;
          background:transparent;
          border:0;
          border-radius:0;
          color:#c9342a;
          font-size:13.5px;
          font-weight:400;
          line-height:1.45;
          letter-spacing:-0.012em;
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
          background:#0f0f11;
          color:#f5f5f7;
          --al-text-muted:#b8c0d0;
          --al-text-muted-soft:rgba(184,192,208,0.68);
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
        /* Ghost/primary CTAs — soft slate fill only (no border ring on dark). Idle stays quiet. */
        .al-root[data-theme="dark"] .al-btn-primary,
        .al-root[data-theme="dark"] .al-btn-ghost {
          background:var(--festag-btn-dark-bg, rgba(186,194,210,0.08));
          color:var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
          border:0 !important;
          box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.35));
        }
        /* Ready — a clear step lighter after valid input. */
        .al-root[data-theme="dark"] .al-btn-primary.al-btn-primary--ready {
          background:var(--festag-btn-dark-ready-bg, rgba(186,194,210,0.28));
          color:#f5f5f7;
          border:0 !important;
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.35);
        }
        .al-root[data-theme="dark"] .al-btn-primary.al-btn-primary--ready:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary.al-btn-primary--ready:focus-visible:not(:disabled) {
          background:var(--festag-btn-dark-ready-bg-hover, rgba(186,194,210,0.36));
          color:#f5f5f7;
          border:0 !important;
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.42);
        }
        .al-root[data-theme="dark"] .al-btn-primary.al-btn-primary--ready:active:not(:disabled) {
          background:var(--festag-btn-dark-ready-bg-active, rgba(186,194,210,0.42));
          color:#f5f5f7;
          border:0 !important;
          box-shadow:0 1px 1px rgba(0, 0, 0, 0.28);
        }
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch,
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:focus-visible:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:active:not(:disabled) {
          background:var(--festag-btn-dark-bg, rgba(186,194,210,0.08));
          color:var(--festag-btn-dark-fg, rgba(245,245,247,0.88));
          border:0 !important;
          box-shadow:var(--festag-btn-dark-shadow, 0 1px 2px rgba(0, 0, 0, 0.35));
        }
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:focus-visible:not(:disabled) {
          background:var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.16));
          color:var(--festag-btn-dark-fg-hover, #f5f5f7);
          border:0 !important;
          box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.42));
        }
        .al-root[data-theme="dark"] .al-btn-primary.al-under-cta-switch:active:not(:disabled) {
          background:var(--festag-btn-dark-bg-active, rgba(186,194,210,0.22));
          color:var(--festag-btn-dark-fg-active, #f5f5f7);
          border:0 !important;
          box-shadow:var(--festag-btn-dark-shadow-active, 0 1px 1px rgba(0, 0, 0, 0.28));
        }
        .al-root[data-theme="dark"] .al-btn-google {
          background:#5B647D;
          color:#ffffff;
          border:0 !important;
          box-shadow:none;
        }
        .al-root[data-theme="dark"] .al-btn-apple {
          background:rgba(186,194,210,0.08);
          color:#f5f5f7;
          border:0 !important;
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.35);
        }
        .al-root[data-theme="dark"] .al-btn-primary:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-primary:focus-visible:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-ghost:hover:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-ghost:focus-visible:not(:disabled) {
          background:var(--festag-btn-dark-bg-hover, rgba(186,194,210,0.16));
          color:var(--festag-btn-dark-fg-hover, #f5f5f7);
          border:0 !important;
          box-shadow:var(--festag-btn-dark-shadow-hover, 0 1px 2px rgba(0, 0, 0, 0.42));
        }
        .al-root[data-theme="dark"] .al-btn-primary:active:not(:disabled),
        .al-root[data-theme="dark"] .al-btn-ghost:active:not(:disabled) {
          background:var(--festag-btn-dark-bg-active, rgba(186,194,210,0.22));
          color:var(--festag-btn-dark-fg-active, #f5f5f7);
          border:0 !important;
          box-shadow:var(--festag-btn-dark-shadow-active, 0 1px 1px rgba(0, 0, 0, 0.28));
        }
        .al-root[data-theme="dark"] .al-btn-google:hover:not(:disabled) {
          background:color-mix(in srgb, #5B647D 88%, #ffffff);
          border:0 !important;
          box-shadow:none;
        }
        .al-root[data-theme="dark"] .al-btn-apple:hover:not(:disabled) {
          background:rgba(186,194,210,0.28);
          border:0 !important;
          color:#f5f5f7;
          box-shadow:0 1px 2px rgba(0, 0, 0, 0.42);
        }
        .al-root[data-theme="dark"] .al-divider { color:var(--al-text-muted-soft); }
        .al-root[data-theme="dark"] .al-divider::before,
        .al-root[data-theme="dark"] .al-divider::after {
          background:rgba(186,194,210,0.22);
        }
        /* Dark auth inputs — solid slate so idle / filled / autofill never vanish on OLED. */
        .al-root[data-theme="dark"] .al-input {
          background:${AUTH_INPUT_FILL_DARK} !important;
          background-color:${AUTH_INPUT_FILL_DARK} !important;
          background-image:none !important;
          color:#f5f5f7 !important;
          -webkit-text-fill-color:#f5f5f7;
          border:0 !important;
          border-color:transparent;
          box-shadow:none;
          caret-color:#f5f5f7;
        }
        .al-root[data-theme="dark"] .al-input::placeholder { color:rgba(245,245,247,0.40); }
        .al-root[data-theme="dark"] .al-input:hover,
        .al-root[data-theme="dark"] .al-input:focus,
        .al-root[data-theme="dark"] .al-input:focus-visible,
        .al-root[data-theme="dark"] .al-input:active,
        .al-root[data-theme="dark"] .al-input:not(:placeholder-shown) {
          background:${AUTH_INPUT_FILL_DARK_FOCUS} !important;
          background-color:${AUTH_INPUT_FILL_DARK_FOCUS} !important;
          background-image:none !important;
          border:0 !important;
          border-color:transparent;
          box-shadow:none;
          outline:none;
        }
        /* Dark autofill — visible slate (never #0f1011 ≈ canvas). */
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
          -webkit-text-fill-color:#f5f5f7 !important;
          caret-color:#f5f5f7 !important;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          font-weight:400;
          background-color:${AUTH_INPUT_FILL_DARK} !important;
          background-image:none !important;
          border:0 !important;
          border-color:transparent;
          -webkit-box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_DARK} inset !important;
          box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_DARK} inset !important;
          transition:background-color 9999s ease-out 0s;
        }
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:hover,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:focus,
        .al-root[data-theme="dark"] .al-input:-webkit-autofill:active {
          background-color:${AUTH_INPUT_FILL_DARK_FOCUS} !important;
          -webkit-box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_DARK_FOCUS} inset !important;
          box-shadow:0 0 0 1000px ${AUTH_INPUT_FILL_DARK_FOCUS} inset !important;
        }
        @media (max-width: 768px) {
          .al-root[data-theme="dark"] .al-input:hover,
          .al-root[data-theme="dark"] .al-input:focus,
          .al-root[data-theme="dark"] .al-input:focus-visible,
          .al-root[data-theme="dark"] .al-input:active,
          .al-root[data-theme="dark"] .al-input:not(:placeholder-shown) {
            background:${AUTH_INPUT_FILL_DARK_FOCUS} !important;
            background-color:${AUTH_INPUT_FILL_DARK_FOCUS} !important;
            background-image:none !important;
            border:0 !important;
            border-color:transparent;
            box-shadow:none;
          }
        }
        .al-root[data-theme="dark"] .al-error {
          background:transparent;
          color:#ff7b73;
          border:0;
        }
        .al-root[data-theme="dark"] .al-support-backdrop { background:rgba(0,0,0,.62); }
        .al-root[data-theme="dark"] .al-support-modal {
          background:var(--festag-black-popup, #1c1c1e);
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
          /* Desktop controls stay compact — never inherit mobile heights. */
          .al-btn,
          .al-input {
            height:42px;
            font-size:13.5px;
            border-radius:999px;
          }
          .al-root--centered .al-header {
            /* Keep logo + docs on the viewport edges — never squeeze into --al-col-pad. */
            padding-left:32px;
            padding-right:32px;
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
            background:#f7f8f8;
          }
          /* Same dark canvas as desktop — do not go transparent (html #000 looked different). */
          .al-root[data-theme="dark"],
          .al-root[data-theme="dark"] .al-container {
            background:#0f0f11;
            color:#f5f5f7;
          }
          .al-container {
            position:relative;
          }
          .al-header {
            /* Compact sticky chrome — logo left, docs right (full width). */
            padding:max(6px, env(safe-area-inset-top)) var(--al-mobile-gutter) 4px;
            min-height:0;
            flex-wrap:nowrap;
            flex-shrink:0;
            width:100%;
            max-width:none;
            box-sizing:border-box;
            background:transparent;
            justify-content:space-between;
            align-items:center;
            gap:10px;
          }
          .al-wordmark {
            font-size:14px;
            font-weight:400 !important;
            letter-spacing:-0.015em;
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
          /* Mobile auth (login + register): hero mittig/linksbündig, CTAs docked above meta. */
          .al-root[data-auth-mode="login"] .al-main,
          .al-root[data-auth-mode="signup"] .al-main {
            justify-content:stretch;
            padding-top:clamp(48px, 10vh, 96px);
            padding-bottom:max(72px, calc(56px + env(safe-area-inset-bottom)));
          }
          .al-root[data-auth-mode="login"] .al-container:has(.al-agreements--mobile-dock) .al-main,
          .al-root[data-auth-mode="signup"] .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:max(72px, calc(56px + env(safe-area-inset-bottom)));
          }
          /* Auth footer stays visible on every auth mode (login, register, …). */
          .al-root[data-auth-mode="login"] .al-footer-meta,
          .al-root[data-auth-mode="signup"] .al-footer-meta {
            display:flex !important;
          }
          /* In-stack meta duplicates footer — hide when footer is shown. */
          .al-root[data-auth-mode="login"] .al-register-meta,
          .al-root[data-auth-mode="signup"] .al-register-meta {
            display:none !important;
          }
          /* Mobile footer chrome restored after .al-*-desktop-only hide block below. */
          .al-root[data-auth-mode="login"] .al-theme-icon--header,
          .al-root[data-auth-mode="signup"] .al-theme-icon--header {
            display:none !important;
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
          .al-root[data-auth-mode="login"] .al-agreements--mobile-dock,
          .al-root[data-auth-mode="signup"] .al-agreements--mobile-dock {
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
          /* After the generic hide — restore login/register footer chrome. */
          .al-root[data-auth-mode="login"] .al-footer-meta,
          .al-root[data-auth-mode="signup"] .al-footer-meta {
            display:flex !important;
            visibility:visible !important;
            opacity:1 !important;
            z-index:40;
          }
          .al-root[data-auth-mode="login"] .al-footer-sep--desktop-only,
          .al-root[data-auth-mode="login"] .al-dev-link--desktop-only,
          .al-root[data-auth-mode="login"] .al-mode-switch--desktop-only,
          .al-root[data-auth-mode="signup"] .al-footer-sep--desktop-only,
          .al-root[data-auth-mode="signup"] .al-dev-link--desktop-only,
          .al-root[data-auth-mode="signup"] .al-mode-switch--desktop-only {
            display:inline-flex !important;
          }
          .al-root[data-auth-mode="login"] .al-footer-sep--desktop-only,
          .al-root[data-auth-mode="signup"] .al-footer-sep--desktop-only {
            display:inline-flex !important;
          }
          .al-root[data-auth-mode="login"] .al-theme-icon--footer,
          .al-root[data-auth-mode="signup"] .al-theme-icon--footer {
            display:inline-flex !important;
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
            margin-bottom:clamp(16px, 2.8vh, 24px);
            padding-top:clamp(12px, 2.5vh, 28px);
            width:100%;
            align-items:center;
            align-self:stretch;
            text-align:left;
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
          .al-root[data-auth-mode="login"] .al-hero-copy .al-title.al-title-display,
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-title.al-title-display {
            font-size:28px !important;
            line-height:34px !important;
            letter-spacing:-0.025em;
          }
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-ws-name-input,
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-ws-path,
          .al-root[data-auth-mode="signup"] .al-hero-copy button.al-ws-path--editable,
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-ws-path .al-ws-slash,
          .al-root[data-auth-mode="signup"] .al-hero-copy button.al-ws-path--editable .al-ws-slash,
          .al-root[data-auth-mode="signup"] .al-hero-copy .auth-ws-path,
          .al-root[data-auth-mode="signup"] .al-hero-copy button.auth-ws-path--tap,
          .al-root[data-auth-mode="signup"] .al-hero-copy button.auth-ws-path--edit,
          .al-root[data-auth-mode="login"] .al-hero-copy .auth-ws-path,
          .al-root[data-auth-mode="login"] .al-hero-copy button.auth-ws-path--tap {
            font-size:26px !important;
            line-height:32px !important;
          }
          .al-root[data-auth-mode="signup"] .al-hero-copy .al-ws-status {
            margin-top:18px;
            margin-left:0 !important;
            margin-right:0;
            padding-left:0 !important;
            padding-right:0;
            text-indent:0;
            align-self:stretch;
            width:100%;
            text-align:left;
          }
          .al-root[data-auth-mode="login"] .al-content,
          .al-root[data-auth-mode="signup"] .al-content {
            flex:1 1 auto;
            min-height:0;
            display:flex;
            flex-direction:column;
            justify-content:flex-end;
            padding-bottom:8px;
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
            letter-spacing:-0.01em;
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
            letter-spacing:-0.025em;
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
            margin-left:0;
            margin-right:0;
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
            padding:10px var(--al-mobile-gutter) max(14px, env(safe-area-inset-bottom));
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
          /* Mobile controls — pill inputs / CTAs (same system, slightly taller tap). */
          .al-btn {
            height:44px;
            min-height:44px;
            font-size:14px;
            font-weight:400;
            border-radius:999px;
            padding:0 16px;
            letter-spacing:-0.015em;
            gap:10px;
            white-space:nowrap;
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
          /* Google stays flat (brand fill). Apple keeps Linear hairline + soft shadow. */
          .al-btn-google {
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
          /* Light mobile — soft hairline only. */
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary,
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost,
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple,
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary.al-btn-primary--ready {
            background:#ffffff !important;
            color:#1e1e20 !important;
            border:1px solid rgba(30, 30, 32, 0.08) !important;
            box-shadow:0 1px 2px rgba(0, 0, 0, 0.04) !important;
          }
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary:hover:not(:disabled),
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost:hover:not(:disabled),
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple:hover:not(:disabled) {
            border-color:rgba(30, 30, 32, 0.12) !important;
            box-shadow:0 1px 2px rgba(0, 0, 0, 0.06) !important;
          }
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-primary:active:not(:disabled),
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-ghost:active:not(:disabled),
          .al-root:not([data-theme="dark"]) .al-btn.al-btn-apple:active:not(:disabled) {
            background:#f4f4f5 !important;
            border-color:rgba(30, 30, 32, 0.12) !important;
            box-shadow:0 1px 1px rgba(0, 0, 0, 0.03) !important;
          }
          /* Dark mobile — fill only, never a stroke. Idle quiet; ready lifts separately. */
          .al-root[data-theme="dark"] .al-btn.al-btn-primary,
          .al-root[data-theme="dark"] .al-btn.al-btn-ghost,
          .al-root[data-theme="dark"] .al-btn.al-btn-apple,
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-under-cta-switch {
            background:rgba(186,194,210,0.08) !important;
            color:rgba(245,245,247,0.88) !important;
            border:0 !important;
            box-shadow:0 1px 2px rgba(0, 0, 0, 0.35) !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-btn-primary--ready {
            background:rgba(186,194,210,0.28) !important;
            color:#f5f5f7 !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-primary:hover:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-ghost:hover:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-apple:hover:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-under-cta-switch:hover:not(:disabled) {
            background:rgba(186,194,210,0.16) !important;
            color:rgba(245,245,247,0.96) !important;
            border:0 !important;
            box-shadow:0 1px 2px rgba(0, 0, 0, 0.42) !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-btn-primary--ready:hover:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-btn-primary--ready:focus-visible:not(:disabled) {
            background:rgba(186,194,210,0.36) !important;
            color:#f5f5f7 !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-primary:active:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-ghost:active:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-apple:active:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-under-cta-switch:active:not(:disabled) {
            background:rgba(186,194,210,0.22) !important;
            color:#f5f5f7 !important;
            border:0 !important;
            box-shadow:0 1px 1px rgba(0, 0, 0, 0.28) !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-primary.al-btn-primary--ready:active:not(:disabled) {
            background:rgba(186,194,210,0.42) !important;
            color:#f5f5f7 !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-google {
            background:#5B647D !important;
            color:#ffffff !important;
            border:0 !important;
            box-shadow:none !important;
          }
          .al-root[data-theme="dark"] .al-btn.al-btn-google:hover:not(:disabled),
          .al-root[data-theme="dark"] .al-btn.al-btn-google:active:not(:disabled) {
            background:color-mix(in srgb, #5B647D 88%, #ffffff) !important;
            border:0 !important;
            box-shadow:none !important;
          }
          .al-input {
            height:44px;
            font-size:14px;
            border-radius:999px;
            padding:0 16px;
            letter-spacing:-0.01em;
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
          .al-input:hover,
          .al-input:focus,
          .al-input:focus-visible,
          .al-input:active,
          .al-input:not(:placeholder-shown) {
            background-color:var(--festag-input-fill-focus, #E4E4E9);
            background-image:none;
            border:0 !important;
          }
          .al-input:-webkit-autofill,
          .al-input:-webkit-autofill:hover,
          .al-input:-webkit-autofill:focus,
          .al-input:-webkit-autofill:active {
            background-color:var(--festag-input-fill, #EEEEF0) !important;
            background-image:none !important;
            -webkit-box-shadow:0 0 0 1000px var(--festag-input-fill, #EEEEF0) inset !important;
            box-shadow:0 0 0 1000px var(--festag-input-fill, #EEEEF0) inset !important;
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
            -webkit-text-fill-color:#f5f5f7 !important;
            caret-color:#f5f5f7 !important;
            background-color:${AUTH_INPUT_FILL_DARK} !important;
            background-image:none !important;
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
            padding-top:4px;
            padding-bottom:100px;
          }
          .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:10px;
          }
          .al-root[data-auth-mode="login"] .al-main,
          .al-root[data-auth-mode="signup"] .al-main,
          .al-root[data-auth-mode="login"] .al-container:has(.al-agreements--mobile-dock) .al-main,
          .al-root[data-auth-mode="signup"] .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:max(64px, calc(48px + env(safe-area-inset-bottom)));
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
          .al-root[data-auth-mode="signup"] .al-main,
          .al-root[data-auth-mode="login"] .al-container:has(.al-agreements--mobile-dock) .al-main,
          .al-root[data-auth-mode="signup"] .al-container:has(.al-agreements--mobile-dock) .al-main {
            padding-bottom:max(60px, calc(44px + env(safe-area-inset-bottom)));
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
          .al-footer-meta {
            padding:8px var(--al-mobile-gutter) max(12px, env(safe-area-inset-bottom));
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
