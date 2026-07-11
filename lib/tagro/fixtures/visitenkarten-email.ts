/**
 * EXAMPLE ONLY — few-shot gold for Tagro email intake.
 *
 * Illustrative messy client mail → structured Freigaben / Entscheidungen / Tasks.
 * Not a real project seed, not wired to any client/workspace, never auto-applied.
 * Swap or add further examples freely; this file is training shape, not product data.
 */

export const VISITENKARTEN_EMAIL_META = {
  from: 'Anna Kipp-Menke',
  to: 'Stefan Dirnberger',
  subject: 'Re: Visitenkarten',
  date: '9.7.2026, 14:48',
  attachments: 1,
} as const

/** Raw client email body (training input). */
export const VISITENKARTEN_EMAIL_BODY = `Lieber Stefan,
danke dir :-).

Desigen des Weges:
Ich sehe keinen Unterschied 🙈. Der Weg passt auf jeden Fall. Und falls es im Farbton einen Unterschied gibt, wähle bitte den helleren. Ansonsten ist der Druck in Ordnung.

QR-Code:
Der Code funktioniert und leitet mich auf eine Linktree-Seite. Hier ein paar Anmerkungen:
- @annakippmenke – verstehe ich nicht, weil das nicht meine Adresse ist. Wofür steht das?
- die Mailadresse anna@kipp-menke-beratung.de bitte durch eine info@… ersetzen
- hinter „Systemische Beratung und Supervision…“ sollte klar erkennbar sein, dass dort ein Link zur Website hinterlegt ist
- man kann von dort aus nicht so einfach Kontaktdaten speichern oder eine Mail schreiben. Wofür ist der Linktree gedacht? Wäre es nicht besser, den QR-Code direkt auf meine Website zu legen?

Video:
Ich finde leider keins im Anhang.

Viele Grüße
Anna`

/** Canonical structured reading Tagro should produce from this mail. */
export const VISITENKARTEN_EMAIL_GOLD = {
  intent: 'change_request' as const,
  client_summary:
    'Anna gibt Feedback zu den Visitenkarten: Weg-Design freigegeben (bei Farbton die hellere Variante), Linktree/QR braucht Korrekturen und eine Richtungsentscheidung, das erwartete Video fehlt im Anhang.',
  themes: ['Visitenkarten', 'QR-Code', 'Linktree', 'Freigabe'],
  approvals: [
    {
      title: 'Weg-Design freigeben',
      detail:
        'Der Weg passt. Bei Unterschied im Farbton die hellere Variante wählen. Druck ansonsten in Ordnung.',
    },
  ],
  decisions: [
    {
      title: 'Linktree behalten oder QR direkt auf die Website?',
      reason:
        'Anna fragt, ob Linktree sinnvoll ist — Kontakte speichern und Mail schreiben gehen dort schlecht.',
      options: [
        'Linktree behalten und verbessern',
        'QR-Code direkt auf die Website legen',
      ],
    },
  ],
  tasks: [
    {
      title: 'E-Mail-Adresse auf info@… umstellen',
      why: 'anna@kipp-menke-beratung.de soll durch eine info@-Adresse ersetzt werden.',
      priority: 'high' as const,
    },
    {
      title: 'Website-Link im Linktree klar kennzeichnen',
      why: '„Systemische Beratung und Supervision…“ soll erkennbar als Link zur Website wirken.',
      priority: 'medium' as const,
    },
    {
      title: 'Handle @annakippmenke klären oder anpassen',
      why: 'Anna erkennt die Adresse nicht und fragt, wofür sie steht.',
      priority: 'medium' as const,
    },
    {
      title: 'Video erneut senden',
      why: 'Im Anhang war kein Video, obwohl eines erwartet wurde.',
      priority: 'high' as const,
    },
  ],
  followups: [
    'Was bedeutet der Handle @annakippmenke — wofür steht er?',
  ],
  risks: [
    'Linktree erschwert Kontakt speichern und direkte Mail — Ziel der Visitenkarte unklar.',
  ],
  tags: ['visitenkarten', 'freigabe', 'qr-code', 'linktree', 'kundenfeedback'],
}

/** Full paste block as a user would drop into Notes / Tagro. */
export function visitenkartenEmailAsPaste(): string {
  const m = VISITENKARTEN_EMAIL_META
  return `Von: ${m.from}
An: ${m.to}
Betreff: ${m.subject}
Datum: ${m.date}
Anhänge: ${m.attachments}

${VISITENKARTEN_EMAIL_BODY}`
}
