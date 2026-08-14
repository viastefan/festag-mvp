'use client'

/**
 * Die Risiko-Warteschlange des mobilen Dashboards.
 *
 * Quelle sind die echten Risk-Objekte aus der Risk Intelligence (`/api/risks`),
 * inklusive der Signale, aus denen Festag sie abgeleitet hat. Eine Bewertung
 * geht als Maßnahme zurück an `/api/risks/[id]/respond` — daraus entsteht bei
 * „Delegieren" automatisch eine Entscheidung.
 *
 * Solange die Migration noch nicht eingespielt ist (`table_ready: false`),
 * zeigt der Hook ersatzweise blockierte Tasks, damit der Flow nicht leer
 * dasteht. Gespeichert wird in diesem Zustand nichts — es gibt bewusst nur
 * einen Risiko-Speicher, und das ist `risks`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MobileRisk, RiskResult } from '@/components/dashboard/RiskFlowMobile'
import { buildMobileRisk, mobileRiskFromRisk, type RiskSourceTask } from '@/lib/risks/mobile-risk'
import type { Risk, RiskSignal } from '@/lib/risks/types'

/** Auswirkung des Flows (low/mid/high) → Skala des Risk-Objekts. */
const IMPACT_BY_LEVEL = { low: 'low', mid: 'medium', high: 'high' } as const
const PROBABILITY_BY_LEVEL = { low: 'low', mid: 'medium', high: 'high' } as const

/** Die Erkennung läuft höchstens alle zehn Minuten pro Tab. */
const DETECT_INTERVAL_MS = 10 * 60 * 1000
const DETECT_KEY = 'festag:risk-detect-at'

type Options = {
  /** Blockierte Tasks — nur für den Fallback ohne Risk-Tabelle. */
  fallbackTasks: RiskSourceTask[]
  projectTitles?: Record<string, string>
}

export function useMobileRisks({ fallbackTasks, projectTitles = {} }: Options) {
  const [risks, setRisks] = useState<Risk[] | null>(null)
  const [signals, setSignals] = useState<Record<string, RiskSignal[]>>({})
  const [tableReady, setTableReady] = useState(true)
  // Rein optimistisch: was in dieser Sitzung schon beantwortet wurde. Der
  // Serverstand kommt über `responded_at` aus /api/risks zurück.
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set())
  const detectStarted = useRef(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/risks?open=1&with_signals=1', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setTableReady(json.table_ready !== false)
      setRisks(Array.isArray(json.risks) ? json.risks : [])
      setSignals(json.signals ?? {})
    } catch {
      // Offline — die Warteschlange bleibt, was sie war.
    }
  }, [])

  // Erst erkennen lassen, dann laden: neue Signale sollen sofort sichtbar sein.
  useEffect(() => {
    if (detectStarted.current) return
    detectStarted.current = true
    ;(async () => {
      const last = Number(sessionStorage.getItem(DETECT_KEY) || 0)
      if (Date.now() - last > DETECT_INTERVAL_MS) {
        sessionStorage.setItem(DETECT_KEY, String(Date.now()))
        try {
          await fetch('/api/risks/detect', { method: 'POST', credentials: 'include' })
        } catch {
          // Erkennung fehlgeschlagen — vorhandene Risiken zeigen wir trotzdem.
        }
      }
      await load()
    })()
  }, [load])

  const queue: MobileRisk[] = useMemo(() => {
    if (tableReady && risks) {
      return risks
        .filter(r => !r.responded_at && !respondedIds.has(r.id))
        .map(r => mobileRiskFromRisk(r, signals[r.id] ?? []))
    }
    return fallbackTasks
      .filter(t => !respondedIds.has(t.id))
      .map(t => buildMobileRisk(t, t.project_id ? projectTitles[t.project_id] : null))
  }, [tableReady, risks, signals, respondedIds, fallbackTasks, projectTitles])

  const resolve = useCallback(async (riskId: string, result: RiskResult) => {
    // Optimistisch aus der Schlange nehmen, damit der Flow weiterläuft.
    setRespondedIds(prev => new Set(prev).add(riskId))

    // Ohne Risk-Tabelle gibt es kein Objekt, an das die Antwort gehen könnte —
    // die Bewertung bleibt dann bis zur Migration nur in dieser Sitzung.
    const isRealRisk = tableReady && !!risks?.some(r => r.id === riskId)
    if (!isRealRisk) return

    try {
      await fetch(`/api/risks/${riskId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          impact: IMPACT_BY_LEVEL[result.impact],
          probability_level: PROBABILITY_BY_LEVEL[result.probability],
          response: result.measure,
          followed_recommendation: result.source === 'tagro',
        }),
      })
    } catch {
      // Fehlgeschlagen: beim nächsten Laden steht das Risiko wieder an.
    }
    void load()
  }, [tableReady, risks, load])

  return { risks: queue, resolve, reload: load, tableReady }
}
