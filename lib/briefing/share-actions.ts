import {
  buildBriefingSharePayload,
  type BriefingDeliveryChannels,
  waMeDigits,
} from '@/lib/briefing/delivery-channels'
import type { PortalWorkspaceMode } from '@/lib/portal-nav'

export type BriefingShareAction =
  | 'edit_tagro'
  | 'whatsapp'
  | 'email_linked'
  | 'sms_linked'
  | 'mailto'
  | 'linkedin'
  | 'copy_text'
  | 'copy_link'
  | 'native'
  | 'team'

export type BriefingShareItem = {
  id: BriefingShareAction
  label: string
  hint?: string
  connect?: boolean
}

const REPORTS_URL = 'https://festag.app/reports'

export function briefingReportsUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      return `${window.location.origin}/reports`
    } catch { /* noop */ }
  }
  return REPORTS_URL
}

export function buildBriefingShareItems(
  channels: BriefingDeliveryChannels,
  wsMode: PortalWorkspaceMode,
): BriefingShareItem[] {
  const items: BriefingShareItem[] = []

  if (wsMode === 'team' || wsMode === 'agency') {
    items.push({
      id: 'team',
      label: wsMode === 'agency' ? 'An Kunden-Team senden' : 'An Team senden',
      hint: 'Internes Update vorbereiten',
    })
  }

  items.push(
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      hint: channels.whatsapp ? 'Erneut senden' : 'Nummer verknüpfen',
      connect: !channels.whatsapp,
    },
    {
      id: 'email_linked',
      label: 'Nachricht',
      hint: channels.message?.channel === 'email'
        ? 'Erneut senden'
        : channels.message?.channel === 'sms'
          ? 'Als SMS verknüpft'
          : 'Adresse verknüpfen',
      connect: !channels.message || channels.message.channel !== 'email',
    },
  )

  if (!channels.message || channels.message.channel === 'sms') {
    items.push({
      id: 'sms_linked',
      label: 'SMS',
      hint: channels.message?.channel === 'sms' ? 'Erneut senden' : 'Nummer verknüpfen',
      connect: !channels.message || channels.message.channel !== 'sms',
    })
  }

  items.push(
    { id: 'mailto', label: 'E-Mail-App', hint: 'Über dein Postfach' },
    { id: 'linkedin', label: 'LinkedIn', hint: 'Link teilen' },
    { id: 'copy_text', label: 'Text kopieren', hint: 'Für Instagram, Slack, …' },
    { id: 'copy_link', label: 'Link kopieren', hint: 'Festag Berichte' },
  )

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    items.push({ id: 'native', label: 'System teilen', hint: 'AirDrop, Nachrichten, …' })
  }

  return items
}

export async function executeBriefingShare(
  action: BriefingShareAction,
  opts: {
    headline: string
    narrativeText: string
    channels: BriefingDeliveryChannels
    defaultEmail?: string | null
  },
): Promise<{ ok: boolean; error?: string; needsConnect?: 'whatsapp' | 'message' }> {
  const url = briefingReportsUrl()
  const payload = buildBriefingSharePayload(opts.headline, opts.narrativeText)

  switch (action) {
    case 'edit_tagro':
      return { ok: true }

    case 'whatsapp': {
      if (!opts.channels.whatsapp) {
        return { ok: false, needsConnect: 'whatsapp' }
      }
      const digits = waMeDigits(opts.channels.whatsapp.phone)
      window.open(
        `https://wa.me/${digits}?text=${encodeURIComponent(payload)}`,
        '_blank',
        'noopener,noreferrer',
      )
      return { ok: true }
    }

    case 'email_linked': {
      const linked = opts.channels.message
      if (!linked || linked.channel !== 'email') {
        return { ok: false, needsConnect: 'message' }
      }
      const res = await fetch('/api/briefings/send-offline', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: opts.headline, summary: opts.narrativeText }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        return { ok: false, error: data?.error || 'send_failed' }
      }
      return { ok: true }
    }

    case 'sms_linked': {
      const linked = opts.channels.message
      if (!linked || linked.channel !== 'sms') {
        return { ok: false, needsConnect: 'message' }
      }
      const digits = waMeDigits(linked.destination)
      window.location.href = `sms:${digits}?body=${encodeURIComponent(payload)}`
      return { ok: true }
    }

    case 'mailto': {
      const email = opts.defaultEmail?.trim() || ''
      const mailto = `mailto:${email}?subject=${encodeURIComponent(opts.headline)}&body=${encodeURIComponent(payload)}`
      window.location.href = mailto
      return { ok: true }
    }

    case 'linkedin': {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        '_blank',
        'noopener,noreferrer',
      )
      return { ok: true }
    }

    case 'copy_text': {
      try {
        await navigator.clipboard.writeText(payload)
        return { ok: true }
      } catch {
        return { ok: false, error: 'copy_failed' }
      }
    }

    case 'copy_link': {
      try {
        await navigator.clipboard.writeText(url)
        return { ok: true }
      } catch {
        return { ok: false, error: 'copy_failed' }
      }
    }

    case 'native': {
      if (typeof navigator.share !== 'function') {
        return { ok: false, error: 'share_unavailable' }
      }
      try {
        await navigator.share({
          title: opts.headline,
          text: payload,
          url,
        })
        return { ok: true }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return { ok: true }
        return { ok: false, error: 'share_failed' }
      }
    }

    case 'team':
      return { ok: true }

    default:
      return { ok: false, error: 'unknown_action' }
  }
}

export function shareNoticeForError(error?: string): string {
  switch (error) {
    case 'send_failed':
      return 'Versand fehlgeschlagen. Bitte in den Einstellungen prüfen.'
    case 'copy_failed':
      return 'Kopieren nicht möglich. Bitte manuell markieren.'
    case 'share_failed':
      return 'Teilen fehlgeschlagen. Bitte erneut versuchen.'
    case 'schema_missing':
      return 'Verknüpfung ist noch nicht eingerichtet. Migration auf dem Server ausstehend.'
    default:
      return 'Aktion fehlgeschlagen. Bitte erneut versuchen.'
  }
}

export function shareSuccessNotice(action: BriefingShareAction): string {
  switch (action) {
    case 'copy_text':
      return 'Briefing-Text kopiert.'
    case 'copy_link':
      return 'Link kopiert.'
    case 'email_linked':
      return 'Briefing per E-Mail gesendet.'
    default:
      return ''
  }
}
