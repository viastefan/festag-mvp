'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Addon = {
  id: string; name: string; description: string; price: number;
  category: string; icon: string;
}

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
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#181D1C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
}

export default function AddonsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      supabase.from('projects').select('id,title,status').then(({ data: p }) => setProjects(p ?? []))
    })
  }, [])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const total = [...selected].reduce((sum, id) => sum + (CATALOG.find(a => a.id === id)?.price ?? 0), 0)

  return (
    <div>
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Add-ons</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Erweitere dein Projekt mit zusätzlichen Services
        </p>
      </div>

      <div className="animate-fade-up-1 grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 100 }}>
        {CATALOG.map(a => {
          const isSelected = selected.has(a.id)
          return (
            <div key={a.id} className="tap-scale" style={{
              background: 'var(--surface)',
              border: `1.5px solid ${isSelected ? 'var(--text)' : 'var(--border)'}`,
              borderRadius: 'var(--r-lg)', padding: 18, cursor: 'pointer', transition: 'all 0.15s',
              position: 'relative',
            }} onClick={() => toggle(a.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AddonIcon name={a.icon} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{a.category.toUpperCase()}</span>
              </div>
              <h3 style={{ marginBottom: 6 }}>{a.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{a.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>€{a.price.toLocaleString('de')}</span>
                <button style={{
                  padding: '7px 14px', border: 'none', borderRadius: 'var(--r-sm)',
                  background: isSelected ? 'var(--green-bg)' : 'var(--text)',
                  color: isSelected ? 'var(--green-dark)' : '#fff',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 32,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {isSelected ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                      Hinzugefügt
                    </>
                  ) : '+ Hinzufügen'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text)', color: '#fff', padding: '14px 20px',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: 16, zIndex: 300, animation: 'slideUp 0.2s ease',
          maxWidth: 'calc(100% - 32px)',
        }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{selected.size} Add-on{selected.size > 1 ? 's' : ''}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>€{total.toLocaleString('de')}</p>
          </div>
          <button className="tap-scale" style={{ padding: '10px 18px', background: '#fff', color: 'var(--text)', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 40 }}>
            Zum Projekt hinzufügen →
          </button>
        </div>
      )}
    </div>
  )
}
