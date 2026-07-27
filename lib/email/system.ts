/**
 * Festag Email Design System — shared tokens + layout primitives.
 *
 * Transactional mails stay calm (title → body → CTA → security note).
 * Marketing / onboarding mails may add an optional feature panel.
 *
 * Email-safe: tables, inline styles, hosted fonts on festag.app.
 */

export const EMAIL_APP = (process.env.NEXT_PUBLIC_APP_URL || 'https://festag.app').replace(/\/$/, '')

export const EMAIL = {
  canvas: '#F7F8F8',
  card: '#ffffff',
  text: '#1e1e20',
  muted: '#8891a0',
  soft: '#a0a6b0',
  hairline: 'rgba(30, 30, 32, 0.08)',
  btnBg: '#1e1e20',
  btnFg: '#ffffff',
  success: '#2D7C46',
  warning: '#D9A441',
  error: '#D94A4A',
  securityBg: 'rgba(91, 138, 107, 0.08)',
  securityBorder: 'rgba(91, 138, 107, 0.18)',
  securityFg: '#5B8A6B',
} as const

export const EMAIL_FONT =
  "'Aeonik', 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export type EmailArtVariant = 'olive' | 'dusk' | 'stone'
export type EmailMockKind = 'status' | 'decision' | 'code' | 'dev' | 'pulse'

const ART: Record<EmailArtVariant, string> = {
  olive: `${EMAIL_APP}/email/art-olive.svg`,
  dusk: `${EMAIL_APP}/email/art-dusk.svg`,
  stone: `${EMAIL_APP}/email/art-stone.svg`,
}

export function emailEscape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export function emailWordmark(): string {
  return `<span style="font-family:${EMAIL_FONT};font-size:18px;font-weight:400;letter-spacing:-0.03em;line-height:1;color:${EMAIL.text};">festag</span>`
}

export function emailButton(href: string, label: string): string {
  return `<a href="${emailEscape(href)}" style="display:inline-block;padding:14px 22px;background:${EMAIL.btnBg};color:${EMAIL.btnFg};text-decoration:none;border-radius:999px;font-family:${EMAIL_FONT};font-weight:400;font-size:14px;letter-spacing:0.01em;line-height:1;border:0;">${emailEscape(label)}&nbsp;→</a>`
}

export function emailGhostButton(href: string, label: string): string {
  return `<a href="${emailEscape(href)}" style="display:inline-block;padding:13px 20px;background:transparent;color:${EMAIL.text};text-decoration:none;border-radius:999px;font-family:${EMAIL_FONT};font-weight:400;font-size:14px;letter-spacing:0.01em;line-height:1;border:1px solid ${EMAIL.hairline};">${emailEscape(label)}</a>`
}

export function emailPinCode(pin: string, label?: string): string {
  const lab = label
    ? `<p style="margin:0 0 10px;font-size:13px;font-weight:400;color:${EMAIL.muted};letter-spacing:0.01em;">${emailEscape(label)}</p>`
    : ''
  return `<div style="margin:28px 0;">
    ${lab}
    <p style="margin:0;font-size:32px;font-weight:400;letter-spacing:0.32em;line-height:1.15;font-family:${EMAIL_FONT};color:${EMAIL.text};">${emailEscape(pin)}</p>
  </div>`
}

export function emailSecurityNote(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-collapse:collapse;">
    <tr>
      <td style="padding:14px 16px;background:${EMAIL.securityBg};border:1px solid ${EMAIL.securityBorder};border-radius:12px;font-family:${EMAIL_FONT};font-size:12.5px;line-height:1.55;color:${EMAIL.muted};">
        <span style="color:${EMAIL.securityFg};font-weight:500;">Sicherheit</span>
        <span style="padding:0 6px;color:${EMAIL.soft};">—</span>
        ${emailEscape(text)}
      </td>
    </tr>
  </table>`
}

export function emailMetaRow(items: Array<{ label: string; value: string }>): string {
  const cells = items.map(item => `
    <td style="padding:0 16px 0 0;vertical-align:top;">
      <p style="margin:0 0 4px;font-family:${EMAIL_FONT};font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:${EMAIL.soft};">${emailEscape(item.label)}</p>
      <p style="margin:0;font-family:${EMAIL_FONT};font-size:14px;font-weight:500;color:${EMAIL.text};">${emailEscape(item.value)}</p>
    </td>`).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;"><tr>${cells}</tr></table>`
}

