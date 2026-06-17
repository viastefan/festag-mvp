'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChatCircle, ArrowRight } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

type ProjectWithMessage = {
  id: string
  title: string
  status: string
  lastMessage: {
    content: string
    created_at: string
    sender_id: string
  } | null
  unreadCount: number
}

export default function MessagesPage() {
  const [projects, setProjects] = useState<ProjectWithMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Get all projects the user has access to
    const { data: projectsData } = await sb
      .from('rel_projects')
      .select('id, title, status')
      .order('updated_at', { ascending: false })

    if (!projectsData || projectsData.length === 0) {
      setLoading(false)
      return
    }

    // For each project, get the last message
    const projectsWithMessages: ProjectWithMessage[] = []

    const projects = projectsData as { id: string; title: string; status: string }[]

    for (const project of projects) {
      const { data: lastMsg } = await sb
        .from('rel_messages')
        .select('content, created_at, sender_id')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Count unread (messages not from this user, without read_at)
      const { count } = await sb
        .from('rel_messages')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .neq('sender_id', user.id)
        .is('read_at', null)

      projectsWithMessages.push({
        id: project.id,
        title: project.title,
        status: project.status,
        lastMessage: lastMsg ? {
          content: (lastMsg as any).content,
          created_at: (lastMsg as any).created_at,
          sender_id: (lastMsg as any).sender_id,
        } : null,
        unreadCount: count ?? 0,
      })
    }

    // Sort: projects with messages first, then by last message time
    projectsWithMessages.sort((a, b) => {
      if (a.lastMessage && !b.lastMessage) return -1
      if (!a.lastMessage && b.lastMessage) return 1
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      }
      return 0
    })

    setProjects(projectsWithMessages)
    setLoading(false)
  }

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    if (days === 1) return 'Gestern'
    if (days < 7) return date.toLocaleDateString('de-DE', { weekday: 'short' })
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="page-content">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 style={{ margin: '0 0 6px' }}>Nachrichten</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 28px' }}>
          Alle Projektkonversationen im Überblick.
        </p>

        {projects.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
          }}>
            <ChatCircle size={36} weight="duotone" color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
              Keine Projekte vorhanden
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Erstelle ein Projekt um den Chat zu nutzen.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((project, i) => (
              <motion.button
                key={project.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                onClick={() => router.push(`/relations/projects/${project.id}?tab=chat`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'border-color .12s, background .12s',
                  width: '100%',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Avatar / icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: project.unreadCount > 0 ? 'var(--green-bg)' : 'var(--surface-2)',
                  border: project.unreadCount > 0 ? '1px solid var(--green-border)' : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ChatCircle
                    size={20}
                    weight={project.unreadCount > 0 ? 'fill' : 'regular'}
                    color={project.unreadCount > 0 ? 'var(--green)' : 'var(--text-muted)'}
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <p style={{
                      fontSize: 14,
                      fontWeight: project.unreadCount > 0 ? 700 : 600,
                      color: 'var(--text)',
                      margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {project.title}
                    </p>
                    {project.unreadCount > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        background: 'var(--green)', color: '#fff',
                        borderRadius: 10, padding: '1px 7px',
                        minWidth: 18, textAlign: 'center',
                        flexShrink: 0,
                      }}>
                        {project.unreadCount}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 13,
                    color: project.unreadCount > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                    fontWeight: project.unreadCount > 0 ? 600 : 400,
                    margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {project.lastMessage?.content ?? 'Noch keine Nachrichten'}
                  </p>
                </div>

                {/* Time + arrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {project.lastMessage && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                      {formatTime(project.lastMessage.created_at)}
                    </span>
                  )}
                  <ArrowRight size={14} color="var(--text-muted)" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
