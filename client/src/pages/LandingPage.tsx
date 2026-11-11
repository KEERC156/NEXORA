import { ArrowRight, BookOpen, Check, CheckSquare2, Command, Layers3, Sparkles, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import styles from './LandingPage.module.css'

const features = [
  { icon: CheckSquare2, title: 'Make progress visible', body: 'Turn busy weeks into clear priorities, due dates, and small wins.' },
  { icon: BookOpen, title: 'Keep your thinking close', body: 'Capture class notes and ideas in one quiet, searchable studio.' },
  { icon: Timer, title: 'Find your focus', body: 'Give deep work a place with a simple, distraction-light focus timer.' },
]
const currentYear = new Date().getFullYear()

function WorkspacePreview() {
  return (
    <div className={styles.preview} aria-label="Illustrative NEXORA workspace preview">
      <div className={styles.previewBar}><div className={styles.previewBrand}><span><Command size={13} /></span>NEXORA</div><div className={styles.previewSample}>PRODUCT PREVIEW · SAMPLE DATA</div></div>
      <div className={styles.previewBody}>
        <div className={styles.previewGreeting}><span>YOUR WEEK AT A GLANCE</span><strong>Your next chapter starts here.</strong><small>A little progress adds up. Let’s make today count.</small></div>
        <div className={styles.previewStats}>{[['08', 'Open tasks'], ['03', 'Completed'], ['72%', 'Weekly focus']].map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</div>
        <div className={styles.previewLower}>
          <div className={styles.previewPanel}><div className={styles.previewHeading}>Today’s focus <span>•••</span></div>{[['Literature review', 'HIGH PRIORITY', true], ['Read chapter 06', 'BIOLOGY', false], ['Submit lab report', 'DUE TODAY', false]].map(([task, tag, checked]) => <div className={styles.previewTask} key={String(task)}><i className={checked ? styles.checked : ''}>{checked && <Check size={10} />}</i><span>{task}</span><small>{tag}</small></div>)}</div>
          <div className={`${styles.previewPanel} ${styles.progressPanel}`}><div className={styles.previewHeading}>Weekly rhythm</div><div className={styles.chartBars}>{[33, 54, 43, 82, 62, 93, 46].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className={styles.chartDays}><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div></div>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} to="/"><span className={styles.brandMark}><Command size={18} /></span>NEXORA</Link>
        <nav className={styles.headerNav} aria-label="Main"><a href="#features">Why Nexora</a><Link to="/login">Log in</Link><Link className={styles.headerCta} to="/register">Get started <ArrowRight size={14} /></Link></nav>
      </header>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <motion.div className={styles.eyebrow} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><Sparkles size={14} /> YOUR SPACE TO DO GREAT THINGS</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .07 }}>Make room for<br /><em>what matters.</em></motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .14 }}>A thoughtful workspace for your studies. Bring tasks, notes, and focused time together—so you can spend less energy keeping up and more on moving forward.</motion.p>
          <motion.div className={styles.heroActions} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .2 }}><Link className={styles.primaryButton} to="/register">Build your workspace <ArrowRight size={16} /></Link><Link className={styles.secondaryButton} to="/login">I already have an account</Link></motion.div>
          <div className={styles.trust}><span><Check size={12} /> Your own private workspace</span><span><Check size={12} /> Simple, focused, yours</span></div>
        </div>
        <motion.div className={styles.previewWrap} initial={{ opacity: 0, y: 22, rotate: 1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: .65, delay: .12 }}><div className={styles.previewGlow} /><WorkspacePreview /></motion.div>
      </section>
      <section className={styles.featureSection} id="features">
        <div className={styles.sectionIntro}><span>YOUR WORK, IN GOOD COMPANY</span><h2>One calm place to<br />move forward.</h2><p>Less tab switching. More time for the ideas you came here to learn.</p></div>
        <div className={styles.featureGrid}>{features.map(({ icon: Icon, title, body }, index) => <motion.article key={title} className={styles.featureCard} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .07 }}><span className={styles.featureIcon}><Icon size={19} /></span><h3>{title}</h3><p>{body}</p></motion.article>)}</div>
      </section>
      <section className={styles.closing}><div className={styles.closingMark}><Layers3 size={20} /></div><h2>Start where you are.</h2><p>Your next step is enough.</p><Link className={styles.primaryButton} to="/register">Create your free workspace <ArrowRight size={15} /></Link></section>
      <footer className={styles.footer}><Link className={styles.brand} to="/"><span className={styles.brandMark}><Command size={15} /></span>NEXORA</Link><span>Made for the work that matters.</span><span>© {currentYear} NEXORA</span></footer>
    </main>
  )
}
