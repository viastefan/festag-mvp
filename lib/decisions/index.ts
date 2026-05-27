// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine — public API
//
// Two entry points:
//
//   detectAndFrame(signal)          — pure: returns null or a FramedDecision.
//                                      No DB writes, no LLM cost amortization.
//                                      Use it from API handlers where you've
//                                      already decided you want to persist
//                                      (Phase 3 endpoints).
//
//   runDecisionPipeline(supa, sig)  — end-to-end: detect → frame → limit →
//                                      duplicate-check → persist (or refresh).
//                                      Returns a typed result describing what
//                                      happened. Use it from background
//                                      hooks (status report generator, task
//                                      save, blocker emitter) where the
//                                      decision to act lives inside the
//                                      engine.
//
// The pipeline is idempotent in spirit: re-running it on the same signal
// shortly after firing finds the duplicate and refreshes urgency instead of
// double-creating.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { detectFromSignal, classifyDecisionNeed } from './detect'
import { frameDecision, type FrameOptions } from './frame'
import { checkAutoDecisionLimit, type LimiterResult } from './limiter'
import { findDuplicateOpenDecision } from './duplicate'
import { persistFramedDecision, refreshExistingDecision, type CreateDecisionResult } from './create'
import type { DecisionSignal, FramedDecision } from './intents'
import type { DecisionRow } from './types'

export * from './types'
export * from './intents'
export { detectFromSignal, classifyDecisionNeed } from './detect'
export { frameDecision } from './frame'
export { checkAutoDecisionLimit } from './limiter'
export { findDuplicateOpenDecision } from './duplicate'
export { persistFramedDecision, refreshExistingDecision } from './create'

// ── detect + frame, no persistence ──────────────────────────────────────────

export async function detectAndFrame(
  signal: DecisionSignal,
  options: FrameOptions = {},
): Promise<FramedDecision | null> {
  const intent = detectFromSignal(signal)
  if (!intent) return null
  return frameDecision(intent, options)
}


// ── End-to-end pipeline ─────────────────────────────────────────────────────

export type PipelineOutcome =
  | { status: 'skipped'; reason: 'no_intent' | 'duplicate_refresh' | 'limit_reached'; existing?: DecisionRow; limiter?: LimiterResult }
  | { status: 'created'; result: CreateDecisionResult; framed: FramedDecision }
  | { status: 'refreshed'; existing: DecisionRow; framed: FramedDecision }

export async function runDecisionPipeline(
  supa: SupabaseClient<any>,
  signal: DecisionSignal,
  options: FrameOptions & {
    requestedFor?: string | null
    createdBy?: string | null
  } = {},
): Promise<PipelineOutcome> {
  // 1. Detect.
  const intent = detectFromSignal(signal)
  if (!intent) return { status: 'skipped', reason: 'no_intent' }

  // 2. Limiter (before LLM cost — protect both budget and client attention).
  const limiter = await checkAutoDecisionLimit(supa, intent)
  if (!limiter.allowed) {
    return { status: 'skipped', reason: 'limit_reached', limiter }
  }

  // 3. Duplicate check (also cheap, runs before framing cost).
  const existing = await findDuplicateOpenDecision(supa, intent)
  if (existing) {
    const framed = await frameDecision(intent, options) // frame so refresh has urgency context
    const refreshed = await refreshExistingDecision(existing, framed, { userClient: supa })
    return { status: 'refreshed', existing: refreshed, framed }
  }

  // 4. Frame.
  const framed = await frameDecision(intent, options)

  // 5. Persist.
  const result = await persistFramedDecision(framed, {
    requestedFor: options.requestedFor ?? null,
    createdBy: options.createdBy ?? null,
    userClient: supa,
  })
  return { status: 'created', result, framed }
}
