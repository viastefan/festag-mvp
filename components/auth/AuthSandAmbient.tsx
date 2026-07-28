'use client'

/**
 * Auth atmosphere — disabled.
 * Dark auth is a flat Festag Night canvas; no sand/orange gradient wash.
 * Kept as a stub so call sites stay stable.
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

export default function AuthSandAmbient(_props: {
  variant?: AuthSandVariant
}) {
  return null
}
