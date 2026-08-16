import { forwardRef, useId } from 'react'
import styles from './Input.module.css'

/**
 * Campo de texto com label, ícone opcional, erro e ajuda.
 * Encaminha a ref para o <input> (útil para foco automático).
 */
export const Input = forwardRef(function Input(
  { label, hint, error, leftIcon, className = '', id, ...props },
  ref
) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={`${styles.wrap} ${error ? styles.wrapError : ''} ${leftIcon ? styles.hasIcon : ''}`}>
        {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </div>
      {error ? (
        <span id={`${inputId}-err`} className={styles.error}>{error}</span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className={styles.hint}>{hint}</span>
      ) : null}
    </div>
  )
})

export default Input
