import type { TagroOpenDetail } from '@/components/TagroOverlay'
import type { InboxFeedItem } from '@/components/inbox/useInboxFeed'
import { DEV_KIND_LABEL } from '@/lib/inbox/catalog'

const KIND_PREFILL: Record<string, string> = {
  client_request_created:
    'Client-Anfrage sichten: Scope verstehen, klärende Fragen oder Umsetzungsplan formulieren.',
  blocker_reported:
    'Blocker analysieren: Ursache, Lösungsoptionen und eine ruhige Client-Kommunikation vorbereiten.',
  owner_changes_requested:
    'Änderungswunsch umsetzen: Was genau ändert sich, Aufwand und nächste Schritte strukturieren.',
  quality_issue:
    'Qualitätsfrage klären: Was ist betroffen, wie beheben wir es, braucht der Client ein Update?',
  needs_review:
    'Review vorbereiten: fehlende Nachweise identifizieren und nächste Schritte festlegen.',
  proof_missing:
    'Fehlende Belege ergänzen oder Rückfrage an Owner formulieren.',
  task_assigned:
    'Neue Aufgabe starten: Ziel, Akzeptanzkriterien und ersten Umsetzungsschritt definieren.',
  project_available:
    'Projekt einschätzen: Scope, Risiken und ob ich beitreten soll.',
  tagro_daily_prompt:
    'Tagesabschluss: Erledigtes, Blocker und ein client-sicheres Update formulieren.',
  proposal_received:
    'Team-Vorschlag prüfen: Offene Punkte, Budget und nächste Klärung mit Tagro.',
  finished_by_dev:
    'Abgeschlossene Arbeit für Review zusammenfassen und Nachweise prüfen.',
  decision_answered:
    'Client-Antwort umsetzen: Was ändert sich technisch, welche Tasks sind betroffen, nächster Schritt.',
  decision_applied:
    'Freigegebene Tasks fortsetzen: Scope bestätigen und Umsetzung starten.',
  decision_requested:
    'Offene Entscheidung nachverfolgen: fehlende Infos sammeln oder Client-Erinnerung vorbereiten.',
}

export function tagroContextForDevItem(
  item: InboxFeedItem,
  projectTitle?: string | null,
): TagroOpenDetail {
  const kind = String(item.metadata?.kind ?? item.type ?? '')
  const taskId = item.metadata?.task_id ? String(item.metadata.task_id) : undefined
  const decisionId = item.metadata?.decision_id ? String(item.metadata.decision_id) : undefined
  const label = DEV_KIND_LABEL[kind] ?? 'Execution Inbox'
  const prefill = KIND_PREFILL[kind] ?? (item.body?.trim() || undefined)

  if (decisionId) {
    return {
      contextType: 'decision',
      id: decisionId,
      projectId: item.project_id ?? undefined,
      title: item.title,
      subtitle: projectTitle ? `${label} · ${projectTitle}` : label,
      prefill,
    }
  }

  if (taskId) {
    return {
      contextType: 'task',
      id: taskId,
      projectId: item.project_id ?? undefined,
      title: item.title,
      subtitle: projectTitle ? `${label} · ${projectTitle}` : label,
      prefill,
    }
  }

  if (item.project_id) {
    return {
      contextType: 'project',
      id: item.project_id,
      projectId: item.project_id,
      title: item.title,
      subtitle: projectTitle ? `${label} · ${projectTitle}` : label,
      prefill,
    }
  }

  return {
    contextType: 'dev_item',
    id: item.id,
    title: item.title,
    subtitle: label,
    prefill,
  }
}

export function tagroContextForDevInbox(
  items: InboxFeedItem[],
  unreadTotal: number,
  actionCount: number,
): TagroOpenDetail {
  const firstUnread = items.find(i => !i.read_at)
  if (firstUnread) return tagroContextForDevItem(firstUnread)

  return {
    contextType: 'empty',
    id: 'dev-inbox',
    title: 'Execution Inbox · Triage',
    subtitle: `${items.length} Ereignisse · ${unreadTotal} ungelesen · ${actionCount} mit Aktion`,
    prefill: actionCount > 0
      ? 'Priorisiere die offenen Execution-Inbox-Einträge und schlage die nächsten Schritte vor.'
      : 'Gibt es Blocker oder Client-Updates, die ich vorbereiten soll?',
  }
}

export function tagroContextForClientItem(
  item: InboxFeedItem,
  projectTitle?: string | null,
): TagroOpenDetail {
  const taskId = item.metadata?.task_id ? String(item.metadata.task_id) : undefined
  const subtitle = projectTitle ?? 'Nachrichten'

  if (taskId) {
    return {
      contextType: 'task',
      id: taskId,
      projectId: item.project_id ?? undefined,
      title: item.title,
      subtitle,
      prefill: 'Was bedeutet das für mich und was passiert als Nächstes?',
    }
  }

  if (item.project_id) {
    return {
      contextType: 'project',
      id: item.project_id,
      projectId: item.project_id,
      title: item.title,
      subtitle,
      prefill: item.body?.trim() || 'Erkläre mir dieses Update in einfachen Worten.',
    }
  }

  return {
    contextType: 'empty',
    id: item.id,
    title: item.title,
    subtitle,
    prefill: item.body?.trim() || 'Was bedeutet das für mein Projekt?',
  }
}

export function tagroContextForClientInbox(
  items: InboxFeedItem[],
  unreadTotal: number,
): TagroOpenDetail {
  const firstUnread = items.find(i => !i.read_at)
  if (firstUnread) return tagroContextForClientItem(firstUnread)

  return {
    contextType: 'empty',
    id: 'client-inbox',
    title: 'Posteingang',
    subtitle: `${items.length} Nachrichten · ${unreadTotal} ungelesen`,
    prefill: 'Fasse meine offenen Projekt-Updates zusammen und sag mir, was ich tun sollte.',
  }
}
