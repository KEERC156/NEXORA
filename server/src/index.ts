import 'dotenv/config'
import cors from 'cors'
import express, { type ErrorRequestHandler, type Request, type Response } from 'express'
import { requireAuth, isSupabaseConfigured } from './auth.js'
import { idSchema, noteCreateSchema, noteUpdateSchema, taskCreateSchema, taskUpdateSchema } from './validators.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.')
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean)

app.disable('x-powered-by')
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error('This origin is not allowed by the API CORS policy.'))
  },
}))
app.use(express.json({ limit: '40kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok', databaseConfigured: isSupabaseConfigured() } })
})

app.use('/api', requireAuth)

function db(req: Request) {
  if (!req.userSupabase || !req.authenticatedUser) throw new Error('Authenticated Supabase context is missing.')
  return { client: req.userSupabase, userId: req.authenticatedUser.id }
}

function sendDatabaseError(res: Response, error: { code?: string; message: string }) {
  if (error.code === 'PGRST116') {
    res.status(404).json({ error: 'The requested record was not found.' })
    return
  }
  console.error('Supabase request failed:', error.code || 'unknown', error.message)
  res.status(500).json({ error: 'The database request could not be completed.' })
}

function parseId(req: Request, res: Response) {
  const result = idSchema.safeParse(req.params.id)
  if (!result.success) {
    res.status(400).json({ error: 'The record ID must be a valid UUID.' })
    return null
  }
  return result.data
}

app.get('/api/me', async (req, res) => {
  const { client, userId } = db(req)
  const { data: profile, error } = await client.from('profiles').select('display_name').eq('id', userId).maybeSingle()
  if (error) return sendDatabaseError(res, error)
  res.json({ data: { id: userId, email: req.authenticatedUser?.email ?? '', profile } })
})

app.get('/api/tasks', async (req, res) => {
  const { client, userId } = db(req)
  const { data, error } = await client.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) return sendDatabaseError(res, error)
  res.json({ data: data ?? [] })
})

app.post('/api/tasks', async (req, res) => {
  const parsed = taskCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Task validation failed.', details: parsed.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })) })
    return
  }
  const { client, userId } = db(req)
  const input = parsed.data
  const { data, error } = await client.from('tasks').insert({
    ...input,
    user_id: userId,
    completed_at: input.status === 'completed' ? new Date().toISOString() : null,
  }).select('*').single()
  if (error) return sendDatabaseError(res, error)
  res.status(201).json({ data })
})

app.patch('/api/tasks/:id', async (req, res) => {
  const id = parseId(req, res)
  if (!id) return
  const parsed = taskUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Task validation failed.', details: parsed.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })) })
    return
  }
  const { client, userId } = db(req)
  const changes = { ...parsed.data }
  if (changes.status === 'completed') Object.assign(changes, { completed_at: new Date().toISOString() })
  if (changes.status === 'pending') Object.assign(changes, { completed_at: null })
  const { data, error } = await client.from('tasks').update(changes).eq('id', id).eq('user_id', userId).select('*').maybeSingle()
  if (error) return sendDatabaseError(res, error)
  if (!data) return res.status(404).json({ error: 'Task not found.' })
  res.json({ data })
})

app.delete('/api/tasks/:id', async (req, res) => {
  const id = parseId(req, res)
  if (!id) return
  const { client, userId } = db(req)
  const { data, error } = await client.from('tasks').delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle()
  if (error) return sendDatabaseError(res, error)
  if (!data) return res.status(404).json({ error: 'Task not found.' })
  res.json({ data: { id: data.id } })
})

app.get('/api/notes', async (req, res) => {
  const { client, userId } = db(req)
  const { data, error } = await client.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
  if (error) return sendDatabaseError(res, error)
  res.json({ data: data ?? [] })
})

app.post('/api/notes', async (req, res) => {
  const parsed = noteCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Note validation failed.', details: parsed.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })) })
    return
  }
  const { client, userId } = db(req)
  const { data, error } = await client.from('notes').insert({ ...parsed.data, user_id: userId }).select('*').single()
  if (error) return sendDatabaseError(res, error)
  res.status(201).json({ data })
})

app.patch('/api/notes/:id', async (req, res) => {
  const id = parseId(req, res)
  if (!id) return
  const parsed = noteUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Note validation failed.', details: parsed.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })) })
    return
  }
  const { client, userId } = db(req)
  const { data, error } = await client.from('notes').update(parsed.data).eq('id', id).eq('user_id', userId).select('*').maybeSingle()
  if (error) return sendDatabaseError(res, error)
  if (!data) return res.status(404).json({ error: 'Note not found.' })
  res.json({ data })
})

app.delete('/api/notes/:id', async (req, res) => {
  const id = parseId(req, res)
  if (!id) return
  const { client, userId } = db(req)
  const { data, error } = await client.from('notes').delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle()
  if (error) return sendDatabaseError(res, error)
  if (!data) return res.status(404).json({ error: 'Note not found.' })
  res.json({ data: { id: data.id } })
})

app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }))

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Request body must contain valid JSON.' })
    return
  }
  if (error instanceof Error && error.message.includes('CORS policy')) {
    res.status(403).json({ error: error.message })
    return
  }
  console.error('Unhandled API error:', error)
  res.status(500).json({ error: 'An unexpected server error occurred.' })
}
app.use(errorHandler)

app.listen(port, () => {
  console.log(`NEXORA API listening on port ${port}`)
})
