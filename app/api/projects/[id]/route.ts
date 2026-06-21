import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** GET /api/projects/[id] — unified project snapshot for portal + dev surfaces */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const [
    { data: project, error: projectError },
    { data: tasks },
    { data: milestones },
    { data: assignments },
    { data: members },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
    supabase
      .from('tasks')
      .select('id,title,status,priority,updated_at,created_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index'),
    supabase
      .from('project_assignments')
      .select('user_id,active,created_at')
      .eq('project_id', projectId)
      .eq('active', true),
    supabase
      .from('project_members')
      .select('user_id,role')
      .eq('project_id', projectId),
  ])

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({
    project,
    tasks: tasks ?? [],
    milestones: milestones ?? [],
    assignments: assignments ?? [],
    members: members ?? [],
  })
}
