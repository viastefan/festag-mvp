import IssuesShell from '@/components/issues/IssuesShell'

export default function IssuesLayout({ children }: { children: React.ReactNode }) {
  return <IssuesShell>{children}</IssuesShell>
}
