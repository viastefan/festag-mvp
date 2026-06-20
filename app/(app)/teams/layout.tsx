import TeamsShell from '@/components/teams/TeamsShell'

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return <TeamsShell>{children}</TeamsShell>
}
