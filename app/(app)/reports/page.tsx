'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ChatMarkdown from '@/components/ChatMarkdown'
import { projectColor } from '@/components/Sidebar'

type Project = { id: string; title: string; status: string; description?: string }
type Report  = { id: string; project_id: string; content: string; created_at: string; type?: string }

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [reports,  setReports]  = useState<Report[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [emailing, setEmailing] = useState<string|null>(null)
  const [extracting, setExtracting] = useState<string|null>(null)
  const [extractedTasks, setExtractedTasks] = useState<Record<string, any[]>>({})
  const supabase = createClient()

  async function extractTasks(r: Report) {
    setExtracting(r.id)
    try {
      const res = await fetch('/api/ai/report-to-tasks', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ reportId: r.id, projectId: r.project_id, content: r.content, autoInsert: false }),
      })
      const d = await res.json()
      if (d.tasks) setExtractedTasks(prev => ({ ...prev, [r.id]: d.tasks }))
      else alert(d.error ?? 'Tagro konnte keine Tasks extrahieren.')
    } catch { alert('Verbindungsfehler.') }
    setExtracting(null)
  }

  async function commitTasks(r: Report, tasks: any[]) {
    const ok = tasks.filter(t => t._selected !== false)
    if (!ok.length) { alert('Wähle mindestens einen Task aus.'); return }
    for (const t of ok) {
      await supabase.from('tasks').insert({
        project_id: r.project_id,
        title: t.title,
        description: t.description ?? null,
        status: 'todo',
        priority: t.priority ?? 'medium',
      }).catch(() => {})
    }
    setExtractedTasks(prev => { const n = { ...prev }; delete n[r.id]; return n })
    alert(`✓ ${ok.length} Tasks angelegt.`)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const [{ data: ps }, { data: rs }] = await Promise.all([
        supabase.from('projects').select('id,title,status,description').order('created_at',{ascending:false}),
        supabase.from('ai_updates').select('*').order('created_at',{ascending:false}).limit(50),
      ])
      const projs = (ps as any[]) ?? []
      setProjects(projs)
      setReports((rs as any[]) ?? [])
      if (projs.length === 1) setSelectedProjectId(projs[0].id)
      setLoading(false)
    })
  }, [])

  const visibleProject = projects.find(p => p.id === selectedProjectId) ?? null
  const visibleReports = selectedProjectId
    ? reports.filter(r => r.project_id === selectedProjectId)
    : reports

  async function generateReport(p: Project) {
    setGenerating(true)
    try {
      const { data: tasks } = await supabase.from('tasks').select('*').eq('project_id', p.id)
      const ts = (tasks as any[]) ?? []
      const done = ts.filter(t => t.status === 'done').length
      const doing = ts.filter(t => t.status === 'doing').length
      const todo = ts.filter(t => t.status === 'todo').length
      const pct = ts.length ? Math.round(done / ts.length * 100) : 0

      const userPrompt = `Projekt: "${p.title}"\n` +
        (p.description ? `Beschreibung: ${p.description}\n` : '') +
        `Phase: ${p.status}\nFortschritt: ${pct}% (${done}/${ts.length} done, ${doing} aktiv, ${todo} offen)\n` +
        (ts.length ? `\nTasks:\n${ts.slice(0,15).map(t => `- [${t.status}] ${t.title}`).join('\n')}` : '') +
        `\n\nErstelle einen professionellen Statusbericht mit Markdown.`

      const res = await fetch('/api/ai/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          max_tokens: 600,
          system: `Du bist Tagro, AI-Projektmanager von Festag. Erstelle einen professionellen Statusbericht auf Deutsch mit Markdown.\nStruktur:\n**Erledigt:** ...\n**In Arbeit:** ...\n**Nächste Schritte:** ...\n**Risiken:** (nur wenn relevant)\n\nKeine Emojis. Knapp und konkret.`,
          messages: [{ role:'user', content: userPrompt }],
        }),
      })
      const data = await res.json()
      const content = data.content?.[0]?.text
      if (!content) { alert('Tagro hat nicht geantwortet.'); setGenerating(false); return }

      const { data: ins, error } = await supabase.from('ai_updates').insert({ project_id: p.id, content, type:'status_report' }).select().single()
      if (error) { alert(`Speicherfehler: ${error.message}`); setGenerating(false); return }
      if (ins) setReports(prev => [ins as any, ...prev])
    } catch (e: any) { alert(`Fehler: ${e?.message ?? 'unbekannt'}`) }
    setGenerating(false)
  }

  async function emailReport(r: Report) {
    setEmailing(r.id)
    // Best-effort: queue an email via api route (placeholder: just mailto on the client for now)
    const proj = projects.find(p => p.id === r.project_id)
    const subject = `Festag Statusbericht — ${proj?.title ?? 'Projekt'}`
    const body = encodeURIComponent(r.content)
    setTimeout(() => {
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`
      setEmailing(null)
    }, 200)
  }

  function downloadPdf(r: Report) {
    // Lightweight: print-to-PDF approach via a hidden iframe
    const proj = projects.find(p => p.id === r.project_id)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!doctype html><html><head><title>${proj?.title ?? 'Bericht'} — Festag</title>
      <style>body{font-family:'Inter',-apple-system,sans-serif;max-width:680px;margin:48px auto;padding:0 24px;color:#0f172a;line-height:1.65;} h1{font-size:22px;letter-spacing:-.4px;margin:0 0 4px;} .muted{color:#64748b;font-size:13px;margin:0 0 28px;} .badge{display:inline-block;padding:3px 9px;background:#f1f5f9;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.07em;} pre{white-space:pre-wrap;}</style>
      </head><body>
      <span class="badge">FESTAG · STATUSBERICHT</span>
      <h1 style="margin-top:14px;">${proj?.title ?? 'Projekt'}</h1>
      <p class="muted">${new Date(r.created_at).toLocaleString('de')}</p>
      <pre>${r.content.replace(/</g,'&lt;')}</pre>
      </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  if (loading) return (
    <div style={{ padding:60, display:'flex', justifyContent:'center' }}>
      <div style={{ width:24, height:24, border:'2px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
    </div>
  )

  // Single project shortcut: skip selector
  const singleProject = projects.length === 1
  const showProject = singleProject ? projects[0] : visibleProject

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth: undefined }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        .rp-card { transition: transform .15s, border-color .15s; }
        .rp-card:hover { transform: translateY(-1px); border-color: var(--border-strong); }
      `}</style>

      <div className="page-header">
        <h1 style={{ margin:'0 0 6px' }}>Statusberichte</h1>
        <p>AI-generierte Updates zu deinen Projekten — als Mail versenden, PDF downloaden oder im Team teilen.</p>
      </div>

      {/* Project selector if more than 1 */}
      {!singleProject && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18 }}>
          <button onClick={() => setSelectedProjectId(null)} className="rp-card"
            style={{ padding:'8px 14px', borderRadius:11, border:`1.5px solid ${selectedProjectId===null?'var(--text)':'var(--border)'}`, background:selectedProjectId===null?'var(--text)':'var(--card)', color:selectedProjectId===null?'var(--bg)':'var(--text)', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Alle Projekte ({reports.length})
          </button>
          {projects.map(p => {
            const c = projectColor(p.id)
            const on = p.id === selectedProjectId
            const cnt = reports.filter(r => r.project_id === p.id).length
            return (
              <button key={p.id} onClick={() => setSelectedProjectId(p.id)} className="rp-card"
                style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:11, border:`1.5px solid ${on?c:'var(--border)'}`, background:on?`${c}15`:'var(--card)', color:on?c:'var(--text)', fontSize:12.5, fontWeight:on?700:600, cursor:'pointer', fontFamily:'inherit' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:c }}/>
                {p.title}
                <span style={{ fontSize:10, opacity:.6, fontWeight:600 }}>({cnt})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Generate report bar */}
      {showProject && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', margin:'0 0 2px' }}>BERICHT FÜR</p>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>
              <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:projectColor(showProject.id), marginRight:7, verticalAlign:'middle' }}/>
              {showProject.title}
            </p>
          </div>
          <button onClick={() => generateReport(showProject)} disabled={generating}
            style={{ padding:'10px 16px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:7, opacity: generating?.7:1 }}>
            {generating ? (
              <><span style={{ width:12, height:12, border:'2px solid currentColor', borderRightColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Generiert…</>
            ) : <>Neuen Bericht erstellen</>}
          </button>
        </div>
      )}

      {/* Report list */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {visibleReports.length === 0 ? (
          <div style={{ padding:'42px 22px', background:'var(--surface)', border:'1px dashed var(--border)', borderRadius:'var(--r-lg)', textAlign:'center' }}>
            <div style={{ width:46, height:46, borderRadius:14, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', color:'var(--text-secondary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>
            </div>
            <p style={{ fontSize:14.5, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>Noch keine Berichte</p>
            <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>Klicke auf "Neuen Bericht erstellen", um Tagro einen Status zusammenfassen zu lassen.</p>
          </div>
        ) : visibleReports.map(r => {
          const proj = projects.find(p => p.id === r.project_id)
          const c = proj ? projectColor(proj.id) : 'var(--text-muted)'
          return (
            <div key={r.id} className="rp-card" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
              <div style={{ height:3, background:c }}/>
              <div style={{ padding:'14px 18px 6px', display:'flex', alignItems:'center', gap:9, flexWrap:'wrap', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                  <span style={{ width:24, height:24, borderRadius:7, background:`${c}20`, color:c, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>
                  </span>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:13.5, fontWeight:700, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{proj?.title ?? 'Projekt'}</p>
                    <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'1px 0 0', letterSpacing:'.05em' }}>
                      {new Date(r.created_at).toLocaleString('de',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <button onClick={() => emailReport(r)} disabled={emailing===r.id} style={{ padding:'6px 11px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:9, fontSize:11.5, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>Mail</button>
                  <button onClick={() => downloadPdf(r)} style={{ padding:'6px 11px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:9, fontSize:11.5, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>PDF</button>
                  <button onClick={() => extractTasks(r)} disabled={extracting === r.id}
                    title="Tagro analysiert den Bericht und schlägt konkrete Tasks vor"
                    style={{ padding:'6px 11px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:9, fontSize:11.5, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
                    {extracting === r.id ? '…' : 'Tasks erstellen'}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(r.content); }} title="Inhalt kopiert"
                    style={{ padding:'6px 11px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:9, fontSize:11.5, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>Teilen</button>
                  <Link href={`/project/${r.project_id}`} style={{ padding:'6px 11px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', borderRadius:9, fontSize:11.5, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center' }}>
                    Öffnen
                  </Link>
                </div>
              </div>
              <div style={{ padding:'8px 18px 16px', fontSize:13.5, color:'var(--text-secondary)', lineHeight:1.65 }}>
                <ChatMarkdown text={r.content}/>
              </div>

              {/* AI-extracted tasks preview */}
              {extractedTasks[r.id] && (
                <div style={{ borderTop:'1px solid var(--border)', padding:'14px 18px', background:'var(--surface-2)' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', margin:'0 0 10px' }}>TAGRO HAT {extractedTasks[r.id].length} TASKS VORGESCHLAGEN</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:10 }}>
                    {extractedTasks[r.id].map((t, i) => (
                      <label key={i} style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'9px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, cursor:'pointer' }}>
                        <input type="checkbox" defaultChecked
                          onChange={e => { extractedTasks[r.id][i]._selected = e.target.checked }}
                          style={{ marginTop:3 }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 2px' }}>{t.title}</p>
                          {t.description && <p style={{ fontSize:11.5, color:'var(--text-secondary)', margin:0, lineHeight:1.45 }}>{t.description}</p>}
                        </div>
                        <span style={{ flexShrink:0, fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:5, background: t.priority==='critical'?'rgba(239,68,68,.12)':t.priority==='high'?'rgba(249,115,22,.12)':t.priority==='low'?'rgba(34,197,94,.12)':'rgba(245,158,11,.12)', color: t.priority==='critical'?'#ef4444':t.priority==='high'?'#f97316':t.priority==='low'?'#22c55e':'#f59e0b', letterSpacing:'.05em' }}>
                          {(t.priority ?? 'medium').toUpperCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => commitTasks(r, extractedTasks[r.id])}
                      style={{ padding:'9px 14px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:10, fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      Tasks anlegen
                    </button>
                    <button onClick={() => setExtractedTasks(prev => { const n = { ...prev }; delete n[r.id]; return n })}
                      style={{ padding:'9px 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:10, fontSize:12.5, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit' }}>
                      Verwerfen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
