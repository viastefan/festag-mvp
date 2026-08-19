import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/review/extract  (multipart/form-data: file)
 *
 * Reads the text out of an uploaded PDF so the change requests inside it can
 * become a work list. Nothing is stored here — the text goes straight back to
 * the caller, who decides whether to submit it. Storing a document the user
 * has not yet chosen to send would be the wrong default.
 *
 * A PDF that yields no text is almost always a scan. That is worth saying
 * plainly, because the fix is different: it needs OCR, not a retry.
 */

const MAX_BYTES = 12 * 1024 * 1024

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'bad_request', message: 'Datei fehlt.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'bad_request', message: 'Datei fehlt.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({
      error: 'too_large',
      message: 'Das Dokument ist größer als 12 MB. Bitte teile es auf.',
    }, { status: 413 })
  }
  if (!/pdf/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
    return NextResponse.json({
      error: 'unsupported',
      message: 'Im Moment lassen sich nur PDFs auslesen. Den Text kannst du auch einfügen.',
    }, { status: 415 })
  }

  try {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const buf = new Uint8Array(await file.arrayBuffer())
    const doc = await getDocumentProxy(buf)
    const { text, totalPages } = await extractText(doc, { mergePages: true })

    const clean = (Array.isArray(text) ? text.join('\n') : text || '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!clean) {
      return NextResponse.json({
        error: 'no_text',
        message: 'In diesem PDF steckt kein auslesbarer Text — vermutlich ein Scan. '
          + 'Du kannst die Punkte von Hand einfügen.',
        pages: totalPages ?? null,
      }, { status: 422 })
    }

    return NextResponse.json({
      text: clean.slice(0, 60_000),
      pages: totalPages ?? null,
      name: file.name,
      truncated: clean.length > 60_000,
    })
  } catch {
    return NextResponse.json({
      error: 'unreadable',
      message: 'Das PDF konnte nicht gelesen werden. Möglicherweise ist es beschädigt oder geschützt.',
    }, { status: 422 })
  }
}
