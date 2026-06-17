'use client'

/**
 * /ai — Tagro Agent Workspace.
 *
 * The route no longer renders the old Tagro Chat content container with tabs,
 * a left chat sidebar and bordered suggestion cards. It is now a thin shell
 * that opens the global TagroOverlay in fullscreen workspace mode. Same
 * component as the object-level popup → same design system everywhere.
 *
 * If query params bring object context (?contextType=task&contextId=…&contextTitle=…)
 * the overlay opens already-attached. Without params it opens fullscreen with
 * the Sana task-picker (featured prompt, examples, composer) — not an empty shell.
 */

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { openTagro, type TagroContextType } from '@/components/TagroOverlay'

const ALLOWED: TagroContextType[] = [
  'project', 'task', 'decision', 'document', 'pdf', 'client',
  'briefing', 'status_report', 'report', 'note', 'evidence',
  'risk', 'approval', 'dev_item', 'marketing', 'empty',
]

export default function TagroAIPage() {
  const search = useSearchParams()
  const router = useRouter()
  const [opened, setOpened] = useState(false)

  // Open the global overlay on mount with the URL's context (if any).
  useEffect(() => {
    if (opened) return
    const raw = (search?.get('contextType') || 'empty') as TagroContextType
    const contextType: TagroContextType = ALLOWED.includes(raw) ? raw : 'empty'
    const id = search?.get('contextId') || undefined
    const title = search?.get('contextTitle') || undefined
    const prefill = search?.get('prefill') || undefined
    openTagro({ contextType, id, title, prefill })
    setOpened(true)

    // Listen for overlay close → bounce back to dashboard so the user never
    // sees this thin shell as an empty page. Use replace so the back button
    // doesn't loop the user into another empty /ai mount.
    function onClose() {
      router.replace('/dashboard')
    }
    window.addEventListener('festag:tagro-closed', onClose)
    return () => window.removeEventListener('festag:tagro-closed', onClose)
  }, [search, router, opened])

  // The overlay paints the screen — this page renders a calm dark canvas so
  // nothing flashes through behind it.
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg, #FAFAFA)',
        zIndex: 0,
      }}
    />
  )
}
