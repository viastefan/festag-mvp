import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * POST /api/github/webhook
 *
 * Public endpoint that ingests GitHub webhook events. Validates the HMAC
 * signature with `GITHUB_WEBHOOK_SECRET` so unauthenticated callers can't
 * inject fake activity.
 *
 * Supported events (best-effort, idempotent):
 *   - push                   → upsert each commit row
 *   - pull_request           → upsert PR row
 *
 * The route runs with the Supabase service role so it can write across
 * RLS without a user session.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

function timingSafeEq(a: string, b: string) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return timingSafeEq(signature, expected)
}

function sb() {
  // Service-role client bypasses RLS — required for the public webhook path.
  return createServerClient(SUPABASE_URL, SERVICE_KEY ?? '', {
    cookies: {
      getAll() { return [] },
      setAll(_: { name: string; value: string; options: CookieOptions }[]) {},
    },
  })
}

export async function POST(req: Request) {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET
    if (!secret || !SERVICE_KEY) {
      return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 })
    }

    const raw = await req.text()
    const sig = req.headers.get('x-hub-signature-256')
    if (!verifySignature(raw, sig, secret)) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
    }

    const event = req.headers.get('x-github-event') || 'unknown'
    const payload = JSON.parse(raw) as any
    const fullName: string | undefined = payload?.repository?.full_name

    const supabase = sb()
    let repo: any = null
    if (fullName) {
      const { data: r } = await supabase
        .from('github_repositories')
        .select('id,project_id,developer_id,default_branch')
        .eq('repo_full_name', fullName).maybeSingle()
      repo = r
    }

    if (!repo) {
      // We don't know this repo yet — store the raw event for later replay.
      try {
        await supabase.from('audit_logs').insert({
          actor_id: null,
          action: 'github_webhook_unmatched',
          entity_type: 'github',
          metadata: { event, repo: fullName ?? null },
        })
      } catch { /* ignore */ }
      return NextResponse.json({ ok: true, ignored: true })
    }

    if (event === 'push') {
      const branch = String(payload?.ref || '').replace('refs/heads/', '') || null
      const commits = Array.isArray(payload?.commits) ? payload.commits : []
      for (const c of commits) {
        await supabase.from('github_commits').upsert({
          repo_id: repo.id,
          project_id: repo.project_id,
          developer_id: repo.developer_id,
          commit_sha: c.id,
          message: String(c.message ?? '').slice(0, 4000),
          author_name: c.author?.name ?? null,
          author_email: c.author?.email ?? null,
          commit_url: c.url,
          committed_at: c.timestamp ?? null,
          files_changed_count: (c.added?.length ?? 0) + (c.modified?.length ?? 0) + (c.removed?.length ?? 0),
          raw_payload: c,
          branch_name: branch,
        }, { onConflict: 'repo_id,commit_sha' })
      }

      if (repo.project_id && commits.length > 0) {
        try {
          const { emitDevActionToClient } = await import('@/lib/client/connection-bridge')
          const last = commits[commits.length - 1]
          await emitDevActionToClient(supabase as any, {
            projectId: repo.project_id,
            type: 'code_update',
            content: [
              `Git push · ${branch || 'branch'}`,
              `${commits.length} Commit(s)`,
              String(last.message ?? '').slice(0, 240),
            ].filter(Boolean).join('\n'),
            source: 'github_push',
            visibility: 'team',
            createdBy: repo.developer_id ?? null,
            notifyClient: false,
          })
        } catch { /* non-blocking */ }
      }
    }

    if (event === 'pull_request') {
      const p = payload?.pull_request
      if (p) {
        await supabase.from('github_pull_requests').upsert({
          repo_id: repo.id,
          project_id: repo.project_id,
          developer_id: repo.developer_id,
          pr_number: p.number,
          title: String(p.title ?? '').slice(0, 500),
          state: p.state,
          merged: !!p.merged,
          pr_url: p.html_url,
          created_at_github: p.created_at,
          updated_at_github: p.updated_at,
          merged_at: p.merged_at,
          head_branch: p.head?.ref ?? null,
          base_branch: p.base?.ref ?? null,
          raw_payload: p,
        }, { onConflict: 'repo_id,pr_number' })

        if (repo.project_id && p.merged) {
          try {
            const { emitDevActionToClient } = await import('@/lib/client/connection-bridge')
            await emitDevActionToClient(supabase as any, {
              projectId: repo.project_id,
              type: 'code_update',
              content: `Pull Request gemerged: #${p.number} ${String(p.title ?? '').slice(0, 200)}`,
              source: 'github_pr_merged',
              visibility: 'client',
              createdBy: repo.developer_id ?? null,
              notifyClient: true,
              inboxTitle: `Code gemerged · PR #${p.number}`,
            })
          } catch { /* non-blocking */ }
        }
      }
    }

    try {
      await supabase.from('audit_logs').insert({
        actor_id: null,
        action: 'github_webhook',
        entity_type: 'github',
        entity_id: repo.id,
        metadata: { event, repo: fullName },
      })
    } catch { /* ignore */ }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
