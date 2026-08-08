'use client'

import { motion } from 'framer-motion'
import { TagroStarIcon, CheckIcon, ConstellationDots } from './FestagOSDashboard'
import type { Decision } from './FestagOSDashboard'

interface Props {
  decision: Decision
  index: number
  total: number
  selectedOption: number | null
  onSelectOption: (i: number) => void
  onTagro: () => void
  onConfirmSelf: () => void
  onClose: () => void
  showTagro: boolean
  onAcceptTagro: () => void
  isMobile: boolean
}

export default function DecisionFlow({
  decision,
  index,
  total,
  selectedOption,
  onSelectOption,
  onTagro,
  onConfirmSelf,
  onClose,
  showTagro,
  onAcceptTagro,
  isMobile,
}: Props) {
  const content = (
    <>
      {/* Progress */}
      <div className="fos-progress">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} style={{ display: 'contents' }}>
            <span className={`fos-progress-dot ${i < index ? 'done' : i === index ? 'active' : 'pending'}`}>
              {i < index && <CheckIcon size={10} />}
            </span>
            {i < total - 1 && (
              <span className={`fos-progress-line ${i < index ? 'done' : ''}`} />
            )}
          </span>
        ))}
      </div>

      {/* Tagro Recommendation */}
      <div className="fos-dec-tagro-rec">
        <span className="fos-dec-tagro-star"><TagroStarIcon size={18} /></span>
        Tagro empfiehlt <strong style={{ marginLeft: 4 }}>{decision.options.find(o => o.recommended)?.label || decision.options[0].label}</strong>
      </div>

      {/* Title */}
      <p className="fos-dec-counter">{index + 1} von {total}</p>
      <h2 className="fos-dec-title">{decision.title}</h2>
      <p className="fos-dec-subtitle">{decision.subtitle}</p>

      {/* Options */}
      <div className="fos-options">
        {decision.options.map((opt, i) => (
          <motion.button
            key={opt.label}
            className={`fos-option ${selectedOption === i ? 'selected' : ''}`}
            onClick={() => onSelectOption(i)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
          >
            <span className="fos-option-radio">
              <span className="fos-option-radio-inner" />
            </span>
            <span className="fos-option-label">{opt.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          className="fos-btn-secondary"
          onClick={onConfirmSelf}
          style={{ flex: 1 }}
          disabled={selectedOption === null}
        >
          Selbst wählen
        </button>
        <button
          className="fos-btn-primary"
          onClick={onTagro}
          style={{ flex: 1, gap: 6 }}
        >
          <TagroStarIcon size={14} />
          Mit Tagro entscheiden
        </button>
      </div>

      {/* Tagro Sheet */}
      {showTagro && (
        <motion.div
          className="fos-tagro-sheet"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="fos-tagro-head">
            <span style={{ color: '#D4A853' }}><TagroStarIcon size={22} /></span>
            <span className="fos-tagro-name">Tagro</span>
          </div>
          <p className="fos-tagro-why">Warum diese Empfehlung?</p>
          <div className="fos-tagro-reasons">
            {decision.tagroReasons.map(r => (
              <motion.div
                key={r}
                className="fos-tagro-reason"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span className="fos-tagro-check" style={{ color: '#D4A853' }}>
                  <CheckIcon size={14} />
                </span>
                {r}
              </motion.div>
            ))}
          </div>
          <motion.button
            className="fos-tagro-accept"
            onClick={onAcceptTagro}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Übernehmen
          </motion.button>
        </motion.div>
      )}
    </>
  )

  if (isMobile) {
    return (
      <>
        <motion.div
          className="fos-sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="fos-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="fos-sheet-handle" />
          <div className="fos-sheet-content">{content}</div>
        </motion.div>
      </>
    )
  }

  return (
    <>
      <motion.div
        className="fos-sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ background: 'rgba(251,247,238,0.5)', backdropFilter: 'blur(4px)' }}
      />
      <motion.div
        className="fos-float-panel"
        style={{ top: '50%', right: 80, transform: 'translateY(-50%)' }}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="fos-float-content">{content}</div>
      </motion.div>
    </>
  )
}
