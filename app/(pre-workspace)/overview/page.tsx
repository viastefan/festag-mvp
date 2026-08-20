import { redirect } from 'next/navigation'

/**
 * `/overview` war die Dashboard-Startseite. Sie ist nach News umgezogen —
 * die Unterseiten (/overview/projects, /overview/tasks …) bleiben, weil sie
 * echte Arbeitsflächen sind und kein Dashboard waren.
 *
 * Der Workspace-Trichter für neue Accounts lebt jetzt in der News-Seite:
 * ohne Workspace zeigt sie „Workspace erstellen" statt einer leeren Zeitung.
 */
export default function OverviewPage() {
  redirect('/news')
}
