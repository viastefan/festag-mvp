'use client'

/**
 * Assets panel for a project — uploads, links, Figma, Loom.
 *
 * Lives inside the project detail page as a tab. Reads & writes
 * project_assets and pushes files into the project-assets storage
 * bucket under <projectId>/<assetId>.<ext>. Calm Festag/Linear style;
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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('project_assets')
        .select('id,kind,category,visibility,status,title,description,storage_path,external_url,preview_url,mime_type,size_bytes,tags,uploaded_by,created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(120)
      if (cancelled) return
      setItems((data as Asset[] | null) ?? [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase, projectId])

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
    }).select('id,kind,category,visibility,status,title,description,storage_path,external_url,preview_url,mime_type,size_bytes,tags,uploaded_by,created_at').single()
    if (!error && data) {
      setItems(prev => [data as Asset, ...prev])
      setComposer(null)
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
    }).select('id,kind,category,visibility,status,title,description,storage_path,external_url,preview_url,mime_type,size_bytes,tags,uploaded_by,created_at').single()
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
          <p className="ap-sub">Designs, Figma-Frames, Looms, Docs, Screenshots. Tagro analysiert hochgeladene Artefakte und verknüpft sie mit Tasks und Briefings.</p>
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
            Tagro erkennt automatisch worum es geht und schlägt passende Tasks vor.
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
            return (
              <article key={asset.id} className="ap-card">
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
                  </div>
                  {asset.description && <p className="ap-desc">{asset.description}</p>}
                </div>
                <div className="ap-actions-row">
                  <button type="button" className="ap-icon-btn" title="Öffnen" onClick={() => openAsset(asset)}>
                    <ArrowSquareOut size={14} />
                  </button>
                  <button type="button" className="ap-icon-btn ap-icon-btn-danger" title="Löschen" onClick={() => deleteAsset(asset)}>
                    <Trash size={14} />
                  </button>
                </div>
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
            placeholder="Kontext, was Tagro wissen sollte (optional)"
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
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    align-items: flex-start;
    transition: border-color .12s, background .12s;
  }
  .ap-card:hover { border-color: var(--border-strong); }
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
