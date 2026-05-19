'use client'

/**
 * Kunden-Portal — /c/[slug]
 *
 * Öffentlich aufrufbare, gebrandete Kunden-Sicht: jeder agency_client
 * mit einem slug bekommt seine eigene URL. Brand-Farbe und Logo
 * kommen entweder vom Kunden selbst (agency_clients.brand_color/logo_url)
 * oder, wenn nicht gepflegt, vom Workspace (workspace_branding).
 *
 * Daten-Zugriff: liest nur "öffentlich-fähige" Stammdaten und die
 * Projekte des Kunden. RLS schützt sensible Felder; was hier in der
 * Public-Sicht steht, ist bewusst minimal: Projekttitel, Phase,
 * Fortschritt. Briefings, Tasks, Chat bleiben hinter Login.
 *
 * Diese erste Version ist Read-Only und nutzt anon-Key. Kein
 * Pflichtlogin — der Slug selbst ist die "Adresse". Für sensiblere
 * Daten kommt ein PIN-Gate später.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ClientRow = {
  id: string
  workspace_id: string
  name: string
  description: string | null
  industry: string | null
  brand_color: string | null
  logo_url: string | null
  domain: string | null
}

type Branding = {
  brand_name: string | null
  brand_color: string | null
  logo_url: string | null
  plan: string | null
  pdf_footer: string | null
}

type ProjectRow = {
  id: string
  title: string
  description: string | null
  status: string | null
  project_type: string | null
  updated_at: string | null
}

const PHASE_LABEL: Record<string, string> = {
  intake: 'Briefing', planning: 'Planung', active: 'Umsetzung', testing: 'Testphase', done: 'Abgeschlossen',
}
const PHASE_DOT: Record<string, string> = {
  intake: 'var(--p-soft)', planning: '#f59e0b', active: 'var(--p-brand)', testing: '#0ea5e9', done: 'var(--p-soft)',
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function safeBrandColor(value: string | null | undefined) {
  const color = value?.trim()
  return color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : '#5B647D'
}

export default function ClientPortalPage() {
  const params = useParams<{ slug?: string | string[] }>()
  const slug = readParam(params?.slug)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [client, setClient] = useState<ClientRow | null>(null)
  const [branding, setBranding] = useState<Branding | null>(null)
  const [projects, setProjects] = useState<ProjectRow[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErrorMessage('')
      setNotFound(false)

      if (!slug) {
        setNotFound(true)
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        const { data: c, error: clientError } = await supabase
          .from('agency_clients')
          .select('id,workspace_id,name,description,industry,brand_color,logo_url,domain')
          .eq('slug', slug)
          .maybeSingle()

        if (cancelled) return
        if (clientError || !c) {
          setNotFound(true)
          return
        }

        const clientRow = c as ClientRow
        setClient({
          ...clientRow,
          name: clientRow.name || 'Kundenbereich',
        })

        const [{ data: b }, { data: ps }] = await Promise.all([
          supabase
            .from('workspace_branding')
            .select('brand_name,brand_color,logo_url,plan,pdf_footer')
            .eq('workspace_id', clientRow.workspace_id)
            .maybeSingle(),
          supabase
            .from('projects')
            .select('id,title,description,status,project_type,updated_at')
            .eq('client_id', clientRow.id)
            .order('updated_at', { ascending: false }),
        ])
        if (cancelled) return
        setBranding((b as Branding | null) ?? null)
        setProjects((ps as ProjectRow[] | null) ?? [])
      } catch (error) {
        if (!cancelled) {
          console.error('Client portal failed to load', error)
          setErrorMessage('Das Kunden-Portal konnte gerade nicht geladen werden.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [slug])

  // Resolve effective brand: client overrides workspace overrides default
  const brandName  = client?.name || branding?.brand_name || 'Festag'
  const brandColor = safeBrandColor(client?.brand_color || branding?.brand_color)
  const logoUrl    = client?.logo_url || branding?.logo_url || null
  const isWhiteLabel = (branding?.plan && branding.plan !== 'powered_by_festag')

  if (loading) {
    return (
      <main className="cp-page">
        <style>{CSS}</style>
        <div className="cp-loading">Wird geladen…</div>
      </main>
    )
  }
  if (notFound || !client) {
    return (
      <main className="cp-page">
        <style>{CSS}</style>
        <div className="cp-notfound">
          <p className="cp-kicker">Festag</p>
          <h1>{errorMessage ? 'Portal gerade nicht erreichbar' : 'Diese Seite existiert nicht'}</h1>
          <p>{errorMessage || 'Der Kunden-Link ist möglicherweise veraltet oder wurde entfernt.'}</p>
        </div>
      </main>
    )
  }

  return (
    <main
      className="cp-page"
      style={{
        // Inject brand color as CSS variables so the whole page can pick it up.
        ['--p-brand' as any]: brandColor,
        ['--p-soft' as any]: 'color-mix(in srgb, ' + brandColor + ' 30%, transparent)',
      }}
    >
      <style>{CSS}</style>

      {/* Brand strip */}
      <header className="cp-brand">
        <div className="cp-brand-row">
          <div className="cp-logo" style={{ background: brandColor }}>
            {logoUrl ? <img src={logoUrl} alt="" /> : <span>{brandName.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="cp-brand-meta">
            <p className="cp-brand-name">{brandName}</p>
            <p className="cp-brand-sub">{client.industry || 'Kunden-Portal'}</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="cp-hero">
        <p className="cp-kicker">Kundenbereich</p>
        <h1>Willkommen, {client.name}.</h1>
        <p className="cp-hero-sub">
          {client.description
            ? client.description
            : 'Hier siehst du deine laufenden Projekte und den aktuellen Stand. Briefings, Freigaben und Details öffnest du mit einem Klick auf das jeweilige Projekt.'}
        </p>
      </section>

      {/* Projects */}
      <section className="cp-block">
        <div className="cp-block-head">
          <h2>Deine Projekte</h2>
          <span className="cp-block-count">{projects.length}</span>
        </div>
        {projects.length === 0 ? (
          <p className="cp-empty">Aktuell ist noch kein Projekt freigegeben.</p>
        ) : (
          <ul className="cp-list">
            {projects.map(p => {
              const status = p.status || 'intake'
              return (
              <li key={p.id} className="cp-row">
                <span className="cp-dot" style={{ background: PHASE_DOT[status] || 'var(--p-brand)' }} />
                <div className="cp-row-meta">
                  <span className="cp-row-title">{p.title}</span>
                  {p.description && <span className="cp-row-sub">{p.description}</span>}
                </div>
                {p.project_type && <span className="cp-chip">{p.project_type}</span>}
                <span className="cp-row-status">{PHASE_LABEL[status] || status}</span>
              </li>
            )})}
          </ul>
        )}
      </section>

      {/* Footer */}
      <footer className="cp-foot">
        {isWhiteLabel
          ? (branding?.pdf_footer || `© ${new Date().getFullYear()} ${brandName}`)
          : (
            <span>
              Powered by{' '}
              <a href="https://festag.de" target="_blank" rel="noreferrer">Festag</a>
            </span>
          )}
      </footer>
    </main>
  )
}

