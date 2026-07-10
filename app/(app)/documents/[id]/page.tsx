'use client'

import dynamic from 'next/dynamic'

const DocumentEditor = dynamic(
  () => import('@/components/documents/DocumentEditor'),
  { ssr: false, loading: () => <p style={{ padding: 24 }}>Lade Editor…</p> },
)

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  return <DocumentEditor documentId={params.id} />
}
