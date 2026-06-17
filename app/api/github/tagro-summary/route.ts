import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildGithubTagroSummary } from '@/lib/github/tagro-summary'

export const runtime = 'nodejs'

/**
 * GET /api/github/tagro-summary?repoId=&projectId=&limit=&clientPreview=1
 *
 * Builds a Tagro-ready digest from recent GitHub commits + PRs for the
 * authenticated developer. Optional clientPreview runs translateDevUpdate.
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = new URL(req.url)
    const repoId = url.searchParams.get('repoId')
    const projectId = url.searchParams.get('projectId')
    const limit = Number(url.searchParams.get('limit') ?? 30)
    const includeClientPreview = url.searchParams.get('clientPreview') === '1'

    const result = await buildGithubTagroSummary(supabase as any, {
      repoId: repoId || null,
      projectId: projectId || null,
      limit,
      includeClientPreview,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server_error' }, { status: 500 })
  }
}
