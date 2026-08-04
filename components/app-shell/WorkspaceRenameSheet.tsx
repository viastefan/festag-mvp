'use client'

/**
 * Compact rename sheet — name + live subdomain, Speichern.
 * Opens from sidebar via openWorkspaceRename().
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import { useWorkspaceNameField } from '@/lib/use-workspace-name-field'
import { rememberWorkspaceName } from '@/lib/pending-workspace'
import { createClient } from '@/lib/supabase/client'
import {
  OPEN_WORKSPACE_RENAME_EVENT,
  emitWorkspaceRenamed,
  type WorkspaceRenameDetail,
} from '@/lib/workspace-create-open'
import { workspaceSubdomainPreview } from '@/lib/platform/workspace-creation'
import { getTheme, parseThemeEventDetail, type PanelThemeMode } from '@/lib/theme'

export default function WorkspaceRenameSheet() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [workspaceId, setWorkspaceId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [themeMode, setThemeMode] = useState<PanelThemeMode>(() => getTheme('client'))
  const [fieldFocused, setFieldFocused] = useState(false)

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
    enabled: open,
    excludeId: workspaceId || null,
  })

  const subdomain = workspaceSubdomainPreview(displayName || workspaceName)
  const hasName = Boolean(displayName)
  const dataTheme = themeMode === 'dark' ? 'dark' : themeMode === 'read' ? 'read' : 'light'

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<WorkspaceRenameDetail>).detail || {}
      void openSheet(detail)
    }
    window.addEventListener(OPEN_WORKSPACE_RENAME_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_WORKSPACE_RENAME_EVENT, onOpen)
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

  async function openSheet(detail: WorkspaceRenameDetail) {
    setError('')
    setSaving(false)
    setThemeMode(getTheme('client'))
    setOpen(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login?next=/overview'
        return
      }

      let id = detail.workspaceId || ''
      let seed = detail.name || ''

      if (!id || !seed) {
        const { data: owned } = await supabase
          .from('workspaces')
          .select('id, name')
          .eq('primary_owner_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        id = id || owned?.id || ''
        seed = seed || (typeof owned?.name === 'string' ? owned.name : '')
      }

      setWorkspaceId(id)
      if (seed) hydrate(seed)
      else setWorkspaceName('')
      window.setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 120)
    } catch {
      setError('Workspace konnte nicht geladen werden.')
    }
  }

  function close() {
    if (saving) return
    setVisible(false)
    window.setTimeout(() => setOpen(false), 200)
  }

  async function save() {
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
      rememberWorkspaceName(nextName)
      emitWorkspaceRenamed({ name: nextName, id: data.workspace?.id })
      setSaving(false)
      close()
    } catch {
      setError('Netzwerkproblem. Bitte erneut versuchen.')
      setSaving(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className={`wr-sheet${visible ? ' is-visible' : ''}`}
      data-theme={dataTheme}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wr-title"
    >
      <style>{SHEET_CSS}</style>
      <button type="button" className="wr-backdrop" aria-label="Schließen" onClick={close} />
      <div className="wr-card">
        <h2 id="wr-title" className="wr-title">
          Workspace umbenennen
        </h2>

        <div
          className={[
            'wr-field',
            hasName ? 'has-value' : '',
            fieldFocused ? 'is-focused' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <input
            ref={inputRef}
            className="wr-input"
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
                void save()
              }
              if (e.key === 'Escape') close()
            }}
          />
          {availability === 'available' && displayName ? (
            <span className="wr-badge" title="Verfügbar">✓</span>
          ) : (availability === 'taken' || availability === 'invalid') && displayName ? (
            <span className="wr-badge wr-badge--bad" title={availabilityMsg || 'Vergeben'}>✕</span>
          ) : null}
        </div>
        <span className={`wr-sub${displayName ? ' is-ready' : ''}`}>{subdomain}</span>

        {error ? <p className="wr-error">{error}</p> : null}

        <div className="wr-actions">
          <ContinueHint
            ready={ready && !saving}
            label={saving ? 'Speichern…' : 'Speichern'}
            onContinue={() => void save()}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}

const SHEET_CSS = `
.wr-sheet {
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
.wr-sheet.is-visible {
  opacity: 1;
  pointer-events: auto;
}
.wr-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 18, 28, 0.28);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
}
.wr-card {
  position: relative;
  width: min(420px, 100%);
  padding: 28px 24px 22px;
  border-radius: 16px;
  background: #FBF7EE;
  border: 1px solid rgba(30, 30, 32, 0.06);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.14);
  transform: translateY(10px);
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.wr-sheet.is-visible .wr-card {
  transform: translateY(0);
}
.wr-sheet[data-theme="dark"] .wr-card {
  background: #0E0E10;
  border-color: rgba(255, 255, 255, 0.08);
}
.wr-sheet[data-theme="read"] .wr-card {
  background: #FAF7F0;
}
.wr-title {
  margin: 0 0 18px;
  font-size: 26px;
  line-height: 1.25;
  font-weight: 400;
  letter-spacing: 0.006em;
  color: #1A1917;
}
.wr-sheet[data-theme="dark"] .wr-title {
  color: rgba(245, 245, 247, 0.96);
}
.wr-field {
  position: relative;
  display: flex;
  align-items: center;
  height: 46px;
  padding: 0 40px 0 16px;
  border-radius: 8px;
  border: 2px solid rgba(30, 30, 32, 0.15);
  background: transparent;
}
.wr-field.is-focused,
.wr-field.has-value {
  border-color: #5B647D;
}
.wr-sheet[data-theme="dark"] .wr-field {
  border-color: rgba(255, 255, 255, 0.15);
}
.wr-sheet[data-theme="dark"] .wr-field.is-focused,
.wr-sheet[data-theme="dark"] .wr-field.has-value {
  border-color: #5B647D;
}
.wr-input {
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
  outline: none;
  font: inherit;
  font-size: 17px;
  color: #1A1917;
}
.wr-sheet[data-theme="dark"] .wr-input {
  color: rgba(245, 245, 247, 0.96);
}
.wr-badge {
  position: absolute;
  right: 14px;
  font-size: 13px;
  color: #1A1917;
}
.wr-badge--bad { color: #c45c5c; }
.wr-sheet[data-theme="dark"] .wr-badge { color: rgba(245,245,247,0.9); }
.wr-sub {
  display: block;
  margin-top: 10px;
  font-size: 13.5px;
  color: #8891a0;
  opacity: 0.85;
}
.wr-sub.is-ready { opacity: 1; }
.wr-error {
  margin: 12px 0 0;
  font-size: 13.5px;
  color: #c45c5c;
}
.wr-actions {
  margin-top: 22px;
}
.wr-sheet .mob-continue-btn {
  width: 100%;
  height: 46px;
  border-radius: 8px;
}
`
