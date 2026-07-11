'use client'

import DocumentEditor from '@/components/documents/DocumentEditor'

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  return <DocumentEditor documentId={params.id} />
}
