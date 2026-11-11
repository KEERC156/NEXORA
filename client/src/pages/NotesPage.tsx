import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, BookOpen, Check, Clock3, FileText, Pin, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import type { Note, NoteInput } from '../types'
import styles from './WorkspacePages.module.css'

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [pinned, setPinned] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    async function loadNotes() {
      try {
        const data = await api.getNotes()
        if (!active) return
        setNotes(data)
        const firstNote = data[0]
        setSelectedId(firstNote?.id ?? null)
        setTitle(firstNote?.title ?? '')
        setContent(firstNote?.content ?? '')
        setCategory(firstNote?.category ?? '')
        setPinned(firstNote?.is_pinned ?? false)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your notes.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadNotes()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => notes.filter((note) => `${note.title} ${note.content} ${note.category}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.updated_at.localeCompare(a.updated_at)), [notes, query])
  const selectedNote = notes.find((note) => note.id === selectedId)

  function selectNote(note: Note) {
    setSelectedId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setCategory(note.category)
    setPinned(note.is_pinned)
    setSaveMessage('')
    setError('')
  }

  function startNewNote() {
    setSelectedId('new')
    setTitle('')
    setContent('')
    setCategory('')
    setPinned(false)
    setSaveMessage('')
    setError('')
  }

  async function saveNote() {
    if (!title.trim()) { setError('Give your note a title before saving.'); return }
    setBusy(true); setError(''); setSaveMessage('')
    const input: NoteInput = { title: title.trim(), content, category: category.trim(), is_pinned: pinned }
    try {
      if (selectedId === 'new' || !selectedId) {
        const created = await api.createNote(input)
        setNotes((current) => [created, ...current])
        setSelectedId(created.id)
      } else {
        const updated = await api.updateNote(selectedId, input)
        setNotes((current) => current.map((item) => item.id === updated.id ? updated : item))
      }
      setSaveMessage('Saved just now')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save this note.') } finally { setBusy(false) }
  }

  async function togglePin() {
    if (!selectedNote) { setPinned(!pinned); return }
    setBusy(true); setError('')
    try {
      const updated = await api.updateNote(selectedNote.id, { is_pinned: !selectedNote.is_pinned })
      setNotes((current) => current.map((item) => item.id === updated.id ? updated : item))
      setPinned(updated.is_pinned)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update this note.') } finally { setBusy(false) }
  }

  async function deleteNote() {
    if (!selectedNote || !window.confirm(`Delete “${selectedNote.title}”? This cannot be undone.`)) return
    setBusy(true); setError('')
    try {
      await api.deleteNote(selectedNote.id)
      const remaining = notes.filter((note) => note.id !== selectedNote.id)
      setNotes(remaining)
      if (remaining[0]) selectNote(remaining[0])
      else {
        setSelectedId(null)
        setTitle('')
        setContent('')
        setCategory('')
        setPinned(false)
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete this note.') } finally { setBusy(false) }
  }

  return <div className={styles.page}>
    <div className={styles.pageHeading}><div><div className={styles.dateLabel}><BookOpen size={13} /> YOUR IDEAS, KEPT CLOSE</div><h1>Notes studio</h1><p>Capture the useful details. Come back to them when you need them.</p></div><button className={styles.primaryAction} onClick={startNewNote}><Plus size={16} /> New note</button></div>
    {error && <div className={styles.errorBanner} role="alert"><AlertCircle size={15} />{error}<button onClick={() => setError('')} aria-label="Dismiss error">Dismiss</button></div>}
    <div className={styles.notesWorkspace}>
      <aside className={styles.notesSidebar}>
        <label className={styles.searchBox}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a note…" aria-label="Search notes" /></label>
        <div className={styles.noteCount}>{loading ? 'Loading notes…' : `${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`}</div>
        {loading ? <div className={styles.noteSkeletons}>{[1, 2, 3].map((item) => <div key={item} />)}</div> : filtered.length ? <div className={styles.noteNav}>{filtered.map((note) => <button key={note.id} className={`${styles.noteNavItem} ${selectedId === note.id ? styles.noteNavActive : ''}`} onClick={() => selectNote(note)}><span className={styles.noteNavTitle}>{note.is_pinned && <Pin size={11} fill="currentColor" />}{note.title || 'Untitled note'}</span><span className={styles.noteNavPreview}>{note.content || 'No content yet'}</span><span className={styles.noteNavMeta}>{note.category || 'Uncategorized'} · {new Date(note.updated_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span></button>)}</div> : <div className={styles.notesEmpty}><FileText size={20} /><span>{query ? 'No notes match your search.' : 'Your notes will live here.'}</span></div>}
      </aside>
      <section className={styles.noteEditor}>
        {selectedId || selectedNote ? <>
          <div className={styles.editorToolbar}><span>{selectedNote ? <><Clock3 size={12} /> Edited {new Date(selectedNote.updated_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</> : 'NEW NOTE'}</span><div><button className={styles.iconButton} onClick={() => void togglePin()} disabled={busy} aria-label={pinned ? 'Unpin note' : 'Pin note'} title={pinned ? 'Unpin note' : 'Pin note'}><Pin size={15} fill={pinned ? 'currentColor' : 'none'} /></button>{selectedNote && <button className={`${styles.iconButton} ${styles.deleteIcon}`} onClick={() => void deleteNote()} disabled={busy} aria-label="Delete note"><Trash2 size={15} /></button>}</div></div>
          <div className={styles.noteForm}><input className={styles.noteTitleInput} value={title} onChange={(event) => { setTitle(event.target.value); setSaveMessage('') }} placeholder="Give this note a title…" aria-label="Note title" maxLength={160} /><input className={styles.categoryInput} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Add a subject or category…" aria-label="Note category" maxLength={60} /><textarea className={styles.noteContentInput} value={content} onChange={(event) => { setContent(event.target.value); setSaveMessage('') }} placeholder="Start writing. Your thoughts are private to your account." aria-label="Note content" maxLength={30000} /></div>
          <div className={styles.editorFooter}><span className={styles.saveStatus} role="status">{saveMessage && <><Check size={13} />{saveMessage}</>}</span><button className={styles.primaryAction} onClick={() => void saveNote()} disabled={busy || !title.trim()}>{busy ? 'Saving…' : selectedNote ? 'Save changes' : 'Save note'}</button></div>
        </> : <div className={styles.emptyState}><span className={styles.emptyIcon}><BookOpen size={21} /></span><h2>{notes.length ? 'Select a note' : 'Start a collection.'}</h2><p>{notes.length ? 'Choose a note from the list to read or edit.' : 'Create your first note and keep a useful idea close.'}</p>{!notes.length && <button className={styles.primaryAction} onClick={startNewNote}><Plus size={15} /> Create a note</button>}</div>}
      </section>
    </div>
  </div>
}
