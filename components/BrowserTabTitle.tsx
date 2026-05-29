'use client'

/**
 * BrowserTabTitle — sets the browser tab title to the current user's
 * display name. Pinned tabs / overflowing tab strips truncate to the
 * first ~7 characters, so the name shows up cleanly ("Stefan..." in
 * Stefan's reference screenshot) instead of "Festag — AI-nati...".
 *
 * Pulls from the profiles table on mount; subscribes to the
 * profile-sync broadcast so name edits anywhere in the app update
 * the tab title live.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { subscribeProfileSync } from '@/lib/profile-sync'

function nameFromProfile(p: { full_name?: string | null; first_name?: string | null; email?: string | null } | null): string {
  if (!p) return 'Festag'
  const full = (p.full_name || '').trim()
  if (full) return full
  const first = (p.first_name || '').trim()
  if (first) return first
  const email = (p.email || '').trim()
  if (email) return email.split('@')[0]
  return 'Festag'
}

function missingProfileColumn(error: unknown) {
  const message = String((error as any)?.message ?? '')
  const raw = (
    message.match(/'([^']+)' column/)?.[1] ||
    message.match(/column "?([a-zA-Z0-9_.]+)"? does not exist/)?.[1] ||
    null
  )
  return raw?.split('.').pop() ?? null
}

export default function BrowserTabTitle() {
  const lastNameRef = useRef<string>('')
  const pathname = usePathname()

  function apply(name: string) {
    if (!name || name === lastNameRef.current) return
    lastNameRef.current = name
    // "Name — Festag" reads as "Stefan…" when truncated in narrow tab
    // strips, but expands to the full identity in the OS task switcher
    // and tab tooltip.
    document.title = `${name} — Festag`
  }

  useEffect(() => {
    let cancelled = false
    const sb = createClient()

    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user || cancelled) return
      let result = await (sb as any)
        .from('profiles')
        .select('full_name,first_name,email')
        .eq('id', user.id)
        .maybeSingle()
      if (result.error && missingProfileColumn(result.error)) {
        result = await (sb as any)
          .from('profiles')
          .select('full_name,email')
          .eq('id', user.id)
          .maybeSingle()
      }
      if (cancelled) return
      apply(nameFromProfile(result.data ?? { email: user.email }))
    })()

    // Profile edits elsewhere in the app broadcast via profile-sync;
    // pick up the change without a re-fetch. The payload uses camelCase
    // (fullName / firstName) — earlier this read snake_case which is
    // why renames weren't propagating to the tab title live.
    const unsub = subscribeProfileSync((payload) => {
      if (!payload) return
      if (payload.fullName === undefined && payload.firstName === undefined) return
      const next = nameFromProfile({
        full_name: payload.fullName,
        first_name: payload.firstName,
      })
      apply(next)
    })

    return () => {
      cancelled = true
      try { unsub?.() } catch {}
    }
  }, [])

  // Next re-applies the route's metadata <title> on client navigation, which
  // would wipe the resolved name. Re-assert it whenever the route changes.
  useEffect(() => {
    if (lastNameRef.current) document.title = `${lastNameRef.current} — Festag`
  }, [pathname])

  return null
}
