/**
 * HTML-Email-Templates — Festag × Cursor-inspired chrome.
 *
 * - Soft canvas + white content column
 * - Wordmark „festag“ (no mark/logo)
 * - Black pill CTAs with →
 * - Artistic feature panels (olive / dusk / stone) with nested UI mocks
 * - Quiet footer with wordmark + legal links
 *
 * Email-safe: tables, inline styles, hosted SVG art on festag.app.
 */

const APP = (process.env.NEXT_PUBLIC_APP_URL || 'https://festag.app').replace(/\/$/, '')

const COLORS = {
  canvas: '#F5F5F3',
  card: '#ffffff',
  text: '#1e1e20',
  muted: '#5c5c62',
  soft: '#8a8a90',
  hairline: 'rgba(30, 30, 32, 0.08)',
  btnBg: '#1e1e20',
  btnFg: '#ffffff',
  btnHover: '#111113',
}

/** Aeonik when available; Helvetica/system sans — never Georgia/serif. */
const FONT = "'Aeonik', 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

type ArtVariant = 'olive' | 'dusk' | 'stone'
type MockKind = 'status' | 'decision' | 'code' | 'dev' | 'pulse'

const ART: Record<ArtVariant, string> = {
  olive: `${APP}/email/art-olive.svg`,
  dusk: `${APP}/email/art-dusk.svg`,
  stone: `${APP}/email/art-stone.svg`,
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function wordmark(): string {
  return `<span style="font-family:${FONT};font-size:18px;font-weight:400;letter-spacing:-0.03em;line-height:1;color:${COLORS.text};">festag</span>`
}

function button(href: string, label: string): string {
  const arrow = '→'
  return `<a href="${escape(href)}" style="display:inline-block;padding:14px 22px;background:${COLORS.btnBg};color:${COLORS.btnFg};text-decoration:none;border-radius:999px;font-family:${FONT};font-weight:400;font-size:14px;letter-spacing:0.01em;line-height:1;border:0;">${escape(label)}&nbsp;${arrow}</a>`
}

/** Large PIN / OTP — typography only. */
function pinCode(pin: string, label?: string): string {
  const lab = label
    ? `<p style="margin:0 0 10px;font-size:13px;font-weight:400;color:${COLORS.muted};letter-spacing:0.01em;">${escape(label)}</p>`
    : ''
  return `<div style="margin:28px 0;">
    ${lab}
    <p style="margin:0;font-size:32px;font-weight:400;letter-spacing:0.32em;line-height:1.15;font-family:${FONT};color:${COLORS.text};">${escape(pin)}</p>
  </div>`
}

/** @deprecated alias — prefer pinCode */
function pinBox(pin: string): string {
  return pinCode(pin)
}

/** Nested faux app window for feature panels. */
function uiMock(kind: MockKind): string {
  const chrome = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:10px 12px 8px;">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.28);margin-right:5px;"></span>
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.18);margin-right:5px;"></span>
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.12);"></span>
        </td>
      </tr>
    </table>`

  if (kind === 'code') {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(12,12,14,0.92);border-radius:16px;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,0.35);">
        ${chrome}
        <tr><td style="padding:8px 20px 28px;">
          <p style="margin:0 0 10px;font-family:${FONT};font-size:12px;color:rgba(245,245,247,0.55);">Anmeldecode</p>
          <p style="margin:0;font-family:${FONT};font-size:28px;letter-spacing:0.28em;color:#f5f5f7;">4 8 2 9 1 7</p>
        </td></tr>
      </table>`
  }

  if (kind === 'decision') {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.96);border-radius:16px;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,0.28);">
        <tr><td style="padding:18px 18px 8px;">
          <p style="margin:0 0 6px;font-family:${FONT};font-size:11px;color:${COLORS.muted};">Wartet auf dich</p>
          <p style="margin:0 0 10px;font-family:${FONT};font-size:16px;font-weight:500;color:${COLORS.text};letter-spacing:-0.02em;">Design-Freigabe Staging</p>
          <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.45;color:${COLORS.muted};">Ohne deine Freigabe stockt der nächste Schritt.</p>
        </td></tr>
        <tr><td style="padding:12px 18px 18px;">
          <span style="display:inline-block;padding:8px 12px;border-radius:999px;background:${COLORS.btnBg};color:#fff;font-family:${FONT};font-size:12px;">Freigeben</span>
        </td></tr>
      </table>`
  }

  if (kind === 'dev') {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(12,12,14,0.94);border-radius:16px;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,0.35);">
        ${chrome}
        <tr><td style="padding:4px 18px 22px;">
          <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;color:rgba(245,245,247,0.5);">Dev Panel</p>
          <p style="margin:0 0 14px;font-family:${FONT};font-size:15px;color:#f5f5f7;">Auftrag bereit zur Umsetzung</p>
          <p style="margin:0;font-family:${FONT};font-size:12px;color:rgba(245,245,247,0.55);">Benutzername, PIN, Workspace</p>
        </td></tr>
      </table>`
  }

  if (kind === 'pulse') {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.94);border-radius:16px;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,0.25);">
        <tr><td style="padding:18px;">
          <p style="margin:0 0 12px;font-family:${FONT};font-size:11px;color:${COLORS.muted};">Delivery Pulse</p>
          <p style="margin:0 0 8px;font-family:${FONT};font-size:14px;color:${COLORS.text};line-height:1.45;"><strong style="font-weight:500;">Fortschritt</strong> — 3 PRs merged, Design freigegeben</p>
          <p style="margin:0 0 8px;font-family:${FONT};font-size:14px;color:${COLORS.text};line-height:1.45;"><strong style="font-weight:500;">Risiko</strong> — eine Entscheidung wartet auf dich</p>
          <p style="margin:0;font-family:${FONT};font-size:14px;color:${COLORS.text};line-height:1.45;"><strong style="font-weight:500;">Nächster Schritt</strong> — Freigabe Staging</p>
        </td></tr>
      </table>`
  }

  // status default
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.95);border-radius:16px;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,0.28);">
      <tr><td style="padding:18px 18px 6px;">
        <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;color:${COLORS.muted};">Statusabfrage</p>
        <p style="margin:0;font-family:${FONT};font-size:17px;font-weight:500;letter-spacing:-0.02em;color:${COLORS.text};">Ruhiger Gesamtbericht</p>
      </td></tr>
      <tr><td style="padding:10px 18px 18px;">
        <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.5;color:${COLORS.muted};">Tagro verdichtet Signale in Klarheit — ohne Status-Theater.</p>
      </td></tr>
    </table>`
}

