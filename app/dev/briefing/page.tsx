'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowsClockwise, Eye, Microphone, PaperPlaneTilt, Sparkle } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { CLIENT_DELIVERABLES_CSS } from '@/components/client/client-deliverables-styles'
import { DEV_MOBILE_PAGE_CSS } from '@/components/dev/dev-mobile-page-styles'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'

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
  const [isDemo, setIsDemo] = useState(false)

  const DEMO_DRAFT = 'Hero-Video V3 hochgeladen und zur Client-Freigabe bereit. Login-Flow mobile gefixt — Review läuft. Morgen: API-Blocker mit PO klären.'
  const DEMO_PREVIEW = 'Das Team hat das neue Homepage-Video geliefert und wartet auf deine Freigabe. Der Login auf Mobile wurde verbessert; der nächste Schritt ist die interne Prüfung.'

  const activePrompt = prompts.find(p => p.state === 'pending' || p.state === 'open') ?? prompts[0]
  const projectTitle = projects.find(p => p.id === activePrompt?.project_id)?.title ?? 'Projekt'
  const canSubmit = !!draft.trim() && !busy && (isDemo ? false : prompts.length > 0)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setProjects([{ id: 'demo-premium-relaunch', title: 'Premium Relaunch' }])
      setPrompts([{ id: 'demo-prompt', project_id: 'demo-premium-relaunch', prompt_date: '', state: 'open' }])
      setDraft(DEMO_DRAFT)
      setPreview(DEMO_PREVIEW)
      setIsDemo(true)
      setLoading(false)
      return
    }
    setIsDemo(false)

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
    if (!draft.trim()) return
    if (isDemo) {
      setPreview(DEMO_PREVIEW)
      return
    }
    if (!activePrompt?.project_id) return
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
    if (!draft.trim()) return
    if (isDemo) return
    if (prompts.length === 0) return
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
    <div className="dmp-page dev-page">
      <style>{CLIENT_DELIVERABLES_CSS}{DEV_MOBILE_PAGE_CSS}</style>

      <header className="dmp-head">
        <p className="dmp-kicker">Dev Panel</p>
        <h1 className="dmp-title">
          <Sparkle size={22} weight="regular" />
          Tagesbriefing
        </h1>
        <p className="dmp-lead">
          Tagro übersetzt deinen Stand für den Client — jede Zeile landet im Projektverlauf und im Statusbericht.
        </p>
      </header>

      {isDemo && <DemoPreviewBanner note="Beispiel-Briefing — so übersetzt Tagro deinen Stand für den Client." />}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Lade…</p>
      ) : done ? (
        <div className="dmp-card cd-card">
          <p style={{ margin: 0, fontSize: 15 }}>Briefing gesendet. Der Client sieht den übersetzten Stand in Berichten und Posteingang.</p>
          <div className="dmp-done-links">
            <Link href="/dev/visibility" className="dmp-link">Kunden-Sicht ansehen →</Link>
            <button type="button" className="dmp-link-muted" onClick={() => router.push('/dev')}>
              Zurück zum Überblick
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="dmp-card cd-card">
            <p className="dmp-card-meta">
              {prompts.length > 0
                ? `Heute · ${projectTitle}${prompts.length > 1 ? ` (+${prompts.length - 1} weitere)` : ''}`
                : 'Kein offener Prompt — du kannst trotzdem einen Stand senden.'}
            </p>
            <textarea
              className="dmp-textarea"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Was hast du heute geschafft? Was kommt als Nächstes? Gibt es Blocker?"
              rows={6}
            />
            <div className="dmp-actions dmp-actions--inline">
              <button type="button" className="dmp-btn dmp-btn-ghost" disabled={!draft.trim() || busy} onClick={() => void previewClient()}>
                <Eye size={16} /> Client-Vorschau
              </button>
              <button type="button" className="dmp-btn dmp-btn-primary" disabled={!canSubmit} onClick={() => void submitBriefing()}>
                <PaperPlaneTilt size={16} weight="fill" /> {busy ? 'Sende…' : isDemo ? 'Beispiel — Anmeldung nötig' : 'An Tagro senden'}
              </button>
              <button type="button" className="dmp-btn dmp-btn-ghost dmp-btn-icon" aria-label="Neu laden" onClick={() => void load()}>
                <ArrowsClockwise size={16} />
              </button>
            </div>
          </div>

          {preview && (
            <div className="dmp-card dmp-preview-card cd-card">
              <p className="dmp-preview-label">So sieht der Client es</p>
              <p className="dmp-preview-body">{preview}</p>
            </div>
          )}

          <p className="dmp-tip">
            <Microphone size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Tipp: Im Überblick kannst du das Briefing auch per Sprache diktieren.</span>
          </p>

          <div className="dmp-sticky-bar" role="toolbar" aria-label="Briefing senden">
            <button type="button" className="dmp-btn dmp-btn-ghost dmp-btn-icon" aria-label="Neu laden" onClick={() => void load()}>
              <ArrowsClockwise size={16} />
            </button>
            <button type="button" className="dmp-btn dmp-btn-ghost" disabled={!draft.trim() || busy} onClick={() => void previewClient()}>
              <Eye size={16} /> Vorschau
            </button>
            <button type="button" className="dmp-btn dmp-btn-primary" disabled={!canSubmit} onClick={() => void submitBriefing()}>
              <PaperPlaneTilt size={16} weight="fill" /> {busy ? 'Sende…' : 'Senden'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
