'use client'

/**
 * Workspace-Home per Slug — festag.app/<slug>.
 *
 * Renders the dashboard for the workspace whose slug matches the URL.
 * This is the canonical, shareable workspace URL (Linear-style). All the
 * other app routes (/projects, /tasks, …) stay as they are; this dynamic
 * segment only catches top-level paths that aren't a known static route,
 * because Next.js gives static routes priority over a dynamic [slug].
 *
 * Resolution:
 *   - not logged in            → /login
 *   - slug is a reserved word  → /dashboard (never hijack a real route)
 *   - slug matches my workspace→ render the dashboard
 *   - I have a different slug   → redirect to my correct slug
 *   - no slug set yet           → /dashboard (plain fallback, no loop)
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMyWorkspaceSlug, RESERVED_SLUGS } from '@/lib/workspace-slug'
import DashboardPage from '../dashboard/page'

export default function WorkspaceSlugPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'ok'>('checking')

  useEffect(() => {
    const decoded = decodeURIComponent(String(slug || '')).toLowerCase()
    if (RESERVED_SLUGS.has(decoded)) { router.replace('/dashboard'); return }

    let cancelled = false
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { router.replace('/login'); return }
      const mySlug = await getMyWorkspaceSlug(supabase, user.id)
      if (cancelled) return
      if (mySlug && mySlug.toLowerCase() === decoded) { setState('ok'); return }
      if (mySlug) { router.replace(`/${mySlug}`); return }
      router.replace('/dashboard')
    })()
    return () => { cancelled = true }
  }, [slug, router])

  if (state === 'ok') return <DashboardPage />
  return <div style={{ padding: 48, color: 'var(--text-muted)' }}>Workspace wird geladen…</div>
}
