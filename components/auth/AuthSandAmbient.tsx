'use client'

/**
 * Auth atmosphere wrapper — maps legacy client/dev to distinct surfaces,
 * remounts when surface changes so patterns alternate.
 */

import FestagAmbient, {
  type FestagAmbientSurface,
} from '@/components/ambient/FestagAmbient'

export type AuthSandVariant =
  | 'client'
  | 'dev'
  | FestagAmbientSurface

function resolveSurface(variant: AuthSandVariant): FestagAmbientSurface {
  if (variant === 'client') return 'login'
  if (variant === 'dev') return 'dev-login'
  return variant
}

export default function AuthSandAmbient({
  variant = 'client',
}: {
  variant?: AuthSandVariant
}) {
  const surface = resolveSurface(variant)
  return <FestagAmbient key={surface} surface={surface} />
}
