'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { defaultDocumentData } from '@/lib/documents/document-defaults'
import { createDocument } from '@/lib/documents/document-api'
import { DOCUMENT_EDITOR_CSS } from '@/components/documents/document-editor-styles'
import type { DocKind } from '@/lib/documents/templates'
import { DOC_TEMPLATES } from '@/lib/documents/templates'

const KINDS = new Set(DOC_TEMPLATES.map((t) => t.kind))

export default function NewDocumentPage() {
  const router = useRouter()
  const params = useSearchParams()
  const kind = (params.get('kind') || 'rechnung') as DocKind
  const supabase = useMemo(() => createClient(), [])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!KINDS.has(kind)) {
      router.replace('/documents')
      return
    }

    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: ws } = await supabase
        .from('workspaces')
        .select('id')
        .eq('primary_owner_id', user.id)
        .eq('is_personal', true)
        .maybeSingle()

      const wsId = (ws as { id?: string } | null)?.id
      if (!wsId) {
        setError('Kein Workspace gefunden.')
        return
      }

      const { res, json: j } = await createDocument({
        kind,
        workspace_id: wsId,
        status: 'draft',
        data: defaultDocumentData(kind),
      })
      if (cancelled) return
      if (!res.ok || !j?.document?.id) {
        setError(j?.error || 'Entwurf konnte nicht erstellt werden.')
        return
      }
      router.replace(`/documents/${j.document.id}`)
    })()

    return () => { cancelled = true }
  }, [kind, router, supabase])

  return (
    <div className="doc-ed doc-ed--loading">
      <style>{DOCUMENT_EDITOR_CSS}</style>
      <header className="doc-ed-top">
        <div className="doc-ed-top-left">
          <div className="doc-ed-skel doc-ed-skel-back" />
          <div className="doc-ed-skel doc-ed-skel-title" />
        </div>
      </header>
      <div className="doc-ed-body doc-ed-body--loading">
        {error ? <p className="doc-ed-error">{error}</p> : <div className="doc-ed-skel doc-ed-skel-sheet" />}
      </div>
    </div>
  )
}
