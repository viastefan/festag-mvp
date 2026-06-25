export type BriefingMessageChannel = 'email' | 'sms'

export type BriefingDeliveryChannels = {
  whatsapp: {
    phone: string
    linkedAt: string
  } | null
  message: {
    channel: BriefingMessageChannel
    destination: string
    linkedAt: string
  } | null
}

export type BriefingDeliveryProfileRow = {
  briefing_whatsapp_phone: string | null
  briefing_whatsapp_linked_at: string | null
  briefing_message_channel: BriefingMessageChannel | null
  briefing_message_destination: string | null
  briefing_message_linked_at: string | null
  email?: string | null
  phone?: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeBriefingPhone(input: string, defaultCountry = '49'): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 8) return null
  if (trimmed.startsWith('+')) return `+${digits}`
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('0')) return `+${defaultCountry}${digits.slice(1)}`
  if (digits.startsWith(defaultCountry)) return `+${digits}`
  return `+${defaultCountry}${digits}`
}

export function waMeDigits(e164: string): string {
  return e164.replace(/\D/g, '')
}

export function formatBriefingPhoneDisplay(e164: string): string {
  const digits = waMeDigits(e164)
  if (digits.startsWith('49') && digits.length >= 11) {
    const rest = digits.slice(2)
    return `+49 ${rest.slice(0, 3)} ${rest.slice(3)}`
  }
  return e164
}

export function isValidBriefingEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function channelsFromProfile(row: BriefingDeliveryProfileRow | null | undefined): BriefingDeliveryChannels {
  if (!row) return { whatsapp: null, message: null }
  const whatsapp = row.briefing_whatsapp_phone && row.briefing_whatsapp_linked_at
    ? { phone: row.briefing_whatsapp_phone, linkedAt: row.briefing_whatsapp_linked_at }
    : null
  const message = row.briefing_message_channel
    && row.briefing_message_destination
    && row.briefing_message_linked_at
    ? {
        channel: row.briefing_message_channel,
        destination: row.briefing_message_destination,
        linkedAt: row.briefing_message_linked_at,
      }
    : null
  return { whatsapp, message }
}

export function buildBriefingSharePayload(headline: string, narrativeText: string): string {
  const preview = narrativeText.length > 480 ? `${narrativeText.slice(0, 480)}…` : narrativeText
  return `${headline}\n\n${preview}\n\nIm Festag öffnen: https://festag.app/reports`
}
