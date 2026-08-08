/**
 * Minimal Festag briefing PDF (no dependency) — WinAnsi text for DE umlauts.
 */

function escapePdf(s: string) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function toWinAnsi(s: string) {
  return Array.from(s)
    .map((ch) => {
      const map: Record<string, string> = {
        Ä: '\\304',
        Ö: '\\326',
        Ü: '\\334',
        ä: '\\344',
        ö: '\\366',
        ü: '\\374',
        ß: '\\337',
        '—': '-',
        '–': '-',
        '…': '...',
        '„': '"',
        '“': '"',
        '”': '"',
        '’': "'",
      }
      if (map[ch]) return map[ch]
      const code = ch.charCodeAt(0)
      if (code < 128) return ch
      return '?'
    })
    .join('')
}

function wrapLines(text: string, max = 86): string[] {
  const out: string[] = []
  for (const para of text.split(/\n+/)) {
    const words = para.trim().split(/\s+/).filter(Boolean)
    if (!words.length) {
      out.push('')
      continue
    }
    let line = ''
    for (const w of words) {
      const next = line ? `${line} ${w}` : w
      if (next.length > max) {
        if (line) out.push(line)
        line = w
      } else {
        line = next
      }
    }
    if (line) out.push(line)
    out.push('')
  }
  while (out.length && out[out.length - 1] === '') out.pop()
  return out
}

function byteLength(s: string) {
  return new TextEncoder().encode(s).length
}

function buildPdf(title: string, body: string): Blob {
  const lines = [
    toWinAnsi(title),
    '',
    ...wrapLines(toWinAnsi(body), 86),
  ]

  const content: string[] = ['BT', '/F1 11 Tf', '14 TL', '50 780 Td']
  lines.forEach((line, i) => {
    if (i === 0) {
      content.push('/F1 16 Tf', `(${escapePdf(line)}) Tj`, '/F1 11 Tf', '0 -22 Td')
    } else if (line === '') {
      content.push('0 -10 Td')
    } else {
      content.push(`(${escapePdf(line)}) Tj`, 'T*')
    }
  })
  content.push('ET')
  const stream = content.join('\n')

  const objects: string[] = []
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj')
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj')
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj',
  )
  objects.push(`4 0 obj<< /Length ${byteLength(stream)} >>stream\n${stream}\nendstream endobj`)
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj')

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(byteLength(pdf))
    pdf += `${obj}\n`
  }
  const xrefStart = byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdf += `startxref\n${xrefStart}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

export function downloadBriefingPdf(opts: {
  title: string
  body: string
  filename?: string
}) {
  if (typeof window === 'undefined') return
  const blob = buildPdf(opts.title, opts.body)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = opts.filename || 'festag-bericht.pdf'
  a.click()
  URL.revokeObjectURL(url)
}
