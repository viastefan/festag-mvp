'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, ChatCircle, ArrowRight, Plus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

export default function RelationsPage() {
  const [name, setName] = useState('')
  const [projectCount, setProjectCount] = useState(0)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: p } = await sb.from('profiles').select('first_name,full_name').eq('id', data.user.id).single()
      if (p) setName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')

      // Count projects
      const { count } = await sb.from('rel_projects').select('*', { count: 'exact', head: true }).eq('user_id', data.user.id)
      setProjectCount(count ?? 0)
    })
  }, [])

  return (
    <div className="page-content">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .3, ease: [.16, 1, .3, 1] }}
      >
        {/* Header */}
        <div className="page-header">
          <h1>Willkommen{name ? `, ${name}` : ''}</h1>
          <p>Dein Relations-Panel — verwalte Projekte, Dokumente und Kommunikation.</p>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 32 }}>
          {/* Active projects card */}
          <Link href="/relations/projects" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', padding: '20px 22px',
              transition: 'border-color .15s, box-shadow .15s',
              cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--green-bg)', border: '1px solid var(--green-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Briefcase size={18} weight="duotone" color="var(--green)" />
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px', fontVariantNumeric: 'tabular-nums' }}>{projectCount}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Aktive Projekte</p>
            </div>
          </Link>

          {/* Messages card */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', padding: '20px 22px',
            opacity: .6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ChatCircle size={18} weight="duotone" color="var(--text-muted)" />
              </div>
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>0</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Neue Nachrichten</p>
          </div>
        </div>

        {/* New project CTA */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '28px 26px',
          display: 'flex', alignItems: 'center', gap: 18,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Plus size={20} weight="bold" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 3px' }}>Neues Projekt starten</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Erstelle ein Projekt und lade dein Team ein.</p>
          </div>
          <Link href="/relations/projects/new" style={{
            padding: '8px 18px', borderRadius: 9,
            background: 'var(--btn-prim)', color: 'var(--btn-prim-text)',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            transition: 'opacity .12s',
            whiteSpace: 'nowrap',
          }}>
            Erstellen
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
