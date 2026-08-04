import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { assertSameOriginOrNoOrigin } from '@/lib/auth-request'
import {
  getWorkspaceUseCase,
  type WorkspaceUseCaseId,
} from '@/lib/platform/workspace-creation'
import {
  workspaceTypePatch,
  workspaceTypeToLegacyMode,
} from '@/lib/platform/workspace'
import {
  SYMBOL_SCHEMES,
  SYMBOL_VARIANTS,
  type SymbolScheme,
  type SymbolVariant,
} from '@/components/WorkspaceSymbol'

export const runtime = 'nodejs'

type SymbolBody = {
  variant?: string
  scheme?: string
  seed?: string
}

/**
 * PATCH /api/workspaces/manage
 * Body: { workspaceId, symbol?, useCase? }
 * Owner-only. Persists icon (metadata.symbol) and/or template (use case + type).
 */
export async function PATCH(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, reason: 'no_session' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const workspaceId = String(body?.workspaceId || '').trim()
  if (!workspaceId || !/^[0-9a-f-]{36}$/i.test(workspaceId)) {
    return NextResponse.json({ ok: false, reason: 'workspace_required' }, { status: 400 })
  }

  const service = getServiceClient() || supabase
  const { data: ws } = await service
    .from('workspaces')
    .select('id, name, metadata, primary_owner_id, deleted_at')
    .eq('id', workspaceId)
    .maybeSingle()

  if (!ws?.id || ws.deleted_at) {
    return NextResponse.json({ ok: false, reason: 'workspace_not_found' }, { status: 404 })
  }
  if (ws.primary_owner_id !== user.id) {
    return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 })
  }

  const prev =
    ws.metadata && typeof ws.metadata === 'object' && !Array.isArray(ws.metadata)
      ? { ...(ws.metadata as Record<string, unknown>) }
      : {}

  let nextMeta = { ...prev }
  let mode: string | undefined
  const symbolIn = body?.symbol as SymbolBody | undefined
  const useCaseRaw = typeof body?.useCase === 'string' ? body.useCase : null

  if (symbolIn && typeof symbolIn === 'object') {
    const variant = String(symbolIn.variant || '')
    const scheme = String(symbolIn.scheme || '')
    const seed = String(symbolIn.seed || ws.name || workspaceId).slice(0, 64)
    if (!(SYMBOL_VARIANTS as readonly string[]).includes(variant)) {
      return NextResponse.json({ ok: false, reason: 'invalid_symbol' }, { status: 400 })
    }
    if (!(SYMBOL_SCHEMES as readonly string[]).includes(scheme)) {
      return NextResponse.json({ ok: false, reason: 'invalid_symbol' }, { status: 400 })
    }
    nextMeta = {
      ...nextMeta,
      symbol: {
        variant: variant as SymbolVariant,
        scheme: scheme as SymbolScheme,
        seed,
        updatedAt: new Date().toISOString(),
      },
    }
  }

  if (useCaseRaw) {
    const useCase = getWorkspaceUseCase(useCaseRaw as WorkspaceUseCaseId)
    if (!useCase) {
      return NextResponse.json({ ok: false, reason: 'invalid_use_case' }, { status: 400 })
    }
    nextMeta = workspaceTypePatch(nextMeta, useCase.workspaceType, {
      suggestedByTagro: false,
      confirmed: true,
    })
    nextMeta = {
      ...nextMeta,
      workspace_use_case: useCase.id,
      sourced_from: 'workspace-manage',
    }
    mode = workspaceTypeToLegacyMode(useCase.workspaceType)
  }

  if (!symbolIn && !useCaseRaw) {
    return NextResponse.json({ ok: false, reason: 'nothing_to_update' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { metadata: nextMeta }
  if (mode) patch.mode = mode

  const { data: updated, error } = await service
    .from('workspaces')
    .update(patch)
    .eq('id', workspaceId)
    .select('id, name, metadata')
    .single()

  if (error || !updated) {
    console.error('[workspaces/manage]', error)
    return NextResponse.json({ ok: false, reason: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    workspace: {
      id: updated.id,
      name: updated.name,
      metadata: updated.metadata,
    },
  })
}
