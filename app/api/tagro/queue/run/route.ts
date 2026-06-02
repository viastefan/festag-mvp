import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runQueueJob, nextOutputVersion } from '@/lib/tagro/queue-runner'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/tagro/queue/run  { jobId }
 *
 * Manual "Jetzt erzeugen" — runs one scheduled job now and saves the result as
 * a DRAFT ai_output (or in_review when the job requires approval). User-bound:
 * RLS scopes the job + insert to the caller's projects. Never auto-delivers.
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { jobId } = await req.json().catch(() => ({}))
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  // RLS ensures the user can only read jobs on their projects.
  const { data: job } = await (supa as any)
    .from('scheduled_ai_jobs')
    .select('id,project_id,job_type,output_type,audience,delivery_mode,review_required')
    .eq('id', jobId)
    .maybeSingle()
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const out = await runQueueJob(supa, job)
  if (!out.ok) return NextResponse.json({ error: out.error || 'Tagro konnte keinen Output erzeugen.' }, { status: 502 })

  const version = await nextOutputVersion(supa, job.project_id, job.output_type)
  const status = job.review_required ? 'in_review' : 'draft'
  const { data: inserted, error: insErr } = await (supa as any).from('ai_outputs').insert({
    job_id: job.id,
    project_id: job.project_id,
    output_type: job.output_type,
    audience: job.audience,
    title: out.title,
    content: out.content,
    status,
    version,
    created_by: user.id,
    metadata: { model: out.model ?? null, generated_by: 'manual' },
  }).select('id,title,status,version,created_at').single()

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // Best-effort: stamp the job's last_run_at.
  await (supa as any).from('scheduled_ai_jobs').update({ last_run_at: new Date().toISOString() }).eq('id', job.id)

  return NextResponse.json({ ok: true, output: inserted })
}
