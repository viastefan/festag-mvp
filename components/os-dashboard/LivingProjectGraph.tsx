'use client'

import { useEffect, useRef, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { NodeId, ProjectNode } from './FestagOSDashboard'

interface Props {
  nodes: ProjectNode[]
  edges: [NodeId, NodeId][]
  hoveredNode: NodeId | null
  onNodeHover: (id: NodeId | null) => void
  onNodeClick: (id: NodeId) => void
  activeNode: NodeId | null
  compact?: boolean
}

const NODE_COLORS: Record<ProjectNode['status'], string> = {
  ok: '#1E1E20',
  attention: '#D4A853',
  warning: '#C94444',
  pending: '#8891a0',
}

const BADGE_BG: Record<string, string> = {
  amber: 'rgba(212,168,83,0.12)',
  red: 'rgba(201,68,68,0.10)',
  green: 'rgba(52,168,83,0.10)',
  info: 'rgba(30,30,32,0.06)',
}
const BADGE_COLOR: Record<string, string> = {
  amber: '#A07D30',
  red: '#A03030',
  green: '#2A7A3E',
  info: '#5c5c62',
}

type Particle = {
  progress: number
  speed: number
  edge: number
  size: number
}

export default function LivingProjectGraph({
  nodes,
  edges,
  hoveredNode,
  onNodeHover,
  onNodeClick,
  activeNode,
  compact,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrame = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const timeRef = useRef(0)

  const nodeMap = useMemo(() => {
    const m: Record<string, ProjectNode> = {}
    for (const n of nodes) m[n.id] = n
    return m
  }, [nodes])

  const offsetX = compact ? 0 : 20
  const offsetY = compact ? -20 : 0
  const scale = compact ? 0.75 : 1

  useEffect(() => {
    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: 8 }, () => ({
        progress: Math.random(),
        speed: 0.0004 + Math.random() * 0.0006,
        edge: Math.floor(Math.random() * edges.length),
        size: 1.5 + Math.random() * 1.5,
      }))
    }
  }, [edges.length])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = (ts: number) => {
      const dt = ts - timeRef.current
      timeRef.current = ts
      const rect = canvas.parentElement!.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2 + offsetX
      const cy = h / 2 + offsetY

      const getPos = (id: NodeId) => {
        const n = nodeMap[id]
        if (!n) return { x: 0, y: 0 }
        return { x: cx + (n.x - 240) * scale, y: cy + (n.y - 220) * scale }
      }

      // Draw edges
      for (const [from, to] of edges) {
        const a = getPos(from)
        const b = getPos(to)
        const isHovered = hoveredNode === from || hoveredNode === to
        const isActive = activeNode === from || activeNode === to

        ctx.beginPath()
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const controlOffset = 20 * scale
        const cpx = mx + (Math.random() > 0.5 ? controlOffset : -controlOffset) * 0.3
        const cpy = my + (Math.random() > 0.5 ? controlOffset : -controlOffset) * 0.3

        ctx.moveTo(a.x, a.y)
        ctx.quadraticCurveTo(cpx, cpy, b.x, b.y)
        ctx.strokeStyle = isActive
          ? 'rgba(212,168,83,0.35)'
          : isHovered
            ? 'rgba(30,30,32,0.18)'
            : 'rgba(30,30,32,0.08)'
        ctx.lineWidth = isActive ? 1.8 : 1.2
        if (!isActive && !isHovered) {
          ctx.setLineDash([4, 4])
        } else {
          ctx.setLineDash([])
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Animate particles along edges
      for (const p of particlesRef.current) {
        p.progress += p.speed * dt
        if (p.progress > 1) {
          p.progress = 0
          p.edge = Math.floor(Math.random() * edges.length)
        }
        const [from, to] = edges[p.edge]
        const a = getPos(from)
        const b = getPos(to)
        const t = p.progress
        const px = a.x + (b.x - a.x) * t
        const py = a.y + (b.y - a.y) * t
        const alpha = Math.sin(t * Math.PI) * 0.5

        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212,168,83,${alpha})`
        ctx.fill()
      }

      animFrame.current = requestAnimationFrame(animate)
    }

    animFrame.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(animFrame.current)
      window.removeEventListener('resize', resize)
    }
  }, [nodes, edges, hoveredNode, activeNode, nodeMap, offsetX, offsetY, scale])

  return (
    <div className="fos-graph-wrap">
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
      <svg className="fos-graph-svg" viewBox="0 0 500 440" preserveAspectRatio="xMidYMid meet">
        {nodes.map(node => {
          const isHovered = hoveredNode === node.id
          const isActive = activeNode === node.id
          const isClickable = node.id === 'entscheidungen' || node.id === 'risiken'
          const color = NODE_COLORS[node.status]

          return (
            <g
              key={node.id}
              className="fos-node-group"
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
              onMouseEnter={() => onNodeHover(node.id)}
              onMouseLeave={() => onNodeHover(null)}
              onClick={() => isClickable && onNodeClick(node.id)}
            >
              {/* Hover glow */}
              {(isHovered || isActive) && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={28}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  opacity={0.15}
                  initial={{ r: 20, opacity: 0 }}
                  animate={{ r: 28, opacity: 0.15 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Pulse ring for active */}
              {isActive && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={20}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  initial={{ r: 14, opacity: 0.4 }}
                  animate={{ r: 26, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              {/* Node constellation */}
              <NodeConstellation
                cx={node.x}
                cy={node.y}
                status={node.status}
                nodeId={node.id}
                isHovered={isHovered}
                isActive={isActive}
              />

              {/* Label */}
              <text
                className="fos-node-label"
                x={node.x}
                y={node.y + 28}
                textAnchor="middle"
              >
                {node.label}
              </text>
              <text
                className="fos-node-sublabel"
                x={node.x}
                y={node.y + 42}
                textAnchor="middle"
              >
                {node.sublabel}
              </text>

              {/* Badge */}
              {node.badge && (
                <g>
                  <rect
                    x={node.x - 20}
                    y={node.y + 48}
                    width={40 + node.badge.text.length * 3}
                    height={18}
                    rx={5}
                    fill={BADGE_BG[node.badge.tone]}
                  />
                  <text
                    className="fos-node-badge"
                    x={node.x + (node.badge.text.length * 1.5)}
                    y={node.y + 60}
                    textAnchor="middle"
                    fill={BADGE_COLOR[node.badge.tone]}
                  >
                    {node.badge.text}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ── Node Constellation System ── */
interface ConstellationProps {
  cx: number
  cy: number
  status: ProjectNode['status']
  nodeId: NodeId
  isHovered: boolean
  isActive: boolean
}

const CONSTELLATIONS: Record<NodeId, { dx: number; dy: number; r: number; opacity: number }[]> = {
  dokumente: [
    { dx: -3, dy: -4, r: 2.5, opacity: 0.8 },
    { dx: 3, dy: -4, r: 2, opacity: 0.6 },
    { dx: -4, dy: 2, r: 1.5, opacity: 0.5 },
    { dx: 4, dy: 2, r: 2, opacity: 0.7 },
    { dx: 0, dy: 5, r: 1.5, opacity: 0.4 },
  ],
  zeitplan: [
    { dx: 0, dy: -5, r: 2, opacity: 0.7 },
    { dx: 4, dy: -2, r: 2.5, opacity: 0.8 },
    { dx: 4, dy: 3, r: 1.5, opacity: 0.5 },
    { dx: -4, dy: 3, r: 2, opacity: 0.6 },
    { dx: -4, dy: -2, r: 1.5, opacity: 0.4 },
  ],
  entscheidungen: [
    { dx: -3, dy: -3, r: 2.5, opacity: 0.8 },
    { dx: 3, dy: -3, r: 2.5, opacity: 0.8 },
    { dx: 0, dy: 0, r: 3, opacity: 0.9 },
    { dx: -3, dy: 3, r: 2, opacity: 0.6 },
    { dx: 3, dy: 3, r: 2, opacity: 0.6 },
  ],
  risiken: [
    { dx: -4, dy: -2, r: 3, opacity: 0.9 },
    { dx: 4, dy: -3, r: 2, opacity: 0.6 },
    { dx: 2, dy: 0, r: 2.5, opacity: 0.7 },
    { dx: -2, dy: 4, r: 2, opacity: 0.5 },
    { dx: 5, dy: 3, r: 1.5, opacity: 0.4 },
  ],
  integrationen: [
    { dx: 0, dy: -4, r: 2, opacity: 0.6 },
    { dx: 5, dy: 0, r: 2.5, opacity: 0.7 },
    { dx: 0, dy: 4, r: 2, opacity: 0.6 },
    { dx: -5, dy: 0, r: 2.5, opacity: 0.7 },
  ],
  tests: [
    { dx: -4, dy: -3, r: 1.5, opacity: 0.5 },
    { dx: 0, dy: -4, r: 2, opacity: 0.7 },
    { dx: 4, dy: -1, r: 2.5, opacity: 0.8 },
    { dx: 2, dy: 4, r: 1.5, opacity: 0.5 },
    { dx: -3, dy: 3, r: 2, opacity: 0.6 },
  ],
  deployment: [
    { dx: -5, dy: 0, r: 2, opacity: 0.6 },
    { dx: -2, dy: 0, r: 2.5, opacity: 0.8 },
    { dx: 1, dy: 0, r: 2.5, opacity: 0.8 },
    { dx: 4, dy: 0, r: 2, opacity: 0.6 },
  ],
  'naechste-schritte': [
    { dx: 0, dy: 0, r: 3.5, opacity: 0.9 },
    { dx: -5, dy: -3, r: 1.5, opacity: 0.4 },
    { dx: 5, dy: -3, r: 1.5, opacity: 0.4 },
    { dx: -5, dy: 3, r: 1.5, opacity: 0.4 },
    { dx: 5, dy: 3, r: 1.5, opacity: 0.4 },
  ],
}

function NodeConstellation({ cx, cy, status, nodeId, isHovered, isActive }: ConstellationProps) {
  const dots = CONSTELLATIONS[nodeId] || CONSTELLATIONS.dokumente
  const color = NODE_COLORS[status]
  const scale = isHovered || isActive ? 1.15 : 1

  return (
    <g>
      {dots.map((dot, i) => (
        <motion.circle
          key={i}
          cx={cx + dot.dx * scale}
          cy={cy + dot.dy * scale}
          r={dot.r * (isHovered || isActive ? 1.1 : 1)}
          fill={color}
          opacity={dot.opacity * (isHovered || isActive ? 1.2 : 1)}
          animate={{
            cx: cx + dot.dx * scale + Math.sin(Date.now() * 0.001 + i) * 0.3,
            cy: cy + dot.dy * scale + Math.cos(Date.now() * 0.001 + i * 1.3) * 0.3,
          }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
      ))}
    </g>
  )
}
