'use client'

/**
 * Auth atmosphere — primary-dusk wash for Dev onboarding.
 * Cool slate glow from Festag primary `#5B647D`, still deep and dark.
 * Other variants stay flat (Festag Night / light auth).
 */

export type AuthSandVariant =
  | 'client'
  | 'dev'
  | 'login'
  | 'register'
  | 'onboarding'
  | 'enter'
  | 'dev-login'
  | 'dev-onboarding'
  | 'dev-panel'
  | 'client-panel'

const DUSK_VARIANTS: AuthSandVariant[] = ['dev-onboarding']

export default function AuthSandAmbient({ variant }: { variant?: AuthSandVariant }) {
  if (!variant || !DUSK_VARIANTS.includes(variant)) return null

  return (
    <>
      <style>{DUSK_CSS}</style>
      <div className="auth-sand-ambient" aria-hidden>
        <div className="auth-sand-ambient__glow auth-sand-ambient__glow--top" />
        <div className="auth-sand-ambient__glow auth-sand-ambient__glow--bottom" />
        <div className="auth-sand-ambient__grain" />
      </div>
    </>
  )
}

const DUSK_CSS = `
  .auth-sand-ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .auth-sand-ambient__glow {
    position: absolute;
    inset: auto;
    border-radius: 50%;
    filter: blur(52px);
  }
  .auth-sand-ambient__glow--top {
    top: -18%;
    left: 50%;
    width: 120%;
    height: 52%;
    transform: translateX(-50%);
    background: radial-gradient(
      ellipse at center,
      rgba(91, 100, 125, 0.16) 0%,
      rgba(91, 100, 125, 0.05) 42%,
      transparent 70%
    );
  }
  .auth-sand-ambient__glow--bottom {
    left: 50%;
    bottom: -22%;
    width: 130%;
    height: 58%;
    transform: translateX(-50%);
    background: radial-gradient(
      ellipse at center,
      rgba(91, 100, 125, 0.14) 0%,
      rgba(70, 78, 102, 0.05) 42%,
      transparent 72%
    );
  }
  .auth-sand-ambient__grain {
    position: absolute;
    inset: 0;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px 180px;
    mix-blend-mode: overlay;
  }
  .al-root.onb-sand-dark {
    isolation: isolate;
  }
  .al-root.onb-sand-dark > .al-container,
  .al-root.onb-sand-dark > .onb-dots {
    position: relative;
    z-index: 1;
  }
`
