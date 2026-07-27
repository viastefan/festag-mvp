'use client'

import DevSettingsShell from '@/components/dev/settings/DevSettingsShell'

export default function DevSettingsLayout({ children }: { children: React.ReactNode }) {
  return <DevSettingsShell>{children}</DevSettingsShell>
}
