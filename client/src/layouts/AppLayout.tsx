import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, CheckSquare2, ChevronLeft, Command, LayoutDashboard, LogOut, Menu, Settings, Sparkles, Timer, X } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import styles from './AppLayout.module.css'

const navigation = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/tasks', label: 'Tasks', icon: CheckSquare2 },
  { to: '/app/notes', label: 'Notes studio', icon: BookOpen },
  { to: '/app/resources', label: 'Resources', icon: Sparkles },
  { to: '/app/focus', label: 'Focus room', icon: Timer },
]
const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const displayName = user?.user_metadata.display_name || user?.email?.split('@')[0] || 'Student'
  const initials = displayName.slice(0, 2).toUpperCase()

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError('')
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Sign out failed. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  const sidebar = (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.brandRow}>
        <div className={styles.logo}><Command size={19} strokeWidth={2.2} /></div>
        {!collapsed && <span className={styles.brand}>NEXORA</span>}
        <button className={styles.collapseButton} onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <ChevronLeft size={16} />
        </button>
      </div>
      <div className={styles.workspaceTag}>{!collapsed && <><span className={styles.workspaceDot} /> PERSONAL WORKSPACE</>}</div>
      <nav className={styles.nav} aria-label="Main navigation">
        {!collapsed && <p className={styles.navLabel}>WORKSPACE</p>}
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className={styles.sidebarBottom}>
        <NavLink to="/app/settings" onClick={() => setMobileOpen(false)} title={collapsed ? 'Settings' : undefined} className={({ isActive }) => `${styles.navLink} ${styles.settingsLink} ${isActive ? styles.active : ''}`}>
          <Settings size={18} strokeWidth={1.8} /><span>Settings</span>
        </NavLink>
        {!collapsed && <div className={styles.sidebarNote}><Sparkles size={14} /><span>A calmer way to get things done.</span></div>}
        <button className={styles.signOut} onClick={handleSignOut} disabled={signingOut} title={collapsed ? 'Sign out' : undefined}><LogOut size={17} /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span></button>
      </div>
    </aside>
  )

  return (
    <div className={styles.shell}>
      <div className={styles.desktopSidebar}>{sidebar}</div>
      <AnimatePresence>
        {mobileOpen && <motion.div className={styles.mobileBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)}>
          <motion.div className={styles.mobileSidebar} initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} onClick={(event) => event.stopPropagation()}>
            <button className={styles.mobileClose} onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>{sidebar}
          </motion.div>
        </motion.div>}
      </AnimatePresence>
      <main className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.mobileMenu} onClick={() => { setCollapsed(false); setMobileOpen(true) }} aria-label="Open navigation"><Menu size={21} /></button>
          <div className={styles.breadcrumb}><span>Workspace</span><span className={styles.slash}>/</span><span className={styles.current}>{navigation.find((item) => item.to === location.pathname)?.label ?? (location.pathname.includes('/tasks') ? 'Tasks' : location.pathname.includes('/notes') ? 'Notes studio' : location.pathname.includes('/resources') ? 'Resources' : location.pathname.includes('/focus') ? 'Focus room' : 'Settings')}</span></div>
          <div className={styles.topRight}>{signOutError && <span className={styles.signOutError} role="alert">{signOutError}</span>}<span className={styles.today}>{todayLabel}</span><div className={styles.avatar} title={user?.email || 'Your account'}>{initials}</div></div>
        </header>
        <div className={styles.content}>
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
