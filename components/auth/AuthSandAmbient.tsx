'use client'

import { useEffect, useRef } from 'react'

/**
 * Soft sandy-orange auth atmosphere: idle drift + quiet pointer bloom.
 * Mount as first child of `.al-root` / `.dl-root` / `.ae-root`.
 */
export default function AuthSandAmbient() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const target = useRef({ x: 50, y: 38 })
  const current = useRef({ x: 50, y: 38 })
  const lit = useRef(0)
  const litTarget = useRef(0)
  const raf = useRef(0)
  const reduceMotion = useRef(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const host = wrap?.parentElement
    if (!host || !wrap) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => {
      reduceMotion.current = mq.matches
    }
    syncMotion()
    mq.addEventListener('change', syncMotion)

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')

    const setVars = () => {
      host.style.setProperty('--al-sand-x', current.current.x.toFixed(2))
      host.style.setProperty('--al-sand-y', current.current.y.toFixed(2))
      host.style.setProperty('--al-sand-lit', lit.current.toFixed(3))
    }

    const tick = () => {
      const ease = reduceMotion.current ? 1 : 0.06
      current.current.x += (target.current.x - current.current.x) * ease
      current.current.y += (target.current.y - current.current.y) * ease
      lit.current += (litTarget.current - lit.current) * (reduceMotion.current ? 1 : 0.08)
      setVars()
      raf.current = window.requestAnimationFrame(tick)
    }
    raf.current = window.requestAnimationFrame(tick)

    const onMove = (e: PointerEvent) => {
      if (!finePointer.matches || reduceMotion.current) return
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      target.current.x = (e.clientX / w) * 100
      target.current.y = (e.clientY / h) * 100
      litTarget.current = 1
    }

    const onLeave = () => {
      litTarget.current = 0
    }

    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)

    return () => {
      window.cancelAnimationFrame(raf.current)
      mq.removeEventListener('change', syncMotion)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      host.style.removeProperty('--al-sand-x')
      host.style.removeProperty('--al-sand-y')
      host.style.removeProperty('--al-sand-lit')
    }
  }, [])

  return (
    <div ref={wrapRef} className="al-sand-ambient" aria-hidden="true">
      <div className="al-sand-ambient__wash" />
      <div className="al-sand-ambient__drift" />
      <div className="al-sand-ambient__spot" />
    </div>
  )
}
