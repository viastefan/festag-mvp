import TaskWorkspaceDetail from '@/components/TaskWorkspaceDetail'

export default function StandaloneTaskDetailPage({ params }: { params: { taskId: string } }) {
  return <TaskWorkspaceDetail taskId={params.taskId} />
}
