import TaskWorkspaceDetail from '@/components/TaskWorkspaceDetail'

export default function ProjectTaskDetailPage({ params }: { params: { projectId: string; taskId: string } }) {
  return <TaskWorkspaceDetail projectId={params.projectId} taskId={params.taskId} />
}
