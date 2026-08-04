'use client'

/**
 * Workspace Management — owner surface.
 * Rename · Icon · Template · Delete (type-name confirm).
 */

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import WorkspaceSymbol, {
  SYMBOL_SCHEMES,
  SYMBOL_VARIANTS,
  type SymbolScheme,
  type SymbolVariant,
} from '@/components/WorkspaceSymbol'
import { useWorkspaceNameField } from '@/lib/use-workspace-name-field'
import { rememberWorkspaceName } from '@/lib/pending-workspace'
import { clearActiveWorkspaceId, getActiveWorkspaceId, rememberActiveWorkspace } from '@/lib/active-workspace'
import { createClient } from '@/lib/supabase/client'
import {
  OPEN_WORKSPACE_MANAGE_EVENT,
  emitWorkspaceDeleted,
  emitWorkspaceRenamed,
  emitWorkspaceUpdated,
  type WorkspaceManageDetail,
} from '@/lib/workspace-create-open'
import {
  WORKSPACE_USE_CASES,
  getWorkspaceUseCase,
  workspaceSubdomainPreview,
  type WorkspaceUseCaseId,
} from '@/lib/platform/workspace-creation'
import { defaultSymbolFor, loadSymbol, saveSymbol, type WorkspaceSymbolPrefs } from '@/lib/workspace-symbol'
import { getTheme, parseThemeEventDetail, type PanelThemeMode } from '@/lib/theme'

type Tab = 'name' | 'icon' | 'template' | 'delete'

