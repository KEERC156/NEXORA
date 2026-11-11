import { useEffect, useState } from 'react'
import { Pause, Play, RotateCcw, Sparkles, Timer } from 'lucide-react'
import styles from './WorkspacePages.module.css'

type FocusMode = 'focus' | 'break'
const durations: Record<FocusMode, number> = { focus: 25 * 60, break: 5 * 60 }

export function FocusPage() {
  const [mode, setMode] = useState<FocusMode>('focus')
  const [seconds, setSeconds] = useState(durations.focus)
  const [running, setRunning] = useState(false)
  const isRunning = running && seconds > 0

  useEffect(() => {
    if (!isRunning) return
    const timerId = window.setInterval(() => {
      setSeconds((current) => current <= 1 ? 0 : current - 1)
    }, 1000)
    return () => window.clearInterval(timerId)
  }, [isRunning])

  function changeMode(nextMode: FocusMode) {
    setMode(nextMode)
    setSeconds(durations[nextMode])
    setRunning(false)
  }
  function reset() {
    setRunning(false)
    setSeconds(durations[mode])
  }

  const total = durations[mode]
  const progress = (total - seconds) / total
  const finished = seconds === 0
  const displayTime = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return <div className={styles.page}>
    <div className={styles.pageHeading}><div><div className={styles.dateLabel}><Timer size={13} /> A LITTLE SPACE FOR DEEP WORK</div><h1>Focus room</h1><p>One thing at a time. Take a breath, then begin.</p></div></div>
    <section className={styles.focusStage}>
      <div className={styles.focusGlow} />
      <div className={styles.modeTabs} role="tablist" aria-label="Timer mode">{(['focus', 'break'] as const).map((item) => <button key={item} role="tab" aria-selected={mode === item} className={mode === item ? styles.modeActive : ''} onClick={() => changeMode(item)}>{item === 'focus' ? 'Focus session' : 'Short break'}</button>)}</div>
      <div className={styles.timerFace} role="timer" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}>
        <svg viewBox="0 0 220 220" aria-hidden="true"><circle className={styles.timerTrack} cx="110" cy="110" r="100" /><circle className={styles.timerProgress} cx="110" cy="110" r="100" style={{ strokeDashoffset: `${628 * (1 - progress)}` }} /></svg>
        <div className={styles.timerText}><span>{mode === 'focus' ? 'TIME TO FOCUS' : 'TIME TO RESET'}</span><strong>{displayTime}</strong><small>{running ? 'You’re doing great. Stay with it.' : finished ? 'Session complete. Nicely done.' : 'Whenever you’re ready.'}</small></div>
      </div>
      <div className={styles.timerControls}><button className={styles.timerMainButton} onClick={() => setRunning((value) => !value)} disabled={finished}>{isRunning ? <><Pause size={17} fill="currentColor" /> Pause</> : <><Play size={16} fill="currentColor" /> Start focus</>}</button><button className={styles.resetButton} onClick={reset} aria-label="Reset timer"><RotateCcw size={17} /></button></div>
      {finished && <div className={styles.finishedNotice} role="status"><Sparkles size={15} /> Your {mode === 'focus' ? 'focus session' : 'break'} is complete. Take a moment before the next one.</div>}
      <p className={styles.timerFootnote}>A simple timer, just for this visit. Focus sessions aren’t saved to your account.</p>
    </section>
    <div className={styles.focusTip}><span><Sparkles size={15} /></span><div><strong>A small ritual, a softer start.</strong><p>Silence the noise around you, choose one task, and let the timer hold the rest.</p></div></div>
  </div>
}
