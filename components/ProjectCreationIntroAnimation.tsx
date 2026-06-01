'use client'

import { ArrowRight, Buildings, ListChecks, Sparkle, UsersThree } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
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

    timers.push(setTimeout(() => setTitleStarted(true), compact ? 820 : 2780))
    return () => timers.forEach(clearTimeout)
  }, [compact, reduceMotion])

  const { value: typedTitle, done: titleDone } = useTypewriter(TITLE, {
    start: titleStarted,
    speed: compact ? 34 : 52,
  })

  const { value: typedDescription, done: descriptionDone } = useTypewriter(DESCRIPTION, {
    start: descriptionStarted,
    speed: compact ? 18 : 28,
  })

  useEffect(() => {
    if (!titleDone) return
    const colorTimer = setTimeout(() => setColorSelected(true), compact ? 90 : 240)
    const descriptionTimer = setTimeout(() => setDescriptionStarted(true), compact ? 260 : 720)
    return () => {
      clearTimeout(colorTimer)
      clearTimeout(descriptionTimer)
    }
  }, [compact, titleDone])

  useEffect(() => {
    if (!descriptionDone) return
    const milestonesTimer = setTimeout(() => setMilestonesVisible(true), compact ? 120 : 320)
    const ctaTimer = setTimeout(() => setCtaActive(true), compact ? 240 : 860)
    return () => {
      clearTimeout(milestonesTimer)
      clearTimeout(ctaTimer)
    }
  }, [compact, descriptionDone])

  const animationDuration = compact ? 1.05 : 3.15

  return (
    <div className={`pci pci-${variant} ${className}`} aria-label="Festag Projektstart Animation">
      <div className="pci-depth" aria-hidden />
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
            Mit Veyra schreiben
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>

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
        .pci-teaser .pci-modal {
          left:24px;
          top:12px;
          translate:0 0;
          width:390px;
          min-height:276px;
          padding:22px 24px 0;
          border-radius:16px;
          background:rgba(19,25,34,.84);
          box-shadow:0 20px 70px rgba(0,0,0,.16);
          transform-origin:left top;
        }
        .pci-teaser .pci-head span,
        .pci-teaser .pci-label {
          font-size:7px;
        }
        .pci-teaser .pci-head h2 {
          margin:8px 0 23px;
          font-size:14px;
        }
        .pci-teaser .pci-title-row {
          gap:10px;
          margin-bottom:22px;
        }
        .pci-teaser .pci-title-line {
          width:2px;
          height:32px;
        }
        .pci-teaser .pci-title-placeholder,
        .pci-teaser .pci-title-value {
          min-height:25px;
          font-size:20px;
        }
        .pci-teaser .pci-colors {
          gap:7px;
          margin-top:6px;
        }
        .pci-teaser .pci-colors span {
          width:20px;
          height:3px;
        }
        .pci-teaser .pci-actions {
          margin-bottom:24px;
        }
        .pci-teaser .pci-button-row {
          gap:7px;
          margin-top:9px;
        }
        .pci-teaser .pci-button-row button {
          height:25px;
          gap:5px;
          padding:0 9px;
          font-size:8px;
          border-radius:6px;
        }
        .pci-teaser .pci-button-row svg {
          width:10px;
          height:10px;
        }
        .pci-teaser .pci-description {
          min-height:70px;
        }
        .pci-teaser .pci-description-placeholder,
        .pci-teaser .pci-description p {
          font-size:12px;
          line-height:1.35;
          max-width:310px;
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
