/**
 * Festag outbound email templates.
 *
 * All chrome lives in `lib/email/system.ts`. This file only composes copy +
 * structure. Transactional mails stay calm (no feature art). Onboarding /
 * assignment mails may use the optional feature panel.
 */

import {
  EMAIL,
  emailButton,
  emailCard,
  emailEscape,
  emailLayout,
  emailMetaRow,
  emailMuted,
  emailPinCode,
  emailSecurityNote,
} from './system'

function roleLabel(role: 'dev' | 'client' | 'collaborator' | 'admin'): string {
  if (role === 'dev') return 'Developer'
  if (role === 'admin') return 'Admin'
  if (role === 'client') return 'Kunde'
  return 'Mitglied'
}

function greeting(name?: string | null, style: 'Hi' | 'Hallo' = 'Hi'): string {
  const n = name?.trim()
  return n ? `${style} ${emailEscape(n)},` : `${style},`
}

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
  const label = roleLabel(opts.role)
  return {
    subject: 'Du wurdest zu Festag eingeladen',
    html: emailLayout({
      preheader: `${opts.fromName} hat dich als ${label} eingeladen.`,
      title: 'Du wurdest eingeladen',
      subtitle: `${opts.fromName} möchte dich als ${label} im Festag-Workspace.`,
      feature: { variant: 'dusk', mock: 'status' },
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.invitedName)}</p>
        ${emailMuted('Du wurdest eingeladen, dem Festag-Workspace beizutreten. Melde dich mit deiner E-Mail und dem folgenden PIN an:')}
        ${emailPinCode(opts.pin, 'Zugangs-PIN')}
        <p style="margin:0 0 20px;">${emailButton(opts.acceptUrl, 'Festag öffnen')}</p>
        ${emailSecurityNote('Dieser PIN ist 14 Tage gültig. Nach dem Login richtest du dein Passwort ein.')}
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
  const label = roleLabel(opts.role)
  return {
    subject: `Einladung zu Festag — von ${opts.fromName}`,
    html: emailLayout({
      preheader: `${opts.fromName} hat dich als ${label} zu Festag eingeladen.`,
      title: 'Einladung zu Festag',
      subtitle: `${opts.fromName} möchte dich als ${label} hinzufügen.`,
      feature: { variant: 'olive', mock: 'status' },
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.invitedName)}</p>
        ${emailMuted('Du wurdest zu einem Festag-Workspace eingeladen. Nach dem Annehmen erhältst du automatisch eine zweite Mail mit deinem persönlichen Zugangs-PIN.')}
        <p style="margin:0 0 20px;">${emailButton(opts.acceptUrl, 'Einladung annehmen')}</p>
        ${emailSecurityNote('Der Link ist 14 Tage gültig. Wenn du die Einladung nicht erwartest, ignoriere diese Mail.')}
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
  const label = roleLabel(opts.role)
  return {
    subject: 'Dein Festag-Zugangs-PIN',
    html: emailLayout({
      preheader: 'Dein persönlicher PIN — 14 Tage gültig.',
      title: 'Dein Zugangs-PIN',
      subtitle: `Du wurdest als ${label} bestätigt.`,
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.invitedName)}</p>
        ${emailMuted('Danke fürs Annehmen. Logge dich auf festag.app ein und gib den PIN unter „Einladungspin erhalten?“ ein.')}
        ${emailPinCode(opts.pin, 'Zugangs-PIN')}
        <p style="margin:0 0 20px;">${emailButton(opts.redeemUrl, 'PIN einlösen')}</p>
        ${emailSecurityNote('Der PIN ist 14 Tage gültig. Danach richtest du dein Passwort ein und wirst dem Workspace zugewiesen.')}
      `,
    }),
  }
}

export function tplPasswordReset(opts: {
  resetUrl: string
}): { subject: string; html: string } {
  return {
    subject: 'Passwort zurücksetzen — Festag',
    html: emailLayout({
      preheader: 'Sicherer Link zum Zurücksetzen deines Festag-Passworts.',
      title: 'Passwort zurücksetzen',
      subtitle: 'Der Link ist zeitlich begrenzt und nur einmal nutzbar.',
      body: `
        ${emailMuted('Du hast angefordert, dein Festag-Passwort zurückzusetzen.')}
        ${emailMuted('Klicke auf den Button, bestätige die Anmeldung und lege anschließend ein neues Passwort fest.')}
        <p style="margin:0 0 20px;">${emailButton(opts.resetUrl, 'Neues Passwort festlegen')}</p>
        ${emailSecurityNote('Wenn du diese Anfrage nicht gestellt hast, ignoriere die Mail. Dein Passwort bleibt unverändert.')}
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
  const lead = isSignup
    ? 'Nutze diesen Code, um deine E-Mail-Adresse bei Festag zu bestätigen.'
    : 'Nutze diesen Code, um dich bei Festag anzumelden.'
  const note = isSignup
    ? 'Der Code ist 60 Minuten gültig. Hast du keinen Account erstellt, ignoriere diese E-Mail.'
    : 'Der Code ist 60 Minuten gültig. Hast du den Login nicht angefordert, ignoriere diese E-Mail.'

  return {
    subject,
    html: emailLayout({
      preheader: `Code: ${opts.code}`,
      title: subject,
      subtitle: lead,
      body: `
        ${emailPinCode(opts.code)}
        <p style="margin:0 0 28px;">${emailButton(opts.actionUrl, 'Anmeldung öffnen')}</p>
        <p style="margin:0 0 8px;color:${EMAIL.text};">Viele Grüße,</p>
        <p style="margin:0 0 8px;color:${EMAIL.text};">Festag</p>
        ${emailSecurityNote(note)}
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
  return {
    subject: 'Neuer Dev-PIN — Festag',
    html: emailLayout({
      preheader: 'Dein persönlicher Festag Dev-PIN wurde erneuert.',
      title: 'Neuer persönlicher PIN',
      subtitle: 'Der bisherige PIN ist ab sofort ungültig.',
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.devName, 'Hallo')}</p>
        ${emailMuted('Du hast einen neuen persönlichen PIN für das Execution Panel angefordert. Melde dich mit Benutzername und diesem PIN an:')}
        ${emailMetaRow([
          { label: 'Benutzername', value: opts.username },
        ])}
        ${emailPinCode(opts.pin, 'Persönlicher PIN')}
        <p style="margin:8px 0 20px;">${emailButton(opts.loginUrl, 'Zur Anmeldung')}</p>
        ${emailSecurityNote('Wenn du diese Anfrage nicht gestellt hast, kontaktiere den Support. Speichere den neuen PIN sicher.')}
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
    html: emailLayout({
      preheader: 'Antwort meist innerhalb von 1 Stunde.',
      title: 'Nachricht angekommen',
      subtitle: 'Wir melden uns meist innerhalb einer Stunde.',
      body: `
        ${emailMuted('Danke für deine Nachricht. Sie wurde an unser Team weitergeleitet.')}
        ${emailCard(`
          <p style="margin:0 0 8px;font-size:12px;font-weight:400;color:${EMAIL.muted};">Deine Nachricht</p>
          <p style="margin:0;white-space:pre-wrap;font-size:14px;color:${EMAIL.text};line-height:1.55;">${emailEscape(opts.message)}</p>
          ${opts.page ? `<p style="margin:12px 0 0;font-size:12px;color:${EMAIL.muted};">Seite: ${emailEscape(opts.page)}</p>` : ''}
        `)}
        ${emailMuted('Du kannst auf diese Mail direkt antworten — die Antwort landet automatisch im richtigen Thread.', '0')}
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
    html: emailLayout({
      title: 'Neue Support-Nachricht',
      subtitle: opts.fromEmail ?? 'Anonymer Nutzer',
      body: `
        ${emailCard(`
          <p style="margin:0;white-space:pre-wrap;font-size:14px;color:${EMAIL.text};line-height:1.55;">${emailEscape(opts.message)}</p>
        `)}
        ${emailMetaRow([
          ...(opts.fromEmail ? [{ label: 'Email', value: opts.fromEmail }] : []),
          ...(opts.page ? [{ label: 'Seite', value: opts.page }] : []),
          ...(opts.userId ? [{ label: 'User-ID', value: opts.userId }] : []),
        ])}
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
    html: emailLayout({
      preheader: `Wir haben deine Zahlung über ${amount} erhalten.`,
      title: 'Zahlung bestätigt',
      subtitle: 'Vielen Dank für deinen Kauf.',
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.customerName)}</p>
        ${emailMuted('Wir haben deine Zahlung erhalten. Hier die Details:')}
        ${emailCard(`
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            <tr><td style="padding:0 0 10px;font-size:12px;color:${EMAIL.muted};">Beschreibung</td>
                <td style="padding:0 0 10px;font-size:13px;color:${EMAIL.text};text-align:right;">${emailEscape(opts.description)}</td></tr>
            <tr><td style="padding:0 0 10px;font-size:12px;color:${EMAIL.muted};">Betrag</td>
                <td style="padding:0 0 10px;font-size:14px;color:${EMAIL.text};text-align:right;font-variant-numeric:tabular-nums;">${amount}</td></tr>
            <tr><td style="padding:0 0 10px;font-size:12px;color:${EMAIL.muted};">Datum</td>
                <td style="padding:0 0 10px;font-size:13px;color:${EMAIL.text};text-align:right;">${emailEscape(date)}</td></tr>
            <tr><td style="padding:0;font-size:12px;color:${EMAIL.muted};">Referenz</td>
                <td style="padding:0;font-size:12px;color:${EMAIL.text};text-align:right;font-family:ui-monospace,Menlo,monospace;">${emailEscape(opts.reference)}</td></tr>
          </table>
        `)}
        ${emailMuted(`Bezahlt über ${emailEscape(opts.provider)}. Die Rechnung findest du in deinem Festag-Account unter Abrechnung.`, '0')}
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
    html: emailLayout({
      title: 'Zahlung in Bearbeitung',
      subtitle: 'Wir warten auf den Zahlungseingang.',
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.customerName)}</p>
        ${emailMuted(`Wir haben deine Zahlung über <strong style="font-weight:500;color:${EMAIL.text};">${amount}</strong> für <strong style="font-weight:500;color:${EMAIL.text};">${emailEscape(opts.description)}</strong> registriert. Sobald sie eingeht, schalten wir den Plan frei.`)}
        ${emailMetaRow([{ label: 'Referenz', value: opts.reference }])}
        ${emailMuted('Bei SEPA dauert das in der Regel 1–2 Werktage.', '0')}
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
    html: emailLayout(opts),
  }
}

export function tplWelcome(opts: {
  firstName?: string | null
  appUrl: string
}): { subject: string; html: string } {
  return {
    subject: 'Willkommen bei Festag',
    html: emailLayout({
      preheader: 'Dein ruhiger Projektraum ist bereit.',
      title: 'Willkommen bei Festag',
      subtitle: 'Schön, dass du da bist. Festag ist dein ruhiger Projektraum — kein Cockpit, kein Fachchinesisch.',
      feature: { variant: 'dusk', mock: 'pulse' },
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.firstName)}</p>
        ${emailMuted('Du beschreibst dein Vorhaben, Tagro übersetzt und zerlegt es, und du siehst jederzeit verständlich, wo dein Projekt steht.')}
        ${emailMuted('Leg direkt los — oben links auf „Neues Projekt“.')}
        <p style="margin:0 0 20px;">${emailButton(opts.appUrl, 'Festag öffnen')}</p>
        ${emailMuted('In Kürze bekommst du eine zweite Mail mit einer kleinen Tour durch alles Wichtige.', '0')}
      `,
    }),
  }
}

export function tplGettingStarted(opts: {
  firstName?: string | null
  appUrl: string
}): { subject: string; html: string } {
  const item = (title: string, text: string) =>
    `<tr><td style="padding:0 0 18px;">
       <p style="margin:0 0 4px;font-size:15px;font-weight:500;letter-spacing:-0.02em;color:${EMAIL.text};">${emailEscape(title)}</p>
       <p style="margin:0;font-size:14px;color:${EMAIL.muted};line-height:1.55;">${emailEscape(text)}</p>
     </td></tr>`
  return {
    subject: 'So funktioniert Festag',
    html: emailLayout({
      preheader: 'Statusabfrage, Posteingang, Projekte — in einer Minute erklärt.',
      title: 'So funktioniert Festag',
      subtitle: 'Acht Bereiche in einer Minute erklärt — ruhig, klar, ohne Status-Theater.',
      feature: { variant: 'olive', mock: 'status' },
      body: `
        <p style="margin:0 0 20px;">${greeting(opts.firstName)}</p>
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
        <p style="margin:8px 0 20px;">${emailButton(opts.appUrl, 'Zum Dashboard')}</p>
        ${emailMuted('Eine Frage? Antworte einfach auf diese Mail — sie landet direkt bei uns.', '0')}
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
  return {
    subject: 'Festag Execution Panel — Zugang',
    html: emailLayout({
      preheader: 'Einmaliger Zugangscode für das Festag Execution Panel.',
      title: 'Execution Panel Zugang',
      subtitle: 'Aufträge, Status und Freigaben — ohne Client-Chaos.',
      feature: { variant: 'olive', mock: 'dev' },
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.devName, 'Hallo')}</p>
        ${emailMuted('Für dich wurde ein Entwicklerkonto vorbereitet. Erster Login:')}
        ${emailMuted('1. Öffne den Link unten (oder gehe zu festag.app/login).', '0 0 8px')}
        ${emailMuted('2. Benutzername und Einladungs-PIN eingeben.', '0 0 8px')}
        ${emailMuted('3. Workspace-Namen und deinen persönlichen 6-stelligen PIN festlegen.', '0 0 24px')}
        ${emailMetaRow([{ label: 'Benutzername', value: opts.username }])}
        ${emailPinCode(opts.pin, 'Einladungs-PIN (einmalig)')}
        <p style="margin:0 0 20px;">${emailButton(opts.loginUrl, 'Zum Login')}</p>
        ${emailSecurityNote('Der Einladungs-PIN gilt nur einmal. Danach reicht dein persönlicher PIN — speichere ihn im Schlüsselbund.')}
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
  const from = opts.fromName?.trim() || 'Festag'
  return {
    subject: `Neuer Auftrag: ${opts.projectTitle}`,
    html: emailLayout({
      preheader: `${from} hat dir ein Projekt zugewiesen.`,
      title: 'Neuer Auftrag für dich',
      subtitle: `${from} hat dir „${opts.projectTitle}" zugewiesen.`,
      feature: { variant: 'stone', mock: 'dev' },
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.devName)}</p>
        ${emailMuted('Du wurdest als Entwickler für ein neues Projekt ausgewählt. Tagro hat das Briefing bereits in klare Schritte zerlegt — du findest alles in deinem Execution Panel.')}
        ${emailCard(`
          <p style="margin:0 0 6px;font-size:12px;color:${EMAIL.muted};">Projekt</p>
          <p style="margin:0 0 ${opts.scope ? '10px' : '0'};font-size:16px;font-weight:500;letter-spacing:-0.02em;color:${EMAIL.text};">${emailEscape(opts.projectTitle)}</p>
          ${opts.scope ? `<p style="margin:0;font-size:14px;color:${EMAIL.muted};line-height:1.55;">${emailEscape(opts.scope)}</p>` : ''}
        `)}
        <p style="margin:0 0 8px;">${emailButton(opts.devPanelUrl, 'Auftrag im Portal ansehen')}</p>
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
  return {
    subject: `Dein Projekt hat einen Entwickler: ${opts.projectTitle}`,
    html: emailLayout({
      preheader: `${opts.devName} übernimmt „${opts.projectTitle}".`,
      title: 'Dein Projekt ist startklar',
      subtitle: `${opts.devName} übernimmt die Umsetzung.`,
      feature: { variant: 'dusk', mock: 'pulse' },
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.clientName)}</p>
        ${emailMuted(`Gute Neuigkeiten — <strong style="font-weight:500;color:${EMAIL.text};">${emailEscape(opts.devName)}</strong> hat deinen Auftrag „${emailEscape(opts.projectTitle)}" angenommen und beginnt mit der Umsetzung.`)}
        ${emailMuted('Tagro begleitet das Projekt von hier an: Jeder Schritt wird für dich verständlich zusammengefasst.')}
        <p style="margin:0 0 8px;">${emailButton(opts.projectUrl, 'Projekt öffnen')}</p>
      `,
    }),
  }
}

export function tplProjectNextSteps(opts: {
  clientName?: string | null
  projectTitle: string
  projectUrl: string
}): { subject: string; html: string } {
  const step = (n: string, title: string, text: string) =>
    `<tr><td style="padding:0 0 16px;vertical-align:top;width:32px;">
       <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${EMAIL.btnBg};color:#fff;text-align:center;line-height:24px;font-size:12px;font-weight:500;">${n}</span>
     </td><td style="padding:0 0 16px;">
       <p style="margin:0 0 2px;font-size:15px;font-weight:500;letter-spacing:-0.02em;color:${EMAIL.text};">${emailEscape(title)}</p>
       <p style="margin:0;font-size:13.5px;color:${EMAIL.muted};line-height:1.5;">${emailEscape(text)}</p>
     </td></tr>`
  return {
    subject: `So geht es weiter: ${opts.projectTitle}`,
    html: emailLayout({
      preheader: 'Die nächsten Schritte für dein Projekt.',
      title: 'So geht es jetzt weiter',
      subtitle: `Dein Projekt „${opts.projectTitle}".`,
      feature: { variant: 'olive', mock: 'decision' },
      body: `
        <p style="margin:0 0 20px;">${greeting(opts.clientName)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${step('1', 'Tagro strukturiert', 'Dein Briefing ist in klare Aufgaben und Meilensteine zerlegt.')}
          ${step('2', 'Umsetzung beginnt', 'Dein Entwickler arbeitet die Schritte ab. Jedes Update wird geprüft.')}
          ${step('3', 'Du bleibst im Bild', 'Auf dem Dashboard fragst du jederzeit den ruhigen Projektstand ab.')}
        </table>
        <p style="margin:8px 0 8px;">${emailButton(opts.projectUrl, 'Projekt ansehen')}</p>
      `,
    }),
  }
}

export function tplFestagGuarantee(opts: {
  clientName?: string | null
  projectTitle: string
  docUrl: string
}): { subject: string; html: string } {
  const point = (text: string) =>
    `<tr><td style="padding:0 0 14px;font-size:14px;color:${EMAIL.muted};line-height:1.55;">— ${emailEscape(text)}</td></tr>`
  return {
    subject: 'Die Festag-Garantie',
    html: emailLayout({
      preheader: 'Was Festag dir für dein Projekt zusichert.',
      title: 'Die Festag-Garantie',
      subtitle: `Für dein Projekt „${opts.projectTitle}".`,
      feature: { variant: 'stone', mock: 'pulse' },
      body: `
        <p style="margin:0 0 16px;">${greeting(opts.clientName)}</p>
        ${emailMuted('Mit Festag gehst du kein Risiko ein. Das sichern wir dir zu:')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
          ${point('Geprüfter Fortschritt: Jeder Arbeitsstand wird von Tagro kontrolliert, bevor er bei dir ankommt.')}
          ${point('Volle Transparenz: Du siehst jederzeit verständlich, wo dein Projekt steht — ohne Fachjargon.')}
          ${point('Kein Informationsverlust: Tagro übersetzt zwischen dir und dem Entwickler in beide Richtungen.')}
          ${point('Verlässliche Umsetzung: Festag steuert die Lieferung und steht für die Qualität gerade.')}
        </table>
        <p style="margin:8px 0 8px;">${emailButton(opts.docUrl, 'Festag-Garantie im Detail')}</p>
      `,
    }),
  }
}

/** Secure Execution Panel invite. */
export function tplDeveloperInvite(opts: {
  toEmail: string
  inviterName: string
  workspaceName: string
  role: string
  inviteUrl: string
  expiresAt?: string | null
  message?: string | null
}): { subject: string; html: string } {
  const labels: Record<string, string> = {
    developer: 'Developer',
    designer: 'Designer',
    reviewer: 'Reviewer',
    admin: 'Admin',
  }
  const role = labels[opts.role] ?? opts.role
  const inviter = opts.inviterName.trim() || 'dein Team'
  const expires = opts.expiresAt
    ? new Date(opts.expiresAt).toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const personal = opts.message?.trim()
    ? emailCard(`<p style="margin:0;font-size:14.5px;line-height:1.6;color:${EMAIL.text};">„${emailEscape(opts.message.trim())}“</p>`)
    : ''

  return {
    subject: `${inviter} lädt dich zu Festag ein`,
    html: emailLayout({
      preheader: `Einladung zum Workspace „${opts.workspaceName}" als ${role}.`,
      title: 'Du bist eingeladen',
      subtitle: `${inviter} möchte dich im Execution Panel von „${opts.workspaceName}" begrüßen.`,
      feature: { variant: 'dusk', mock: 'dev' },
      body: `
        ${emailMetaRow([
          { label: 'Workspace', value: opts.workspaceName },
          { label: 'Rolle', value: role },
          ...(expires ? [{ label: 'Gültig bis', value: expires }] : []),
        ])}
        ${personal}
        <p style="margin:0 0 28px;">${emailButton(opts.inviteUrl, 'Einladung annehmen')}</p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:${EMAIL.muted};">
          Diese Einladung gilt für <strong style="color:${EMAIL.text};font-weight:500;">${emailEscape(opts.toEmail)}</strong>.
          Melde dich mit genau dieser Adresse an oder registriere dich damit.
        </p>
        ${emailSecurityNote('Der Link ist einmalig und läuft ab. Wenn du diese Einladung nicht erwartest, ignoriere die E-Mail.')}
      `,
    }),
  }
}
