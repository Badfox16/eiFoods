import styles from './Stamp.module.css'

/**
 * Selo do cartão de fidelidade (Sequência).
 * state: empty | earned | milestone | milestoneEarned
 *  - empty          dia por ganhar
 *  - earned         dia ganho (açafrão)
 *  - milestone      marco por atingir (anel piri)
 *  - milestoneEarned marco atingido (piri cheio)
 * label: nº do dia; reward: descrição curta do prémio (para marcos).
 */
export function Stamp({ state = 'empty', label, reward, today = false, className = '', ...props }) {
  const classes = [
    styles.stamp,
    styles[state],
    today ? styles.today : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} {...props}>
      <span className={styles.mark}>{label}</span>
      {reward && <span className={styles.reward}>{reward}</span>}
    </div>
  )
}

export default Stamp
