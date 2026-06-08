'use client'

/**
 * WorkspaceSymbol — generative identity mark for workspaces, projects, teams
 * and profiles.
 *
 * Per the Senior-Design-Direktive: NOT initials-in-a-circle. Each symbol is a
 * small abstract "data artifact" composed deterministically from a seed:
 *
 *   variant   — 8 visual families (cell / cluster / map / signal / artifact /
 *               orbit / grid / pixel).
 *   scheme    — 8 calm colour duets (mint, indigo, graphite, lime, sand, rose,
 *               cyan, mono).
 *   size/seed — same seed always renders the same symbol (SSR-safe). Different
 *               seeds inside the same variant + scheme produce visually
 *               distinct artifacts so we get many unique combinations.
 *
 * Pure SVG, no images, no canvas, no animation by default — calm, GPU-cheap,
 * works at 18px (sidebar) and 96px (settings picker) equally well.
 */

import { useMemo } from 'react'

export type SymbolVariant =
  | 'cell' | 'cluster' | 'map' | 'signal'
  | 'artifact' | 'orbit' | 'grid' | 'pixel'

export type SymbolScheme =
  | 'mint' | 'indigo' | 'graphite' | 'lime'
  | 'sand' | 'rose' | 'cyan' | 'mono'

export const SYMBOL_VARIANTS: SymbolVariant[] = [
  'cell', 'cluster', 'map', 'signal', 'artifact', 'orbit', 'grid', 'pixel',
]

export const SYMBOL_SCHEMES: SymbolScheme[] = [
  'mint', 'indigo', 'graphite', 'lime', 'sand', 'rose', 'cyan', 'mono',
]

// Modern vibrant gradient duets — the 2024 SaaS look (Linear/Vercel/Stripe):
// a bright diagonal gradient tile with a light foreground mark that pops.
// ink/soft are now light so the generative art reads as crisp highlights
// over saturated colour rather than muted glyphs on a dark square.
const SCHEME: Record<SymbolScheme, { bg0: string; bg1: string; ink: string; soft: string; spark: string }> = {
  mint:     { bg0: '#34D399', bg1: '#059669', ink: '#FFFFFF', soft: '#D1FAE5', spark: '#ECFDF5' },
  indigo:   { bg0: '#818CF8', bg1: '#4F46E5', ink: '#FFFFFF', soft: '#E0E7FF', spark: '#EEF2FF' },
  graphite: { bg0: '#94A3B8', bg1: '#334155', ink: '#FFFFFF', soft: '#E2E8F0', spark: '#F8FAFC' },
  lime:     { bg0: '#BEF264', bg1: '#65A30D', ink: '#1A2E05', soft: '#ECFCCB', spark: '#F7FEE7' },
  sand:     { bg0: '#FBBF24', bg1: '#D97706', ink: '#FFFFFF', soft: '#FEF3C7', spark: '#FFFBEB' },
  rose:     { bg0: '#FB7185', bg1: '#E11D48', ink: '#FFFFFF', soft: '#FFE4E6', spark: '#FFF1F2' },
  cyan:     { bg0: '#38BDF8', bg1: '#0891B2', ink: '#FFFFFF', soft: '#E0F2FE', spark: '#ECFEFF' },
  mono:     { bg0: '#52525B', bg1: '#18181B', ink: '#FFFFFF', soft: '#D4D4D8', spark: '#FAFAFA' },
}

