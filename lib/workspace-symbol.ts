/**
 * Workspace symbol preferences — persisted per workspace.
 *
 * The senior design directive bans initials-in-a-circle. Each workspace gets
 * a generative WorkspaceSymbol instead. Defaults are derived deterministically
 * from the workspace key (so a brand new workspace already looks intentional),
 * and the user can override variant / scheme via the picker in the profile
 * popover; that choice is saved to localStorage and broadcast so any open tab
 * updates immediately.
 */

import { SYMBOL_SCHEMES, SYMBOL_VARIANTS, type SymbolScheme, type SymbolVariant } from '@/components/WorkspaceSymbol'

export type WorkspaceSymbolPrefs = {
  variant: SymbolVariant
  scheme: SymbolScheme
  /** Free-form seed string — drives the inner generative pattern. */
  seed: string
}

const STORAGE_PREFIX = 'festag_workspace_symbol::'
export const WORKSPACE_SYMBOL_SYNC_EVENT = 'festag-workspace-symbol-change'

function hash(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/** Stable default derived from the workspace key. */
export function defaultSymbolFor(key: string): WorkspaceSymbolPrefs {
  const safe = (key || 'festag').trim().toLowerCase() || 'festag'
  const h = hash(safe)
  return {
    variant: SYMBOL_VARIANTS[h % SYMBOL_VARIANTS.length] as SymbolVariant,
    scheme: SYMBOL_SCHEMES[(h >>> 8) % SYMBOL_SCHEMES.length] as SymbolScheme,
    seed: safe,
  }
}

export function loadSymbol(key: string): WorkspaceSymbolPrefs {
  if (typeof window === 'undefined') return defaultSymbolFor(key)
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return defaultSymbolFor(key)
    const parsed = JSON.parse(raw) as Partial<WorkspaceSymbolPrefs>
    return {
      variant: (SYMBOL_VARIANTS as readonly string[]).includes(parsed.variant as string)
        ? (parsed.variant as SymbolVariant) : defaultSymbolFor(key).variant,
      scheme: (SYMBOL_SCHEMES as readonly string[]).includes(parsed.scheme as string)
        ? (parsed.scheme as SymbolScheme) : defaultSymbolFor(key).scheme,
      seed: typeof parsed.seed === 'string' && parsed.seed ? parsed.seed : defaultSymbolFor(key).seed,
    }
  } catch {
    return defaultSymbolFor(key)
  }
}

export function saveSymbol(key: string, prefs: WorkspaceSymbolPrefs) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(prefs))
    window.dispatchEvent(new CustomEvent(WORKSPACE_SYMBOL_SYNC_EVENT, { detail: { key, prefs } }))
  } catch {}
}

export function onSymbolChange(cb: (key: string, prefs: WorkspaceSymbolPrefs) => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ key: string; prefs: WorkspaceSymbolPrefs }>).detail
    if (detail) cb(detail.key, detail.prefs)
  }
  window.addEventListener(WORKSPACE_SYMBOL_SYNC_EVENT, handler)
  return () => window.removeEventListener(WORKSPACE_SYMBOL_SYNC_EVENT, handler)
}
