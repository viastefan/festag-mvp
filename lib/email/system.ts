/**
 * Festag Email Design System — shared tokens + layout primitives.
 *
 * Letter-like: open canvas, no card shell, no nested boxes.
 * Title → body → action → quiet note → footer.
 *
 * Email-safe: tables, inline styles, hosted fonts on festag.app.
 */

export const EMAIL_APP = (process.env.NEXT_PUBLIC_APP_URL || 'https://festag.app').replace(/\/$/, '')

export const EMAIL = {
  /** Soft ivory — continuous page, not a framed card. */
  canvas: '#FAF9F5',
  text: '#1A1917',
  muted: '#8891a0',
  soft: '#a8aeb8',
  hairline: 'rgba(26, 25, 23, 0.08)',
  /** Calm primary link / soft CTA fill (Festag light). */
  btnBg: '#ffffff',
  btnFg: '#1A1917',
  btnBorder: 'rgba(26, 25, 23, 0.08)',
  accent: '#5B647D',
} as const

export const EMAIL_FONT =
  "'Aeonik', 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

/** Aeonik Medium stack for quiet marks (TagroSI). */
export const EMAIL_FONT_MEDIUM =
  "'Aeonik Medium', 'Aeonik', 'Helvetica Neue', Helvetica, Arial, sans-serif"

/** @deprecated Kept for call-site compat — feature panels are no longer rendered. */
export type EmailArtVariant = 'olive' | 'dusk' | 'stone'
/** @deprecated Kept for call-site compat — feature panels are no longer rendered. */
export type EmailMockKind = 'status' | 'decision' | 'code' | 'dev' | 'pulse'

export function emailEscape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export function emailWordmark(): string {
  return `<span style="font-family:${EMAIL_FONT};font-size:15px;font-weight:400;letter-spacing:-0.04em;line-height:1;color:${EMAIL.text};">festag</span>`
}

/** Soft rectangular CTA — white fill, hairline, 6px radius (no pill, no black bar). */
export function emailButton(href: string, label: string): string {
  return `<a href="${emailEscape(href)}" style="display:inline-block;padding:11px 18px;background:${EMAIL.btnBg};color:${EMAIL.btnFg};text-decoration:none;border-radius:6px;font-family:${EMAIL_FONT};font-weight:400;font-size:14px;letter-spacing:0.01em;line-height:1;border:1px solid ${EMAIL.btnBorder};box-shadow:0 1px 2px rgba(0,0,0,0.04);">${emailEscape(label)}</a>`
}

/** Quiet text action — preferred when the mail should stay fully letter-like. */
export function emailTextLink(href: string, label: string): string {
  return `<a href="${emailEscape(href)}" style="color:${EMAIL.accent};text-decoration:none;font-family:${EMAIL_FONT};font-size:15px;font-weight:400;letter-spacing:0.01em;">${emailEscape(label)}&nbsp;→</a>`
}

export function emailGhostButton(href: string, label: string): string {
  return emailTextLink(href, label)
}

export function emailPinCode(pin: string, label?: string): string {
  const lab = label
    ? `<p style="margin:0 0 12px;font-size:13px;font-weight:400;color:${EMAIL.muted};letter-spacing:0.01em;">${emailEscape(label)}</p>`
    : ''
  return `<div style="margin:32px 0 28px;">
    ${lab}
    <p style="margin:0;font-size:34px;font-weight:400;letter-spacing:0.28em;line-height:1.1;font-family:${EMAIL_FONT};color:${EMAIL.text};">${emailEscape(pin)}</p>
  </div>`
}

/** Plain security line — no tinted box. */
export function emailSecurityNote(text: string): string {
  return `<p style="margin:32px 0 0;font-family:${EMAIL_FONT};font-size:13px;line-height:1.6;color:${EMAIL.muted};">${emailEscape(text)}</p>`
}

export function emailMetaRow(items: Array<{ label: string; value: string }>): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding:0 0 14px;vertical-align:top;">
        <p style="margin:0 0 3px;font-family:${EMAIL_FONT};font-size:13px;color:${EMAIL.muted};">${emailEscape(item.label)}</p>
        <p style="margin:0;font-family:${EMAIL_FONT};font-size:15px;font-weight:400;color:${EMAIL.text};">${emailEscape(item.value)}</p>
      </td>
    </tr>`).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border-collapse:collapse;">${rows}</table>`
}

/**
 * Quoted / detail block — typography only (no fill, no border, no radius).
 * Prefer a calm lead line + body; never a card shell.
 */
export function emailCard(innerHtml: string): string {
  return `<div style="margin:8px 0 28px;padding:0;">${innerHtml}</div>`
}

