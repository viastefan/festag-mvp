'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'
import { useFestagMobile } from '@/hooks/useFestagMobile'
import {
  formatBriefingPhoneDisplay,
  isValidBriefingEmail,
  normalizeBriefingPhone,
  type BriefingDeliveryChannels,
  type BriefingMessageChannel,
} from '@/lib/briefing/delivery-channels'

type Channel = 'whatsapp' | 'message'

type Props = {
  open: boolean
  channel: Channel | null
  defaultEmail?: string | null
  defaultPhone?: string | null
  onClose: () => void
  onLinked: (channel: Channel, channels: BriefingDeliveryChannels) => void
}

export default function BriefingDeliveryConnectSheet({
  open,
  channel,
  defaultEmail,
  defaultPhone,
  onClose,
  onLinked,
}: Props) {
  const isMobile = useFestagMobile()
  const [phone, setPhone] = useState('')
  const [messageChannel, setMessageChannel] = useState<BriefingMessageChannel>('email')
  const [destination, setDestination] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !channel) return
    setError('')
    setBusy(false)
    if (channel === 'whatsapp') {
      setPhone(defaultPhone?.trim() || '')
    } else {
      setMessageChannel('email')
      setDestination(defaultEmail?.trim() || '')
    }
  }, [channel, defaultEmail, defaultPhone, open])

  async function submit() {
    if (!channel || busy) return
    setError('')
    setBusy(true)
    try {
      const body: Record<string, unknown> = {
        action: 'link',
        channel,
      }
      if (channel === 'whatsapp') {
        const normalized = normalizeBriefingPhone(phone)
        if (!normalized) {
          setError('Bitte eine gültige Handynummer eingeben.')
          setBusy(false)
          return
        }
        body.phone = normalized
      } else {
        body.messageChannel = messageChannel
        if (messageChannel === 'email') {
          const email = destination.trim().toLowerCase()
          if (!isValidBriefingEmail(email)) {
            setError('Bitte eine gültige E-Mail-Adresse eingeben.')
            setBusy(false)
            return
          }
          body.destination = email
        } else {
          const normalized = normalizeBriefingPhone(destination)
          if (!normalized) {
            setError('Bitte eine gültige Handynummer eingeben.')
            setBusy(false)
            return
          }
          body.destination = normalized
        }
      }

      const res = await fetch('/api/briefing/delivery-channels', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(
          data?.error === 'invalid_phone'
            ? 'Ungültige Telefonnummer.'
            : data?.error === 'invalid_email'
              ? 'Ungültige E-Mail-Adresse.'
              : 'Verknüpfung fehlgeschlagen. Bitte erneut versuchen.',
        )
        setBusy(false)
        return
      }

      setBusy(false)
      onLinked(channel, data.channels as BriefingDeliveryChannels)
    } catch {
      setError('Verknüpfung fehlgeschlagen. Bitte erneut versuchen.')
      setBusy(false)
    }
  }

  const title = channel === 'whatsapp' ? 'WhatsApp verknüpfen' : 'Nachricht verknüpfen'
  const subtitle = channel === 'whatsapp'
    ? 'Einmal verknüpfen — danach nur noch in den Einstellungen änderbar.'
    : 'Briefing per E-Mail oder SMS — einmal verknüpfen, danach in den Einstellungen verwalten.'

  if (!open || !channel || typeof document === 'undefined') return null

  return createPortal(
    <div
      className={['wsb-connect-backdrop', isMobile ? 'wsb-connect-backdrop--mobile' : ''].filter(Boolean).join(' ')}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={['wsb-connect-sheet', isMobile ? 'wsb-connect-sheet--mobile' : ''].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wsb-connect-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="wsb-connect-head">
          <div>
            <h3 id="wsb-connect-title" className="wsb-connect-title">{title}</h3>
            <p className="wsb-connect-sub">{subtitle}</p>
          </div>
          <button type="button" className="wsb-connect-close" onClick={onClose} aria-label="Schließen">
            <X size={16} weight="bold" />
          </button>
        </div>

        {channel === 'whatsapp' ? (
          <label className="wsb-connect-field">
            <span className="wsb-connect-label">WhatsApp-Nummer</span>
            <input
              type="tel"
              className="wsb-connect-input"
              placeholder="+49 170 1234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
            />
          </label>
        ) : (
          <>
            <div className="wsb-connect-segment" role="group" aria-label="Kanal">
              <button
                type="button"
                className={messageChannel === 'email' ? 'on' : ''}
                onClick={() => {
                  setMessageChannel('email')
                  setDestination(defaultEmail?.trim() || '')
                }}
              >
                E-Mail
              </button>
              <button
                type="button"
                className={messageChannel === 'sms' ? 'on' : ''}
                onClick={() => {
                  setMessageChannel('sms')
                  setDestination(defaultPhone?.trim() || '')
                }}
              >
                SMS
              </button>
            </div>
            <label className="wsb-connect-field">
              <span className="wsb-connect-label">
                {messageChannel === 'email' ? 'E-Mail-Adresse' : 'SMS-Nummer'}
              </span>
              <input
                type={messageChannel === 'email' ? 'email' : 'tel'}
                className="wsb-connect-input"
                placeholder={messageChannel === 'email' ? 'name@firma.de' : '+49 170 1234567'}
                value={destination}
                onChange={e => setDestination(e.target.value)}
                autoComplete={messageChannel === 'email' ? 'email' : 'tel'}
                inputMode={messageChannel === 'email' ? 'email' : 'tel'}
              />
            </label>
          </>
        )}

        {error ? <p className="wsb-connect-error" role="alert">{error}</p> : null}

        <button
          type="button"
          className="wsb-connect-submit"
          onClick={() => void submit()}
          disabled={busy}
        >
          {busy ? 'Wird verknüpft…' : 'Verknüpfen und senden'}
        </button>
      </div>
    </div>,
    document.body,
  )
}

export function formatLinkedWhatsAppLabel(phone: string): string {
  return formatBriefingPhoneDisplay(phone)
}
