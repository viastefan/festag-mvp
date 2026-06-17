'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'
import ProjectContentIntake from '@/components/ProjectContentIntake'

export default function DevProjectInhaltePage() {
  const params = useParams<{ id: string }>()
  const id = (params?.id as string) || ''

  return (
    <div style={{ width: '100%', maxWidth: 880, margin: '0 auto', padding: '20px 18px 80px' }}>
      <Link href={`/dev/projects/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>
        <ArrowLeft size={14} /> Zurück zum Projekt
      </Link>
      {/* Devs always manage the intake (define template, review, mark übernommen). */}
      <ProjectContentIntake projectId={id} canManage />
    </div>
  )
}
