import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { COVER_BUCKET, checkCoverFile, coverPath, signCover } from '@/lib/projects/cover'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Projekt-Titelbild.
 *
 *   GET    → signierter Link auf das aktuelle Cover
 *   POST   → Bild setzen (multipart, Feld `file`)
 *   DELETE → Bild entfernen
 *
 * Der Zugriff wird zweimal geprüft, und das ist Absicht: einmal hier über die
 * RLS des Aufrufers (das SELECT auf projects gelingt nur mit Projektzugriff),
 * und einmal von der Storage-Policy, die am ersten Ordnersegment hängt. Beide
 * Prüfungen sind serverseitig — dass der Knopf im Frontend fehlt, ist kein
 * Schutz, sondern nur Höflichkeit.
 */

async function loadProject(supa: any, projectId: string) {
  const { data } = await supa
    .from('projects').select('id,title,cover_path').eq('id', projectId).maybeSingle()
  return data ?? null
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const project = await loadProject(supa, ctx.params.id)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ url: await signCover(supa as any, project.cover_path) })
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const projectId = ctx.params.id
  const project = await loadProject(supa, projectId)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let file: File | null = null
  try {
    const form = await req.formData()
    const candidate = form.get('file')
    if (candidate instanceof File) file = candidate
  } catch {
    return NextResponse.json({ error: 'Die Datei konnte nicht gelesen werden.' }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: 'Es wurde kein Bild mitgeschickt.' }, { status: 400 })

  const check = checkCoverFile(file.type, file.size)
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 })

  const path = coverPath(projectId, check.ext)
  const { error: uploadError } = await supa.storage
    .from(COVER_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false })
  if (uploadError) {
    return NextResponse.json(
      { error: 'Das Bild konnte nicht gespeichert werden. Am Projekt hat sich nichts geändert.' },
      { status: 500 },
    )
  }

  const { error: writeError } = await supa
    .from('projects')
    .update({ cover_path: path, cover_updated_at: new Date().toISOString(), cover_by: user.id })
    .eq('id', projectId)

  if (writeError) {
    /* Die Zeile hat nicht gelernt, dass es die Datei gibt — dann darf die
       Datei auch nicht bleiben. Sonst sammelt der Bucket Bilder an, die zu
       nichts gehören und die niemand je wieder findet. */
    try { await supa.storage.from(COVER_BUCKET).remove([path]) } catch { /* best effort */ }
    return NextResponse.json(
      { error: 'Das Bild konnte dem Projekt nicht zugeordnet werden.' },
      { status: 500 },
    )
  }

  /* Das alte Bild erst weg, wenn das neue steht. Andersherum stünde das
     Projekt bei einem Fehler ganz ohne da. */
  if (project.cover_path && project.cover_path !== path) {
    await supa.storage.from(COVER_BUCKET).remove([project.cover_path])
  }

  await supa.from('activity_feed').insert({
    project_id: projectId,
    title: 'Titelbild aktualisiert',
    body: null,
    event_type: 'project_cover_set',
    actor_role: 'user',
  })

  return NextResponse.json({ path, url: await signCover(supa as any, path) })
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const projectId = ctx.params.id
  const project = await loadProject(supa, projectId)
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!project.cover_path) return NextResponse.json({ ok: true })

  const { error } = await supa
    .from('projects')
    .update({ cover_path: null, cover_updated_at: null, cover_by: null })
    .eq('id', projectId)
  if (error) {
    return NextResponse.json({ error: 'Das Titelbild konnte nicht entfernt werden.' }, { status: 500 })
  }

  await supa.storage.from(COVER_BUCKET).remove([project.cover_path])
  await supa.from('activity_feed').insert({
    project_id: projectId,
    title: 'Titelbild entfernt',
    body: null,
    event_type: 'project_cover_cleared',
    actor_role: 'user',
  })

  return NextResponse.json({ ok: true })
}
