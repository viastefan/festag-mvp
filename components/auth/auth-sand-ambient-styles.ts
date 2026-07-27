/**
 * Soft sandy atmosphere for auth canvases (light + dark).
 *
 * Client (`.al-root` / enter / client onboarding): warm sand veils.
 * Dev (`.dl-root` / dev onboarding): sand + a quiet primary-slate mix, different forms.
 *
 * Idle drift always moves. Pointer bloom is discreet — soft ellipse, never a clipped disc.
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
    inset: -28%;
    will-change: transform, opacity;
  }

  .al-sand-ambient__grain {
    inset: 0;
    opacity: 0.032;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 160px 160px;
    mix-blend-mode: overlay;
    animation: none;
    will-change: auto;
  }

  /* —— Client light: warm sand, stronger bottom presence —— */
  .al-sand-ambient[data-variant="client"] .al-sand-ambient__wash {
    inset: 0;
    background:
      radial-gradient(ellipse 92% 68% at 12% 4%, rgba(236, 176, 128, 0.17), transparent 58%),
      radial-gradient(ellipse 55% 44% at 88% 10%, rgba(92, 85, 76, 0.06), transparent 58%),
      radial-gradient(ellipse 80% 62% at 92% 88%, rgba(220, 154, 108, 0.13), transparent 64%),
      radial-gradient(ellipse 95% 55% at 48% 108%, rgba(242, 198, 158, 0.16), transparent 58%),
      radial-gradient(ellipse 70% 40% at 18% 100%, rgba(228, 168, 120, 0.10), transparent 55%);
    animation: alSandWashClient 26s ease-in-out infinite alternate;
  }

  .al-sand-ambient[data-variant="client"] .al-sand-ambient__drift {
    background:
      radial-gradient(ellipse 54% 48% at 74% 20%, rgba(232, 162, 112, 0.12), transparent 62%),
      radial-gradient(ellipse 60% 52% at 18% 78%, rgba(244, 190, 145, 0.11), transparent 60%),
      radial-gradient(ellipse 48% 36% at 62% 96%, rgba(236, 176, 128, 0.09), transparent 58%);
    animation: alSandDriftClient 38s ease-in-out infinite alternate;
    opacity: 0.72;
  }

  /* Soft bloom — oversized ellipse + blur so edges never read as a clipped circle */
  .al-sand-ambient[data-variant="client"] .al-sand-ambient__spot {
    inset: auto;
    width: min(110vmax, 1400px);
    height: min(90vmax, 1100px);
    left: 0;
    top: 0;
    border-radius: 50%;
    background: radial-gradient(
      ellipse 58% 52% at 50% 50%,
      rgba(238, 172, 122, 0.10) 0%,
      rgba(232, 158, 108, 0.04) 36%,
      transparent 72%
    );
    filter: blur(28px);
    transform: translate3d(
      calc(var(--al-sand-x, 50) * 1vw - 50%),
      calc(var(--al-sand-y, 58) * 1vh - 50%),
      0
    );
    opacity: calc(0.08 + var(--al-sand-lit, 0) * 0.10);
    transition: opacity 1.1s cubic-bezier(.22, 1, .36, 1);
  }

  /* —— Dev light: sand + quiet primary slate, different forms —— */
  .al-sand-ambient[data-variant="dev"] .al-sand-ambient__wash {
    inset: 0;
    background:
      radial-gradient(ellipse 78% 58% at 88% 6%, rgba(91, 100, 125, 0.14), transparent 56%),
      radial-gradient(ellipse 70% 55% at 8% 18%, rgba(236, 176, 128, 0.12), transparent 58%),
      radial-gradient(ellipse 88% 48% at 42% 110%, rgba(91, 100, 125, 0.10), transparent 55%),
      radial-gradient(ellipse 55% 70% at 96% 72%, rgba(220, 154, 108, 0.09), transparent 60%),
      radial-gradient(ellipse 48% 42% at 22% 92%, rgba(120, 128, 150, 0.08), transparent 58%);
    animation: alSandWashDev 30s ease-in-out infinite alternate;
  }

  .al-sand-ambient[data-variant="dev"] .al-sand-ambient__drift {
    background:
      radial-gradient(ellipse 42% 62% at 28% 30%, rgba(91, 100, 125, 0.10), transparent 62%),
      radial-gradient(ellipse 58% 40% at 78% 68%, rgba(232, 162, 112, 0.09), transparent 60%),
      radial-gradient(ellipse 50% 36% at 56% 102%, rgba(140, 148, 170, 0.07), transparent 58%);
    animation: alSandDriftDev 42s ease-in-out infinite alternate;
    opacity: 0.7;
  }

  .al-sand-ambient[data-variant="dev"] .al-sand-ambient__spot {
    inset: auto;
    width: min(100vmax, 1280px);
    height: min(78vmax, 960px);
    left: 0;
    top: 0;
    border-radius: 46% 54% 52% 48% / 48% 46% 54% 52%;
    background: radial-gradient(
      ellipse 55% 48% at 50% 50%,
      rgba(91, 100, 125, 0.09) 0%,
      rgba(180, 140, 105, 0.04) 40%,
      transparent 74%
    );
    filter: blur(32px);
    transform: translate3d(
      calc(var(--al-sand-x, 58) * 1vw - 50%),
      calc(var(--al-sand-y, 52) * 1vh - 50%),
      0
    ) rotate(8deg);
    opacity: calc(0.07 + var(--al-sand-lit, 0) * 0.09);
    transition: opacity 1.2s cubic-bezier(.22, 1, .36, 1);
  }

  /* —— Client dark —— */
  .al-root[data-theme="dark"] .al-sand-ambient[data-variant="client"] .al-sand-ambient__wash,
  .ae-root[data-theme="dark"] .al-sand-ambient[data-variant="client"] .al-sand-ambient__wash {
    background:
      radial-gradient(ellipse 100% 72% at 8% -6%, rgba(188, 128, 72, 0.15), transparent 56%),
      radial-gradient(ellipse 82% 58% at 96% 14%, rgba(150, 104, 62, 0.08), transparent 58%),
      radial-gradient(ellipse 95% 58% at 50% 114%, rgba(130, 90, 55, 0.12), transparent 54%),
      radial-gradient(ellipse 70% 42% at 16% 102%, rgba(120, 82, 50, 0.09), transparent 55%),
      linear-gradient(160deg, rgba(52, 38, 26, 0.26) 0%, transparent 38%, transparent 55%, rgba(32, 24, 18, 0.22) 100%);
    animation: alSandWashClientDark 30s ease-in-out infinite alternate;
    opacity: 1;
  }

  .al-root[data-theme="dark"] .al-sand-ambient[data-variant="client"] .al-sand-ambient__drift,
  .ae-root[data-theme="dark"] .al-sand-ambient[data-variant="client"] .al-sand-ambient__drift {
    background:
      radial-gradient(ellipse 58% 52% at 72% 26%, rgba(170, 118, 72, 0.08), transparent 62%),
      radial-gradient(ellipse 56% 50% at 18% 78%, rgba(130, 90, 55, 0.07), transparent 60%),
      radial-gradient(ellipse 64% 40% at 55% 104%, rgba(150, 104, 62, 0.07), transparent 58%);
    animation: alSandDriftClientDark 44s ease-in-out infinite alternate;
    opacity: 0.78;
  }

  .al-root[data-theme="dark"] .al-sand-ambient[data-variant="client"] .al-sand-ambient__spot,
  .ae-root[data-theme="dark"] .al-sand-ambient[data-variant="client"] .al-sand-ambient__spot {
    background: radial-gradient(
      ellipse 58% 52% at 50% 50%,
      rgba(190, 132, 78, 0.08) 0%,
      rgba(140, 96, 58, 0.03) 40%,
      transparent 74%
    );
    opacity: calc(0.07 + var(--al-sand-lit, 0) * 0.09);
  }

  /* —— Dev dark: warm zinc + primary slate —— */
  .dl-root[data-theme="dark"] .al-sand-ambient[data-variant="dev"] .al-sand-ambient__wash,
  .ae-root[data-theme="dark"] .al-sand-ambient[data-variant="dev"] .al-sand-ambient__wash {
    background:
      radial-gradient(ellipse 88% 65% at 92% -4%, rgba(91, 100, 125, 0.16), transparent 55%),
      radial-gradient(ellipse 75% 58% at 4% 22%, rgba(160, 112, 68, 0.09), transparent 58%),
      radial-gradient(ellipse 90% 52% at 48% 112%, rgba(91, 100, 125, 0.12), transparent 54%),
      radial-gradient(ellipse 50% 68% at 18% 70%, rgba(110, 118, 140, 0.07), transparent 60%),
      linear-gradient(200deg, rgba(36, 40, 52, 0.32) 0%, transparent 42%, transparent 58%, rgba(40, 32, 26, 0.18) 100%);
    animation: alSandWashDevDark 32s ease-in-out infinite alternate;
    opacity: 1;
  }

  .dl-root[data-theme="dark"] .al-sand-ambient[data-variant="dev"] .al-sand-ambient__drift,
  .ae-root[data-theme="dark"] .al-sand-ambient[data-variant="dev"] .al-sand-ambient__drift {
    background:
      radial-gradient(ellipse 40% 64% at 24% 34%, rgba(91, 100, 125, 0.09), transparent 62%),
      radial-gradient(ellipse 58% 42% at 82% 64%, rgba(150, 104, 62, 0.06), transparent 60%),
      radial-gradient(ellipse 52% 38% at 60% 100%, rgba(120, 128, 150, 0.07), transparent 58%);
    animation: alSandDriftDevDark 46s ease-in-out infinite alternate;
    opacity: 0.76;
  }

  .dl-root[data-theme="dark"] .al-sand-ambient[data-variant="dev"] .al-sand-ambient__spot,
  .ae-root[data-theme="dark"] .al-sand-ambient[data-variant="dev"] .al-sand-ambient__spot {
    background: radial-gradient(
      ellipse 55% 48% at 50% 50%,
      rgba(91, 100, 125, 0.10) 0%,
      rgba(140, 110, 85, 0.03) 42%,
      transparent 74%
    );
    opacity: calc(0.06 + var(--al-sand-lit, 0) * 0.08);
  }

  .al-root[data-theme="dark"] .al-sand-ambient__grain,
  .dl-root[data-theme="dark"] .al-sand-ambient__grain,
  .ae-root[data-theme="dark"] .al-sand-ambient__grain {
    opacity: 0.038;
    mix-blend-mode: soft-light;
  }

  /* Client motion — slow breathe + bottom lift */
  @keyframes alSandWashClient {
    0%   { transform: translate3d(0, 0, 0) scale(1); opacity: 0.9; }
    50%  { transform: translate3d(1.8%, -1.4%, 0) scale(1.04); opacity: 1; }
    100% { transform: translate3d(-1.6%, 2.2%, 0) scale(1.03); opacity: 0.92; }
  }
  @keyframes alSandDriftClient {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
    100% { transform: translate3d(-2.6%, 2.0%, 0) rotate(1.4deg) scale(1.03); }
  }
  @keyframes alSandWashClientDark {
    0%   { transform: translate3d(0, 0, 0) scale(1); opacity: 0.88; }
    50%  { transform: translate3d(1.4%, 1.8%, 0) scale(1.045); opacity: 1; }
    100% { transform: translate3d(-2.0%, -1.0%, 0) scale(1.025); opacity: 0.92; }
  }
  @keyframes alSandDriftClientDark {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
    100% { transform: translate3d(2.0%, -1.8%, 0) rotate(-1.1deg); }
  }

  /* Dev motion — opposite bias, slightly longer */
  @keyframes alSandWashDev {
    0%   { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); opacity: 0.9; }
    50%  { transform: translate3d(-1.6%, 1.2%, 0) scale(1.035) rotate(-0.6deg); opacity: 1; }
    100% { transform: translate3d(1.8%, -1.6%, 0) scale(1.02) rotate(0.5deg); opacity: 0.92; }
  }
  @keyframes alSandDriftDev {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
    100% { transform: translate3d(2.4%, 1.4%, 0) rotate(-1.3deg) scale(1.04); }
  }
  @keyframes alSandWashDevDark {
    0%   { transform: translate3d(0, 0, 0) scale(1); opacity: 0.88; }
    50%  { transform: translate3d(-1.5%, -1.2%, 0) scale(1.04); opacity: 1; }
    100% { transform: translate3d(1.6%, 2.0%, 0) scale(1.025); opacity: 0.92; }
  }
  @keyframes alSandDriftDevDark {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg); }
    100% { transform: translate3d(-1.8%, 1.6%, 0) rotate(1.0deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .al-sand-ambient__wash,
    .al-sand-ambient__drift {
      animation: none !important;
    }
    .al-sand-ambient__spot {
      opacity: 0.1;
      transition: none;
      filter: blur(20px);
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
