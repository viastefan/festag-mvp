import { redirect } from 'next/navigation'

/**
 * Es gab zwei Projektlisten.
 *
 * Die Navigation führte auf /overview/projects, dieser Pfad auf eine zweite
 * Seite mit eigenem Aufbau, eigenen Filtern und eigenem Aussehen. Wer ein
 * Projekt öffnete und wieder schloss, landete auf einer Liste, die anders
 * aussah als die, die er eben verlassen hatte — die Anwendung behauptete,
 * man sei zurück, und zeigte etwas anderes.
 *
 * Zwei Flächen für denselben Gegenstand driften immer auseinander; welche
 * gerade erscheint, entscheidet dann der Weg statt der Absicht. Also bleibt
 * eine, und die alten Einstiege zeigen weiter auf sie.
 *
 * Was mit der alten Seite wegfällt: Filter und Sortierung der Liste. Löschen
 * und Einladen lagen dort ebenfalls, sind aber über die Projektansicht und
 * das Team erreichbar. Wer Filter zurückwill, baut sie in die eine Liste —
 * nicht in eine zweite.
 */
export default function ProjectsPage() {
  redirect('/overview/projects')
}
