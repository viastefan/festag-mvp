import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  normalizeWorkspaceName,
  slugifyWorkspaceName,
} from '@/lib/pending-workspace'
import { RESERVED_SLUGS } from '@/lib/workspace-slug'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

export type WorkspaceNameCheck =
  | { ok: true; available: true; name: string; slug: string }
  | { ok: true; available: false; name: string; slug: string; reason: string }
  | { ok: false; reason: string }

/**
 * GET /api/workspaces/check-name?name=Acme
 *
 * Public availability check — workspace names must be globally unique (slug)
 * so client ↔ developer linking can resolve a single workspace.
 */
export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('name') || ''
    const name = normalizeWorkspaceName(raw)
    if (!name) {
      return NextResponse.json({
        ok: true,
        available: false,
        name: '',
        slug: '',
        reason: 'Bitte einen Workspace-Namen eingeben.',
      } satisfies WorkspaceNameCheck)
    }
    if (name.length < 2) {
      return NextResponse.json({
        ok: true,
        available: false,
        name,
        slug: '',
        reason: 'Der Name muss mindestens 2 Zeichen haben.',
      } satisfies WorkspaceNameCheck)
    }

    const slug = slugifyWorkspaceName(name)
    if (!slug || slug.length < 2) {
      return NextResponse.json({
        ok: true,
        available: false,
        name,
        slug: '',
        reason: 'Bitte einen Namen mit Buchstaben oder Zahlen verwenden.',
      } satisfies WorkspaceNameCheck)
    }
    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json({
        ok: true,
        available: false,
        name,
        slug,
        reason: 'Dieser Name ist reserviert. Bitte wähle einen anderen.',
      } satisfies WorkspaceNameCheck)
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ ok: false, reason: 'service_key_missing' } satisfies WorkspaceNameCheck, { status: 500 })
    }
    const sb = createServiceClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const excludeId = req.nextUrl.searchParams.get('excludeId') || ''

    const { data: bySlug } = await sb
      .from('workspaces')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle()

    if (bySlug && bySlug.id !== excludeId) {
      return NextResponse.json({
        ok: true,
        available: false,
        name,
        slug,
        reason: 'Dieser Workspace-Name ist bereits vergeben.',
      } satisfies WorkspaceNameCheck)
    }

    // Case-insensitive name collision even if slug somehow differs.
    const { data: byName } = await sb
      .from('workspaces')
      .select('id, name, slug')
      .ilike('name', name.replace(/[%_]/g, '\\$&'))
      .limit(5)

    const nameHit = (byName || []).find(
      (row: { id: string; name: string }) =>
        row.id !== excludeId &&
        normalizeWorkspaceName(row.name).toLowerCase() === name.toLowerCase(),
    )
    if (nameHit) {
      return NextResponse.json({
        ok: true,
        available: false,
        name,
        slug,
        reason: 'Dieser Workspace-Name ist bereits vergeben.',
      } satisfies WorkspaceNameCheck)
    }

    return NextResponse.json({
      ok: true,
      available: true,
      name,
      slug,
    } satisfies WorkspaceNameCheck)
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: e?.message || 'check_failed' } satisfies WorkspaceNameCheck,
      { status: 500 },
    )
  }
}
