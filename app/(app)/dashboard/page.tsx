import { redirect } from 'next/navigation'

/**
 * Das Dashboard ist abgelöst. Was hier stand — Kacheln, Kennzahlen, Widgets —
 * beantwortete nie die Frage, mit der jemand die Seite öffnet: was ist
 * passiert und was braucht mich? Das tut jetzt News.
 */
export default function DashboardPage() {
  redirect('/news')
}