/** Deterministic pseudo-random from a string seed (mulberry32). */
function rng(seed: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return function next() {
    h += 0x6D2B79F5; let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Props = {
  variant?: SymbolVariant
  scheme?: SymbolScheme
  size?: number
  seed?: string
  /** Subtle outer ring when selected in a picker. */
  selected?: boolean
  className?: string
}

export default function WorkspaceSymbol({
  variant = 'cell',
  scheme = 'graphite',
  size = 48,
  seed = 'festag',
  selected = false,
  className,
}: Props) {
  const id = useMemo(() => `ws-${variant}-${scheme}-${seed}`.replace(/[^a-z0-9-]/gi, ''), [variant, scheme, seed])

  const s = SCHEME[scheme]
  const r = rng(`${variant}|${scheme}|${seed}`)

  // Render each variant into the 24×24 viewBox.
  const inner = useMemo(() => renderVariant(variant, r, s), [variant, r, s])

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size,
        position: 'relative',
        boxShadow: selected ? `0 0 0 2px ${s.ink}66` : undefined,
        borderRadius: 12,
        transition: 'box-shadow .14s ease',
      }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'block', borderRadius: 12 }}>
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={s.bg0} />
            <stop offset="100%" stopColor={s.bg1} />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="0.5" cy="0.45" r="0.55">
            <stop offset="0%" stopColor={s.ink} stopOpacity="0.22" />
            <stop offset="100%" stopColor={s.ink} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="24" height="24" rx="6" fill={`url(#${id}-bg)`} />
        <rect x="0" y="0" width="24" height="24" rx="6" fill={`url(#${id}-glow)`} />
        {inner}
        {/* faint top highlight — premium depth */}
        <rect x="0" y="0" width="24" height="24" rx="6" fill="url(#__none)" stroke="rgba(255,255,255,0.05)" />
      </svg>
    </span>
  )
}

/** Each variant draws into the 24×24 viewBox. Kept small + composable. */
function renderVariant(variant: SymbolVariant, r: () => number, s: typeof SCHEME[SymbolScheme]) {
  switch (variant) {
    case 'cell':     return cellArt(r, s)
    case 'cluster':  return clusterArt(r, s)
    case 'map':      return mapArt(r, s)
    case 'signal':   return signalArt(r, s)
    case 'artifact': return artifactArt(r, s)
    case 'orbit':    return orbitArt(r, s)
    case 'grid':     return gridArt(r, s)
    case 'pixel':    return pixelArt(r, s)
  }
}

// ── Variants ───────────────────────────────────────────────────────────────

/** Company Cells — 3–5 modular data blocks, slight stagger. */
function cellArt(r: () => number, s: { ink: string; soft: string; spark: string }) {
  const cols = 3 + Math.floor(r() * 2)
  const rows = 3 + Math.floor(r() * 2)
  const cw = 18 / cols, ch = 18 / rows
  const cells: React.ReactNode[] = []
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (r() < 0.45) continue
    const isInk = r() < 0.18
    cells.push(
      <rect key={`${x}-${y}`}
        x={3 + x * cw} y={3 + y * ch}
        width={cw - 0.8} height={ch - 0.8}
        rx="0.8"
        fill={isInk ? s.ink : s.soft}
        opacity={isInk ? 0.95 : 0.55}
      />
    )
  }
  return <>{cells}</>
}

/** Memory Clusters — many small dots forming a soft cloud. */
function clusterArt(r: () => number, s: { ink: string; soft: string }) {
  const count = 28 + Math.floor(r() * 12)
  const cx = 12 + (r() - 0.5) * 1.2
  const cy = 12 + (r() - 0.5) * 1.2
  const dots: React.ReactNode[] = []
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2
    const radius = Math.pow(r(), 0.7) * 7
    const x = cx + Math.cos(a) * radius
    const y = cy + Math.sin(a) * radius
    const ink = r() < 0.22
    dots.push(<circle key={i} cx={x} cy={y} r={ink ? 0.55 : 0.4} fill={ink ? s.ink : s.soft} opacity={ink ? 0.95 : 0.5} />)
  }
  return <>{dots}</>
}

/** Knowledge Maps — soft islands suggestive of an isometric land map. */
function mapArt(r: () => number, s: { ink: string; soft: string }) {
  const blobs: React.ReactNode[] = []
  for (let i = 0; i < 3; i++) {
    const cx = 5 + r() * 14
    const cy = 5 + r() * 14
    const rx = 2 + r() * 3
    const ry = 1.5 + r() * 2.5
    blobs.push(<ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={i === 0 ? s.ink : s.soft} opacity={i === 0 ? 0.85 : 0.45} />)
  }
  // dotted connections
  for (let i = 0; i < 5; i++) {
    blobs.push(<circle key={`d${i}`} cx={4 + r() * 16} cy={4 + r() * 16} r={0.3} fill={s.ink} opacity={0.6} />)
  }
  return <>{blobs}</>
}

