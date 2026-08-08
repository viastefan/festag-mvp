'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  variant: 'decision' | 'risk'
  onUndo: () => void
}

export default function TransferScreen({ variant, onUndo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [countdown, setCountdown] = useState(3)
  const animFrame = useRef<number>(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      canvas.width = 200 * dpr
      canvas.height = 200 * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      r: number
      alpha: number
      speed: number
    }[] = []

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 30 + Math.random() * 50
      particles.push({
        x: 100 + Math.cos(angle) * dist,
        y: 100 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 1.5 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.5,
        speed: 0.001 + Math.random() * 0.002,
      })
    }

    const color = variant === 'decision' ? '212,168,83' : '52,168,83'

    let t = 0
    const animate = () => {
      t += 0.016
      ctx.clearRect(0, 0, 200, 200)

      // Center particle
      const centerR = 12 + Math.sin(t * 2) * 2
      const gradient = ctx.createRadialGradient(100, 100, 0, 100, 100, centerR * 1.5)
      gradient.addColorStop(0, `rgba(${color},0.6)`)
      gradient.addColorStop(1, `rgba(${color},0)`)
      ctx.beginPath()
      ctx.arc(100, 100, centerR, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.beginPath()
      ctx.arc(100, 100, 6, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${color},0.9)`
      ctx.fill()

      // Orbiting particles
      for (const p of particles) {
        const angle = Math.atan2(p.y - 100, p.x - 100)
        const dist = Math.sqrt((p.x - 100) ** 2 + (p.y - 100) ** 2)
        const targetDist = 30 + Math.sin(t * p.speed * 100 + angle) * 15

        const dx = (Math.cos(angle + p.speed * 10) * targetDist) - (p.x - 100)
        const dy = (Math.sin(angle + p.speed * 10) * targetDist) - (p.y - 100)
        p.x += dx * 0.01 + p.vx
        p.y += dy * 0.01 + p.vy

        const pulse = 0.5 + Math.sin(t * 3 + p.alpha * 10) * 0.3
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color},${p.alpha * pulse})`
        ctx.fill()
      }

      animFrame.current = requestAnimationFrame(animate)
    }

    animFrame.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrame.current)
  }, [variant])

  return (
    <motion.div
      className="fos-transfer-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        style={{ width: 200, height: 200 }}
      />
      <motion.p
        className="fos-transfer-text"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {variant === 'decision'
          ? 'Entscheidung übertragen.'
          : 'Risiko wird analysiert.'}
      </motion.p>
      <motion.p
        className="fos-transfer-sub"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {variant === 'decision'
          ? 'Sende an Entwickler...'
          : 'Maßnahmen werden vorbereitet...'}
      </motion.p>
      {countdown > 0 && (
        <motion.button
          className="fos-transfer-undo"
          onClick={onUndo}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Rückgängig ({countdown}s)
        </motion.button>
      )}
      <motion.div
        className="fos-transfer-confirm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <span>Entwickler benachrichtigt</span>
        <span>Aufgabe aktualisiert</span>
        <span>GitHub-Planung aktualisiert</span>
      </motion.div>
    </motion.div>
  )
}
