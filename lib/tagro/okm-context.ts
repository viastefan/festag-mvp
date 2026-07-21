/**
 * Tagro read-path for Operational DNA (OKM facts).
 * Privacy-first: empty when Adaptive Intelligence is off; no people facts
 * unless personal profiles are opted in.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  readAdaptiveIntelligenceSettings,
  type AdaptiveIntelligenceSettings,
} from '@/lib/intelligence/okm'
import {
  listOkmFacts,
  loadWorkspaceAdaptiveSettings,
  type OkmFactRow,
} from '@/lib/intelligence/okm-store'

export type TagroOkmContext = {
  workspaceId: string | null
  settings: AdaptiveIntelligenceSettings
  facts: OkmFactRow[]
  /** Ready-to-append prompt block, or empty string when gated/off. */
  promptBlock: string
}

const EMPTY_SETTINGS = readAdaptiveIntelligenceSettings(null)

export function emptyTagroOkmContext(): TagroOkmContext {
  return {
    workspaceId: null,
    settings: EMPTY_SETTINGS,
    facts: [],
    promptBlock: '',
  }
}

function formatOkmPromptBlock(facts: OkmFactRow[]): string {
  if (!facts.length) return ''
  const lines = facts.map((f) => {
    const conf = Math.round(Math.min(1, Math.max(0, Number(f.confidence) || 0)) * 100)
    const dna = f.dna_kind ? `, ${f.dna_kind}-DNA` : ''
    return `- [${f.domain}${dna}, ${conf}%] ${f.claim}`
  })
  return [
    'Workspace Operational DNA (Adaptive Intelligence — nur dieses Workspace):',
    'Nutze diese Muster als Orientierung für Ton, Prioritäten und Entscheidungsstil. Erfinde keine Personenprofile und zitiere keine Rohdaten.',
    ...lines,
  ].join('\n')
}

/**
 * Load privacy-gated OKM facts for a workspace.
 * Safe for Tagro prompts — never throws; returns empty on failure/opt-out.
 */
export async function loadTagroOkmContext({
  sb,
  workspaceId,
  limit = 10,
}: {
  sb: SupabaseClient<any>
  workspaceId: string | null | undefined
  limit?: number
}): Promise<TagroOkmContext> {
  if (!workspaceId) return emptyTagroOkmContext()

  try {
    const settings = readAdaptiveIntelligenceSettings(
      await loadWorkspaceAdaptiveSettings(sb, workspaceId),
    )
    if (!settings.adaptive_intelligence_enabled) {
      return {
        workspaceId,
        settings,
        facts: [],
        promptBlock: '',
      }
    }

    let facts = await listOkmFacts(sb, workspaceId, { limit: Math.max(limit, 16) })
    if (!settings.adaptive_personal_profiles) {
      facts = facts.filter((f) => !f.subject_user_id && f.domain !== 'people')
    }
    // Prefer decision/quality/process DNA for Tagro guidance; keep a few others.
    const ranked = [...facts].sort((a, b) => {
      const rank = (d: string) =>
        d === 'decision' ? 0
          : d === 'quality' ? 1
            : d === 'process' ? 2
              : d === 'communication' ? 3
                : 4
      const rd = rank(a.domain) - rank(b.domain)
      if (rd !== 0) return rd
      return Number(b.confidence) - Number(a.confidence)
    }).slice(0, limit)

    return {
      workspaceId,
      settings,
      facts: ranked,
      promptBlock: formatOkmPromptBlock(ranked),
    }
  } catch {
    return {
      workspaceId,
      settings: EMPTY_SETTINGS,
      facts: [],
      promptBlock: '',
    }
  }
}

/** Resolve workspace_id from a project, then load OKM context. */
export async function loadTagroOkmContextForProject({
  sb,
  projectId,
  limit = 10,
}: {
  sb: SupabaseClient<any>
  projectId: string | null | undefined
  limit?: number
}): Promise<TagroOkmContext> {
  if (!projectId) return emptyTagroOkmContext()
  try {
    const { data: project } = await sb
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .maybeSingle()
    return loadTagroOkmContext({
      sb,
      workspaceId: (project as { workspace_id?: string } | null)?.workspace_id ?? null,
      limit,
    })
  } catch {
    return emptyTagroOkmContext()
  }
}
