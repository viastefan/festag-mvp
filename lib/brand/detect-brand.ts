export type BrandId =
  | 'google'
  | 'gmail'
  | 'google-docs'
  | 'microsoft'
  | 'apple'
  | 'slack'
  | 'github'
  | 'stripe'
  | 'figma'
  | 'notion'
  | 'jira'
  | 'hubspot'
  | 'salesforce'
  | 'zoom'
  | 'dropbox'
  | 'linkedin'
  | 'meta'
  | 'aws'
  | 'shopify'
  | 'paypal'
  | 'openai'

const BRAND_PATTERNS: { id: BrandId; re: RegExp }[] = [
  { id: 'google-docs', re: /\bgoogle\s*docs?\b/i },
  { id: 'gmail', re: /\bgmail\b/i },
  { id: 'google', re: /\bgoogle\b/i },
  { id: 'microsoft', re: /\b(microsoft|teams|outlook|office\s*365)\b/i },
  { id: 'apple', re: /\b(apple|app\s*store|icloud)\b/i },
  { id: 'slack', re: /\bslack\b/i },
  { id: 'github', re: /\bgithub\b/i },
  { id: 'stripe', re: /\bstripe\b/i },
  { id: 'figma', re: /\bfigma\b/i },
  { id: 'notion', re: /\bnotion\b/i },
  { id: 'jira', re: /\b(jira|atlassian)\b/i },
  { id: 'hubspot', re: /\bhubspot\b/i },
  { id: 'salesforce', re: /\bsalesforce\b/i },
  { id: 'zoom', re: /\bzoom\b/i },
  { id: 'dropbox', re: /\bdropbox\b/i },
  { id: 'linkedin', re: /\blinkedin\b/i },
  { id: 'meta', re: /\b(meta|facebook|instagram|whatsapp)\b/i },
  { id: 'aws', re: /\b(aws|amazon\s*web\s*services)\b/i },
  { id: 'shopify', re: /\bshopify\b/i },
  { id: 'paypal', re: /\bpaypal\b/i },
  { id: 'openai', re: /\b(openai|chatgpt|gpt-?4|gpt-?5)\b/i },
]

/** Detect a known company brand from free text (German or English). */
export function detectBrandFromText(text: string): BrandId | null {
  const normalized = text.normalize('NFKC')
  for (const { id, re } of BRAND_PATTERNS) {
    if (re.test(normalized)) return id
  }
  return null
}
