import { createClient as createServiceClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createServiceClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** Pull live metadata for the bound object so Tagro doesn't guess from title alone. */
export async function enrichTagroObjectContext(body: {
  type?: string
  id?: string
  title?: string
  subtitle?: string
  status?: string | null
  projectId?: string
}): Promise<{ subtitle?: string; status?: string; clientVisible?: boolean; projectId?: string }> {
  const type = body.type || ''
  const id = body.id || ''
  if (!id || /^(list|inbox|dev-overview|dev-list|dev-plan|dev-updates|dev-inbox|github|dashboard|all)$/.test(id)) {
    return {}
  }

  const sb = serviceClient()
  if (!sb) return {}

  try {
    if (type === 'task') {
      const { data } = await sb.from('tasks').select('status,project_id,client_visible,priority,due_date').eq('id', id).maybeSingle()
      if (!data) return {}
      return {
        status: data.status ?? body.status ?? undefined,
        clientVisible: typeof data.client_visible === 'boolean' ? data.client_visible : undefined,
        projectId: data.project_id ?? body.projectId,
        subtitle: body.subtitle || [data.priority, data.due_date ? `Fällig ${String(data.due_date).slice(0, 10)}` : ''].filter(Boolean).join(' · ') || undefined,
      }
    }
    if (type === 'decision') {
      const { data } = await sb.from('decisions').select('status,project_id,urgency,due_date,client_title').eq('id', id).maybeSingle()
      if (!data) return {}
      return {
        status: data.status ?? body.status ?? undefined,
        projectId: data.project_id ?? body.projectId,
        subtitle: body.subtitle || [data.urgency, data.due_date ? `Frist ${String(data.due_date).slice(0, 10)}` : ''].filter(Boolean).join(' · ') || undefined,
      }
    }
    if (type === 'project') {
      const { data } = await sb.from('projects').select('status,phase,client_id').eq('id', id).maybeSingle()
      if (!data) return {}
      return {
        status: data.status ?? body.status ?? undefined,
        projectId: id,
        subtitle: body.subtitle || data.phase || undefined,
      }
    }
    if (type === 'status_report' || type === 'report') {
      const { data } = await sb.from('status_reports').select('project_id,summary,created_at').eq('id', id).maybeSingle()
      if (!data) return {}
      return {
        projectId: data.project_id ?? body.projectId,
        subtitle: body.subtitle || data.summary?.slice(0, 120) || undefined,
      }
    }
    if (type === 'document' || type === 'pdf') {
      const { data } = await sb.from('documents').select('project_id,title,type,mime').eq('id', id).maybeSingle()
      if (!data) return {}
      return {
        projectId: data.project_id ?? body.projectId,
        subtitle: body.subtitle || [data.type, data.mime].filter(Boolean).join(' · ') || undefined,
      }
    }
  } catch {
    return {}
  }

  return {}
}
