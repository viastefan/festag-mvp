/**
 * HTML-Email-Templates — Apple-clean, schwarz/weiß, ohne Emojis & Gradients.
 * Alle Templates rendern ein einheitliches Layout (Logo-Headline, Body, Footer).
 */

const COLORS = {
  bg:      '#FAFAFA',
  surface: '#FFFFFF',
  text:    '#0A0B0A',
  muted:   '#6B7280',
  border:  '#E5E5E2',
  accent:  '#0A0B0A',
}

function layout(opts: {
  preheader?: string
  title:     string
  subtitle?: string
  body:      string
  footer?:   string
}): string {
  return `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.text};line-height:1.55;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;">${escape(opts.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
      <!-- Header -->
      <tr><td style="padding:28px 32px 0 32px;">
        <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:-.2px;color:${COLORS.text};">festag</p>
      </td></tr>
      <!-- Title -->
      <tr><td style="padding:18px 32px 0 32px;">
        <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-.4px;line-height:1.2;color:${COLORS.text};">${escape(opts.title)}</h1>
        ${opts.subtitle ? `<p style="margin:6px 0 0;font-size:14px;color:${COLORS.muted};">${escape(opts.subtitle)}</p>` : ''}
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:20px 32px 28px 32px;font-size:14px;color:${COLORS.text};">
        ${opts.body}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:18px 32px 24px 32px;border-top:1px solid ${COLORS.border};">
        ${opts.footer ?? `<p style="margin:0;font-size:12px;color:${COLORS.muted};">festag · München · <a href="https://festag.io" style="color:${COLORS.muted};text-decoration:underline;">festag.io</a></p>`}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:13px 22px;background:${COLORS.accent};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">${escape(label)}</a>`
}

function pinBox(pin: string): string {
  return `<div style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:12px;padding:18px;text-align:center;margin:20px 0;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.12em;color:${COLORS.muted};">DEIN ZUGANGS-PIN</p>
    <p style="margin:0;font-size:30px;font-weight:800;letter-spacing:.32em;font-family:ui-monospace,'SF Mono',Menlo,Monaco,monospace;color:${COLORS.text};">${escape(pin)}</p>
  </div>`
}

// ════════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════════

/**
 * @deprecated — bestehender Pfad: PIN sofort in der Einladungsmail.
 *   Wird intern nur noch als Fallback genutzt (z. B. wenn ENV
 *   FESTAG_INVITE_DIRECT_PIN=1). Standardflow ist jetzt 2-stufig:
 *     1. tplInviteAccept (Acceptance-Link, kein PIN)
 *     2. tplInvitePin    (nach Klick auf Acceptance-Link)
 */
export function tplInvite(opts: {
  invitedName?: string | null
  role:         'dev'|'client'|'collaborator'|'admin'
  fromName:     string
  pin:          string
  acceptUrl:    string
}): { subject: string; html: string } {
  const roleLabel = opts.role === 'dev' ? 'Developer' : opts.role === 'admin' ? 'Admin' : opts.role === 'client' ? 'Kunde' : 'Mitglied'
  const greeting  = opts.invitedName ? `Hi ${escape(opts.invitedName)},` : 'Hi,'
  return {
    subject: `Du wurdest zu Festag eingeladen`,
    html: layout({
      preheader: `${opts.fromName} hat dich als ${roleLabel} eingeladen.`,
      title:     'Du wurdest eingeladen',
      subtitle:  `${escape(opts.fromName)} möchte dich als ${roleLabel} im Festag-Workspace.`,
      body: `
        <p style="margin:0 0 14px;">${greeting}</p>
        <p style="margin:0 0 14px;">Du wurdest eingeladen, dem Festag-Workspace beizutreten. Logge dich mit deiner E-Mail-Adresse und dem folgenden PIN ein:</p>
        ${pinBox(opts.pin)}
        <p style="margin:0 0 18px;text-align:center;">${button(opts.acceptUrl, 'Festag öffnen')}</p>
        <p style="margin:18px 0 0;font-size:12px;color:${COLORS.muted};">Dieser PIN ist 14 Tage gültig. Nach dem Login wirst du gebeten, ein eigenes Passwort zu setzen.</p>
      `,
    }),
  }
}

/**
 * Stufe 1 — Acceptance-Mail (ohne PIN).
 * Empfänger klickt auf den Link, akzeptiert die Einladung im Browser,
 * danach erhält er automatisch eine 2. Mail mit dem PIN.
 */
