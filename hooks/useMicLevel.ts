'use client'

import { useEffect, useState } from 'react'

/**
 * useMicLevel — live mic amplitude split into N bars via Web Audio analyser.
 * Returns 0 when inactive; jagged 0..1 values driven by real voice when active.
 */
export function useMicLevel(active: boolean, bars = 15): number[] {
  const [levels, setLevels] = useState<number[]>(() => Array(bars).fill(0))

  useEffect(() => {
    if (!active) {
      setLevels(Array(bars).fill(0))
      return
    }
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    let raf = 0
    let cancelled = false

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        analyser.smoothingTimeConstant = 0.55
        src.connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)
        const step = Math.max(1, Math.floor((data.length - 4) / bars))
        let last = 0
        const tick = (t: number) => {
          raf = requestAnimationFrame(tick)
          if (t - last < 33) return // ~30 fps
          last = t
          analyser.getByteFrequencyData(data)
          const next: number[] = []
          for (let i = 0; i < bars; i++) {
            const v = data[2 + i * step] / 255
            next.push(v)
          }
          setLevels(next)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        // permission denied / unsupported — bars stay flat
      }
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach(t => t.stop())
      ctx?.close().catch(() => {})
    }
  }, [active, bars])

  return levels
}
