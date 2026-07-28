/**
 * Shared glassy text dissolve — enter / exit for shell + loader.
 * Soft blur + opacity, never a hard cut.
 */

export const FESTAG_GLASSY_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const FESTAG_GLASSY_ENTER_MS = 720
export const FESTAG_GLASSY_EXIT_MS = 520

/** CSS keyframes + utility classes for shell enter after Tagro Awakens. */
export const FESTAG_GLASSY_TEXT_CSS = `
@keyframes festagGlassyIn {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(6px);
    letter-spacing: -0.01em;
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
    transform: translateY(-6px);
    filter: blur(5px);
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

@media (prefers-reduced-motion: reduce) {
  .festag-glassy-enter,
  .festag-glassy-enter-delayed,
  .festag-glassy-out {
    animation: none !important;
    opacity: 1 !important;
    filter: none !important;
    transform: none !important;
  }
}
`
