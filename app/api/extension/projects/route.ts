/**
 * /api/extension/projects — used by the Festag Chrome extension popup.
 *
 * Returns the projects the current user has access to via their RLS-scoped
 * Supabase session (the extension calls this with `credentials: 'include'`
 * after the user has signed in to festag.app in the same browser).
 *
 * Shape kept compact for fast popup render.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createExtensionClient, getExtensionUser } from '@/lib/extension/session'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const sb = createExtensionClient(req)

  const { data, error } = await sb
    .from('projects')
    .select('id,title,color,staging_url,live_url')
    .order('updated_at', { ascending: false })
    .limit(40)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    projects: data ?? [],
  })
}
