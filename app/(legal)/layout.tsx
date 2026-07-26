'use client'

import LegalArticleShell from '@/components/legal/LegalArticleShell'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <LegalArticleShell>{children}</LegalArticleShell>
}
