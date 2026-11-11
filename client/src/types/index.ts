export type TaskStatus = 'pending' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  priority: TaskPriority
  category: string
  due_date: string | null
  status: TaskStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  title: string
  content: string
  category: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface TaskInput {
  title: string
  description?: string
  priority?: TaskPriority
  category?: string
  due_date?: string | null
  status?: TaskStatus
}

export interface NoteInput {
  title: string
  content: string
  category?: string
  is_pinned?: boolean
}
