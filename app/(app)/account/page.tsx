'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, DownloadSimple, FileText, Gauge, Receipt, Sparkle } from '@phosphor-icons/react'

type QuoteRow = {
  id: string
  total_price: number | null
  status: string | null
  created_at: string
  timeline?: string | null
  projects?: { title?: string | null; status?: string | null } | null
}

type AddonRow = {
  id: string
  addon_slug?: string | null
  price?: number | null
  status?: string | null
  created_at: string
  projects?: { title?: string | null } | null
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('free')
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [addons, setAddons] = useState<AddonRow[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = '/login'
        return
      }

      const uid = data.session.user.id
      const [{ data: profile }, { data: q }, { data: a }] = await Promise.all([
        supabase.from('profiles').select('plan').eq('id', uid).single(),
        supabase.from('project_quotes').select('*, projects(title, status)').eq('user_id', uid).order('created_at', { ascending: false }).limit(12),
        supabase.from('project_addons').select('*, projects(title)').eq('added_by', uid).order('created_at', { ascending: false }).limit(12),
      ])

      setPlan((profile as any)?.plan ?? 'free')
      setQuotes((q as QuoteRow[]) ?? [])
      setAddons((a as AddonRow[]) ?? [])
      setLoading(false)
    })
  }, [])

  const totals = useMemo(() => {
    const projectTotal = quotes.reduce((sum, item) => sum + Number(item.total_price ?? 0), 0)
    const addonTotal = addons.reduce((sum, item) => sum + Number(item.price ?? 0), 0)
    const paidCount = quotes.filter((item) => item.status === 'paid').length
    return {
      projectTotal,
      addonTotal,
      overall: projectTotal + addonTotal,
      paidCount,
    }
  }, [quotes, addons])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Konto & Abrechnung</h1>
        <p>Plan, aktuelle Zahlungen, Abrechnungen und Projektpreis-Historie an einem Ort.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'AKTUELLER PLAN', value: plan.toUpperCase(), desc: 'Aktiver Kontostatus', Icon: Gauge },
          { label: 'AKTUELLE ZAHLUNGEN', value: `${totals.paidCount}`, desc: 'Bereits bezahlt', Icon: CreditCard },
          { label: 'PROJEKTPREISE', value: `€${totals.projectTotal.toLocaleString('de')}`, desc: 'Projekt-Historie', Icon: Receipt },
          { label: 'ADD-ONS', value: `€${totals.addonTotal.toLocaleString('de')}`, desc: 'Zusatzmodule', Icon: Sparkle },
        ].map((item) => {
          const Icon = item.Icon
          return (
            <article key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={18} color="var(--text)" weight="regular" />
              </div>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', margin: '0 0 8px' }}>{item.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{item.value}</p>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0 }}>{item.desc}</p>
            </article>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16 }}>
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Projektpreis-Historie</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Alle angenommenen und bezahlten Projektangebote in zeitlicher Reihenfolge.</p>
          </div>
          {quotes.length === 0 ? (
            <div style={{ padding: 28, fontSize: 13, color: 'var(--text-secondary)' }}>Noch keine Projektpreise vorhanden.</div>
          ) : quotes.map((item, index) => (
            <div key={item.id} style={{ padding: '16px 20px', borderBottom: index < quotes.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.projects?.title ?? 'Projekt'}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(item.created_at).toLocaleDateString('de')} · {(item.status ?? 'pending').toUpperCase()}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>€{Number(item.total_price ?? 0).toLocaleString('de')}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)' }}>{item.timeline ?? 'Festag Garantie aktiv'}</p>
              </div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gap: 16 }}>
          <article style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Aktuelle Abrechnung</h2>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Verwalte Zahlungen, Rechnungen und Preise zentral in deinem Konto.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              <Link href="/billing" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)', background: 'var(--surface-2)', borderRadius: 12, padding: '12px 14px' }}>
                <CreditCard size={18} weight="regular" />
                <span>Aktuelle Zahlungen & Rechnungen</span>
              </Link>
              <Link href="/pricing" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)', background: 'var(--surface-2)', borderRadius: 12, padding: '12px 14px' }}>
                <FileText size={18} weight="regular" />
                <span>Preispläne ansehen</span>
              </Link>
            </div>
          </article>

          <article style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Geräte & Zugriff</h2>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Installiere Festag auf deinen Geräten oder passe dein Konto im Detail an.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              <Link href="/download" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)', background: 'var(--surface-2)', borderRadius: 12, padding: '12px 14px' }}>
                <DownloadSimple size={18} weight="regular" />
                <span>Download App</span>
              </Link>
              <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)', background: 'var(--surface-2)', borderRadius: 12, padding: '12px 14px' }}>
                <Gauge size={18} weight="regular" />
                <span>Kontoeinstellungen</span>
              </Link>
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}
