/**
 * Workspace-Art — die eine Quelle.
 *
 * Ein Workspace hat eine Betriebsart, und sie steht in der Datenbank:
 * `workspaces.mode`, Enum `workspace_mode` aus 20260515_workspaces_foundation.
 * Drei Werte, seit dem Fundament:
 *
 *   delivery  — Arbeit für Kunden. Freigaben, Portale, kundensichere Berichte.
 *   team      — das eigene Team. Keine Kundenfreigaben, keine Portale.
 *   agency    — Agentur mit mehreren Mandanten unter einem Dach.
 *
 * WARUM DIESE DATEI EXISTIERT
 * Daneben lief bis hierher ein zweites System: lib/workspace-mode.ts hielt
 * eine eigene Zwei-Werte-Skala (`client_delivery` / `internal_company`) im
 * localStorage des Browsers. Beide beschrieben dieselbe Eigenschaft, kannten
 * einander aber nicht.
 *
 * Die Folgen waren keine Schönheitsfehler: auf einem zweiten Gerät war die Art
 * wieder die voreingestellte, zwei Mitglieder desselben Workspace konnten
 * verschiedene Modi sehen, und der Server — der Tagro, Statusberichte und jede
 * serverseitig erzeugte Formulierung verantwortet — wusste überhaupt nichts
 * davon. Eine Eigenschaft des Workspace kann nicht im Browser eines Einzelnen
 * wohnen.
 *
 * Hier steht deshalb nur, was die Datenbank auch weiß.
 */

export type WorkspaceMode = 'delivery' | 'team' | 'agency'

export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = 'delivery'

export function isWorkspaceMode(value: unknown): value is WorkspaceMode {
  return value === 'delivery' || value === 'team' || value === 'agency'
}

/** Niemals einen unbekannten Spaltenwert durchreichen — lieber die Voreinstellung. */
export function asWorkspaceMode(value: unknown): WorkspaceMode {
  return isWorkspaceMode(value) ? value : DEFAULT_WORKSPACE_MODE
}

export const WORKSPACE_MODE_LABEL: Record<WorkspaceMode, string> = {
  delivery: 'Kundenarbeit',
  team: 'Eigenes Team',
  agency: 'Agentur',
}

export const WORKSPACE_MODE_DESCRIPTION: Record<WorkspaceMode, string> = {
  delivery: 'Festag begleitet deine Arbeit für Kunden — mit Freigaben, Berichten und Portalen.',
  team: 'Festag begleitet dein eigenes Team. Keine Kundenfreigaben, keine Portale.',
  agency: 'Mehrere Mandanten unter einem Dach, jeder mit eigener Sicht auf seine Projekte.',
}

/**
 * Das Wort für die Gegenseite.
 *
 * Dieselbe Zeile heißt je nach Art „Der Kunde wartet auf deine Freigabe" oder
 * „Das Team wartet auf deine Freigabe". Die Sätze werden nicht dreimal
 * geschrieben — sie holen sich hier ihr Substantiv.
 */
export const COUNTERPART_NOUN: Record<WorkspaceMode, { singular: string; plural: string }> = {
  delivery: { singular: 'Kunde', plural: 'Kunden' },
  team: { singular: 'Kollege', plural: 'Team' },
  agency: { singular: 'Mandant', plural: 'Mandanten' },
}

/**
 * Gibt es in dieser Art überhaupt eine Freigabe durch eine Gegenseite?
 *
 * Im eigenen Team nicht: dort gibt niemand von außen etwas frei, und eine
 * Oberfläche, die auf eine Kundenfreigabe wartet, die es nie geben wird,
 * beschreibt einen Zustand, den es nicht gibt.
 */
export function hasClientApproval(mode: WorkspaceMode): boolean {
  return mode !== 'team'
}

/** Trägt diese Art mehrere Mandanten — und damit eine Mandantenspalte? */
export function hasMultipleClients(mode: WorkspaceMode): boolean {
  return mode === 'agency'
}
