'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import {
  DECISION_CSS,
  DecisionDrawer,
  MOCK_DECISIONS,
  MOCK_PROJECTS,
  type Decision,
  type ProjectLite,
} from '../page'

function DecisionDetailInner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
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
        <p style={{ padding: 48, color: 'var(--dec-soft)' }}>Entscheidung wird geladen…</p>
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="dec-os dec-os-detail">
        <style>{DECISION_CSS}</style>
        <div className="dec-detail-empty">
          <p>Entscheidung nicht gefunden.</p>
          <Link href="/decisions" className="dec-detail-back">
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

  return (
    <div className="dec-os dec-os-detail">
      <style>{DECISION_CSS}</style>
      <div className="dec-detail-topbar">
        <Link href="/decisions" className="dec-detail-back">
          <ArrowLeft size={16} />
          Alle Entscheidungen
        </Link>
      </div>
      <DecisionDrawer
        variant="page"
        decision={decision}
        project={project}
        me={me}
        isDecider={isDecider}
        onClose={() => router.push('/decisions')}
        onPatch={patchLocal}
      />
    </div>
  )
}

export default function DecisionDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48 }}>Lade…</div>}>
      <DecisionDetailInner />
    </Suspense>
  )
}
