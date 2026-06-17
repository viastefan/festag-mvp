import type { DecisionOptionImplications } from '@/lib/decisions/types'
import type { DecOption } from '@/components/decisions/decisions-shared'

/** Client-facing guided setup before opening an external provider. */
export type ExternalHandoffStep = {
  title?: string
  body: string
}

export type ExternalHandoff = {
  provider: string
  providerLabel: string
  url: string
  steps: ExternalHandoffStep[]
  openLabel: string
  confirmLabel: string
  note?: string
  /** Option id sent to POST /decide */
  optionId: string
}

export type ExternalHandoffInput = {
  optionId?: string | null
  optionLabel?: string | null
  optionDescription?: string | null
  implications?: DecisionOptionImplications | Record<string, unknown> | null
  decisionType?: string | null
}

type RegistryEntry = Omit<ExternalHandoff, 'optionId'> & {
  aliases: string[]
}

const REGISTRY: RegistryEntry[] = [
  {
    provider: 'stripe',
    providerLabel: 'Stripe',
    aliases: ['stripe', 'opt-stripe', 'zahlungsanbieter-stripe'],
    url: 'https://dashboard.stripe.com/register',
    openLabel: 'Stripe Dashboard öffnen',
    confirmLabel: 'Erledigt — Stripe bestätigen',
    note: 'Nach der Einrichtung in Stripe kehrt ihr zu Festag zurück. Das Dev-Team setzt die technische Anbindung um.',
    steps: [
      { title: 'Konto anlegen', body: 'Erstellt ein Stripe-Konto mit der geschäftlichen E-Mail-Adresse eures Unternehmens.' },
      { title: 'Firmendaten', body: 'Tragt Rechtsform, Adresse und Bankverbindung ein — Stripe benötigt das für Auszahlungen.' },
      { title: 'Zahlungsarten', body: 'Aktiviert Karte und ggf. SEPA. Für den Start reicht Karte.' },
      { title: 'API-Schlüssel', body: 'Unter Entwickler → API-Schlüssel den „Publishable key" und „Secret key" bereithalten — das Team bindet sie in Festag ein.' },
    ],
  },
  {
    provider: 'vercel',
    providerLabel: 'Vercel',
    aliases: ['vercel', 'opt-vercel'],
    url: 'https://vercel.com/new',
    openLabel: 'Vercel öffnen',
    confirmLabel: 'Erledigt — Vercel bestätigen',
    note: 'Das Dev-Team verknüpft das Projekt-Repository und übernimmt Deployments.',
    steps: [
      { title: 'Projekt importieren', body: 'Wählt „Add New Project" und verbindet das GitHub-Repository des Projekts.' },
      { title: 'Framework', body: 'Lasst das Framework auf Auto-Detect — Vercel erkennt Next.js automatisch.' },
      { title: 'Domain', body: 'Notiert die Vercel-URL oder tragt eure Wunschdomain ein, falls bereits vorhanden.' },
      { title: 'Zugriff', body: 'Ladet das Dev-Team als Mitglied ins Vercel-Team ein (Settings → Members).' },
    ],
  },
  {
    provider: 'github',
    providerLabel: 'GitHub',
    aliases: ['github', 'opt-github'],
    url: 'https://github.com/new',
    openLabel: 'GitHub öffnen',
    confirmLabel: 'Erledigt — GitHub bestätigen',
    steps: [
      { title: 'Repository', body: 'Legt ein privates Repository an oder bestätigt den Zugriff auf das bestehende Repo.' },
      { title: 'Team', body: 'Fügt die eingeladenen Entwickler als Collaborators hinzu.' },
      { title: 'Branch-Schutz', body: 'Optional: Main-Branch schützen — das Team richtet das bei Bedarf ein.' },
    ],
  },
  {
    provider: 'supabase',
    providerLabel: 'Supabase',
    aliases: ['supabase', 'opt-supabase', 'postgres', 'pg'],
    url: 'https://supabase.com/dashboard/new',
    openLabel: 'Supabase öffnen',
    confirmLabel: 'Erledigt — Supabase bestätigen',
    steps: [
      { title: 'Projekt', body: 'Erstellt ein neues Supabase-Projekt in der EU-Region (Frankfurt), wenn möglich.' },
      { title: 'Datenbank-Passwort', body: 'Speichert das Datenbank-Passwort sicher — das Team braucht es für die Anbindung.' },
      { title: 'API-Keys', body: 'Unter Project Settings → API: Project URL und anon/service keys bereithalten.' },
    ],
  },
  {
    provider: 'paypal',
    providerLabel: 'PayPal',
    aliases: ['paypal', 'opt-paypal'],
    url: 'https://www.paypal.com/de/business',
    openLabel: 'PayPal Business öffnen',
    confirmLabel: 'Erledigt — PayPal bestätigen',
    steps: [
      { title: 'Business-Konto', body: 'Erstellt oder bestätigt ein PayPal Business-Konto für das Projekt.' },
      { title: 'Zahlungslinks', body: 'Aktiviert Website-Zahlungen und notiert die Merchant-ID falls abgefragt.' },
    ],
  },
]

