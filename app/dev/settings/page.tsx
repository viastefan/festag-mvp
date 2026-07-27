import { redirect } from 'next/navigation'

/** /dev/settings → default section inside the Settings workspace. */
export default function DevSettingsIndexPage() {
  redirect('/dev/settings/profile')
}
