import styles from './Spinner.module.css'

/** Indicador de carregamento. size: small | medium | large */
export function Spinner({ size = 'medium', label = 'A carregar…', className = '' }) {
  return (
    <span className={`${styles.wrap} ${className}`.trim()} role="status" aria-live="polite">
      <span className={`${styles.spinner} ${styles[size]}`} />
      <span className={styles.srOnly}>{label}</span>
    </span>
  )
}

export default Spinner