/**
 * Artistic feature container — rich background + nested UI mock.
 * Matches the Cursor newsletter panel pattern.
 */
function featureArt(opts: {
  variant?: ArtVariant
  mock?: MockKind
}): string {
  const variant = opts.variant || 'olive'
  const mock = opts.mock || 'status'
  const bg = ART[variant]
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 32px;border-collapse:collapse;">
      <tr>
        <td background="${bg}" bgcolor="#2a2a22" style="background-image:url('${bg}');background-size:cover;background-position:center;background-color:#2a2a22;border-radius:28px;padding:36px 28px;">
          <!--[if gte mso 9]>
          <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:552px;height:320px;">
            <v:fill type="frame" src="${bg}" color="#2a2a22"/>
            <v:textbox inset="0,0,0,0">
          <![endif]-->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;margin:0 auto;">
            <tr><td>${uiMock(mock)}</td></tr>
          </table>
          <!--[if gte mso 9]>
            </v:textbox>
          </v:rect>
          <![endif]-->
        </td>
      </tr>
    </table>`
}

function footerLinks(): string {
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${COLORS.soft};text-decoration:none;font-size:12px;font-family:${FONT};">${escape(label)}</a>`
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:0 0 14px;">${wordmark()}</td>
      </tr>
      <tr>
        <td style="padding:0 0 16px;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLORS.soft};">
          ${link(`${APP}/docs`, 'Docs')}
          <span style="padding:0 8px;color:${COLORS.hairline};">|</span>
          ${link(`${APP}/datenschutz`, 'Datenschutz')}
          <span style="padding:0 8px;color:${COLORS.hairline};">|</span>
          ${link(`${APP}/impressum`, 'Impressum')}
          <span style="padding:0 8px;color:${COLORS.hairline};">|</span>
          ${link('mailto:hello@festag.app', 'Hilfe')}
        </td>
      </tr>
      <tr>
        <td style="font-family:${FONT};font-size:11px;line-height:1.55;color:${COLORS.soft};">
          Festag, München, <a href="${APP}" style="color:${COLORS.soft};text-decoration:none;">festag.app</a>
        </td>
      </tr>
    </table>`
}

function layout(opts: {
  preheader?: string
  title: string
  /** Lead paragraph under the title (Cursor-style body). */
  subtitle?: string
  body: string
  /** Optional artistic panel under the lead, before body. */
  feature?: { variant?: ArtVariant; mock?: MockKind }
  footer?: string
}): string {
  const feature = opts.feature ? featureArt(opts.feature) : ''
  return `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<style>
@font-face{font-family:'Aeonik';src:url('${APP}/fonts/Aeonik-Regular.ttf') format('truetype');font-weight:400;font-style:normal;mso-font-alt:'Helvetica Neue';}
</style>
<title>${escape(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.canvas};font-family:${FONT};font-weight:400;color:${COLORS.text};line-height:1.55;-webkit-font-smoothing:antialiased;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;opacity:0;">${escape(opts.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.canvas};border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:40px 16px 56px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${COLORS.card};border-radius:24px;border:1px solid ${COLORS.hairline};overflow:hidden;border-collapse:collapse;">
        <tr>
          <td style="padding:40px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:0 0 36px;">${wordmark()}</td></tr>
              <tr><td style="padding:0 0 14px;font-family:${FONT};font-size:28px;font-weight:500;letter-spacing:-0.03em;line-height:1.2;color:${COLORS.text};">${escape(opts.title)}</td></tr>
              ${opts.subtitle
                ? `<tr><td style="padding:0 0 28px;font-family:${FONT};font-size:15.5px;font-weight:400;line-height:1.65;letter-spacing:0.01em;color:${COLORS.muted};">${escape(opts.subtitle)}</td></tr>`
                : `<tr><td style="padding:0 0 20px;"></td></tr>`}
            </table>
          </td>
        </tr>
        ${feature
          ? `<tr><td style="padding:0 24px;">${feature}</td></tr>`
          : ''}
        <tr>
          <td style="padding:${feature ? '0' : '0'} 40px 8px;font-family:${FONT};font-size:15px;font-weight:400;color:${COLORS.text};line-height:1.6;">
            ${opts.body}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 36px;border-top:1px solid ${COLORS.hairline};">
            ${opts.footer ?? footerLinks()}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body></html>`
}

// ════════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════════

/**
 * @deprecated — bestehender Pfad: PIN sofort in der Einladungsmail.
 */
export function tplInvite(opts: {
  invitedName?: string | null
  role: 'dev' | 'client' | 'collaborator' | 'admin'
  fromName: string
  pin: string
  acceptUrl: string
}): { subject: string; html: string } {
  const roleLabel = opts.role === 'dev' ? 'Developer' : opts.role === 'admin' ? 'Admin' : opts.role === 'client' ? 'Kunde' : 'Mitglied'
  const greeting = opts.invitedName ? `Hi ${escape(opts.invitedName)},` : 'Hi,'
  return {
    subject: `Du wurdest zu Festag eingeladen`,
    html: layout({
      preheader: `${opts.fromName} hat dich als ${roleLabel} eingeladen.`,
      title: 'Du wurdest eingeladen',
      subtitle: `${escape(opts.fromName)} möchte dich als ${roleLabel} im Festag-Workspace.`,
      feature: { variant: 'dusk', mock: 'status' },
      body: `
        <p style="margin:0 0 16px;">${greeting}</p>
        <p style="margin:0 0 16px;color:${COLORS.muted};">Du wurdest eingeladen, dem Festag-Workspace beizutreten. Logge dich mit deiner E-Mail-Adresse und dem folgenden PIN ein:</p>
        ${pinCode(opts.pin, 'Zugangs-PIN')}
        <p style="margin:0 0 20px;">${button(opts.acceptUrl, 'Festag öffnen')}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Dieser PIN ist 14 Tage gültig. Nach dem Login wirst du gebeten, ein eigenes Passwort zu setzen.</p>
      `,
    }),
  }
}

export function tplInviteAccept(opts: {
  invitedName?: string | null
  role: 'dev' | 'client' | 'collaborator' | 'admin'
  fromName: string
  acceptUrl: string
}): { subject: string; html: string } {
  const roleLabel = opts.role === 'dev' ? 'Developer' : opts.role === 'admin' ? 'Admin' : opts.role === 'client' ? 'Kunde' : 'Mitglied'
  const greeting = opts.invitedName ? `Hi ${escape(opts.invitedName)},` : 'Hi,'
  return {
    subject: `Einladung zu Festag — von ${opts.fromName}`,
    html: layout({
      preheader: `${opts.fromName} hat dich als ${roleLabel} zu Festag eingeladen.`,
      title: 'Einladung zu Festag',
      subtitle: `${escape(opts.fromName)} möchte dich als ${roleLabel} hinzufügen.`,
      feature: { variant: 'olive', mock: 'status' },
      body: `
        <p style="margin:0 0 16px;">${greeting}</p>
        <p style="margin:0 0 20px;color:${COLORS.muted};">Du wurdest zu einem Festag-Workspace eingeladen. Klicke unten, um die Einladung anzunehmen — du erhältst danach automatisch eine zweite Mail mit deinem persönlichen Zugangs-PIN.</p>
        <p style="margin:0 0 20px;">${button(opts.acceptUrl, 'Einladung annehmen')}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Der Link ist 14 Tage gültig. Wenn du die Einladung nicht erwartet hast, kannst du diese Mail ignorieren.</p>
      `,
    }),
  }
}

export function tplInvitePin(opts: {
  invitedName?: string | null
  role: 'dev' | 'client' | 'collaborator' | 'admin'
  pin: string
  redeemUrl: string
}): { subject: string; html: string } {
  const roleLabel = opts.role === 'dev' ? 'Developer' : opts.role === 'admin' ? 'Admin' : opts.role === 'client' ? 'Kunde' : 'Mitglied'
  const greeting = opts.invitedName ? `Hi ${escape(opts.invitedName)},` : 'Hi,'
  return {
    subject: `Dein Festag-Zugangs-PIN`,
    html: layout({
      preheader: 'Dein persönlicher PIN — 14 Tage gültig.',
      title: 'Dein Zugangs-PIN',
      subtitle: `Du wurdest als ${roleLabel} bestätigt.`,
      feature: { variant: 'stone', mock: 'code' },
      body: `
        <p style="margin:0 0 16px;">${greeting}</p>
        <p style="margin:0 0 16px;color:${COLORS.muted};">Danke fürs Annehmen. Hier ist dein Zugangs-PIN. Logge dich auf festag.app ein und gib ihn auf der Login-Seite unter „Einladungspin erhalten?“ ein.</p>
        ${pinCode(opts.pin, 'Zugangs-PIN')}
        <p style="margin:0 0 20px;">${button(opts.redeemUrl, 'PIN einlösen')}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Der PIN ist 14 Tage gültig. Nach dem Login richtest du dein Passwort ein und wirst automatisch dem richtigen Workspace zugewiesen.</p>
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
      title: 'Passwort zurücksetzen',
      subtitle: 'Der Link ist zeitlich begrenzt und nur einmal nutzbar.',
      feature: { variant: 'olive', mock: 'code' },
      body: `
        <p style="margin:0 0 16px;color:${COLORS.muted};">Du hast angefordert, dein Festag-Passwort zurückzusetzen.</p>
        <p style="margin:0 0 20px;color:${COLORS.muted};">Klicke auf den Button, bestätige die Anmeldung und lege anschließend ein neues Passwort fest.</p>
        <p style="margin:0 0 20px;">${button(opts.resetUrl, 'Neues Passwort festlegen')}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Wenn du diese Anfrage nicht gestellt hast, kannst du diese Mail ignorieren. Dein Passwort bleibt unverändert.</p>
      `,
    }),
  }
}

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
  const note = isSignup
    ? 'Der Code ist 60 Minuten gültig. Hast du keinen Account erstellt, ignoriere diese E-Mail.'
    : 'Der Code ist 60 Minuten gültig. Hast du den Login nicht angefordert, ignoriere diese E-Mail.'

  return {
    subject,
    html: layout({
      preheader: `Code: ${opts.code}`,
      title,
      subtitle: lead,
      feature: { variant: 'dusk', mock: 'code' },
      body: `
        ${pinCode(opts.code)}
        <p style="margin:0 0 28px;">${button(opts.actionUrl, 'Anmeldung öffnen')}</p>
        <p style="margin:0 0 8px;color:${COLORS.text};">Viele Grüße,</p>
        <p style="margin:0 0 24px;color:${COLORS.text};">Festag</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">${escape(note)}</p>
      `,
    }),
  }
}

