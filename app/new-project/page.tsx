'use client'

/**
 * /new-project — standalone route for creating a project.
 *
 * 2026-06 revision: this page used to host a bespoke AI-chat intake. The
 * project-creation surface is now unified on the Linear-style canvas
 * (NewProjectModal) so there is ONE place that looks and behaves the same
 * whether it is opened from the dashboard, the sidebar, or this route.
 *
 * We render the modal over a calm, dimmed canvas. Closing returns the user
 * to wherever they came from (dashboard for logged-in users); a successful
 * creation routes straight into the new project.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NewProjectModal from '@/components/NewProjectModal'

export default function NewProjectPage() {
  const supabase = createClient()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!data.session) {
        // Creating a project requires an account — send guests to sign-in,
        // preserving the intent so they land back here afterwards.
        router.replace('/login?next=/new-project')
        return
      }
      setReady(true)
    })
    return () => { active = false }
  }, [])

  function handleClose() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.replace('/dashboard')
    }
  }

  function handleCreated(projectId: string) {
    router.replace(`/project/${projectId}`)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      {ready && (
        <NewProjectModal onClose={handleClose} onCreated={handleCreated} />
      )}
    </div>
  )
}
