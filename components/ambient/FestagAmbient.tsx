'use client'

/**
 * Full-screen Festag atmosphere — top / bottom / left / right / center veils.
 * Each surface uses a different pattern so Login, Register, Dev, Onboarding alternate.
 */

import {
  FESTAG_AMBIENT_CSS,
  type FestagAmbientSurface,
} from '@/components/ambient/festag-ambient-styles'

export type { FestagAmbientSurface }

export default function FestagAmbient({
  surface,
  className,
}: {
  surface: FestagAmbientSurface
  className?: string
}) {
  return (
    <div
      className={`fa-ambient${className ? ` ${className}` : ''}`}
      data-surface={surface}
      aria-hidden="true"
    >
      <style>{FESTAG_AMBIENT_CSS}</style>
      <div className="fa-ambient__top" />
      <div className="fa-ambient__bottom" />
      <div className="fa-ambient__left" />
      <div className="fa-ambient__right" />
      <div className="fa-ambient__center" />
      <div className="fa-ambient__drift" />
      <div className="fa-ambient__grain" />
    </div>
  )
}
