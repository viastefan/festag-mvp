export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 2) return 'Gerade'
  if (diffMin < 60) return `${diffMin} Min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} Std`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD} T`
  const diffW = Math.floor(diffD / 7)
  if (diffW < 5) return `${diffW} W`
  return `${Math.floor(diffW / 4)} M`
}

export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
