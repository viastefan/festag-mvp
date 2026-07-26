'use client'

/**
 * Client Moment — /c/[slug]/m/[token]
 * Immutable branded Delivery Pulse share page (snapshot, not live internal data).
 * One clear Entscheidung ask when the agency published an open decision.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProofCapsules from '@/components/proof/ProofCapsules'
import type { ProofCapsule } from '@/lib/proof/types'
import type { ClientMomentDecision } from '@/lib/moments/types'

type MomentPayload = {
  slug: string
  title: string
  pulse: {
    progress: string
    risk: string
    next_step: string
    health: string
    generatedAt: string
  }
  proof: ProofCapsule[]
  decision: ClientMomentDecision | null
  branding: {
    clientName: string
    brandColor: string
    logoUrl: string | null
    agencyName: string | null
    poweredByFestag: boolean
  }
  expiresAt: string | null
  createdAt: string
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function ClientMomentPage() {
  const params = useParams<{ slug?: string | string[]; token?: string | string[] }>()
  const slug = readParam(params?.slug)
  const token = readParam(params?.token)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [moment, setMoment] = useState<MomentPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setNotFound(false)
      if (!token) {
        setNotFound(true)
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/moments/public?token=${encodeURIComponent(token)}`)
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok || !data?.moment) {
          setNotFound(true)
          setMoment(null)
        } else if (slug && data.moment.slug && data.moment.slug !== slug) {
          setNotFound(true)
          setMoment(null)
        } else {
          setMoment(data.moment as MomentPayload)
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [slug, token])

  if (loading) {
    return (
      <main className="cm-page">
        <style>{CM_CSS}</style>
        <p className="cm-muted">Lade Lieferstand…</p>
      </main>
    )
  }

  if (notFound || !moment) {
    return (
      <main className="cm-page">
        <style>{CM_CSS}</style>
        <h1 className="cm-title">Moment nicht verfügbar</h1>
        <p className="cm-body">
          Dieser Link ist abgelaufen, widerrufen oder ungültig. Bitte bitte deine Agentur um einen neuen Stand.
        </p>
      </main>
    )
  }

  const brand = moment.branding
  const decision = moment.decision

  return (
    <main className="cm-page" style={{ ['--cm-brand' as string]: brand.brandColor }}>
      <style>{CM_CSS}</style>
      <header className="cm-head">
        <div className="cm-mark" aria-hidden>
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" />
          ) : (
            <span>{brand.clientName.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="cm-head-copy">
          <p className="cm-client">{brand.clientName}</p>
          <h1 className="cm-title">{moment.title}</h1>
          <p className="cm-when">Stand vom {formatWhen(moment.pulse.generatedAt || moment.createdAt)}</p>
        </div>
      </header>

      {decision ? (
        <section className="cm-decision" aria-label="Entscheidung">
          <p className="cm-decision-wait">{decision.waitLine}</p>
          <h2 className="cm-decision-title">{decision.title}</h2>
          <p className="cm-decision-summary">{decision.summary}</p>
          {decision.options.length > 0 ? (
            <ul className="cm-decision-options">
              {decision.options.map(opt => (
                <li key={opt.id}>{opt.label}</li>
              ))}
            </ul>
          ) : null}
          <a className="cm-decision-cta" href={decision.href}>
            In Festag entscheiden
          </a>
        </section>
      ) : null}

      <section className="cm-pulse" aria-label="Delivery Pulse">
        <div>
          <h2>Fortschritt</h2>
          <p>{moment.pulse.progress}</p>
        </div>
        <div>
          <h2>Risiko</h2>
          <p>{moment.pulse.risk}</p>
        </div>
        <div>
          <h2>Nächster Schritt</h2>
          <p>{moment.pulse.next_step}</p>
        </div>
      </section>

      {moment.proof?.length > 0 ? (
        <section className="cm-proof">
          <h2>Nachweise</h2>
          <ProofCapsules items={moment.proof} />
        </section>
      ) : null}

      <footer className="cm-foot">
        {brand.agencyName ? <span>{brand.agencyName}</span> : null}
        {brand.poweredByFestag ? <span>Powered by Festag</span> : null}
      </footer>
    </main>
  )
}

const CM_CSS = `
.cm-page {
  min-height: 100vh;
  padding: 40px clamp(20px, 4vw, 56px) 64px;
  background:
    radial-gradient(1200px 600px at 10% -10%, color-mix(in srgb, var(--cm-brand, #5B647D) 18%, transparent), transparent 60%),
    #f7f8f8;
  color: #1e1e20;
  font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
}
.cm-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 28px;
  max-width: 720px;
}
.cm-mark {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  overflow: hidden;
  background: var(--cm-brand, #5B647D);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
}
.cm-mark img { width: 100%; height: 100%; object-fit: cover; }
.cm-client {
  margin: 0 0 4px;
  font-size: 13px;
  color: #5c5c62;
  font-weight: 500;
}
.cm-title {
  margin: 0;
  font-size: clamp(28px, 4vw, 36px);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.cm-when {
  margin: 8px 0 0;
  font-size: 13px;
  color: #5c5c62;
}
.cm-body {
  max-width: 520px;
  font-size: 16px;
  line-height: 1.55;
  color: #5c5c62;
}
.cm-muted { color: #5c5c62; }
.cm-decision {
  max-width: 720px;
  margin-bottom: 22px;
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid rgba(30, 30, 32, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 16px 40px rgba(15, 23, 42, 0.06);
}
.cm-decision-wait {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.45;
  letter-spacing: var(--ls-body, 0.021em);
  color: #5c5c62;
}
.cm-decision-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: #1e1e20;
}
.cm-decision-summary {
  margin: 0;
  font-size: 15.5px;
  line-height: 1.55;
  letter-spacing: var(--ls-body, 0.021em);
  color: #5c5c62;
}
.cm-decision-options {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cm-decision-options li {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.04);
  font-size: 13px;
  color: #1e1e20;
}
.cm-decision-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 18px;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  background: #ffffff;
  color: #1e1e20;
  border: 1px solid rgba(30, 30, 32, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 400;
  letter-spacing: var(--ls-body, 0.021em);
  white-space: nowrap;
}
.cm-decision-cta:hover {
  background: #fafafa;
  border-color: rgba(30, 30, 32, 0.12);
}
.cm-pulse {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border-radius: 24px;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(255,255,255,0.8);
  box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 16px 40px rgba(15,23,42,0.06);
  backdrop-filter: blur(18px) saturate(155%);
}
.cm-pulse h2 {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 500;
  color: #5c5c62;
  letter-spacing: 0.02em;
}
.cm-pulse p {
  margin: 0;
  font-size: 17px;
  line-height: 1.5;
  font-weight: 500;
}
.cm-proof {
  max-width: 720px;
  margin-top: 22px;
}
.cm-proof h2 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 500;
  color: #5c5c62;
}
.cm-foot {
  max-width: 720px;
  margin-top: 40px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
  font-size: 12px;
  color: #8a8a90;
}
`
