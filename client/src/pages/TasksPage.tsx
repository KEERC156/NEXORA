import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, CalendarDays, Check, CheckSquare2, Circle, Clock3, LayoutGrid, List, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { api } from '../services/api'
import type { Task, TaskInput, TaskPriority } from '../types'
import styles from './WorkspacePages.module.css'

const priorities: TaskPriority[] = ['low', 'medium', 'high']

function TaskEditor({ task, onClose, onSaved }: { task: Task | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [category, setCategory] = useState(task?.category ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.due_date?.slice(0, 10) ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const input: TaskInput = { title: title.trim(), description: description.trim(), category: category.trim(), priority, due_date: dueDate || null }
    try {
      if (task) await api.updateTask(task.id, input)
      else await api.createTask(input)
      onSaved()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this task.')
    } finally {
      setBusy(false)
    }
  }

  return <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
      <div className={styles.modalHeading}><div><span className={styles.modalEyebrow}>{task ? 'REFINE YOUR PLAN' : 'MAKE A LITTLE PROGRESS'}</span><h2 id="task-editor-title">{task ? 'Edit task' : 'New task'}</h2></div><button className={styles.iconButton} onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
      <form className={styles.editorForm} onSubmit={submit}>
        <label>Task title<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to get done?" maxLength={160} required /></label>
        <label>Description <span className={styles.optional}>OPTIONAL</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a few useful details…" maxLength={3000} /></label>
        <div className={styles.formRow}><label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Biology" maxLength={60} /></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>{priorities.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label></div>
        <label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        {error && <p className={styles.formError} role="alert"><AlertCircle size={14} />{error}</p>}
        <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button><button type="submit" className={styles.primaryAction} disabled={busy || !title.trim()}>{busy ? 'Saving…' : task ? 'Save changes' : 'Add task'}</button></div>
      </form>
    </section>
  </div>
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [sort, setSort] = useState<'date' | 'priority' | 'newest'>('date')
  const [view, setView] = useState<'list' | 'board'>('list')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await api.getTasks()
        if (active) setTasks(data)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load tasks.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [refresh])

  const filtered = useMemo(() => {
    const items = tasks.filter((task) => (filter === 'all' || task.status === filter) && `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(query.toLowerCase()))
    const priorityRank = { high: 0, medium: 1, low: 2 }
    return items.sort((a, b) => sort === 'priority' ? priorityRank[a.priority] - priorityRank[b.priority] : sort === 'newest' ? b.created_at.localeCompare(a.created_at) : (a.due_date || '9999').localeCompare(b.due_date || '9999'))
  }, [filter, query, sort, tasks])

  async function toggleTask(task: Task) {
    setError('')
    try {
      await api.updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' })
      setRefresh((value) => value + 1)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update this task.') }
  }
  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return
    setError('')
    try { await api.deleteTask(task.id); setRefresh((value) => value + 1) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete this task.') }
  }
  function openEditor(task?: Task) { setEditing(task ?? null); setEditorOpen(true) }

  function taskCard(task: Task) {
    return <article className={`${styles.taskCard} ${task.status === 'completed' ? styles.taskDone : ''}`} key={task.id}>
      <button className={`${styles.checkTask} ${task.status === 'completed' ? styles.isChecked : ''}`} onClick={() => void toggleTask(task)} aria-label={task.status === 'completed' ? `Mark ${task.title} pending` : `Complete ${task.title}`} aria-pressed={task.status === 'completed'}>{task.status === 'completed' ? <Check size={14} /> : <Circle size={15} />}</button>
      <div className={styles.taskMain}><strong>{task.title}</strong>{task.description && <p>{task.description}</p>}<div className={styles.taskMeta}>{task.category && <span>{task.category}</span>}<span className={`${styles.priority} ${styles[task.priority]}`}>{task.priority}</span>{task.due_date && <span className={styles.due}><CalendarDays size={12} />{new Date(`${task.due_date}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}</div></div>
      <div className={styles.taskActions}><button className={styles.iconButton} onClick={() => openEditor(task)} aria-label={`Edit ${task.title}`}><Pencil size={14} /></button><button className={`${styles.iconButton} ${styles.deleteIcon}`} onClick={() => void deleteTask(task)} aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button></div>
    </article>
  }

  return <div className={styles.page}>
    <div className={styles.pageHeading}><div><div className={styles.dateLabel}><CheckSquare2 size={13} /> YOUR PLAN, IN ONE PLACE</div><h1>Task manager</h1><p>Make the big things feel more manageable, one task at a time.</p></div><button className={styles.primaryAction} onClick={() => openEditor()}><Plus size={16} /> Add task</button></div>
    {error && <div className={styles.errorBanner} role="alert"><AlertCircle size={15} />{error}<button onClick={() => { setError(''); setLoading(true); setRefresh((value) => value + 1) }}>Try again</button></div>}
    <section className={styles.panel}>
      <div className={styles.taskToolbar}><label className={styles.searchBox}><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks…" aria-label="Search tasks" /></label><div className={styles.filters}><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="Filter tasks"><option value="all">All tasks</option><option value="pending">In progress</option><option value="completed">Completed</option></select><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort tasks"><option value="date">Due date</option><option value="priority">Priority</option><option value="newest">Recently added</option></select><div className={styles.viewToggle} aria-label="Choose task view"><button className={view === 'list' ? styles.viewActive : ''} onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'}><List size={15} /></button><button className={view === 'board' ? styles.viewActive : ''} onClick={() => setView('board')} aria-label="Board view" aria-pressed={view === 'board'}><LayoutGrid size={15} /></button></div></div></div>
      {loading ? <div className={styles.skeletonRows}>{[1, 2, 3].map((item) => <div className={styles.skeletonRow} key={item} />)}</div> : filtered.length ? view === 'list' ? <div className={styles.taskList}>{filtered.map(taskCard)}</div> : <div className={styles.kanban}>{(['pending', 'completed'] as const).map((status) => <section key={status} className={styles.kanbanColumn}><div className={styles.kanbanHead}><span><i className={status === 'pending' ? styles.dotViolet : styles.dotGreen} />{status === 'pending' ? 'In progress' : 'Completed'}</span><b>{filtered.filter((task) => task.status === status).length}</b></div>{filtered.filter((task) => task.status === status).length ? filtered.filter((task) => task.status === status).map(taskCard) : <p className={styles.columnEmpty}>No {status === 'pending' ? 'active' : 'completed'} tasks yet.</p>}</section>)}</div> : <div className={styles.emptyState}><span className={styles.emptyIcon}><CheckSquare2 size={22} /></span><h2>{query ? 'No matching tasks' : tasks.length ? 'Nothing in this view' : 'A clear slate.'}</h2><p>{query ? 'Try another search or clear the filter.' : tasks.length ? 'Change the filter to see other tasks.' : 'Add your first task and give your day a little shape.'}</p>{!tasks.length && <button className={styles.primaryAction} onClick={() => openEditor()}><Plus size={15} /> Create a task</button>}</div>}
    </section>
    <div className={styles.taskFootnote}><Clock3 size={13} /> {tasks.filter((task) => task.status === 'pending').length} tasks left to work through</div>
    {editorOpen && <TaskEditor task={editing} onClose={() => setEditorOpen(false)} onSaved={() => setRefresh((value) => value + 1)} />}
  </div>
}
