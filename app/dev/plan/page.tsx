'use client'

/**
 * /dev/plan — Tägliche Veyra-Plan-Vorschau.
 *
 * Erste, ehrliche Version: liest existierende Pläne für heute aus
 * `developer_daily_plans`. Wenn keiner existiert, zeigt ein Empty-State
 * mit "Plan erzeugen"-Button (Stub-API).
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Sparkle, CheckCircle, Hourglass } from '@phosphor-icons/react'

type Plan = {
  id: string
  project_id: string | null
  date: string
  focus_summary: string | null
  plan_json: any
  status: string
  created_at: string
}

function todayStr() {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export default function DevPlanPage() {
  const supabase = useMemo(() => createClient(), [])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const session = { user }
      const { data: p } = await supabase
        .from('developer_daily_plans')
        .select('*')
        .eq('developer_id', session.user.id)
        .eq('date', todayStr())
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setPlans(((p as Plan[] | null) ?? []))
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [supabase])

  async function generatePlan() {
    setMsg(null); setGenerating(true)
    try {
      const res = await fetch('/api/dev/daily-plan', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg(d?.error || 'Plan konnte nicht erzeugt werden.'); return }
      if (d?.plan) setPlans(prev => [d.plan, ...prev])
      setMsg('Plan erzeugt.')
    } finally {
      setGenerating(false)
    }
  }

  async function confirmPlan(id: string) {
    await supabase.from('developer_daily_plans').update({ status: 'confirmed' }).eq('id', id)
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: 'confirmed' } : p))
  }

  return (
    <div className="dev-page">
      <header className="dev-page-header">
        <div>
          <p className="dev-eyebrow">DEV · Daily Plan</p>
          <h1>Plan für heute</h1>
          <p className="meta">
            Today's plan is generated from your assigned tasks, project priorities, and recent activity.
          </p>
        </div>
        <button className="dev-primary-btn" onClick={generatePlan} disabled={generating}>
          <Sparkle size={13} style={{ marginRight: 6 }} />
          {generating ? 'Plan wird erstellt…' : 'Plan erzeugen'}
        </button>
      </header>

      {msg && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{msg}</p>}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>Lade Plan…</p>
      ) : plans.length === 0 ? (
        <div className="dev-surface" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Hourglass size={20} style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: 13 }}>Für heute gibt es noch keinen Plan.</p>
          <p style={{ margin: '4px 0 0', fontSize: 11.5 }}>
            Klick auf „Plan erzeugen" — Veyra liest deine zugewiesenen Tasks und die letzte GitHub-Aktivität.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {plans.map(p => (
            <li key={p.id} className="dev-surface" style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <span className="dev-chip">{p.status === 'confirmed' ? 'bestätigt' : 'Entwurf'}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {new Date(p.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {p.status !== 'confirmed' && (
                  <button className="dev-secondary-btn" style={{ marginLeft: 'auto' }} onClick={() => confirmPlan(p.id)}>
                    <CheckCircle size={11} style={{ marginRight: 4 }} /> Bestätigen
                  </button>
                )}
              </div>
              {p.focus_summary && (
                <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55 }}>{p.focus_summary}</p>
              )}
              {Array.isArray(p.plan_json) && p.plan_json.length > 0 && (
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  {p.plan_json.map((step: any, idx: number) => (
                    <li key={idx} style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '4px 0' }}>
                      <strong style={{ color: 'var(--text)' }}>{step.title || step.task_id}</strong>
                      {step.expected_outcome && <span> — {step.expected_outcome}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 18 }}>
        <Link href="/dev" style={{ color: 'inherit' }}>← zurück zur Übersicht</Link>
      </p>
    </div>
  )
}
