'use client'

/**
 * Workspace-Home per Slug — festag.app/<slug>.
 *
 * Product UI is Festag OS Overview until Phase 3 Workspace Dashboard owns
 * slug homes. This route only validates the slug and sends the user to /overview.
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMyWorkspaceSlug, RESERVED_SLUGS } from '@/lib/workspace-slug'

export default function WorkspaceSlugPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  useEffect(() => {
    const decoded = decodeURIComponent(String(slug || '')).toLowerCase()
    if (RESERVED_SLUGS.has(decoded)) {
      router.replace('/overview')
      return
    }

    let cancelled = false
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace('/login')
        return
      }
      const mySlug = await getMyWorkspaceSlug(supabase, user.id)
      if (cancelled) return
      if (mySlug && mySlug.toLowerCase() !== decoded) {
        router.replace(`/${mySlug}`)
        return
      }
      router.replace('/overview')
    })()
    return () => { cancelled = true }
  }, [slug, router])

  return (
    <div style={{ padding: 48, color: 'var(--text-muted)' }}>
      Workspace wird geladen…
    </div>
  )
}
