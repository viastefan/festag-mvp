'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText, FilePdf, FileImage, FileZip, FileDoc, FileXls,
  CloudArrowUp, Trash, DownloadSimple, FunnelSimple, X,
  File as FileIcon,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

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
}

type Props = {
  projectId: string
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

export default function RelationsDocuments({ projectId }: Props) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [dragOver, setDragOver] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
  }, [projectId])

  async function loadDocuments() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) setUserId(user.id)

    const { data } = await sb
      .from('rel_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    setDocuments((data as Document[]) ?? [])
    setLoading(false)
  }

  const uploadFile = useCallback(async (file: globalThis.File, category = 'other') => {
    if (!userId) return
    setUploading(true)

    const sb = createClient()
    const ext = file.name.split('.').pop() || 'bin'
    const path = `${projectId}/${crypto.randomUUID()}.${ext}`

    // Upload to storage
    const { data: uploadData, error: uploadError } = await sb.storage
      .from('relations-documents')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      setUploading(false)
      return
    }

    // Get public URL
    const { data: urlData } = sb.storage
      .from('relations-documents')
      .getPublicUrl(path)

    // Insert record
    const { data: doc, error: insertError } = await sb
      .from('rel_documents')
      .insert({
        project_id: projectId,
        uploaded_by: userId,
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        category,
      } as any)
      .select()
      .single()

    if (!insertError && doc) {
      setDocuments(prev => [doc as Document, ...prev])
    }

    setUploading(false)
  }, [userId, projectId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(f => uploadFile(f))
  }, [uploadFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach(f => uploadFile(f))
    e.target.value = ''
  }, [uploadFile])

  async function deleteDocument(doc: Document) {
    if (!confirm(`"${doc.name}" wirklich loschen?`)) return

    const sb = createClient()

    // Delete from storage
    const path = doc.file_url.split('/relations-documents/')[1]
    if (path) {
      await sb.storage.from('relations-documents').remove([path])
    }

    // Delete record
    await sb.from('rel_documents').delete().eq('id', doc.id)
    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  const filtered = activeCategory === 'all'
    ? documents
    : documents.filter(d => d.category === activeCategory)

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 300, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
      }}>
        <div style={{
          width: 24, height: 24, border: '2px solid var(--border)',
          borderTopColor: 'var(--text)', borderRadius: '50%',
          animation: 'spin .8s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <div>
      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--green)' : 'var(--border)'}`,
          borderRadius: 'var(--r-lg)',
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--green-bg)' : 'var(--surface)',
          transition: 'all .2s',
          marginBottom: 20,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <CloudArrowUp
          size={32}
          weight="duotone"
          color={dragOver ? 'var(--green)' : 'var(--text-muted)'}
          style={{ marginBottom: 8 }}
        />
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>
          {uploading ? 'Wird hochgeladen...' : 'Dateien hochladen'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Drag & Drop oder klicken zum Auswählen
        </p>
      </div>

      {/* Category filter */}
      {documents.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 16,
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          <FunnelSimple size={14} color="var(--text-muted)" style={{ marginTop: 7, flexShrink: 0 }} />
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

      {/* Document list */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
        }}>
          <FileText size={32} weight="duotone" color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
            {documents.length === 0 ? 'Noch keine Dokumente' : 'Keine Dokumente in dieser Kategorie'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {documents.length === 0
              ? 'Lade Dokumente hoch um sie mit deinem Team zu teilen.'
              : 'Wähle eine andere Kategorie oder lade neue Dokumente hoch.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {filtered.map(doc => {
              const Icon = getFileIcon(doc.file_type)
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r)',
                    transition: 'border-color .12s',
                  }}
                >
                  {/* File icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={20} weight="duotone" color="var(--text-secondary)" />
                  </div>

                  {/* File info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text)',
                      margin: '0 0 3px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {doc.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span style={{ opacity: 0.4 }}>|</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: 4,
                        background: 'var(--surface-2)', fontWeight: 600,
                        fontSize: 10,
                      }}>
                        {CATEGORIES[doc.category] ?? doc.category}
                      </span>
                      <span style={{ opacity: 0.4 }}>|</span>
                      <span>{new Date(doc.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.name}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)',
                        transition: 'color .12s, background .12s',
                        textDecoration: 'none',
                      }}
                      title="Herunterladen"
                    >
                      <DownloadSimple size={14} weight="bold" />
                    </a>
                    <button
                      onClick={() => deleteDocument(doc)}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'color .12s, background .12s',
                      }}
                      title="Löschen"
                    >
                      <Trash size={14} weight="bold" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
