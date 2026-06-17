import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { runQueueJob, computeNextRun, nextOutputVersion } from '@/lib/tagro/queue-runner'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

/**
 * GET /api/cron/tagro-queue
 *
 * Runs due Tagro Queue jobs. Vercel Cron pings this; CRON_SECRET enforced in
 * production. For each enabled job whose next_run_at has passed (or is unset),
 * Tagro produces an output which is persisted to ai_outputs as a DRAFT (or
 * in_review when the job requires approval). Nothing is auto-delivered to
 * clients here — delivery is a separate, explicit step.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ ok: false, error: 'service_key_missing' }, { status: 500 })
  const sb = createServiceClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const nowIso = new Date().toISOString()
  const { data: allJobs, error } = await sb
    .from('scheduled_ai_jobs')
    .select('id,project_id,job_type,output_type,audience,delivery_mode,review_required,cron,created_by,next_run_at')
    .eq('enabled', true)
    .neq('schedule_type', 'manual_only')
    .limit(80)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // Due = never run yet, or next_run_at has passed. Filtered in JS to avoid
  // brittle timestamp parsing in a PostgREST .or() filter.
  const due = ((allJobs as any[]) ?? [])
    .filter(j => !j.next_run_at || j.next_run_at <= nowIso)
    .slice(0, 25)

  const results: Array<{ job: string; ok: boolean; error?: string }> = []
  for (const job of due) {
    try {
      const out = await runQueueJob(sb, job)
      if (!out.ok) { results.push({ job: job.id, ok: false, error: out.error }); continue }

      const version = await nextOutputVersion(sb, job.project_id, job.output_type)
      const status = job.review_required ? 'in_review' : 'draft'
      await sb.from('ai_outputs').insert({
        job_id: job.id,
        project_id: job.project_id,
        output_type: job.output_type,
        audience: job.audience,
        title: out.title,
        content: out.content,
        status,
        version,
        created_by: job.created_by ?? null,
        metadata: { model: out.model ?? null, generated_by: 'cron' },
      })
      await sb.from('scheduled_ai_jobs').update({
        last_run_at: nowIso,
        next_run_at: computeNextRun(job.cron, new Date()),
        updated_at: nowIso,
      }).eq('id', job.id)
      results.push({ job: job.id, ok: true })
    } catch (e: any) {
      results.push({ job: job.id, ok: false, error: e?.message ?? 'run_failed' })
    }
  }

  return NextResponse.json({ ok: true, ran: results.length, results })
}
