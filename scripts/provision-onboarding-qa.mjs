#!/usr/bin/env node
/**
 * End-to-end Build-onboarding QA account.
 *
 * Creates a confirmed Auth user, personal workspace, profile, workspace type
 * (Agentur → agency), Tagro memory seeds, and /preparing personalization —
 * same shape the live UI writes.
 *
 * Usage:
 *   node scripts/provision-onboarding-qa.mjs
 *   node scripts/provision-onboarding-qa.mjs --email=you+qa@gmail.com --pick=Developer
 *
 * Prints magic-link + OTP so login works without guessing the inbox.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (!m) continue
      const key = m[1].trim()
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* optional */ }
}

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : null
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

/** Mirrors clarifyToWorkspaceType + workspaceTypeToLegacyMode */
function mapPick(pick) {
  switch (pick) {
    case 'Agentur':
      return { type: 'agency', mode: 'agency', companyType: 'agency', role: 'agency_lead' }
    case 'Startup':
      return { type: 'startup', mode: 'team', companyType: 'startup', role: 'founder' }
    case 'Unternehmen':
      return { type: 'company', mode: 'team', companyType: 'company', role: 'manager' }
    case 'Developer':
    default:
      return { type: 'personal', mode: 'delivery', companyType: 'personal', role: 'developer' }
  }
}

/** Mirrors personalizeWorkspace for the common companyType branches */
function personalize(companyType, context) {
  if (companyType === 'agency' || /agentur/i.test(context)) {
    return {
      modules: ['clients', 'projects', 'team', 'invoices', 'reports', 'tagro'],
      priorities: [
        'Füge deinen ersten Kunden hinzu',
        'Verbinde GitHub, wenn du Software lieferst',
        'Lade dein Team ein',
      ],
      suggestedIntegrations: ['github', 'figma', 'slack'],
      headline: 'Agentur-Workspace bereit',
      subtitle: 'Kunden, Projekte und Delivery — passend zu deiner Arbeit.',
      preparedAt: new Date().toISOString(),
    }
  }
  if (companyType === 'startup') {
    return {
      modules: ['roadmap', 'projects', 'analytics', 'funding', 'tagro'],
      priorities: [
        'Halte den nächsten Meilenstein fest',
        'Verbinde Produktquellen',
        'Teile Status mit Stakeholdern',
      ],
      suggestedIntegrations: ['github', 'linear', 'notion'],
      headline: 'Founder-Workspace bereit',
      subtitle: 'Roadmap, Projekte und Klarheit — ohne Lärm.',
      preparedAt: new Date().toISOString(),
    }
  }
  if (companyType === 'company') {
    return {
      modules: ['roadmap', 'meetings', 'reports', 'projects', 'tagro'],
      priorities: [
        'Setze den aktuellen Roadmap-Fokus',
        'Plane den nächsten Sync',
        'Veröffentliche einen ruhigen Status',
      ],
      suggestedIntegrations: ['slack', 'google_calendar'],
      headline: 'Produktteam-Workspace bereit',
      subtitle: 'Roadmap, Meetings und Berichte — für interne Delivery.',
      preparedAt: new Date().toISOString(),
    }
  }
  return {
    modules: ['projects', 'tagro', 'reports', 'files', 'calendar'],
    priorities: [
      'Lege dein erstes Projekt an',
      'Lade jemanden ein, der mitarbeitet',
    ],
    suggestedIntegrations: ['github', 'vercel'],
    headline: 'Dein Workspace ist bereit',
    subtitle: 'Tagro hat aus deinem Kontext einen ruhigen Start vorbereitet.',
    preparedAt: new Date().toISOString(),
  }
}

