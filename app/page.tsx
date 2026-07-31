import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root entry — one platform, one auth.
 *
 * Session → dashboard. Otherwise → /login.
 * No Client | Developer chooser (constitution).
 */

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  redirect('/login')
}
