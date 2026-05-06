'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, X, CheckCircle, Eye, EyeSlash, Envelope, UserCircle,
  Code, Database, Globe, ShieldCheck, GitBranch, Rocket,
  ChatCircle, FileText, ListChecks, Wrench, Star,
  Users, Briefcase, Buildings, ArrowsClockwise,
  PencilSimple, CaretRight, Check,
} from '@phosphor-icons/react'

// ── Types ──────────────────────────────────────────────────────────────────

type Member = {
  id: string
  first_name?: string
  full_name?: string
  avatar_url?: string | null
  role?: string
  email?: string
}

type TaskArea = {
  id: string
  label: string
  desc: string
  Icon: React.ComponentType<any>
}

type Assignment = {
  areas: string[]          // task area ids the member controls
  createTasks: boolean     // should create tasks from assigned areas
  note: string
}

// ── Task areas ────────────────────────────────────────────────────────────

const TASK_AREAS: TaskArea[] = [
  { id: 'frontend',  label: 'Frontend',         desc: 'UI, Komponenten, Styles',        Icon: Globe        },
  { id: 'backend',   label: 'Backend / API',     desc: 'Routes, Logik, Integrationen',   Icon: Code         },
  { id: 'database',  label: 'Datenbank',         desc: 'Schema, Migrationen, Queries',   Icon: Database     },
  { id: 'devops',    label: 'DevOps',            desc: 'CI/CD, Deployments, Infra',      Icon: Rocket       },
  { id: 'security',  label: 'Security',          desc: 'Auth, RLS, Audits',              Icon: ShieldCheck  },
  { id: 'review',    label: 'Code Reviews',      desc: 'PRs, Qualitätssicherung',        Icon: GitBranch    },
  { id: 'docs',      label: 'Dokumentation',     desc: 'Technische Docs, README',        Icon: FileText     },
  { id: 'sprint',    label: 'Sprint Planning',   desc: 'Roadmap, Prioritäten, Tasks',    Icon: ListChecks   },
  { id: 'support',   label: 'Client Support',    desc: 'Kommunikation, Rückfragen',      Icon: ChatCircle   },
  { id: 'bugfix',    label: 'Bug Tracking',      desc: 'Fehleranalyse, Hotfixes',        Icon: Wrench       },
]

// ── Scenarios (simplified for display) ───────────────────────────────────

const SCENARIOS = [
  {
    id: 'client',
    eyebrow: 'COLLABORATION',
    title: 'Client Team',
    subtitle: 'Founder & Co-Founder',
    desc: 'Maximale Kontrolle für die Führungsebene. 100 % Einsicht in AI-Kontext, Roadmap und tägliche Progress-Reports.',
    Icon: Star,
    access: ['AI-Kontext & Roadmap', 'Budget & Strategie', 'Progress-Reports', 'Alle Projekt-Chats'],
    denied: [],
    cta: 'Client Team erstellen',
  },
  {
    id: 'dev',
    eyebrow: 'EXECUTION',
    title: 'Developer Team',
    subtitle: 'Lead Dev & Dev-Partner',
    desc: 'Fokus auf Code-Produktion. Tasks, Deployments und Doku geteilt — Founder-Strategie bleibt unsichtbar.',
    Icon: Code,
    access: ['Tasks & Sprint-Board', 'Technische Dokumentation', 'Deployment-Status'],
    denied: ['Founder-Strategie-Chats'],
    badge: 'BELIEBT',
    cta: 'Developer Team einrichten',
  },
  {
    id: 'agency',
    eyebrow: 'MULTI-CLIENT',
    title: 'Agency Ecosystem',
    subtitle: 'Agentur & Clients (isoliert)',
    desc: 'Jeder Client = ein isolierter Team-Context. Kunde A sieht niemals Projekte von Kunde B.',
    Icon: Buildings,
    access: ['Team-Switcher für Admin', 'Eigener AI-Kontext pro Client', 'Container-Trennung'],
    denied: ['Andere Client-Workspaces'],
    cta: 'Als Agentur starten',
  },
  {
    id: 'corporate',
    eyebrow: 'ENTERPRISE',
    title: 'Corporate Integration',
    subtitle: 'Unternehmen & Inhouse-Dev',
    desc: 'Festangestellter Dev erhält dedizierten Zugang — nur zugewiesene Produkte. Read-Only für Strategie.',
    Icon: Briefcase,
    access: ['Zugewiesene Projekte', 'Technische Tasks'],
    denied: ['Öffentliche Marktplätze', 'Strategie-Dashboard'],
    badge: 'ENTERPRISE',
    cta: 'Corporate anfragen',
    mailto: 'mailto:stefandirnberger@viawen.com?subject=Corporate%20Integration',
  },
]

