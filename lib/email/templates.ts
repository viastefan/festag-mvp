/**
 * HTML-Email-Templates — Festag transactional style.
 * Sleek, left-aligned, Aeonik Regular, white outline CTA (light), no PIN boxes / kickers.
 */

const COLORS = {
  bg:      '#ffffff',
  surface: '#ffffff',
  text:    '#1e1e20',
  muted:   '#6b6b70',
  soft:    '#8e8e93',
  border:  '#ececee',
  btnBg:   '#ffffff',
  btnFg:   '#1e1e20',
  btnBorder: '#e7ebf0',
}

/** Aeonik when available; Helvetica/system sans — never Georgia/serif. */
const FONT = "'Aeonik', 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

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
<meta name="color-scheme" content="light only">
<title>${escape(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:${FONT};font-weight:400;color:${COLORS.text};line-height:1.55;-webkit-font-smoothing:antialiased;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;">${escape(opts.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
  <tr><td align="left" style="padding:48px 24px;">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
      <tr><td style="padding:0 0 32px;font-size:15px;font-weight:400;letter-spacing:-0.02em;color:${COLORS.text};">festag</td></tr>
      <tr><td style="padding:0 0 8px;font-size:22px;font-weight:400;letter-spacing:-0.03em;line-height:1.25;color:${COLORS.text};">${escape(opts.title)}</td></tr>
      ${opts.subtitle ? `<tr><td style="padding:0 0 28px;font-size:14px;font-weight:400;line-height:1.55;color:${COLORS.muted};">${escape(opts.subtitle)}</td></tr>` : `<tr><td style="padding:0 0 28px;"></td></tr>`}
      <tr><td style="padding:0;font-size:14px;font-weight:400;color:${COLORS.text};">${opts.body}</td></tr>
      <tr><td style="padding:32px 0 0;border-top:1px solid ${COLORS.border};font-size:12px;font-weight:400;line-height:1.55;color:${COLORS.soft};">
        ${opts.footer ?? `Festag, München, <a href="https://festag.io" style="color:${COLORS.soft};text-decoration:none;">festag.io</a>`}
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
  return `<a href="${href}" style="display:inline-block;padding:13px 24px;background:${COLORS.btnBg};color:${COLORS.btnFg};text-decoration:none;border:1px solid ${COLORS.btnBorder};border-radius:999px;font-family:${FONT};font-weight:400;font-size:14px;letter-spacing:-0.01em;line-height:1;box-shadow:0 1px 2px rgba(15,23,42,0.04);">${escape(label)}</a>`
}

/** Large PIN / OTP — typography only, no gray box or kicker. */
function pinCode(pin: string, label?: string): string {
  const lab = label
    ? `<p style="margin:0 0 10px;font-size:13px;font-weight:400;color:${COLORS.muted};">${escape(label)}</p>`
    : ''
  return `<div style="margin:24px 0;">
    ${lab}
    <p style="margin:0;font-size:28px;font-weight:400;letter-spacing:0.28em;line-height:1.2;font-family:${FONT};color:${COLORS.text};">${escape(pin)}</p>
  </div>`
}

/** @deprecated alias — prefer pinCode */
function pinBox(pin: string): string {
  return pinCode(pin)
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
        ${pinCode(opts.pin, 'Zugangs-PIN')}
        <p style="margin:0 0 18px;">${button(opts.acceptUrl, 'Festag öffnen')}</p>
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
        <p style="margin:0 0 18px;">${button(opts.acceptUrl, 'Einladung annehmen')}</p>
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
        ${pinCode(opts.pin, 'Zugangs-PIN')}
        <p style="margin:0 0 18px;">${button(opts.redeemUrl, 'PIN einlösen')}</p>
        <p style="margin:18px 0 0;font-size:12px;color:${COLORS.muted};">Der PIN ist 14 Tage gültig. Nach dem Login richtest du dein Passwort ein und wirst automatisch dem richtigen Workspace zugewiesen.</p>
      `,
    }),
  }
}

export function tplPasswordReset(opts: {
  resetUrl: string
}): { subject: string; html: string } {
  return {
    subject: 'Passwort zurücksetzen — Festag',
    html: layout({
      preheader: 'Sicherer Link zum Zurücksetzen deines Festag-Passworts.',
      title:     'Passwort zurücksetzen',
      subtitle:  'Der Link ist zeitlich begrenzt und nur einmal nutzbar.',
      body: `
        <p style="margin:0 0 14px;">Du hast angefordert, dein Festag-Passwort zurückzusetzen.</p>
        <p style="margin:0 0 18px;">Klicke auf den Button, bestätige die Anmeldung und lege anschließend ein neues Passwort fest.</p>
        <p style="margin:0 0 18px;">${button(opts.resetUrl, 'Neues Passwort festlegen')}</p>
        <p style="margin:18px 0 0;font-size:12px;color:${COLORS.muted};">Wenn du diese Anfrage nicht gestellt hast, kannst du diese Mail ignorieren. Dein Passwort bleibt unverändert.</p>
      `,
    }),
  }
}

/**
 * Login / confirm-signup OTP — OpenAI-minimal structure (wordmark, heading,
 * one calm line, large bare code, text link, sign-off, quiet footer).
 * Same HTML as supabase/email-templates/*.html. Sent via Festag IONOS.
 */
export function tplAuthOtp(opts: {
  kind: 'login' | 'signup'
  code: string
  actionUrl: string
}): { subject: string; html: string } {
  const isSignup = opts.kind === 'signup'
  const subject = isSignup ? 'Dein Bestätigungscode' : 'Dein Anmeldecode'
  const title = isSignup ? 'Dein Bestätigungscode' : 'Dein Anmeldecode'
  const lead = isSignup
    ? 'Nutze diesen Code, um deine E-Mail-Adresse bei Festag zu bestätigen.'
    : 'Nutze diesen Code, um dich bei Festag anzumelden.'
  const cta = 'Anmeldung öffnen'
  const note = isSignup
    ? 'Der Code ist 60 Minuten gültig. Hast du keinen Account erstellt, ignoriere diese E-Mail.'
    : 'Der Code ist 60 Minuten gültig. Hast du den Login nicht angefordert, ignoriere diese E-Mail.'
  const code = escape(opts.code)
  const href = escape(opts.actionUrl)
  const preheader = `Code: ${opts.code}`

  return {
    subject,
    html: `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<style>
@font-face{font-family:'Aeonik';src:url('https://festag.app/fonts/Aeonik-Regular.ttf') format('truetype');font-weight:400;font-style:normal;mso-font-alt:'Helvetica Neue';}
</style>
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};color:${COLORS.text};font-family:${FONT};font-weight:400;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bg};border-collapse:collapse;">
  <tr><td align="left" style="padding:72px 40px;font-family:${FONT};font-weight:400;">
    <table role="presentation" width="440" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;width:100%;border-collapse:collapse;">
      <tr><td style="padding:0 0 56px;font-family:${FONT};font-size:15px;font-weight:400;letter-spacing:-0.02em;line-height:1;color:${COLORS.text};">festag</td></tr>
      <tr><td style="padding:0 0 16px;font-family:${FONT};font-size:28px;font-weight:400;letter-spacing:-0.03em;line-height:1.2;color:${COLORS.text};">${escape(title)}</td></tr>
      <tr><td style="padding:0 0 36px;font-family:${FONT};font-size:15px;font-weight:400;line-height:1.55;color:${COLORS.muted};">${escape(lead)}</td></tr>
      <tr><td style="padding:0 0 40px;font-family:${FONT};font-size:36px;font-weight:400;letter-spacing:0.36em;line-height:1.15;color:${COLORS.text};">${code}</td></tr>
      <tr><td style="padding:0 0 48px;font-family:${FONT};font-size:14px;font-weight:400;line-height:1.55;">
        <a href="${href}" style="color:${COLORS.muted};text-decoration:underline;text-underline-offset:3px;">${escape(cta)}</a>
      </td></tr>
      <tr><td style="padding:0 0 4px;font-family:${FONT};font-size:15px;font-weight:400;line-height:1.55;color:${COLORS.text};">Viele Grüße,</td></tr>
      <tr><td style="padding:0 0 48px;font-family:${FONT};font-size:15px;font-weight:400;line-height:1.55;color:${COLORS.text};">Festag</td></tr>
      <tr><td style="padding:0 0 8px;font-family:${FONT};font-size:13px;font-weight:400;line-height:1.55;color:${COLORS.muted};">${escape(note)}</td></tr>
      <tr><td style="padding:32px 0 0;font-family:${FONT};font-size:12px;font-weight:400;line-height:1.6;color:${COLORS.soft};">
        <a href="mailto:hello@festag.app" style="color:${COLORS.soft};text-decoration:underline;text-underline-offset:2px;">Hilfe</a>
        <span style="padding:0 8px;color:${COLORS.border};">|</span>
        <a href="https://festag.app/impressum" style="color:${COLORS.soft};text-decoration:underline;text-underline-offset:2px;">Impressum</a>
        <span style="padding:0 8px;color:${COLORS.border};">|</span>
        <a href="https://festag.app/datenschutz" style="color:${COLORS.soft};text-decoration:underline;text-underline-offset:2px;">Datenschutz</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  }
}

