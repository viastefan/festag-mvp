// CMS content-intake templates (website projects). See docs/cms-content-intake.md.
// Slice 1+2: a dev instantiates one of these; the client fills the values.

export type CmsFieldType = 'text' | 'longtext' | 'image' | 'link'

export type CmsFieldDef = {
  key: string
  label: string
  type: CmsFieldType
  help?: string
  required?: boolean
}

export type CmsSectionDef = {
  key: string
  title: string
  description?: string
  fields: CmsFieldDef[]
}

export type CmsTemplate = {
  key: string
  title: string
  summary: string
  sections: CmsSectionDef[]
}

const praxis: CmsTemplate = {
  key: 'praxis',
  title: 'Praxis / Beratung',
  summary: 'Für Praxen, Coaches und Berater:innen — Startseite, Über uns, Leistungen, Kontakt, Rechtliches.',
  sections: [
    {
      key: 'start',
      title: 'Startseite',
      description: 'Der erste Eindruck — worum geht es auf einen Blick?',
      fields: [
        { key: 'headline', label: 'Überschrift', type: 'text', required: true, help: 'Kurz und klar, z. B. „Systemische Beratung in München".' },
        { key: 'intro', label: 'Begrüßungstext', type: 'longtext', required: true, help: '2–4 Sätze, die deine Besucher abholen.' },
        { key: 'hero_image', label: 'Hauptbild', type: 'image', help: 'Ein ruhiges, hochwertiges Foto.' },
      ],
    },
    {
      key: 'about',
      title: 'Über dich / die Praxis',
      fields: [
        { key: 'about_text', label: 'Über-uns-Text', type: 'longtext', required: true, help: 'Wer du bist, dein Ansatz, deine Qualifikation.' },
        { key: 'portrait', label: 'Portrait / Foto', type: 'image' },
      ],
    },
    {
      key: 'services',
      title: 'Leistungen',
      fields: [
        { key: 'services_list', label: 'Leistungen', type: 'longtext', required: true, help: 'Eine Leistung pro Zeile.' },
        { key: 'focus', label: 'Schwerpunkte', type: 'longtext', help: 'Optional: Themen, auf die du dich spezialisierst.' },
      ],
    },
    {
      key: 'contact',
      title: 'Kontakt & Öffnungszeiten',
      fields: [
        { key: 'address', label: 'Adresse', type: 'text', required: true },
        { key: 'phone', label: 'Telefon', type: 'text' },
        { key: 'email', label: 'E-Mail', type: 'text', required: true },
        { key: 'hours', label: 'Öffnungszeiten', type: 'longtext', help: 'Z. B. „Mo–Fr 9–17 Uhr".' },
        { key: 'booking_link', label: 'Termin-Link', type: 'link', help: 'Optional: Link zur Online-Terminbuchung.' },
      ],
    },
    {
      key: 'legal',
      title: 'Rechtliches',
      description: 'Für Impressum & Datenschutz — wir brauchen die korrekten Angaben.',
      fields: [
        { key: 'imprint', label: 'Impressum-Angaben', type: 'longtext', required: true, help: 'Name, Anschrift, ggf. Berufsbezeichnung & Kammer.' },
        { key: 'privacy_contact', label: 'Datenschutz-Kontakt', type: 'text', help: 'Verantwortliche Person für Datenschutz.' },
      ],
    },
  ],
}

const business: CmsTemplate = {
  key: 'business',
  title: 'Local Business',
  summary: 'Für lokale Unternehmen, Studios und Dienstleister — flexibel, mit den wichtigsten Bausteinen.',
  sections: [
    {
      key: 'start',
      title: 'Startseite',
      fields: [
        { key: 'headline', label: 'Überschrift', type: 'text', required: true },
        { key: 'intro', label: 'Einleitungstext', type: 'longtext', required: true },
        { key: 'hero_image', label: 'Hauptbild', type: 'image' },
      ],
    },
    {
      key: 'offer',
      title: 'Angebot / Produkte',
      fields: [
        { key: 'offer_list', label: 'Angebot', type: 'longtext', required: true, help: 'Ein Punkt pro Zeile.' },
        { key: 'gallery', label: 'Bild', type: 'image' },
      ],
    },
    {
      key: 'about',
      title: 'Über uns',
      fields: [
        { key: 'about_text', label: 'Über-uns-Text', type: 'longtext', required: true },
      ],
    },
    {
      key: 'contact',
      title: 'Kontakt & Öffnungszeiten',
      fields: [
        { key: 'address', label: 'Adresse', type: 'text', required: true },
        { key: 'phone', label: 'Telefon', type: 'text' },
        { key: 'email', label: 'E-Mail', type: 'text', required: true },
        { key: 'hours', label: 'Öffnungszeiten', type: 'longtext' },
      ],
    },
    {
      key: 'legal',
      title: 'Rechtliches',
      fields: [
        { key: 'imprint', label: 'Impressum-Angaben', type: 'longtext', required: true },
      ],
    },
  ],
}

export const CMS_TEMPLATES: CmsTemplate[] = [praxis, business]

export function getCmsTemplate(key: string | null | undefined): CmsTemplate | null {
  return CMS_TEMPLATES.find(t => t.key === key) ?? null
}
