/**
 * Shared Festag provider facts for legal pages (Impressum, Datenschutz, footer).
 * Keep in sync with /impressum — do not invent register or UID numbers here.
 */

export const LEGAL_COMPANY = {
  brand: 'Festag',
  operatorName: 'Stefan Dirnberger',
  street: 'Lindenstraße 15',
  postalCity: '84036 Kumhausen',
  country: 'Deutschland',
  email: 'hello@festag.app',
  phoneDisplay: '08765 33 999 73',
  phoneTel: '+4987653399973',
  whatsappDisplay: '0152 078 498 21',
  whatsappUrl: 'https://wa.me/4915207849821',
  /** Umsatzsteuer-ID gemäß § 27a UStG — confirmed in product Impressum. */
  vatId: 'DE362716091',
  /**
   * Kein Handelsregistereintrag bekannt (Einzelunternehmen).
   * Founder: replace if GmbH / HRB is later formed.
   */
  commercialRegister: null as string | null,
  /** Kein gesonderter Datenschutzbeauftragter bestellt (unterhalb der gesetzlichen Schwellen). */
  hasDpo: false,
  paymentProcessor: 'Enjyn® Gruppe',
  siteHost: 'festag.app',
  /** Calm product one-liner for legal intros — not marketing fluff. */
  subjectMatter:
    'Betrieb einer Delivery- und Operational-Intelligence-Plattform (Software-as-a-Service) unter festag.app, einschließlich Kundenportal, Workspace-Oberflächen, Integrationen und KI-gestützter Interpretation (Tagro).',
} as const

export const LEGAL_STAND_DATE = '21. Juli 2026'
