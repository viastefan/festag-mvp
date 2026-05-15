import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

type MemoryRow = {
  scope: string
  key: string | null
  content: string
  confidence: number | null
  updated_at: string
}

type ProfileRow = {
  email?: string | null
  full_name?: string | null
  position?: string | null
  phone?: string | null
  company_name?: string | null
  company_desc?: string | null
  company_industry?: string | null
  company_size?: string | null
}

type ProjectRow = {
  id: string
  title: string
  status?: string | null
  scope_summary?: string | null
  description?: string | null
}

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function line(label: string, value?: string | null) {
  const clean = value?.trim()
  return clean ? `- ${label}: ${clean}` : null
}

export async function loadTagroMemoryContext({
  userId,
  projectId,
  limit = 12,
}: {
  userId?: string | null
  projectId?: string | null
  limit?: number
}) {
  if (!userId) return ''
  const sb = serviceClient()
  if (!sb) return ''

  const sections: string[] = []

  const { data: memories } = await sb
    .from('tagro_memories')
    .select('scope,key,content,confidence,updated_at')
    .eq('user_id', userId)
    .or(projectId ? `project_id.is.null,project_id.eq.${projectId}` : 'project_id.is.null')
    .order('updated_at', { ascending: false })
    .limit(limit)

  const memoryRows = (memories as MemoryRow[] | null) ?? []
  if (memoryRows.length) {
    sections.push([
      'Bekannte Tagro-Memory Einträge:',
      ...memoryRows.map((m) => `- [${m.scope}${m.key ? `:${m.key}` : ''}] ${m.content}`),
    ].join('\n'))
  }

  const { data: profile } = await sb
    .from('profiles')
    .select('email,full_name,position,phone,company_name,company_desc,company_industry,company_size')
    .eq('id', userId)
    .maybeSingle()

  const profileRows = [
    line('Name', (profile as ProfileRow | null)?.full_name),
    line('E-Mail', (profile as ProfileRow | null)?.email),
    line('Position', (profile as ProfileRow | null)?.position),
    line('Unternehmen', (profile as ProfileRow | null)?.company_name),
    line('Branche', (profile as ProfileRow | null)?.company_industry),
    line('Teamgröße', (profile as ProfileRow | null)?.company_size),
    line('Unternehmenskontext', (profile as ProfileRow | null)?.company_desc),
  ].filter(Boolean)

  if (profileRows.length) {
    sections.push(['Client-Kontext aus dem Profil:', ...profileRows].join('\n'))
  }

  if (projectId) {
    const { data: project } = await sb
      .from('projects')
      .select('id,title,status,scope_summary,description')
      .eq('id', projectId)
      .maybeSingle()

    const p = project as ProjectRow | null
    const projectRows = [
      line('Projekt', p?.title),
      line('Status', p?.status),
      line('Scope', p?.scope_summary ?? p?.description),
    ].filter(Boolean)

    if (projectRows.length) {
      sections.push(['Aktueller Projektkontext:', ...projectRows].join('\n'))
    }
  }

  return sections.join('\n\n')
}

export async function rememberTagroMemory({
  userId,
  projectId = null,
  scope = 'account',
  key,
  content,
  source = 'api',
  confidence = 1,
}: {
  userId: string
  projectId?: string | null
  scope?: 'account' | 'project' | 'preference' | 'fact' | 'constraint' | 'handoff'
  key?: string | null
  content: string
  source?: string
  confidence?: number
}) {
  const sb = serviceClient()
  if (!sb || !content.trim()) return null
  const { data, error } = await sb.rpc('tagro_upsert_memory', {
    p_user_id: userId,
    p_project_id: projectId,
    p_scope: scope,
    p_key: key ?? null,
    p_content: content.trim(),
    p_source: source,
    p_confidence: confidence,
    p_metadata: {},
  })
  if (error) return null
  return data as string | null
}
