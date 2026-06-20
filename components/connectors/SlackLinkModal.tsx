'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProjectLite = { id: string; title: string }
type SlackChannel = { id: string; name: string; is_private?: boolean }
type SlackLink = {
  id: string
  project_id: string
  project_title: string
  channel_id: string
  channel_name?: string | null
  team_name?: string | null
  last_synced_at?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onChanged?: () => void
}

export default function SlackLinkModal({ open, onClose, onChanged }: Props) {
  const sb = createClient()
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [links, setLinks] = useState<SlackLink[]>([])
  const [projectId, setProjectId] = useState('')
  const [channelId, setChannelId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: projs }, linksRes, channelsRes] = await Promise.all([
        sb.from('projects').select('id,title').is('deleted_at', null).order('updated_at', { ascending: false }).limit(50),
        fetch('/api/slack/links', { credentials: 'include' }),
        fetch('/api/slack/channels', { credentials: 'include' }),
      ])

      setProjects(((projs as ProjectLite[]) ?? []).map(p => ({ id: p.id, title: p.title })))

      const linksData = linksRes.ok ? await linksRes.json().catch(() => null) : null
      setLinks(linksData?.links ?? [])

      if (!channelsRes.ok) {
        const err = await channelsRes.json().catch(() => null)
        throw new Error(err?.error || 'Slack-Channels konnten nicht geladen werden.')
      }
      const channelsData = await channelsRes.json().catch(() => null)
      setChannels(channelsData?.channels ?? [])
    } catch (e: any) {
      setError(e?.message || 'Laden fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [sb])

  useEffect(() => {
    if (!open) return
    setProjectId('')
    setChannelId('')
    setNote(null)
    void load()
  }, [open, load])

  async function saveLink() {
    if (!projectId || !channelId) return
    setSaving(true)
    setError(null)
    setNote(null)
    try {
      const ch = channels.find(c => c.id === channelId)
      const res = await fetch('/api/slack/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projectId,
          channel_id: channelId,
          channel_name: ch?.name,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Verknüpfung fehlgeschlagen')

      setNote(`#${ch?.name || 'channel'} verknüpft — Nachrichten werden als Work Signals importiert.`)
      setProjectId('')
      setChannelId('')
      await load()
      onChanged?.()
    } catch (e: any) {
      setError(e?.message || 'Verknüpfung fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  async function syncSlack() {
    setSyncing(true)
    setError(null)
    setNote(null)
    try {
      const res = await fetch('/api/slack/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Sync fehlgeschlagen')

      const imported = (data?.synced ?? []).reduce(
        (s: number, row: any) => s + (row.signalsImported ?? row.issuesImported ?? 0),
        0,
      )
      setNote(
        imported > 0
          ? `${imported} Slack-Nachricht${imported === 1 ? '' : 'en'} als Work Signals importiert.`
          : 'Sync abgeschlossen — keine neuen Nachrichten.',
      )
      await load()
      onChanged?.()
    } catch (e: any) {
      setError(e?.message || 'Sync fehlgeschlagen')
    } finally {
      setSyncing(false)
    }
  }

  async function removeLink(link: SlackLink) {
    const label = link.channel_name ? `#${link.channel_name}` : link.channel_id
    if (!confirm(`${label} von „${link.project_title}" trennen?`)) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/slack/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ project_id: link.project_id, channel_id: link.channel_id }),
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
            width: 46, height: 46, borderRadius: 12, background: '#4A154B', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800,
          }}>
            S
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-.3px' }}>
              Slack Channels verknüpfen
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Nachrichten → Work Signals · Tagro interpretiert sie
            </p>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>Lade Channels…</p>
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
                  SLACK-CHANNEL
                </label>
                <select value={channelId} onChange={e => setChannelId(e.target.value)} style={selectStyle} disabled={channels.length === 0}>
                  <option value="">{channels.length ? 'Channel wählen…' : 'Keine Channels — Bot zum Workspace einladen'}</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id}>
                      #{c.name}{c.is_private ? ' (privat)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => void saveLink()}
                disabled={!projectId || !channelId || saving || syncing}
                style={{
                  flex: 1, padding: '11px',
                  background: projectId && channelId ? '#4A154B' : 'var(--surface-2)',
                  color: projectId && channelId ? '#fff' : 'var(--text-muted)',
                  border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700,
                  cursor: projectId && channelId && !saving ? 'pointer' : 'default',
                  fontFamily: 'inherit', opacity: saving ? .7 : 1,
                }}
              >
                {saving ? 'Speichern…' : 'Verknüpfen'}
              </button>
              <button
                type="button"
                onClick={() => void syncSlack()}
                disabled={links.length === 0 || saving || syncing}
                style={{
                  flex: 1, padding: '11px',
                  background: links.length > 0 ? 'var(--surface-2)' : 'var(--surface-2)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 11, fontSize: 13, fontWeight: 700,
                  cursor: links.length > 0 && !syncing ? 'pointer' : 'default',
                  fontFamily: 'inherit', opacity: syncing ? .7 : 1,
                }}
              >
                {syncing ? 'Sync…' : 'Jetzt syncen'}
              </button>
            </div>

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
                          #{link.channel_name || link.channel_id}
                          {link.last_synced_at ? ` · Sync ${new Date(link.last_synced_at).toLocaleDateString('de-DE')}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeLink(link)}
                        disabled={saving || syncing}
                        style={{
                          flexShrink: 0, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 700,
                          cursor: saving || syncing ? 'default' : 'pointer', fontFamily: 'inherit',
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
