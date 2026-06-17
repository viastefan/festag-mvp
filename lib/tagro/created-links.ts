export type TagroCreatedItem = { type: string; id: string; title: string }

export function tagroCreatedHref(item: Pick<TagroCreatedItem, 'type' | 'id'>): string | null {
  switch (item.type) {
    case 'task': return `/tasks/${item.id}`
    case 'decision': return `/decisions/${item.id}`
    case 'note': return `/notes?open=${encodeURIComponent(item.id)}`
    default: return null
  }
}
