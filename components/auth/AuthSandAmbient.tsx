'use client'

/**
 * Auth atmosphere — quiet graphite depth for the auth OS.
 * Almost monochromatic; never colorful. Primary blue lives only on CTAs.
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

const DUSK_VARIANTS: AuthSandVariant[] = [
  'dev-onboarding',
  'onboarding',
  'login',
  'register',
  'enter',
]

export default function AuthSandAmbient({ variant }: { variant?: AuthSandVariant }) {
  if (!variant || !DUSK_VARIANTS.includes(variant)) return null

  return (
    <>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DUSK_CSS }} />
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
    left: 40%;
    width: 110%;
    height: 48%;
    transform: translateX(-50%);
    background: radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, 0.045) 0%,
      rgba(255, 255, 255, 0.012) 42%,
      transparent 70%
    );
  }
  .auth-sand-ambient__glow--bottom {
    left: 55%;
    bottom: -22%;
    width: 120%;
    height: 52%;
    transform: translateX(-50%);
    background: radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0.01) 42%,
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
  .al-root.onb-sand-dark > .onb-dots,
  .al-root.onb-sand-dark > .onb-command-bar,
  .al-root[data-theme="dark"] > .al-container {
    position: relative;
    z-index: 1;
  }
`
