'use client'

/**
 * /dev/console — Tagro Composer (Dev Console).
 *
 * The composer is the heart: a calm hero question, a big "Schreib mit Tagro …"
 * input, suggestion chips, and a grey client-asset tray. The dev writes freely;
 * Tagro decomposes the message into typed, client-translated items shown as a
 * preview; the dev sends them (per-item toggle) to the right client surfaces.
 * Left rail = saved chat history (new chat / load). Ledger tab = what was sent.
 *
 * Backend: /api/dev/console (compose), /console/dispatch, /console/attach,
 * /console/threads, /console/thread/[id], /console/hints.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowUp, Plus, ChatCircleText, Scissors, ListChecks, CheckCircle, Paperclip,
  Pulse, Clock, WarningCircle, Sparkle, X, ArrowsClockwise, PaperPlaneTilt,
} from '@phosphor-icons/react'

type ProjectLite = { id: string; title: string; color?: string | null }
type Thread = { id: string; title: string | null; unread_count: number; pinned: boolean; last_item_at: string | null }
type Hint = { id: string; label: string; prefill?: string; action?: string; count?: number; tone: string }
type RelayItem = {
  relay_kind: 'status_update' | 'decision' | 'client_task' | 'client_message' | 'internal_note'
  internal_text: string
  client_text: string | null
  decision?: { question: string; options?: string[] }
  task?: { title: string; client_description: string }
  confidence: number
}
type RelayPlan = { items: RelayItem[]; summary: string; model: string }
type Dispatch = { id: string; relay_kind: string; client_text: string | null; dispatched_at: string | null; created_at: string }
type TranscriptItem = { id: string; body: string | null; actor_id: string | null; type: string; created_at: string }
type StagedAsset = { assetId: string; title: string; kind: string }
type PickAsset = { id: string; title: string | null; kind: string; external_url?: string | null }

const KIND_META: Record<RelayItem['relay_kind'], { label: string; icon: any; tone: string }> = {
  status_update:  { label: 'Status', icon: Pulse, tone: 'info' },
  decision:       { label: 'Entscheidung', icon: Scissors, tone: 'warn' },
  client_task:    { label: 'Aufgabe', icon: ListChecks, tone: 'info' },
  client_message: { label: 'Nachricht', icon: ChatCircleText, tone: 'neutral' },
  internal_note:  { label: 'Intern', icon: WarningCircle, tone: 'muted' },
}

export default function DevConsolePage() {
  const supabase = useMemo(() => createClient(), [])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [hints, setHints] = useState<Hint[]>([])
  const [text, setText] = useState('')
  const [messageItemId, setMessageItemId] = useState<string | null>(null)
  const [plan, setPlan] = useState<RelayPlan | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState<'compose' | 'ledger'>('compose')
  const [ledger, setLedger] = useState<Dispatch[]>([])
  const [sentNote, setSentNote] = useState<string>('')
  const [transcript, setTranscript] = useState<TranscriptItem[]>([])
  // Client asset tray — staged before send, bound to the message on /console.
  const [staged, setStaged] = useState<StagedAsset[]>([])
  const [attachOpen, setAttachOpen] = useState(false)
  const [picker, setPicker] = useState<PickAsset[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const project = projects.find((p) => p.id === projectId)

  // Load the dev's projects (owner or assigned).
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await (supabase as any)
        .from('projects').select('id, title, color')
        .or(`assigned_dev.eq.${user.id},user_id.eq.${user.id}`)
        .order('updated_at', { ascending: false }).limit(50)
      const ps = (data ?? []) as ProjectLite[]
      setProjects(ps)
      if (ps.length && !projectId) setProjectId(ps[0].id)
    })()
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadThreads = useCallback(async (pid: string) => {
    const r = await fetch(`/api/dev/console/threads?projectId=${pid}`).then((x) => x.json()).catch(() => ({}))
    setThreads(r.threads ?? [])
  }, [])

  const loadHints = useCallback(async (pid: string) => {
    const r = await fetch(`/api/dev/console/hints?projectId=${pid}`).then((x) => x.json()).catch(() => ({}))
    setHints(r.hints ?? [])
  }, [])

  const loadLedger = useCallback(async (pid: string) => {
    const { data } = await (supabase as any)
      .from('dev_relay_dispatches').select('id, relay_kind, client_text, dispatched_at, created_at')
      .eq('project_id', pid).order('created_at', { ascending: false }).limit(50)
    setLedger((data ?? []) as Dispatch[])
  }, [supabase])

  useEffect(() => {
    if (!projectId) return
    loadThreads(projectId); loadHints(projectId); loadLedger(projectId)
  }, [projectId, loadThreads, loadHints, loadLedger])

  function startNewChat() {
    setActiveThreadId(null); setPlan(null); setMessageItemId(null); setText(''); setSentNote(''); setTranscript([]); setStaged([])
  }

  const openThread = useCallback(async (id: string) => {
    setActiveThreadId(id); setPlan(null); setMessageItemId(null); setSentNote(''); setTab('compose')
    const r = await fetch(`/api/dev/console/thread/${id}`).then((x) => x.json()).catch(() => ({}))
    if (r.thread?.project_id) setProjectId(r.thread.project_id)
    setTranscript((r.items ?? []) as TranscriptItem[])
  }, [])

  // Open a specific chat when arrived via the global Dev sidebar history
  // (/dev/console?thread=<id>). Read from the URL to avoid a Suspense boundary.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tid = params.get('thread')
    if (tid) openThread(tid)
  }, [openThread])

  async function send() {
    if (!text.trim() || !projectId || busy) return
    setBusy(true); setPlan(null); setSentNote('')
    try {
      const r = await fetch('/api/dev/console', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, text: text.trim(), threadId: activeThreadId, newThread: !activeThreadId,
          assetIds: staged.map((s) => s.assetId),
        }),
      }).then((x) => x.json())
      if (r.error) { setSentNote(`Fehler: ${r.error}`); return }
      setActiveThreadId(r.threadId)
      setMessageItemId(r.messageItemId)
      setPlan(r.plan)
      // preselect everything that isn't internal
      const sel = new Set<number>()
      ;(r.plan?.items ?? []).forEach((it: RelayItem, i: number) => { if (it.relay_kind !== 'internal_note') sel.add(i) })
      setSelected(sel)
      loadThreads(projectId)
    } finally { setBusy(false) }
  }

  // ── Client asset tray ──────────────────────────────────────────────────────
  async function uploadFile(file: File) {
    if (!projectId) return
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'bin'
    const { data: row } = await (supabase as any).from('project_assets').insert({
      project_id: projectId, uploaded_by: user.id, title: file.name.slice(0, 200),
      kind: file.type.startsWith('image/') ? 'image' : 'file', category: 'client_files',
      visibility: 'team_only', mime_type: file.type || null, size_bytes: file.size,
    }).select('id, kind, title').single()
    if (!row) return
    const path = `${projectId}/${row.id}.${ext}`
    const { error } = await supabase.storage.from('project-assets').upload(path, file, { contentType: file.type || undefined, upsert: true })
    if (error) { await (supabase as any).from('project_assets').delete().eq('id', row.id); setSentNote(`Upload fehlgeschlagen: ${error.message}`); return }
    await (supabase as any).from('project_assets').update({ storage_path: path }).eq('id', row.id)
    setStaged((p) => [...p, { assetId: row.id, title: row.title || file.name, kind: row.kind || 'file' }])
  }

  async function attachLink() {
    setAttachOpen(false)
    const url = window.prompt('Link einfügen (Figma, Loom, Drive, GitHub-PR …)')
    if (!url?.trim()) return
    const r = await fetch('/api/dev/console/asset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, url: url.trim() }),
    }).then((x) => x.json()).catch(() => ({}))
    if (r.asset) setStaged((p) => [...p, { assetId: r.asset.id, title: r.asset.title || url.trim(), kind: r.asset.kind || 'link' }])
  }

  async function openPicker() {
    setAttachOpen(false)
    const r = await fetch(`/api/dev/console/asset?projectId=${projectId}`).then((x) => x.json()).catch(() => ({}))
    setPicker(r.assets ?? [])
  }

  function pickAsset(a: PickAsset) {
    setStaged((p) => p.some((s) => s.assetId === a.id) ? p : [...p, { assetId: a.id, title: a.title || 'Asset', kind: a.kind || 'file' }])
    setPicker(null)
  }

  const removeStaged = (id: string) => setStaged((p) => p.filter((s) => s.assetId !== id))

  async function dispatch() {
    if (!messageItemId || sending) return
    setSending(true)
    try {
      const r = await fetch('/api/dev/console/dispatch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageItemId, selectedIndexes: Array.from(selected) }),
      }).then((x) => x.json())
      if (r.error) { setSentNote(`Fehler: ${r.error}`); return }
      const n = (r.dispatched ?? []).filter((d: any) => !d.skipped).length
      setSentNote(`${n} Punkt${n === 1 ? '' : 'e'} an den Kunden gesendet.`)
      setPlan(null); setMessageItemId(null); setText(''); setStaged([])
      loadLedger(projectId); loadThreads(projectId)
    } finally { setSending(false) }
  }

  function toggle(i: number) {
    setSelected((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  const heroQuestion = project
    ? `Wie weit bist du bei ${project.title} — was soll ich dem Kunden ausrichten?`
    : 'Was soll ich dem Kunden ausrichten?'

  return (
    <div className="tc-wrap">
      <style jsx>{CSS}</style>

      {/* Left rail: chat history */}
      <aside className="tc-rail">
        <button className="tc-newchat" type="button" onClick={startNewChat}>
          <Plus size={14} weight="bold" /> Neuer Chat
        </button>
        <div className="tc-rail-section">Zuletzt verwendet</div>
        <div className="tc-threads">
          {threads.length === 0 && <p className="tc-rail-empty">Noch keine Gespräche.</p>}
          {threads.map((t) => (
            <button key={t.id} type="button"
              className={`tc-thread${activeThreadId === t.id ? ' on' : ''}`}
              onClick={() => openThread(t.id)}>
              <span className="tc-thread-title">{t.title || 'Gespräch'}</span>
              {t.unread_count > 0 && <span className="tc-thread-dot" />}
            </button>
          ))}
        </div>
      </aside>

      {/* Center */}
      <main className="tc-main">
        <div className="tc-topbar">
          <div className="tc-tabs">
            <button className={tab === 'compose' ? 'on' : ''} onClick={() => setTab('compose')} type="button">Composer</button>
            <button className={tab === 'ledger' ? 'on' : ''} onClick={() => setTab('ledger')} type="button">
              Bereits an Kunde gesendet
            </button>
          </div>
          <select className="tc-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>

        {tab === 'compose' && (
          <div className="tc-center">
            {transcript.length === 0 && <h1 className="tc-hero">{heroQuestion}</h1>}

            {transcript.length > 0 && (
              <div className="tc-transcript">
                {transcript.map((m) => (
                  <div key={m.id} className={`tc-bubble ${m.actor_id ? 'dev' : 'tagro'}`}>
                    {m.body}
                  </div>
                ))}
              </div>
            )}

            <div className="tc-composer">
              <textarea
                className="tc-input"
                placeholder="Schreib mit Tagro …"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
              />
              <div className="tc-composer-bar">
                <div className="tc-attach-wrap">
                  <button className="tc-icon" type="button" title="Anhang" onClick={() => setAttachOpen((v) => !v)}>
                    <Paperclip size={15} />
                  </button>
                  {attachOpen && (
                    <div className="tc-attach-menu" role="menu">
                      <button type="button" onClick={() => { setAttachOpen(false); fileRef.current?.click() }}>Datei / Bild</button>
                      <button type="button" onClick={attachLink}>Link (Figma, Loom, Drive, PR)</button>
                      <button type="button" onClick={openPicker}>Aus Projekt wählen</button>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.currentTarget.value = '' }} />
                <span className="tc-recipient">An: Kunde</span>
                <div className="tc-spacer" />
                {project && <span className="tc-pill-ctx">{project.title}</span>}
                <button className="tc-send" type="button" onClick={send} disabled={busy || !text.trim()}>
                  {busy ? <ArrowsClockwise size={15} className="tc-spin" /> : <ArrowUp size={15} weight="bold" />}
                </button>
              </div>
            </div>

            {/* Hints */}
            {!plan && (
              <div className="tc-hints">
                {hints.map((h) => (
                  <button key={h.id} type="button" className={`tc-hint tone-${h.tone}`}
                    onClick={() => h.action === 'open_decisions' ? (window.location.href = '/decisions') : setText(h.prefill || h.label)}>
                    {h.label}{typeof h.count === 'number' && h.count > 0 ? ` (${h.count})` : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Client asset tray */}
            {!plan && (
              <div className="tc-tray">
                <p className="tc-tray-label">Für den Kunden — Dokumente, Bilder & Links, die er bekommen soll</p>
                {staged.length === 0 ? (
                  <p className="tc-tray-hint">
                    Hänge Assets über <Paperclip size={11} /> an; sie werden mit dem passenden Punkt an den Kunden gesendet.
                  </p>
                ) : (
                  <div className="tc-staged">
                    {staged.map((s) => (
                      <span key={s.assetId} className="tc-chip" title={s.title}>
                        <Paperclip size={11} /> {s.title.slice(0, 28)}
                        <button type="button" className="tc-chip-x" onClick={() => removeStaged(s.assetId)} aria-label="Entfernen"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {sentNote && <p className="tc-sent"><CheckCircle size={13} weight="fill" /> {sentNote}</p>}

            {/* Relay preview */}
            {plan && (
              <div className="tc-preview">
                <div className="tc-preview-head">
                  <span><Sparkle size={13} weight="fill" /> Tagro hat {plan.items.length} Punkt{plan.items.length === 1 ? '' : 'e'} erkannt</span>
                  <button className="tc-sendall" type="button" onClick={dispatch} disabled={sending || selected.size === 0}>
                    <PaperPlaneTilt size={13} weight="fill" /> {sending ? 'Sende…' : `${selected.size} senden`}
                  </button>
                </div>
                {plan.items.map((it, i) => {
                  const m = KIND_META[it.relay_kind]
                  const isInternal = it.relay_kind === 'internal_note'
                  return (
                    <div key={i} className={`tc-card${selected.has(i) ? ' on' : ''}`}>
                      <div className="tc-card-top">
                        <span className={`tc-badge tone-${m.tone}`}><m.icon size={11} weight="fill" /> {m.label}</span>
                        {!isInternal && (
                          <label className="tc-toggle">
                            <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
                            an Kunde senden
                          </label>
                        )}
                      </div>
                      <p className="tc-card-client">{isInternal ? it.internal_text : (it.client_text || it.internal_text)}</p>
                      {it.decision?.options && it.decision.options.length > 0 && (
                        <div className="tc-opts">{it.decision.options.map((o, k) => <span key={k} className="tc-opt">{o}</span>)}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'ledger' && (
          <div className="tc-ledger">
            <h2 className="tc-ledger-h">Bereits an den Kunden gesendet</h2>
            {ledger.length === 0 && <p className="tc-rail-empty">Noch nichts gesendet.</p>}
            {ledger.map((d) => (
              <div key={d.id} className="tc-ledger-row">
                <span className={`tc-badge tone-${KIND_META[d.relay_kind as RelayItem['relay_kind']]?.tone || 'muted'}`}>
                  {KIND_META[d.relay_kind as RelayItem['relay_kind']]?.label || d.relay_kind}
                </span>
                <span className="tc-ledger-text">{d.client_text || '—'}</span>
                <span className="tc-ledger-time">
                  {d.dispatched_at ? <><CheckCircle size={11} weight="fill" /> {new Date(d.dispatched_at).toLocaleString('de-DE')}</> : 'Entwurf'}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {picker !== null && (
        <div className="tc-picker-overlay" onClick={() => setPicker(null)}>
          <div className="tc-picker" onClick={(e) => e.stopPropagation()}>
            <div className="tc-picker-head">
              <span>Asset aus Projekt wählen</span>
              <button type="button" onClick={() => setPicker(null)} aria-label="Schließen"><X size={14} /></button>
            </div>
            {picker.length === 0 && <p className="tc-rail-empty">Noch keine Assets im Projekt.</p>}
            {picker.map((a) => (
              <button key={a.id} type="button" className="tc-picker-row" onClick={() => pickAsset(a)}>
                <Paperclip size={12} />
                <span className="tc-picker-title">{a.title || 'Asset'}</span>
                <span className="tc-picker-kind">{a.kind}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const CSS = `
  .tc-wrap { display:grid; grid-template-columns:230px 1fr; gap:0; height:100%; min-height:calc(100vh - 56px); }
  .tc-rail { border-right:1px solid var(--border, #ECECEE); padding:16px 12px; display:flex; flex-direction:column; gap:6px; }
  .tc-newchat { display:flex; align-items:center; gap:7px; width:100%; padding:9px 12px; border-radius:10px;
    border:1px solid var(--border,#ECECEE); background:transparent; font-size:13px; font-weight:500; cursor:pointer; color:var(--text); }
  .tc-newchat:hover { background:var(--surface-2,#F6F6F7); }
  .tc-attach-wrap { position:relative; display:inline-flex; }
  .tc-attach-menu { position:absolute; bottom:32px; left:0; z-index:20; min-width:210px;
    background:var(--surface,#fff); border:1px solid var(--border,#ECECEE); border-radius:12px;
    box-shadow:0 8px 30px rgba(0,0,0,.10); padding:5px; display:flex; flex-direction:column; }
  .tc-attach-menu button { text-align:left; padding:8px 10px; border:0; background:transparent; border-radius:8px;
    font-size:12.5px; color:var(--text); cursor:pointer; }
  .tc-attach-menu button:hover { background:var(--surface-2,#F6F6F7); }
  .tc-staged { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .tc-chip { display:inline-flex; align-items:center; gap:5px; padding:4px 7px; border-radius:8px;
    background:var(--surface,#fff); border:1px solid var(--border,#ECECEE); font-size:11.5px; color:var(--text); }
  .tc-chip-x { display:inline-flex; border:0; background:transparent; cursor:pointer; color:var(--text-muted); padding:0; }
  .tc-chip-x:hover { color:var(--text); }
  .tc-picker-overlay { position:fixed; inset:0; background:rgba(0,0,0,.32); z-index:60; display:flex; align-items:center; justify-content:center; }
  .tc-picker { width:min(440px,92vw); max-height:70vh; overflow:auto; background:var(--surface,#fff);
    border:1px solid var(--border,#ECECEE); border-radius:16px; box-shadow:0 12px 40px rgba(0,0,0,.18); padding:8px; }
  .tc-picker-head { display:flex; align-items:center; justify-content:space-between; padding:8px 10px 10px; font-size:13px; font-weight:500; }
  .tc-picker-head button { border:0; background:transparent; cursor:pointer; color:var(--text-muted); }
  .tc-picker-row { display:flex; align-items:center; gap:8px; width:100%; padding:9px 10px; border:0; background:transparent;
    border-radius:9px; cursor:pointer; font-size:12.5px; color:var(--text); text-align:left; }
  .tc-picker-row:hover { background:var(--surface-2,#F6F6F7); }
  .tc-picker-title { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tc-picker-kind { font-size:11px; color:var(--text-muted); }
  .tc-rail-section { font-size:11px; letter-spacing:.02em; color:var(--text-muted,#8A8F98); margin:14px 4px 4px; }
  .tc-threads { display:flex; flex-direction:column; gap:1px; overflow-y:auto; }
  .tc-rail-empty { font-size:12.5px; color:var(--text-muted,#8A8F98); padding:6px 4px; }
  .tc-thread { display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:8px 10px; border:0;
    background:transparent; border-radius:8px; cursor:pointer; font-size:13px; color:var(--text); }
  .tc-thread:hover { background:var(--surface-2,#F6F6F7); }
  .tc-thread.on { background:var(--surface-2,#F1F1F3); }
  .tc-thread-title { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tc-thread-dot { width:6px; height:6px; border-radius:50%; background:#5B647D; flex:none; }

  .tc-main { display:flex; flex-direction:column; min-width:0; }
  .tc-topbar { display:flex; align-items:center; justify-content:space-between; padding:14px 24px; border-bottom:1px solid var(--border,#ECECEE); }
  .tc-tabs { display:flex; gap:4px; }
  .tc-tabs button { border:0; background:transparent; padding:6px 12px; border-radius:8px; font-size:13px; color:var(--text-muted,#8A8F98); cursor:pointer; }
  .tc-tabs button.on { background:var(--surface-2,#F6F6F7); color:var(--text); font-weight:500; }
  .tc-project { border:1px solid var(--border,#ECECEE); border-radius:8px; padding:6px 10px; font-size:13px; background:transparent; color:var(--text); }

  .tc-center { flex:1; max-width:760px; width:100%; margin:0 auto; padding:48px 24px 64px; }
  .tc-hero { font-size:30px; font-weight:500; letter-spacing:-.01em; text-align:center; color:var(--text); margin:0 0 28px; line-height:1.25; }
  .tc-transcript { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
  .tc-bubble { max-width:80%; padding:9px 13px; border-radius:14px; font-size:13.5px; line-height:1.5; white-space:pre-wrap; }
  .tc-bubble.dev { align-self:flex-end; background:#5B647D; color:#fff; border-bottom-right-radius:5px; }
  .tc-bubble.tagro { align-self:flex-start; background:var(--surface-2,#F1F1F3); color:var(--text); border-bottom-left-radius:5px; }
  .tc-composer { border:1px solid var(--border,#E4E4E7); border-radius:20px; background:var(--surface,#fff);
    box-shadow:0 8px 30px rgba(0,0,0,0.08); padding:14px 16px 10px; }
  .tc-input { width:100%; border:0; outline:0; resize:none; font-size:15px; line-height:1.5; background:transparent; color:var(--text); font-family:inherit; }
  .tc-composer-bar { display:flex; align-items:center; gap:10px; margin-top:8px; }
  .tc-icon { border:0; background:transparent; color:var(--text-muted,#8A8F98); cursor:pointer; display:flex; padding:4px; }
  .tc-recipient { font-size:12.5px; color:var(--text-muted,#8A8F98); border:1px solid var(--border,#ECECEE); border-radius:20px; padding:4px 10px; }
  .tc-spacer { flex:1; }
  .tc-pill-ctx { font-size:12px; color:var(--text-muted,#8A8F98); }
  .tc-send { width:32px; height:32px; border-radius:50%; border:0; background:#5B647D; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .tc-send:disabled { opacity:.4; cursor:default; }
  .tc-spin { animation:tcspin 1s linear infinite; }
  @keyframes tcspin { to { transform:rotate(360deg); } }

  .tc-hints { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; justify-content:center; }
  .tc-hint { border:1px solid var(--border,#ECECEE); background:var(--surface-2,#F6F6F7); border-radius:18px; padding:7px 13px;
    font-size:12.5px; color:var(--text); cursor:pointer; }
  .tc-hint:hover { border-color:#5B647D; }
  .tc-hint.tone-warn { color:#9A5B2E; background:color-mix(in srgb,#f59e0b 10%, transparent); }

  .tc-tray { margin-top:22px; border:1px dashed var(--border,#D8D8DC); background:var(--surface-2,#F6F6F7); border-radius:18px; padding:18px 20px; }
  .tc-tray-label { margin:0 0 4px; font-size:13px; font-weight:500; color:var(--text); }
  .tc-tray-hint { margin:0; font-size:12px; color:var(--text-muted,#8A8F98); display:flex; align-items:center; gap:4px; }

  .tc-sent { margin-top:18px; display:flex; align-items:center; gap:6px; font-size:13px; color:#2E7D4F; }

  .tc-preview { margin-top:22px; display:flex; flex-direction:column; gap:10px; }
  .tc-preview-head { display:flex; align-items:center; justify-content:space-between; font-size:13px; color:var(--text); }
  .tc-preview-head span { display:flex; align-items:center; gap:6px; }
  .tc-sendall { display:flex; align-items:center; gap:6px; border:0; background:#5B647D; color:#fff; border-radius:10px; padding:8px 14px; font-size:13px; font-weight:500; cursor:pointer; }
  .tc-sendall:disabled { opacity:.4; cursor:default; }
  .tc-card { border:1px solid var(--border,#ECECEE); border-radius:14px; padding:13px 15px; background:var(--surface,#fff); opacity:.6; transition:opacity .15s; }
  .tc-card.on { opacity:1; border-color:#D4D7E0; }
  .tc-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
  .tc-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:3px 8px; border-radius:7px; background:var(--surface-2,#F1F1F3); color:var(--text-muted,#8A8F98); }
  .tc-badge.tone-warn { color:#9A5B2E; background:color-mix(in srgb,#f59e0b 14%, transparent); }
  .tc-badge.tone-info { color:#3A5673; background:color-mix(in srgb,#5B647D 12%, transparent); }
  .tc-toggle { font-size:12px; color:var(--text-muted,#8A8F98); display:flex; align-items:center; gap:5px; cursor:pointer; }
  .tc-card-client { margin:0; font-size:13.5px; line-height:1.5; color:var(--text); }
  .tc-opts { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .tc-opt { font-size:12px; border:1px solid var(--border,#ECECEE); border-radius:7px; padding:3px 9px; color:var(--text-muted,#8A8F98); }

  .tc-ledger { max-width:760px; margin:0 auto; width:100%; padding:32px 24px; }
  .tc-ledger-h { font-size:18px; font-weight:500; margin:0 0 18px; color:var(--text); }
  .tc-ledger-row { display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--border,#F0F0F2); }
  .tc-ledger-text { flex:1; font-size:13px; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tc-ledger-time { font-size:11.5px; color:var(--text-muted,#8A8F98); display:flex; align-items:center; gap:4px; white-space:nowrap; }

  @media (max-width:760px) { .tc-wrap { grid-template-columns:1fr; } .tc-rail { display:none; } .tc-hero { font-size:24px; } }
`
