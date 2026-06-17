'use client'

/**
 * Festag PWA war früher mit einem Service Worker installiert, der aggressiv
 * Assets gecached hat. Resultat: User sahen nach Updates teilweise wochenlang
 * den alten Stand (siehe Bug-Report 2026-05-07).
 *
 * Diese Komponente registriert KEINEN neuen Service Worker, sondern räumt
 * aktiv alle bestehenden Registrierungen + Caches weg. Wir verzichten ab
 * sofort auf SW-Caching — Vercel-CDN macht das Asset-Hosting effizient
 * genug, und die UX-Konsistenz hat Priorität.
 */

import { useEffect } from 'react'

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    let cancelled = false

    ;(async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        if (cancelled) return
        for (const r of regs) {
          try { await r.unregister() } catch { /* ignore */ }
        }
        // Caches plattfrei räumen
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(k => caches.delete(k)))
        }
      } catch { /* ignore */ }
    })()

    return () => { cancelled = true }
  }, [])

  return null
}
