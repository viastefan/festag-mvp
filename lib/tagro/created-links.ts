export type TagroCreatedItem = { type: string; id: string; title: string }

export type TagroLinkSurface = 'client' | 'dev'

export function tagroCreatedHref(
  item: Pick<TagroCreatedItem, 'type' | 'id'>,
  surface: TagroLinkSurface = 'client',
): string | null {
  const dev = surface === 'dev'
  switch (item.type) {
    case 'task':
      return dev ? `/dev/tasks?id=${item.id}` : `/tasks/${item.id}`
    case 'decision':
      return dev ? `/dev/decisions?open=${item.id}` : `/decisions/${item.id}`
    case 'note':
      return dev ? `/dev/notes?open=${encodeURIComponent(item.id)}` : `/notes?open=${encodeURIComponent(item.id)}`
    default:
      return null
  }
}
