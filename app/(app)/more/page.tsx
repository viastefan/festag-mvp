'use client'

/**
 * /more — mobile menu replacement for the desktop sidebar.
 *
 * Sectioned list (Personal, Workspace, Tagro, System) of every
 * destination that used to live in the left rail. Designed for
 * thumb navigation: 44 px rows, chevrons, calm icons.
 *
 * Also renders OK on desktop — it's just a longer settings page
 * there. Mobile is the primary surface.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TagroEntryButton from '@/components/TagroEntryButton'
import {
  Briefcase, CaretRight, ChartLineUp, CreditCard, FileText, GearSix,
  GridFour, LinkSimple, NotePencil, Question, SignOut, SpeakerHigh,
  Sparkle, SunHorizon, Tray, UserCircle, UsersThree,
} from '@phosphor-icons/react'

type Row = {
  label: string
  meta?: string
  href?: string
  onClick?: () => void
  icon: React.ReactNode
  tone?: 'default' | 'danger'
}

export default function MorePage() {
  const supabase = useMemo(() => createClient(), [])
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('full_name,first_name').eq('id', user.id).maybeSingle()
      const fn = (data as any)?.full_name || (data as any)?.first_name || user.email?.split('@')[0] || 'Festag'
      setName(String(fn))
    })()
  }, [supabase])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const SECTIONS: Array<{ label: string; rows: Row[] }> = [
    {
      label: 'Persönlich',
      rows: [
        { label: 'Profil & Konto',       meta: 'Name, Avatar, Sprache',                href: '/settings',           icon: <UserCircle size={16} /> },
        { label: 'Benachrichtigungen',   meta: 'E-Mail, Push und Hinweise',             href: '/settings/notifications', icon: <Tray size={16} /> },
        { label: 'Erscheinung',          meta: 'Hell / Dunkel / Lese-Modus',            href: '/settings/appearance', icon: <SunHorizon size={16} /> },
      ],
    },
    {
      label: 'Workspace',
      rows: [
        { label: 'Projekte',             meta: 'Alle Projekte ansehen',                 href: '/projects',           icon: <Briefcase size={16} /> },
        { label: 'Tasks',                meta: 'Offene Aufgaben',                       href: '/tasks',              icon: <NotePencil size={16} /> },
        { label: 'Statusberichte',       meta: 'Tagro-Briefings & Audio',               href: '/reports',            icon: <ChartLineUp size={16} /> },
        { label: 'Teams & Mitwirkende',  meta: 'Personen, Rollen, Sitzplätze',          href: '/observers',          icon: <UsersThree size={16} /> },
        { label: 'Abrechnung',           meta: 'Mollie · SEPA · Rechnungen',            href: '/billing',            icon: <CreditCard size={16} /> },
      ],
    },
    {
      label: 'Tagro',
      rows: [
        { label: 'Tagro Chat',           meta: 'AI-Steuerung',                          href: '/ai',                 icon: <Sparkle size={16} /> },
        { label: 'Notizen',              meta: 'Mit Tagro-Vorschlägen',                 href: '/notes',              icon: <NotePencil size={16} /> },
        { label: 'Audio-Briefing',       meta: 'Aufnehmen oder anhören',                href: '/voice-reports',      icon: <SpeakerHigh size={16} /> },
      ],
    },
    {
      label: 'Tools',
      rows: [
        { label: 'Preisschätzer',        meta: 'Aufwand grob abschätzen',               href: '/estimator',          icon: <GridFour size={16} /> },
        { label: 'Connectors',           meta: 'GitHub, Slack, Notion …',               href: '/connectors',         icon: <LinkSimple size={16} /> },
        { label: 'Add-ons',              meta: 'Festag-Ergänzungen',                    href: '/addons',             icon: <GridFour size={16} /> },
      ],
    },
    {
      label: 'System',
      rows: [
        { label: 'Hilfe & Docs',         meta: 'Guides und Erklärungen',                href: '/docs',               icon: <FileText size={16} /> },
        { label: 'Support kontaktieren', meta: 'hi@festag.io',                           href: 'mailto:hi@festag.io', icon: <Question size={16} /> },
        { label: 'Einstellungen',        meta: 'Erweiterte Optionen',                    href: '/settings',           icon: <GearSix size={16} /> },
        { label: 'Abmelden',             meta: 'Aus der App ausloggen',                  onClick: logout,             icon: <SignOut size={16} />, tone: 'danger' },
      ],
    },
  ]

  return (
    <div className="more-page">
      <header className="mp-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>Mehr</h1>
          {name && <p className="mp-meta">{name}{email ? ` · ${email}` : ''}</p>}
        </div>
        <TagroEntryButton
          context={{ contextType: 'empty', id: 'more', title: 'Mehr · Übersicht' }}
        />
      </header>

      <div className="mp-sections">
        {SECTIONS.map(section => (
          <section key={section.label} className="mp-section">
            <p className="mp-section-label">{section.label}</p>
            <div className="mp-list">
              {section.rows.map((row, i) => {
                const cls = `mp-row${row.tone === 'danger' ? ' tone-danger' : ''}`
                const inner = (
                  <>
                    <span className="mp-row-icon">{row.icon}</span>
                    <span className="mp-row-main">
                      <strong>{row.label}</strong>
                      {row.meta && <small>{row.meta}</small>}
                    </span>
                    <CaretRight size={11} weight="bold" className="mp-row-chevron" />
                  </>
                )
                if (row.href) {
                  return row.href.startsWith('mailto:')
                    ? <a key={i} href={row.href} className={cls}>{inner}</a>
                    : <Link key={i} href={row.href} className={cls}>{inner}</Link>
                }
                return (
                  <button key={i} type="button" className={cls} onClick={row.onClick}>
                    {inner}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="mp-version">Festag · Build {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>

      <style jsx>{`
        .more-page { padding: calc(20px + env(safe-area-inset-top, 0px)) 20px calc(96px + env(safe-area-inset-bottom, 0px)); max-width: 720px; margin: 0 auto; background: #FCFCFC; min-height: 100%; }
        @media (min-width: 768px) { .more-page { padding: 26px 28px 48px; background: transparent; } }

        .mp-head { margin-bottom: 28px; }
        .mp-eyebrow { margin: 0 0 4px; font-size: 10.5px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
        h1 {
          margin: 0;
          font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
          font-size: 29px;
          font-weight: 400;
          letter-spacing: -0.5px;
          line-height: 1.02;
          color: #0F0F10;
        }
        .mp-meta { margin: 6px 0 0; font-size: 15px; color: #90959F; font-weight: 400; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        [data-theme="dark"] h1, [data-theme="classic-dark"] h1 { color: #f4f4f4; }
        [data-theme="dark"] .mp-meta, [data-theme="classic-dark"] .mp-meta { color: #9aa0ac; }

        .mp-sections { display: flex; flex-direction: column; gap: 16px; }
        .mp-section { display: flex; flex-direction: column; gap: 6px; }
        .mp-section-label {
          margin: 0 8px 2px; font-size: 10.5px; font-weight: 500;
          letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted);
        }
        .mp-list {
          display: flex; flex-direction: column; gap: 2px;
          padding: 4px;
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.07);
          border-radius: 14px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 1px 0 rgba(0,0,0,0.04), 0 4px 10px rgba(144,149,159,0.16);
        }
        [data-theme="dark"] .mp-list, [data-theme="classic-dark"] .mp-list {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.14);
        }
        .mp-row {
          display: grid; grid-template-columns: 32px 1fr 12px;
          gap: 12px; align-items: center;
          width: 100%; padding: 10px 10px;
          border: 0; background: transparent;
          /* Items match container — 14px container, items 10px. */
          border-radius: 10px !important;
          color: var(--text); text-decoration: none;
          font: inherit; text-align: left;
          cursor: pointer;
          min-height: 52px;
          transition: background .12s;
        }
        .mp-row:hover, .mp-row:active {
          background: color-mix(in srgb, var(--surface-2) 65%, transparent);
        }
        .mp-row.tone-danger { color: #ef4444; }
        .mp-row.tone-danger .mp-row-icon { background: color-mix(in srgb, #ef4444 14%, transparent); color: #ef4444; }
        .mp-row.tone-danger:hover { background: color-mix(in srgb, #ef4444 10%, transparent); }

        .mp-row-icon {
          width: 32px; height: 32px; border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--surface-2) 65%, transparent);
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .mp-row-main { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .mp-row-main strong {
          font-size: 13.5px; font-weight: 500; letter-spacing: -.005em;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mp-row-main small {
          font-size: 11px; line-height: 1.4; font-weight: 500; letter-spacing: .012em;
          color: var(--text-muted);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mp-row-chevron { color: var(--text-muted); flex-shrink: 0; opacity: .55; }
        .mp-row:hover .mp-row-chevron { opacity: 1; }

        .mp-version {
          margin: 20px 0 0; text-align: center;
          font-size: 10.5px; color: var(--text-muted);
          font-weight: 500; letter-spacing: .04em; opacity: .65;
        }
      `}</style>
    </div>
  )
}