// ── Component ─────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [members,    setMembers]    = useState<Member[]>([])
  const [me,         setMe]         = useState<Member | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invEmail,   setInvEmail]   = useState('')
  const [invRole,    setInvRole]    = useState('collaborator')
  const [invSent,    setInvSent]    = useState(false)
  const [invSending, setInvSending] = useState(false)
  const [tab,        setTab]        = useState<'team'|'models'>('team')

  // Assignment state
  const [assigningMember, setAssigningMember] = useState<Member | null>(null)
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({})
  const [editAssignment, setEditAssignment] = useState<Assignment>({ areas: [], createTasks: true, note: '' })

  // Load assignments from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('team_assignments')
      if (raw) setAssignments(JSON.parse(raw))
    } catch {}
  }, [])

  const saveAssignments = (next: Record<string, Assignment>) => {
    setAssignments(next)
    try { localStorage.setItem('team_assignments', JSON.stringify(next)) } catch {}
  }

  useEffect(() => {
    const sb = createClient()
    sb.auth.getSession().then(async ({ data }) => {
      try {
        if (!data.session) { window.location.href = '/login'; return }
        const uid = data.session.user.id
        const { data: prof } = await sb.from('profiles').select('*').eq('id', uid).single()
        const myProf = prof as any
        setMe(myProf ?? null)
        const { data: tmRows } = await sb.from('team_members').select('member_id').eq('owner_id', uid)
        const ids = ((tmRows as any[]) ?? []).map((r: any) => r.member_id).filter(Boolean) as string[]
        if (ids.length > 0) {
          const { data: profs } = await sb.from('profiles').select('id,first_name,full_name,avatar_url,role,email').in('id', ids)
          const list: Member[] = (profs as any[]) ?? []
          if (myProf && !list.find(m => m.id === myProf.id)) list.unshift(myProf as Member)
          setMembers(list)
        } else {
          setMembers(myProf ? [myProf as Member] : [])
        }
      } catch (err) { console.error('[teams]', err) }
      finally { setLoading(false) }
    }).catch(() => setLoading(false))
  }, [])

  async function sendInvite() {
    if (!invEmail.includes('@')) return
    setInvSending(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      await fetch('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invEmail.trim().toLowerCase(),
          role: invRole,
          fromUserId: user?.id ?? null,
          fromUserEmail: user?.email ?? null,
          accessMode: 'team',
        }),
      })
      setInvSent(true); setInvEmail('')
      setTimeout(() => { setInvSent(false); setInviteOpen(false) }, 2500)
    } catch (e) { console.error(e) }
    setInvSending(false)
  }

  function openInvite(e?: React.MouseEvent) {
    e?.stopPropagation()
    setInvSent(false); setInvEmail(''); setInvRole('collaborator'); setInviteOpen(true)
  }

  function openAssign(m: Member) {
    setEditAssignment(assignments[m.id] ?? { areas: [], createTasks: true, note: '' })
    setAssigningMember(m)
  }

  function saveAssign() {
    if (!assigningMember) return
    saveAssignments({ ...assignments, [assigningMember.id]: editAssignment })
    setAssigningMember(null)
  }

  function toggleArea(id: string) {
    setEditAssignment(prev => ({
      ...prev,
      areas: prev.areas.includes(id) ? prev.areas.filter(a => a !== id) : [...prev.areas, id],
    }))
  }

  const nameOf = (m: Member) => m.first_name ?? m.full_name?.split(' ')[0] ?? 'Mitglied'
  const initOf = (m: Member) => nameOf(m).charAt(0).toUpperCase()
  const roleLabel = (r?: string) => r === 'dev' ? 'Developer' : r === 'admin' ? 'Admin' : 'Client'
  const roleColor = (r?: string) => r === 'dev' ? 'var(--green)' : r === 'admin' ? 'var(--amber)' : 'var(--text-muted)'
  const roleBg    = (r?: string) => r === 'dev' ? 'rgba(52,199,89,.12)' : r === 'admin' ? 'rgba(245,158,11,.12)' : 'var(--surface-2)'

  if (loading) return (
    <div style={{ padding: 60, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth: 1100 }}>
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes popIn    { from { opacity:0; transform:scale(.96) translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes slideIn  { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:none; } }
        .tm-card { cursor:pointer; transition:border-color .15s, background .15s; }
        .tm-card:hover { border-color:var(--border-strong) !important; }
        .sc-card { transition:border-color .15s, transform .12s; }
        .sc-card:hover { transform:translateY(-1px); border-color:var(--border-strong) !important; }
        .area-chip { transition:border-color .12s, background .12s; cursor:pointer; }
        .area-chip:hover { border-color:var(--border-strong) !important; }
        .area-chip.on { background:var(--nav-on) !important; border-color:var(--text) !important; }
        .tab-btn { padding:6px 14px; border-radius:8px; font-size:13px; font-weight:600; border:none; background:transparent; color:var(--text-muted); cursor:pointer; font-family:inherit; transition:color .12s, background .12s; }
        .tab-btn.on { background:var(--surface-2); color:var(--text); }
        .inv-overlay { position:fixed; inset:0; z-index:9000; display:flex; align-items:center; justify-content:center; padding:20px; }
        .inv-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.55); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }
        .inv-panel { position:relative; width:100%; max-width:460px; background:var(--surface); border:1px solid var(--border); border-radius:20px; box-shadow:0 32px 80px rgba(0,0,0,.28); overflow:hidden; animation:popIn .22s cubic-bezier(.16,1,.3,1) both; }
        .assign-panel { position:fixed; top:0; right:0; bottom:0; width:100%; max-width:480px; z-index:8000; background:var(--surface); border-left:1px solid var(--border); box-shadow:-24px 0 64px rgba(0,0,0,.12); animation:slideIn .2s cubic-bezier(.16,1,.3,1) both; display:flex; flex-direction:column; }
        .assign-backdrop { position:fixed; inset:0; z-index:7999; background:rgba(0,0,0,.3); backdrop-filter:blur(4px); }
      `}</style>

      {/* ── Invite Modal ── */}
      {inviteOpen && (
        <div className="inv-overlay" onClick={() => setInviteOpen(false)}>
          <div className="inv-backdrop" />
          <div className="inv-panel" onClick={e => e.stopPropagation()}>
            <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
              <div>
                <h2 style={{ margin:'0 0 3px', fontSize:17, fontWeight:700, letterSpacing:'-.3px' }}>Mitglied einladen</h2>
                <p style={{ margin:0, fontSize:12.5, color:'var(--text-muted)' }}>Zugang wird nach Prüfung freigeschaltet.</p>
              </div>
              <button onClick={() => setInviteOpen(false)} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexShrink:0 }}>
                <X size={13} weight="bold" />
              </button>
            </div>
            <div style={{ padding:'20px 24px 24px' }}>
              {invSent ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'20px 0', textAlign:'center' }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(52,199,89,.1)', border:'1px solid rgba(52,199,89,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Check size={20} weight="bold" color="var(--green)" />
                  </div>
                  <div>
                    <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>Einladung gesendet</p>
                    <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>Wir senden den Zugang direkt zu.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:6, textTransform:'uppercase' }}>E-Mail-Adresse</label>
                    <input
                      value={invEmail} onChange={e => setInvEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendInvite()}
                      type="email" placeholder="name@firma.com" autoFocus
                      style={{ width:'100%', padding:'10px 13px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, color:'var(--text)', fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', marginBottom:6, textTransform:'uppercase' }}>Rolle</label>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                      {[
                        { id:'collaborator', label:'Client', desc:'Strategische Sicht, Kommentare' },
                        { id:'dev',          label:'Developer', desc:'Execution Layer, Tasks, Code' },
                      ].map(r => (
                        <button key={r.id} onClick={() => setInvRole(r.id)}
                          style={{ padding:'10px 12px', borderRadius:10, border:`1.5px solid ${invRole===r.id?'var(--border-strong)':'var(--border)'}`, background:invRole===r.id?'var(--surface-2)':'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'border-color .12s, background .12s' }}>
                          <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:'0 0 2px' }}>{r.label}</p>
                          <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, lineHeight:1.4 }}>{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={sendInvite} disabled={!invEmail.includes('@') || invSending}
                    style={{ width:'100%', padding:'12px', background:invEmail.includes('@')?'var(--btn-prim)':'var(--surface-2)', color:invEmail.includes('@')?'var(--btn-prim-text)':'var(--text-muted)', border:'none', borderRadius:11, fontSize:13.5, fontWeight:700, cursor:invEmail.includes('@')?'pointer':'default', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'background .15s, color .15s' }}>
                    {invSending
                      ? <><span style={{ width:13, height:13, border:'2px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/>Wird gesendet…</>
                      : <><Envelope size={14} weight="bold"/>Einladung senden</>
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Task Assignment Panel ── */}
      {assigningMember && (
        <>
          <div className="assign-backdrop" onClick={() => setAssigningMember(null)} />
          <div className="assign-panel">
            {/* Header */}
            <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase', margin:'0 0 2px' }}>Aufgaben zuweisen</p>
                <h2 style={{ fontSize:17, fontWeight:700, letterSpacing:'-.3px', margin:0 }}>{nameOf(assigningMember)}</h2>
              </div>
              <button onClick={() => setAssigningMember(null)} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexShrink:0 }}>
                <X size={13} weight="bold" />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>
              {/* Member info */}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--surface-2)', borderRadius:12, border:'1px solid var(--border)' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--surface)', border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, overflow:'hidden', flexShrink:0 }}>
                  {assigningMember.avatar_url
                    ? <img src={assigningMember.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : initOf(assigningMember)
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13.5, fontWeight:700, color:'var(--text)', margin:0 }}>{nameOf(assigningMember)}</p>
                  <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'2px 0 0' }}>{assigningMember.email ?? ''}</p>
                </div>
                <span style={{ padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', background:roleBg(assigningMember.role), color:roleColor(assigningMember.role) }}>
                  {roleLabel(assigningMember.role)}
                </span>
              </div>

              {/* Task areas */}
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', textTransform:'uppercase', margin:'0 0 10px' }}>
                  Verantwortungsbereiche <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:500, letterSpacing:0, textTransform:'none' }}>— welche Bereiche kontrolliert diese Person?</span>
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                  {TASK_AREAS.map(({ id, label, desc, Icon }) => {
                    const on = editAssignment.areas.includes(id)
                    return (
                      <button key={id} className={`area-chip${on?' on':''}`} onClick={() => toggleArea(id)}
                        style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'10px 11px', borderRadius:10, border:`1.5px solid ${on?'var(--text)':'var(--border)'}`, background:on?'var(--nav-on)':'transparent', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                        <div style={{ width:24, height:24, borderRadius:7, background:on?'var(--text)':'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, transition:'background .12s' }}>
                          <Icon size={12} weight={on?'bold':'regular'} color={on?'var(--bg)':'var(--text-muted)'} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', margin:0 }}>{label}</p>
                          <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'1px 0 0', lineHeight:1.35 }}>{desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Create tasks toggle */}
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', background:'var(--surface-2)', borderRadius:12, border:'1px solid var(--border)' }}>
                <button onClick={() => setEditAssignment(p => ({ ...p, createTasks: !p.createTasks }))}
                  style={{ width:38, height:22, borderRadius:999, background:editAssignment.createTasks?'var(--text)':'var(--border)', border:'none', cursor:'pointer', position:'relative', flexShrink:0, marginTop:2, transition:'background .15s' }}>
                  <span style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background:'var(--bg)', transition:'left .15s', left:editAssignment.createTasks?19:3, display:'block' }}/>
                </button>
                <div>
                  <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', margin:0 }}>Tasks erstellen</p>
                  <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'2px 0 0', lineHeight:1.45 }}>
                    Dieses Mitglied kann in den zugewiesenen Bereichen eigenständig Tasks anlegen und verwalten.
                  </p>
                </div>
              </div>

              {/* Note */}
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:7 }}>Notiz (optional)</label>
                <textarea
                  value={editAssignment.note}
                  onChange={e => setEditAssignment(p => ({ ...p, note: e.target.value }))}
                  placeholder="z. B. Fokus auf Backend-Architektur und API-Design…"
                  rows={3}
                  style={{ width:'100%', padding:'10px 13px', background:'var(--bg)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:13, color:'var(--text)', fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', transition:'border-color .15s', lineHeight:1.5 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding:'14px 24px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
              <button onClick={() => setAssigningMember(null)} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'background .12s' }}>
                Abbrechen
              </button>
              <button onClick={saveAssign} style={{ flex:2, padding:'11px', borderRadius:10, border:'none', background:'var(--btn-prim)', color:'var(--btn-prim-text)', fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <Check size={14} weight="bold" />
                Speichern
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom:24 }}>
        <h1>Teams</h1>
        <p>Mitglieder einladen, Aufgaben zuweisen und Zugriffsrechte strukturieren.</p>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:2, marginBottom:24, padding:'3px', background:'var(--surface-2)', borderRadius:10, width:'fit-content' }}>
        {[{id:'team',label:'Team & Aufgaben'},{id:'models',label:'Team-Modelle'}].map(t => (
          <button key={t.id} className={`tab-btn${tab===t.id?' on':''}`} onClick={() => setTab(t.id as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────
          TAB 1 — TEAM & AUFGABEN
      ──────────────────────────────────────────── */}
      {tab === 'team' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14, alignItems:'start' }}>

          {/* Members grid */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ margin:0, fontSize:15, fontWeight:700, letterSpacing:'-.2px' }}>Dein Team</h3>
                <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-muted)' }}>{members.length} {members.length === 1 ? 'Mitglied' : 'Mitglieder'}</p>
              </div>
              <button onClick={() => openInvite()}
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:12.5, fontWeight:700, padding:'7px 13px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:9, cursor:'pointer', fontFamily:'inherit' }}>
                <Plus size={12} weight="bold" />
                Einladen
              </button>
            </div>

            {members.length === 0 ? (
              <div style={{ padding:'48px 24px', textAlign:'center' }}>
                <div style={{ width:48, height:48, borderRadius:14, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <Users size={22} weight="regular" color="var(--text-muted)" />
                </div>
                <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:'0 0 5px' }}>Noch keine Mitglieder</p>
                <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:'0 0 18px', lineHeight:1.5 }}>Lade Entwickler oder Kollaboratoren ein, um zu starten.</p>
                <button onClick={() => openInvite()} style={{ padding:'9px 18px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  Erstes Mitglied einladen
                </button>
              </div>
            ) : (
              <div style={{ padding:'12px' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {members.map(m => {
                    const isMe = m.id === me?.id
                    const asgn = assignments[m.id]
                    const areaCount = asgn?.areas.length ?? 0
                    return (
                      <div key={m.id} className="tm-card"
                        onClick={() => openAssign(m)}
                        style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 13px', borderRadius:11, border:'1.5px solid transparent', background:'transparent' }}>
                        <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--surface-2)', border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, overflow:'hidden', flexShrink:0 }}>
                          {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initOf(m)}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <p style={{ fontSize:13.5, fontWeight:700, color:'var(--text)', margin:0 }}>{nameOf(m)}{isMe?' (Du)':''}</p>
                            <span style={{ padding:'2px 6px', borderRadius:5, fontSize:9.5, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', background:roleBg(m.role), color:roleColor(m.role) }}>
                              {roleLabel(m.role)}
                            </span>
                          </div>
                          <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {areaCount > 0
                              ? `${areaCount} Bereich${areaCount>1?'e':''} zugewiesen${asgn?.createTasks?' · Tasks aktiv':''}`
                              : (m.email ?? 'Keine Bereiche zugewiesen')
                            }
                          </p>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {areaCount > 0 && (
                            <span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:6, background:'var(--surface-2)', color:'var(--text-secondary)' }}>
                              {areaCount} Bereiche
                            </span>
                          )}
                          <PencilSimple size={13} weight="regular" color="var(--text-muted)" />
                        </div>
                      </div>
                    )
                  })}

                  {/* Add slot */}
                  <div onClick={() => openInvite()}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 13px', borderRadius:11, border:'1.5px dashed var(--border)', cursor:'pointer', opacity:.6, transition:'opacity .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity='1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity='.6')}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Plus size={14} weight="bold" color="var(--text-muted)" />
                    </div>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', margin:0 }}>Mitglied einladen…</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            {/* Invite CTA */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
              <h3 style={{ margin:'0 0 4px', fontSize:14, fontWeight:700 }}>Team erweitern</h3>
              <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:'0 0 14px', lineHeight:1.5 }}>
                Founder, Developer oder Agency-Client einladen.
              </p>
              <button onClick={() => openInvite()}
                style={{ width:'100%', padding:'11px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:10, fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <Envelope size={14} weight="bold" />
                Einladung senden
              </button>
            </div>

            {/* How assignment works */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
              <h3 style={{ margin:'0 0 12px', fontSize:13.5, fontWeight:700 }}>Aufgaben-Zuweisung</h3>
              {[
                { Icon: ListChecks, text:'Klicke ein Mitglied an, um Verantwortungsbereiche zuzuweisen.' },
                { Icon: CheckCircle, text:'Definiere, ob das Mitglied Tasks selbst anlegen darf.' },
                { Icon: ArrowsClockwise, text:'Zuweisungen werden lokal gespeichert und bleiben erhalten.' },
              ].map(({ Icon, text }, i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width:26, height:26, borderRadius:8, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={13} weight="regular" color="var(--text-muted)" />
                  </div>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', margin:0, lineHeight:1.5, flex:1 }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Roles */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
              <h3 style={{ margin:'0 0 12px', fontSize:13.5, fontWeight:700 }}>Rollen & Zugriff</h3>
              {[
                { role:'Owner',          color:'var(--amber)', desc:'Vollzugriff: Strategie, Budget, AI' },
                { role:'Lead Developer', color:'var(--green)',  desc:'Execution Layer, Code, kein Budget' },
                { role:'Developer',      color:'var(--green)',  desc:'Tasks & Projekte — kein Strategie-Zugriff' },
                { role:'Client',         color:'var(--text-muted)', desc:'Strategische Sicht, Kommentare' },
              ].map(r => (
                <div key={r.role} style={{ padding:'7px 0', borderBottom:'1px solid var(--border)', display:'flex', gap:8, alignItems:'flex-start' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:r.color, flexShrink:0, marginTop:5 }}/>
                  <div>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', margin:0 }}>{r.role}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', margin:'1px 0 0', lineHeight:1.35 }}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────
          TAB 2 — TEAM MODELLE
      ──────────────────────────────────────────── */}
      {tab === 'models' && (
        <div>
          <div style={{ marginBottom:20, maxWidth:580 }}>
            <p style={{ fontSize:13.5, color:'var(--text-secondary)', margin:0, lineHeight:1.6 }}>
              Festag strukturiert Zusammenarbeit über kontextbasierte Team-Modelle. Wähle das Modell, das zu deiner Konstellation passt.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:10 }}>
            {SCENARIOS.map((sc, idx) => (
              <div key={sc.id} className="sc-card"
                style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'20px', display:'flex', flexDirection:'column', gap:0, position:'relative', animation:`fadeUp .3s ${idx*.06}s both` }}>
                {sc.badge && (
                  <span style={{ position:'absolute', top:14, right:14, padding:'2px 8px', borderRadius:999, background:'var(--surface-2)', color:'var(--text-muted)', fontSize:9, fontWeight:700, letterSpacing:'.1em' }}>
                    {sc.badge}
                  </span>
                )}
                <div style={{ width:36, height:36, borderRadius:10, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, flexShrink:0 }}>
                  <sc.Icon size={17} weight="regular" color="var(--text-secondary)" />
                </div>
                <p style={{ fontSize:9.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 3px' }}>{sc.eyebrow}</p>
                <h3 style={{ fontSize:16, fontWeight:700, margin:'0 0 2px', letterSpacing:'-.3px' }}>{sc.title}</h3>
                <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'0 0 10px', fontWeight:500 }}>{sc.subtitle}</p>
                <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:'0 0 14px', lineHeight:1.55, flex:1 }}>{sc.desc}</p>

                <div style={{ marginBottom:14, display:'flex', flexDirection:'column', gap:1 }}>
                  {sc.access.map(a => (
                    <div key={a} style={{ display:'flex', alignItems:'center', gap:7, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                      <Eye size={11} weight="regular" color="var(--green)" />
                      <span style={{ fontSize:11.5, color:'var(--text-secondary)' }}>{a}</span>
                    </div>
                  ))}
                  {sc.denied.map(d => (
                    <div key={d} style={{ display:'flex', alignItems:'center', gap:7, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                      <EyeSlash size={11} weight="regular" color="var(--text-muted)" />
                      <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>{d}</span>
                    </div>
                  ))}
                </div>

                {sc.mailto ? (
                  <a href={sc.mailto}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 14px', background:'var(--surface-2)', color:'var(--text)', borderRadius:10, fontSize:12.5, fontWeight:700, textDecoration:'none', border:'1px solid var(--border)', transition:'background .12s' }}>
                    {sc.cta} <CaretRight size={11} weight="bold" />
                  </a>
                ) : (
                  <button onClick={() => openInvite()}
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'9px 14px', background:'var(--surface-2)', color:'var(--text)', borderRadius:10, fontSize:12.5, fontWeight:700, textAlign:'center', border:'1px solid var(--border)', cursor:'pointer', fontFamily:'inherit', transition:'background .12s' }}>
                    {sc.cta} <CaretRight size={11} weight="bold" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Architecture note */}
          <div style={{ marginTop:16, padding:'14px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <ArrowsClockwise size={14} weight="regular" color="var(--text-muted)" />
            </div>
            <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:0, lineHeight:1.6 }}>
              <strong style={{ color:'var(--text)' }}>Team → Projekte → User</strong> — nicht User → Projekte.
              Agenturen verwalten mehrere Teams, nicht mehrere Projekte. AI hält pro Team einen eigenständigen Kontext.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
