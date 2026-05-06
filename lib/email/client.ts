/**
 * IONOS Mail – zentraler Mail-Client.
 *
 * Vercel-ENV-Vars:
 *   FESTAG_MAIL_IONOS_KEY  – SMTP-Passwort (von IONOS gegenerated)
 *   FESTAG_MAIL_FROM       – Absender, z. B. "Festag <stefandirnberger@viawen.com>"
 *   FESTAG_MAIL_USER       – SMTP-Login (volle Email-Adresse, default = FROM ohne Display-Name)
 *   FESTAG_MAIL_HOST       – default smtp.ionos.de
 *   FESTAG_MAIL_PORT       – default 465 (SSL); 587 für STARTTLS
 *   FESTAG_MAIL_FOUNDER    – BCC/Notify-Adresse für Founder (intern)
 */

import nodemailer, { type Transporter } from 'nodemailer'

let _transporter: Transporter | null = null

function extractEmail(addr: string): string {
  // "Festag <stefandirnberger@viawen.com>" -> "stefandirnberger@viawen.com"
  const m = addr.match(/<([^>]+)>/)
  return (m ? m[1] : addr).trim()
}

export function getMailFrom(): string {
  return process.env.FESTAG_MAIL_FROM ?? 'Festag <stefandirnberger@viawen.com>'
}

export function getFounderMail(): string | null {
  return process.env.FESTAG_MAIL_FOUNDER ?? 'stefandirnberger@viawen.com'
}

export function getTransporter(): Transporter | null {
  if (_transporter) return _transporter

  const pass = process.env.FESTAG_MAIL_IONOS_KEY
  if (!pass) {
    console.warn('[mail] FESTAG_MAIL_IONOS_KEY nicht gesetzt – Mail-Versand inaktiv')
    return null
  }

  const host = process.env.FESTAG_MAIL_HOST ?? 'smtp.ionos.de'
  const port = Number(process.env.FESTAG_MAIL_PORT ?? 465)
  const secure = port === 465
  const user = process.env.FESTAG_MAIL_USER ?? extractEmail(getMailFrom())

  _transporter = nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
    // IONOS toleriert Self-Signed-Chains nicht — Standard-TLS reicht.
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
  })
  return _transporter
}

export type SendInput = {
  to:        string | string[]
  subject:   string
  html:      string
  text?:     string
  cc?:       string | string[]
  bcc?:      string | string[]
  replyTo?:  string
}

export type SendResult =
  | { ok: true;  messageId: string }
  | { ok: false; error: string; skipped?: boolean }

export async function sendMail(input: SendInput): Promise<SendResult> {
  const t = getTransporter()
  if (!t) return { ok: false, error: 'mail-transport-not-configured', skipped: true }

  try {
    const info = await t.sendMail({
      from:    getMailFrom(),
      to:      input.to,
      cc:      input.cc,
      bcc:     input.bcc,
      replyTo: input.replyTo,
      subject: input.subject,
      html:    input.html,
      text:    input.text ?? stripHtml(input.html),
    })
    return { ok: true, messageId: info.messageId }
  } catch (e: any) {
    console.error('[mail] send error:', e?.message ?? e)
    return { ok: false, error: e?.message ?? 'unknown' }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
