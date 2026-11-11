import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, BookOpen, Check, CheckCircle2, CircleAlert, Clock3, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../contexts/useAuth'
import { api } from '../services/api'
import type { Note, Task } from '../types'
import styles from './WorkspacePages.module.css'

function weekStart(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function taskDateIsBefore(task: Task, date: Date) {
  return Boolean(task.due_date && new Date(`${task.due_date}T23:59:59`) < date)
}

function taskDateIsOnOrAfter(task: Task, date: Date) {
  return Boolean(task.due_date && new Date(`${task.due_date}T23:59:59`) >= date)
}

function completedTaskDateKey(task: Task) {
  return task.completed_at ? localDateKey(new Date(task.completed_at)) : ''
}

export function DashboardPage() {
  const { user } = useAuth()
  const [today] = useState(() => new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [quickBusy, setQuickBusy] = useState(false)
  const [quickError, setQuickError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [nextTasks, nextNotes] = await Promise.all([api.getTasks(), api.getNotes()])
        if (active) {
          setTasks(nextTasks)
          setNotes(nextNotes)
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your workspace.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [refresh])

  const pending = tasks.filter((task) => task.status === 'pending')
  const completed = tasks.filter((task) => task.status === 'completed')
  const overdue = pending.filter((task) => taskDateIsBefore(task, today))
  const completionRate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0
  const upcoming = pending.filter((task) => taskDateIsOnOrAfter(task, today)).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')).slice(0, 4)
  const recentNotes = [...notes].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 3)
  const displayName = user?.user_metadata.display_name || user?.email?.split('@')[0] || 'there'
  const chartData = useMemo(() => {
    const start = weekStart(today)
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start)
      day.setDate(day.getDate() + index)
      const key = localDateKey(day)
      return { day: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(day), completed: completed.filter((task) => completedTaskDateKey(task) === key).length }
    })
  }, [completed, today])

  async function addQuickTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quickTitle.trim()) return
    setQuickBusy(true)
    setQuickError('')
    try {
      await api.createTask({ title: quickTitle.trim() })
      setQuickTitle('')
      setRefresh((value) => value + 1)
    } catch (caught) {
      setQuickError(caught instanceof Error ? caught.message : 'Could not add task.')
    } finally {
      setQuickBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.welcomeRow}><div><div className={styles.dateLabel}><Sparkles size={13} /> YOUR PERSONAL WORKSPACE</div><h1>Good {today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening'}, {displayName}.</h1><p>Make today a little more intentional. Here’s where you’re at.</p></div><Link className={styles.primaryAction} to="/app/tasks"><Plus size={16} /> New task</Link></div>
      {error && <div className={styles.errorBanner} role="alert"><CircleAlert size={16} /><span>{error}</span><button onClick={() => { setError(''); setLoading(true); setRefresh((value) => value + 1) }}>Try again</button></div>}
      {loading ? <div className={styles.statsGrid}>{[1, 2, 3, 4].map((item) => <div className={styles.skeletonCard} key={item} />)}</div> : !error && <>
        <section className={styles.statsGrid} aria-label="Task summary">
          <StatCard label="Total tasks" value={tasks.length} detail="Everything on your plate" icon={CheckCircle2} />
          <StatCard label="Completed" value={completed.length} detail={`${completionRate}% of all tasks`} icon={Check} tone="green" />
          <StatCard label="In progress" value={pending.length} detail="Ready for your next step" icon={Clock3} tone="cyan" />
          <StatCard label="Overdue" value={overdue.length} detail={overdue.length ? 'A quick review may help' : 'You’re all caught up'} icon={CircleAlert} tone="amber" />
        </section>
        <section className={styles.dashboardGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Your progress</h2><p>A week at a glance, based on finished tasks</p></div><span className={styles.panelBadge}>THIS WEEK</span></div>
            <div className={styles.chartWrap}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 4, left: -21, bottom: 0 }}><CartesianGrid stroke="#292a3a" vertical={false} strokeDasharray="3 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#85879c', fontSize: 10 }} dy={9} /><Tooltip cursor={{ fill: '#7770a51c' }} contentStyle={{ background: '#1b1c2b', border: '1px solid #37384e', borderRadius: 9, color: '#f0eff7', fontSize: 11 }} labelStyle={{ color: '#aaa6d5' }} /><Bar dataKey="completed" name="Tasks completed" fill="#9381f1" radius={[5, 5, 1, 1]} maxBarSize={24} /></BarChart></ResponsiveContainer></div>
          </article>
          <article className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Task completion</h2><p>Small wins make a big difference</p></div></div>
            <div className={styles.progressContent}><div className={styles.ring} style={{ background: `conic-gradient(#9b88ff ${completionRate * 3.6}deg, #292a3c 0deg)` }}><div><strong>{completionRate}<small>%</small></strong><span>complete</span></div></div><div className={styles.progressStats}><span><i className={styles.dotViolet} />Done <b>{completed.length}</b></span><span><i className={styles.dotMuted} />Remaining <b>{pending.length}</b></span><p>{tasks.length ? 'Keep showing up. You’re building momentum.' : 'Add your first task to see your progress take shape.'}</p></div></div>
          </article>
        </section>
        <section className={styles.dashboardGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Coming up</h2><p>Your next few deadlines</p></div><Link to="/app/tasks">All tasks <ArrowRight size={13} /></Link></div>
            {upcoming.length ? <div className={styles.upcomingList}>{upcoming.map((task) => <div className={styles.upcomingItem} key={task.id}><span className={styles.taskMarker} /><div className={styles.upcomingText}><strong>{task.title}</strong><span>{task.category || 'General'} · <span className={`${styles.priority} ${styles[task.priority]}`}>{task.priority}</span></span></div><time>{new Date(`${task.due_date}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</time></div>)}</div> : <div className={styles.emptyCompact}><CheckCircle2 size={20} /><span>No upcoming deadlines. Add a due date to a task to see it here.</span></div>}
            <form className={styles.quickAdd} onSubmit={addQuickTask}><Plus size={16} /><input value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} aria-label="Quick add task" placeholder="Add a task to your list…" maxLength={160} /><button disabled={quickBusy || !quickTitle.trim()}>{quickBusy ? 'Adding…' : 'Add task'}</button></form>{quickError && <p className={styles.inlineError} role="alert">{quickError}</p>}
          </article>
          <article className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Recently edited</h2><p>Your notes, right where you left them</p></div><Link to="/app/notes">Notes studio <ArrowRight size={13} /></Link></div>
            {recentNotes.length ? <div className={styles.noteList}>{recentNotes.map((note) => <Link className={styles.noteItem} key={note.id} to="/app/notes"><span className={styles.noteIcon}><BookOpen size={15} /></span><span><strong>{note.title || 'Untitled note'}</strong><small>{note.category || 'Uncategorized'} · Updated {new Date(note.updated_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</small></span><ArrowRight size={14} /></Link>)}</div> : <div className={styles.emptyCompact}><BookOpen size={20} /><span>Your notes will show up here once you create one.</span></div>}
          </article>
        </section>
      </>}
    </div>
  )
}
