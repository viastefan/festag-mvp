import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root entry — one platform, one auth.
 *
 * Session → Festag OS Overview. Otherwise → /login.
 * No Client | Developer chooser (constitution).
 */

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/overview')
  redirect('/login')
}
