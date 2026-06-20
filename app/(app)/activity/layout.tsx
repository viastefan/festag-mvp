import ActivityShell from '@/components/activity/ActivityShell'

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return <ActivityShell>{children}</ActivityShell>
}