/** Personal Dev PIN recovery (after setup is complete). */
export function tplDevPinReset(opts: {
  devName?:  string | null
  username:  string
  pin:       string
  loginUrl:  string
}): { subject: string; html: string } {
  const greeting = opts.devName?.trim()
    ? `Hallo ${escape(opts.devName.trim())},`
    : 'Hallo,'
  return {
    subject: 'Neuer Dev-PIN — Festag',
    html: layout({
      preheader: 'Dein persönlicher Festag Dev-PIN wurde erneuert.',
      title:     'Neuer persönlicher PIN',
      subtitle:  'Der bisherige PIN ist ab sofort ungültig.',
      body: `
        <p style="margin:0 0 14px;">${greeting}</p>
        <p style="margin:0 0 14px;">Du hast einen neuen persönlichen PIN für das Dev Panel angefordert. Melde dich mit Benutzername und diesem PIN an:</p>
        <p style="margin:0 0 8px;font-size:13px;color:${COLORS.muted};">Benutzername</p>
        <p style="margin:0 0 20px;font-size:18px;font-weight:400;letter-spacing:-0.02em;color:${COLORS.text};">${escape(opts.username)}</p>
        ${pinCode(opts.pin, 'Persönlicher PIN')}
        <p style="margin:8px 0 18px;">${button(opts.loginUrl, 'Zum Dev-Login')}</p>
        <p style="margin:0;font-size:12px;color:${COLORS.muted};">Wenn du diese Anfrage nicht gestellt hast, kontaktiere bitte den Support. Speichere den neuen PIN sicher.</p>
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

// ════════════════════════════════════════════════════════════════
// WELCOME (jeder neu registrierte Nutzer erhält zwei Mails)
// ════════════════════════════════════════════════════════════════

/** Mail 1 — warmes Willkommen, ruhig und kurz. */
export function tplWelcome(opts: {
  firstName?: string | null
  appUrl:     string
}): { subject: string; html: string } {
  const greeting = opts.firstName?.trim() ? `Hi ${escape(opts.firstName.trim())},` : 'Hi,'
  return {
    subject: 'Willkommen bei Festag',
    html: layout({
      preheader: 'Dein ruhiger Projektraum ist bereit.',
      title:     'Willkommen bei Festag',
      subtitle:  'Schön, dass du da bist.',
      body: `
        <p style="margin:0 0 14px;">${greeting}</p>
        <p style="margin:0 0 14px;">Festag ist dein ruhiger Projektraum — kein Cockpit, kein Fachchinesisch. Du beschreibst dein Vorhaben, Tagro übersetzt und zerlegt es, und du siehst jederzeit verständlich, wo dein Projekt steht.</p>
        <p style="margin:0 0 18px;">Leg direkt los — oben links auf „Neues Projekt".</p>
        <p style="margin:0 0 18px;">${button(opts.appUrl, 'Festag öffnen')}</p>
        <p style="margin:18px 0 0;font-size:12px;color:${COLORS.muted};">In Kürze bekommst du eine zweite Mail mit einer kleinen Tour durch alles Wichtige.</p>
      `,
    }),
  }
}

/** Mail 2 — „So funktioniert alles", die kompakte Tour. */
export function tplGettingStarted(opts: {
  firstName?: string | null
  appUrl:     string
}): { subject: string; html: string } {
  const greeting = opts.firstName?.trim() ? `Hi ${escape(opts.firstName.trim())},` : 'Hi,'
  const item = (title: string, text: string) =>
    `<tr><td style="padding:0 0 16px;">
       <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${COLORS.text};">${escape(title)}</p>
       <p style="margin:0;font-size:13.5px;color:${COLORS.muted};line-height:1.55;">${escape(text)}</p>
     </td></tr>`
  return {
    subject: 'So funktioniert Festag',
    html: layout({
      preheader: 'Statusabfrage, Posteingang, Projekte — in einer Minute erklärt.',
      title:     'So funktioniert Festag',
      subtitle:  'Acht Bereiche in einer Minute erklärt.',
      body: `
        <p style="margin:0 0 18px;">${greeting}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${item('Statusabfrage', 'Dein Gesamtbericht — Tagro fasst Team-Signale in ruhige, verständliche Klarheit.')}
          ${item('Bericht anhören', 'Auf dem Dashboard liest und spricht Tagro den Stand Satz für Satz — wie ein Teleprompter.')}
          ${item('Posteingang', 'Strukturierte Eingänge: Projektstände, Rechnungen, Freigaben und offene Entscheidungen.')}
          ${item('Projekte', 'Jedes Projekt bündelt Status, Team, Entscheidungen und Risiken — ohne Task-Chaos.')}
          ${item('Entscheidungen', 'Echte Optionen, klare Wahl — deine Entscheidung steuert Scope und Richtung.')}
          ${item('Freigaben', 'Live-Feedback auf der Staging-Seite — Tagro macht daraus umsetzbare Änderungen.')}
          ${item('Lieferungen', 'Fertige Arbeit prüfen, freigeben oder konkretes Feedback geben.')}
          ${item('Tagro', 'Dein Project Interpreter — Stand, Risiken und Formulierungen jederzeit nachfragen.')}
        </table>
        <p style="margin:6px 0 18px;">${button(opts.appUrl, 'Zum Dashboard')}</p>
        <p style="margin:18px 0 0;font-size:12px;color:${COLORS.muted};">Eine Frage? Antworte einfach auf diese Mail — sie landet direkt bei uns.</p>
      `,
    }),
  }
}

// ════════════════════════════════════════════════════════════════
// DEV PROVISIONING & FESTAG-AUFTRAG (Agentur / White-Label)
// ════════════════════════════════════════════════════════════════

/**
 * Dev Panel credentials — sparse Festag transactional HTML (shared style system).
 */
export function tplDevCredentials(opts: {
  devName?:   string | null
  username:   string
  pin:        string
  loginUrl:   string
  fromName?:  string | null
}): { subject: string; html: string } {
  const name = opts.devName?.trim()
  const greeting = name ? `Hallo ${escape(name)},` : 'Hallo,'
  const u = escape(opts.username)
  const p = escape(opts.pin)
  const href = escape(opts.loginUrl)

  return {
    subject: 'Festag Dev Panel — Zugang',
    html: `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>Festag Dev Panel — Zugang</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:${FONT};font-weight:400;color:${COLORS.text};line-height:1.55;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Einmaliger Zugangscode für das Festag Dev Panel.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
  <tr><td align="left" style="padding:56px 28px;">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
      <tr><td style="padding:0 0 40px;font-size:15px;font-weight:400;letter-spacing:-0.02em;color:${COLORS.text};">festag</td></tr>
      <tr><td style="padding:0 0 12px;font-size:24px;font-weight:400;letter-spacing:-0.03em;line-height:1.2;color:${COLORS.text};">Dev Panel Zugang</td></tr>
      <tr><td style="padding:0 0 36px;font-size:15px;font-weight:400;line-height:1.55;color:${COLORS.muted};">Das Dev Panel ist die Ausführungsfläche für Entwickler und Agenturen — Aufträge, Status und Freigaben, ohne Client-Chaos.</td></tr>
      <tr><td style="padding:0 0 20px;font-size:15px;font-weight:400;color:${COLORS.text};">${greeting}</td></tr>
      <tr><td style="padding:0 0 28px;font-size:15px;font-weight:400;line-height:1.55;color:${COLORS.text};">Für dich wurde ein Entwicklerkonto vorbereitet. Erster Login:</td></tr>
      <tr><td style="padding:0 0 8px;font-size:14px;font-weight:400;color:${COLORS.muted};">1. Öffne den Link unten (oder gehe zu festag.app/dev/login).</td></tr>
      <tr><td style="padding:0 0 8px;font-size:14px;font-weight:400;color:${COLORS.muted};">2. Benutzername und Einladungs-PIN eingeben.</td></tr>
      <tr><td style="padding:0 0 36px;font-size:14px;font-weight:400;color:${COLORS.muted};">3. Workspace-Namen und deinen persönlichen 6-stelligen PIN festlegen.</td></tr>
      <tr><td style="padding:0 0 8px;font-size:13px;font-weight:400;color:${COLORS.muted};">Benutzername</td></tr>
      <tr><td style="padding:0 0 28px;font-size:18px;font-weight:400;letter-spacing:-0.02em;color:${COLORS.text};">${u}</td></tr>
      <tr><td style="padding:0 0 10px;font-size:13px;font-weight:400;color:${COLORS.muted};">Einladungs-PIN (einmalig)</td></tr>
      <tr><td style="padding:0 0 36px;font-size:28px;font-weight:400;letter-spacing:0.28em;line-height:1.2;color:${COLORS.text};">${p}</td></tr>
      <tr><td style="padding:0 0 36px;">
        <a href="${href}" style="display:inline-block;padding:13px 24px;background:${COLORS.btnBg};color:${COLORS.btnFg};text-decoration:none;border:1px solid ${COLORS.btnBorder};border-radius:999px;font-family:${FONT};font-weight:400;font-size:14px;letter-spacing:-0.01em;line-height:1;box-shadow:0 1px 2px rgba(15,23,42,0.04);">Zum Login</a>
      </td></tr>
      <tr><td style="padding:0 0 8px;font-size:13px;font-weight:400;line-height:1.55;color:${COLORS.muted};">Der Einladungs-PIN gilt nur einmal. Danach reicht dein persönlicher PIN — speichere ihn im Schlüsselbund.</td></tr>
      <tr><td style="padding:36px 0 0;border-top:1px solid ${COLORS.border};font-size:12px;font-weight:400;line-height:1.55;color:${COLORS.soft};">Festag, München, <a href="https://festag.io" style="color:${COLORS.soft};text-decoration:none;">festag.io</a></td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  }
}

/** Auftragszustellung an den ausgewählten Entwickler (Agentur-Modus). */
export function tplDevAssignment(opts: {
  devName?:     string | null
  projectTitle: string
  scope?:       string | null
  devPanelUrl:  string
  fromName?:    string | null
}): { subject: string; html: string } {
  const greeting = opts.devName?.trim() ? `Hi ${escape(opts.devName.trim())},` : 'Hi,'
  const from = opts.fromName?.trim() ? escape(opts.fromName.trim()) : 'Festag'
  return {
    subject: `Neuer Auftrag: ${opts.projectTitle}`,
    html: layout({
      preheader: `${from} hat dir ein Projekt zugewiesen.`,
      title:     'Neuer Auftrag für dich',
      subtitle:  `${from} hat dir „${escape(opts.projectTitle)}" zugewiesen.`,
      body: `
        <p style="margin:0 0 14px;">${greeting}</p>
        <p style="margin:0 0 14px;">Du wurdest als Entwickler für ein neues Projekt ausgewählt. Tagro hat das Briefing bereits in klare Schritte zerlegt — du findest alles in deinem Dev-Panel.</p>
        <div style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:12px;padding:16px;margin:14px 0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;color:${COLORS.muted};">PROJEKT</p>
          <p style="margin:0 0 ${opts.scope ? '12px' : '0'};font-size:15px;font-weight:700;color:${COLORS.text};">${escape(opts.projectTitle)}</p>
          ${opts.scope ? `<p style="margin:0;font-size:13.5px;color:${COLORS.muted};line-height:1.55;">${escape(opts.scope)}</p>` : ''}
        </div>
        <p style="margin:0 0 18px;">${button(opts.devPanelUrl, 'Auftrag im Dev-Panel ansehen')}</p>
      `,
    }),
  }
}

// ════════════════════════════════════════════════════════════════
// FESTAG-AUFTRAG ANGENOMMEN (an den Client)
// ════════════════════════════════════════════════════════════════

/** Ein Festag-Entwickler hat den Auftrag angenommen. */
export function tplProjectAccepted(opts: {
  clientName?:  string | null
  projectTitle: string
  devName:      string
  projectUrl:   string
}): { subject: string; html: string } {
  const greeting = opts.clientName?.trim() ? `Hi ${escape(opts.clientName.trim())},` : 'Hi,'
  return {
    subject: `Dein Projekt hat einen Entwickler: ${opts.projectTitle}`,
    html: layout({
      preheader: `${opts.devName} übernimmt „${opts.projectTitle}".`,
      title:     'Dein Projekt ist startklar',
      subtitle:  `${escape(opts.devName)} übernimmt die Umsetzung.`,
      body: `
        <p style="margin:0 0 14px;">${greeting}</p>
        <p style="margin:0 0 14px;">gute Neuigkeiten — <strong>${escape(opts.devName)}</strong> hat deinen Auftrag „${escape(opts.projectTitle)}" angenommen und beginnt mit der Umsetzung.</p>
        <p style="margin:0 0 18px;">Tagro begleitet das Projekt von hier an: Jeder Schritt wird für dich verständlich zusammengefasst. Du musst nichts Technisches lesen.</p>
        <p style="margin:0 0 18px;">${button(opts.projectUrl, 'Projekt öffnen')}</p>
      `,
    }),
  }
}

/** Wie es jetzt weitergeht. */
export function tplProjectNextSteps(opts: {
  clientName?:  string | null
  projectTitle: string
  projectUrl:   string
}): { subject: string; html: string } {
  const greeting = opts.clientName?.trim() ? `Hi ${escape(opts.clientName.trim())},` : 'Hi,'
  const step = (n: string, title: string, text: string) =>
    `<tr><td style="padding:0 0 14px;vertical-align:top;width:28px;">
       <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${COLORS.text};color:#fff;text-align:center;line-height:22px;font-size:12px;font-weight:700;">${n}</span>
     </td><td style="padding:0 0 14px;">
       <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:${COLORS.text};">${escape(title)}</p>
       <p style="margin:0;font-size:13px;color:${COLORS.muted};line-height:1.5;">${escape(text)}</p>
     </td></tr>`
  return {
    subject: `So geht es weiter: ${opts.projectTitle}`,
    html: layout({
      preheader: 'Die nächsten Schritte für dein Projekt.',
      title:     'So geht es jetzt weiter',
      subtitle:  `Dein Projekt „${escape(opts.projectTitle)}".`,
      body: `
        <p style="margin:0 0 18px;">${greeting}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${step('1', 'Tagro strukturiert', 'Dein Briefing ist in klare Aufgaben und Meilensteine zerlegt.')}
          ${step('2', 'Umsetzung beginnt', 'Dein Entwickler arbeitet die Schritte ab. Jedes Update wird geprüft.')}
          ${step('3', 'Du bleibst im Bild', 'Auf dem Dashboard fragst du jederzeit den ruhigen Projektstand ab.')}
        </table>
        <p style="margin:6px 0 18px;">${button(opts.projectUrl, 'Projekt ansehen')}</p>
      `,
    }),
  }
}

/** Die Festag-Garantie. */
export function tplFestagGuarantee(opts: {
  clientName?:  string | null
  projectTitle: string
  docUrl:       string
}): { subject: string; html: string } {
  const greeting = opts.clientName?.trim() ? `Hi ${escape(opts.clientName.trim())},` : 'Hi,'
  const point = (text: string) =>
    `<tr><td style="padding:0 0 12px;font-size:13.5px;color:${COLORS.text};line-height:1.55;">— ${escape(text)}</td></tr>`
  return {
    subject: 'Die Festag-Garantie',
    html: layout({
      preheader: 'Was Festag dir für dein Projekt zusichert.',
      title:     'Die Festag-Garantie',
      subtitle:  `Für dein Projekt „${escape(opts.projectTitle)}".`,
      body: `
        <p style="margin:0 0 14px;">${greeting}</p>
        <p style="margin:0 0 16px;">Mit Festag gehst du kein Risiko ein. Das sichern wir dir zu:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
          ${point('Geprüfter Fortschritt: Jeder Arbeitsstand wird von Tagro kontrolliert, bevor er bei dir ankommt.')}
          ${point('Volle Transparenz: Du siehst jederzeit verständlich, wo dein Projekt steht — ohne Fachjargon.')}
          ${point('Kein Informationsverlust: Tagro übersetzt zwischen dir und dem Entwickler in beide Richtungen.')}
          ${point('Verlässliche Umsetzung: Festag steuert die Lieferung und steht für die Qualität gerade.')}
        </table>
        <p style="margin:8px 0 18px;">${button(opts.docUrl, 'Festag-Garantie im Detail')}</p>
      `,
    }),
  }
}
