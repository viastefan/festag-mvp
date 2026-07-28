'use client'

import ClientSettingsShell from '@/components/settings/ClientSettingsShell'

export default function ClientSettingsLayout({ children }: { children: React.ReactNode }) {
  return <ClientSettingsShell>{children}</ClientSettingsShell>
}
