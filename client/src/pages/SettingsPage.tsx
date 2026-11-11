import { useEffect, useState } from 'react'
import { AlertCircle, BadgeCheck, CircleUserRound, KeyRound, LogOut, Mail, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { api } from '../services/api'
import styles from './WorkspacePages.module.css'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [serverEmail, setServerEmail] = useState('')
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api.getMe().then((profile) => setServerEmail(profile.email)).catch((error: unknown) => setServerError(error instanceof Error ? error.message : 'Unable to verify your account with the API.'))
  }, [])
  const name = user?.user_metadata.display_name || user?.email?.split('@')[0] || 'Student'
  async function logout() {
    setBusy(true)
    try { await signOut(); navigate('/') } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Sign out failed.')
      setBusy(false)
    }
  }

  return <div className={styles.page}>
    <div className={styles.pageHeading}><div><div className={styles.dateLabel}><CircleUserRound size={13} /> YOUR SPACE, YOUR DETAILS</div><h1>Settings</h1><p>Your account information and a few practical details.</p></div></div>
    <div className={styles.settingsGrid}>
      <section className={styles.settingsCard}><div className={styles.settingsCardHead}><span className={styles.settingsIcon}><CircleUserRound size={18} /></span><div><h2>Account profile</h2><p>Identity provided by Supabase Auth</p></div></div><div className={styles.profileHero}><div className={styles.profileAvatar}>{name.slice(0, 1).toUpperCase()}</div><div><strong>{name}</strong><span>Student workspace</span></div><BadgeCheck size={17} /></div><div className={styles.accountRow}><span><Mail size={14} /> Email address</span><strong>{user?.email || 'Not available'}</strong></div><div className={styles.accountRow}><span><KeyRound size={14} /> User ID</span><strong className={styles.userId}>{user?.id || 'Not available'}</strong></div>{serverEmail && <div className={styles.verifiedLine}><ShieldCheck size={14} /> Verified by your NEXORA API</div>}{serverError && <p className={styles.settingsError}><AlertCircle size={14} />{serverError}</p>}</section>
      <section className={styles.settingsCard}><div className={styles.settingsCardHead}><span className={styles.settingsIcon}><ShieldCheck size={18} /></span><div><h2>Privacy & security</h2><p>Your learning space stays yours</p></div></div><div className={styles.privacyLine}><span><ShieldCheck size={15} /></span><p><strong>Private by design</strong><small>Your tasks and notes are scoped to your account and protected by database access policies.</small></p></div><div className={styles.privacyLine}><span><KeyRound size={15} /></span><p><strong>Secure authentication</strong><small>Your sign-in is managed by Supabase Auth. NEXORA never stores your password.</small></p></div><button className={styles.logoutButton} onClick={() => void logout()} disabled={busy}><LogOut size={15} />{busy ? 'Signing out…' : 'Sign out of NEXORA'}</button></section>
    </div>
  </div>
}
