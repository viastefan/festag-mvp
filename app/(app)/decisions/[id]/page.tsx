'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Clock, Lightning } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { openTagro } from '@/components/TagroOverlay'
import TagroContentFab from '@/components/TagroContentFab'
import MobilePageHeader from '@/components/MobilePageHeader'
import {
  MOCK_DECISIONS,
  MOCK_PROJECTS,
  URGENCY_LABEL,
  URGENCY_TONE,
  fmtAgo,
  type Decision,
  type ProjectLite,
} from '@/components/decisions/decisions-shared'
import { DecisionDrawer } from '@/components/decisions/DecisionDrawer'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'

function DecisionDetailInner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const discussOnLoad = searchParams?.get('discuss') === '1'
  const supabase = useMemo(() => createClient(), [])
  const [decision, setDecision] = useState<Decision | null>(null)
  const [project, setProject] = useState<ProjectLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const mock = MOCK_DECISIONS.find(d => d.id === id)
    if (mock) {
      setDecision(mock)
      setProject(mock.project_id ? MOCK_PROJECTS[mock.project_id] ?? null : null)
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/decisions/${id}?expand=options`, { credentials: 'include' })
      if (!res.ok) {
        setDecision(null)
        setProject(null)
        return
      }
      const data = await res.json()
      setDecision(data.decision ?? null)
      setProject(data.project ?? null)
    } catch {
      setDecision(null)
      setProject(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  function patchLocal(patch: Partial<Decision>) {
    setDecision(curr => (curr ? { ...curr, ...patch } : curr))
  }

  if (loading) {
    return (
      <div className="dec-os dec-os-detail">
        <style>{DECISION_CSS}</style>
        <MobilePageHeader title="Entscheidung" />
        <div className="dec-detail-hero dec-detail-hero--loading">
          <p className="dec-detail-loading">Entscheidung wird geladen…</p>
        </div>
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="dec-os dec-os-detail">
        <style>{DECISION_CSS}</style>
        <MobilePageHeader title="Entscheidung" />
        <div className="dec-detail-empty">
          <p className="dec-detail-empty-title">Entscheidung nicht gefunden.</p>
          <p className="dec-detail-empty-copy">Sie wurde möglicherweise archiviert oder du hast keinen Zugriff.</p>
          <Link href="/decisions" className="dec-detail-back dec-detail-back-btn">
            <ArrowLeft size={16} />
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    )
  }

  const isDecider =
    decision.requested_for === me ||
    (!decision.requested_for && decision.created_by !== me)

  const title = decision.client_title || decision.title
  const subtitle = decision.client_summary || decision.description
  const isAnswered = decision.status === 'decided' || decision.status === 'applied'

  return (
    <div className="dec-os dec-os-detail">
      <style>{DECISION_CSS}</style>

      <MobilePageHeader
        title={title}
        menuItems={[
          {
            id: 'tagro',
            label: 'Mit Tagro bearbeiten',
            onClick: () => openTagro({
              contextType: 'decision',
              id: decision.id,
              title,
              subtitle: project?.title,
            }),
          },
        ]}
      />

      <header className="dec-detail-hero">
        <div className="dec-detail-toolbar">
          <Link href="/decisions" className="dec-detail-back dec-detail-back-desktop">
            <ArrowLeft size={14} weight="regular" />
            Alle Entscheidungen
          </Link>
          <button
            type="button"
            className="dec-detail-tagro-btn"
            onClick={() => openTagro({
              contextType: 'decision',
              id: decision.id,
              title,
              subtitle: project?.title,
            })}
          >
            <Lightning size={14} weight="regular" />
            Mit Tagro bearbeiten
          </button>
        </div>

        <div className="dec-detail-hero-main">
          <div className="dec-detail-hero-text">
            <p className="dec-detail-kicker">Entscheidung</p>
            <h1 className="dec-detail-title">{title}</h1>
            {subtitle && <p className="dec-detail-subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="dec-detail-meta-row">
          {project && (
            <span className="dec-detail-meta-chip">
              <span className="dec-detail-project-dot" style={{ background: project.color || '#5B647D' }} />
              {project.title}
            </span>
          )}
          {decision.decision_type && (
            <span className="dec-detail-meta-chip">{decision.decision_type}</span>
          )}
          <span className={`dec-detail-meta-chip dec-detail-meta-chip--${URGENCY_TONE[decision.urgency] || 'muted'}`}>
            {URGENCY_LABEL[decision.urgency] || 'Normal'}
          </span>
          {isAnswered && (
            <span className="dec-detail-meta-chip dec-detail-meta-chip--good">Entschieden</span>
          )}
          <span className="dec-detail-meta-chip dec-detail-meta-chip--time">
            <Clock size={12} weight="regular" />
            {fmtAgo(decision.updated_at)}
          </span>
        </div>
      </header>

      <DecisionDrawer
        variant="page"
        decision={decision}
        project={project}
        me={me}
        isDecider={isDecider}
        onClose={() => router.push('/decisions')}
        onPatch={patchLocal}
        initialDiscussOpen={discussOnLoad}
      />

      <TagroContentFab
        context={{
          contextType: 'decision',
          id: decision.id,
          title,
          subtitle: project?.title,
        }}
      />
    </div>
  )
}

export default function DecisionDetailPage() {
  return (
    <Suspense fallback={<div className="dec-detail-loading" style={{ padding: 48 }}>Lade…</div>}>
      <DecisionDetailInner />
    </Suspense>
  )
}
