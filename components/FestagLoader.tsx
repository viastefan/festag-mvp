'use client'

/**
 * Festag transitional loader — clean mark + status.
 * Replaces the old cube-pixel assemble animation (rectangular wireframe artifacts).
 */

import { motion, useReducedMotion } from 'framer-motion'

type Props = { fullscreen?: boolean; label?: string }

const EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function FestagLoader({ fullscreen = false, label }: Props) {
  const reduced = useReducedMotion()

  return (
    <div
      className={`fl-wrap${fullscreen ? ' fl-full' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={label || 'Festag wird geladen'}
    >
      <style>{CSS}</style>
      <div className="fl-wash" aria-hidden="true" />
      <div className="fl-stage">
        <motion.span
          className="fl-mark"
          aria-hidden="true"
          initial={reduced ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: EXPO }}
        />
        {label ? (
          <motion.p
            className="fl-label"
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: EXPO }}
          >
            {label}
          </motion.p>
        ) : null}
      </div>
    </div>
  )
}

const CSS = `
.fl-wrap {
  --fl-bg: #F4F0E8;
  --fl-mark: linear-gradient(160deg, #3a3a40 0%, #1e1e20 58%, #2a2a2e 100%);
  --fl-label: #5c574e;
  width: 100%;
  height: 100%;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: var(--fl-bg);
  font-family: var(--font-aeonik, 'Aeonik', system-ui, sans-serif);
}
html[data-theme="dark"] .fl-wrap,
html[data-theme="classic-dark"] .fl-wrap {
  --fl-bg: #000000;
  --fl-mark: linear-gradient(160deg, #f7f8fa 0%, #dfe3ea 52%, #f0f2f5 100%);
  --fl-label: rgba(228, 228, 234, 0.62);
}
.fl-full {
  position: fixed;
  inset: 0;
  z-index: 9999;
  min-height: 100%;
}
.fl-wash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 90% 65% at 14% 8%, rgba(236, 176, 128, 0.20), transparent 58%),
    radial-gradient(ellipse 55% 45% at 84% 14%, rgba(91, 100, 125, 0.10), transparent 55%),
    radial-gradient(ellipse 75% 55% at 88% 88%, rgba(220, 154, 108, 0.12), transparent 60%);
}
html[data-theme="dark"] .fl-wash,
html[data-theme="classic-dark"] .fl-wash {
  background:
    radial-gradient(ellipse 100% 75% at 6% -8%, rgba(188, 128, 72, 0.22), transparent 56%),
    radial-gradient(ellipse 85% 60% at 94% 16%, rgba(150, 104, 62, 0.12), transparent 58%);
}
.fl-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.fl-mark {
  display: block;
  width: 64px;
  height: 64px;
  -webkit-mask-image: url(/brand/festag-mark.png?v=20260727-cutout);
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-mode: alpha;
  mask-image: url(/brand/festag-mark.png?v=20260727-cutout);
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-mode: alpha;
  background: var(--fl-mark);
  animation: flBreath 2.4s ease-in-out infinite;
}
.fl-label {
  margin: 0;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.4;
  color: var(--fl-label);
  text-align: center;
}
@keyframes flBreath {
  0%, 100% { opacity: 0.88; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.03); }
}
@media (prefers-reduced-motion: reduce) {
  .fl-mark { animation: none !important; }
}
`
