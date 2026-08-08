'use client'

import { motion } from 'framer-motion'
import { TagroStarIcon, CheckIcon } from './FestagOSDashboard'
import type { Risk } from './FestagOSDashboard'

interface Props {
  risk: Risk
  index: number
  total: number
  selectedMeasure: number | null
  onSelectMeasure: (i: number) => void
  onTagro: () => void
  onConfirmSelf: () => void
  onClose: () => void
  showTagro: boolean
  onAcceptTagro: () => void
  isMobile: boolean
}

export default function RiskFlow({
  risk,
  index,
  total,
  selectedMeasure,
  onSelectMeasure,
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
            <span className={`fos-progress-dot risk ${i < index ? 'done' : i === index ? 'active' : 'pending'}`}>
              {i < index && <CheckIcon size={10} />}
            </span>
            {i < total - 1 && (
              <span className={`fos-progress-line ${i < index ? 'done risk' : ''}`} />
            )}
          </span>
        ))}
      </div>

      {/* Tagro Recommendation */}
      <div className="fos-dec-tagro-rec" style={{ background: 'rgba(52,168,83,0.10)' }}>
        <span className="fos-dec-tagro-star" style={{ color: '#34A853' }}><TagroStarIcon size={18} /></span>
        Tagro empfiehlt <strong style={{ marginLeft: 4 }}>Prüfen</strong>
      </div>

      {/* Title */}
      <p className="fos-dec-counter" style={{ color: '#34A853' }}>{index + 1} von {total}</p>
      <h2 className="fos-dec-title">Risiko bewerten</h2>
      <p className="fos-dec-subtitle">Bewerte die Auswirkungen und Wahrscheinlichkeit dieses Risikos.</p>

      {/* Risk Detail */}
      <div className="fos-risk-detail">
        <p className="fos-risk-name">{risk.title}</p>
        <p className="fos-risk-desc">{risk.description}</p>
      </div>

      {/* Impact + Probability */}
      <div className="fos-risk-levels">
        <div>
          <p className="fos-risk-level-label">Auswirkung</p>
          <div className="fos-risk-level-options">
            {['Niedrig', 'Mittel', 'Hoch'].map(l => (
              <button
                key={l}
                className={`fos-risk-level-btn ${risk.impact === l ? 'active' : ''}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="fos-risk-level-label">Wahrscheinlichkeit</p>
          <div className="fos-risk-level-options">
            {['Niedrig', 'Mittel', 'Hoch'].map(l => (
              <button
                key={l}
                className={`fos-risk-level-btn ${risk.probability === l ? 'active' : ''}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="fos-btn-secondary" style={{ flex: 1 }} onClick={onClose}>
          Später
        </button>
        <button className="fos-btn-primary" style={{ flex: 1, gap: 6 }} onClick={onTagro}>
          <TagroStarIcon size={14} />
          Mit Tagro analysieren
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
            <span style={{ color: '#34A853' }}><TagroStarIcon size={22} /></span>
            <span className="fos-tagro-name">Tagro</span>
          </div>
          <p className="fos-tagro-why">Warum diese Empfehlung?</p>
          <div className="fos-tagro-reasons">
            {risk.tagroReasons.map(r => (
              <motion.div
                key={r}
                className="fos-tagro-reason"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span className="fos-tagro-check" style={{ color: '#34A853' }}>
                  <CheckIcon size={14} />
                </span>
                {r}
              </motion.div>
            ))}
          </div>
          <motion.button
            className="fos-tagro-accept risk"
            onClick={onAcceptTagro}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Empfehlung übernehmen
          </motion.button>
        </motion.div>
      )}

      {/* Measure selection (after Tagro or self) */}
      {!showTagro && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fos-soft)', marginBottom: 10 }}>
            Maßnahme wählen
          </p>
          <div className="fos-options">
            {risk.measures.map((m, i) => (
              <motion.button
                key={m.label}
                className={`fos-option risk ${selectedMeasure === i ? 'selected' : ''}`}
                onClick={() => onSelectMeasure(i)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
              >
                <span className="fos-option-radio">
                  <span className="fos-option-radio-inner" />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="fos-option-label">{m.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--fos-muted)' }}>{m.description}</span>
                </span>
              </motion.button>
            ))}
          </div>
          <button
            className="fos-btn-primary"
            style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
            disabled={selectedMeasure === null}
            onClick={onConfirmSelf}
          >
            Weiter
          </button>
        </div>
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
        style={{ top: '50%', right: 80, transform: 'translateY(-50%)', maxHeight: '80vh' }}
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
