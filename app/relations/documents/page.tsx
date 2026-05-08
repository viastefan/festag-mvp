'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  FileText, FilePdf, FileImage, FileZip, FileDoc, FileXls,
  FunnelSimple, DownloadSimple, Briefcase,
  File as FileIcon,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'

type Document = {
  id: string
  project_id: string
  uploaded_by: string
  name: string
  file_url: string
  file_type: string
  file_size: number
  category: string
  notes: string | null
  created_at: string
  project_title?: string
}

const CATEGORIES: Record<string, string> = {
  all: 'Alle',
  invoice: 'Rechnung',
  quote: 'Angebot',
  contract: 'Vertrag',
  other: 'Sonstiges',
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return FilePdf
  if (fileType.includes('image')) return FileImage
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return FileZip
  if (fileType.includes('doc') || fileType.includes('word')) return FileDoc
  if (fileType.includes('xls') || fileType.includes('sheet') || fileType.includes('csv')) return FileXls
  return FileIcon
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function DocumentsOverviewPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [groupByProject, setGroupByProject] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {
    const sb = createClient()

    // Get all projects the user has access to
    const { data: projectsData } = await sb
      .from('rel_projects')
      .select('id, title')

    if (!projectsData || projectsData.length === 0) {
      setLoading(false)
      return
    }

    const projects = projectsData as { id: string; title: string }[]
    const projectMap = new Map(projects.map(p => [p.id, p.title]))
    const projectIds = projects.map(p => p.id)

    // Get all documents for those projects
    const { data: docs } = await sb
      .from('rel_documents')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })

    const rawDocs = (docs ?? []) as Document[]
    const enriched = rawDocs.map(d => ({
      ...d,
      project_title: projectMap.get(d.project_id) ?? 'Unbekanntes Projekt',
    }))

    setDocuments(enriched)
    setLoading(false)
  }

  const filtered = activeCategory === 'all'
    ? documents
    : documents.filter(d => d.category === activeCategory)

  // Group by project
  const grouped = new Map<string, { title: string; docs: Document[] }>()
  for (const doc of filtered) {
    const existing = grouped.get(doc.project_id)
    if (existing) {
      existing.docs.push(doc)
    } else {
      grouped.set(doc.project_id, {
        title: doc.project_title ?? 'Projekt',
        docs: [doc],
      })
    }
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
        <h1 style={{ margin: '0 0 6px' }}>Dokumente</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 28px' }}>
          Alle Projektdokumente im Überblick.
        </p>

        {/* Category filter */}
        {documents.length > 0 && (
          <div style={{
            display: 'flex', gap: 6, marginBottom: 20,
            overflowX: 'auto', scrollbarWidth: 'none',
            alignItems: 'center',
          }}>
            <FunnelSimple size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            {Object.entries(CATEGORIES).map(([key, label]) => {
              const isActive = activeCategory === key
              const count = key === 'all' ? documents.length : documents.filter(d => d.category === key).length
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: isActive ? 'var(--text)' : 'var(--border)',
                    background: isActive ? 'var(--btn-prim)' : 'transparent',
                    color: isActive ? 'var(--btn-prim-text)' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    transition: 'all .12s',
                  }}
                >
                  {label} {count > 0 && `(${count})`}
                </button>
              )
            })}
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
          }}>
            <FileText size={36} weight="duotone" color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
              {documents.length === 0 ? 'Noch keine Dokumente' : 'Keine Dokumente in dieser Kategorie'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Lade Dokumente in deinen Projekten hoch.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Array.from(grouped.entries()).map(([projectId, group]) => (
              <div key={projectId}>
                {/* Project header */}
                <button
                  onClick={() => router.push(`/relations/projects/${projectId}?tab=documents`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 10, padding: '4px 0',
                    background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <Briefcase size={14} weight="bold" color="var(--text-muted)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {group.title}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                    background: 'var(--surface-2)', padding: '1px 7px', borderRadius: 6,
                  }}>
                    {group.docs.length}
                  </span>
                </button>

                {/* Documents */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {group.docs.map((doc, i) => {
                    const Icon = getFileIcon(doc.file_type)
                    return (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px',
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--r)',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 9,
                          background: 'var(--surface-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Icon size={18} weight="duotone" color="var(--text-secondary)" />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 13, fontWeight: 600, color: 'var(--text)',
                            margin: '0 0 2px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {doc.name}
                          </p>
                          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span style={{ opacity: 0.4 }}>|</span>
                            <span style={{
                              padding: '0 5px', borderRadius: 4,
                              background: 'var(--surface-2)', fontWeight: 600, fontSize: 10,
                            }}>
                              {CATEGORIES[doc.category] ?? doc.category}
                            </span>
                            <span style={{ opacity: 0.4 }}>|</span>
                            <span>
                              {new Date(doc.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>

                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.name}
                          style={{
                            width: 30, height: 30, borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)', textDecoration: 'none',
                            flexShrink: 0,
                            transition: 'color .12s',
                          }}
                          title="Herunterladen"
                        >
                          <DownloadSimple size={13} weight="bold" />
                        </a>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
