'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function BillingPage() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [addons, setAddons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      const [q, a] = await Promise.all([
        supabase.from('project_quotes').select('*, projects(title, status)').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('project_addons').select('*, projects(title)').eq('added_by', uid).order('created_at', { ascending: false }),
      ])
      setQuotes(q.data ?? [])
      setAddons(a.data ?? [])
      setLoading(false)
    })
  }, [])

  const totalInvested = quotes.reduce((s, q) => s + Number(q.total_price ?? 0), 0)
  const totalAddons = addons.reduce((s, a) => s + Number(a.price ?? 0), 0)

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div style={{ width:24, height:24, border:'2px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div>
      <div className="animate-fade-up" style={{ marginBottom:22 }}>
        <h1 style={{ marginBottom:4 }}>Billing & Zahlungen</h1>
        <p style={{ fontSize:14, color:'var(--text-secondary)' }}>Deine Projektinvestitionen und Add-ons</p>
      </div>

      <div className="animate-fade-up-1 grid-cols-4" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:22 }}>
        {[
          { label:'INVESTIERT', value:`€${totalInvested.toLocaleString('de')}`, desc:`${quotes.length} Projekt${quotes.length !== 1?'e':''}` },
          { label:'ADD-ONS',    value:`€${totalAddons.toLocaleString('de')}`, desc:`${addons.length} aktiv` },
          { label:'GESAMT',     value:`€${(totalInvested+totalAddons).toLocaleString('de')}`, desc:'Total Pipeline' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px 18px' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', marginBottom:8 }}>{s.label}</p>
            <p style={{ fontSize:22, fontWeight:700, color:'var(--text)', lineHeight:1, marginBottom:4 }}>{s.value}</p>
            <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="animate-fade-up-2" style={{ marginBottom:16 }}>
        <h3 style={{ marginBottom:12 }}>Projektübersicht</h3>
        {quotes.length === 0 ? (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'48px 24px', textAlign:'center' }}>
            <p style={{ fontSize:14, color:'var(--text-muted)', margin:'0 0 14px' }}>Noch keine abgeschlossenen Projekte</p>
            <Link href="/onboarding">
              <button className="tap-scale" style={{ padding:'10px 20px', background:'var(--text)', color:'#fff', border:'none', borderRadius:'var(--r-sm)', fontSize:13, fontWeight:600, cursor:'pointer' }}>Projekt starten →</button>
            </Link>
          </div>
        ) : (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
            {quotes.map((q, i) => (
              <div key={q.id} style={{ padding:'16px 20px', borderBottom: i<quotes.length-1?'1px solid var(--border)':'none', display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5 }}>
                    <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:0 }}>{q.projects?.title ?? 'Projekt'}</p>
                    <span style={{ padding:'2px 7px', borderRadius:5, fontSize:10, fontWeight:600, color: q.status==='paid'?'var(--green-dark)':q.status==='accepted'?'#D97706':'var(--text-muted)', background: q.status==='paid'?'var(--green-bg)':q.status==='accepted'?'var(--amber-bg)':'var(--surface-2)' }}>
                      {(q.status ?? 'pending').toUpperCase()}
                    </span>
                  </div>
                  {q.breakdown && (
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      {Object.entries(q.breakdown as Record<string,number>).map(([k,v]) => (
                        <span key={k} style={{ fontSize:12, color:'var(--text-muted)' }}>
                          {k.charAt(0).toUpperCase()+k.slice(1)}: <strong style={{ color:'var(--text-secondary)' }}>€{Number(v).toLocaleString('de')}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontSize:18, fontWeight:700, color:'var(--text)', margin:0 }}>€{Number(q.total_price).toLocaleString('de')}</p>
                  {q.timeline && <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>{q.timeline}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addons.length > 0 && (
        <div className="animate-fade-up-3">
          <h3 style={{ marginBottom:12 }}>Aktive Add-ons</h3>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
            {addons.map((a, i) => (
              <div key={a.id} style={{ padding:'14px 20px', borderBottom: i<addons.length-1?'1px solid var(--border)':'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0 }}>{a.addon_slug ?? 'Add-on'}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>{a.projects?.title ?? '—'}</p>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ padding:'2px 7px', borderRadius:5, fontSize:10, fontWeight:600, color: a.status==='active'?'var(--green-dark)':'var(--text-muted)', background: a.status==='active'?'var(--green-bg)':'var(--surface-2)' }}>
                    {(a.status ?? 'pending').toUpperCase()}
                  </span>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>€{Number(a.price).toLocaleString('de')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
