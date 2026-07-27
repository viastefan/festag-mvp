'use client'

import { useParams } from 'next/navigation'
import DevSettingsContent from '@/components/dev/settings/DevSettingsContent'
import { resolveDevSettingsSection } from '@/lib/dev-settings-config'

export default function DevSettingsSectionPage() {
  const params = useParams()
  const slug = typeof params?.section === 'string' ? params.section : Array.isArray(params?.section) ? params.section[0] : ''
  const section = resolveDevSettingsSection(slug)
  return <DevSettingsContent section={section} />
}
