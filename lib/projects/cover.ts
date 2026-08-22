/**
 * Projekt-Titelbild — die Regeln an einer Stelle.
 *
 * Was ein Cover sein darf, wo es liegt und wie daraus ein anzeigbarer Link
 * wird, steht hier und nirgends sonst. Die Route prüft damit, die Liste
 * signiert damit — sonst driften Upload und Anzeige auseinander, und man
 * findet erst in Produktion heraus, dass das eine erlaubt, was das andere
 * nicht darstellen kann.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const COVER_BUCKET = 'project-assets'

/** Nur das, was jeder Browser ohne Plugin zeichnet. */
export const COVER_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const

/**
 * 4 MB. Ein Titelbild wird als Kachel von wenigen hundert Pixeln gezeigt —
 * alles darüber kostet Ladezeit für Pixel, die nie jemand sieht. Die Grenze
 * steht hier und nicht im Formular, weil eine Grenze, die nur das Frontend
 * kennt, keine Grenze ist.
 */
export const COVER_MAX_BYTES = 4 * 1024 * 1024

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export type CoverRejection = { ok: false; reason: string }
export type CoverAccepted = { ok: true; ext: string }

/**
 * Prüft eine hochgeladene Datei. Die Begründung ist der Satz, den der Nutzer
 * zu lesen bekommt — kein Fehlercode, den erst jemand übersetzen muss.
 */
export function checkCoverFile(type: string, size: number): CoverAccepted | CoverRejection {
  if (!COVER_MIME.includes(type as (typeof COVER_MIME)[number])) {
    return { ok: false, reason: 'Bitte ein Bild als PNG, JPG oder WebP wählen.' }
  }
  if (size <= 0) {
    return { ok: false, reason: 'Die Datei ist leer.' }
  }
  if (size > COVER_MAX_BYTES) {
    return { ok: false, reason: 'Das Bild ist größer als 4 MB. Ein kleineres reicht völlig.' }
  }
  return { ok: true, ext: EXT[type] }
}

/**
 * Der Pfad im Bucket.
 *
 * Das erste Segment **muss** die projectId sein — daran hängt die Storage-RLS
 * aus 20260516_project_assets.sql fest (`storage.foldername(name))[1]`). Wer
 * dieses Segment ändert, hebelt die Zugriffsprüfung aus, ohne dass irgendwo
 * ein Fehler erscheint.
 */
export function coverPath(projectId: string, ext: string): string {
  return `${projectId}/cover/${Date.now()}.${ext}`
}

const SIGNED_TTL_SECONDS = 60 * 60

/** Ein anzeigbarer Link für ein Cover. Null, wenn es keines gibt. */
export async function signCover(
  sb: SupabaseClient<any>,
  path?: string | null,
): Promise<string | null> {
  const clean = (path ?? '').trim()
  if (!clean) return null
  const { data } = await sb.storage.from(COVER_BUCKET).createSignedUrl(clean, SIGNED_TTL_SECONDS)
  return data?.signedUrl ?? null
}

/**
 * Links für viele Projekte auf einmal.
 *
 * Einzeln signiert kostet eine Liste mit zwanzig Projekten zwanzig Roundtrips.
 * `createSignedUrls` macht daraus einen. Fehlt ein Link, fehlt eben das Bild —
 * eine Liste darf nicht daran scheitern, dass eine Datei verschwunden ist.
 */
export async function signCovers(
  sb: SupabaseClient<any>,
  paths: string[],
): Promise<Map<string, string>> {
  const wanted = Array.from(new Set(paths.map((p) => (p ?? '').trim()).filter(Boolean)))
  const out = new Map<string, string>()
  if (!wanted.length) return out
  const { data } = await sb.storage.from(COVER_BUCKET).createSignedUrls(wanted, SIGNED_TTL_SECONDS)
  for (const row of data ?? []) {
    if (row?.path && row?.signedUrl) out.set(row.path, row.signedUrl)
  }
  return out
}
