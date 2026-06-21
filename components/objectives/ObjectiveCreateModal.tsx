'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Plus } from '@phosphor-icons/react'
import Modal, { ModalButton } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import type { Objective } from '@/lib/objectives/types'
import type { ProjectLite } from '@/components/objectives/ObjectiveCardRow'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (objective: Objective) => void
  defaultProjectId?: string | null
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  fontSize: 13.5,
  color: 'var(--text)',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
}

const labelTextStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--text-muted)',
}

export default function ObjectiveCreateModal({ open, onClose, onCreated, defaultProjectId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setProjectId(defaultProjectId || '')
    setTitle('')
    setDescription('')
    setTargetDate('')
    setError('')
  }, [open, defaultProjectId])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await (supabase as any)
        .from('projects')
        .select('id,title,color')
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(100)
      if (!cancelled) {
        const rows = (data ?? []) as ProjectLite[]
        setProjects(rows)
        if (!projectId && rows[0]?.id) setProjectId(rows[0].id)
      }
    })()
    return () => { cancelled = true }
  }, [open, supabase, projectId])

  async function submit() {
    if (busy || !projectId || !title.trim()) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || null,
          target_date: targetDate || null,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Ziel konnte nicht erstellt werden')
      onCreated(data.objective)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Ziel konnte nicht erstellt werden')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Ziel anlegen"
      subtitle="Strategisches Ziel für ein Projekt — Tasks können später verknüpft werden."
      footer={(
        <>
          <ModalButton variant="ghost" onClick={onClose}>Abbrechen</ModalButton>
          <ModalButton
            variant="primary"
            disabled={busy || !title.trim() || !projectId}
            loading={busy}
            onClick={() => void submit()}
          >
            <Plus size={12} weight="bold" />
            Ziel anlegen
          </ModalButton>
        </>
      )}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <label style={labelStyle}>
          <span style={labelTextStyle}>Projekt</span>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle}>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Ziel</span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z. B. Mobile App launchen"
            autoFocus
            style={inputStyle}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void submit() } }}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Warum (optional)</span>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Kontext für Team und Tagro"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Zieldatum</span>
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      {error && (
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          background: 'rgba(220,70,70,0.08)',
          border: '1px solid rgba(220,70,70,.2)',
          borderRadius: 10,
          fontSize: 12.5,
          color: 'var(--red,#D14343)',
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}
    </Modal>
  )
}