export function tplInviteAccept(opts: {
  invitedName?: string | null
  role:         'dev'|'client'|'collaborator'|'admin'
  fromName:     string
  acceptUrl:    string
}): { subject: string; html: string } {
  const roleLabel = opts.role === 'dev' ? 'Developer' : opts.role === 'admin' ? 'Admin' : opts.role === 'client' ? 'Kunde' : 'Mitglied'
  const greeting  = opts.invitedName ? `Hi ${escape(opts.invitedName)},` : 'Hi,'
  return {
    subject: `Einladung zu Festag — von ${opts.fromName}`,
    html: layout({
      preheader: `${opts.fromName} hat dich als ${roleLabel} zu Festag eingeladen.`,
      title:     'Einladung zu Festag',
      subtitle:  `${escape(opts.fromName)} möchte dich als ${roleLabel} hinzufügen.`,
      body: `
        <p style="margin:0 0 14px;">${greeting}</p>
        <p style="margin:0 0 18px;">Du wurdest zu einem Festag-Workspace eingeladen. Klicke unten, um die Einladung anzunehmen — du erhältst danach automatisch eine zweite Mail mit deinem persönlichen Zugangs-PIN.</p>
        <p style="margin:0 0 18px;text-align:center;">${button(opts.acceptUrl, 'Einladung annehmen')}</p>
        <p style="margin:18px 0 0;font-size:12px;color:${COLORS.muted};">Der Link ist 14 Tage gültig. Wenn du die Einladung nicht erwartet hast, kannst du diese Mail ignorieren.</p>
      `,
    }),
  }
}

/**
 * Stufe 2 — PIN-Mail (nach Acceptance).
 * Wird automatisch vom Server ausgelöst, sobald der User die Einladung
 * angenommen hat.
 */
export function tplInvitePin(opts: {
  invitedName?: string | null
  role:         'dev'|'client'|'collaborator'|'admin'
  pin:          string
  redeemUrl:    string
}): { subject: string; html: string } {
  const roleLabel = opts.role === 'dev' ? 'Developer' : opts.role === 'admin' ? 'Admin' : opts.role === 'client' ? 'Kunde' : 'Mitglied'
  const greeting  = opts.invitedName ? `Hi ${escape(opts.invitedName)},` : 'Hi,'
  return {
    subject: `Dein Festag-Zugangs-PIN`,
    html: layout({
      preheader: 'Dein persönlicher PIN — 14 Tage gültig.',
      title:     'Dein Zugangs-PIN',
      subtitle:  `Du wurdest als ${roleLabel} bestätigt.`,
      body: `
        <p style="margin:0 0 14px;">${greeting}</p>
        <p style="margin:0 0 14px;">Danke fürs Annehmen. Hier ist dein Zugangs-PIN. Logge dich auf festag.io ein und gib ihn auf der Login-Seite unter "Einladungspin erhalten?" ein.</p>
        ${pinBox(opts.pin)}
        <p style="margin:0 0 18px;text-align:center;">${button(opts.redeemUrl, 'PIN einlösen')}</p>
        <p style="margin:18px 0 0;font-size:12px;color:${COLORS.muted};">Der PIN ist 14 Tage gültig. Nach dem Login richtest du dein Passwort ein und wirst automatisch dem richtigen Workspace zugewiesen.</p>
      `,
    }),
  }
}

export function tplSupportAck(opts: {
  message: string
  page?:   string
}): { subject: string; html: string } {
  return {
    subject: 'Wir haben deine Nachricht erhalten',
    html: layout({
      preheader: 'Antwort meist innerhalb von 1 Stunde.',
      title:     'Nachricht angekommen',
      subtitle:  'Wir melden uns meist innerhalb einer Stunde.',
      body: `
        <p style="margin:0 0 14px;">Danke für deine Nachricht. Sie wurde an unser Team weitergeleitet.</p>
        <div style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;margin:14px 0;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.08em;color:${COLORS.muted};">DEINE NACHRICHT</p>
          <p style="margin:6px 0 0;white-space:pre-wrap;font-size:13.5px;color:${COLORS.text};">${escape(opts.message)}</p>
          ${opts.page ? `<p style="margin:10px 0 0;font-size:11px;color:${COLORS.muted};">Seite: ${escape(opts.page)}</p>` : ''}
        </div>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Du kannst auf diese Mail direkt antworten — die Antwort landet automatisch im richtigen Thread.</p>
      `,
    }),
  }
}

