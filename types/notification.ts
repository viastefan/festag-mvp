export type NotificationCategory = 'Projekt' | 'Kunde' | 'Tagro' | 'Rechnung'

export interface Notification {
  id: string
  title: string
  preview: string
  category: NotificationCategory
  read: boolean
  created_at: string

  project_id?: string | null
  sender_name?: string
  project_name?: string
  original_text?: string
  tagro_translation?: string
  thread_id?: string
}
