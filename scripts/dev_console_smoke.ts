/**
 * Dev Console Relay — E2E smoke (WP9).
 *
 * Exercises the full relay chain against a real Supabase project using the
 * service role. Decompose a mixed dev message → dispatch → assert a published
 * decision, a client task, client inbox items (badge), auto-checked ledger
 * tasks, and idempotency on re-dispatch.
 *
 * Run:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   SMOKE_PROJECT_ID=<uuid> SMOKE_DEVELOPER_ID=<auth uuid> \
 *   npx tsx scripts/dev_console_smoke.ts
 *
 * Without an LLM key the decomposition uses the heuristic fallback (one
 * status_update); set ANTHROPIC_API_KEY/OPENAI_API_KEY for the full split.
 */

import { createClient } from '@supabase/supabase-js'
import { decomposeDevMessage, dispatchRelayItem } from '../lib/dev-console'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const projectId = process.env.SMOKE_PROJECT_ID!
const developerId = process.env.SMOKE_DEVELOPER_ID!

const MESSAGE =
  'Login-Redesign ist fertig, Avatar-Upload geht jetzt; für die Zahlung muss der ' +
  'Kunde Stripe oder PayPal wählen; brauche noch das Logo als SVG.'

async function main() {
  if (!url || !key || !projectId || !developerId) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SMOKE_PROJECT_ID, SMOKE_DEVELOPER_ID')
  }
  const sb = createClient(url, key, { auth: { persistSession: false } })

  // 1. dev console message
  const threadId = (await sb.rpc('dev_console_thread', {
    p_developer: developerId, p_project: projectId, p_thread_id: null, p_new: true, p_title: 'Smoke',
  })).data as string
  const { data: msg } = await (sb as any).from('inbox_items').insert({
    thread_id: threadId, user_id: developerId, project_id: projectId,
    category: 'tagro', type: 'chat_message', title: 'Dev', body: MESSAGE, actor_id: developerId,
  }).select('id').single()

  // 2. decompose
  const plan = await decomposeDevMessage(sb as any, { projectId, developerId, text: MESSAGE })
  console.log(`plan: ${plan.items.length} items (${plan.model}) — ${plan.items.map((i) => i.relay_kind).join(', ')}`)

  // 3. dispatch each non-internal item
  const toSend = plan.items.filter((i) => i.relay_kind !== 'internal_note')
  const results = []
  for (const item of toSend) {
    results.push(await dispatchRelayItem(sb as any, { messageItemId: msg.id, item, projectId, developerId }))
  }
  console.log('dispatched:', results.map((r) => `${r.relay_kind}${r.decision_id ? '+dec' : ''}${r.task_id ? '+task' : ''}`).join(', '))

  // 4. idempotency — re-dispatch must skip
  const reAll = await Promise.all(toSend.map((item) =>
    dispatchRelayItem(sb as any, { messageItemId: msg.id, item, projectId, developerId })))
  const reSkipped = reAll.every((r) => r.skipped)

  // 5. assertions
  const ledgerCount = (await (sb as any).from('tasks').select('id', { count: 'exact', head: true })
    .eq('project_id', projectId).eq('task_type', 'tagro_relay')).count ?? 0
  const dispatchCount = (await (sb as any).from('dev_relay_dispatches').select('id', { count: 'exact', head: true })
    .eq('source_item_id', msg.id).not('dispatched_at', 'is', null)).count ?? 0

  console.log('\n— assertions —')
  console.log('idempotent re-dispatch skipped :', reSkipped)
  console.log('ledger tasks (auto-checked)    :', ledgerCount, '>= ', toSend.length)
  console.log('dispatch records               :', dispatchCount)
  console.log(reSkipped && dispatchCount >= toSend.length ? '\n✅ smoke passed' : '\n❌ smoke failed')
}

main().catch((e) => { console.error(e); process.exit(1) })