export default function WorkspaceManageModal() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState<Tab>('name')
  const [workspaceId, setWorkspaceId] = useState('')
  const [workspaceNameSeed, setWorkspaceNameSeed] = useState('')
  const [useCase, setUseCase] = useState<WorkspaceUseCaseId | null>(null)
  const [symbol, setSymbol] = useState<WorkspaceSymbolPrefs>(() => defaultSymbolFor('festag'))
  const [confirmName, setConfirmName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [themeMode, setThemeMode] = useState<PanelThemeMode>(() => getTheme('client'))
  const [fieldFocused, setFieldFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)

  const {
    workspaceName,
    displayName,
    availability,
    availabilityMsg,
    ready,
    inputRef,
    setWorkspaceName,
    hydrate,
  } = useWorkspaceNameField({
    enabled: open && tab === 'name',
    excludeId: workspaceId || null,
  })

  const subdomain = workspaceSubdomainPreview(displayName || workspaceName)
  const hasName = Boolean(displayName)
  const dataTheme = themeMode === 'dark' ? 'dark' : themeMode === 'read' ? 'read' : 'light'
  const confirmMatches =
    Boolean(confirmName.trim()) &&
    confirmName.trim().toLowerCase() === workspaceNameSeed.trim().toLowerCase()

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<WorkspaceManageDetail>).detail || {}
      void openSheet(detail)
    }
    window.addEventListener(OPEN_WORKSPACE_MANAGE_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_WORKSPACE_MANAGE_EVENT, onOpen)
  }, [])

  useEffect(() => {
    setThemeMode(getTheme('client'))
    const onTheme = (e: Event) => {
      const parsed = parseThemeEventDetail((e as CustomEvent).detail)
      if (!parsed) return
      if (parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'read') {
        setThemeMode(parsed.mode)
      }
    }
    window.addEventListener('festag-theme', onTheme)
    return () => window.removeEventListener('festag-theme', onTheme)
  }, [])

  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    const id = requestAnimationFrame(() => setVisible(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = prev
    }
  }, [open])

  async function openSheet(detail: WorkspaceManageDetail) {
    setError('')
    setSaving(false)
    setConfirmName('')
    setTab(detail.section || 'name')
    setThemeMode(getTheme('client'))
    setOpen(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login?next=/overview'
        return
      }

      let id = detail.workspaceId || getActiveWorkspaceId() || ''
      let seed = detail.name || ''

      if (!id) {
        const { data: owned } = await supabase
          .from('workspaces')
          .select('id, name, metadata')
          .eq('primary_owner_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        id = owned?.id || ''
        seed = seed || (typeof owned?.name === 'string' ? owned.name : '')
        applyMeta(owned?.metadata, seed || id)
      } else {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id, name, metadata')
          .eq('id', id)
          .is('deleted_at', null)
          .maybeSingle()
        seed = seed || (typeof ws?.name === 'string' ? ws.name : '')
        applyMeta(ws?.metadata, seed || id)
      }

      setWorkspaceId(id)
      setWorkspaceNameSeed(seed)
      if (seed) hydrate(seed)
      else setWorkspaceName('')
    } catch {
      setError('Workspace konnte nicht geladen werden.')
    }
  }

  function applyMeta(raw: unknown, key: string) {
    const meta =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {}
    const use = typeof meta.workspace_use_case === 'string' ? meta.workspace_use_case : null
    setUseCase(getWorkspaceUseCase(use as WorkspaceUseCaseId)?.id ?? null)

    const sym = meta.symbol
    if (sym && typeof sym === 'object') {
      const s = sym as Partial<WorkspaceSymbolPrefs>
      if (
        (SYMBOL_VARIANTS as readonly string[]).includes(String(s.variant)) &&
        (SYMBOL_SCHEMES as readonly string[]).includes(String(s.scheme))
      ) {
        setSymbol({
          variant: s.variant as SymbolVariant,
          scheme: s.scheme as SymbolScheme,
          seed: typeof s.seed === 'string' && s.seed ? s.seed : key,
        })
        return
      }
    }
    setSymbol(loadSymbol(key))
  }

  function close() {
    if (saving) return
    setVisible(false)
    window.setTimeout(() => setOpen(false), 200)
  }

  async function saveName() {
    const trimmed = displayName
    if (!trimmed) {
      setError('Bitte einen Namen eingeben.')
      return
    }
    if (!ready && availability !== 'available') {
      setError(availabilityMsg || 'Name ist noch nicht verfügbar.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/workspaces/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId: workspaceId || undefined, name: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.message || 'Umbenennen fehlgeschlagen.')
        setSaving(false)
        return
      }
      const nextName = String(data.workspace?.name || trimmed)
      const nextId = String(data.workspace?.id || workspaceId)
      rememberWorkspaceName(nextName)
      rememberActiveWorkspace(nextId, nextName)
      setWorkspaceNameSeed(nextName)
      emitWorkspaceRenamed({ name: nextName, id: nextId })
      setSaving(false)
    } catch {
      setError('Netzwerkproblem. Bitte erneut versuchen.')
      setSaving(false)
    }
  }

  async function saveSymbolPrefs(next: WorkspaceSymbolPrefs) {
    setSymbol(next)
    if (!workspaceId) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/workspaces/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId, symbol: next }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.message || 'Icon konnte nicht gespeichert werden.')
        setSaving(false)
        return
      }
      saveSymbol(workspaceId, next)
      emitWorkspaceUpdated({ id: workspaceId, symbol: next })
      setSaving(false)
    } catch {
      setError('Netzwerkproblem. Bitte erneut versuchen.')
      setSaving(false)
    }
  }

  async function saveTemplate(id: WorkspaceUseCaseId) {
    setUseCase(id)
    if (!workspaceId) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/workspaces/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId, useCase: id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.message || 'Template konnte nicht gespeichert werden.')
        setSaving(false)
        return
      }
      emitWorkspaceUpdated({ id: workspaceId, useCase: id })
      setSaving(false)
    } catch {
      setError('Netzwerkproblem. Bitte erneut versuchen.')
      setSaving(false)
    }
  }

  async function deleteWorkspace() {
    if (!workspaceId || !confirmMatches) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/workspaces/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId, confirmation: confirmName.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.message || 'Löschen fehlgeschlagen.')
        setSaving(false)
        return
      }
      const deletedId = workspaceId
      const deletedName = workspaceNameSeed
      clearActiveWorkspaceId()
      emitWorkspaceDeleted({ id: deletedId, name: deletedName })
      setSaving(false)
      close()
      window.location.assign('/overview')
    } catch {
      setError('Netzwerkproblem. Bitte erneut versuchen.')
      setSaving(false)
    }
  }

  const tabs = useMemo(
    () =>
      [
        { id: 'name' as const, label: 'Name' },
        { id: 'icon' as const, label: 'Icon' },
        { id: 'template' as const, label: 'Template' },
        { id: 'delete' as const, label: 'Löschen' },
      ] as const,
    [],
  )

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`wm-sheet${visible ? ' is-visible' : ''}`}
      data-theme={dataTheme}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wm-title"
    >
      <style>{MANAGE_CSS}</style>
      <button type="button" className="wm-backdrop" aria-label="Schließen" onClick={close} />
      <div className="wm-card">
        <header className="wm-head">
          <div className="wm-head-mark" aria-hidden>
            <WorkspaceSymbol
              variant={symbol.variant}
              scheme={symbol.scheme}
              seed={symbol.seed}
              size={36}
            />
          </div>
          <div className="wm-head-copy">
            <h2 id="wm-title" className="wm-title">Workspace verwalten</h2>
            <p className="wm-subtitle">{workspaceNameSeed || 'Workspace'}</p>
          </div>
        </header>

        <nav className="wm-tabs" aria-label="Bereiche">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`wm-tab${tab === t.id ? ' is-active' : ''}${t.id === 'delete' ? ' is-danger' : ''}`}
              onClick={() => {
                setError('')
                setTab(t.id)
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="wm-body">
          {tab === 'name' ? (
            <section className="wm-section">
              <div
                className={[
                  'wm-field',
                  hasName ? 'has-value' : '',
                  fieldFocused ? 'is-focused' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  ref={inputRef}
                  className="wm-input"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => {
                    setError('')
                    setWorkspaceName(e.target.value)
                  }}
                  onFocus={() => setFieldFocused(true)}
                  onBlur={() => setFieldFocused(false)}
                  maxLength={64}
                  aria-label="Workspace-Name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && ready && !saving) {
                      e.preventDefault()
                      void saveName()
                    }
                    if (e.key === 'Escape') close()
                  }}
                />
                {availability === 'available' && displayName ? (
                  <span className="wm-badge" title="Verfügbar">✓</span>
                ) : (availability === 'taken' || availability === 'invalid') && displayName ? (
                  <span className="wm-badge wm-badge--bad" title={availabilityMsg || 'Vergeben'}>✕</span>
                ) : null}
              </div>
              <span className={`wm-sub${displayName ? ' is-ready' : ''}`}>{subdomain}</span>
              <div className="wm-actions">
                <ContinueHint
                  ready={ready && !saving}
                  label={saving ? 'Speichern…' : 'Name speichern'}
                  onContinue={() => void saveName()}
                />
              </div>
            </section>
          ) : null}

          {tab === 'icon' ? (
            <section className="wm-section">
              <p className="wm-help">Wähle Farbe und Form — das Icon erscheint in der Sidebar.</p>
              <div className="wm-icon-preview">
                <WorkspaceSymbol
                  variant={symbol.variant}
                  scheme={symbol.scheme}
                  seed={symbol.seed}
                  size={64}
                />
              </div>
              <p className="wm-label">Farbe</p>
              <div className="wm-chip-grid">
                {SYMBOL_SCHEMES.map((scheme) => (
                  <button
                    key={scheme}
                    type="button"
                    className={`wm-chip${symbol.scheme === scheme ? ' is-active' : ''}`}
                    onClick={() => void saveSymbolPrefs({ ...symbol, scheme })}
                    aria-label={`Farbe ${scheme}`}
                    disabled={saving}
                  >
                    <WorkspaceSymbol
                      variant={symbol.variant}
                      scheme={scheme}
                      seed={symbol.seed}
                      size={28}
                      selected={symbol.scheme === scheme}
                    />
                  </button>
                ))}
              </div>
              <p className="wm-label">Form</p>
              <div className="wm-chip-grid">
                {SYMBOL_VARIANTS.map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    className={`wm-chip${symbol.variant === variant ? ' is-active' : ''}`}
                    onClick={() => void saveSymbolPrefs({ ...symbol, variant })}
                    aria-label={`Form ${variant}`}
                    disabled={saving}
                  >
                    <WorkspaceSymbol
                      variant={variant}
                      scheme={symbol.scheme}
                      seed={symbol.seed}
                      size={28}
                      selected={symbol.variant === variant}
                    />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {tab === 'template' ? (
            <section className="wm-section">
              <p className="wm-help">
                Das Template setzt ruhige Defaults für Module und Workspace-Typ. Bestehende Projekte bleiben erhalten.
              </p>
              <div className="wm-template-list">
                {WORKSPACE_USE_CASES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`wm-template${useCase === c.id ? ' is-active' : ''}`}
                    onClick={() => void saveTemplate(c.id)}
                    disabled={saving}
                  >
                    <span className="wm-template-title">{c.title}</span>
                    <span className="wm-template-desc">{c.description}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {tab === 'delete' ? (
            <section className="wm-section wm-section--danger">
              <h3 className="wm-danger-title">Delete Workspace</h3>
              <p className="wm-danger-lead">This action permanently removes</p>
              <ul className="wm-danger-list">
                <li>Projects</li>
                <li>Documents</li>
                <li>Members</li>
                <li>Tasks</li>
                <li>Decisions</li>
              </ul>
              <p className="wm-danger-warn">This action cannot be undone.</p>
              <p className="wm-help">
                Type the workspace name <strong>{workspaceNameSeed}</strong> to confirm.
              </p>
              <div
                className={[
                  'wm-field',
                  confirmName ? 'has-value' : '',
                  confirmFocused ? 'is-focused' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  className="wm-input"
                  type="text"
                  value={confirmName}
                  onChange={(e) => {
                    setError('')
                    setConfirmName(e.target.value)
                  }}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  aria-label="Workspace-Name zur Bestätigung"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && confirmMatches && !saving) {
                      e.preventDefault()
                      void deleteWorkspace()
                    }
                    if (e.key === 'Escape') close()
                  }}
                />
              </div>
              <button
                type="button"
                className="wm-delete-btn"
                disabled={!confirmMatches || saving}
                onClick={() => void deleteWorkspace()}
              >
                {saving ? 'Deleting…' : 'Delete Workspace'}
              </button>
            </section>
          ) : null}

          {error ? <p className="wm-error">{error}</p> : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

const MANAGE_CSS = `
.wm-sheet {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
  font-family: 'Aeonik', system-ui, sans-serif;
}
.wm-sheet.is-visible { opacity: 1; pointer-events: auto; }
.wm-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 18, 28, 0.32);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
}
.wm-card {
  position: relative;
  width: min(520px, 100%);
  max-height: min(860px, 92vh);
  overflow: auto;
  padding: 24px 22px 20px;
  border-radius: 16px;
  background: #FBF7EE;
  border: 1px solid rgba(30, 30, 32, 0.06);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.14);
  transform: translateY(10px);
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  scrollbar-width: thin;
}
.wm-sheet.is-visible .wm-card { transform: translateY(0); }
.wm-sheet[data-theme="dark"] .wm-card {
  background: #0E0E10;
  border-color: rgba(255, 255, 255, 0.08);
}
.wm-sheet[data-theme="read"] .wm-card { background: #FAF7F0; }

.wm-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.wm-head-mark {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wm-title {
  margin: 0;
  font-size: 20px;
  font-weight: 400;
  letter-spacing: -0.025em;
  color: #1e1e20;
  line-height: 1.2;
}
.wm-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: #8891a0;
}
.wm-sheet[data-theme="dark"] .wm-title { color: #E6E8EE; }

.wm-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 18px;
  border-radius: 10px;
  background: rgba(30, 30, 32, 0.05);
}
.wm-sheet[data-theme="dark"] .wm-tabs { background: rgba(255,255,255,0.05); }
.wm-tab {
  flex: 1;
  height: 34px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #8891a0;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.wm-tab.is-active {
  background: #fff;
  color: #1e1e20;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}
.wm-sheet[data-theme="dark"] .wm-tab.is-active {
  background: #1A1A1E;
  color: #E6E8EE;
}
.wm-tab.is-danger.is-active { color: #B42318; }

.wm-help {
  margin: 0 0 14px;
  font-size: 13.5px;
  line-height: 1.5;
  color: #8891a0;
}
.wm-label {
  margin: 14px 0 8px;
  font-size: 12.5px;
  color: #8891a0;
}
.wm-field {
  position: relative;
  display: flex;
  align-items: center;
  height: 46px;
  border-radius: 8px;
  border: 1.5px solid transparent;
  background: transparent;
  transition: border-color .18s ease;
}
.wm-field.is-focused {
  border-color: #5B647D;
}
.wm-input {
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  padding: 0 14px;
  font: inherit;
  font-size: 15px;
  color: inherit;
  outline: none;
}
.wm-badge {
  position: absolute;
  right: 12px;
  color: #34C759;
  font-size: 13px;
}
.wm-badge--bad { color: #FF3B30; }
.wm-sub {
  display: block;
  margin: 8px 0 0;
  font-size: 12.5px;
  color: #8891a0;
  opacity: 0.7;
}
.wm-sub.is-ready { opacity: 1; }
.wm-actions { margin-top: 16px; }

.wm-icon-preview {
  display: flex;
  justify-content: center;
  margin: 4px 0 8px;
}
.wm-chip-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.wm-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: rgba(30,30,32,0.04);
  cursor: pointer;
}
.wm-chip.is-active {
  border-color: rgba(91,100,125,0.45);
  background: rgba(91,100,125,0.08);
}
.wm-sheet[data-theme="dark"] .wm-chip { background: rgba(255,255,255,0.04); }

.wm-template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wm-template {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  padding: 14px 14px;
  border-radius: 10px;
  border: 1px solid rgba(30,30,32,0.08);
  background: #fff;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.wm-sheet[data-theme="dark"] .wm-template {
  background: #151518;
  border-color: rgba(255,255,255,0.08);
}
.wm-template.is-active {
  border-color: #5B647D;
  box-shadow: 0 0 0 1px #5B647D;
}
.wm-template-title {
  font-size: 14.5px;
  color: #1e1e20;
  letter-spacing: -0.015em;
}
.wm-sheet[data-theme="dark"] .wm-template-title { color: #E6E8EE; }
.wm-template-desc {
  font-size: 13px;
  color: #8891a0;
  line-height: 1.4;
}

.wm-section--danger { padding-top: 4px; }
.wm-danger-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.03em;
  color: #1e1e20;
}
.wm-sheet[data-theme="dark"] .wm-danger-title { color: #E6E8EE; }
.wm-danger-lead {
  margin: 0 0 8px;
  font-size: 14.5px;
  color: #8891a0;
}
.wm-danger-list {
  margin: 0 0 12px;
  padding-left: 18px;
  color: #1e1e20;
  font-size: 14.5px;
  line-height: 1.55;
}
.wm-sheet[data-theme="dark"] .wm-danger-list { color: #E6E8EE; }
.wm-danger-warn {
  margin: 0 0 14px;
  font-size: 14px;
  color: #B42318;
}
.wm-delete-btn {
  margin-top: 14px;
  width: 100%;
  height: 44px;
  border: 0;
  border-radius: 8px;
  background: #B42318;
  color: #fff;
  font: inherit;
  font-size: 14.5px;
  cursor: pointer;
}
.wm-delete-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.wm-error {
  margin: 12px 0 0;
  font-size: 13px;
  color: #B42318;
}

@media (max-width: 560px) {
  .wm-card {
    width: 100%;
    max-height: 92vh;
    border-radius: 16px 16px 0 0;
    align-self: flex-end;
  }
  .wm-sheet { align-items: flex-end; padding: 0; }
  .wm-chip-grid { grid-template-columns: repeat(4, 1fr); }
}
`
