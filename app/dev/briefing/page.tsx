'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowsClockwise, Eye, Microphone, PaperPlaneTilt, Sparkle } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { CLIENT_DELIVERABLES_CSS } from '@/components/client/client-deliverables-styles'

type DailyPrompt = { id: string; project_id: string | null; prompt_date: string; state: string }
type Project = { id: string; title: string }

export default function DevBriefingPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [prompts, setPrompts] = useState<DailyPrompt[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [draft, setDraft] = useState('')
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  const activePrompt = prompts.find(p => p.state === 'pending' || p.state === 'open') ?? prompts[0]
  const projectTitle = projects.find(p => p.id === activePrompt?.project_id)?.title ?? 'Projekt'

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: pa } = await supabase.from('project_assignments')
      .select('project_id, projects(id,title)')
      .eq('user_id', user.id).eq('active', true)

    const projs = ((pa as any[]) ?? []).map(a => a.projects).filter(Boolean) as Project[]
    setProjects(projs)

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const { data: promptRows } = await (supabase as any)
      .from('dev_daily_prompts')
      .select('id,project_id,prompt_date,state')
      .eq('developer_id', user.id)
      .eq('prompt_date', today)
      .order('created_at', { ascending: true })

    setPrompts(((promptRows as any[]) ?? []) as DailyPrompt[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  async function previewClient() {
    if (!draft.trim() || !activePrompt?.project_id) return
    const res = await fetch('/api/dev/publish-to-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ projectId: activePrompt.project_id, text: draft.trim(), preview: true }),
    })
    const data = await res.json()
    if (res.ok) setPreview(data.clientSummary || '')
  }

  async function submitBriefing() {
    if (!draft.trim() || prompts.length === 0) return
    setBusy(true)
    try {
      await Promise.all(prompts.map(p => fetch('/api/dev/daily-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ promptId: p.id, text: draft.trim() }),
      })))
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 720, margin: '0 auto' }}>
      <style>{CLIENT_DELIVERABLES_CSS}</style>

      <header style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkle size={22} /> Tagesbriefing
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
          Tagro übersetzt deinen Stand für den Client — jede Zeile landet im Projektverlauf und im Statusbericht.
        </p>
      </header>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Lade…</p>
      ) : done ? (
        <div className="cd-card" style={{ padding: 20 }}>
          <p style={{ margin: 0, fontSize: 15 }}>Briefing gesendet. Der Client sieht den übersetzten Stand in Berichten und Posteingang.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <Link href="/dev/visibility" style={{ fontSize: 13, color: 'var(--accent)' }}>Kunden-Sicht ansehen →</Link>
            <button type="button" onClick={() => router.push('/dev')} style={{ fontSize: 13, border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
              Zurück zum Überblick
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="cd-card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)' }}>
              {prompts.length > 0
                ? `Heute · ${projectTitle}${prompts.length > 1 ? ` (+${prompts.length - 1} weitere)` : ''}`
                : 'Kein offener Prompt — du kannst trotzdem einen Stand senden.'}
            </p>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Was hast du heute geschafft? Was kommt als Nächstes? Gibt es Blocker?"
              rows={6}
              style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', padding: 12, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" disabled={!draft.trim() || busy} onClick={() => void previewClient()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', opacity: !draft.trim() ? 0.5 : 1 }}>
                <Eye size={16} /> Client-Vorschau
              </button>
              <button type="button" disabled={!draft.trim() || busy || prompts.length === 0} onClick={() => void submitBriefing()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 0, background: 'var(--accent)', color: 'var(--accent-text)', cursor: 'pointer', opacity: !draft.trim() || prompts.length === 0 ? 0.5 : 1 }}>
                <PaperPlaneTilt size={16} weight="fill" /> {busy ? 'Sende…' : 'An Tagro senden'}
              </button>
              <button type="button" onClick={() => void load()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                <ArrowsClockwise size={16} />
              </button>
            </div>
          </div>

          {preview && (
            <div className="cd-card" style={{ padding: 20, marginBottom: 16, borderColor: 'color-mix(in srgb, var(--accent) 35%, var(--border))' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>So sieht der Client es</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{preview}</p>
            </div>
          )}

          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <Microphone size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            Tipp: Im Überblick kannst du das Briefing auch per Sprache diktieren.
          </p>
        </>
      )}
    </div>
  )
}
