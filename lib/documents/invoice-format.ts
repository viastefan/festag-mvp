export function fmtDateShort(s: unknown): string {
  if (!s) return ''
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(String(s)))
  } catch {
    return String(s)
  }
}

export function fmtMonthYear(s: unknown): string {
  if (!s) return ''
  try {
    return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(String(s))).toUpperCase()
  } catch {
    return ''
  }
}

export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}
