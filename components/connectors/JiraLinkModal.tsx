'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProjectLite = { id: string; title: string }
type JiraProject = { id: string; key: string; name: string }
type JiraLink = {
  id: string
  project_id: string
  project_title: string
  jira_site: string
  jira_project_id: string
  jira_project_key?: string | null
  jira_project_name?: string | null
  last_synced_at?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onChanged?: () => void
}

export default function JiraLinkModal({ open, onClose, onChanged }: Props) {
  const sb = createClient()
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([])
  const [links, setLinks] = useState<JiraLink[]>([])
  const [jiraSite, setJiraSite] = useState('')
  const [projectId, setProjectId] = useState('')
  const [jiraProjectId, setJiraProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: projs }, linksRes, jiraRes] = await Promise.all([
        sb.from('projects').select('id,title').is('deleted_at', null).order('updated_at', { ascending: false }).limit(50),
        fetch('/api/jira/links', { credentials: 'include' }),
        fetch('/api/jira/projects', { credentials: 'include' }),
      ])

      setProjects(((projs as ProjectLite[]) ?? []).map(p => ({ id: p.id, title: p.title })))

      const linksData = linksRes.ok ? await linksRes.json().catch(() => null) : null
      setLinks(linksData?.links ?? [])

      if (!jiraRes.ok) {
        const err = await jiraRes.json().catch(() => null)
        throw new Error(err?.error || 'Jira-Projekte konnten nicht geladen werden.')
      }
      const jiraData = await jiraRes.json().catch(() => null)
      setJiraProjects(jiraData?.projects ?? [])
      setJiraSite(jiraData?.site ?? '')
    } catch (e: any) {
      setError(e?.message || 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [sb])

  useEffect(() => {
    if (!open) return
    setProjectId('')
    setJiraProjectId('')
    setNote(null)
    void load()
  }, [open, load])

  async function saveLink() {
    if (!projectId || !jiraProjectId) return
    setSaving(true)
    setError(null)
    setNote(null)
    try {
      const jp = jiraProjects.find(p => p.id === jiraProjectId)
      const res = await fetch('/api/jira/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projectId,
          jira_project_id: jiraProjectId,
          jira_project_key: jp?.key,
          jira_project_name: jp?.name,
          jira_site: jiraSite,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Verknüpfung fehlgeschlagen')

      setNote(`${jp?.name || jp?.key || 'Projekt'} verknüpft — Issues unter /issues synchronisieren.`)
      setProjectId('')
      setJiraProjectId('')
      await load()
      onChanged?.()
    } catch (e: any) {
      setError(e?.message || 'Verknüpfung fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  async function removeLink(link: JiraLink) {
    const label = link.jira_project_name || link.jira_project_key || link.jira_project_id
    if (!confirm(`${label} von „${link.project_title}" trennen?`)) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/jira/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: link.project_id,
          jira_project_id: link.jira_project_id,
          jira_site: link.jira_site,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Trennen fehlgeschlagen')
      }
      await load()
      onChanged?.()
    } catch (e: any) {
      setError(e?.message || 'Trennen fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 13px',
    background: 'var(--bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 10,
    fontSize: 13,
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18,
          padding: 24, maxWidth: 480, width: '100%', boxShadow: '0 30px 80px rgba(0,0,0,.3)',
          maxHeight: 'min(90vh, 720px)', overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, background: '#0052CC', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800,
          }}>
            J
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-.3px' }}>
              Jira Projekte verknüpfen
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {jiraSite ? `${jiraSite} · ` : ''}Issues sync unter /issues
            </p>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>Lade Jira-Projekte…</p>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.07em', display: 'block', marginBottom: 6 }}>
                  FESTAG-PROJEKT
                </label>
                <select value={projectId} onChange={e => setProjectId(e.target.value)} style={selectStyle}>
                  <option value="">Projekt wählen…</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.07em', display: 'block', marginBottom: 6 }}>
                  JIRA-PROJEKT
                </label>
                <select value={jiraProjectId} onChange={e => setJiraProjectId(e.target.value)} style={selectStyle} disabled={jiraProjects.length === 0}>
                  <option value="">{jiraProjects.length ? 'Jira-Projekt wählen…' : 'Keine Projekte gefunden'}</option>
                  {jiraProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void saveLink()}
              disabled={!projectId || !jiraProjectId || saving}
              style={{
                width: '100%', padding: '11px', marginBottom: 16,
                background: projectId && jiraProjectId ? '#0052CC' : 'var(--surface-2)',
                color: projectId && jiraProjectId ? '#fff' : 'var(--text-muted)',
                border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700,
                cursor: projectId && jiraProjectId && !saving ? 'pointer' : 'default',
                fontFamily: 'inherit', opacity: saving ? .7 : 1,
              }}
            >
              {saving ? 'Speichern…' : 'Projekt verknüpfen'}
            </button>

            {links.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.07em', margin: '0 0 8px' }}>
                  VERKNÜPFUNGEN
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {links.map(link => (
                    <div
                      key={link.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {link.project_title}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                          {link.jira_project_name || link.jira_project_key || link.jira_project_id}
                          {link.last_synced_at ? ` · Sync ${new Date(link.last_synced_at).toLocaleDateString('de-DE')}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeLink(link)}
                        disabled={saving}
                        style={{
                          flexShrink: 0, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 700,
                          cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Trennen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <p style={{ fontSize: 12.5, color: '#b91c1c', margin: '0 0 10px', lineHeight: 1.5 }}>{error}</p>
        )}
        {note && (
          <p style={{ fontSize: 12.5, color: '#15803d', margin: '0 0 10px', lineHeight: 1.5 }}>{note}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', padding: '11px', background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 11, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Schließen
        </button>
      </div>
    </div>
  )
}