export function emailMuted(text: string, margin = '0 0 16px'): string {
  return `<p style="margin:${margin};font-family:${EMAIL_FONT};font-size:15px;line-height:1.65;color:${EMAIL.muted};">${text}</p>`
}

/** Feature art retired — kept as no-op so existing call sites stay typed. */
export function emailFeatureArt(_opts: {
  variant?: EmailArtVariant
  mock?: EmailMockKind
}): string {
  return ''
}

export function emailFooterLinks(): string {
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${EMAIL.soft};text-decoration:none;font-size:12px;font-family:${EMAIL_FONT};">${emailEscape(label)}</a>`
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td align="left" style="padding:0 0 18px;font-family:${EMAIL_FONT};font-size:12px;line-height:1.7;color:${EMAIL.soft};">
          ${link(`${EMAIL_APP}/docs`, 'Docs')}
          <span style="padding:0 10px;color:${EMAIL.hairline};"> </span>
          ${link(`${EMAIL_APP}/datenschutz`, 'Datenschutz')}
          <span style="padding:0 10px;color:${EMAIL.hairline};"> </span>
          ${link(`${EMAIL_APP}/impressum`, 'Impressum')}
          <span style="padding:0 10px;color:${EMAIL.hairline};"> </span>
          ${link('mailto:hello@festag.app', 'Hilfe')}
        </td>
      </tr>
      <tr>
        <td align="left" style="padding:0 0 28px;font-family:${EMAIL_FONT};font-size:11px;line-height:1.55;color:${EMAIL.soft};">
          Festag, München, <a href="${EMAIL_APP}" style="color:${EMAIL.soft};text-decoration:none;">festag.app</a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:0;">
          <a href="${EMAIL_APP}" class="festag-tsi" title="TagroSuperIntelligence" style="display:inline-grid;place-items:center;text-decoration:none;cursor:default;font-family:${EMAIL_FONT_MEDIUM};font-size:10.5px;font-weight:500;letter-spacing:0.02em;line-height:1.2;color:${EMAIL.soft};">
            <span class="festag-tsi-short" style="grid-area:1/1;">TagroSI</span>
            <span class="festag-tsi-full" style="grid-area:1/1;opacity:0;visibility:hidden;white-space:nowrap;">TagroSuperIntelligence</span>
          </a>
        </td>
      </tr>
    </table>`
}

/**
 * Open letter layout — no white card, no border, no radius shell.
 * Wordmark → title → optional subtitle → body → quiet footer.
 */
export function emailLayout(opts: {
  preheader?: string
  title: string
  subtitle?: string
  body: string
  feature?: { variant?: EmailArtVariant; mock?: EmailMockKind }
  footer?: string
}): string {
  void opts.feature
  return `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<style>
@font-face{font-family:'Aeonik';src:url('${EMAIL_APP}/fonts/Aeonik-Regular.ttf') format('truetype');font-weight:400;font-style:normal;mso-font-alt:'Helvetica Neue';}
@font-face{font-family:'Aeonik Medium';src:url('${EMAIL_APP}/fonts/Aeonik-Medium.ttf') format('truetype');font-weight:500;font-style:normal;mso-font-alt:'Helvetica Neue';}
.festag-tsi:hover .festag-tsi-short{opacity:0;visibility:hidden;}
.festag-tsi:hover .festag-tsi-full{opacity:1!important;visibility:visible!important;}
.festag-tsi:hover{color:${EMAIL.muted};}
</style>
<title>${emailEscape(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL.canvas};font-family:${EMAIL_FONT};font-weight:400;color:${EMAIL.text};line-height:1.55;-webkit-font-smoothing:antialiased;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;opacity:0;">${emailEscape(opts.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL.canvas};border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:48px 24px 64px;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:0 0 40px;">${emailWordmark()}</td>
        </tr>
        <tr>
          <td style="padding:0 0 12px;font-family:${EMAIL_FONT};font-size:26px;font-weight:400;letter-spacing:-0.03em;line-height:1.25;color:${EMAIL.text};">${emailEscape(opts.title)}</td>
        </tr>
        ${opts.subtitle
          ? `<tr><td style="padding:0 0 32px;font-family:${EMAIL_FONT};font-size:15.5px;font-weight:400;line-height:1.65;letter-spacing:0.01em;color:${EMAIL.muted};">${emailEscape(opts.subtitle)}</td></tr>`
          : `<tr><td style="padding:0 0 24px;"></td></tr>`}
        <tr>
          <td style="padding:0;font-family:${EMAIL_FONT};font-size:15px;font-weight:400;color:${EMAIL.text};line-height:1.65;">
            ${opts.body}
          </td>
        </tr>
        <tr>
          <td style="padding:48px 0 0;">
            ${opts.footer ?? emailFooterLinks()}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body></html>`
}
