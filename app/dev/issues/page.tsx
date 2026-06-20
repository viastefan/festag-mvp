'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowsClockwise, Plus, WarningOctagon } from '@phosphor-icons/react'
import IssueCardRow from '@/components/issues/IssueCardRow'
import IssueCreateModal from '@/components/issues/IssueCreateModal'
import IssueDrawer from '@/components/issues/IssueDrawer'
import { CLIENT_DELIVERABLES_CSS } from '@/components/client/client-deliverables-styles'
import { createClient } from '@/lib/supabase/client'
import type { Issue, ProjectLite } from '@/components/issues/issues-shared'

import { isOpenIssueStatus } from '@/lib/issues/types'

function DevIssuesInner() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const [issues, setIssues] = useState<Issue[]>([])
  const [projects, setProjects] = useState<Record<string, ProjectLite>>({})
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(searchParams?.get('new') === '1')
  const [openId, setOpenId] = useState<string | null>(searchParams?.get('open') || null)
  const [filter, setFilter] = useState<'open' | 'all'>('open')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/issues?limit=200', { credentials: 'include' })
    const data = await res.json()
    const rows = (data.issues ?? []) as Issue[]
    setIssues(rows)

    const projectIds = [...new Set(rows.map(r => r.project_id).filter(Boolean))] as string[]
    if (projectIds.length > 0) {
      const { data: projs } = await supabase.from('projects').select('id,title,color').in('id', projectIds)
      const map: Record<string, ProjectLite> = {}
      for (const p of (projs as any[]) ?? []) map[p.id] = { id: p.id, title: p.title, color: p.color }
      setProjects(map)
    } else {
      setProjects({})
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => {
    const list = filter === 'open' ? issues.filter(i => isOpenIssueStatus(i.status)) : issues
    return list.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
  }, [issues, filter])

  const openIssue = useMemo(() => issues.find(i => i.id === openId) ?? null, [issues, openId])

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 960, margin: '0 auto' }}>
      <style>{CLIENT_DELIVERABLES_CSS}</style>

      <header style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
            <WarningOctagon size={22} /> Vorfälle
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
            Bugs und Blocker — Tagro entscheidet, was der Client sieht (nur bei hoher Relevanz).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setCreateOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: 0, background: 'var(--accent)', color: 'var(--accent-text)', cursor: 'pointer', fontSize: 13 }}>
            <Plus size={16} /> Neu
          </button>
          <button type="button" onClick={() => void load()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
            <ArrowsClockwise size={16} />
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['open', 'all'] as const).map(f => (
          <button key={f} type="button" className={`cd-tab${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'open' ? 'Offen' : 'Alle'}
          </button>
        ))}
        <Link href="/dev/visibility" style={{ marginLeft: 'auto', fontSize: 13, alignSelf: 'center', color: 'var(--text-muted)' }}>
          Kunden-Sicht →
        </Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Lade Vorfälle…</p>
      ) : visible.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Keine Vorfälle — alles ruhig.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map((issue, i) => (
            <IssueCardRow
              key={issue.id}
              issue={issue}
              project={issue.project_id ? projects[issue.project_id] ?? null : null}
              isLast={i === visible.length - 1}
              onOpen={id => setOpenId(id)}
            />
          ))}
        </div>
      )}

      {createOpen && (
        <IssueCreateModal
          open
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); void load() }}
        />
      )}
      {openIssue && (
        <IssueDrawer
          issue={openIssue}
          project={openIssue.project_id ? projects[openIssue.project_id] ?? null : null}
          onClose={() => setOpenId(null)}
          onPatch={() => void load()}
        />
      )}
    </div>
  )
}

export default function DevIssuesPage() {
  return (
    <Suspense fallback={<p style={{ padding: 24, color: 'var(--text-muted)' }}>Vorfälle werden geladen…</p>}>
      <DevIssuesInner />
    </Suspense>
  )
}
