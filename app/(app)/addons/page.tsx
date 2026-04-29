'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PaymentModal from '@/components/PaymentModal'

type Addon = {
  id: string; name: string; description: string; price: number;
  category: string; icon: string;
}

type PurchaseStatus = 'active' | 'pending' | undefined
type PurchaseRecord = { reference: string; status: PurchaseStatus; createdAt: number; completedAt?: number }
type Purchases = Record<string, PurchaseRecord>  // addonId -> record

const CATALOG: Addon[] = [
  { id: 'ai-video',   name: 'AI Video Generation',   description: 'Cinematische Videos aus Text — Produktvideos, Werbung, Tutorials', price: 890,  category: 'AI', icon: 'video' },
  { id: 'branding',   name: 'Branding Paket',         description: 'Logo, Farbpalette, Typografie, Brand Guidelines',                   price: 1290, category: 'Design', icon: 'brand' },
  { id: 'saas-ext',   name: 'SaaS Extensions',        description: 'Erweiterte SaaS-Features: Subscriptions, Analytics, Admin',        price: 1490, category: 'Dev', icon: 'saas' },
  { id: 'automation', name: 'Automation System',      description: 'Workflows, Integrationen, APIs — automatisiere wiederkehrende Tasks', price: 790,  category: 'System', icon: 'auto' },
  { id: 'website',    name: 'Website Development',    description: 'Landing Page, Marketing Site, SEO-optimiert',                       price: 1190, category: 'Dev', icon: 'web' },
  { id: 'hosting',    name: 'Hosting & Infrastructure', description: 'Setup, Deployment, Monitoring — inkl. 12 Monate Hosting',        price: 490,  category: 'System', icon: 'host' },
  { id: 'seo',        name: 'SEO Expert',             description: 'Technisches SEO, Content-Strategie, Rankings-Optimierung',          price: 590,  category: 'Marketing', icon: 'seo' },
  { id: 'ai-chatbot', name: 'AI Chatbot',             description: 'Custom AI-Assistent für deine Plattform mit Firmenkontext',        price: 890,  category: 'AI', icon: 'bot' },
]

function AddonIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    video: <><rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2z"/></>,
    brand: <><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></>,
    saas: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></>,
    auto: <><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/></>,
    web: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><circle cx="6.5" cy="6" r="0.5"/><circle cx="9" cy="6" r="0.5"/></>,
    host: <><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><path d="M7 7h.01M7 17h.01"/></>,
    seo: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    bot: <><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M9 3v4M15 3v4M9 13v2M15 13v2"/></>,
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{color:"var(--text)"}} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export default function AddonsPage() {
  const [userId, setUserId] = useState('')
  const [purchases, setPurchases] = useState<Purchases>({})
  const [paying, setPaying] = useState<Addon | null>(null)
  const [toast, setToast] = useState<{ kind: 'success'|'pending'; text: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserId(data.session.user.id)
    })
  }, [])

  const storageKey = userId ? `addon_purchases_${userId}` : ''

  // Load purchases on userId resolve
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) setPurchases(JSON.parse(raw))
    } catch {}
  }, [storageKey])

  // On mount: re-check pending purchases — maybe payment came in late
  useEffect(() => {
    if (!storageKey) return
    const pendings = Object.entries(purchases).filter(([, r]) => r?.status === 'pending')
    if (pendings.length === 0) return
    pendings.forEach(async ([addonId, rec]) => {
      try {
        const r = await fetch(`/api/payments/check?reference=${encodeURIComponent(rec.reference)}`)
        const d = await r.json()
        if (d.status === 'done') {
          markActive(addonId, rec.reference)
        }
      } catch {}
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  function persist(next: Purchases) {
    setPurchases(next)
    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
    }
  }

  function markActive(addonId: string, reference: string) {
    persist({ ...purchases, [addonId]: { reference, status: 'active', createdAt: purchases[addonId]?.createdAt ?? Date.now(), completedAt: Date.now() } })
  }

  function markPending(addonId: string, reference: string) {
    persist({ ...purchases, [addonId]: { reference, status: 'pending', createdAt: Date.now() } })
  }

  return (
    <div className="page-content-full">
      <div className="page-header">
        <h1>Add-Ons</h1>
        <p>Erweitere dein Projekt mit zusätzlichen Services · Zahlung über <strong>Enjyn</strong></p>
      </div>

      <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 100 }}>
        {CATALOG.map(a => {
          const rec = purchases[a.id]
          const isActive  = rec?.status === 'active'
          const isPending = rec?.status === 'pending'
          return (
            <div key={a.id} className="tap-scale" style={{
              background: 'var(--surface)',
              border: `1.5px solid ${isActive ? 'var(--green)' : isPending ? 'var(--amber)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)', padding: 18,
              cursor: isActive ? 'default' : 'pointer', transition: 'all 0.15s',
              position: 'relative', opacity: isActive ? 0.95 : 1,
            }} onClick={() => { if (!isActive && !isPending) setPaying(a) }}>

              {/* Status-Badge oben rechts */}
              {(isActive || isPending) && (
                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
                  background: isActive ? 'var(--green-bg)' : 'rgba(255,176,0,.12)',
                  color: isActive ? 'var(--green-dark)' : '#A66E00',
                  border: `1px solid ${isActive ? 'var(--green-border)' : 'rgba(255,176,0,.25)'}`,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? 'var(--green)' : 'var(--amber)', animation: isPending ? 'pulse 2s infinite' : 'none' }} />
                  {isActive ? 'AKTIV' : 'AUSSTEHEND'}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AddonIcon name={a.icon} />
                </div>
                {!isActive && !isPending && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{a.category.toUpperCase()}</span>
                )}
              </div>
              <h3 style={{ marginBottom: 6 }}>{a.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{a.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>€{a.price.toLocaleString('de')}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isActive && !isPending) setPaying(a) }}
                  disabled={isActive}
                  style={{
                    padding: '7px 14px', border: 'none', borderRadius: 'var(--r-sm)',
                    background: isActive ? 'var(--green-bg)' : isPending ? 'var(--surface-2)' : 'var(--text)',
                    color: isActive ? 'var(--green-dark)' : isPending ? 'var(--text-secondary)' : '#fff',
                    fontSize: 12, fontWeight: 600, cursor: isActive ? 'default' : 'pointer', minHeight: 32,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {isActive ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                      Aktiv
                    </>
                  ) : isPending ? 'Wartet auf Zahlung' : 'Jetzt kaufen'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.kind === 'success' ? 'var(--green-bg)' : 'rgba(255,176,0,.12)',
          color: toast.kind === 'success' ? 'var(--green-dark)' : '#A66E00',
          border: `1px solid ${toast.kind === 'success' ? 'var(--green-border)' : 'rgba(255,176,0,.25)'}`,
          padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: 'calc(100% - 32px)',
          zIndex: 400,
        }}>
          {toast.text}
        </div>
      )}

      {/* Payment Modal */}
      {paying && (
        <PaymentModal
          amount={paying.price}
          note={`Add-on: ${paying.name}`}
          itemTitle={paying.name}
          onClose={() => setPaying(null)}
          onSuccess={(reference) => {
            markActive(paying.id, reference)
            setToast({ kind: 'success', text: `${paying.name} ist jetzt aktiv.` })
            setTimeout(() => setToast(null), 4000)
          }}
          onTimeout={(reference) => {
            markPending(paying.id, reference)
            setToast({ kind: 'pending', text: `Zahlung noch nicht erkannt. ${paying.name} wird automatisch in den nächsten 24h aktiviert, sobald sie eingeht.` })
            setTimeout(() => setToast(null), 7000)
          }}
        />
      )}
    </div>
  )
}
