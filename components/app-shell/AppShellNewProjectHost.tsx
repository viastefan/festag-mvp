'use client'

/**
 * Host for NewProjectModal on Festag OS — darkened overlay + Tagro Intent Intake.
 * Opens after workspace Ready and when the user chooses „Neues Projekt“.
 */

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import NewProjectModal from '@/components/NewProjectModal'
import {
  OPEN_NEW_PROJECT_EVENT,
  emitProjectCreated,
  openNewProject,
} from '@/lib/new-project-open'

export default function AppShellNewProjectHost() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname() || ''
  const router = useRouter()

  useEffect(() => {
    function onOpen() {
      setOpen(true)
    }
    window.addEventListener(OPEN_NEW_PROJECT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_NEW_PROJECT_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('new') === '1' || params.get('createProject') === '1') {
      openNewProject()
      const url = new URL(window.location.href)
      url.searchParams.delete('new')
      url.searchParams.delete('createProject')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }, [pathname])

  if (!open) return null

  return (
    <NewProjectModal
      onClose={() => setOpen(false)}
      onCreated={(projectId) => {
        emitProjectCreated({ id: projectId })
        setOpen(false)
        if (projectId) router.push(`/project/${projectId}`)
        else router.refresh()
      }}
    />
  )
}
