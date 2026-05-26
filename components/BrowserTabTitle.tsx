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

export default function BrowserTabTitle() {
  const lastNameRef = useRef<string>('')

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
      const { data } = await (sb as any)
        .from('profiles')
        .select('full_name,first_name,email')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      apply(nameFromProfile(data ?? { email: user.email }))
    })()

    // Profile edits elsewhere in the app broadcast via profile-sync;
    // pick up the change without a re-fetch.
    const unsub = subscribeProfileSync((payload) => {
      if (!payload) return
      const next = nameFromProfile({
        full_name: (payload as any).full_name,
        first_name: (payload as any).first_name,
        email: (payload as any).email,
      })
      apply(next)
    })

    return () => {
      cancelled = true
      try { unsub?.() } catch {}
    }
  }, [])

  return null
}