function normKey(value?: string | null): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function handoffFromImplications(
  raw: DecisionOptionImplications | Record<string, unknown> | null | undefined,
  optionId: string,
): ExternalHandoff | null {
  if (!raw || typeof raw !== 'object') return null
  const ext = (raw as Record<string, unknown>).external_handoff
  if (!ext || typeof ext !== 'object') return null
  const h = ext as Record<string, unknown>
  const url = typeof h.url === 'string' ? h.url.trim() : ''
  const provider = typeof h.provider === 'string' ? h.provider.trim() : ''
  const providerLabel = typeof h.provider_label === 'string'
    ? h.provider_label.trim()
    : (typeof h.providerLabel === 'string' ? h.providerLabel.trim() : provider)
  const stepsRaw = Array.isArray(h.steps) ? h.steps : []
  const steps: ExternalHandoffStep[] = stepsRaw
    .map((s) => {
      if (typeof s === 'string') return { body: s.trim() }
      if (s && typeof s === 'object') {
        const row = s as Record<string, unknown>
        const body = typeof row.body === 'string' ? row.body.trim() : ''
        if (!body) return null
        const title = typeof row.title === 'string' ? row.title.trim() : undefined
        return { title, body }
      }
      return null
    })
    .filter((s): s is ExternalHandoffStep => !!s?.body)
  if (!url || steps.length === 0) return null
  return {
    provider: provider || normKey(providerLabel) || 'external',
    providerLabel: providerLabel || 'Externer Dienst',
    url,
    steps,
    openLabel: typeof h.open_label === 'string' ? h.open_label : `In ${providerLabel || 'externem Tool'} öffnen`,
    confirmLabel: typeof h.confirm_label === 'string' ? h.confirm_label : 'Erledigt — bestätigen',
    note: typeof h.note === 'string' ? h.note : undefined,
    optionId,
  }
}

function matchRegistry(optionId: string, optionLabel?: string | null): RegistryEntry | null {
  const keys = new Set<string>()
  if (optionId) keys.add(normKey(optionId))
  if (optionLabel) keys.add(normKey(optionLabel))
  for (const entry of REGISTRY) {
    if (entry.aliases.some(a => keys.has(normKey(a)))) return entry
    if (keys.has(normKey(entry.provider))) return entry
    if (keys.has(normKey(entry.providerLabel))) return entry
  }
  // Fuzzy: label contains provider name
  const label = normKey(optionLabel)
  if (label) {
    for (const entry of REGISTRY) {
      if (label.includes(normKey(entry.provider)) || label.includes(normKey(entry.providerLabel))) {
        return entry
      }
    }
  }
  return null
}

/** Resolve a guided external handoff for a decision option. */
export function resolveExternalHandoff(input: ExternalHandoffInput): ExternalHandoff | null {
  const optionId = (input.optionId || input.optionLabel || '').trim()
  if (!optionId) return null

  const fromDb = handoffFromImplications(input.implications, optionId)
  if (fromDb) return fromDb

  const entry = matchRegistry(optionId, input.optionLabel)
  if (!entry) return null

  const { aliases: _a, ...rest } = entry
  return { ...rest, optionId }
}

export function resolveHandoffFromOption(
  option: Pick<DecOption, 'id' | 'external_id' | 'label' | 'client_label' | 'description' | 'implications_json'>,
  decisionType?: string | null,
): ExternalHandoff | null {
  const optionId = option.external_id || option.id
  return resolveExternalHandoff({
    optionId,
    optionLabel: option.client_label || option.label,
    optionDescription: option.description,
    implications: option.implications_json as DecisionOptionImplications | null,
    decisionType,
  })
}

/** Pick the recommended / primary option for list-row CTAs. */
export function resolvePrimaryHandoff(
  decision: {
    recommended_option?: string | null
    decision_type?: string | null
    options_json?: Array<{ id: string; label: string; hint?: string }>
  },
  options?: DecOption[] | null,
): ExternalHandoff | null {
  const rec = decision.recommended_option
  if (!rec || rec === 'freeform') return null

  const structured = options?.find(o =>
    o.external_id === rec || o.id === rec ||
    normKey(o.label) === normKey(rec) ||
    normKey(o.client_label || '') === normKey(rec),
  )
  if (structured) {
    return resolveHandoffFromOption(structured, decision.decision_type)
  }

  const legacy = decision.options_json?.find(o =>
    o.id === rec || normKey(o.label) === normKey(rec),
  )
  return resolveExternalHandoff({
    optionId: rec,
    optionLabel: legacy?.label || rec,
    optionDescription: legacy?.hint,
    decisionType: decision.decision_type,
  })
}

export function listKnownHandoffProviders(): string[] {
  return REGISTRY.map(r => r.provider)
}
