import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { rememberVeyraMemory } from '@/lib/tagro-memory'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * POST /api/onboarding/seed-memory
 *
 * Idempotent. Called from the onboarding flow once the user completes it.
 * Reads the freshly-saved profile + onboarding_briefs and writes 3–5
 * Veyra-Memory entries so the bot is never empty on first use.
 *
 * No request body needed — derives the user from the session cookie.
 */
export async function POST(_req: NextRequest) {
  try {
    const cookieStore = cookies()
    const sbCookie = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
      },
    })
    const { data: { user } } = await sbCookie.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, reason: 'no_session' }, { status: 401 })

    // Service client for reading the freshly persisted profile/brief (RLS-bypassing read is fine here).
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ ok: false, reason: 'service_key_missing' }, { status: 500 })
    const sb = createServiceClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const [{ data: profile }, { data: brief }] = await Promise.all([
      sb.from('profiles')
        .select('full_name,position,phone,company_name,company_desc,company_industry,company_size,work_mode,theme_pref')
        .eq('id', user.id)
        .maybeSingle(),
      sb.from('onboarding_briefs')
        .select('description,updated_at')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const p = (profile ?? {}) as Record<string, string | null>
    const b = (brief ?? {}) as Record<string, string | null>

    const seeds: Array<Parameters<typeof rememberVeyraMemory>[0]> = []

    const identity = [
      p.full_name?.trim(),
      p.position?.trim() ? `(${p.position?.trim()})` : null,
    ].filter(Boolean).join(' ')
    if (identity) {
      seeds.push({
        userId: user.id,
        scope: 'account',
        key: 'identity',
        content: identity,
        source: 'onboarding',
      })
    }

    if (p.company_name?.trim()) {
      const companyLine = [
        `Unternehmen: ${p.company_name.trim()}`,
        p.company_industry?.trim() ? `Branche: ${p.company_industry.trim()}` : null,
        p.company_size?.trim() ? `Teamgröße: ${p.company_size.trim()}` : null,
      ].filter(Boolean).join(' · ')
      seeds.push({
        userId: user.id,
        scope: 'account',
        key: 'company',
        content: companyLine,
        source: 'onboarding',
      })
    }

    if (p.company_desc?.trim()) {
      seeds.push({
        userId: user.id,
        scope: 'account',
        key: 'company_context',
        content: p.company_desc.trim(),
        source: 'onboarding',
      })
    }

    if (p.work_mode?.trim()) {
      const workLine = p.work_mode === 'alone'
        ? 'Arbeitet aktuell alleine, kein eigenes Team auf der Festag-Seite eingebunden.'
        : 'Arbeitet im Team — mehrere Personen sind auf Client-Seite involviert.'
      seeds.push({
        userId: user.id,
        scope: 'preference',
        key: 'work_mode',
        content: workLine,
        source: 'onboarding',
      })
    }

    if (b.description?.trim()) {
      seeds.push({
        userId: user.id,
        scope: 'fact',
        key: 'initial_brief',
        content: `Erstes Projekt-Briefing aus dem Onboarding: ${b.description.trim()}`,
        source: 'onboarding',
        confidence: 0.85,
      })
    }

    if (p.theme_pref?.trim()) {
      seeds.push({
        userId: user.id,
        scope: 'preference',
        key: 'theme',
        content: `Bevorzugtes Theme: ${p.theme_pref.trim()}`,
        source: 'onboarding',
        confidence: 0.6,
      })
    }

    const results = await Promise.all(seeds.map(s => rememberVeyraMemory(s)))
    return NextResponse.json({ ok: true, written: results.filter(Boolean).length, total: seeds.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'seed_failed' }, { status: 500 })
  }
}
