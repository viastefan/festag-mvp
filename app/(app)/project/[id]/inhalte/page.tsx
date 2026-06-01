'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import ProjectContentIntake from '@/components/ProjectContentIntake'

export default function ProjectInhaltePage() {
  const params = useParams<{ id: string }>()
  const id = (params?.id as string) || ''
  const supabase = useMemo(() => createClient(), [])
  const [canManage, setCanManage] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setReady(true); return }
      const [{ data: proj }, { data: prof }] = await Promise.all([
        supabase.from('projects').select('user_id').eq('id', id).maybeSingle(),
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      ])
      const isOwner = (proj as any)?.user_id === user.id
      const isDev = ['dev', 'admin', 'project_owner'].includes((prof as any)?.role)
      if (!cancelled) { setCanManage(Boolean(isOwner || isDev)); setReady(true) }
    })()
    return () => { cancelled = true }
  }, [supabase, id])

  return (
    <div style={{ width: '100%', maxWidth: 880, margin: '0 auto', padding: '20px 18px 80px' }}>
      <Link href={`/project/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>
        <ArrowLeft size={14} /> Zurück zum Projekt
      </Link>
      {ready && <ProjectContentIntake projectId={id} canManage={canManage} />}
    </div>
  )
}
