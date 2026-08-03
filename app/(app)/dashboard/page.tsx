import { redirect } from 'next/navigation'

/** Legacy Client Portal dashboard — product UI is Festag OS Overview. */
export default function DashboardPage() {
  redirect('/overview')
}
