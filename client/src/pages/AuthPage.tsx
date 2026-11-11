import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Command, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { supabaseConfigured } from '../services/supabase'
import styles from './AuthPage.module.css'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register'
  const { user, signIn, signUp } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/app'

  if (user) return <Navigate to="/app" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (isRegister && name.trim().length < 2) {
      setError('Please enter a name with at least 2 characters.')
      return
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      if (isRegister) {
        const hasSession = await signUp(email.trim(), password, name)
        setNotice('Account created. If email confirmation is enabled in Supabase, check your inbox before signing in.')
        if (hasSession) navigate('/app', { replace: true })
      } else {
        await signIn(email.trim(), password)
        navigate(redirectTo, { replace: true })
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambient} />
      <header className={styles.header}><Link to="/" className={styles.brand}><span><Command size={18} /></span>NEXORA</Link><Link to="/" className={styles.back}><ArrowLeft size={14} /> Back to home</Link></header>
      <section className={styles.panel}>
        <div className={styles.panelIcon}><Sparkles size={18} /></div>
        <span className={styles.kicker}>{isRegister ? 'YOUR OWN LITTLE CORNER OF CLARITY' : 'WELCOME BACK TO YOUR SPACE'}</span>
        <h1>{isRegister ? <>A fresh start,<br /><em>on your terms.</em></> : <>Good to see<br /><em>you again.</em></>}</h1>
        <p className={styles.intro}>{isRegister ? 'Create your workspace and bring a little more intention to your studies.' : 'Pick up right where you left off. Your next step is waiting.'}</p>
        {!supabaseConfigured && <div className={styles.setupAlert} role="status"><LockKeyhole size={16} /><span>Authentication is not connected yet. Copy <code>client/.env.example</code> to <code>client/.env</code> and add your Supabase URL and publishable anon key.</span></div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          {isRegister && <label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we call you?" required minLength={2} maxLength={80} /></label>}
          <label>Email address<span className={styles.inputWrap}><Mail size={15} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu" required /></span></label>
          <label>Password<span className={styles.inputWrap}><LockKeyhole size={15} /><input type={visible ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? 'At least 8 characters' : 'Your password'} required minLength={8} /><button type="button" className={styles.showPassword} onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {notice && <p className={styles.notice} role="status">{notice}</p>}
          <button className={styles.submit} disabled={busy || !supabaseConfigured}>{busy ? 'One moment…' : isRegister ? 'Create your workspace' : 'Sign in'} <ArrowRight size={15} /></button>
        </form>
        <p className={styles.switch}>{isRegister ? 'Already have a workspace?' : 'New to NEXORA?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
        <p className={styles.privacy}><LockKeyhole size={11} /> Your study space is private and belongs to you.</p>
      </section>
      <footer className={styles.footer}>Make room for what matters.</footer>
    </main>
  )
}
