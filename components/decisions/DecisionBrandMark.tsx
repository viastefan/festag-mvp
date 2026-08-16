'use client'

/**
 * The logo rule, in code.
 *
 * A product mark appears ONLY when the recommendation names a real external
 * company, product or platform ("Stripe", "Google + Apple", "Vercel"). A
 * generic internal choice — "Variante A", "Freigeben", "Option B" — gets
 * nothing. There is no design-tool logo just because a design tool was used.
 *
 * Marks are always subordinate to the text: 16px, muted, sitting before the
 * name, never a focal point and never in the page header.
 *
 * Assets: the repo ships a handful under /public/brand. Products without an
 * asset fall back to a neutral monogram chip rather than a fabricated
 * trademark — drop `<product>.svg` into /public/brand to light one up.
 */

import { useMemo } from 'react'

type BrandEntry = {
  /** Canonical display name, used for the alt text. */
  label: string
  /**
   * Asset under /public. Entries without one are still recognised as external
   * products (so the rule stays complete) but render nothing — a fabricated
   * trademark is worse than no mark. Drop `<product>.svg` into /public/brand
   * and add the path here to light one up.
   */
  src?: string
}

/**
 * Recognised external products. Keys are matched case-insensitively as whole
 * words against the recommendation label, so "Stripe" hits and "Stripes" or
 * "Variante A" do not.
 */
const BRANDS: Record<string, BrandEntry> = {
  stripe: { label: 'Stripe' },
  paypal: { label: 'PayPal' },
  adyen: { label: 'Adyen' },
  klarna: { label: 'Klarna' },
  apple: { label: 'Apple' },
  google: { label: 'Google', src: '/google-symbol.svg' },
  vercel: { label: 'Vercel', src: '/brand/vercel.svg' },
  github: { label: 'GitHub', src: '/brand/github.svg' },
  notion: { label: 'Notion', src: '/brand/notion.svg' },
  slack: { label: 'Slack', src: '/brand/slack.svg' },
  gmail: { label: 'Gmail', src: '/brand/gmail.svg' },
  zapier: { label: 'Zapier', src: '/brand/zapier.svg' },
  supabase: { label: 'Supabase' },
  firebase: { label: 'Firebase' },
  postgres: { label: 'Postgres' },
  aws: { label: 'AWS' },
  azure: { label: 'Azure' },
  cloudflare: { label: 'Cloudflare' },
  netlify: { label: 'Netlify' },
  figma: { label: 'Figma' },
  auth0: { label: 'Auth0' },
  shopify: { label: 'Shopify' },
  mollie: { label: 'Mollie' },
  sepa: { label: 'SEPA' },
}

/**
 * Extracts the external products named in a recommendation label.
 * "Google + Apple" → two marks. "Variante A" → none.
 */
export function detectBrands(label?: string | null): BrandEntry[] {
  if (!label?.trim()) return []
  const words = label.toLowerCase().match(/[a-z0-9][a-z0-9.+-]*/g) ?? []
  const hits: BrandEntry[] = []
  const seen = new Set<string>()
  for (const word of words) {
    const key = word.replace(/[.+-]+$/, '')
    const entry = BRANDS[key]
    if (entry && !seen.has(key)) {
      seen.add(key)
      hits.push(entry)
    }
  }
  // More than two marks stops being a signal and becomes decoration.
  return hits.slice(0, 2)
}

export default function DecisionBrandMark({ label }: { label?: string | null }) {
  const marks = useMemo(() => detectBrands(label).filter(b => !!b.src), [label])
  if (marks.length === 0) return null

  return (
    <span className="dbm" aria-hidden>
      {marks.map(b => (
        // eslint-disable-next-line @next/next/no-img-element -- static brand marks, no optimisation needed at 16px
        <img key={b.label} className="dbm-img" src={b.src} alt="" width={16} height={16} loading="lazy" />
      ))}
    </span>
  )
}
