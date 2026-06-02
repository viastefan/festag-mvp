import { NextResponse } from 'next/server'
import { activeTagroProvider } from '@/lib/tagro/complete'

/**
 * Tagro AI health/diagnostic endpoint.
 *
 * Reports which provider Tagro will use and whether a live test call to that
 * provider succeeds — WITHOUT ever exposing the API key. Used by Settings to
 * show a live "Tagro-Modell" status row so the Claude connection is verifiable.
 *
 * GET /api/tagro/health        → provider + model (no network call)
 * GET /api/tagro/health?ping=1 → also runs a tiny live completion
 */
export async function GET(req: Request) {
  const { provider, model } = activeTagroProvider()
  const url = new URL(req.url)
  const wantPing = url.searchParams.get('ping') === '1'

  if (provider === 'none') {
    return NextResponse.json({
      configured: false,
      provider,
      model,
      reachable: false,
      message: 'Keine KI konfiguriert. Setze ANTHROPIC_API_KEY (Claude) in der Umgebung.',
    })
  }

  if (!wantPing) {
    return NextResponse.json({ configured: true, provider, model, reachable: null })
  }

  // Tiny live call — confirms the key works end-to-end.
  try {
    const { tagroComplete } = await import('@/lib/tagro/complete')
    const r = await tagroComplete({
      system: 'Antworte mit genau dem Wort: OK',
      prompt: 'Ping.',
      maxTokens: 8,
      temperature: 0,
    })
    return NextResponse.json({
      configured: true,
      provider,
      model: r.model || model,
      reachable: r.ok,
      message: r.ok ? 'Tagro ist verbunden und antwortet.' : (r.error ?? 'Keine Antwort vom Modell.'),
    })
  } catch (e: any) {
    return NextResponse.json({
      configured: true,
      provider,
      model,
      reachable: false,
      message: e?.message ?? 'Health-Check fehlgeschlagen.',
    })
  }
}
