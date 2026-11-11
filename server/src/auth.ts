import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { NextFunction, Request, Response } from 'express'

declare module 'express-serve-static-core' {
  interface Request {
    authenticatedUser?: User
    userSupabase?: SupabaseClient
  }
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_ANON_KEY?.trim())
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: 'Supabase is not configured on the API. Set SUPABASE_URL and SUPABASE_ANON_KEY.' })
    return
  }
  const authorization = req.header('authorization')
  const tokenMatch = authorization?.match(/^Bearer\s+(.+)$/i)
  if (!tokenMatch) {
    res.status(401).json({ error: 'A valid Supabase access token is required.' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL!
  const anonKey = process.env.SUPABASE_ANON_KEY!
  const token = tokenMatch[1]
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ error: 'The access token is invalid or expired. Sign in again.' })
    return
  }
  req.authenticatedUser = user
  req.userSupabase = supabase
  next()
}
