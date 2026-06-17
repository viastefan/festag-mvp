/**
 * One-off seed script — inserts provisional sample decisions via service role.
 * Usage: node scripts/seed-decisions.mjs [--force] [--email=user@example.com]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

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
  } catch {
    // optional
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const force = process.argv.includes('--force')
const emailArg = process.argv.find(a => a.startsWith('--email='))
const targetEmail = emailArg ? emailArg.split('=')[1] : null

const supa = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const SAMPLES = [
  { question: 'Logo-Farbe freigeben — Die finale Markenfarbe für UI-Assets und Marketing-Material. [festag-sample]', options: ['Freigeben', 'Ablehnen'], type: 'direction', urgency: 'high', tagro: 'Tagro empfiehlt Freigeben — schnellste Route zum Projektziel.' },
  { question: 'Zahlungsanbieter wählen — Checkout und Abo-Modell hängen an dieser Entscheidung. [festag-sample]', options: ['Stripe', 'Ablehnen'], type: 'payment', urgency: 'critical', tagro: 'Tagro empfiehlt Stripe — schnellste Integration für Karten und SEPA.' },
  { question: 'Hosting-Provider wählen — Staging-URL und Produktions-Deploy hängen davon ab. [festag-sample]', options: ['Vercel', 'Ablehnen'], type: 'scope', urgency: 'high', tagro: 'Tagro empfiehlt Vercel — passt zum Next.js-Stack.' },
  { question: 'Domain-Strategie festlegen — SEO und Markenklarheit für den Launch. [festag-sample]', options: ['Freigeben', 'Ablehnen'], type: 'tradeoff', urgency: 'normal', tagro: 'Tagro empfiehlt die vorgeschlagene Domain-Strategie.' },
  { question: 'SEO-Keywords bestätigen — Content-Team wartet auf die finale Liste. [festag-sample]', options: ['Freigeben', 'Ablehnen'], type: 'tradeoff', urgency: 'normal', tagro: 'Tagro empfiehlt die Keyword-Liste für die ersten Landingpages.' },
  { question: 'Analytics-Tool freigeben — Tracking war Voraussetzung für den Soft-Launch. [festag-sample]', options: ['Freigeben', 'Ablehnen'], type: 'approval', urgency: 'low', tagro: 'Tagro empfiehlt Plausible — datenschutzfreundlich.', decided: true },
]

async function main() {
  let userId = null
  if (targetEmail) {
    const { data: prof } = await supa.from('profiles').select('id,email').eq('email', targetEmail).maybeSingle()
    userId = prof?.id ?? null
    if (!userId) {
      console.error('User not found for email', targetEmail)
      process.exit(1)
    }
    console.log('Target user:', targetEmail, userId)
  } else {
    const { data: profs } = await supa.from('profiles').select('id,email,role').order('created_at', { ascending: false }).limit(5)
    console.log('Recent profiles (pass --email= to target):', profs?.map(p => p.email))
    userId = profs?.[0]?.id ?? null
  }

  const { data: proj } = await supa
    .from('projects')
    .select('id,title,user_id,client_id')
    .or(userId ? `user_id.eq.${userId},client_id.eq.${userId}` : 'id.neq.')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!proj) {
    console.error('No project found for user')
    process.exit(1)
  }

  const requestedFor = proj.client_id || proj.user_id || userId
  const createdBy = proj.user_id || userId
  console.log('Project:', proj.title, proj.id)
  console.log('requested_for:', requestedFor)

  if (force) {
    await supa.from('decisions').delete().eq('project_id', proj.id).ilike('internal_description', '%[festag-sample]%')
  } else {
    const { count } = await supa.from('decisions').select('id', { count: 'exact', head: true }).eq('project_id', proj.id).ilike('internal_description', '%[festag-sample]%')
    if ((count ?? 0) > 0) {
      console.log('Already seeded', count, 'samples — use --force to replace')
      process.exit(0)
    }
  }

  const created = []
  for (const s of SAMPLES) {
    const legacyOptions = s.options.map((label, i) => ({ id: `opt-${i + 1}`, label }))
    const { data: row, error } = await supa.from('decisions').insert({
      project_id: proj.id,
      title: s.question.split('—')[0].trim(),
      description: s.question,
      client_title: s.question.split('—')[0].trim(),
      client_summary: s.question.split('—').slice(1).join('—').replace(' [festag-sample]', '').trim() || s.question,
      internal_title: s.question,
      internal_description: s.question,
      options_json: legacyOptions,
      recommended_option: 'opt-1',
      tagro_reasoning: s.tagro,
      tagro_recommendation_reason: s.tagro,
      tagro_run_at: new Date().toISOString(),
      tagro_confidence_in_framing: 0.82,
      decision_type: s.type,
      response_type: 'binary',
      authority: 'client',
      delegate_allowed: s.type !== 'payment',
      reversibility: s.type === 'payment' ? 'one_way_door' : 'two_way_door',
      urgency: s.urgency,
      status: s.decided ? 'decided' : 'pending_client',
      visible_to_client: true,
      source: 'dev_request',
      created_by: createdBy,
      requested_for: requestedFor,
      decided_by: s.decided ? requestedFor : null,
      decided_at: s.decided ? new Date(Date.now() - 86400000).toISOString() : null,
      response_value: s.decided ? { selected_option_id: 'opt-1' } : null,
      selected_option: s.decided ? 'opt-1' : null,
    }).select('id,client_title,status').single()

    if (error) {
      console.error('Insert failed:', error.message)
      continue
    }

    await supa.from('decision_options').insert(
      s.options.map((label, i) => ({
        decision_id: row.id,
        ordinal: i,
        external_id: `opt-${i + 1}`,
        label,
        client_label: label,
        recommended_by_tagro: i === 0,
      })),
    )

    created.push(row)
  }

  console.log('Created', created.length, 'decisions:')
  for (const c of created) console.log(' -', c.id, c.client_title, c.status)
  console.log('\nOpen:', `https://festag.app/decisions?demo=0`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
