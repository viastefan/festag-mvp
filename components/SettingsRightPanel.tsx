'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsRightPanel() {
  const [stats,    setStats]    = useState({ projects:0, tasks:0, messages:0, done:0 })
  const [activity, setActivity] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const [{ data:projs }, { data:acts }] = await Promise.all([
        sb.from('projects').select('id,title,status').order('created_at',{ascending:false}).limit(4),
        sb.from('activity_feed').select('*').order('created_at',{ascending:false}).limit(6),
      ])
      const ids = projs?.map(p => p.id) ?? []
      let tc = 0, mc = 0, dc = 0
      if (ids.length) {
        const [{ count:t }, { count:m }, { count:d }] = await Promise.all([
          sb.from('tasks').select('id',{count:'exact',head:true}).in('project_id', ids),
          sb.from('messages').select('id',{count:'exact',head:true}).in('project_id', ids),
          sb.from('tasks').select('id',{count:'exact',head:true}).in('project_id', ids).eq('status','done'),
        ])
        tc = t??0; mc = m??0; dc = d??0
      }
      setStats({ projects:projs?.length??0, tasks:tc, messages:mc, done:dc })
      setProjects(projs??[])
      setActivity(acts??[])
    })
  }, [])

  const PHASE: Record<string,{l:string,c:string}> = {
    intake:   { l:'Intake',      c:'#94A3B8' },
    planning: { l:'Planning',    c:'#F59E0B' },
    active:   { l:'Development', c:'#10B981' },
    testing:  { l:'Testing',     c:'#007AFF' },
    done:     { l:'Delivered',   c:'#059669' },
  }

  const pct = stats.tasks ? Math.round(stats.done / stats.tasks * 100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* ── Account Stats ── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden', boxShadow:'var(--shadow-xs)' }}>
        <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
          <p style={{ fontSize:10.5, fontWeight:700, color:'#94A3B8', letterSpacing:'.1em', margin:0 }}>DEIN ACCOUNT</p>
        </div>
        <div style={{ padding:'14px 16px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, textAlign:'left' }}>
          {[
            { l:'Projekte', v:stats.projects, c:'var(--text)' },
            { l:'Tasks',    v:stats.tasks,    c:'var(--text)' },
            { l:'Erledigt', v:stats.done,     c:'var(--green-dark)' },
            { l:'Chats',    v:stats.messages, c:'var(--text)' },
          ].map(s => (
            <div key={s.l}>
              <p style={{ fontSize:22, fontWeight:700, color:s.c, margin:'0 0 2px', lineHeight:1 }}>{s.v}</p>
              <p style={{ fontSize:10.5, color:'#94A3B8', margin:0 }}>{s.l}</p>
            </div>
          ))}
        </div>
        {/* Progress bar */}
        {stats.tasks > 0 && (
          <div style={{ padding:'0 18px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11.5, color:'#94A3B8' }}>Gesamtfortschritt</span>
              <span style={{ fontSize:11.5, fontWeight:700, color:'#0F172A' }}>{pct}%</span>
            </div>
            <div style={{ height:4, background:'#F1F5F9', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'#0F172A', borderRadius:4, transition:'width .6s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Active Projects ── */}
      {projects.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #EEF2F7', borderRadius:20, overflow:'hidden', boxShadow:'0 2px 16px rgba(15,23,42,.04)' }}>
          <div style={{ padding:'13px 18px', borderBottom:'1px solid #F1F5F9', background:'#FAFBFD', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontSize:10.5, fontWeight:700, color:'#94A3B8', letterSpacing:'.1em', margin:0 }}>PROJEKTE</p>
            <Link href="/dashboard" style={{ fontSize:11.5, color:'var(--text-secondary)', fontWeight:600 }}>Alle</Link>
          </div>
          <div style={{ padding:'8px 0' }}>
            {projects.map((p, i) => {
              const ph = PHASE[p.status] ?? { l:p.status, c:'#94A3B8' }
              return (
                <Link key={p.id} href={`/project/${p.id}`}>
                  <div style={{ padding:'9px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:i<projects.length-1?'1px solid #F8FAFC':'none', cursor:'pointer', transition:'background .1s' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#FAFBFD'}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
                  >
                    <div style={{ width:7, height:7, borderRadius:'50%', background:ph.c, flexShrink:0 }} />
                    <p style={{ fontSize:13, color:'#0F172A', flex:1, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500 }}>{p.title}</p>
                    <span style={{ fontSize:10.5, color:'#94A3B8', flexShrink:0 }}>{ph.l}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recent Activity ── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden', boxShadow:'var(--shadow-xs)' }}>
        <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontSize:10.5, fontWeight:700, color:'#94A3B8', letterSpacing:'.1em', margin:0 }}>ZULETZT AKTIV</p>
          <Link href="/activity" style={{ fontSize:11.5, color:'var(--text-secondary)', fontWeight:600 }}>Alle</Link>
        </div>
        <div style={{ padding:'6px 0' }}>
          {activity.length === 0 ? (
            <p style={{ fontSize:13, color:'#94A3B8', textAlign:'center', padding:'18px 0', margin:0 }}>Noch keine Aktivitäten</p>
          ) : activity.map((a, i) => (
            <div key={a.id} style={{ padding:'8px 16px', display:'flex', gap:10, alignItems:'center', borderBottom:i<activity.length-1?'1px solid #F8FAFC':'none' }}>
              <span style={{ width:6,height:6,borderRadius:'50%',background:'var(--text-muted)',flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12.5, color:'#0F172A', margin:0, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</p>
                <p style={{ fontSize:10.5, color:'#94A3B8', margin:0 }}>
                  {new Date(a.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}
                  {a.actor_role && <span style={{ marginLeft:5, fontWeight:600, textTransform:'uppercase', fontSize:9.5, letterSpacing:'.05em' }}>{a.actor_role}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dark Tagro CTA ── */}
      <div style={{ background:'var(--text)', borderRadius:'var(--r-lg)', padding:'16px', position:'relative', overflow:'hidden' }}>
        <p style={{ fontSize:13.5, fontWeight:700, color:'#fff', margin:'0 0 5px', lineHeight:1.3 }}>AI plant. Menschen bauen.</p>
        <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', margin:'0 0 14px', lineHeight:1.5 }}>Tagro analysiert deine Unternehmensdaten für bessere Projektergebnisse.</p>
        <Link href="/ai">
          <button style={{ padding:'7px 12px', background:'rgba(255,255,255,.1)', color:'#fff', border:'1px solid rgba(255,255,255,.15)', borderRadius:'var(--r)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Tagro öffnen
          </button>
        </Link>
      </div>

      {/* ── Quick Links ── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden', boxShadow:'var(--shadow-xs)' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
          <p style={{ fontSize:10.5, fontWeight:700, color:'#94A3B8', letterSpacing:'.1em', margin:0 }}>SCHNELLZUGRIFF</p>
        </div>
        <div style={{ padding:'4px 0' }}>
          {[
            { l:'Dashboard',         href:'/dashboard' },
            { l:'Aktuelles Projekt', href:'/project/current' },
            { l:'Activity Feed',     href:'/activity' },
            { l:'Billing',           href:'/billing' },
            { l:'Dokumente',         href:'/documents' },
          ].map((item, i) => (
            <Link key={item.href} href={item.href}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', borderBottom:i<4?'1px solid #F8FAFC':'none', cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#FAFBFD'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
              >
                <span style={{ fontSize:13, color:'#475569', flex:1 }}>{item.l}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
