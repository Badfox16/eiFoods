import type { ReactNode } from 'react'
import styles from './StatCard.module.css'

interface StatCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    label: string
  }
  color?: string
}

export function StatCard({ title, value, icon, trend, color = '#E2570F' }: StatCardProps) {
  const isPositive = trend && trend.value > 0
  
  return (
    <div className={styles.statCard}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>{title}</span>
          {trend && (
            <span className={`${styles.trend} ${isPositive ? styles.positive : styles.negative}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </span>
          )}
        </div>
        {icon && (
          <div className={styles.icon} style={{ background: `${color}15`, color }}>
            {icon}
          </div>
        )}
      </div>
      <div className={styles.value}>{value}</div>
    </div>
  )
}
