/**
 * Hochlevel-Send-Funktionen — Geschäftslogik trifft Mail-Templates.
 * Alles, was im Code Mail verschickt, geht durch diese Datei.
 */

import { sendMail, getFounderMail, type SendResult } from './client'
import {
  tplInvite, tplInviteAccept, tplInvitePin,
  tplSupportAck, tplSupportNotify,
  tplPaymentReceipt, tplPaymentPending, tplGeneric,
} from './templates'

// ── Invite (Legacy, PIN sofort — nur Fallback) ──────────────────────────
export async function sendInviteEmail(opts: {
  to:           string
  invitedName?: string | null
  role:         'dev'|'client'|'collaborator'|'admin'
  fromName:     string
  pin:          string
  acceptUrl:    string
  ccFounder?:   boolean
}): Promise<SendResult> {
  const { subject, html } = tplInvite({
    invitedName: opts.invitedName, role: opts.role,
    fromName: opts.fromName, pin: opts.pin, acceptUrl: opts.acceptUrl,
  })
  const founder = getFounderMail()
  return sendMail({
    to:      opts.to,
    subject, html,
    cc:      opts.ccFounder && founder ? [founder] : undefined,
    replyTo: founder ?? undefined,
  })
}

// ── Invite Stufe 1 — Acceptance-Link, kein PIN ──────────────────────────
export async function sendInviteAcceptEmail(opts: {
  to:           string
  invitedName?: string | null
  role:         'dev'|'client'|'collaborator'|'admin'
  fromName:     string
  acceptUrl:    string
  ccFounder?:   boolean
}): Promise<SendResult> {
  const { subject, html } = tplInviteAccept({
    invitedName: opts.invitedName, role: opts.role,
    fromName: opts.fromName, acceptUrl: opts.acceptUrl,
  })
  const founder = getFounderMail()
  return sendMail({
    to:      opts.to,
    subject, html,
    cc:      opts.ccFounder && founder ? [founder] : undefined,
    replyTo: founder ?? undefined,
  })
}

// ── Invite Stufe 2 — PIN nach Acceptance ────────────────────────────────
export async function sendInvitePinEmail(opts: {
  to:           string
  invitedName?: string | null
  role:         'dev'|'client'|'collaborator'|'admin'
  pin:          string
  redeemUrl:    string
}): Promise<SendResult> {
  const { subject, html } = tplInvitePin({
    invitedName: opts.invitedName, role: opts.role,
    pin: opts.pin, redeemUrl: opts.redeemUrl,
  })
  return sendMail({
    to:      opts.to,
    subject, html,
    replyTo: getFounderMail() ?? undefined,
  })
}

// ── Support ──────────────────────────────────────────────────────────────
export async function sendSupportAckEmail(opts: {
  to:       string
  message:  string
  page?:    string
}): Promise<SendResult> {
  const { subject, html } = tplSupportAck({ message: opts.message, page: opts.page })
  return sendMail({ to: opts.to, subject, html, replyTo: getFounderMail() ?? undefined })
}

export async function sendSupportNotifyEmail(opts: {
  fromEmail?: string | null
  message:    string
  page?:      string
  userId?:    string | null
}): Promise<SendResult> {
  const founder = getFounderMail()
  if (!founder) return { ok: false, error: 'no-founder-mail-configured', skipped: true }
  const { subject, html } = tplSupportNotify(opts)
  return sendMail({
    to:      founder,
    subject, html,
    replyTo: opts.fromEmail ?? undefined,
  })
}

// ── Payments ─────────────────────────────────────────────────────────────
export async function sendPaymentReceiptEmail(opts: {
  to:            string
  customerName?: string | null
  description:   string
  amount:        number
  currency:      string
  reference:     string
  provider:      string
  date?:         Date
}): Promise<SendResult> {
  const { subject, html } = tplPaymentReceipt({
    customerName: opts.customerName,
    description: opts.description,
    amount: opts.amount, currency: opts.currency,
    reference: opts.reference, provider: opts.provider,
    date: opts.date ?? new Date(),
  })
  const founder = getFounderMail()
  return sendMail({
    to: opts.to, subject, html,
    bcc: founder ? [founder] : undefined,
    replyTo: founder ?? undefined,
  })
}

export async function sendPaymentPendingEmail(opts: {
  to:            string
  customerName?: string | null
  description:   string
  amount:        number
  currency:      string
  reference:     string
}): Promise<SendResult> {
  const { subject, html } = tplPaymentPending(opts)
  return sendMail({ to: opts.to, subject, html, replyTo: getFounderMail() ?? undefined })
}

// ── Generic / Custom ─────────────────────────────────────────────────────
export async function sendGenericEmail(opts: {
  to:        string | string[]
  title:     string
  subtitle?: string
  body:      string
  preheader?: string
  cc?:       string | string[]
}): Promise<SendResult> {
  const { subject, html } = tplGeneric(opts)
  return sendMail({ to: opts.to, cc: opts.cc, subject, html, replyTo: getFounderMail() ?? undefined })
}

// Re-export low-level for advanced flows
export { sendMail } from './client'
