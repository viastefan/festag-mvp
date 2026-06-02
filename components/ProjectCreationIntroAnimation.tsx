'use client'

import { ArrowRight, Buildings, ListChecks, Sparkle, UsersThree } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useState } from 'react'
import { useTypewriter } from '@/hooks/useTypewriter'

type ProjectCreationIntroAnimationProps = {
  variant?: 'stage' | 'teaser'
  className?: string
}

const ACCENT = '#6a738c'
const TITLE = 'Festag Client Portal'
const DESCRIPTION = 'Ein zentrales Kundenportal mit Projektstatus, Aufgaben, Updates und klarer Kommunikation.'

const COLORS = ['#6a738c', '#53616f', '#2f6f89', '#3f7d63', '#8a754d', '#994a55', '#5f6c82']

export default function ProjectCreationIntroAnimation({
  variant = 'stage',
  className = '',
}: ProjectCreationIntroAnimationProps) {
  const reduceMotion = useReducedMotion()
  const compact = variant === 'teaser'
  const pixelId = useId().replace(/:/g, '')
  const pixelMaskId = `pciPixelMask${pixelId}`
  const pixelPatternId = `pciPixelPattern${pixelId}`
  const [titleStarted, setTitleStarted] = useState(false)
  const [colorSelected, setColorSelected] = useState(false)
  const [descriptionStarted, setDescriptionStarted] = useState(false)
  const [milestonesVisible, setMilestonesVisible] = useState(false)
  const [ctaActive, setCtaActive] = useState(false)

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = []
    if (reduceMotion) {
      setTitleStarted(true)
      setColorSelected(true)
      setDescriptionStarted(true)
      setMilestonesVisible(true)
      setCtaActive(true)
      return () => {}
    }

    timers.push(setTimeout(() => setTitleStarted(true), compact ? 160 : 2180))
    return () => timers.forEach(clearTimeout)
  }, [compact, reduceMotion])

  const { value: typedTitle, done: titleDone } = useTypewriter(TITLE, {
    start: titleStarted,
    speed: compact ? 26 : 52,
  })

  const { value: typedDescription, done: descriptionDone } = useTypewriter(DESCRIPTION, {
    start: descriptionStarted,
    speed: compact ? 14 : 28,
  })

  useEffect(() => {
    if (!titleDone) return
    const colorTimer = setTimeout(() => setColorSelected(true), compact ? 60 : 240)
    const descriptionTimer = setTimeout(() => setDescriptionStarted(true), compact ? 150 : 720)
    return () => {
      clearTimeout(colorTimer)
      clearTimeout(descriptionTimer)
    }
  }, [compact, titleDone])

  useEffect(() => {
    if (!descriptionDone) return
    const milestonesTimer = setTimeout(() => setMilestonesVisible(true), compact ? 80 : 320)
    const ctaTimer = setTimeout(() => setCtaActive(true), compact ? 160 : 860)
    return () => {
      clearTimeout(milestonesTimer)
      clearTimeout(ctaTimer)
    }
  }, [compact, descriptionDone])

  const animationDuration = compact ? 0.92 : 3

  return (
    <div className={`pci pci-${variant} ${className}`} aria-label="Festag Projektstart Animation">
      <div className="pci-depth" aria-hidden />
      {compact ? (
        <div className="pci-pixel-visual" aria-hidden>
          <svg className="pci-pixel-wordmark" viewBox="0 0 280 94" role="img">
            <defs>
              <pattern id={pixelPatternId} width="8" height="8" patternUnits="userSpaceOnUse">
                <rect className="pci-pixel-square" x="1.2" y="1.2" width="4.9" height="4.9" rx=".7" />
              </pattern>
              <mask id={pixelMaskId}>
                <rect width="280" height="94" fill="black" />
                <text className="pci-pixel-mask-text" x="26" y="61">
                  festag
                </text>
              </mask>
            </defs>
            <rect className="pci-pixel-panel" x="15" y="11" width="250" height="72" rx="16" />
            <path className="pci-pixel-line one" d="M24 27 H244" />
            <path className="pci-pixel-line two" d="M18 50 H254" />
            <rect
              className="pci-pixel-word"
              width="280"
              height="94"
              fill={`url(#${pixelPatternId})`}
              mask={`url(#${pixelMaskId})`}
            />
            <rect className="pci-pixel-accent" x="27" y="68" width="86" height="5" rx="2.5" />
            <rect className="pci-pixel-accent is-soft" x="120" y="68" width="36" height="5" rx="2.5" />
          </svg>
        </div>
      ) : (
        <motion.div
          className="pci-modal"
          initial={
            reduceMotion
              ? false
              : { rotateX: 58, rotateZ: -7, rotateY: -4, scale: 1.15, y: 40, opacity: 0.72 }
          }
          animate={{ rotateX: 0, rotateZ: 0, rotateY: 0, scale: 1, y: 0, opacity: 1 }}
          transition={{ duration: animationDuration, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="pci-head">
            <span>NEUES PROJEKT</span>
            <h2>Was möchtest du umsetzen?</h2>
          </div>

          <div className="pci-title-row">
            <span className="pci-title-line" />
            <div className="pci-title-stack">
              <div className={`pci-title-placeholder ${titleStarted ? 'is-hidden' : ''}`}>Projektname</div>
              <div className="pci-title-value">
                {typedTitle}
                {titleStarted && !titleDone ? <span className="pci-cursor" /> : null}
              </div>
              <div className="pci-colors" aria-hidden>
                {COLORS.map((color, index) => {
                  const selected = index === 0 && colorSelected
                  return (
                    <motion.span
                      key={color}
                      className={selected ? 'is-selected' : ''}
                      style={{ background: color }}
                      animate={selected ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                      transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )
                })}
              </div>
            </div>
          </div>

          <section className="pci-actions" aria-label="Umsetzung">
            <div className="pci-label">UMSETZUNG</div>
            <div className="pci-button-row">
              <button className="is-selected" type="button">
                <Sparkle size={15} weight="bold" />
                Festag-Entwickler finden
              </button>
              <button type="button">
                <UsersThree size={15} />
                Eigenes Team
              </button>
              <button type="button">
                <Buildings size={15} />
                White-Label
              </button>
            </div>
          </section>

          <div className="pci-description">
            <span className={`pci-description-placeholder ${descriptionStarted ? 'is-hidden' : ''}`}>
              Schreibe eine Beschreibung, ein Projektbriefing oder sammle Ideen...
            </span>
            <p>
              {typedDescription}
              {descriptionStarted && !descriptionDone ? <span className="pci-cursor" /> : null}
            </p>
          </div>

          <motion.div
            className="pci-milestones"
            initial={false}
            animate={milestonesVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
          >
            <ListChecks size={18} />
            <div>
              <strong>Meilensteine</strong>
              <span>Optional vorbereiten</span>
            </div>
            <span className="pci-plus">+</span>
          </motion.div>

          <div className="pci-footer">
            <button type="button">Abbrechen</button>
            <button className={ctaActive ? 'is-active' : ''} type="button">
              Mit Tagro schreiben
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      <style jsx>{`
        .pci {
          --pci-accent:${ACCENT};
          position:relative;
          width:100%;
          min-height:100%;
          overflow:hidden;
          isolation:isolate;
          background:
            radial-gradient(820px 440px at 53% 30%, rgba(106,115,140,.13), transparent 58%),
            linear-gradient(135deg, #0b1118 0%, #0d141d 45%, #101821 100%);
          perspective:1200px;
          transform:translateZ(0);
        }
        .pci::before,
        .pci::after {
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          z-index:2;
        }
        .pci::before {
          background:
            radial-gradient(70% 78% at 50% 42%, transparent 40%, rgba(4,7,11,.72) 100%),
            linear-gradient(90deg, rgba(4,7,11,.62), transparent 26%, transparent 72%, rgba(4,7,11,.68));
        }
        .pci::after {
          background:linear-gradient(180deg, rgba(255,255,255,.025), transparent 22%, rgba(0,0,0,.24));
          mix-blend-mode:screen;
          opacity:.38;
        }
        .pci-depth {
          position:absolute;
          inset:-18%;
          z-index:0;
          background:
            linear-gradient(105deg, transparent 0 46%, rgba(174,190,215,.045) 46.2% 46.7%, transparent 47%),
            repeating-linear-gradient(170deg, rgba(184,197,218,.045) 0 1px, transparent 1px 54px);
          opacity:.42;
          transform:rotate(-7deg) scale(1.1);
          filter:blur(.2px);
        }
        .pci-modal {
          position:absolute;
          z-index:1;
          left:50%;
          top:50%;
          width:min(860px, 88%);
          min-height:520px;
          padding:34px 40px 0;
          display:flex;
          flex-direction:column;
          border-radius:22px;
          border:1px solid rgba(205,220,244,.09);
          background:rgba(20,26,35,.88);
          box-shadow:
            0 1px 0 rgba(255,255,255,.035) inset,
            0 24px 80px rgba(0,0,0,.22);
          backdrop-filter:blur(8px);
          transform-origin:center center;
          translate:-50% -50%;
          color:#e8edf4;
        }
        .pci-head span,
        .pci-label {
          display:block;
          color:rgba(202,211,226,.54);
          font-size:12px;
          line-height:1;
          font-weight:500;
          letter-spacing:.18em;
        }
        .pci-head h2 {
          margin:12px 0 34px;
          font-size:24px;
          line-height:1.15;
          color:#f4f7fb;
          font-weight:500;
          letter-spacing:0;
        }
        .pci-title-row {
          display:flex;
          align-items:flex-start;
          gap:18px;
          margin-bottom:36px;
        }
        .pci-title-line {
          width:3px;
          height:56px;
          border-radius:999px;
          background:var(--pci-accent);
          box-shadow:0 0 0 1px rgba(106,115,140,.16);
          flex:0 0 auto;
        }
        .pci-title-stack {
          min-width:0;
          flex:1;
          padding-top:2px;
        }
        .pci-title-placeholder,
        .pci-title-value {
          min-height:44px;
          font-size:35px;
          line-height:1.06;
          font-weight:500;
          letter-spacing:0;
        }
        .pci-title-placeholder {
          position:absolute;
          color:rgba(216,222,234,.28);
          transition:opacity .28s ease, transform .28s ease;
        }
        .pci-title-placeholder.is-hidden {
          opacity:0;
          transform:translateY(-8px);
        }
        .pci-title-value {
          color:#e8edf4;
          white-space:nowrap;
        }
        .pci-cursor {
          display:inline-block;
          width:2px;
          height:.88em;
          margin-left:3px;
          transform:translateY(.1em);
          border-radius:999px;
          background:var(--pci-accent);
          animation:pciBlink .78s steps(2, start) infinite;
        }
        @keyframes pciBlink {
          50% { opacity:0; }
        }
        .pci-colors {
          display:flex;
          gap:14px;
          align-items:center;
          margin-top:11px;
        }
        .pci-colors span {
          width:36px;
          height:4px;
          border-radius:999px;
          position:relative;
          box-shadow:none;
        }
        .pci-colors span.is-selected::after {
          content:"";
          position:absolute;
          inset:-5px;
          border-radius:999px;
          border:1px solid rgba(106,115,140,.85);
          box-shadow:0 0 0 4px rgba(106,115,140,.12);
        }
        .pci-actions {
          margin-bottom:42px;
        }
        .pci-button-row {
          display:flex;
          flex-wrap:wrap;
          gap:12px;
          margin-top:16px;
        }
        .pci-button-row button {
          height:39px;
          display:inline-flex;
          align-items:center;
          gap:9px;
          padding:0 17px;
          border-radius:8px;
          border:1px solid rgba(205,220,244,.09);
          background:rgba(15,21,30,.44);
          color:rgba(229,234,243,.78);
          font:inherit;
          font-size:14px;
          letter-spacing:0;
          box-shadow:none;
        }
        .pci-button-row button.is-selected {
          border-color:rgba(106,115,140,.48);
          background:rgba(106,115,140,.12);
          color:#eef2f7;
        }
        .pci-description {
          position:relative;
          min-height:172px;
          padding-top:2px;
          color:rgba(226,232,240,.86);
        }
        .pci-description-placeholder {
          position:absolute;
          left:0;
          top:0;
          color:rgba(216,222,234,.28);
          font-size:23px;
          line-height:1.35;
          letter-spacing:0;
          transition:opacity .3s ease, transform .3s ease;
        }
        .pci-description-placeholder.is-hidden {
          opacity:0;
          transform:translateY(-8px);
        }
        .pci-description p {
          max-width:760px;
          margin:0;
          color:#dfe5ee;
          font-size:21px;
          line-height:1.42;
          letter-spacing:0;
        }
        .pci-milestones {
          min-height:76px;
          display:flex;
          align-items:center;
          gap:16px;
          padding:0 20px;
          border-radius:10px;
          border:1px solid rgba(205,220,244,.08);
          color:rgba(213,221,234,.64);
          background:rgba(13,18,26,.24);
          margin-top:auto;
        }
        .pci-milestones strong,
        .pci-milestones span {
          display:block;
          letter-spacing:0;
        }
        .pci-milestones strong {
          margin-bottom:4px;
          color:#e8edf4;
          font-size:16px;
        }
        .pci-milestones span {
          color:rgba(209,218,231,.56);
          font-size:14px;
        }
        .pci-plus {
          margin-left:auto;
          color:rgba(213,221,234,.58);
          font-size:27px !important;
          line-height:1;
        }
        .pci-footer {
          height:80px;
          margin:28px -40px 0;
          padding:0 26px;
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:12px;
          background:rgba(12,17,25,.5);
          border-top:1px solid rgba(205,220,244,.055);
          border-radius:0 0 22px 22px;
        }
        .pci-footer button {
          height:43px;
          min-width:132px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          border-radius:8px;
          border:1px solid rgba(205,220,244,.08);
          background:rgba(14,20,29,.55);
          color:rgba(226,232,240,.68);
          font:inherit;
          font-size:15px;
          letter-spacing:0;
          transition:background .55s cubic-bezier(.16,1,.3,1), color .55s cubic-bezier(.16,1,.3,1), box-shadow .55s cubic-bezier(.16,1,.3,1), border-color .55s cubic-bezier(.16,1,.3,1);
        }
        .pci-footer button.is-active {
          border-color:rgba(106,115,140,.72);
          background:#6a738c;
          color:#f8fafc;
          box-shadow:0 0 24px rgba(106,115,140,.18);
        }
        .pci-teaser {
          min-height:94px;
          height:94px;
          border-radius:18px 18px 0 0;
          pointer-events:none;
        }
        .pci-pixel-visual {
          position:absolute;
          inset:0;
          z-index:1;
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        }
        .pci-pixel-wordmark {
          width:100%;
          height:100%;
          display:block;
          color:rgba(232,237,244,.86);
          transform:translate3d(0,0,0);
        }
        .pci-pixel-panel {
          fill:rgba(15,22,31,.28);
          stroke:rgba(205,220,244,.06);
          stroke-width:1;
        }
        .pci-pixel-line {
          fill:none;
          stroke:rgba(210,222,241,.055);
          stroke-width:1;
        }
        .pci-pixel-line.one { transform:translateY(-1px); }
        .pci-pixel-line.two { opacity:.72; }
        .pci-pixel-square {
          fill:currentColor;
        }
        .pci-pixel-mask-text {
          fill:white;
          font-family:var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size:47px;
          font-weight:500;
          letter-spacing:-.01em;
          dominant-baseline:auto;
        }
        .pci-pixel-word {
          opacity:.92;
          filter:drop-shadow(0 8px 18px rgba(0,0,0,.12));
        }
        .pci-pixel-accent {
          fill:rgba(106,115,140,.62);
        }
        .pci-pixel-accent.is-soft {
          fill:rgba(232,237,244,.22);
        }
        :global([data-theme="light"]) .pci-pixel-wordmark,
        :global([data-theme="pure-light"]) .pci-pixel-wordmark,
        :global([data-theme="read"]) .pci-pixel-wordmark {
          color:rgba(32,37,50,.74);
        }
        :global([data-theme="light"]) .pci-pixel-panel,
        :global([data-theme="pure-light"]) .pci-pixel-panel,
        :global([data-theme="read"]) .pci-pixel-panel {
          fill:rgba(255,255,255,.34);
          stroke:rgba(106,115,140,.10);
        }
        :global([data-theme="light"]) .pci-pixel-line,
        :global([data-theme="pure-light"]) .pci-pixel-line,
        :global([data-theme="read"]) .pci-pixel-line {
          stroke:rgba(106,115,140,.11);
        }
        :global([data-theme="light"]) .pci-pixel-accent,
        :global([data-theme="pure-light"]) .pci-pixel-accent,
        :global([data-theme="read"]) .pci-pixel-accent {
          fill:rgba(106,115,140,.52);
        }
        :global([data-theme="light"]) .pci-pixel-accent.is-soft,
        :global([data-theme="pure-light"]) .pci-pixel-accent.is-soft,
        :global([data-theme="read"]) .pci-pixel-accent.is-soft {
          fill:rgba(32,37,50,.16);
        }
        .pci-teaser .pci-modal {
          left:12px;
          top:7px;
          translate:0 0;
          width:250px;
          min-height:174px;
          padding:12px 14px 0;
          border-radius:13px;
          background:rgba(19,25,34,.84);
          box-shadow:0 10px 34px rgba(0,0,0,.13);
          transform-origin:left top;
        }
        :global([data-theme="light"]) .pci-teaser,
        :global([data-theme="pure-light"]) .pci-teaser,
        :global([data-theme="read"]) .pci-teaser {
          background:
            radial-gradient(260px 150px at 70% 14%, rgba(106,115,140,.12), transparent 56%),
            linear-gradient(135deg, #edf2f7 0%, #f8fafc 58%, #ffffff 100%);
        }
        :global([data-theme="light"]) .pci-teaser::before,
        :global([data-theme="pure-light"]) .pci-teaser::before,
        :global([data-theme="read"]) .pci-teaser::before {
          background:
            radial-gradient(80% 86% at 50% 44%, transparent 42%, rgba(106,115,140,.20) 100%),
            linear-gradient(90deg, rgba(106,115,140,.14), transparent 24%, transparent 74%, rgba(106,115,140,.16));
        }
        :global([data-theme="light"]) .pci-teaser::after,
        :global([data-theme="pure-light"]) .pci-teaser::after,
        :global([data-theme="read"]) .pci-teaser::after {
          opacity:.16;
        }
        :global([data-theme="light"]) .pci-teaser .pci-depth,
        :global([data-theme="pure-light"]) .pci-teaser .pci-depth,
        :global([data-theme="read"]) .pci-teaser .pci-depth {
          opacity:.26;
        }
        :global([data-theme="light"]) .pci-teaser .pci-modal,
        :global([data-theme="pure-light"]) .pci-teaser .pci-modal,
        :global([data-theme="read"]) .pci-teaser .pci-modal {
          background:rgba(255,255,255,.78);
          border-color:rgba(106,115,140,.16);
          color:#202532;
          box-shadow:0 10px 30px rgba(15,23,42,.08);
        }
        :global([data-theme="light"]) .pci-teaser .pci-head span,
        :global([data-theme="light"]) .pci-teaser .pci-label,
        :global([data-theme="pure-light"]) .pci-teaser .pci-head span,
        :global([data-theme="pure-light"]) .pci-teaser .pci-label,
        :global([data-theme="read"]) .pci-teaser .pci-head span,
        :global([data-theme="read"]) .pci-teaser .pci-label {
          color:rgba(78,85,103,.52);
        }
        :global([data-theme="light"]) .pci-teaser .pci-head h2,
        :global([data-theme="light"]) .pci-teaser .pci-title-value,
        :global([data-theme="pure-light"]) .pci-teaser .pci-head h2,
        :global([data-theme="pure-light"]) .pci-teaser .pci-title-value,
        :global([data-theme="read"]) .pci-teaser .pci-head h2,
        :global([data-theme="read"]) .pci-teaser .pci-title-value {
          color:#202532;
        }
        :global([data-theme="light"]) .pci-teaser .pci-title-placeholder,
        :global([data-theme="light"]) .pci-teaser .pci-description-placeholder,
        :global([data-theme="pure-light"]) .pci-teaser .pci-title-placeholder,
        :global([data-theme="pure-light"]) .pci-teaser .pci-description-placeholder,
        :global([data-theme="read"]) .pci-teaser .pci-title-placeholder,
        :global([data-theme="read"]) .pci-teaser .pci-description-placeholder {
          color:rgba(78,85,103,.36);
        }
        :global([data-theme="light"]) .pci-teaser .pci-description p,
        :global([data-theme="pure-light"]) .pci-teaser .pci-description p,
        :global([data-theme="read"]) .pci-teaser .pci-description p {
          color:#4e5567;
        }
        .pci-teaser .pci-head span,
        .pci-teaser .pci-label {
          font-size:6px;
        }
        .pci-teaser .pci-head h2 {
          margin:5px 0 12px;
          font-size:12px;
        }
        .pci-teaser .pci-title-row {
          gap:7px;
          margin-bottom:10px;
        }
        .pci-teaser .pci-title-line {
          width:2px;
          height:24px;
        }
        .pci-teaser .pci-title-placeholder,
        .pci-teaser .pci-title-value {
          min-height:18px;
          font-size:15px;
        }
        .pci-teaser .pci-colors {
          gap:5px;
          margin-top:5px;
        }
        .pci-teaser .pci-colors span {
          width:14px;
          height:2px;
        }
        .pci-teaser .pci-actions {
          margin-bottom:10px;
        }
        .pci-teaser .pci-button-row {
          gap:5px;
          margin-top:6px;
        }
        .pci-teaser .pci-button-row button {
          height:20px;
          gap:5px;
          padding:0 7px;
          font-size:7px;
          border-radius:6px;
        }
        .pci-teaser .pci-button-row svg {
          width:10px;
          height:10px;
        }
        .pci-teaser .pci-description {
          min-height:36px;
        }
        .pci-teaser .pci-description-placeholder,
        .pci-teaser .pci-description p {
          font-size:8px;
          line-height:1.32;
          max-width:208px;
        }
        .pci-teaser .pci-milestones,
        .pci-teaser .pci-footer {
          display:none;
        }
        @media (max-width: 720px) {
          .pci-modal {
            width:min(620px, 92%);
            min-height:470px;
            padding:28px 24px 0;
          }
          .pci-title-placeholder,
          .pci-title-value {
            font-size:27px;
          }
          .pci-description-placeholder,
          .pci-description p {
            font-size:18px;
          }
          .pci-footer {
            margin-left:-24px;
            margin-right:-24px;
            padding:0 18px;
          }
        }
      `}</style>
    </div>
  )
}
