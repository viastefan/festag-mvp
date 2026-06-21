/**
 * „Letzte ausgeführt" — action-oriented feed for the portal sidebar.
 * Merges user decisions + Tagro conversations (summary or first prompt).
 */

type AnySb = any

export type RecentExecutedItem = {
  id: string
  label: string
  href: string
  at: string
}

function truncate(text: string, max = 34) {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return `${t.slice(0, max - 2).trimEnd()}..`
}

function summaryLine(summary: string | null | undefined) {
  if (!summary) return ''
  const line = summary
    .replace(/\*\*/g, '')
    .split('\n')
    .map(l => l.replace(/^[-*]\s*/, '').trim())
    .find(Boolean)
  return line ? truncate(line, 34) : ''
}

function decisionLabel(row: {
  status?: string | null
  client_title?: string | null
  title?: string | null
  decision_type?: string | null
}) {
  const t = truncate(row.client_title || row.title || 'Entscheidung')
  const status = String(row.status || '')
  if (status === 'rejected') return `Entscheidung abgelehnt ${t}`
  if (row.decision_type === 'escalation') return `Blocker gemeldet für ${t}`
  return `Entscheidung erteilt für ${t}`
}

const GENERIC_TITLES = new Set(['neuer chat', 'chat', 'tagro chat', 'neues projekt'])

function conversationLabel(
  row: { title?: string | null; summary?: string | null },
  firstUserMessage?: string | null,
) {
  const fromSummary = summaryLine(row.summary)
  if (fromSummary) return fromSummary
  if (firstUserMessage?.trim()) return truncate(`Tagro: ${firstUserMessage.trim()}`)
  const title = (row.title || '').trim()
  if (!title || GENERIC_TITLES.has(title.toLowerCase())) return ''
  return truncate(`Tagro: ${title}`)
}

export async function loadRecentExecuted(sb: AnySb, userId: string): Promise<RecentExecutedItem[]> {
  const items: RecentExecutedItem[] = []

  try {
    const { data: decisions } = await sb
      .from('decisions')
      .select('id, title, client_title, status, decision_type, decided_at, updated_at')
      .eq('decided_by', userId)
      .in('status', ['decided', 'applied', 'rejected'])
      .order('decided_at', { ascending: false })
      .limit(8)

    for (const d of (decisions as any[]) ?? []) {
      const at = d.decided_at || d.updated_at
      if (!at) continue
      items.push({
        id: `dec-${d.id}`,
        label: decisionLabel(d),
        href: `/decisions/${d.id}`,
        at,
      })
    }
  } catch { /* table / RLS */ }

  try {
    const { data: convs } = await sb
      .from('tagro_conversations')
      .select('id, title, summary, updated_at, project_id')
      .eq('user_id', userId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(12)

    const rows = (convs as any[]) ?? []
    const needMsg = rows.filter(c => !c.summary).map(c => c.id)
    const firstMsgByConv = new Map<string, string>()

    if (needMsg.length > 0) {
      const { data: msgs } = await sb
        .from('tagro_messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', needMsg)
        .eq('role', 'user')
        .order('created_at', { ascending: true })
        .limit(80)

      for (const m of (msgs as any[]) ?? []) {
        if (!firstMsgByConv.has(m.conversation_id) && m.content?.trim()) {
          firstMsgByConv.set(m.conversation_id, String(m.content))
        }
      }
    }

    for (const c of rows) {
      const label = conversationLabel(c, firstMsgByConv.get(c.id))
      if (!label) continue
      items.push({
        id: `conv-${c.id}`,
        label,
        href: c.project_id
          ? `/ai?contextType=project&contextId=${encodeURIComponent(c.project_id)}&contextTitle=${encodeURIComponent(c.title || 'Tagro')}`
          : `/ai?contextType=empty&contextTitle=${encodeURIComponent(c.title || 'Tagro')}`,
        at: c.updated_at,
      })
    }
  } catch { /* tagro tables optional in some envs */ }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const seen = new Set<string>()
  const out: RecentExecutedItem[] = []
  for (const item of items) {
    const key = item.label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
    if (out.length >= 8) break
  }

  return out
}
