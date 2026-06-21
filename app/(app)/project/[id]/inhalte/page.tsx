'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, FileText, Sparkle } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import ProjectContentIntake from '@/components/ProjectContentIntake'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import { openTagro } from '@/components/TagroOverlay'
import { PROJECT_SUBPAGE_CSS } from '@/components/projects/project-subpages-styles'

export default function ProjectInhaltePage() {
  const params = useParams<{ id: string }>()
  const id = (params?.id as string) || ''
  const supabase = useMemo(() => createClient(), [])
  const [canManage, setCanManage] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [ready, setReady] = useState(false)

  const loadMeta = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setReady(true); return }

    const res = await fetch(`/api/projects/${id}`, { credentials: 'include' }).catch(() => null)
    if (res?.ok) {
      const data = await res.json()
      setProjectTitle(data.project?.title ?? '')
      const isOwner = data.project?.user_id === user.id
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      const isDev = ['dev', 'admin', 'project_owner'].includes((prof as any)?.role)
      setCanManage(Boolean(isOwner || isDev))
    }
    setReady(true)
  }, [supabase, id])

  useEffect(() => { void loadMeta() }, [loadMeta])

  const tagroHandler = () => openTagro({
    contextType: 'project',
    id,
    title: projectTitle || 'Website-Inhalte',
    subtitle: 'Inhalte',
    projectId: id,
  })

  return (
    <MobileCodexListChrome
      className="pj-sub dec-os"
      title="Inhalte."
      titleMobile="Website-Inhalte"
      subtitle={projectTitle ? `${projectTitle}, Texte und Medien` : 'Texte, Medien und Seiteninhalte'}
      extraCss={PROJECT_SUBPAGE_CSS}
      dock={{
        onDragUp: tagroHandler,
        primary: {
          id: 'tagro',
          label: 'Inhalte mit Tagro...',
          icon: <Sparkle size={14} weight="regular" />,
          onClick: tagroHandler,
          ariaLabel: 'Mit Tagro bearbeiten',
        },
        secondary: {
          id: 'back',
          icon: <FileText size={20} weight="bold" />,
          onClick: () => { window.location.href = `/project/${id}` },
          ariaLabel: 'Zurück zum Projekt',
        },
      }}
    >
      <div className="pj-sub-shell">
        <Link href={`/project/${id}`} className="pj-sub-back">
          <ArrowLeft size={14} /> Zurück zum Projekt
        </Link>

        {!ready ? (
          <p className="pj-sub-empty">Inhalte werden geladen…</p>
        ) : (
          <ProjectContentIntake projectId={id} canManage={canManage} />
        )}
      </div>
    </MobileCodexListChrome>
  )
}
