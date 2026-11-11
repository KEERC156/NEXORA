import type { Note, NoteInput, Task, TaskInput } from '../types'
import { supabase } from './supabase'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!supabase) {
    throw new ApiError('Connect Supabase by filling in the client environment values.', 503)
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new ApiError('Your session expired. Please sign in again.', 401)

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...init.headers,
    },
  })

  const body = await response.json().catch(() => null) as { data?: T; error?: string } | null
  if (!response.ok) throw new ApiError(body?.error || `Request failed (${response.status}).`, response.status)
  if (!body || !('data' in body)) throw new ApiError('The API returned an invalid response.', 502)
  return body.data as T
}

export const api = {
  getTasks: () => request<Task[]>('/api/tasks'),
  createTask: (input: TaskInput) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) }),
  updateTask: (id: string, input: Partial<TaskInput>) =>
    request<Task>(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteTask: (id: string) => request<{ id: string }>(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getNotes: () => request<Note[]>('/api/notes'),
  createNote: (input: NoteInput) => request<Note>('/api/notes', { method: 'POST', body: JSON.stringify(input) }),
  updateNote: (id: string, input: Partial<NoteInput>) =>
    request<Note>(`/api/notes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteNote: (id: string) => request<{ id: string }>(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getMe: () => request<{ id: string; email: string; profile: { display_name: string | null } | null }>('/api/me'),
}
