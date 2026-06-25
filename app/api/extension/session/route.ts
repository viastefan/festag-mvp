import { NextRequest, NextResponse } from 'next/server'
import { getExtensionUser } from '@/lib/extension/session'
import { checkExtensionBackendReady } from '@/lib/extension/health'

export const runtime = 'nodejs'

/** Lightweight auth probe for the Chrome extension popup. */
export async function GET(req: NextRequest) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const backendReady = await checkExtensionBackendReady()

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email },
    backendReady,
  })
}