export function tplSupportNotify(opts: {
  fromEmail?: string | null
  message:    string
  page?:      string
  userId?:    string | null
}): { subject: string; html: string } {
  return {
    subject: `[Support] ${opts.fromEmail ?? 'Anonym'} – ${opts.message.slice(0, 50)}${opts.message.length > 50 ? '…' : ''}`,
    html: layout({
      title:    'Neue Support-Nachricht',
      subtitle: opts.fromEmail ?? 'Anonymer Nutzer',
      body: `
        <div style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;margin:0 0 14px;">
          <p style="margin:0;white-space:pre-wrap;font-size:14px;color:${COLORS.text};">${escape(opts.message)}</p>
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:12px;color:${COLORS.muted};">
          ${opts.fromEmail ? `<tr><td style="padding:2px 16px 2px 0;">Email</td><td>${escape(opts.fromEmail)}</td></tr>` : ''}
          ${opts.page ? `<tr><td style="padding:2px 16px 2px 0;">Seite</td><td>${escape(opts.page)}</td></tr>` : ''}
          ${opts.userId ? `<tr><td style="padding:2px 16px 2px 0;">User-ID</td><td>${escape(opts.userId)}</td></tr>` : ''}
        </table>
      `,
    }),
  }
}

export function tplPaymentReceipt(opts: {
  customerName?: string | null
  description:   string
  amount:        number
  currency:      string
  reference:     string
  provider:      string
  date:          Date
}): { subject: string; html: string } {
  const amount = `${opts.currency.toUpperCase()} ${opts.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const date = opts.date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  return {
    subject: `Zahlung bestätigt – ${amount}`,
    html: layout({
      preheader: `Wir haben deine Zahlung über ${amount} erhalten.`,
      title:     'Zahlung bestätigt',
      subtitle:  'Vielen Dank für deinen Kauf.',
      body: `
        <p style="margin:0 0 14px;">Hi ${opts.customerName ? escape(opts.customerName) : ''},</p>
        <p style="margin:0 0 14px;">wir haben deine Zahlung erhalten. Hier die Details:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:12px;padding:8px;margin:14px 0;">
          <tr><td style="padding:10px 14px;font-size:12px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.border};">Beschreibung</td>
              <td style="padding:10px 14px;font-size:13px;color:${COLORS.text};font-weight:600;border-bottom:1px solid ${COLORS.border};text-align:right;">${escape(opts.description)}</td></tr>
          <tr><td style="padding:10px 14px;font-size:12px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.border};">Betrag</td>
              <td style="padding:10px 14px;font-size:14px;color:${COLORS.text};font-weight:700;border-bottom:1px solid ${COLORS.border};text-align:right;font-variant-numeric:tabular-nums;">${amount}</td></tr>
          <tr><td style="padding:10px 14px;font-size:12px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.border};">Datum</td>
              <td style="padding:10px 14px;font-size:13px;color:${COLORS.text};border-bottom:1px solid ${COLORS.border};text-align:right;">${escape(date)}</td></tr>
          <tr><td style="padding:10px 14px;font-size:12px;color:${COLORS.muted};">Referenz</td>
              <td style="padding:10px 14px;font-size:12px;color:${COLORS.text};text-align:right;font-family:ui-monospace,Menlo,monospace;">${escape(opts.reference)}</td></tr>
        </table>
        <p style="margin:18px 0 0;font-size:12px;color:${COLORS.muted};">Bezahlt über ${escape(opts.provider)}. Die Rechnung findest du in deinem Festag-Account unter Abrechnung.</p>
      `,
    }),
  }
}

export function tplPaymentPending(opts: {
  customerName?: string | null
  description:   string
  amount:        number
  currency:      string
  reference:     string
}): { subject: string; html: string } {
  const amount = `${opts.currency.toUpperCase()} ${opts.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return {
    subject: `Zahlung in Bearbeitung – ${amount}`,
    html: layout({
      title:    'Zahlung in Bearbeitung',
      subtitle: 'Wir warten auf den Zahlungseingang.',
      body: `
        <p style="margin:0 0 14px;">Hi ${opts.customerName ? escape(opts.customerName) : ''},</p>
        <p style="margin:0 0 14px;">wir haben deine Zahlung über <strong>${amount}</strong> für <strong>${escape(opts.description)}</strong> registriert. Sobald sie auf unserem Konto eingegangen ist, schalten wir den Plan automatisch frei.</p>
        <p style="margin:0 0 14px;font-size:12px;color:${COLORS.muted};">Referenz: ${escape(opts.reference)}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Bei SEPA dauert das in der Regel 1–2 Werktage.</p>
      `,
    }),
  }
}

export function tplGeneric(opts: {
  title:     string
  subtitle?: string
  body:      string  // HTML
  preheader?: string
}): { subject: string; html: string } {
  return {
    subject: opts.title,
    html: layout(opts),
  }
}