const CSS = `
  :root {
    --p-bg: #FCFCFD;
    --p-surface: #FFFFFF;
    --p-text: #1A1F2C;
    --p-soft-text: #6B7280;
    --p-line: #E7EBF0;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --p-bg: #0E0F0F;
      --p-surface: #151617;
      --p-text: #F2F2EE;
      --p-soft-text: #A8B0C2;
      --p-line: rgba(255,255,255,0.06);
    }
  }
  *,*::before,*::after { box-sizing: border-box; }
  body { margin: 0; background: var(--p-bg); color: var(--p-text); }

  .cp-page {
    min-height: 100dvh;
    background: var(--p-bg);
    color: var(--p-text);
    font-family: var(--font-aeonik,'Aeonik',Inter,-apple-system,BlinkMacSystemFont,sans-serif);
    padding: 0 clamp(18px, 4vw, 56px);
    -webkit-font-smoothing: antialiased;
  }
  .cp-loading, .cp-notfound { max-width: 480px; margin: 0 auto; padding: 96px 0; text-align: center; color: var(--p-soft-text); font-size: 13px; }
  .cp-notfound h1 { font-size: 20px; font-weight: 600; color: var(--p-text); margin: 8px 0; }

  /* Brand header */
  .cp-brand {
    max-width: 1040px; margin: 0 auto;
    padding: 22px 0;
    border-bottom: 1px solid var(--p-line);
  }
  .cp-brand-row { display: flex; align-items: center; gap: 12px; }
  .cp-logo {
    width: 36px; height: 36px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: 15px; overflow: hidden;
    flex-shrink: 0;
  }
  .cp-logo img { width: 100%; height: 100%; object-fit: cover; }
  .cp-brand-name { margin: 0; font-size: 14px; font-weight: 600; color: var(--p-text); }
  .cp-brand-sub  { margin: 1px 0 0; font-size: 11.5px; color: var(--p-soft-text); }

  /* Hero */
  .cp-hero {
    max-width: 1040px; margin: 0 auto;
    padding: 48px 0 28px;
  }
  .cp-kicker {
    margin: 0; font-size: 11px; font-weight: 600;
    letter-spacing: .08em; text-transform: uppercase;
    color: var(--p-soft-text);
  }
  .cp-hero h1 {
    margin: 8px 0 12px;
    font-size: clamp(22px, 2.6vw, 30px);
    font-weight: 500; letter-spacing: -.018em;
    color: var(--p-text);
  }
  .cp-hero-sub {
    margin: 0; max-width: 580px;
    font-size: 13.5px; line-height: 1.65; color: var(--p-soft-text);
  }

  /* Blocks */
  .cp-block { max-width: 1040px; margin: 24px auto 0; }
  .cp-block-head {
    display: flex; align-items: baseline; gap: 8px;
    padding-bottom: 8px; border-bottom: 1px solid var(--p-line);
    margin-bottom: 4px;
  }
  .cp-block-head h2 {
    margin: 0; font-size: 12px; font-weight: 600;
    letter-spacing: .04em; text-transform: uppercase; color: var(--p-soft-text);
  }
  .cp-block-count { font-size: 11px; color: var(--p-soft-text); opacity: .65; }
  .cp-empty { margin: 14px 0; font-size: 13px; color: var(--p-soft-text); }

  /* List */
  .cp-list { list-style: none; padding: 0; margin: 0; }
  .cp-row {
    display: grid;
    grid-template-columns: 10px 1fr auto auto;
    align-items: center; gap: 14px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--p-line);
    font-size: 13px;
  }
  .cp-row:last-child { border-bottom: none; }
  .cp-dot { width: 8px; height: 8px; border-radius: 50%; }
  .cp-row-meta { display: flex; flex-direction: column; min-width: 0; }
  .cp-row-title { color: var(--p-text); font-weight: 500; }
  .cp-row-sub { font-size: 11.5px; color: var(--p-soft-text); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cp-chip {
    font-size: 10.5px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
    color: var(--p-soft-text); padding: 2px 7px;
    border: 1px solid var(--p-line); border-radius: 5px;
  }
  .cp-row-status { font-size: 11.5px; color: var(--p-soft-text); }

  /* Footer */
  .cp-foot {
    max-width: 1040px; margin: 64px auto 0;
    padding: 22px 0 36px;
    border-top: 1px solid var(--p-line);
    font-size: 11.5px; color: var(--p-soft-text); text-align: center;
  }
  .cp-foot a { color: var(--p-text); text-decoration: underline; text-underline-offset: 2px; }
`