function pickProp(data, key) {
  const root = data
  const props = root?.properties || root
  const v = props?.[key]
  return v == null ? null : String(v)
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const email =
  arg('email') ||
  `dirnbergerstefan8+qa${stamp}@gmail.com`
const pick = arg('pick') || 'Agentur'
const fullName = arg('name') || 'QA Onboarding Agentur'
const position = arg('position') || 'Founder & Delivery Lead'
const workspaceName = arg('workspace') || `QA Agentur ${stamp}`
const context =
  arg('context') ||
  'Ich führe eine Software-Agentur mit Fokus auf Web- und KI-Projekte für Mittelstandskunden.'
const avatarUrl =
  arg('avatar') ||
  'https://xsdkoepwuvpuroijjain.supabase.co/storage/v1/object/public/avatars/default-qa.png'
const password = arg('password') || `FestagQa!${randomBytes(3).toString('hex')}`

if (!url || !serviceKey?.startsWith('eyJ')) {
  console.error('✗ SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local')
  process.exit(1)
}

const sb = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const mapped = mapPick(pick)
const personalized = personalize(mapped.companyType, context)
const now = new Date().toISOString()

console.log('\nFestag — Onboarding QA Account\n')
console.log(`  Email:     ${email}`)
console.log(`  Pick:      ${pick} → type=${mapped.type} mode=${mapped.mode}`)
console.log(`  Workspace: ${workspaceName}`)
console.log('')

// ── 1) Auth user ──────────────────────────────────────────────────────────
let userId = null
{
  const { data: listed } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    userId = existing.id
    await sb.auth.admin.updateUserById(userId, {
      email_confirm: true,
      password,
      user_metadata: {
        ...(existing.user_metadata || {}),
        full_name: fullName,
        pending_workspace_name: workspaceName,
      },
    })
    console.log('✓ Existing auth user updated (confirmed + password)')
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        pending_workspace_name: workspaceName,
      },
    })
    if (error) {
      console.error('✗ createUser:', error.message)
      process.exit(1)
    }
    userId = data.user.id
    console.log('✓ Auth user created + email confirmed')
  }
}

// ── 2) Profile (Build Profile stage) ──────────────────────────────────────
{
  const { error } = await sb.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      position: position.slice(0, 64),
      avatar_url: avatarUrl.startsWith('http') ? avatarUrl : null,
      dev_profile_facts: `${position}. ${context}`.slice(0, 280),
      onboarded: true,
      onboarding_completed: true,
      updated_at: now,
    },
    { onConflict: 'id' },
  )
  if (error) {
    console.error('✗ profiles upsert:', error.message)
    process.exit(1)
  }
  console.log('✓ profiles: name, position, avatar, facts')
}

// ── 3) Workspace bootstrap ────────────────────────────────────────────────
let workspaceId = null
const baseSlug = slugify(workspaceName) || `qa-${stamp}`
let slug = baseSlug
{
  const { data: owned } = await sb
    .from('workspaces')
    .select('id, slug, metadata, mode')
    .eq('primary_owner_id', userId)
    .eq('is_personal', true)
    .maybeSingle()

  if (owned?.id) {
    workspaceId = owned.id
    slug = owned.slug || slug
  } else {
    for (let i = 0; i < 6; i++) {
      const trySlug = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`
      const { data, error } = await sb
        .from('workspaces')
        .insert({
          name: workspaceName,
          slug: trySlug,
          region: 'eu',
          primary_owner_id: userId,
          is_personal: true,
          mode: mapped.mode,
          metadata: { sourced_from: 'onboarding_qa' },
        })
        .select('id, slug')
        .single()
      if (!error && data?.id) {
        workspaceId = data.id
        slug = data.slug
        break
      }
      if (!/duplicate|unique/i.test(error?.message || '')) {
        console.error('✗ workspace insert:', error?.message)
        process.exit(1)
      }
    }
  }
  if (!workspaceId) {
    console.error('✗ could not create workspace (slug taken)')
    process.exit(1)
  }

  await sb.from('workspace_members').upsert(
    { workspace_id: workspaceId, user_id: userId, role: 'owner' },
    { onConflict: 'workspace_id,user_id' },
  )
  console.log(`✓ workspace ${workspaceId} (${slug})`)
}

// ── 4) Workspace profile + type + personalization (Build + /preparing) ────
{
  const inferred = {
    role: mapped.role,
    industry: mapped.companyType === 'agency' ? 'software' : null,
    teamSize: mapped.companyType === 'agency' ? '5-15' : '1-5',
    companyType: mapped.companyType,
    projectComplexity: 'multi_client',
    likelyIntegrations: personalized.suggestedIntegrations,
    recommendedModules: personalized.modules,
    recommendedDashboard: mapped.companyType,
    confidence: 0.88,
    notes: `QA seed from pick=${pick}`,
  }

  const metadata = {
    sourced_from: 'onboarding_qa',
    workspace_type: mapped.type,
    workspace_type_meta: {
      suggestedByTagro: true,
      confirmed: true,
      confirmedAt: now,
    },
    workspace_profile: {
      context,
      inferred,
      updatedAt: now,
      source: 'onboarding',
    },
    blueprint: {
      clarify: pick,
      sources: ['GitHub', 'Figma'],
    },
    personalization: personalized,
  }

  const { error } = await sb
    .from('workspaces')
    .update({
      name: workspaceName,
      mode: mapped.mode,
      metadata,
      updated_at: now,
    })
    .eq('id', workspaceId)

  if (error) {
    console.error('✗ workspace metadata:', error.message)
    process.exit(1)
  }
  console.log('✓ workspace_profile + type + personalization')
}

// ── 5) onboarding_state completed ─────────────────────────────────────────
{
  const { error } = await sb.from('onboarding_state').upsert(
    {
      user_id: userId,
      current_step: 'connect',
      profile_done: true,
      workspace_done: true,
      completed_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    console.error('✗ onboarding_state:', error.message)
    process.exit(1)
  }
  console.log('✓ onboarding_state.completed_at set')
}

// ── 6) Tagro memory (same keys as seed-memory) ────────────────────────────
{
  const seeds = [
    {
      p_user_id: userId,
      p_project_id: null,
      p_scope: 'account',
      p_key: 'identity',
      p_content: `${fullName} (${position})`,
      p_source: 'onboarding',
      p_confidence: 1,
      p_metadata: {},
    },
    {
      p_user_id: userId,
      p_project_id: null,
      p_scope: 'account',
      p_key: 'workspace_context',
      p_content: context,
      p_source: 'onboarding',
      p_confidence: 1,
      p_metadata: {},
    },
    {
      p_user_id: userId,
      p_project_id: null,
      p_scope: 'preference',
      p_key: 'workspace_understanding',
      p_content: `Typ: ${mapped.companyType}, Rolle: ${mapped.role}, Module: ${personalized.modules.join(', ')}`,
      p_source: 'onboarding',
      p_confidence: 0.88,
      p_metadata: {},
    },
  ]

  let written = 0
  for (const s of seeds) {
    const { error } = await sb.rpc('tagro_upsert_memory', s)
    if (error) console.warn('  ! tagro memory:', s.p_key, error.message)
    else written += 1
  }
  console.log(`✓ tagro_memories seeded (${written}/${seeds.length})`)
}

// ── 7) Magic link + OTP for login ─────────────────────────────────────────
let magicLink = null
let emailOtp = null
{
  const { data, error } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://festag.app'}/auth/callback?next=/dashboard`,
    },
  })
  if (error) {
    console.warn('! generateLink:', error.message)
  } else {
    magicLink = pickProp(data, 'action_link') || data?.properties?.action_link || null
    emailOtp = pickProp(data, 'email_otp')
    console.log('✓ magic link + OTP generated')
  }
}