function uiMock(kind: EmailMockKind): string {
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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(12,12,14,0.92);border-radius:16px;overflow:hidden;">
        ${chrome}
        <tr><td style="padding:8px 20px 28px;">
          <p style="margin:0 0 10px;font-family:${EMAIL_FONT};font-size:12px;color:rgba(245,245,247,0.55);">Anmeldecode</p>
          <p style="margin:0;font-family:${EMAIL_FONT};font-size:28px;letter-spacing:0.28em;color:#f5f5f7;">4 8 2 9 1 7</p>
        </td></tr>
      </table>`
  }

  if (kind === 'decision') {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.96);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:18px 18px 8px;">
          <p style="margin:0 0 6px;font-family:${EMAIL_FONT};font-size:11px;color:${EMAIL.muted};">Wartet auf dich</p>
          <p style="margin:0 0 10px;font-family:${EMAIL_FONT};font-size:16px;font-weight:500;color:${EMAIL.text};letter-spacing:-0.02em;">Design-Freigabe Staging</p>
          <p style="margin:0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.45;color:${EMAIL.muted};">Ohne deine Freigabe stockt der nächste Schritt.</p>
        </td></tr>
        <tr><td style="padding:12px 18px 18px;">
          <span style="display:inline-block;padding:8px 12px;border-radius:999px;background:${EMAIL.btnBg};color:#fff;font-family:${EMAIL_FONT};font-size:12px;">Freigeben</span>
        </td></tr>
      </table>`
  }

  if (kind === 'dev') {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(12,12,14,0.94);border-radius:16px;overflow:hidden;">
        ${chrome}
        <tr><td style="padding:4px 18px 22px;">
          <p style="margin:0 0 8px;font-family:${EMAIL_FONT};font-size:12px;color:rgba(245,245,247,0.5);">Execution Panel</p>
          <p style="margin:0 0 14px;font-family:${EMAIL_FONT};font-size:15px;color:#f5f5f7;">Auftrag bereit</p>
          <p style="margin:0;font-family:${EMAIL_FONT};font-size:12px;color:rgba(245,245,247,0.55);">Workspace, Rolle, sicherer Link</p>
        </td></tr>
      </table>`
  }

  if (kind === 'pulse') {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.94);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:18px;">
          <p style="margin:0 0 12px;font-family:${EMAIL_FONT};font-size:11px;color:${EMAIL.muted};">Delivery Pulse</p>
          <p style="margin:0 0 8px;font-family:${EMAIL_FONT};font-size:14px;color:${EMAIL.text};line-height:1.45;"><strong style="font-weight:500;">Fortschritt</strong> — 3 PRs merged, Design freigegeben</p>
          <p style="margin:0 0 8px;font-family:${EMAIL_FONT};font-size:14px;color:${EMAIL.text};line-height:1.45;"><strong style="font-weight:500;">Risiko</strong> — eine Entscheidung wartet auf dich</p>
          <p style="margin:0;font-family:${EMAIL_FONT};font-size:14px;color:${EMAIL.text};line-height:1.45;"><strong style="font-weight:500;">Nächster Schritt</strong> — Freigabe Staging</p>
        </td></tr>
      </table>`
  }

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.95);border-radius:16px;overflow:hidden;">
      <tr><td style="padding:18px 18px 6px;">
        <p style="margin:0 0 4px;font-family:${EMAIL_FONT};font-size:11px;color:${EMAIL.muted};">Statusabfrage</p>
        <p style="margin:0;font-family:${EMAIL_FONT};font-size:17px;font-weight:500;letter-spacing:-0.02em;color:${EMAIL.text};">Ruhiger Gesamtbericht</p>
      </td></tr>
      <tr><td style="padding:10px 18px 18px;">
        <p style="margin:0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.5;color:${EMAIL.muted};">Tagro verdichtet Signale in Klarheit — ohne Status-Theater.</p>
      </td></tr>
    </table>`
}

/** Soft content card for quotes, payment tables, support messages. */
export function emailCard(innerHtml: string): string {
  return `<div style="background:${EMAIL.canvas};border:1px solid ${EMAIL.hairline};border-radius:16px;padding:16px 18px;margin:8px 0 20px;">${innerHtml}</div>`
}

export function emailMuted(text: string, margin = '0 0 16px'): string {
  return `<p style="margin:${margin};color:${EMAIL.muted};">${text}</p>`
}

export function emailFeatureArt(opts: {
  variant?: EmailArtVariant
  mock?: EmailMockKind
}): string {
  const variant = opts.variant || 'olive'
  const mock = opts.mock || 'status'
  const bg = ART[variant]
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 32px;border-collapse:collapse;">
      <tr>
        <td background="${bg}" bgcolor="#2a2a22" style="background-image:url('${bg}');background-size:cover;background-position:center;background-color:#2a2a22;border-radius:28px;padding:36px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;margin:0 auto;">
            <tr><td>${uiMock(mock)}</td></tr>
          </table>
        </td>
      </tr>
    </table>`
}

