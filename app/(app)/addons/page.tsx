'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Addon = {
  id: string; name: string; description: string; price: number;
  category: string;
}

const CATALOG: Addon[] = [
  { id: 'ai-video',   name: 'AI Video Generation',      description: 'Cinematische Videos aus Text für Produkt, Werbung und Tutorials', price: 890,  category: 'AI' },
  { id: 'branding',   name: 'Branding Paket',            description: 'Logo, Farbpalette, Typografie und Brand Guidelines',              price: 1290, category: 'Design' },
  { id: 'saas-ext',   name: 'SaaS Extensions',           description: 'Subscriptions, Analytics, Admin und SaaS-spezifische Features',   price: 1490, category: 'Development' },
  { id: 'automation', name: 'Automation System',         description: 'Workflows, Integrationen und APIs für wiederkehrende Prozesse',  price: 790,  category: 'System' },
  { id: 'website',    name: 'Website Development',       description: 'Landing Page, Marketing Site und SEO-optimierte Umsetzung',       price: 1190, category: 'Development' },
  { id: 'hosting',    name: 'Hosting & Infrastructure',  description: 'Setup, Deployment, Monitoring und zwölf Monate Hosting',         price: 490,  category: 'System' },
  { id: 'seo',        name: 'SEO Expert',                description: 'Technisches SEO, Content-Strategie und Ranking-Optimierung',      price: 590,  category: 'Marketing' },
  { id: 'ai-chatbot', name: 'AI Chatbot',                description: 'Custom AI-Assistent für deine Plattform mit Firmenkontext',       price: 890,  category: 'AI' },
]

export default function AddonsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [projects, setProjects] = useState<any[]>([])
  const [category, setCategory] = useState('Alle')

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
  const categories = ['Alle', ...Array.from(new Set(CATALOG.map(a => a.category)))]
  const visible = category === 'Alle' ? CATALOG : CATALOG.filter(a => a.category === category)

  return (
    <div>
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Add-ons</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Erweitere dein Projekt mit zusätzlichen Services
        </p>
      </div>

      <div className="animate-fade-up-1" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 'var(--r)',
              border: '1px solid var(--border)',
              background: category === c ? 'var(--text)' : 'var(--surface)',
              color: category === c ? 'var(--btn-prim-text)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 650,
              fontFamily: 'inherit',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="animate-fade-up-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 100 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 132px 110px 118px', gap: 14, padding: '11px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          <span>Service</span>
          <span>Kategorie</span>
          <span>Preis</span>
          <span></span>
        </div>
        {visible.map(a => {
          const isSelected = selected.has(a.id)
          return (
            <div key={a.id} style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 132px 110px 118px',
              gap: 14,
              alignItems: 'center',
              padding: '15px 16px',
              borderBottom: '1px solid var(--border)',
              background: isSelected ? 'var(--bg)' : 'var(--surface)',
              cursor: 'pointer',
              transition: 'background .12s',
            }} onClick={() => toggle(a.id)}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: '0 0 3px', fontSize: 14 }}>{a.name}</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</p>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 650 }}>{a.category}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>EUR {a.price.toLocaleString('de')}</span>
              <button style={{
                height: 32,
                border: '1px solid var(--border)',
                borderRadius: 'var(--r)',
                background: isSelected ? 'var(--text)' : 'var(--surface)',
                color: isSelected ? 'var(--btn-prim-text)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 650,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                {isSelected ? 'Ausgewählt' : 'Hinzufügen'}
              </button>
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
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>EUR {total.toLocaleString('de')}</p>
          </div>
          <button className="tap-scale" style={{ padding: '10px 18px', background: '#fff', color: 'var(--text)', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 40 }}>
            Zum Projekt hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}
