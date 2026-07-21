/**
 * Extract privacy-safe Operational DNA patterns from a decided decision.
 * Aggregates only — never stores free-text answers, names, or emails.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  readAdaptiveIntelligenceSettings,
} from '@/lib/intelligence/okm'
import {
  loadWorkspaceAdaptiveSettings,
  upsertOkmFact,
} from '@/lib/intelligence/okm-store'

type DecisionSnap = {
  id: string
  project_id: string
  decision_type?: string | null
  authority?: string | null
  response_type?: string | null
  response_value?: unknown
  status?: string | null
  reversibility?: string | null
}

const TYPE_LABELS: Record<string, string> = {
  scope: 'Scope',
  budget: 'Budget',
  direction: 'Richtung / Strategie',
  approval: 'Freigaben',
  risk_response: 'Risiken',
  tradeoff: 'Trade-offs',
  clarification: 'Klärungen',
  escalation: 'Eskalationen',
  legal: 'Rechtliches',
  payment: 'Zahlungen',
  contract: 'Verträge',
  data_protection: 'Datenschutz',
}

function sanitizeKeyPart(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || 'unknown'
}

function binaryOutcome(responseValue: unknown): 'yes' | 'no' | null {
  if (!responseValue || typeof responseValue !== 'object') return null
  const v = (responseValue as { binary_value?: unknown }).binary_value
  if (v === 'yes' || v === 'no') return v
  return null
}

/**
 * After a decision is recorded as decided/applied — learn workspace patterns.
 * Best-effort: never throws to callers.
 */
export async function extractOkmFromDecidedDecision(
  db: SupabaseClient,
  decision: DecisionSnap,
): Promise<{ wrote: number; skipped?: string }> {
  try {
    const { data: project } = await (db as any)
      .from('projects')
      .select('id, workspace_id')
      .eq('id', decision.project_id)
      .maybeSingle()

    const workspaceId = project?.workspace_id as string | undefined
    if (!workspaceId) return { wrote: 0, skipped: 'no_workspace' }

    const settings = readAdaptiveIntelligenceSettings(
      await loadWorkspaceAdaptiveSettings(db, workspaceId),
    )
    if (!settings.adaptive_intelligence_enabled) {
      return { wrote: 0, skipped: 'adaptive_off' }
    }
    if (!settings.adaptive_cross_project_patterns) {
      return { wrote: 0, skipped: 'cross_project_off' }
    }

    let wrote = 0
    const evidence = [decision.id]
    const dtype = decision.decision_type ? sanitizeKeyPart(decision.decision_type) : null
    const authority = decision.authority ? sanitizeKeyPart(decision.authority) : null

    if (dtype) {
      const label = TYPE_LABELS[decision.decision_type || ''] || decision.decision_type || dtype
      await upsertOkmFact(db, {
        workspaceId,
        factKey: `decision.type.${dtype}`,
        domain: 'decision',
        dnaKind: 'decision',
        claim: `In diesem Workspace werden häufig Entscheidungen zu ${label} getroffen.`,
        confidence: 0.42,
        evidenceIds: evidence,
        source: 'observation',
      })
      wrote += 1
    }

    if (authority) {
      const authLabel =
        authority === 'client' ? 'Kunden'
          : authority === 'owner' ? 'Workspace-Owner'
            : authority === 'client_and_owner' ? 'Kunde und Owner gemeinsam'
              : authority === 'dev' ? 'Entwicklung'
                : authority
      await upsertOkmFact(db, {
        workspaceId,
        factKey: `decision.authority.${authority}`,
        domain: 'decision',
        dnaKind: 'decision',
        claim: `Entscheidungen werden hier oft von ${authLabel} getroffen oder freigegeben.`,
        confidence: 0.4,
        evidenceIds: evidence,
        source: 'observation',
      })
      wrote += 1
    }

    const binary = binaryOutcome(decision.response_value)
    if (binary && dtype) {
      await upsertOkmFact(db, {
        workspaceId,
        factKey: `decision.binary.${dtype}.${binary}`,
        domain: 'quality',
        dnaKind: 'quality',
        claim: binary === 'yes'
          ? `Bei ${TYPE_LABELS[decision.decision_type || ''] || dtype}-Fragen wird häufig zugestimmt.`
          : `Bei ${TYPE_LABELS[decision.decision_type || ''] || dtype}-Fragen wird häufig abgelehnt oder nachgeschärft.`,
        confidence: 0.38,
        evidenceIds: evidence,
        source: 'observation',
      })
      wrote += 1
    }

    if (decision.reversibility) {
      const rev = sanitizeKeyPart(decision.reversibility)
      const oneWay = rev === 'one_way_door' || rev.includes('one_way')
      await upsertOkmFact(db, {
        workspaceId,
        factKey: `decision.reversibility.${rev}`,
        domain: 'decision',
        dnaKind: 'decision',
        claim: oneWay
          ? 'Viele Entscheidungen werden als schwer umkehrbar eingeordnet — sorgfältige Freigaben sind üblich.'
          : 'Entscheidungen gelten hier oft als später korrigierbar — Tempo vor Perfektion ist möglich.',
        confidence: 0.36,
        evidenceIds: evidence,
        source: 'observation',
      })
      wrote += 1
    }

    // Volume signal for delivery DNA (how often the org closes the loop).
    if (decision.status === 'decided' || decision.status === 'applied') {
      await upsertOkmFact(db, {
        workspaceId,
        factKey: 'decision.lifecycle.resolved',
        domain: 'process',
        dnaKind: 'delivery',
        claim: 'Entscheidungen werden in diesem Workspace regelmäßig abgeschlossen (entschieden/angewendet).',
        confidence: 0.35,
        evidenceIds: evidence,
        source: 'observation',
      })
      wrote += 1
    }

    return { wrote }
  } catch {
    return { wrote: 0, skipped: 'error' }
  }
}
