import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root entry point.
 *
 * Behaviour: if the visitor has a live Supabase session, send them to
 * the dashboard. Only fall through to /login otherwise. /register stays
 * a deliberate, explicit path you land on from marketing or invites —
 * not the default for someone who just typed festag.app.
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
  redirect('/login')
}
