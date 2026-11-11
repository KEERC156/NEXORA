import type { LucideIcon } from 'lucide-react'
import styles from './StatCard.module.css'

interface StatCardProps {
  label: string
  value: number | string
  detail: string
  icon: LucideIcon
  tone?: 'violet' | 'cyan' | 'green' | 'amber'
}

export function StatCard({ label, value, detail, icon: Icon, tone = 'violet' }: StatCardProps) {
  return (
    <article className={styles.card}>
      <div className={`${styles.icon} ${styles[tone]}`}><Icon size={19} aria-hidden="true" /></div>
      <p className={styles.label}>{label}</p>
      <div className={styles.value}>{value}</div>
      <p className={styles.detail}>{detail}</p>
    </article>
  )
}
