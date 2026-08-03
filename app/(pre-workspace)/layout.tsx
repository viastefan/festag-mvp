'use client'

import FestagAppShell from '@/components/app-shell/FestagAppShell'

export default function PreWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <FestagAppShell>{children}</FestagAppShell>
}