export function tplDevPinReset(opts: {
  devName?: string | null
  username: string
  pin: string
  loginUrl: string
}): { subject: string; html: string } {
  const greeting = opts.devName?.trim()
    ? `Hallo ${escape(opts.devName.trim())},`
    : 'Hallo,'
  return {
    subject: 'Neuer Dev-PIN — Festag',
    html: layout({
      preheader: 'Dein persönlicher Festag Dev-PIN wurde erneuert.',
      title: 'Neuer persönlicher PIN',
      subtitle: 'Der bisherige PIN ist ab sofort ungültig.',
      feature: { variant: 'olive', mock: 'dev' },
      body: `
        <p style="margin:0 0 16px;">${greeting}</p>
        <p style="margin:0 0 16px;color:${COLORS.muted};">Du hast einen neuen persönlichen PIN für das Dev Panel angefordert. Melde dich mit Benutzername und diesem PIN an:</p>
        <p style="margin:0 0 6px;font-size:13px;color:${COLORS.muted};">Benutzername</p>
        <p style="margin:0 0 20px;font-size:18px;letter-spacing:-0.02em;color:${COLORS.text};">${escape(opts.username)}</p>
        ${pinCode(opts.pin, 'Persönlicher PIN')}
        <p style="margin:8px 0 20px;">${button(opts.loginUrl, 'Zum Dev-Login')}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Wenn du diese Anfrage nicht gestellt hast, kontaktiere bitte den Support. Speichere den neuen PIN sicher.</p>
      `,
    }),
  }
}

