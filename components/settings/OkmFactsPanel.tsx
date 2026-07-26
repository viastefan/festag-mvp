'use client'

import { useCallback, useEffect, useState } from 'react'
import type { OkmFactRow } from '@/lib/intelligence/okm-store'

const DOMAIN_LABEL: Record<string, string> = {
  people: 'Personen',
  decision: 'Entscheidungen',
  communication: 'Kommunikation',
  project: 'Projekte',
  workflow: 'Abläufe',
  technical: 'Technik',
  quality: 'Qualität',
  process: 'Prozesse',
}

type Props = {
  workspaceId: string | null
  /** When Adaptive Intelligence master is off — facts may still exist for review/delete. */
  learningEnabled: boolean
  flashSaved: (label: string) => void
  setError: (msg: string) => void
}

export default function OkmFactsPanel({
  workspaceId,
  learningEnabled,
  flashSaved,
  setError,
}: Props) {
  const [facts, setFacts] = useState<OkmFactRow[]>([])
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `/api/intelligence/okm?workspaceId=${encodeURIComponent(workspaceId)}&includeWhenDisabled=1`,
        { credentials: 'include' },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Muster konnten nicht geladen werden.')
      setFacts(Array.isArray(data.facts) ? data.facts : [])
      setLoaded(true)
    } catch (e: any) {
      setError(e?.message || 'Muster konnten nicht geladen werden.')
      setFacts([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId, setError])

  useEffect(() => {
    void load()
  }, [load])

  async function clearAll() {
    if (!workspaceId || clearing) return
    const ok = window.confirm(
      'Alle gelernten Workspace-Muster (Operational DNA) dieses Workspaces unwiderruflich löschen?',
    )
    if (!ok) return
    setClearing(true)
    setError('')
    try {
      const res = await fetch(
        `/api/intelligence/okm?workspaceId=${encodeURIComponent(workspaceId)}`,
        { method: 'DELETE', credentials: 'include' },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Löschen fehlgeschlagen.')
      setFacts([])
      flashSaved('Workspace-Muster gelöscht')
    } catch (e: any) {
      setError(e?.message || 'Löschen fehlgeschlagen.')
    } finally {
      setClearing(false)
    }
  }

  if (!workspaceId) {
    return (
      <div className="set-row set-row-stack">
        <div>
          <div className="set-label">Gelernte Workspace-Muster</div>
          <div className="set-label-sub">Workspace wird noch geladen …</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="set-row set-row-stack">
        <div>
          <div className="set-label">Gelernte Workspace-Muster</div>
          <div className="set-label-sub">
            Aggregierte Operational DNA dieses Workspaces (z. B. aus Entscheidungen). Keine
            Free-Text-Antworten, keine E-Mails. Tagro nutzt sie nur, wenn Workspace-Lernen an ist.
            {!learningEnabled
              ? ' Lernen ist derzeit aus — gespeicherte Muster werden nicht in Tagro eingespeist.'
              : null}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="set-btn" onClick={() => void load()} disabled={loading}>
            {loading ? 'Lädt …' : 'Aktualisieren'}
          </button>
          <button
            type="button"
            className="set-btn set-btn-danger"
            onClick={() => void clearAll()}
            disabled={clearing || (!facts.length && loaded)}
          >
            {clearing ? 'Löscht …' : 'Alle löschen'}
          </button>
        </div>
      </div>

      {loading && !loaded ? (
        <div className="set-row">
          <div className="set-label-sub">Muster werden geladen …</div>
        </div>
      ) : null}

      {!loading && loaded && facts.length === 0 ? (
        <div className="set-row">
          <div className="set-label-sub">
            Noch keine Muster. Sie entstehen, wenn Entscheidungen abgeschlossen werden und Lernen aktiv ist.
          </div>
        </div>
      ) : null}

      {facts.map((fact) => {
        const conf = Math.round(Math.min(1, Math.max(0, Number(fact.confidence) || 0)) * 100)
        const domain = DOMAIN_LABEL[fact.domain] || fact.domain
        const obs = Number(fact.observation_count) || 1
        return (
          <div key={fact.id} className="set-row set-row-stack">
            <div>
              <div className="set-label">{fact.claim}</div>
              <div className="set-label-sub">
                {domain}
                {fact.dna_kind ? `, ${fact.dna_kind}-DNA` : ''}
                {`, ${conf}% Sicherheit`}
                {`, ${obs}× beobachtet`}
              </div>
            </div>
          </div>
        )
      })}
    </>
  )
}
