import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root entry point.
 *
 * Behaviour: if the visitor has a live Supabase session, send them to
 * the dashboard. Otherwise send them to /enter — on mobile that shows the
 * Client / Developer chooser; on desktop /enter immediately continues to
 * /login. /register stays a deliberate path from marketing or invites.
 *
 * Fix for "I close the tab, come back to festag.app and have to log in
 * again" — the prior code unconditionally redirected to /register,
 * which ignored the persisted session entirely.
 */

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  redirect('/enter')
}