// ── 8) Verify read-back ───────────────────────────────────────────────────
const [{ data: profile }, { data: ws }, { data: onb }, { data: mems }] = await Promise.all([
  sb.from('profiles').select('full_name,position,avatar_url,dev_profile_facts,email').eq('id', userId).maybeSingle(),
  sb.from('workspaces').select('id,name,slug,mode,metadata').eq('id', workspaceId).maybeSingle(),
  sb.from('onboarding_state').select('*').eq('user_id', userId).maybeSingle(),
  sb.from('tagro_memories').select('scope,key,content,source').eq('user_id', userId).order('updated_at', { ascending: false }).limit(10),
])

const meta = ws?.metadata || {}
const report = {
  userId,
  email,
  password,
  pick,
  mapped,
  profile,
  workspace: {
    id: ws?.id,
    name: ws?.name,
    slug: ws?.slug,
    mode: ws?.mode,
    workspace_type: meta.workspace_type,
    type_confirmed: meta.workspace_type_meta?.confirmed,
    context: meta.workspace_profile?.context,
    inferred: meta.workspace_profile?.inferred,
    personalization: meta.personalization,
  },
  onboarding: onb,
  tagro_memories: mems,
  magicLink,
  emailOtp,
  login: {
    url: 'https://festag.app/login',
    tip: 'OTP-Login: Code unten nutzen, oder Magic-Link öffnen → landet auf /dashboard',
  },
  settingsExpect: {
    name: profile?.full_name,
    position: profile?.position,
    avatar: profile?.avatar_url,
    workspaceName: ws?.name,
    workspaceType: meta.workspace_type,
    workspaceContext: meta.workspace_profile?.context,
  },
  dashboardExpect: {
    headline: meta.personalization?.headline,
    modules: meta.personalization?.modules,
  },
}

console.log('\n── Verification ──')
console.log(JSON.stringify(report, null, 2))
console.log('\nDone.\n')