/** Signal Marks — concentric arcs + a pulse dot. */
function signalArt(r: () => number, s: { ink: string; soft: string; spark: string }) {
  const arcs: React.ReactNode[] = []
  const cx = 12, cy = 12
  const start = 2 + r() * 1.5
  for (let i = 0; i < 3; i++) {
    const rad = start + i * 2.4
    arcs.push(
      <path key={i}
        d={`M ${cx - rad} ${cy} A ${rad} ${rad} 0 0 1 ${cx + rad} ${cy}`}
        stroke={s.soft} strokeWidth="0.6" fill="none" opacity={0.55 - i * 0.12}
      />
    )
  }
  arcs.push(<circle key="core" cx={cx} cy={cy} r="1.4" fill={s.ink} />)
  arcs.push(<circle key="spark" cx={cx} cy={cy} r="0.5" fill={s.spark} />)
  return <>{arcs}</>
}

/** Data Artifacts — small isometric stack of slabs. */
function artifactArt(r: () => number, s: { ink: string; soft: string }) {
  const layers: React.ReactNode[] = []
  const baseY = 13 + (r() - 0.5)
  for (let i = 0; i < 3; i++) {
    const y = baseY - i * 2.2
    const w = 10 - i * 1.6
    const cx = 12 + (r() - 0.5) * 0.8
    const ink = i === 2
    layers.push(
      <polygon key={i}
        points={`${cx - w / 2},${y} ${cx},${y - 2} ${cx + w / 2},${y} ${cx},${y + 2}`}
        fill={ink ? s.ink : s.soft}
        opacity={ink ? 0.95 : 0.55 + i * 0.1}
      />
    )
  }
  return <>{layers}</>
}

/** Orbit Marks — one big ring + 2–3 satellite dots. */
function orbitArt(r: () => number, s: { ink: string; soft: string; spark: string }) {
  const cx = 12, cy = 12
  const rad = 5 + r() * 1.5
  const sats: React.ReactNode[] = [
    <circle key="ring" cx={cx} cy={cy} r={rad} fill="none" stroke={s.soft} strokeWidth="0.55" opacity="0.7" />,
    <circle key="core" cx={cx} cy={cy} r="1.2" fill={s.ink} />,
  ]
  const n = 2 + Math.floor(r() * 2)
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2
    sats.push(<circle key={`s${i}`} cx={cx + Math.cos(a) * rad} cy={cy + Math.sin(a) * rad} r={i === 0 ? 0.85 : 0.55} fill={i === 0 ? s.spark : s.ink} />)
  }
  return <>{sats}</>
}

/** Grid Fragments — fine 6×6 grid, a few cells highlighted. */
function gridArt(r: () => number, s: { ink: string; soft: string }) {
  const N = 6
  const cell = 16 / N
  const out: React.ReactNode[] = []
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    out.push(
      <circle key={`${x}-${y}`}
        cx={4 + cell * (x + 0.5)} cy={4 + cell * (y + 0.5)} r="0.4"
        fill={r() < 0.12 ? s.ink : s.soft}
        opacity={r() < 0.12 ? 0.95 : 0.35}
      />
    )
  }
  return <>{out}</>
}

/** Pixel Organisms — a small connected pixel form. */
function pixelArt(r: () => number, s: { ink: string; soft: string }) {
  // Walk a small chain of pixels for an organic, connected shape.
  const N = 5
  const cell = 16 / N
  const taken = new Set<string>()
  const cells: React.ReactNode[] = []
  let cx = Math.floor(N / 2), cy = Math.floor(N / 2)
  for (let i = 0; i < 12; i++) {
    const key = `${cx}-${cy}`
    if (!taken.has(key) && cx >= 0 && cy >= 0 && cx < N && cy < N) {
      taken.add(key)
      const ink = i < 3 || r() < 0.18
      cells.push(
        <rect key={key}
          x={4 + cx * cell} y={4 + cy * cell}
          width={cell - 0.4} height={cell - 0.4} rx="0.6"
          fill={ink ? s.ink : s.soft}
          opacity={ink ? 0.92 : 0.55}
        />
      )
    }
    const d = Math.floor(r() * 4)
    if (d === 0) cx++; else if (d === 1) cx--; else if (d === 2) cy++; else cy--
  }
  return <>{cells}</>
}
