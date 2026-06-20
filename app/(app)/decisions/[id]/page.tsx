'use client'

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, Clock, Lightning, PencilSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import TagroContentFab from '@/components/TagroContentFab'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import CodexOrbButton from '@/components/mobile/CodexOrbButton'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import {
  MOCK_DECISIONS,
  MOCK_PROJECTS,
  URGENCY_LABEL,
  URGENCY_TONE,
  fmtAgo,
  isOpenDecisionStatus,
  resolveDecisionType,
  type Decision,
  type ProjectLite,
} from '@/components/decisions/decisions-shared'
import DecisionDetailBrief from '@/components/decisions/DecisionDetailBrief'
import { DecisionDrawer, type DecisionMobileDock } from '@/components/decisions/DecisionDrawer'
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
  const [navOpen, setNavOpen] = useState(false)
  const [mobileDock, setMobileDock] = useState<DecisionMobileDock | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  useLayoutEffect(() => {
    document.body.style.overflow = ''
  }, [])

  function goToList() {
    try {
      window.dispatchEvent(new CustomEvent('festag:decisions-dismiss-overlays'))
    } catch { /* noop */ }
    document.body.style.overflow = ''
    router.push('/decisions')
  }

  function prepareListNavigation() {
    try {
      window.dispatchEvent(new CustomEvent('festag:decisions-dismiss-overlays'))
    } catch { /* noop */ }
    document.body.style.overflow = ''
  }

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

  const handleMobileDockChange = useCallback((dock: DecisionMobileDock | null) => {
    setMobileDock(dock)
  }, [])

  if (loading) {
    return (
      <div className="dec-os dec-os-detail">
        <style>{DECISION_CSS}</style>
        <div className="dec-detail-m-shell">
          <p className="dec-detail-loading">Entscheidung wird geladen…</p>
        </div>
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="dec-os dec-os-detail">
        <style>{DECISION_CSS}</style>
        <div className="dec-detail-m-shell">
          <div className="dec-detail-empty">
            <p className="dec-detail-empty-title">Entscheidung nicht gefunden.</p>
            <p className="dec-detail-empty-copy">Sie wurde möglicherweise archiviert oder du hast keinen Zugriff.</p>
            <Link href="/decisions" className="dec-detail-back dec-detail-back-pill">
              <ArrowLeft size={16} />
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isDecider =
    decision.requested_for === me ||
    (!decision.requested_for && decision.created_by !== me)

  const title = decision.client_title || decision.title
  const typeMeta = resolveDecisionType(decision.decision_type)
  const isAnswered = decision.status === 'decided' || decision.status === 'applied'
  const isOpen = isOpenDecisionStatus(decision.status)
  const escalation = decision.escalation_level ?? 0

  const mobileSubtitle = [
    project?.title,
    isAnswered ? 'Entschieden' : isOpen ? 'Offen' : URGENCY_LABEL[decision.urgency] || 'Normal',
  ].filter(Boolean).join(' · ')

  const dockPrimaryIcon = isAnswered
    ? <ArrowLeft size={14} weight="regular" />
    : isDecider && isOpen
      ? <CheckCircle size={14} weight="regular" />
      : <Lightning size={14} weight="regular" />

  return (
    <div className={`dec-os dec-os-detail${mobileDock ? ' dec-os-detail--dock' : ''}`}>
      <style>{DECISION_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-detail-m-shell">
        <header className="dec-detail-m-head">
          <CodexOrbButton ariaLabel="Zurück" onClick={goToList}>
            <ArrowLeft size={20} weight="regular" />
          </CodexOrbButton>
          <div className="dec-detail-m-copy">
            <h1>{title}</h1>
            {mobileSubtitle ? <p>{mobileSubtitle}</p> : null}
          </div>
          <div className="dec-detail-m-head-actions">
            <CodexMobileActionPill
              onMenu={() => setNavOpen(true)}
              onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            />
          </div>
        </header>

        <header className="dec-detail-hero dec-detail-hero-desktop">
          <div className="dec-detail-col">
            <div className="dec-detail-toolbar">
              <Link
                href="/decisions"
                className="dec-detail-back dec-detail-back-pill dec-detail-back-desktop"
                onClick={prepareListNavigation}
              >
                <ArrowLeft size={14} weight="regular" />
                Alle Entscheidungen
              </Link>
            </div>

            <div className="dec-detail-hero-main">
              <div className="dec-detail-hero-text">
                <h1 className="dec-detail-title">{title}</h1>
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
                <span
                  className="dec-detail-meta-chip dec-detail-meta-chip--type"
                  style={{ ['--dec-dot-color' as string]: typeMeta.color }}
                >
                  <span className="dec-detail-project-dot" aria-hidden />
                  {typeMeta.label}
                </span>
              )}
              <span className={`dec-detail-meta-chip dec-detail-meta-chip--${URGENCY_TONE[decision.urgency] || 'muted'}`}>
                {URGENCY_LABEL[decision.urgency] || 'Normal'}
              </span>
              {escalation >= 2 && isOpen && (
                <span className="dec-detail-meta-chip dec-detail-meta-chip--red">
                  {escalation >= 3 ? 'Frist abgelaufen' : 'Eskaliert'}
                </span>
              )}
              {isAnswered && (
                <span className="dec-detail-meta-chip dec-detail-meta-chip--good">Entschieden</span>
              )}
              <span className="dec-detail-meta-chip dec-detail-meta-chip--time">
                <Clock size={12} weight="regular" />
                {fmtAgo(decision.updated_at)}
              </span>
            </div>

            <DecisionDetailBrief decision={decision} project={project} />
          </div>
        </header>

        <div className="dec-detail-m-brief">
          <DecisionDetailBrief decision={decision} project={project} />
        </div>

        <DecisionDrawer
          variant="page"
          mobileDock
          decision={decision}
          project={project}
          me={me}
          isDecider={isDecider}
          onClose={goToList}
          onPatch={patchLocal}
          initialDiscussOpen={discussOnLoad}
          onMobileDockChange={handleMobileDockChange}
        />
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'decision',
            id: decision.id,
            title,
            subtitle: project?.title,
          }}
        />
      </div>

      {mobileDock && (
        <MobilePageDock
          onDragUp={mobileDock.onTagro}
          primary={{
            id: 'primary',
            label: mobileDock.primaryLoading ? 'Speichere…' : mobileDock.primaryLabel,
            icon: dockPrimaryIcon,
            onClick: mobileDock.onPrimary,
            ariaLabel: mobileDock.primaryLabel,
            disabled: mobileDock.primaryDisabled,
          }}
          secondary={{
            id: 'tagro',
            icon: <PencilSimple size={20} weight="bold" />,
            onClick: mobileDock.onTagro,
            ariaLabel: 'Mit Tagro bearbeiten',
          }}
        />
      )}
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
