'use client'

import { Buildings, Check, CreditCard, EnvelopeSimple } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'

type Props = {
  phase: 'gather' | 'success'
  size?: 'modal' | 'page'
  title?: string
  subtitle?: string
}

const SATELLITES = [
  { Icon: Buildings, delay: 0 },
  { Icon: EnvelopeSimple, delay: 0.14 },
  { Icon: CreditCard, delay: 0.28 },
] as const

export default function IssuerSyncAnimation({
  phase,
  size = 'modal',
  title,
  subtitle,
}: Props) {
  const reduceMotion = useReducedMotion()
  const isPage = size === 'page'
  const iconSize = isPage ? 18 : 16
  const checkSize = isPage ? 28 : 24

  const defaultTitle = phase === 'success'
    ? 'Rechnungsdaten gespeichert'
    : 'Angaben werden vorbereitet…'
  const defaultSubtitle = phase === 'success'
    ? 'Erscheinen automatisch auf jeder Rechnung.'
    : 'Name, Adresse und Bankverbindung an einem Ort.'

  return (
    <div className={`isa isa--${size} isa--${phase}`} role="status" aria-live="polite">
      <div className="isa-visual" aria-hidden>
        {phase === 'gather' ? (
          <div className={`isa-orbit${reduceMotion ? ' isa-orbit--static' : ''}`}>
            <motion.span
              className="isa-ring"
              animate={reduceMotion ? undefined : { scale: [1, 1.05, 1], opacity: [0.45, 0.8, 0.45] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="isa-core" />
            {SATELLITES.map(({ Icon, delay }, index) => (
              <motion.span
                key={index}
                className={`isa-chip isa-chip--${index + 1}`}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.55 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay,
                  duration: 0.45,
                  type: 'spring',
                  stiffness: 320,
                  damping: 24,
                }}
              >
                <Icon size={iconSize} weight="regular" />
              </motion.span>
            ))}
          </div>
        ) : (
          <motion.span
            className="isa-success"
            initial={reduceMotion ? false : { scale: 0.78, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.85 }}
          >
            <Check className="isa-check" size={checkSize} weight="bold" />
          </motion.span>
        )}
      </div>

      <motion.p
        className="isa-title"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: phase === 'success' ? 0.12 : 0.22, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        {title ?? defaultTitle}
      </motion.p>
      <motion.p
        className="isa-sub"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: phase === 'success' ? 0.24 : 0.34, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        {subtitle ?? defaultSubtitle}
      </motion.p>

      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
  .isa {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 10px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
  }
  .isa--modal {
    min-height: 220px;
    padding: 28px 12px 16px;
  }
  .isa--page {
    min-height: 280px;
    padding: 36px 20px 28px;
  }

  .isa-visual {
    position: relative;
    width: 132px;
    height: 132px;
    margin-bottom: 6px;
  }
  .isa--page .isa-visual {
    width: 148px;
    height: 148px;
    margin-bottom: 10px;
  }

  .isa-orbit {
    position: absolute;
    inset: 0;
  }
  .isa-ring {
    position: absolute;
    inset: 22px;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--fp-text, #18181b) 10%, transparent);
    background: radial-gradient(circle, color-mix(in srgb, var(--fp-pill, #e4e4e7) 32%, transparent) 0%, transparent 70%);
  }
  .isa-core {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 6px;
    height: 6px;
    margin: -3px 0 0 -3px;
    border-radius: 50%;
    background: var(--fp-text, #18181b);
    opacity: 0.14;
  }
  .isa-chip {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 34px;
    height: 34px;
    margin: -17px 0 0 -17px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--fp-soft, #52525b);
    background: var(--fp-bg, #fafafa);
    border: 1px solid color-mix(in srgb, var(--fp-border, rgba(24,24,27,.08)) 80%, transparent);
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
  }
  .isa--page .isa-chip {
    width: 40px;
    height: 40px;
    margin: -20px 0 0 -20px;
  }

  .isa-orbit:not(.isa-orbit--static) .isa-chip--1 {
    animation: isaOrbit1 2.8s cubic-bezier(.45,.05,.25,1) infinite;
  }
  .isa-orbit:not(.isa-orbit--static) .isa-chip--2 {
    animation: isaOrbit2 2.8s cubic-bezier(.45,.05,.25,1) infinite;
  }
  .isa-orbit:not(.isa-orbit--static) .isa-chip--3 {
    animation: isaOrbit3 2.8s cubic-bezier(.45,.05,.25,1) infinite;
  }

  @keyframes isaOrbit1 {
    0%, 100% { transform: rotate(0deg) translateX(46px) rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) translateX(46px) rotate(-180deg) scale(0.92); }
  }
  @keyframes isaOrbit2 {
    0%, 100% { transform: rotate(120deg) translateX(46px) rotate(-120deg) scale(1); }
    50% { transform: rotate(300deg) translateX(46px) rotate(-300deg) scale(0.92); }
  }
  @keyframes isaOrbit3 {
    0%, 100% { transform: rotate(240deg) translateX(46px) rotate(-240deg) scale(1); }
    50% { transform: rotate(420deg) translateX(46px) rotate(-420deg) scale(0.92); }
  }

  .isa--success .isa-orbit .isa-chip {
    animation: isaConverge 0.75s cubic-bezier(.16,1,.3,1) forwards;
  }
  @keyframes isaConverge {
    to { transform: translate(0, 0) scale(0.4); opacity: 0; }
  }

  .isa-success {
    position: absolute;
    inset: 22px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, #22a06b 14%, transparent);
    color: #22a06b;
    box-shadow: 0 0 0 1px color-mix(in srgb, #22a06b 22%, transparent);
  }
  html[data-theme="dark"] .isa-success,
  html[data-theme="classic-dark"] .isa-success {
    background: color-mix(in srgb, #4ade80 12%, transparent);
    color: #4ade80;
    box-shadow: 0 0 0 1px color-mix(in srgb, #4ade80 20%, transparent);
  }
  .isa-check path {
    stroke-dasharray: 28;
    stroke-dashoffset: 28;
    animation: isaCheckDraw 0.48s 0.1s cubic-bezier(.16,1,.3,1) forwards;
  }
  @keyframes isaCheckDraw {
    to { stroke-dashoffset: 0; }
  }

  .isa-title {
    margin: 0;
    font-size: 16px;
    font-weight: 400;
    letter-spacing: -0.025em;
    line-height: 1.3;
    color: var(--fp-text, #18181b);
  }
  .isa--page .isa-title {
    font-size: 19px;
  }
  .isa-sub {
    margin: 0;
    max-width: 340px;
    font-size: 12.5px;
    font-weight: 400;
    line-height: 1.55;
    color: var(--fp-muted, #71717a);
  }
  .isa--page .isa-sub {
    font-size: 14px;
    max-width: 420px;
  }

  @media (prefers-reduced-motion: reduce) {
    .isa-orbit .isa-chip { animation: none !important; }
    .isa-chip--1 { transform: translate(-28px, -18px); }
    .isa-chip--2 { transform: translate(26px, -8px); }
    .isa-chip--3 { transform: translate(-4px, 30px); }
    .isa-check path { animation: none; stroke-dashoffset: 0; }
  }
`
