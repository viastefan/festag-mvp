/**
 * Shared glassy text dissolve + workspace assemble.
 * Linear-style: rise from below with soft blur → sharp settle. Never a hard cut.
 */

export const FESTAG_GLASSY_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const FESTAG_GLASSY_ENTER_MS = 640
export const FESTAG_GLASSY_EXIT_MS = 420
/** One-shot shell assemble after login (nav → plate → content). */
export const FESTAG_ASSEMBLE_MS = 720

/** CSS keyframes + utility classes for shell enter after auth. */
export const FESTAG_GLASSY_TEXT_CSS = `
@keyframes festagGlassyIn {
  from {
    opacity: 0;
    transform: translateY(14px);
    filter: blur(12px);
    letter-spacing: -0.01em;
  }
  55% {
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
    letter-spacing: inherit;
  }
}
@keyframes festagGlassyOut {
  from {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
    filter: blur(8px);
  }
}
@keyframes festagAssembleIn {
  from {
    opacity: 0;
    transform: translateY(14px);
    filter: blur(10px);
  }
  60% {
    filter: blur(2.5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

.festag-glassy-enter {
  animation: festagGlassyIn ${FESTAG_GLASSY_ENTER_MS}ms ${FESTAG_GLASSY_EASE} both;
}
.festag-glassy-enter-delayed {
  animation: festagGlassyIn ${FESTAG_GLASSY_ENTER_MS}ms ${FESTAG_GLASSY_EASE} 0.08s both;
}
.festag-glassy-out {
  animation: festagGlassyOut ${FESTAG_GLASSY_EXIT_MS}ms ${FESTAG_GLASSY_EASE} both;
}

/* Direct workspace entry — interface builds itself, no white loader. */
.portal-app-shell.portal-assemble .portal-app-nav-col {
  animation: festagAssembleIn 520ms ${FESTAG_GLASSY_EASE} both;
}
.portal-app-shell.portal-assemble .portal-app-main {
  animation: festagAssembleIn 580ms ${FESTAG_GLASSY_EASE} 70ms both;
}
.portal-app-shell.portal-assemble .portal-app-main > * {
  animation: festagAssembleIn 540ms ${FESTAG_GLASSY_EASE} 140ms both;
}

@media (prefers-reduced-motion: reduce) {
  .festag-glassy-enter,
  .festag-glassy-enter-delayed,
  .festag-glassy-out,
  .portal-app-shell.portal-assemble .portal-app-nav-col,
  .portal-app-shell.portal-assemble .portal-app-main,
  .portal-app-shell.portal-assemble .portal-app-main > * {
    animation: none !important;
    opacity: 1 !important;
    filter: none !important;
    transform: none !important;
  }
}
`
