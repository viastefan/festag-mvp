/**
 * Soft sandy-orange atmosphere for light auth canvases.
 * Idle drift + quiet cursor bloom — never loud marketing glow.
 */
export const AUTH_SAND_AMBIENT_STYLES = `
  .al-sand-ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    opacity: 1;
    transition: opacity 0.45s ease;
  }
  .al-root[data-theme="dark"] .al-sand-ambient,
  .dl-root[data-theme="dark"] .al-sand-ambient,
  .ae-root[data-theme="dark"] .al-sand-ambient {
    opacity: 0;
  }

  .al-sand-ambient__wash,
  .al-sand-ambient__drift,
  .al-sand-ambient__spot {
    position: absolute;
    inset: -18%;
    will-change: transform, opacity;
  }

  /* Base warm sand veil — barely shifts the canvas. */
  .al-sand-ambient__wash {
    inset: 0;
    background:
      radial-gradient(ellipse 85% 60% at 18% 12%, rgba(236, 176, 128, 0.22), transparent 58%),
      radial-gradient(ellipse 70% 55% at 88% 78%, rgba(220, 154, 108, 0.14), transparent 62%),
      radial-gradient(ellipse 55% 40% at 48% 100%, rgba(242, 198, 158, 0.16), transparent 55%);
    animation: alSandWash 22s ease-in-out infinite alternate;
  }

  /* Second layer drifts opposite — depth without motion noise. */
  .al-sand-ambient__drift {
    background:
      radial-gradient(ellipse 48% 42% at 72% 22%, rgba(232, 162, 112, 0.16), transparent 60%),
      radial-gradient(ellipse 52% 48% at 24% 68%, rgba(244, 190, 145, 0.12), transparent 58%);
    animation: alSandDrift 34s ease-in-out infinite alternate;
    opacity: 0.85;
  }

  /* Cursor bloom — soft apricot that follows the pointer. */
  .al-sand-ambient__spot {
    inset: auto;
    width: min(72vmax, 920px);
    height: min(72vmax, 920px);
    left: 0;
    top: 0;
    border-radius: 50%;
    background: radial-gradient(
      circle at center,
      rgba(238, 172, 122, 0.28) 0%,
      rgba(232, 158, 108, 0.12) 38%,
      transparent 68%
    );
    transform: translate3d(
      calc(var(--al-sand-x, 50) * 1vw - 50%),
      calc(var(--al-sand-y, 38) * 1vh - 50%),
      0
    );
    opacity: calc(0.22 + var(--al-sand-lit, 0) * 0.38);
    transition: opacity 0.7s cubic-bezier(.22, 1, .36, 1);
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

  @media (prefers-reduced-motion: reduce) {
    .al-sand-ambient__wash,
    .al-sand-ambient__drift {
      animation: none;
    }
    .al-sand-ambient__spot {
      opacity: 0.22;
      transition: none;
    }
  }

  /* Let the canvas atmosphere show through chrome plates. */
  .al-root:not([data-theme="dark"]) .al-container,
  .al-root:not([data-theme="dark"]) .al-header {
    background: transparent;
  }
  .dl-root:not([data-theme="dark"]) .dl-container,
  .dl-root:not([data-theme="dark"]) .dl-header {
    background: transparent;
  }
`
