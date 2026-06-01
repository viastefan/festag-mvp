'use client'

/**
 * Assets panel for a project — uploads, links, Figma, Loom.
 *
 * Lives inside the project detail page as a tab. Reads & writes
 * project_assets and pushes files into the project-assets storage
 * bucket under <projectId>/<assetId>.<ext>. Calm Festag workspace style;
 * matches the briefing surface tonality, never a Dropbox clone.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Upload, FigmaLogo, LinkSimple, FilmSlate, File, Image as ImageIcon,
  FilePdf, Trash, ArrowSquareOut, Sparkle, Plus,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

type Kind =
  | 'file' | 'figma' | 'link' | 'loom' | 'video' | 'audio'
  | 'image' | 'pdf' | 'document' | 'spreadsheet' | 'code' | 'screenshot'

type Category =
  | 'ui_ux' | 'development' | 'marketing' | 'branding' | 'documentation'
  | 'video' | 'analytics' | 'strategy' | 'automation' | 'client_files'
  | 'qa' | 'legal' | 'other'

type Visibility = 'client_visible' | 'team_only' | 'internal_only' | 'white_label_visible'

type Asset = {
  id: string
  kind: Kind
  category: Category
  visibility: Visibility
  status: 'uploaded' | 'analyzed' | 'approved' | 'archived'
  title: string
  description: string | null
  storage_path: string | null
  external_url: string | null
  preview_url: string | null
  mime_type: string | null
  size_bytes: number | null
  tags: string[]
  uploaded_by: string
  created_at: string
  analyzed_at: string | null
  analysis_result: AssetAnalysis | null
}

type AssetAnalysis = {
  summary: string
  project_area: string
  affected_roles: string[]
  suggested_tasks: Array<{ title: string; priority: 'low' | 'medium' | 'high'; reason: string }>
  open_questions: string[]
  risks: string[]
  requires_client_approval: boolean
  confidence: number
  source: 'ai' | 'heuristic'
}

const ROLE_LABEL: Record<string, string> = {
  developer: 'Developer', designer: 'Designer', marketing_manager: 'Marketing Manager',
  ads_manager: 'Ads Manager', seo_specialist: 'SEO', content_creator: 'Content',
  project_manager: 'Project Manager', strategist: 'Strategist', automation_expert: 'Automation',
  client_success: 'Client Success', reviewer: 'Reviewer',
}

const CATEGORY_LABEL: Record<Category, string> = {
  ui_ux: 'UI/UX', development: 'Development', marketing: 'Marketing',
  branding: 'Branding', documentation: 'Doku', video: 'Video',
  analytics: 'Analytics', strategy: 'Strategie', automation: 'Automation',
  client_files: 'Client-Dateien', qa: 'QA', legal: 'Legal', other: 'Sonstiges',
}

const VISIBILITY_LABEL: Record<Visibility, string> = {
  client_visible: 'Client-sichtbar',
  team_only: 'Team',
  internal_only: 'Intern',
  white_label_visible: 'White-Label',
}

function kindIcon(kind: Kind) {
  switch (kind) {
    case 'figma':      return FigmaLogo
    case 'loom':
    case 'video':      return FilmSlate
    case 'image':
    case 'screenshot': return ImageIcon
    case 'pdf':        return FilePdf
    case 'link':       return LinkSimple
    default:           return File
  }
}

function detectKindFromUrl(url: string): Kind {
  const u = url.toLowerCase()
  if (u.includes('figma.com')) return 'figma'
  if (u.includes('loom.com')) return 'loom'
  if (u.match(/\.(mp4|mov|webm)$/)) return 'video'
  if (u.match(/\.(png|jpg|jpeg|webp|gif|svg)$/)) return 'image'
  if (u.endsWith('.pdf')) return 'pdf'
  return 'link'
}

function kindFromFile(file: File): { kind: Kind; category: Category } {
  const m = file.type
  if (m.startsWith('image/')) return { kind: 'image', category: 'ui_ux' }
  if (m.startsWith('video/')) return { kind: 'video', category: 'video' }
  if (m.startsWith('audio/')) return { kind: 'audio', category: 'other' }
  if (m === 'application/pdf') return { kind: 'pdf', category: 'documentation' }
  if (m.includes('spreadsheet') || m.includes('excel') || m.includes('csv')) return { kind: 'spreadsheet', category: 'documentation' }
  if (m.includes('word') || m.includes('document')) return { kind: 'document', category: 'documentation' }
  return { kind: 'file', category: 'other' }
}

function humanSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'gerade eben'
  if (ms < 3_600_000) return `vor ${Math.round(ms / 60_000)} min`
  if (ms < 86_400_000) return `vor ${Math.round(ms / 3_600_000)} h`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

export default function AssetsPanel({ projectId, workspaceId }: { projectId: string; workspaceId: string | null }) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [composer, setComposer] = useState<null | 'link' | 'upload'>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [taskState, setTaskState] = useState<Record<string, 'idle' | 'saving' | 'done' | 'error'>>({})

  async function promoteSuggestionToTask(assetId: string, idx: number, t: { title: string; priority: 'low'|'medium'|'high'; reason: string }) {
    const key = `${assetId}:${idx}`
    if (taskState[key] === 'saving' || taskState[key] === 'done') return
    setTaskState(prev => ({ ...prev, [key]: 'saving' }))
    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: projectId,
        title: t.title.slice(0, 240),
        status: 'suggested',
        priority: t.priority,
        description: `Aus Veyra Asset-Analyse abgeleitet.\n\nGrund: ${t.reason}`,
      })
      if (error) throw error
      setTaskState(prev => ({ ...prev, [key]: 'done' }))
    } catch {
      setTaskState(prev => ({ ...prev, [key]: 'error' }))
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('project_assets')
        .select('id,kind,category,visibility,status,title,description,storage_path,external_url,preview_url,mime_type,size_bytes,tags,uploaded_by,created_at,analyzed_at,analysis_result')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(120)
      if (cancelled) return
      setItems((data as Asset[] | null) ?? [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase, projectId])

  // Fires the Veyra analyzer in the background and patches the local row
  // with analysis_result + analyzed_at when it returns. Failures are silent.
  async function runAnalysis(assetId: string) {
    setItems(prev => prev.map(a => a.id === assetId ? { ...a, status: a.status === 'uploaded' ? a.status : a.status } : a))
    try {
      const res = await fetch('/api/assets/analyze', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      })
      const json = await res.json()
      if (json?.ok && json.analysis) {
        setItems(prev => prev.map(a => a.id === assetId
          ? { ...a, status: 'analyzed', analyzed_at: new Date().toISOString(), analysis_result: json.analysis }
          : a))
      }
    } catch {}
  }

  async function deleteAsset(asset: Asset) {
    if (!confirm(`„${asset.title}" wirklich löschen?`)) return
    setItems(prev => prev.filter(a => a.id !== asset.id))
    try {
      if (asset.storage_path) {
        await supabase.storage.from('project-assets').remove([asset.storage_path])
      }
      await supabase.from('project_assets').delete().eq('id', asset.id)
    } catch {}
  }

  async function addLink({ title, url, description, category, visibility }: {
    title: string; url: string; description: string; category: Category; visibility: Visibility
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const kind = detectKindFromUrl(url)
    const { data, error } = await supabase.from('project_assets').insert({
      project_id: projectId,
      workspace_id: workspaceId,
      uploaded_by: user.id,
      title,
      description: description || null,
      external_url: url,
      kind,
      category,
      visibility,
      mime_type: null,
      size_bytes: null,
    }).select('id,kind,category,visibility,status,title,description,storage_path,external_url,preview_url,mime_type,size_bytes,tags,uploaded_by,created_at,analyzed_at,analysis_result').single()
    if (!error && data) {
      setItems(prev => [data as Asset, ...prev])
      setComposer(null)
      runAnalysis((data as Asset).id)
    }
  }

  async function uploadFile({ file, title, description, category, visibility }: {
    file: File; title: string; description: string; category: Category; visibility: Visibility
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'bin'
    const { kind, category: catGuess } = kindFromFile(file)
    const finalCat = category || catGuess
    // Insert row first to get the id, then upload to <projectId>/<id>.<ext>
    const { data: row, error: insErr } = await supabase.from('project_assets').insert({
      project_id: projectId,
      workspace_id: workspaceId,
      uploaded_by: user.id,
      title,
      description: description || null,
      kind,
      category: finalCat,
      visibility,
      mime_type: file.type || null,
      size_bytes: file.size,
    }).select('id,kind,category,visibility,status,title,description,storage_path,external_url,preview_url,mime_type,size_bytes,tags,uploaded_by,created_at,analyzed_at,analysis_result').single()
    if (insErr || !row) return
    const path = `${projectId}/${(row as any).id}.${ext}`
    const { error: upErr } = await supabase.storage.from('project-assets').upload(path, file, {
      contentType: file.type || undefined,
      upsert: true,
    })
    if (upErr) {
      await supabase.from('project_assets').delete().eq('id', (row as any).id)
      return
    }
    await supabase.from('project_assets').update({ storage_path: path }).eq('id', (row as any).id)
    const stored: Asset = { ...(row as Asset), storage_path: path }
    setItems(prev => [stored, ...prev])
    setComposer(null)
    runAnalysis(stored.id)
  }

  async function openAsset(asset: Asset) {
    if (asset.external_url) {
      window.open(asset.external_url, '_blank', 'noopener,noreferrer')
      return
    }
    if (asset.storage_path) {
      const { data } = await supabase.storage.from('project-assets').createSignedUrl(asset.storage_path, 60)
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="ap">
      <style>{ASSETS_CSS}</style>

      <header className="ap-head">
        <div>
          <p className="ap-kicker">Produktionsartefakte</p>
          <h2 className="ap-title">Assets</h2>
          <p className="ap-sub">Designs, Figma-Frames, Looms, Docs, Screenshots. Veyra analysiert hochgeladene Artefakte und verknüpft sie mit Tasks und Briefings.</p>
        </div>
        <div className="ap-actions">
          <button type="button" className="ap-btn ap-btn-primary" onClick={() => setComposer('upload')}>
            <Upload size={14} weight="regular" />
            Datei hochladen
          </button>
          <button type="button" className="ap-btn" onClick={() => setComposer('link')}>
            <LinkSimple size={14} weight="regular" />
            Link hinzufügen
          </button>
        </div>
      </header>

      {loading ? (
        <div className="ap-empty">Assets werden geladen…</div>
      ) : items.length === 0 ? (
        <div className="ap-empty">
          <div className="ap-empty-icon"><Sparkle size={20} weight="regular" /></div>
          <p className="ap-empty-title">Noch keine Assets in diesem Projekt</p>
          <p className="ap-empty-sub">
            Lade Designs hoch, paste Figma- oder Loom-Links rein, oder hänge PDFs an.<br />
            Veyra erkennt automatisch worum es geht und schlägt passende Tasks vor.
          </p>
          <div className="ap-empty-actions">
            <button type="button" className="ap-chip" onClick={() => setComposer('upload')}><Upload size={13} /> Datei hochladen</button>
            <button type="button" className="ap-chip" onClick={() => setComposer('link')}><FigmaLogo size={13} /> Figma-Link</button>
            <button type="button" className="ap-chip" onClick={() => setComposer('link')}><FilmSlate size={13} /> Loom / Video</button>
          </div>
        </div>
      ) : (
        <div className="ap-list">
          {items.map(asset => {
            const Icon = kindIcon(asset.kind)
            const isOpen = expanded[asset.id]
            const an = asset.analysis_result
            const analyzing = asset.status !== 'analyzed' && !an
            return (
              <article key={asset.id} className="ap-card">
                <div className="ap-card-head">
                  <div className="ap-icon"><Icon size={18} weight="regular" /></div>
                  <div className="ap-body">
                    <div className="ap-row">
                      <p className="ap-cardtitle">{asset.title}</p>
                      <span className="ap-meta">{timeAgo(asset.created_at)}</span>
                    </div>
                    <div className="ap-tags">
                      <span className="ap-tag">{CATEGORY_LABEL[asset.category]}</span>
                      <span className="ap-tag ap-tag-mute">{VISIBILITY_LABEL[asset.visibility]}</span>
                      {asset.size_bytes ? <span className="ap-tag ap-tag-mute">{humanSize(asset.size_bytes)}</span> : null}
                      {asset.kind === 'figma' && <span className="ap-tag ap-tag-mute">Figma</span>}
                      {asset.kind === 'loom' && <span className="ap-tag ap-tag-mute">Loom</span>}
                      {asset.kind === 'pdf' && <span className="ap-tag ap-tag-mute">PDF</span>}
                      {an && <span className="ap-tag ap-tag-tagro"><Sparkle size={9} weight="fill" /> Veyra analysiert</span>}
                      {analyzing && <span className="ap-tag ap-tag-mute">Veyra analysiert…</span>}
                    </div>
                    {asset.description && <p className="ap-desc">{asset.description}</p>}
                    {an?.summary && <p className="ap-desc ap-desc-tagro">{an.summary}</p>}
                  </div>
                  <div className="ap-actions-row">
                    {an && (
                      <button
                        type="button"
                        className="ap-icon-btn"
                        title={isOpen ? 'Analyse schließen' : 'Analyse öffnen'}
                        onClick={() => setExpanded(prev => ({ ...prev, [asset.id]: !isOpen }))}
                      >
                        <Sparkle size={14} weight={isOpen ? 'fill' : 'regular'} />
                      </button>
                    )}
                    <button type="button" className="ap-icon-btn" title="Öffnen" onClick={() => openAsset(asset)}>
                      <ArrowSquareOut size={14} />
                    </button>
                    <button type="button" className="ap-icon-btn ap-icon-btn-danger" title="Löschen" onClick={() => deleteAsset(asset)}>
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                {isOpen && an && (
                  <div className="ap-analysis">
                    {an.project_area && (
                      <div className="ap-an-row">
                        <span className="ap-an-label">Bereich</span>
                        <span className="ap-an-value">{an.project_area}</span>
                      </div>
                    )}
                    {an.affected_roles?.length > 0 && (
                      <div className="ap-an-row">
                        <span className="ap-an-label">Betroffene Rollen</span>
                        <span className="ap-an-roles">
                          {an.affected_roles.map(r => (
                            <span key={r} className="ap-tag ap-tag-mute">{ROLE_LABEL[r] || r}</span>
                          ))}
                        </span>
                      </div>
                    )}
                    {an.requires_client_approval && (
                      <div className="ap-an-row">
                        <span className="ap-an-label">Client</span>
                        <span className="ap-an-value ap-an-warn">Freigabe vom Client nötig</span>
                      </div>
                    )}
                    {an.suggested_tasks?.length > 0 && (
                      <div className="ap-an-block">
                        <p className="ap-an-blocklabel">Vorgeschlagene Tasks</p>
                        <div className="ap-an-list">
                          {an.suggested_tasks.map((t, idx) => {
                            const key = `${asset.id}:${idx}`
                            const state = taskState[key] ?? 'idle'
                            return (
                              <div key={idx} className="ap-an-item">
                                <span className={`ap-an-prio ap-an-prio-${t.priority}`}>{t.priority === 'high' ? 'Hoch' : t.priority === 'low' ? 'Niedrig' : 'Mittel'}</span>
                                <div className="ap-an-itemtext">
                                  <p className="ap-an-itemtitle">{t.title}</p>
                                  {t.reason && <p className="ap-an-itemsub">{t.reason}</p>}
                                </div>
                                <button
                                  type="button"
                                  className={`ap-an-action${state === 'done' ? ' done' : ''}`}
                                  onClick={() => promoteSuggestionToTask(asset.id, idx, t)}
                                  disabled={state === 'saving' || state === 'done'}
                                >
                                  {state === 'saving' ? 'Lege an…'
                                    : state === 'done' ? '✓ Übernommen'
                                    : state === 'error' ? 'Nochmal versuchen'
                                    : <><Plus size={11} /> Als Task</>}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {an.open_questions?.length > 0 && (
                      <div className="ap-an-block">
                        <p className="ap-an-blocklabel">Offene Fragen</p>
                        <ul className="ap-an-bullets">
                          {an.open_questions.map((q, i) => <li key={i}>{q}</li>)}
                        </ul>
                      </div>
                    )}
                    {an.risks?.length > 0 && (
                      <div className="ap-an-block">
                        <p className="ap-an-blocklabel">Risiken</p>
                        <ul className="ap-an-bullets">
                          {an.risks.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {composer && (
        <AssetComposer
          mode={composer}
          onClose={() => setComposer(null)}
          onSubmitLink={addLink}
          onSubmitFile={uploadFile}
        />
      )}
    </div>
  )
}

const CATEGORIES: Category[] = ['ui_ux','development','marketing','branding','documentation','video','analytics','strategy','automation','client_files','qa','legal','other']
const VISIBILITIES: Visibility[] = ['team_only','client_visible','internal_only','white_label_visible']

function AssetComposer({
  mode, onClose, onSubmitLink, onSubmitFile,
}: {
  mode: 'link' | 'upload'
  onClose: () => void
  onSubmitLink: (input: { title: string; url: string; description: string; category: Category; visibility: Visibility }) => Promise<void>
  onSubmitFile: (input: { file: File; title: string; description: string; category: Category; visibility: Visibility }) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<Category>('ui_ux')
  const [visibility, setVisibility] = useState<Visibility>('team_only')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function pickFile(f: File | null) {
    setFile(f)
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function submit() {
    setError('')
    if (!title.trim()) { setError('Titel fehlt.'); return }
    setBusy(true)
    try {
      if (mode === 'link') {
        if (!url.trim() || !/^https?:\/\//.test(url.trim())) { setError('Gib eine vollständige URL ein.'); setBusy(false); return }
        await onSubmitLink({ title: title.trim(), url: url.trim(), description, category, visibility })
      } else {
        if (!file) { setError('Bitte eine Datei auswählen.'); setBusy(false); return }
        await onSubmitFile({ file, title: title.trim(), description, category, visibility })
      }
    } catch (e: any) {
      setError(e?.message || 'Konnte nicht speichern.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ac-backdrop" onMouseDown={onClose}>
      <div className="ac-modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <p className="ap-kicker">{mode === 'link' ? 'Link hinzufügen' : 'Datei hochladen'}</p>
        <h3 className="ap-title" style={{ marginBottom: 14 }}>
          {mode === 'link' ? 'Figma · Loom · externe URL' : 'Asset hochladen'}
        </h3>

        {mode === 'link' ? (
          <label className="ac-field">
            <span className="ac-label">URL</span>
            <input
              className="ac-input"
              type="url"
              value={url}
              autoFocus
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.figma.com/file/…"
            />
          </label>
        ) : (
          <label className="ac-field">
            <span className="ac-label">Datei</span>
            <input
              className="ac-input"
              type="file"
              autoFocus
              onChange={e => pickFile(e.target.files?.[0] ?? null)}
            />
            {file && <span className="ap-meta" style={{ marginTop: 6 }}>{file.name} · {humanSize(file.size)}</span>}
          </label>
        )}

        <label className="ac-field">
          <span className="ac-label">Titel</span>
          <input
            className="ac-input"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Kurzer Name — z. B. Checkout Mobile v3"
          />
        </label>

        <label className="ac-field">
          <span className="ac-label">Beschreibung</span>
          <textarea
            className="ac-input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Kontext, was Veyra wissen sollte (optional)"
            rows={2}
          />
        </label>

        <div className="ac-grid">
          <label className="ac-field">
            <span className="ac-label">Kategorie</span>
            <select className="ac-input" value={category} onChange={e => setCategory(e.target.value as Category)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="ac-field">
            <span className="ac-label">Sichtbarkeit</span>
            <select className="ac-input" value={visibility} onChange={e => setVisibility(e.target.value as Visibility)}>
              {VISIBILITIES.map(v => <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="ac-error">{error}</p>}

        <div className="ac-actions">
          <button type="button" className="ap-btn" onClick={onClose}>Abbrechen</button>
          <button type="button" className="ap-btn ap-btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Speichere…' : mode === 'link' ? 'Hinzufügen' : 'Hochladen'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ASSETS_CSS = `
  .ap { display: flex; flex-direction: column; gap: 16px; }
  .ap-head {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .ap-kicker {
    margin: 0;
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
    color: var(--text-muted); text-transform: uppercase;
  }
  .ap-title {
    margin: 4px 0 0;
    font-size: 18px; font-weight: 600; letter-spacing: -0.005em;
    color: var(--text);
  }
  .ap-sub {
    margin: 6px 0 0; max-width: 520px;
    font-size: 12.5px; line-height: 1.55; color: var(--text-secondary);
  }
  .ap-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .ap-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-family: inherit; font-size: 12.5px; font-weight: 500;
    cursor: pointer;
    transition: background .12s, border-color .12s;
  }
  .ap-btn:hover { background: var(--surface-2); }
  .ap-btn-primary { background: var(--text); color: var(--bg); border-color: var(--text); }
  .ap-btn-primary:hover { opacity: 0.92; background: var(--text); }
  .ap-btn:disabled { opacity: .55; cursor: not-allowed; }

  /* Empty state */
  .ap-empty {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 64px 24px;
    border: 1px dashed var(--border);
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface) 35%, transparent);
    color: var(--text-muted);
  }
  .ap-empty-icon {
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--surface-2);
    color: var(--text-secondary);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
  }
  .ap-empty-title { margin: 0 0 6px; font-size: 14px; font-weight: 600; color: var(--text-secondary); }
  .ap-empty-sub { margin: 0 0 18px; max-width: 420px; font-size: 12.5px; line-height: 1.6; color: var(--text-muted); }
  .ap-empty-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
  .ap-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-family: inherit; font-size: 12px; font-weight: 500;
    color: var(--text);
    cursor: pointer;
    transition: background .12s, border-color .12s;
  }
  .ap-chip:hover { background: var(--surface-2); border-color: var(--border-strong); }

  /* List */
  .ap-list { display: flex; flex-direction: column; gap: 6px; }
  .ap-card {
    display: flex; flex-direction: column;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    transition: border-color .12s, background .12s;
  }
  .ap-card:hover { border-color: var(--border-strong); }
  .ap-card-head {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    gap: 12px;
    padding: 12px 14px;
    align-items: flex-start;
  }
  .ap-tag-tagro {
    background: color-mix(in srgb, #D97706 14%, transparent);
    color: #D97706;
    border: 1px solid color-mix(in srgb, #D97706 40%, transparent);
    display: inline-flex; align-items: center; gap: 4px;
  }
  .ap-desc-tagro {
    color: var(--text);
    margin-top: 6px;
    padding-left: 10px;
    border-left: 2px solid color-mix(in srgb, #D97706 60%, transparent);
  }

  /* Veyra Analysis */
  .ap-analysis {
    display: flex; flex-direction: column; gap: 12px;
    padding: 14px 16px 16px;
    border-top: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface-2) 40%, transparent);
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
  }
  .ap-an-row { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
  .ap-an-label {
    font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em;
    color: var(--text-muted); text-transform: uppercase;
    min-width: 120px;
  }
  .ap-an-value { font-size: 13px; color: var(--text); font-weight: 500; }
  .ap-an-warn { color: #D97706; }
  .ap-an-roles { display: flex; gap: 5px; flex-wrap: wrap; }
  .ap-an-block { display: flex; flex-direction: column; gap: 6px; }
  .ap-an-blocklabel {
    margin: 0;
    font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em;
    color: var(--text-muted); text-transform: uppercase;
  }
  .ap-an-list { display: flex; flex-direction: column; gap: 6px; }
  .ap-an-item {
    display: grid;
    grid-template-columns: 70px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    align-items: center;
  }
  .ap-an-prio {
    font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
    text-align: center;
    align-self: flex-start;
  }
  .ap-an-prio-high { color: #c0362e; background: color-mix(in srgb, #c0362e 12%, transparent); border: 1px solid color-mix(in srgb, #c0362e 35%, transparent); }
  .ap-an-prio-medium { color: #D97706; background: color-mix(in srgb, #D97706 12%, transparent); border: 1px solid color-mix(in srgb, #D97706 35%, transparent); }
  .ap-an-prio-low { color: var(--text-muted); border: 1px solid var(--border); }
  .ap-an-itemtext { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .ap-an-itemtitle { margin: 0; font-size: 13px; font-weight: 500; color: var(--text); line-height: 1.35; }
  .ap-an-itemsub { margin: 0; font-size: 11.5px; color: var(--text-muted); line-height: 1.45; }
  .ap-an-action {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 6px 11px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-family: inherit; font-size: 11.5px; font-weight: 500;
    color: var(--text);
    cursor: pointer;
    white-space: nowrap;
    transition: background .12s, border-color .12s, opacity .12s;
  }
  .ap-an-action:hover:not(:disabled) { background: var(--surface-2); border-color: var(--border-strong); }
  .ap-an-action:disabled { opacity: .55; cursor: default; }
  .ap-an-action.done { background: #15803D; color: #fff; border-color: #15803D; }
  .ap-an-bullets {
    margin: 0; padding-left: 18px;
    display: flex; flex-direction: column; gap: 4px;
    font-size: 12.5px; color: var(--text-secondary); line-height: 1.55;
  }
  .ap-icon {
    width: 36px; height: 36px; border-radius: 8px;
    background: var(--surface-2);
    color: var(--text-secondary);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ap-body { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .ap-row { display: flex; align-items: baseline; gap: 8px; justify-content: space-between; }
  .ap-cardtitle {
    margin: 0; font-size: 13.5px; font-weight: 500; color: var(--text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ap-meta {
    font-size: 11.5px; color: var(--text-muted); white-space: nowrap;
  }
  .ap-tags { display: flex; gap: 5px; flex-wrap: wrap; }
  .ap-tag {
    display: inline-flex; align-items: center;
    padding: 2px 8px;
    font-size: 10.5px; font-weight: 500; letter-spacing: 0.01em;
    color: var(--text-secondary);
    background: var(--surface-2);
    border-radius: 4px;
  }
  .ap-tag-mute { color: var(--text-muted); background: transparent; border: 1px solid var(--border); }
  .ap-desc {
    margin: 4px 0 0;
    font-size: 12.5px; color: var(--text-secondary); line-height: 1.55;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ap-actions-row {
    display: flex; align-items: center; gap: 4px;
    flex-shrink: 0;
  }
  .ap-icon-btn {
    width: 28px; height: 28px; border-radius: 6px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: background .12s, color .12s, border-color .12s;
  }
  .ap-icon-btn:hover { background: var(--surface-2); color: var(--text); border-color: var(--border); }
  .ap-icon-btn-danger:hover { color: #c0362e; border-color: rgba(192,54,46,0.4); background: rgba(192,54,46,0.06); }

  /* Composer */
  .ac-backdrop {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(8,10,12,.56);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .ac-modal {
    width: min(480px, 100%);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 24px 60px rgba(0,0,0,.28);
    color: var(--text);
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    max-height: calc(100dvh - 40px);
    overflow-y: auto;
  }
  .ac-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .ac-label { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); }
  .ac-input {
    width: 100%;
    padding: 9px 11px;
    border-radius: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
    transition: border-color .12s, box-shadow .12s;
  }
  textarea.ac-input { resize: vertical; min-height: 64px; }
  .ac-input:focus { outline: none; border-color: color-mix(in srgb, var(--text) 35%, var(--border)); }
  .ac-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ac-error {
    margin: 0 0 10px;
    padding: 8px 11px;
    border-radius: 8px;
    background: rgba(192,54,46,0.08);
    color: #c0362e;
    font-size: 12px;
  }
  .ac-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; flex-wrap: wrap; }

  @media (max-width: 720px) {
    .ap-head { align-items: flex-start; }
    .ap-actions { width: 100%; }
    .ap-actions .ap-btn { flex: 1; justify-content: center; }
    .ap-card { grid-template-columns: 32px minmax(0, 1fr); }
    .ap-actions-row { grid-column: 1 / -1; justify-content: flex-end; padding-top: 4px; }
    .ac-grid { grid-template-columns: 1fr; }
  }
`
