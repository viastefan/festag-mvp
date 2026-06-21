type TaskRow = {
  id: string
  title: string
  description?: string | null
  dev_description?: string | null
  expected_outcome?: string | null
  definition_of_done?: string | null
  priority?: string | null
  work_type?: string | null
  branch_name?: string | null
  tagro_internal_notes?: string | null
  tagro_verification_summary?: string | null
}

type ProjectRow = { title?: string | null; description?: string | null; scope_summary?: string | null }

export function buildCursorTaskPrompt(task: TaskRow, project: ProjectRow | null) {
  const desc = task.dev_description || task.description || ''
  const lines = [
    'Du bist ein Cursor Cloud Agent für Festag — ein Delivery-Intelligence-System.',
    'Implementiere NUR den folgenden Task. Halte den Diff fokussiert. Keine unrelated Refactors.',
    '',
    `Projekt: ${project?.title ?? 'Unbenannt'}`,
    project?.scope_summary ? `Scope: ${project.scope_summary}` : null,
    project?.description ? `Projektbeschreibung: ${project.description}` : null,
    '',
    `Task-ID: ${task.id}`,
    `Titel: ${task.title}`,
    task.priority ? `Priorität: ${task.priority}` : null,
    task.work_type ? `Arbeitstyp: ${task.work_type}` : null,
    desc ? `Beschreibung:\n${desc}` : null,
    task.expected_outcome ? `Erwartetes Ergebnis: ${task.expected_outcome}` : null,
    task.definition_of_done ? `Definition of Done: ${task.definition_of_done}` : null,
    task.tagro_internal_notes ? `Tagro-Hinweis: ${task.tagro_internal_notes}` : null,
    task.tagro_verification_summary ? `Tagro-Kontext: ${task.tagro_verification_summary}` : null,
    task.branch_name ? `Bevorzugter Branch-Name: ${task.branch_name}` : null,
    '',
    'Am Ende: kurze Zusammenfassung was geändert wurde und ob DoD erfüllt ist.',
  ].filter(Boolean)

  return lines.join('\n')
}
