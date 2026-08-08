/**
 * Compact briefing note (.txt) — quick export beside PDF / audio.
 */

export function downloadBriefingNote(opts: {
  title: string
  body: string
  filename?: string
}) {
  if (typeof window === 'undefined') return
  const stamp = new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const text = `${opts.title}\n${stamp}\n\n${opts.body.trim()}\n`
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = opts.filename || 'festag-notiz.txt'
  a.click()
  URL.revokeObjectURL(url)
}