export function tplSupportAck(opts: {
  message: string
  page?: string
}): { subject: string; html: string } {
  return {
    subject: 'Wir haben deine Nachricht erhalten',
    html: layout({
      preheader: 'Antwort meist innerhalb von 1 Stunde.',
      title: 'Nachricht angekommen',
      subtitle: 'Wir melden uns meist innerhalb einer Stunde.',
      body: `
        <p style="margin:0 0 16px;color:${COLORS.muted};">Danke für deine Nachricht. Sie wurde an unser Team weitergeleitet.</p>
        <div style="background:${COLORS.canvas};border:1px solid ${COLORS.hairline};border-radius:16px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:400;color:${COLORS.muted};">Deine Nachricht</p>
          <p style="margin:0;white-space:pre-wrap;font-size:14px;color:${COLORS.text};line-height:1.55;">${escape(opts.message)}</p>
          ${opts.page ? `<p style="margin:12px 0 0;font-size:12px;color:${COLORS.muted};">Seite: ${escape(opts.page)}</p>` : ''}
        </div>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Du kannst auf diese Mail direkt antworten — die Antwort landet automatisch im richtigen Thread.</p>
      `,
    }),
  }
}

export function tplSupportNotify(opts: {
  fromEmail?: string | null
  message: string
  page?: string
  userId?: string | null
}): { subject: string; html: string } {
  return {
    subject: `[Support] ${opts.fromEmail ?? 'Anonym'} – ${opts.message.slice(0, 50)}${opts.message.length > 50 ? '…' : ''}`,
    html: layout({
      title: 'Neue Support-Nachricht',
      subtitle: opts.fromEmail ?? 'Anonymer Nutzer',
      body: `
        <div style="background:${COLORS.canvas};border:1px solid ${COLORS.hairline};border-radius:16px;padding:16px;margin:0 0 16px;">
          <p style="margin:0;white-space:pre-wrap;font-size:14px;color:${COLORS.text};line-height:1.55;">${escape(opts.message)}</p>
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
  description: string
  amount: number
  currency: string
  reference: string
  provider: string
  date: Date
}): { subject: string; html: string } {
  const amount = `${opts.currency.toUpperCase()} ${opts.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const date = opts.date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  return {
    subject: `Zahlung bestätigt – ${amount}`,
    html: layout({
      preheader: `Wir haben deine Zahlung über ${amount} erhalten.`,
      title: 'Zahlung bestätigt',
      subtitle: 'Vielen Dank für deinen Kauf.',
      body: `
        <p style="margin:0 0 16px;">Hi ${opts.customerName ? escape(opts.customerName) : ''},</p>
        <p style="margin:0 0 16px;color:${COLORS.muted};">wir haben deine Zahlung erhalten. Hier die Details:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${COLORS.canvas};border:1px solid ${COLORS.hairline};border-radius:16px;margin:8px 0 16px;">
          <tr><td style="padding:12px 16px;font-size:12px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.hairline};">Beschreibung</td>
              <td style="padding:12px 16px;font-size:13px;color:${COLORS.text};border-bottom:1px solid ${COLORS.hairline};text-align:right;">${escape(opts.description)}</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.hairline};">Betrag</td>
              <td style="padding:12px 16px;font-size:14px;color:${COLORS.text};border-bottom:1px solid ${COLORS.hairline};text-align:right;font-variant-numeric:tabular-nums;">${amount}</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.hairline};">Datum</td>
              <td style="padding:12px 16px;font-size:13px;color:${COLORS.text};border-bottom:1px solid ${COLORS.hairline};text-align:right;">${escape(date)}</td></tr>
          <tr><td style="padding:12px 16px;font-size:12px;color:${COLORS.muted};">Referenz</td>
              <td style="padding:12px 16px;font-size:12px;color:${COLORS.text};text-align:right;font-family:ui-monospace,Menlo,monospace;">${escape(opts.reference)}</td></tr>
        </table>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Bezahlt über ${escape(opts.provider)}. Die Rechnung findest du in deinem Festag-Account unter Abrechnung.</p>
      `,
    }),
  }
}

export function tplPaymentPending(opts: {
  customerName?: string | null
  description: string
  amount: number
  currency: string
  reference: string
}): { subject: string; html: string } {
  const amount = `${opts.currency.toUpperCase()} ${opts.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return {
    subject: `Zahlung in Bearbeitung – ${amount}`,
    html: layout({
      title: 'Zahlung in Bearbeitung',
      subtitle: 'Wir warten auf den Zahlungseingang.',
      body: `
        <p style="margin:0 0 16px;">Hi ${opts.customerName ? escape(opts.customerName) : ''},</p>
        <p style="margin:0 0 16px;color:${COLORS.muted};">wir haben deine Zahlung über <strong style="font-weight:500;color:${COLORS.text};">${amount}</strong> für <strong style="font-weight:500;color:${COLORS.text};">${escape(opts.description)}</strong> registriert. Sobald sie auf unserem Konto eingegangen ist, schalten wir den Plan automatisch frei.</p>
        <p style="margin:0 0 12px;font-size:13px;color:${COLORS.muted};">Referenz: ${escape(opts.reference)}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Bei SEPA dauert das in der Regel 1–2 Werktage.</p>
      `,
    }),
  }
}

export function tplGeneric(opts: {
  title: string
  subtitle?: string
  body: string
  preheader?: string
}): { subject: string; html: string } {
  return {
    subject: opts.title,
    html: layout(opts),
  }
}

export function tplWelcome(opts: {
  firstName?: string | null
  appUrl: string
}): { subject: string; html: string } {
  const greeting = opts.firstName?.trim() ? `Hi ${escape(opts.firstName.trim())},` : 'Hi,'
  return {
    subject: 'Willkommen bei Festag',
    html: layout({
      preheader: 'Dein ruhiger Projektraum ist bereit.',
      title: 'Willkommen bei Festag',
      subtitle: 'Schön, dass du da bist. Festag ist dein ruhiger Projektraum — kein Cockpit, kein Fachchinesisch.',
      feature: { variant: 'dusk', mock: 'pulse' },
      body: `
        <p style="margin:0 0 16px;">${greeting}</p>
        <p style="margin:0 0 16px;color:${COLORS.muted};">Du beschreibst dein Vorhaben, Tagro übersetzt und zerlegt es, und du siehst jederzeit verständlich, wo dein Projekt steht.</p>
        <p style="margin:0 0 20px;color:${COLORS.muted};">Leg direkt los — oben links auf „Neues Projekt“.</p>
        <p style="margin:0 0 20px;">${button(opts.appUrl, 'Festag öffnen')}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">In Kürze bekommst du eine zweite Mail mit einer kleinen Tour durch alles Wichtige.</p>
      `,
    }),
  }
}

export function tplGettingStarted(opts: {
  firstName?: string | null
  appUrl: string
}): { subject: string; html: string } {
  const greeting = opts.firstName?.trim() ? `Hi ${escape(opts.firstName.trim())},` : 'Hi,'
  const item = (title: string, text: string) =>
    `<tr><td style="padding:0 0 18px;">
       <p style="margin:0 0 4px;font-size:15px;font-weight:500;letter-spacing:-0.02em;color:${COLORS.text};">${escape(title)}</p>
       <p style="margin:0;font-size:14px;color:${COLORS.muted};line-height:1.55;">${escape(text)}</p>
     </td></tr>`
  return {
    subject: 'So funktioniert Festag',
    html: layout({
      preheader: 'Statusabfrage, Posteingang, Projekte — in einer Minute erklärt.',
      title: 'So funktioniert Festag',
      subtitle: 'Acht Bereiche in einer Minute erklärt — ruhig, klar, ohne Status-Theater.',
      feature: { variant: 'olive', mock: 'status' },
      body: `
        <p style="margin:0 0 20px;">${greeting}</p>
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
        <p style="margin:8px 0 20px;">${button(opts.appUrl, 'Zum Dashboard')}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Eine Frage? Antworte einfach auf diese Mail — sie landet direkt bei uns.</p>
      `,
    }),
  }
}

export function tplDevCredentials(opts: {
  devName?: string | null
  username: string
  pin: string
  loginUrl: string
  fromName?: string | null
}): { subject: string; html: string } {
  const name = opts.devName?.trim()
  const greeting = name ? `Hallo ${escape(name)},` : 'Hallo,'
  return {
    subject: 'Festag Dev Panel — Zugang',
    html: layout({
      preheader: 'Einmaliger Zugangscode für das Festag Dev Panel.',
      title: 'Dev Panel Zugang',
      subtitle: 'Das Dev Panel ist die Ausführungsfläche für Entwickler und Agenturen — Aufträge, Status und Freigaben, ohne Client-Chaos.',
      feature: { variant: 'olive', mock: 'dev' },
      body: `
        <p style="margin:0 0 16px;">${greeting}</p>
        <p style="margin:0 0 20px;color:${COLORS.muted};">Für dich wurde ein Entwicklerkonto vorbereitet. Erster Login:</p>
        <p style="margin:0 0 8px;font-size:14px;color:${COLORS.muted};">1. Öffne den Link unten (oder gehe zu festag.app/dev/login).</p>
        <p style="margin:0 0 8px;font-size:14px;color:${COLORS.muted};">2. Benutzername und Einladungs-PIN eingeben.</p>
        <p style="margin:0 0 24px;font-size:14px;color:${COLORS.muted};">3. Workspace-Namen und deinen persönlichen 6-stelligen PIN festlegen.</p>
        <p style="margin:0 0 6px;font-size:13px;color:${COLORS.muted};">Benutzername</p>
        <p style="margin:0 0 20px;font-size:18px;letter-spacing:-0.02em;color:${COLORS.text};">${escape(opts.username)}</p>
        ${pinCode(opts.pin, 'Einladungs-PIN (einmalig)')}
        <p style="margin:0 0 20px;">${button(opts.loginUrl, 'Zum Login')}</p>
        <p style="margin:0;font-size:13px;color:${COLORS.muted};">Der Einladungs-PIN gilt nur einmal. Danach reicht dein persönlicher PIN — speichere ihn im Schlüsselbund.</p>
      `,
    }),
  }
}

export function tplDevAssignment(opts: {
  devName?: string | null
  projectTitle: string
  scope?: string | null
  devPanelUrl: string
  fromName?: string | null
}): { subject: string; html: string } {
  const greeting = opts.devName?.trim() ? `Hi ${escape(opts.devName.trim())},` : 'Hi,'
  const from = opts.fromName?.trim() ? escape(opts.fromName.trim()) : 'Festag'
  return {
    subject: `Neuer Auftrag: ${opts.projectTitle}`,
    html: layout({
      preheader: `${from} hat dir ein Projekt zugewiesen.`,
      title: 'Neuer Auftrag für dich',
      subtitle: `${from} hat dir „${escape(opts.projectTitle)}" zugewiesen.`,
      feature: { variant: 'stone', mock: 'dev' },
      body: `
        <p style="margin:0 0 16px;">${greeting}</p>
        <p style="margin:0 0 16px;color:${COLORS.muted};">Du wurdest als Entwickler für ein neues Projekt ausgewählt. Tagro hat das Briefing bereits in klare Schritte zerlegt — du findest alles in deinem Dev-Panel.</p>
        <div style="background:${COLORS.canvas};border:1px solid ${COLORS.hairline};border-radius:16px;padding:18px;margin:8px 0 20px;">
          <p style="margin:0 0 6px;font-size:12px;color:${COLORS.muted};">Projekt</p>
          <p style="margin:0 0 ${opts.scope ? '10px' : '0'};font-size:16px;font-weight:500;letter-spacing:-0.02em;color:${COLORS.text};">${escape(opts.projectTitle)}</p>
          ${opts.scope ? `<p style="margin:0;font-size:14px;color:${COLORS.muted};line-height:1.55;">${escape(opts.scope)}</p>` : ''}
        </div>
        <p style="margin:0 0 8px;">${button(opts.devPanelUrl, 'Auftrag im Dev-Panel ansehen')}</p>
      `,
    }),
  }
}

export function tplProjectAccepted(opts: {
  clientName?: string | null
  projectTitle: string
  devName: string
  projectUrl: string
}): { subject: string; html: string } {
  const greeting = opts.clientName?.trim() ? `Hi ${escape(opts.clientName.trim())},` : 'Hi,'
  return {
    subject: `Dein Projekt hat einen Entwickler: ${opts.projectTitle}`,
    html: layout({
      preheader: `${opts.devName} übernimmt „${opts.projectTitle}".`,
      title: 'Dein Projekt ist startklar',
      subtitle: `${escape(opts.devName)} übernimmt die Umsetzung.`,
      feature: { variant: 'dusk', mock: 'pulse' },
      body: `
        <p style="margin:0 0 16px;">${greeting}</p>
        <p style="margin:0 0 16px;color:${COLORS.muted};">gute Neuigkeiten — <strong style="font-weight:500;color:${COLORS.text};">${escape(opts.devName)}</strong> hat deinen Auftrag „${escape(opts.projectTitle)}" angenommen und beginnt mit der Umsetzung.</p>
        <p style="margin:0 0 20px;color:${COLORS.muted};">Tagro begleitet das Projekt von hier an: Jeder Schritt wird für dich verständlich zusammengefasst. Du musst nichts Technisches lesen.</p>
        <p style="margin:0 0 8px;">${button(opts.projectUrl, 'Projekt öffnen')}</p>
      `,
    }),
  }
}

export function tplProjectNextSteps(opts: {
  clientName?: string | null
  projectTitle: string
  projectUrl: string
}): { subject: string; html: string } {
  const greeting = opts.clientName?.trim() ? `Hi ${escape(opts.clientName.trim())},` : 'Hi,'
  const step = (n: string, title: string, text: string) =>
    `<tr><td style="padding:0 0 16px;vertical-align:top;width:32px;">
       <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${COLORS.btnBg};color:#fff;text-align:center;line-height:24px;font-size:12px;font-weight:500;">${n}</span>
     </td><td style="padding:0 0 16px;">
       <p style="margin:0 0 2px;font-size:15px;font-weight:500;letter-spacing:-0.02em;color:${COLORS.text};">${escape(title)}</p>
       <p style="margin:0;font-size:13.5px;color:${COLORS.muted};line-height:1.5;">${escape(text)}</p>
     </td></tr>`
  return {
    subject: `So geht es weiter: ${opts.projectTitle}`,
    html: layout({
      preheader: 'Die nächsten Schritte für dein Projekt.',
      title: 'So geht es jetzt weiter',
      subtitle: `Dein Projekt „${escape(opts.projectTitle)}".`,
      feature: { variant: 'olive', mock: 'decision' },
      body: `
        <p style="margin:0 0 20px;">${greeting}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${step('1', 'Tagro strukturiert', 'Dein Briefing ist in klare Aufgaben und Meilensteine zerlegt.')}
          ${step('2', 'Umsetzung beginnt', 'Dein Entwickler arbeitet die Schritte ab. Jedes Update wird geprüft.')}
          ${step('3', 'Du bleibst im Bild', 'Auf dem Dashboard fragst du jederzeit den ruhigen Projektstand ab.')}
        </table>
        <p style="margin:8px 0 8px;">${button(opts.projectUrl, 'Projekt ansehen')}</p>
      `,
    }),
  }
}

export function tplFestagGuarantee(opts: {
  clientName?: string | null
  projectTitle: string
  docUrl: string
}): { subject: string; html: string } {
  const greeting = opts.clientName?.trim() ? `Hi ${escape(opts.clientName.trim())},` : 'Hi,'
  const point = (text: string) =>
    `<tr><td style="padding:0 0 14px;font-size:14px;color:${COLORS.muted};line-height:1.55;">— ${escape(text)}</td></tr>`
  return {
    subject: 'Die Festag-Garantie',
    html: layout({
      preheader: 'Was Festag dir für dein Projekt zusichert.',
      title: 'Die Festag-Garantie',
      subtitle: `Für dein Projekt „${escape(opts.projectTitle)}".`,
      feature: { variant: 'stone', mock: 'pulse' },
      body: `
        <p style="margin:0 0 16px;">${greeting}</p>
        <p style="margin:0 0 16px;color:${COLORS.muted};">Mit Festag gehst du kein Risiko ein. Das sichern wir dir zu:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
          ${point('Geprüfter Fortschritt: Jeder Arbeitsstand wird von Tagro kontrolliert, bevor er bei dir ankommt.')}
          ${point('Volle Transparenz: Du siehst jederzeit verständlich, wo dein Projekt steht — ohne Fachjargon.')}
          ${point('Kein Informationsverlust: Tagro übersetzt zwischen dir und dem Entwickler in beide Richtungen.')}
          ${point('Verlässliche Umsetzung: Festag steuert die Lieferung und steht für die Qualität gerade.')}
        </table>
        <p style="margin:8px 0 8px;">${button(opts.docUrl, 'Festag-Garantie im Detail')}</p>
      `,
    }),
  }
}
