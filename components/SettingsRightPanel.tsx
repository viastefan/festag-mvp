'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsRightPanel() {
  const [stats, setStats] = useState({ projects: 0, tasks: 0, messages: 0 })
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const [{ data: projs }, { data: acts }] = await Promise.all([
        sb.from('projects').select('id, title, status').order('created_at', { ascending: false }).limit(3),
        sb.from('activity_feed').select('*').order('created_at', { ascending: false }).limit(5),
      ])
      const ids = projs?.map(p => p.id) ?? []
      let taskCount = 0, msgCount = 0
      if (ids.length) {
        const [{ count: tc }, { count: mc }] = await Promise.all([
          sb.from('tasks').select('id', { count: 'exact', head: true }).in('project_id', ids),
          sb.from('messages').select('id', { count: 'exact', head: true }).in('project_id', ids),
        ])
        taskCount = tc ?? 0; msgCount = mc ?? 0
      }
      setStats({ projects: projs?.length ?? 0, tasks: taskCount, messages: msgCount })
      setRecentActivity(acts ?? [])
    })
  }, [])

  const EVENT_ICON: Record<string, string> = {
    task_created: '📋', task_done: '✅', task_status: '🔄',
    ai_report: '🤖', project_status: '🚀', message_sent: '💬',
    password_changed: '🔐', login: '👤',
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>

      {/* Quick stats */}
      <div style={{ background:'#fff',border:'1px solid #EEF2F7',borderRadius:20,overflow:'hidden',boxShadow:'0 2px 16px rgba(15,23,42,.04)' }}>
        <div style={{ padding:'13px 18px',borderBottom:'1px solid #F1F5F9',background:'#FAFBFD' }}>
          <p style={{ fontSize:10.5,fontWeight:700,color:'#94A3B8',letterSpacing:'.1em',margin:0 }}>DEIN ACCOUNT</p>
        </div>
        <div style={{ padding:'14px 18px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
          {[
            { l:'Projekte', v: stats.projects, icon:'M3 3h18v18H3zM3 9h18M9 21V9' },
            { l:'Tasks',    v: stats.tasks,    icon:'M9 11l3 3L22 4' },
            { l:'Messages', v: stats.messages, icon:'M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z' },
          ].map(s => (
            <div key={s.l} style={{ textAlign:'center' }}>
              <svg style={{ display:'block',margin:'0 auto 6px' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {s.icon.split('M').filter(Boolean).map((seg,i) => <path key={i} d={'M'+seg}/>)}
              </svg>
              <p style={{ fontSize:20,fontWeight:700,color:'#0F172A',margin:'0 0 2px',lineHeight:1 }}>{s.v}</p>
              <p style={{ fontSize:11,color:'#94A3B8',margin:0 }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ background:'#fff',border:'1px solid #EEF2F7',borderRadius:20,overflow:'hidden',boxShadow:'0 2px 16px rgba(15,23,42,.04)' }}>
        <div style={{ padding:'13px 18px',borderBottom:'1px solid #F1F5F9',background:'#FAFBFD',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <p style={{ fontSize:10.5,fontWeight:700,color:'#94A3B8',letterSpacing:'.1em',margin:0 }}>ZULETZT AKTIV</p>
          <Link href="/activity" style={{ fontSize:11.5,color:'#007AFF',fontWeight:600 }}>Alle →</Link>
        </div>
        <div style={{ padding:'6px 0' }}>
          {recentActivity.length === 0 ? (
            <p style={{ fontSize:13,color:'#94A3B8',textAlign:'center',padding:'18px 0',margin:0 }}>Noch keine Aktivitäten</p>
          ) : recentActivity.map((a,i) => (
            <div key={a.id} style={{ padding:'8px 16px',display:'flex',gap:10,alignItems:'flex-start',borderBottom:i<recentActivity.length-1?'1px solid #F8FAFC':'none' }}>
              <span style={{ fontSize:15,flexShrink:0,marginTop:1 }}>{a.icon || EVENT_ICON[a.event_type] || '•'}</span>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:12.5,color:'#0F172A',margin:0,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{a.title}</p>
                <p style={{ fontSize:11,color:'#94A3B8',margin:0 }}>{new Date(a.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Festag info box */}
      <div style={{ background:'#0F172A',borderRadius:20,padding:'18px 20px',overflow:'hidden',position:'relative' }}>
        <div style={{ position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,.04)' }} />
        <div style={{ position:'absolute',bottom:-15,right:10,width:50,height:50,borderRadius:'50%',background:'rgba(255,255,255,.03)' }} />
        <div style={{ marginBottom:12 }}>
          <img src="/brand/logo.svg" alt="festag" style={{ height:13,filter:'brightness(0) invert(1)',opacity:.8 }} />
        </div>
        <p style={{ fontSize:13.5,fontWeight:600,color:'#fff',margin:'0 0 6px',lineHeight:1.35 }}>
          AI plant. Menschen bauen. System verbindet.
        </p>
        <p style={{ fontSize:12,color:'rgba(255,255,255,.5)',margin:'0 0 14px',lineHeight:1.5 }}>
          Tagro AI analysiert deine Unternehmensdaten für bessere Projektergebnisse.
        </p>
        <Link href="/ai">
          <button style={{ padding:'8px 14px',background:'rgba(255,255,255,.1)',color:'#fff',border:'1px solid rgba(255,255,255,.15)',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s' }}>
            Tagro öffnen →
          </button>
        </Link>
      </div>

      {/* Help links */}
      <div style={{ background:'#fff',border:'1px solid #EEF2F7',borderRadius:16,padding:'14px 18px',boxShadow:'0 2px 16px rgba(15,23,42,.04)' }}>
        <p style={{ fontSize:10.5,fontWeight:700,color:'#94A3B8',letterSpacing:'.1em',margin:'0 0 10px' }}>SCHNELLZUGRIFF</p>
        {[
          { l:'Dashboard',        href:'/dashboard',  icon:'M3 12l9-9 9 9M5 10v10h14V10' },
          { l:'Aktuelles Projekt',href:'/project/current', icon:'M3 3h18v18H3zM3 9h18M9 21V9' },
          { l:'Activity Feed',    href:'/activity',   icon:'M22 12h-4l-3 9L9 3l-3 9H2' },
          { l:'Billing',          href:'/billing',    icon:'M2 5h20v14H2zM2 10h20' },
        ].map((item,i) => (
          <Link key={item.href} href={item.href}>
            <div style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 4px',borderBottom:i<3?'1px solid #F8FAFC':'none',cursor:'pointer',transition:'opacity .1s' }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity='.7'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity='1'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {item.icon.split('M').filter(Boolean).map((seg,i) => <path key={i} d={'M'+seg}/>)}
              </svg>
              <span style={{ fontSize:13,color:'#475569',flex:1 }}>{item.l}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