export function emailFooterLinks(): string {
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${EMAIL.soft};text-decoration:none;font-size:12px;font-family:${EMAIL_FONT};">${emailEscape(label)}</a>`
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:0 0 14px;">${emailWordmark()}</td>
      </tr>
      <tr>
        <td style="padding:0 0 16px;font-family:${EMAIL_FONT};font-size:12px;line-height:1.6;color:${EMAIL.soft};">
          ${link(`${EMAIL_APP}/docs`, 'Docs')}
          <span style="padding:0 8px;color:${EMAIL.hairline};">|</span>
          ${link(`${EMAIL_APP}/datenschutz`, 'Datenschutz')}
          <span style="padding:0 8px;color:${EMAIL.hairline};">|</span>
          ${link(`${EMAIL_APP}/impressum`, 'Impressum')}
          <span style="padding:0 8px;color:${EMAIL.hairline};">|</span>
          ${link('mailto:hello@festag.app', 'Hilfe')}
        </td>
      </tr>
      <tr>
        <td style="font-family:${EMAIL_FONT};font-size:11px;line-height:1.55;color:${EMAIL.soft};">
          Festag, München, <a href="${EMAIL_APP}" style="color:${EMAIL.soft};text-decoration:none;">festag.app</a>
        </td>
      </tr>
    </table>`
}

export function emailLayout(opts: {
  preheader?: string
  title: string
  subtitle?: string
  body: string
  feature?: { variant?: EmailArtVariant; mock?: EmailMockKind }
  footer?: string
}): string {
  const feature = opts.feature ? emailFeatureArt(opts.feature) : ''
  return `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<style>
@font-face{font-family:'Aeonik';src:url('${EMAIL_APP}/fonts/Aeonik-Regular.ttf') format('truetype');font-weight:400;font-style:normal;mso-font-alt:'Helvetica Neue';}
</style>
<title>${emailEscape(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL.canvas};font-family:${EMAIL_FONT};font-weight:400;color:${EMAIL.text};line-height:1.55;-webkit-font-smoothing:antialiased;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;opacity:0;">${emailEscape(opts.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL.canvas};border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:40px 16px 56px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${EMAIL.card};border-radius:24px;border:1px solid ${EMAIL.hairline};overflow:hidden;border-collapse:collapse;">
        <tr>
          <td style="padding:40px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:0 0 36px;">${emailWordmark()}</td></tr>
              <tr><td style="padding:0 0 14px;font-family:${EMAIL_FONT};font-size:28px;font-weight:500;letter-spacing:-0.03em;line-height:1.22;color:${EMAIL.text};">${emailEscape(opts.title)}</td></tr>
              ${opts.subtitle
                ? `<tr><td style="padding:0 0 28px;font-family:${EMAIL_FONT};font-size:15.5px;font-weight:400;line-height:1.65;letter-spacing:0.01em;color:${EMAIL.muted};">${emailEscape(opts.subtitle)}</td></tr>`
                : `<tr><td style="padding:0 0 20px;"></td></tr>`}
            </table>
          </td>
        </tr>
        ${feature ? `<tr><td style="padding:0 24px;">${feature}</td></tr>` : ''}
        <tr>
          <td style="padding:0 40px 8px;font-family:${EMAIL_FONT};font-size:15px;font-weight:400;color:${EMAIL.text};line-height:1.6;">
            ${opts.body}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 36px;border-top:1px solid ${EMAIL.hairline};">
            ${opts.footer ?? emailFooterLinks()}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body></html>`
}
