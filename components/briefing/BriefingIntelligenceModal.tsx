'use client'

import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'
import Modal from '@/components/Modal'
import { BRIEFING_INTELLIGENCE_CSS } from '@/components/briefing/briefing-intelligence-styles'
import {
  DEFAULT_BRIEFING_MASTER_PROMPT,
  getBriefingIntelligenceRules,
  saveBriefingIntelligenceRules,
} from '@/lib/briefing/intelligence-rules'
import { useFestagMobile } from '@/hooks/useFestagMobile'

const PRESETS = [
  {
    id: 'calm',
    label: 'Ruhig und klar',
    prompt: 'Schreibe ruhig, klar und ohne Alarmismus. Führe mit dem Wichtigsten an und ende mit den nächsten Schritten.',
  },
  {
    id: 'ceo',
    label: 'Für Führung',
    prompt: 'Schreibe für Geschäftsführung und Projektverantwortliche. Kurz, entscheidungsorientiert, mit Fokus auf Risiken, Blocker und was jetzt gebraucht wird.',
  },
  {
    id: 'client',
    label: 'Kundensicher',
    prompt: 'Formuliere kundensicher und vertrauensvoll. Keine internen Details, klare Fortschritte, ehrliche Risiken und was als Nächstes passiert.',
  },
] as const

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function BriefingIntelligenceModal({ open, onClose, onSaved }: Props) {
  const isMobile = useFestagMobile()
  const [masterPrompt, setMasterPrompt] = useState(DEFAULT_BRIEFING_MASTER_PROMPT)
  const [emphasizeRisks, setEmphasizeRisks] = useState(true)
  const [clientReadyTone, setClientReadyTone] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const rules = getBriefingIntelligenceRules()
    setMasterPrompt(rules.masterPrompt)
    setEmphasizeRisks(rules.emphasizeRisks)
    setClientReadyTone(rules.clientReadyTone)
  }, [open])

  function applyPreset(prompt: string) {
    setMasterPrompt(prompt)
  }

  async function handleSave() {
    setSaving(true)
    try {
      saveBriefingIntelligenceRules({
        masterPrompt,
        emphasizeRisks,
        clientReadyTone,
      })
      onSaved?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      bare
      noPadding
      size="lg"
      surfaceClassName={`festag-modal-surface--briefing-intel${isMobile ? ' festag-modal-surface--briefing-intel-mobile' : ''}`}
      dragHandle={isMobile}
    >
      <style>{BRIEFING_INTELLIGENCE_CSS}</style>
      <div className="bi-shell">
        <button type="button" className="bi-close" onClick={onClose} aria-label="Schließen">
          <X size={16} weight="bold" />
        </button>

        <header className="bi-head">
          <p className="bi-kicker">Briefing-Intelligenz</p>
          <h2 className="bi-title">Regeln für dein Briefing</h2>
          <p className="bi-sub">
            Der Master-Prompt steuert, wie Tagro deinen Überblick formuliert. Gespeichert auf diesem Gerät.
          </p>
        </header>

        <div className="bi-presets" role="group" aria-label="Schnellvorlagen">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              className="bi-preset"
              onClick={() => applyPreset(preset.prompt)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="bi-field">
          <span className="bi-label">Master-Prompt</span>
          <textarea
            className="bi-textarea"
            value={masterPrompt}
            onChange={e => setMasterPrompt(e.target.value)}
            rows={6}
            placeholder={DEFAULT_BRIEFING_MASTER_PROMPT}
          />
        </label>

        <div className="bi-toggles">
          <label className="bi-toggle">
            <input
              type="checkbox"
              checked={emphasizeRisks}
              onChange={e => setEmphasizeRisks(e.target.checked)}
            />
            <span>
              <strong>Risiken hervorheben</strong>
              <small>Blocker und Verzögerungen klar benennen, wenn relevant</small>
            </span>
          </label>
          <label className="bi-toggle">
            <input
              type="checkbox"
              checked={clientReadyTone}
              onChange={e => setClientReadyTone(e.target.checked)}
            />
            <span>
              <strong>Kundensicher formulieren</strong>
              <small>Interne Details zurückhalten, Vertrauen durch Klarheit</small>
            </span>
          </label>
        </div>

        <footer className="bi-foot">
          <button type="button" className="bi-save" disabled={saving} onClick={() => { void handleSave() }}>
            {saving ? 'Speichern …' : 'Regeln speichern'}
          </button>
        </footer>
      </div>
    </Modal>
  )
}
