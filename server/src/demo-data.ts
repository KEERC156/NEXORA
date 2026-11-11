import { createHash } from 'node:crypto'

export const demoStudents = [
  { key: 'aanya-sharma', name: 'Aanya Sharma', email: 'aanya.sharma@nexora-demo.invalid' },
  { key: 'rahul-verma', name: 'Rahul Verma', email: 'rahul.verma@nexora-demo.invalid' },
  { key: 'priya-nair', name: 'Priya Nair', email: 'priya.nair@nexora-demo.invalid' },
  { key: 'arjun-rao', name: 'Arjun Rao', email: 'arjun.rao@nexora-demo.invalid' },
  { key: 'sneha-patel', name: 'Sneha Patel', email: 'sneha.patel@nexora-demo.invalid' },
] as const

const taskTemplates = [
  { title: 'Review lecture notes', description: 'Consolidate this week’s lecture notes and list any open questions.', category: 'Study', priority: 'high', status: 'pending', dueOffset: 1 },
  { title: 'Complete problem set', description: 'Work through the assigned questions and check each solution.', category: 'Coursework', priority: 'medium', status: 'pending', dueOffset: 3 },
  { title: 'Read research article', description: 'Annotate the main argument, evidence, and useful references.', category: 'Research', priority: 'low', status: 'pending', dueOffset: 6 },
  { title: 'Prepare seminar summary', description: 'Write a concise summary and prepare two discussion questions.', category: 'Seminar', priority: 'high', status: 'completed', dueOffset: -1 },
  { title: 'Plan next study block', description: 'Choose a focused goal and reserve time for the next study session.', category: 'Planning', priority: 'medium', status: 'pending', dueOffset: 9 },
] as const

const noteTemplates = [
  { title: 'Weekly lecture highlights', category: 'Study Skills', content: 'Key concepts from this week:\n\n- Identify the central ideas before revising details.\n- Connect each concept to an example from class.\n- Record questions to revisit during office hours.' },
  { title: 'Research reading notes', category: 'Research', content: 'Reading checklist:\n\n- What question is the author investigating?\n- Which methods support the main claim?\n- What limitations or follow-up questions should I note?' },
  { title: 'Exam revision plan', category: 'Planning', content: 'Revision plan:\n\n1. Break each topic into short review sessions.\n2. Use practice questions to check understanding.\n3. Revisit difficult topics after a short break.' },
] as const

export function demoRecordId(kind: 'task' | 'note', studentKey: string, index: number) {
  const bytes = createHash('sha256').update(`nexora-demo:${kind}:${studentKey}:${index}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function buildDemoTasks(studentKey: string, today = new Date()) {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  return taskTemplates.map((task, index) => {
    const due = new Date(start)
    due.setUTCDate(due.getUTCDate() + task.dueOffset)
    return {
      id: demoRecordId('task', studentKey, index),
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      status: task.status,
      due_date: due.toISOString().slice(0, 10),
      completed_at: task.status === 'completed' ? start.toISOString() : null,
    }
  })
}

export function buildDemoNotes(studentKey: string) {
  return noteTemplates.map((note, index) => ({
    id: demoRecordId('note', studentKey, index),
    ...note,
    is_pinned: index === 0,
  }))
}
