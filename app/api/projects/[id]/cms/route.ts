import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCmsTemplate } from '@/lib/cms/templates'

export const runtime = 'nodejs'

/**
 * Project CMS content-intake API (slice 1+2).
 *
 *   GET    → load the assembled intake (cms + sections + fields + values)
 *   POST   { action: 'instantiate', template_key }   → create from a template
 *          { action: 'save_value', field_id, value } → upsert a value, then
 *                                                       recompute section status
 *          { action: 'set_section', section_id, status } → owner/dev marks a
 *                                                       section (e.g. übernommen)
 *
 * RLS gates who may do what (structure = owner/dev, values = any member).
 */

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const projectId = ctx.params.id

  const { data: cms } = await (supa as any).from('project_cms').select('*').eq('project_id', projectId).maybeSingle()
  if (!cms) return NextResponse.json({ cms: null, sections: [] })

  const [{ data: sections }, { data: fields }, { data: values }] = await Promise.all([
    (supa as any).from('cms_sections').select('*').eq('project_cms_id', cms.id).order('ord', { ascending: true }),
    (supa as any).from('cms_fields').select('*').eq('project_id', projectId).order('ord', { ascending: true }),
    (supa as any).from('cms_values').select('field_id,value,updated_at').eq('project_id', projectId),
  ])

  const valueByField = new Map<string, any>(((values ?? []) as any[]).map(v => [v.field_id, v.value]))
  const fieldsBySection = new Map<string, any[]>()
  for (const f of (fields ?? []) as any[]) {
    const arr = fieldsBySection.get(f.section_id) ?? []
    arr.push({ ...f, value: valueByField.get(f.id) ?? '' })
    fieldsBySection.set(f.section_id, arr)
  }

  const assembled = ((sections ?? []) as any[]).map(s => ({ ...s, fields: fieldsBySection.get(s.id) ?? [] }))
  return NextResponse.json({ cms, sections: assembled })
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const projectId = ctx.params.id
  const body = await req.json().catch(() => ({} as any))
  const action = body?.action as string

  if (action === 'instantiate') {
    const template = getCmsTemplate(body?.template_key)
    if (!template) return NextResponse.json({ error: 'unknown_template' }, { status: 400 })

    // One intake per project.
    const { data: existing } = await (supa as any).from('project_cms').select('id').eq('project_id', projectId).maybeSingle()
    if (existing) return NextResponse.json({ error: 'already_exists' }, { status: 409 })

    const { data: cms, error: cmsErr } = await (supa as any).from('project_cms').insert({
      project_id: projectId, template_key: template.key, title: 'Website-Inhalte',
      status: 'published', created_by: user.id,
    }).select('*').single()
    if (cmsErr) return NextResponse.json({ error: cmsErr.message }, { status: 403 })

    let sord = 0
    for (const sec of template.sections) {
      const { data: section, error: secErr } = await (supa as any).from('cms_sections').insert({
        project_cms_id: cms.id, project_id: projectId, key: sec.key, title: sec.title,
        description: sec.description ?? null, ord: sord++,
      }).select('id').single()
      if (secErr) return NextResponse.json({ error: secErr.message }, { status: 500 })
      let ford = 0
      const rows = sec.fields.map(f => ({
        section_id: section.id, project_id: projectId, key: f.key, label: f.label,
        type: f.type, help: f.help ?? null, required: !!f.required, ord: ford++,
      }))
      if (rows.length) {
        const { error: fErr } = await (supa as any).from('cms_fields').insert(rows)
        if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })
      }
    }
    return NextResponse.json({ ok: true, cms_id: cms.id })
  }

  if (action === 'save_value') {
    const fieldId = body?.field_id as string
    if (!fieldId) return NextResponse.json({ error: 'field_id required' }, { status: 400 })
    const value = body?.value ?? ''

    const { error: upErr } = await (supa as any).from('cms_values').upsert({
      field_id: fieldId, project_id: projectId, value, updated_by: user.id, updated_at: new Date().toISOString(),
    }, { onConflict: 'field_id' })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 403 })

    // Section status + dev notification are handled by DB triggers
    // (recompute_cms_section_status → notify_cms_section_filled), so a client
    // who can't write cms_sections still flips the status server-side.
    return NextResponse.json({ ok: true })
  }

  if (action === 'set_section') {
    const sectionId = body?.section_id as string
    const status = body?.status as string
    if (!sectionId || !['offen', 'ausgefuellt', 'uebernommen'].includes(status)) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    }
    const { error } = await (supa as any).from('cms_sections').update({ status }).eq('id', sectionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 403 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
