'use client'

/**
 * Load open Decision Engine / Feature Action Cards and map them onto
 * Statusbericht sentences (Scenario 1 + 18).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'
import type { StatusSentenceAction } from '@/components/status/StatusSentenceActionCard'
import {
  decisionToSentenceAction,
  demoBriefingDecisionActions,
  mapActionsToSentences,
  type BriefingDecisionLite,
} from '@/lib/briefing/sentence-decision-actions'

export function useStatusSentenceActions(sentences: string[], enabled = true) {
  const [actions, setActions] = useState<StatusSentenceAction[]>([])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    ;(async () => {
      try {
        const sb = createClient()
        const {
          data: { user },
        } = await sb.auth.getUser()
        if (!user || cancelled) return

        const { data: rows } = await (sb as any)
          .from('decisions')
          .select(
            'id,title,client_title,client_summary,description,response_type,recommended_option,options_json,status,decision_type',
          )
          .eq('requested_for', user.id)
          .in('status', DECISION_OPEN_STATUS_LIST as unknown as string[])
          .order('updated_at', { ascending: false })
          .limit(4)

        if (cancelled) return
        const list = (Array.isArray(rows) ? rows : []) as BriefingDecisionLite[]
        setActions(
          list.length > 0
            ? list.map(decisionToSentenceAction)
            : demoBriefingDecisionActions(),
        )
      } catch {
        if (!cancelled) setActions(demoBriefingDecisionActions())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled])

  const sentenceActions = useMemo(
    () => mapActionsToSentences(sentences, actions),
    [sentences, actions],
  )

  const dismissAction = useCallback((id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const prependAction = useCallback((action: StatusSentenceAction) => {
    setActions((prev) => [action, ...prev.filter((a) => a.id !== action.id)].slice(0, 4))
  }, [])

  return {
    actions,
    sentenceActions,
    dismissAction,
    prependAction,
    setActions,
  }
}
