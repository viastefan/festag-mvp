/**
 * Soft sandy-orange atmosphere for auth canvases (light + dark).
 * Light: warm sand veils. Dark: near-black with a discreet amber light-leak.
 * Idle drift + quiet cursor bloom — never loud marketing glow.
 */
export const AUTH_SAND_AMBIENT_STYLES = `
  .al-sand-ambient {
    position: fixed;
    inset: 0;
    z-index: 0 !important;
    pointer-events: none;
    overflow: hidden;
    opacity: 1;
  }

  .al-sand-ambient__wash,
  .al-sand-ambient__drift,
  .al-sand-ambient__spot,
  .al-sand-ambient__grain {
    position: absolute;
    inset: -18%;
    will-change: transform, opacity;
  }

  .al-sand-ambient__grain {
    inset: 0;
    opacity: 0.035;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 160px 160px;
    mix-blend-mode: overlay;
    animation: none;
    will-change: auto;
  }

  /* —— Light: warm sand + whisper of primary slate (clearly readable) —— */
  .al-sand-ambient__wash {
    inset: 0;
    background:
      radial-gradient(ellipse 90% 65% at 14% 8%, rgba(236, 176, 128, 0.38), transparent 58%),
      radial-gradient(ellipse 52% 42% at 84% 12%, rgba(91, 100, 125, 0.14), transparent 58%),
      radial-gradient(ellipse 75% 58% at 90% 82%, rgba(220, 154, 108, 0.26), transparent 62%),
      radial-gradient(ellipse 60% 45% at 46% 104%, rgba(242, 198, 158, 0.28), transparent 55%);
    animation: alSandWash 22s ease-in-out infinite alternate;
  }

  .al-sand-ambient__drift {
    background:
      radial-gradient(ellipse 52% 46% at 72% 22%, rgba(232, 162, 112, 0.28), transparent 60%),
      radial-gradient(ellipse 56% 50% at 22% 70%, rgba(244, 190, 145, 0.22), transparent 58%);
    animation: alSandDrift 34s ease-in-out infinite alternate;
    opacity: 0.95;
  }

  .al-sand-ambient__spot {
    inset: auto;
    width: min(72vmax, 920px);
    height: min(72vmax, 920px);
    left: 0;
    top: 0;
    border-radius: 50%;
    background: radial-gradient(
      circle at center,
      rgba(238, 172, 122, 0.42) 0%,
      rgba(232, 158, 108, 0.18) 38%,
      transparent 68%
    );
    transform: translate3d(
      calc(var(--al-sand-x, 50) * 1vw - 50%),
      calc(var(--al-sand-y, 38) * 1vh - 50%),
      0
    );
    opacity: calc(0.32 + var(--al-sand-lit, 0) * 0.42);
    transition: opacity 0.7s cubic-bezier(.22, 1, .36, 1);
  }

  /* —— Dark: near-black + visible sandy-amber light leak —— */
  .al-root[data-theme="dark"] .al-sand-ambient__wash,
  .dl-root[data-theme="dark"] .al-sand-ambient__wash,
  .ae-root[data-theme="dark"] .al-sand-ambient__wash {
    background:
      radial-gradient(ellipse 100% 75% at 6% -8%, rgba(188, 128, 72, 0.34), transparent 56%),
      radial-gradient(ellipse 85% 60% at 94% 16%, rgba(150, 104, 62, 0.22), transparent 58%),
      radial-gradient(ellipse 75% 55% at 52% 112%, rgba(120, 82, 50, 0.20), transparent 52%),
      radial-gradient(ellipse 45% 40% at 78% 48%, rgba(91, 100, 125, 0.10), transparent 60%),
      linear-gradient(145deg, rgba(52, 38, 26, 0.72) 0%, transparent 40%, transparent 58%, rgba(32, 24, 18, 0.48) 100%);
    animation: alSandWashDark 28s ease-in-out infinite alternate;
    opacity: 1;
  }

  .al-root[data-theme="dark"] .al-sand-ambient__drift,
  .dl-root[data-theme="dark"] .al-sand-ambient__drift,
  .ae-root[data-theme="dark"] .al-sand-ambient__drift {
    background:
      radial-gradient(ellipse 58% 52% at 70% 28%, rgba(170, 118, 72, 0.22), transparent 62%),
      radial-gradient(ellipse 54% 48% at 20% 74%, rgba(130, 90, 55, 0.16), transparent 60%);
    animation: alSandDriftDark 40s ease-in-out infinite alternate;
    opacity: 1;
  }

  .al-root[data-theme="dark"] .al-sand-ambient__spot,
  .dl-root[data-theme="dark"] .al-sand-ambient__spot,
  .ae-root[data-theme="dark"] .al-sand-ambient__spot {
    background: radial-gradient(
      circle at center,
      rgba(190, 132, 78, 0.28) 0%,
      rgba(140, 96, 58, 0.12) 42%,
      transparent 68%
    );
    opacity: calc(0.28 + var(--al-sand-lit, 0) * 0.40);
  }

  .al-root[data-theme="dark"] .al-sand-ambient__grain,
  .dl-root[data-theme="dark"] .al-sand-ambient__grain,
  .ae-root[data-theme="dark"] .al-sand-ambient__grain {
    opacity: 0.06;
    mix-blend-mode: soft-light;
  }

  @keyframes alSandWash {
    0%   { transform: translate3d(0, 0, 0) scale(1); opacity: 0.9; }
    50%  { transform: translate3d(1.6%, -1.2%, 0) scale(1.03); opacity: 1; }
    100% { transform: translate3d(-1.4%, 1.8%, 0) scale(1.02); opacity: 0.92; }
  }
  @keyframes alSandDrift {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
    100% { transform: translate3d(-2.2%, 1.6%, 0) rotate(1.2deg); }
  }
  @keyframes alSandWashDark {
    0%   { transform: translate3d(0, 0, 0) scale(1); opacity: 0.88; }
    50%  { transform: translate3d(1.2%, 1.4%, 0) scale(1.04); opacity: 1; }
    100% { transform: translate3d(-1.8%, -0.8%, 0) scale(1.02); opacity: 0.92; }
  }
  @keyframes alSandDriftDark {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
    100% { transform: translate3d(1.8%, -1.4%, 0) rotate(-0.9deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .al-sand-ambient__wash,
    .al-sand-ambient__drift {
      animation: none !important;
    }
    .al-sand-ambient__spot {
      opacity: 0.18;
      transition: none;
    }
  }

  /* Let atmosphere show through chrome plates (light + dark). */
  .al-root .al-container,
  .al-root .al-header,
  .dl-root .dl-container,
  .dl-root .dl-header {
    background: transparent;
  }
  .al-root[data-theme="dark"] .al-header,
  .dl-root[data-theme="dark"] .dl-header {
    background: transparent;
  }
`
